// Gerenciador das sessoes de IA em paralelo. O coracao do orquestrador.
// Recebe eventos do provedor, transmite eventos e status pelo WebSocket,
// respeita o limite de sessoes simultaneas e persiste o indice.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { basename } from "node:path";

import { quarentenar } from "../util/quarentena.js";

import type { ConferenciaSite, Sessao, StatusSessao } from "../tipos.js";
import type { ProcessoSessao, UsoAcumuladoSessao } from "../provedores/contrato.js";
import {
  conferirSiteParaConformidade,
  hostLocalDoHub,
  invalidarCacheAuditoria,
  type ConferenciaConformidade,
} from "../publicacao/auditoria.js";
import { listarArquivosSite } from "../vkos/siteEstatico.js";
import { pastaDaPeca } from "../publicacao/arquivos.js";
import {
  criarLacoConformidade,
  deveDispararLaco,
  skillPassaPelaConferencia,
  type LacoConformidade,
} from "./conformidade-site.js";
import { obterProvedorAtivo, obterProvedorDaSessao } from "../provedores/index.js";
import { prepararPromptEWorkspace } from "../provedores/skills.js";
import { transmitir, transmitirPara } from "../ws.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { obterConfigApp, obterModeloPadraoDoProvedor } from "../config/estado.js";
import { anexarTurno, apagarTranscricao } from "./transcricao.js";
import { registrarResult, registrarTurnoSemMedicao } from "./custos.js";
import {
  garantirPastaDadosWorkspace,
  listarIdsWorkspaces,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";
import { montarConfigMcp } from "../conexoes/mcp.js";
import { emitir } from "../eventos/barramento.js";

// Teto de sessoes ativas ao mesmo tempo (iniciando ou rodando). GLOBAL: e limite
// de maquina, nao de cliente. Vale somando as sessoes de todos os workspaces.
const LIMITE_ATIVAS = 5;

// Nome do arquivo de persistencia por workspace: app/dados/workspaces/<id>/sessoes.json.
const NOME_ARQUIVO_SESSOES = "sessoes.json";

// Estado de runtime de cada sessao, separado do dado persistido.
// Guarda o processo vivo e o que enviar no proximo spawn.
interface Execucao {
  processo: ProcessoSessao | null;
  // Texto a mandar pro claude via stdin no proximo spawn.
  promptPendente: string;
  // Se true, o proximo spawn usa --resume sessionIdClaude.
  ehResume: boolean;
  // Marca que o CLI subiu e mandou o init: dai pra frente o turno consome
  // credito. Sem isso nao da pra distinguir "morreu antes de comecar" (nao
  // gastou nada) de "morreu no meio" (gastou e ninguem mediu).
  recebeuInit: boolean;
  // Marca que o result chegou, pra decidir concluida x erro no fim.
  recebeuResult: boolean;
  // Se o result veio como erro da API.
  resultComErro: boolean;
  // Marca que o usuario mandou parar, pra nao virar erro no fim.
  paradaManual: boolean;
  // Alias do modelo escolhido (opus/sonnet/haiku) pra passar no --model.
  // Reusado nas continuacoes. Vazio deixa o CLI usar o modelo da sessao.
  modeloAlias: string;
}

export function resolverModeloDaExecucao(
  sessao: Pick<Sessao, "provedor" | "modelo">,
  modeloEmMemoria: string,
  ehResume: boolean,
): string {
  if (modeloEmMemoria) return modeloEmMemoria;
  if (ehResume && sessao.provedor === "codex") {
    return sessao.modelo ?? obterModeloPadraoDoProvedor("codex");
  }
  // O Claude historicamente omite --model depois de um restart e deixa o
  // proprio resume herdar o modelo. Mantemos esse comportamento.
  return "";
}

// Estados terminais da conferencia de site: nada mais roda depois deles.
const ESTADOS_CONFERENCIA_TERMINAIS = new Set(["aprovada", "pendencias"]);
// Estados de status validos, pra descartar lixo persistido.
const STATUS_VALIDOS = new Set<StatusSessao>([
  "fila",
  "iniciando",
  "rodando",
  "concluida",
  "erro",
  "parada",
]);

// Saneamento defensivo de uma sessao lida do disco, no padrao do saneamento do
// CRM: campo faltando nao derruba, entrada malformada devolve null (o chamador
// ignora com log). Normaliza provedor, workspaceId, status e a conferencia:
//   - sessao que estava ativa ou na fila volta como "parada" (o processo se foi).
//   - conferencia de site em estado NAO terminal (conferindo/corrigindo) vira
//     "pendencias": o server pode ter caido no meio da conferencia e o estado
//     ficaria preso. A barreira do deploy reconfere de qualquer jeito (A3).
export function saneiaSessaoPersistida(
  bruta: unknown,
  workspaceIdDaPasta: string,
): Sessao | null {
  if (!bruta || typeof bruta !== "object") return null;
  const b = bruta as Record<string, unknown>;
  if (typeof b.id !== "string" || !b.id) return null;

  const agora = new Date().toISOString();
  const texto = (v: unknown, padrao = ""): string => (typeof v === "string" ? v : padrao);
  const data = (v: unknown): string => (typeof v === "string" && v ? v : agora);

  let status: StatusSessao =
    typeof b.status === "string" && STATUS_VALIDOS.has(b.status as StatusSessao)
      ? (b.status as StatusSessao)
      : "parada";
  // Qualquer sessao que estava ativa ou na fila virou parada no boot.
  if (status === "rodando" || status === "iniciando" || status === "fila") {
    status = "parada";
  }

  const sessao: Sessao = {
    ...(b as Partial<Sessao>),
    id: b.id,
    provedor: b.provedor === "codex" ? "codex" : "claude",
    workspaceId:
      typeof b.workspaceId === "string" && b.workspaceId
        ? b.workspaceId
        : workspaceIdDaPasta,
    titulo: texto(b.titulo, "Sessao"),
    prompt: texto(b.prompt),
    pastaTrabalho: texto(b.pastaTrabalho),
    criadaEm: data(b.criadaEm),
    atualizadaEm: data(b.atualizadaEm),
    status,
  };

  // A3: conferencia de site presa em estado nao terminal vira pendencias.
  const conf = sessao.conferenciaSite;
  if (conf && typeof conf === "object" && !ESTADOS_CONFERENCIA_TERMINAIS.has(conf.estado)) {
    sessao.conferenciaSite = {
      estado: "pendencias",
      volta: typeof conf.volta === "number" ? conf.volta : 0,
    };
  }

  return sessao;
}

const REGRA_CONTEXTO_CRM =
  "REGRA DURA: use o contexto-crm como insight para orientar conteudo e decisao. " +
  "E PROIBIDO publicar em qualquer peca, site, carrossel ou texto publico: nome completo, " +
  "telefone, email ou qualquer dado identificavel de cliente. Insight agregado sim, dado pessoal nunca.";

// Le o custo e o sinal de erro de um evento result. Custo de result com erro
// NAO soma (nem na sessao nem no workspace): so contabiliza turno que deu certo
// (M10). No Codex o custo ja e estimado, entao um erro tambem nao pode inflar.
//
// custoConhecido=false e diferente de custo zero. Vale quando o provedor declara
// que nao sabe (custo_conhecido: false) ou quando o turno conclui bem sem trazer
// total_cost_usd numerico. Nesse caso nada e somado ao total em dolar e o turno
// e contado a parte, pra tela poder dizer que o total virou um piso.
export function custoDoResult(evento: Record<string, unknown>): {
  custoUsd: number;
  ehErro: boolean;
  custoConhecido: boolean;
  motivoSemCusto?: string;
} {
  const ehErro = evento["is_error"] === true || evento["subtype"] === "error";
  if (ehErro) {
    return { custoUsd: 0, ehErro: true, custoConhecido: true };
  }
  if (evento["custo_conhecido"] === false) {
    const motivo = evento["motivo_sem_custo"];
    return {
      custoUsd: 0,
      ehErro: false,
      custoConhecido: false,
      motivoSemCusto:
        typeof motivo === "string" && motivo
          ? motivo
          : "O provedor concluiu o turno sem saber informar o custo.",
    };
  }
  const bruto = evento["total_cost_usd"];
  if (typeof bruto !== "number" || !Number.isFinite(bruto)) {
    return {
      custoUsd: 0,
      ehErro: false,
      custoConhecido: false,
      motivoSemCusto: "O turno concluiu sem trazer o custo (total_cost_usd ausente).",
    };
  }
  return { custoUsd: bruto, ehErro: false, custoConhecido: true };
}

function numeroDe(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

// Extrai os tokens de um evento result, com o split honesto: entradaNova (input
// direto), cacheEscrita (creation), cacheLeitura (read) e saida. entrada e o
// total das tres entradas, tudo que entra de contexto no modelo.
//
// MEDIDO em 2026-07-27 (Claude Code 2.1.220): o bloco `usage` do topo cobre so a
// ultima iteracao do turno, enquanto `modelUsage` cobre TODAS as chamadas de
// modelo do turno, e e dele que sai o total_cost_usd. Num turno simples o usage
// dizia 10 tokens de entrada e 305 de saida, e o modelUsage dizia 532 e 317, com
// o custo batendo centavo a centavo com o modelUsage. Por isso modelUsage vem
// primeiro: sem ele, os tokens da tela contavam menos do que o dolar cobrava.
// Provedor que nao manda modelUsage (Codex) cai no usage, como antes.
export function extrairTokensDoResult(evento: Record<string, unknown>): {
  entradaNova: number;
  cacheEscrita: number;
  cacheLeitura: number;
  entrada: number;
  saida: number;
} {
  const doModelo = extrairTokensDeModelUsage(evento["modelUsage"]);
  const base = doModelo ?? extrairTokensDeUsage(evento["usage"]);
  return { ...base, entrada: base.entradaNova + base.cacheEscrita + base.cacheLeitura };
}

// Soma o uso de todos os modelos usados no turno. Devolve null quando o campo
// nao existe ou nao tem nenhum modelo, pra o chamador cair no usage.
function extrairTokensDeModelUsage(valor: unknown): {
  entradaNova: number;
  cacheEscrita: number;
  cacheLeitura: number;
  saida: number;
} | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const modelos = Object.values(valor as Record<string, unknown>).filter(
    (m): m is Record<string, unknown> => !!m && typeof m === "object",
  );
  if (modelos.length === 0) return null;
  let entradaNova = 0;
  let cacheEscrita = 0;
  let cacheLeitura = 0;
  let saida = 0;
  for (const m of modelos) {
    entradaNova += numeroDe(m["inputTokens"]);
    cacheEscrita += numeroDe(m["cacheCreationInputTokens"]);
    cacheLeitura += numeroDe(m["cacheReadInputTokens"]);
    saida += numeroDe(m["outputTokens"]);
  }
  return { entradaNova, cacheEscrita, cacheLeitura, saida };
}

function extrairTokensDeUsage(usage: unknown): {
  entradaNova: number;
  cacheEscrita: number;
  cacheLeitura: number;
  saida: number;
} {
  if (!usage || typeof usage !== "object") {
    return { entradaNova: 0, cacheEscrita: 0, cacheLeitura: 0, saida: 0 };
  }
  const u = usage as Record<string, unknown>;
  return {
    entradaNova: numeroDe(u["input_tokens"]),
    cacheEscrita: extrairCacheEscrita(u),
    // O dialeto interno normaliza input_tokens como entrada nova. O adaptador do
    // Codex separa cached_input_tokens em cache_read_input_tokens antes daqui.
    cacheLeitura:
      numeroDe(u["cache_read_input_tokens"]) || numeroDe(u["cached_input_tokens"]),
    saida: numeroDe(u["output_tokens"]),
  };
}

// Cache de escrita robusto: usa cache_creation_input_tokens quando for numero.
// Se nao existir, algumas versoes do CLI trazem cache_creation como objeto
// aninhado (ephemeral_5m_input_tokens etc): nesse caso soma os numeros do objeto.
function extrairCacheEscrita(u: Record<string, unknown>): number {
  const direto = u["cache_creation_input_tokens"];
  if (typeof direto === "number") {
    return direto;
  }
  const aninhado = u["cache_creation"];
  if (aninhado && typeof aninhado === "object") {
    let soma = 0;
    for (const v of Object.values(aninhado as Record<string, unknown>)) {
      if (typeof v === "number") {
        soma += v;
      }
    }
    return soma;
  }
  return 0;
}

// Le a linha de base de uso que o provedor acumulativo devolve no result, pra
// virar o ponto de partida da proxima retomada da mesma conversa.
export function usoAcumuladoDoResult(
  evento: Record<string, unknown>,
): UsoAcumuladoSessao | undefined {
  const bruto = evento["uso_acumulado"];
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return undefined;
  const u = bruto as Record<string, unknown>;
  return {
    entradaTotal: numeroDe(u["entradaTotal"]),
    entradaCache: numeroDe(u["entradaCache"]),
    saida: numeroDe(u["saida"]),
    raciocinio: numeroDe(u["raciocinio"]),
  };
}

// Manda um evento de sessao SO pras abas que declararam o workspace dela.
//
// Antes tudo isto saia em broadcast com o workspaceId dentro do payload, e quem
// filtrava era o frontend. Vale pra sessao:status e sessao:conferencia, e
// principalmente pro sessao:evento, que repassa o stream cru do provedor: o
// Cerebro do cliente, o texto da resposta e trechos de arquivo lido. Qualquer
// aba recebia o stream de qualquer cliente.
//
// Sessao sem workspace e dado legado (o campo e opcional no tipo, e toda sessao
// criada hoje nasce com o workspace ativo). Ela nao pertence a cliente nenhum,
// entao nao ha escopo pra respeitar e o broadcast segue valendo: melhor uma aba
// receber um evento que nao e dela do que o cockpit ficar mudo.
function transmitirDaSessao(sessao: Pick<Sessao, "workspaceId">, mensagem: object): void {
  if (sessao.workspaceId) {
    transmitirPara(sessao.workspaceId, mensagem);
    return;
  }
  transmitir(mensagem);
}

export function montarInstrucoesExtrasSessao(
  sessao: Pick<Sessao, "contextoCrm">,
): string | undefined {
  const blocos: string[] = [];
  if (sessao.contextoCrm) {
    blocos.push(
      `<contexto-crm>\nResumo do CRM do usuario (agregado, gerado agora):\n${sessao.contextoCrm}\n</contexto-crm>\n${REGRA_CONTEXTO_CRM}`,
    );
  }
  return blocos.length > 0 ? blocos.join("\n\n") : undefined;
}

export class GerenciadorSessoes {
  private sessoes: Sessao[] = [];
  private execucoes = new Map<string, Execucao>();
  private timerSalvar: NodeJS.Timeout | null = null;

  private iniciado = false;

  // Laco de conformidade de site. Injeta a auditoria real, a retomada da propria
  // sessao e o setter de conferencia. Fica pronto na criacao do gerenciador.
  private laco: LacoConformidade = criarLacoConformidade({
    auditar: (sessao) => this.auditarPecaDaSessao(sessao),
    retomar: (id, prompt) => this.continuar(id, prompt, { interno: true }),
    definirConferencia: (id, conferencia) => this.definirConferencia(id, conferencia),
    ehPecaSite: (sessao) => this.pecaEhSite(sessao),
    statusSessao: (id) => this.acharSessao(id)?.status,
  });

  constructor() {
    // O carregamento e explicito (iniciar), chamado pelo index.ts depois da
    // migracao, pra o registro de workspaces ja existir na hora de ler.
  }

  // Carrega as sessoes de todos os workspaces. Idempotente: so a primeira vez.
  inicializar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.carregar();
  }

  // Retorna a lista de sessoes. Sem filtro, todas; com workspaceId, so as dele.
  // Copia rasa pra proteger o indice interno.
  listar(workspaceId?: string): Sessao[] {
    const base = workspaceId
      ? this.sessoes.filter((s) => s.workspaceId === workspaceId)
      : this.sessoes;
    return base.map((s) => ({ ...s }));
  }

  // Acha uma sessao por id, sem filtro de workspace (uso interno das rotas).
  acharSessao(id: string): Sessao | undefined {
    return this.sessoes.find((s) => s.id === id);
  }

  // Cria uma sessao nova e inicia se houver vaga, senao entra na fila.
  criar(entrada: {
    titulo?: string;
    prompt: string;
    skill?: string;
    pastaTrabalho: string;
    modelo?: string;
    workspaceId: string;
    permissao?: "padrao" | "total";
    contextoCrm?: string;
    pastaAlvo?: string;
  }): Sessao {
    const agora = new Date().toISOString();
    const provedor = obterProvedorAtivo();
    // Sem modelo escolhido, cai no padrao do provedor que a sessao vai guardar.
    const modeloConfigurado = obterModeloPadraoDoProvedor(provedor.id);
    const modelosDisponiveis = provedor.modelos().map((modelo) => modelo.alias);
    const modeloPadrao = modelosDisponiveis.includes(modeloConfigurado)
      ? modeloConfigurado
      : modelosDisponiveis[0] ?? modeloConfigurado;
    const modeloAlias = entrada.modelo ?? modeloPadrao;
    const sessao: Sessao = {
      id: this.gerarId(),
      provedor: provedor.id,
      titulo: (entrada.titulo ?? entrada.prompt).trim().slice(0, 120) || "Sessao",
      prompt: entrada.prompt,
      skill: entrada.skill,
      workspaceId: entrada.workspaceId,
      status: "iniciando",
      criadaEm: agora,
      atualizadaEm: agora,
      pastaTrabalho: entrada.pastaTrabalho,
      // Modo de permissao do spawn. Sem escolha, o padrao seguro (acceptEdits).
      // Persiste na sessao, entao vale tambem nas continuacoes via --resume.
      permissao: entrada.permissao ?? "padrao",
      contextoCrm: entrada.contextoCrm,
      // Chave do laco de conformidade. Geracao guiada de site e ajuste de site
      // preenchem; qualquer outra skill nunca carrega pastaAlvo.
      pastaAlvo: skillPassaPelaConferencia(entrada.skill) ? entrada.pastaAlvo : undefined,
    };

    this.execucoes.set(sessao.id, {
      processo: null,
      promptPendente: entrada.prompt,
      ehResume: false,
      recebeuInit: false,
      recebeuResult: false,
      resultComErro: false,
      paradaManual: false,
      modeloAlias,
    });

    // Prompt inicial vira o primeiro turno do usuario na transcricao.
    anexarTurno(sessao.workspaceId ?? "", sessao.id, {
      papel: "usuario",
      texto: entrada.prompt,
      em: agora,
    });

    this.sessoes.push(sessao);

    if (this.temVaga()) {
      this.iniciar(sessao);
    } else {
      this.definirStatus(sessao, "fila");
    }

    this.agendarSalvar();
    return { ...sessao };
  }

  // Continua uma sessao concluida ou parada com um texto novo, via --resume.
  // `interno` marca a retomada automatica do laco de conformidade: nesse caso o
  // prompt original da sessao e preservado (o texto de correcao e de maquina, nao
  // fala do usuario) e o turno entra marcado como interno do Hub.
  continuar(
    id: string,
    texto: string,
    opcoes?: { interno?: boolean },
  ): { ok: boolean; erro?: string } {
    const sessao = this.sessoes.find((s) => s.id === id);
    if (!sessao) {
      return { ok: false, erro: "sessao nao encontrada" };
    }
    if (!sessao.sessionIdClaude) {
      return { ok: false, erro: "sessao ainda nao tem id da conversa pra retomar" };
    }

    const interno = opcoes?.interno === true;
    const execucao = this.garantirExecucao(id);
    execucao.promptPendente = texto;
    execucao.ehResume = true;
    execucao.recebeuInit = false;
    execucao.recebeuResult = false;
    execucao.resultComErro = false;
    execucao.paradaManual = false;

    // Retomada manual do usuario troca o prompt visivel; a automatica do Hub
    // preserva o prompt original (M9).
    if (!interno) {
      sessao.prompt = texto;
    }

    // Mensagem de continuacao vira turno do usuario na transcricao. O turno
    // interno do Hub e marcado pra transcricao exibir discreto.
    anexarTurno(sessao.workspaceId ?? "", id, {
      papel: "usuario",
      texto,
      em: new Date().toISOString(),
      interno: interno ? true : undefined,
    });

    if (this.temVaga()) {
      this.iniciar(sessao);
    } else {
      this.definirStatus(sessao, "fila");
    }
    this.agendarSalvar();
    return { ok: true };
  }

  // Mata o processo da sessao e marca como parada.
  parar(id: string): { ok: boolean; erro?: string } {
    const sessao = this.sessoes.find((s) => s.id === id);
    if (!sessao) {
      return { ok: false, erro: "sessao nao encontrada" };
    }

    const execucao = this.execucoes.get(id);
    if (execucao) {
      execucao.paradaManual = true;
      execucao.processo?.parar();
      execucao.processo = null;
    }

    // Se estava so na fila, nem chegou a rodar. Marca parada direto.
    this.definirStatus(sessao, "parada");
    this.agendarSalvar();
    this.processarFila();
    return { ok: true };
  }

  // Remove uma sessao: para o processo se estiver rodando e apaga do indice.
  remover(id: string): { ok: boolean; erro?: string } {
    const sessao = this.sessoes.find((s) => s.id === id);
    if (!sessao) {
      return { ok: false, erro: "sessao nao encontrada" };
    }

    const execucao = this.execucoes.get(id);
    if (execucao) {
      // Marca parada manual pra o close nao virar erro, e mata o processo.
      execucao.paradaManual = true;
      execucao.processo?.parar();
      execucao.processo = null;
    }
    this.execucoes.delete(id);
    this.laco.esquecer(id);

    // A transcricao vai junto. O custos.json fica, o acumulado nao se perde.
    apagarTranscricao(sessao.workspaceId ?? "", id);

    this.sessoes = this.sessoes.filter((s) => s.id !== id);
    this.agendarSalvar();
    // Abriu vaga: sobe a proxima da fila, se houver.
    this.processarFila();
    return { ok: true };
  }

  // ---- interno ----

  private gerarId(): string {
    const aleatorio = Math.random().toString(36).slice(2, 8);
    return `s-${Date.now().toString(36)}-${aleatorio}`;
  }

  private garantirExecucao(id: string): Execucao {
    let execucao = this.execucoes.get(id);
    if (!execucao) {
      execucao = {
        processo: null,
        promptPendente: "",
        ehResume: false,
        recebeuInit: false,
      recebeuResult: false,
        resultComErro: false,
        paradaManual: false,
        modeloAlias: "",
      };
      this.execucoes.set(id, execucao);
    }
    return execucao;
  }

  // Conta quantas sessoes estao ocupando vaga agora.
  private ativas(): number {
    return this.sessoes.filter((s) => s.status === "iniciando" || s.status === "rodando").length;
  }

  private temVaga(): boolean {
    return this.ativas() < LIMITE_ATIVAS;
  }

  // Sobe a proxima sessao da fila enquanto houver vaga. Ordem de chegada.
  private processarFila(): void {
    while (this.temVaga()) {
      const proxima = this.sessoes
        .filter((s) => s.status === "fila")
        .sort((a, b) => a.criadaEm.localeCompare(b.criadaEm))[0];
      if (!proxima) {
        break;
      }
      this.iniciar(proxima);
    }
  }

  // Atualiza o status, carimba a data, persiste e transmite a transicao.
  private definirStatus(sessao: Sessao, status: StatusSessao, detalhe?: string): void {
    sessao.status = status;
    sessao.atualizadaEm = new Date().toISOString();
    // O evento leva o workspaceId pro frontend ignorar os de workspaces inativos.
    const mensagem: {
      tipo: string;
      id: string;
      workspaceId?: string;
      status: StatusSessao;
      detalhe?: string;
    } = {
      tipo: "sessao:status",
      id: sessao.id,
      workspaceId: sessao.workspaceId,
      status,
    };
    if (detalhe) {
      mensagem.detalhe = detalhe;
    }
    transmitirDaSessao(sessao, mensagem);
    this.agendarSalvar();
  }

  // Atualiza o estado do laco de conformidade na sessao e emite no WS, do mesmo
  // jeito que uma transicao de status: o frontend usa pra mostrar a fase.
  private definirConferencia(id: string, conferencia: ConferenciaSite): void {
    const sessao = this.sessoes.find((s) => s.id === id);
    if (!sessao) return;
    sessao.conferenciaSite = conferencia;
    sessao.atualizadaEm = new Date().toISOString();
    transmitirDaSessao(sessao, {
      tipo: "sessao:conferencia",
      id: sessao.id,
      workspaceId: sessao.workspaceId,
      conferencia,
    });
    this.agendarSalvar();
  }

  // A pastaAlvo existe como peca de site: tem index.html na raiz e nao e um
  // carrossel HTML-first. Guarda o laco de auditar carrossel ou pasta vazia.
  private pecaEhSite(sessao: Sessao): boolean {
    const workspaceId = sessao.workspaceId;
    const pasta = sessao.pastaAlvo;
    if (!workspaceId || !pasta) return false;
    try {
      const arquivos = listarArquivosSite(pastaDaPeca(workspaceId, pasta)).map((c) =>
        c.toLowerCase(),
      );
      return arquivos.includes("index.html") && !arquivos.includes("carrossel.html");
    } catch {
      return false;
    }
  }

  // Roda a auditoria completa (estrutural + visual) na peca da sessao e traduz
  // pro formato que o laco espera. Usa a mesma funcao de conferencia do deploy
  // (conferirSiteParaConformidade, que roda o nucleo unificado sem cache) e o
  // mesmo host resolvido no server (hostLocalDoHub), pra os dois caminhos conferirem
  // exatamente a MESMA URL (M3). Ao terminar a volta, invalida o cache do deploy da
  // peca pra o painel nao servir um veredito velho logo depois da correcao.
  private async auditarPecaDaSessao(sessao: Sessao): Promise<ConferenciaConformidade> {
    if (!sessao.workspaceId || !sessao.pastaAlvo) {
      return { verificavel: false, valido: false, erros: [], avisos: [] };
    }
    const alvo = { workspaceId: sessao.workspaceId, pasta: sessao.pastaAlvo };
    try {
      return await conferirSiteParaConformidade(alvo, hostLocalDoHub());
    } finally {
      // A conferencia leu os arquivos frescos desta volta; o cache do deploy pode
      // ter um veredito anterior. Invalida pra a barreira de publicacao reconferir.
      invalidarCacheAuditoria(alvo.workspaceId, alvo.pasta);
    }
  }

  // Pede o processo ao provedor e liga os mesmos tratadores historicos.
  private iniciar(sessao: Sessao): void {
    const execucao = this.garantirExecucao(sessao.id);

    this.definirStatus(sessao, "iniciando");
    execucao.recebeuInit = false;
    execucao.recebeuResult = false;
    execucao.resultComErro = false;

    let processo: ProcessoSessao;
    try {
      const provedor = obterProvedorDaSessao(sessao);
      const preparado = prepararPromptEWorkspace(
        sessao.pastaTrabalho,
        execucao.promptPendente,
        provedor.id,
      );
      if (preparado.agents === "manual-preservado") {
        console.warn(
          `AGENTS.md manual preservado em ${sessao.pastaTrabalho}. O Codex usara esse arquivo.`,
        );
      }

      // Conexoes MCP habilitadas no workspace desta sessao. Se ha config, aponta
      // o arquivo e os servidores ao provedor. Sem habilitados, devolve null.
      const configMcp = montarConfigMcp(sessao.workspaceId ?? "");
      processo = provedor.iniciarSessao({
        pastaTrabalho: sessao.pastaTrabalho,
        prompt: preparado.prompt,
        modelo: resolverModeloDaExecucao(
          sessao,
          execucao.modeloAlias,
          execucao.ehResume,
        ),
        permissao: sessao.permissao === "total" ? "total" : "padrao",
        retomada:
          execucao.ehResume && sessao.sessionIdClaude ? sessao.sessionIdClaude : undefined,
        mcp: configMcp,
        // Toda retomada repete a injecao com que a sessao nasceu, pra
        // conversa nao mudar de personalidade no meio.
        instrucoesExtras: montarInstrucoesExtrasSessao(sessao),
        // Linha de base pro provedor que reporta uso acumulado da conversa.
        // So faz sentido em retomada; em sessao nova o acumulado E o turno.
        usoAnterior: execucao.ehResume ? sessao.usoAcumuladoProvedor ?? null : undefined,
      });
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : String(e);
      this.definirStatus(
        sessao,
        "erro",
        `falha ao preparar ou iniciar o provedor ${sessao.provedor}: ${detalhe}`,
      );
      sessao.erro = detalhe;
      this.processarFila();
      return;
    }

    execucao.processo = processo;

    processo.aoEvento((evento) => {
      this.tratarEvento(sessao, execucao, evento);
    });
    processo.aoErro((erro) => {
      this.definirStatus(sessao, "erro", erro.message);
      sessao.erro = erro.message;
      execucao.processo = null;
      this.processarFila();
    });
    processo.aoFechar(({ codigo, stderr }) => {
      this.aoFechar(sessao, execucao, codigo, stderr);
    });
  }

  // Interpreta um evento do stream-json e repassa cru pro frontend.
  private tratarEvento(sessao: Sessao, execucao: Execucao, evento: Record<string, unknown>): void {
    transmitirDaSessao(sessao, {
      tipo: "sessao:evento",
      id: sessao.id,
      workspaceId: sessao.workspaceId,
      evento,
    });

    const tipo = evento["type"];

    // Evento assistant: pode trazer blocos tool_use. Emite um evento leve por
    // ferramenta usada, sem tocar no fluxo de texto, status e custos.
    if (tipo === "assistant") {
      this.emitirFerramentas(sessao, evento);
    }

    // Evento init: type=system, subtype=init. Traz o session_id do claude.
    if (tipo === "system" && evento["subtype"] === "init") {
      const idClaude = evento["session_id"];
      if (typeof idClaude === "string") {
        sessao.sessionIdClaude = idClaude;
      }
      // Modelo real desta sessao, como o CLI o resolveu (ex: claude-haiku-4-5-...).
      const modeloReal = evento["model"];
      if (typeof modeloReal === "string") {
        sessao.modelo = modeloReal;
      }
      if (sessao.status === "iniciando") {
        this.definirStatus(sessao, "rodando");
      }
      this.agendarSalvar();
      return;
    }

    // Evento result: fim do turno. Traz custo, tokens e o texto final.
    if (tipo === "result") {
      execucao.recebeuResult = true;

      // Custo deste trecho. Result com erro nao soma custo (M10): custoTrecho
      // ja vem 0 nesse caso, entao sessao, transcricao e workspace ficam limpos.
      const {
        custoUsd: custoTrecho,
        ehErro,
        custoConhecido,
        motivoSemCusto,
      } = custoDoResult(evento);
      sessao.custoUsd = (sessao.custoUsd ?? 0) + (custoConhecido ? custoTrecho : 0);
      if (!custoConhecido) {
        sessao.turnosSemCusto = (sessao.turnosSemCusto ?? 0) + 1;
      }
      // Todo custo em dolar e estimativa: o CLI do Claude tambem calcula o
      // total_cost_usd de uma tabela de precos embutida, nao e cobranca real, e
      // aqui a auth e a assinatura, nao chave de API. Entao qualquer trecho bem
      // concluido conta como estimado, nao so o Codex.
      const custoEstimado = !ehErro;
      sessao.estimado = (sessao.estimado ?? false) || custoEstimado;

      // Tokens deste trecho, ja com o split honesto: entrada nova, cache escrita,
      // cache leitura e saida. tokensEntrada segue sendo o total (soma das tres entradas).
      const { entradaNova, cacheEscrita, cacheLeitura, entrada, saida } =
        extrairTokensDoResult(evento);
      // Linha de base do proximo turno, pro provedor que reporta uso acumulado
      // da conversa (Codex). Persiste na sessao pra sobreviver a um restart.
      const usoAcumulado = usoAcumuladoDoResult(evento);
      if (usoAcumulado) {
        sessao.usoAcumuladoProvedor = usoAcumulado;
      }
      sessao.tokensEntradaNova = (sessao.tokensEntradaNova ?? 0) + entradaNova;
      sessao.tokensCacheEscrita = (sessao.tokensCacheEscrita ?? 0) + cacheEscrita;
      sessao.tokensCacheLeitura = (sessao.tokensCacheLeitura ?? 0) + cacheLeitura;
      sessao.tokensEntrada = (sessao.tokensEntrada ?? 0) + entrada;
      sessao.tokensSaida = (sessao.tokensSaida ?? 0) + saida;

      execucao.resultComErro = ehErro;
      const texto = evento["result"];
      if (!ehErro) {
        if (typeof texto === "string") {
          sessao.resultado = texto;
        }
        // Resposta da IA vira turno "assistente" com o custo do trecho.
        anexarTurno(sessao.workspaceId ?? "", sessao.id, {
          papel: "assistente",
          texto: typeof texto === "string" ? texto : "",
          em: new Date().toISOString(),
          custoUsd: custoConhecido ? custoTrecho : undefined,
          estimado: custoEstimado,
          custoDesconhecido: custoConhecido ? undefined : true,
        });
      } else {
        sessao.erro = typeof texto === "string" ? texto : "result com erro";
      }

      // Acumula no custos.json do workspace DA SESSAO (nao do ativo no momento).
      // So conta sessao nova quando nao e continuacao e concluiu bem.
      registrarResult(sessao.workspaceId ?? "", {
        custoUsd: custoTrecho,
        custoConhecido,
        motivoSemCusto,
        tokensEntradaNova: entradaNova,
        tokensCacheEscrita: cacheEscrita,
        tokensCacheLeitura: cacheLeitura,
        tokensEntrada: entrada,
        tokensSaida: saida,
        contarSessao: !execucao.ehResume && !ehErro,
        provedor: sessao.provedor,
        estimado: custoEstimado,
        sessaoId: sessao.id,
        modelo: sessao.modelo ?? "",
        ehResume: execucao.ehResume,
        ehErro,
      });

      this.agendarSalvar();
      return;
    }
  }

  // Varre os blocos de conteudo de um evento assistant e emite um evento
  // sessao:ferramenta por bloco tool_use. Nao altera nada do fluxo existente.
  private emitirFerramentas(sessao: Sessao, evento: Record<string, unknown>): void {
    const mensagem = evento["message"];
    if (!mensagem || typeof mensagem !== "object") return;
    const conteudo = (mensagem as Record<string, unknown>)["content"];
    if (!Array.isArray(conteudo)) return;

    for (const bloco of conteudo) {
      if (!bloco || typeof bloco !== "object") continue;
      const b = bloco as Record<string, unknown>;
      if (b["type"] !== "tool_use") continue;
      const nome = typeof b["name"] === "string" ? b["name"] : "";
      const alvo = this.resumirAlvo(b["input"]);
      // Vai pelo mesmo escopo do stream: o alvo da ferramenta e um caminho de
      // arquivo ou um comando do cliente, e o frontend nem filtrava este tipo.
      transmitirDaSessao(sessao, {
        tipo: "sessao:ferramenta",
        id: sessao.id,
        nome,
        alvo,
      });
    }
  }

  // Resumo curto do alvo de uma ferramenta: file_path do input, ou o comando
  // truncado em 80 caracteres, ou string vazia quando nao ha nada util.
  private resumirAlvo(input: unknown): string {
    if (!input || typeof input !== "object") return "";
    const i = input as Record<string, unknown>;
    if (typeof i["file_path"] === "string" && i["file_path"]) {
      return i["file_path"];
    }
    if (typeof i["command"] === "string" && i["command"]) {
      const comando = i["command"];
      return comando.length > 80 ? `${comando.slice(0, 80)}...` : comando;
    }
    return "";
  }

  // Fecha a sessao: decide status final e sobe a proxima da fila.
  private aoFechar(
    sessao: Sessao,
    execucao: Execucao,
    codigo: number | null,
    stderr: string,
  ): void {
    execucao.processo = null;

    // O turno comecou (o CLI subiu e mandou o init) e o processo morreu sem
    // mandar o result: queda, timeout ou parada manual no meio. O credito ja foi
    // consumido e ninguem vai dizer quanto foi. Contar zero seria mentira, entao
    // vira turno sem medicao e o total do cliente se declara um piso.
    if (execucao.recebeuInit && !execucao.recebeuResult) {
      registrarTurnoSemMedicao(sessao.workspaceId ?? "", {
        sessaoId: sessao.id,
        provedor: sessao.provedor,
        modelo: sessao.modelo ?? "",
        ehResume: execucao.ehResume,
        motivo: execucao.paradaManual
          ? "A sessao foi parada com o turno em andamento."
          : `O processo terminou sem mandar o result (codigo ${codigo ?? "desconhecido"}).`,
      });
    }

    // Parada manual ja definiu o status. Nao mexe.
    if (execucao.paradaManual) {
      this.processarFila();
      return;
    }

    if (execucao.recebeuResult && !execucao.resultComErro) {
      // Peca de site que vai passar pelo laco: marca "conferindo" ANTES de
      // anunciar a conclusao, pra o frontend nunca ver a peca como pronta no
      // meio da conferencia. Emitido antes do status, entao chega antes no WS.
      const vaiConferir = deveDispararLaco(sessao) && this.pecaEhSite(sessao);
      if (vaiConferir) {
        this.definirConferencia(sessao.id, {
          estado: "conferindo",
          volta: sessao.conferenciaSite?.volta ?? 0,
        });
      }
      this.definirStatus(sessao, "concluida");
      // Anuncia a conclusao no barramento, depois de definir o status. Se o
      // workspace for indefinido, o barramento so nao grava no log; nao quebra.
      if (sessao.workspaceId) {
        emitir({
          tipo: "sessao:concluida",
          workspaceId: sessao.workspaceId,
          em: new Date().toISOString(),
          dados: { id: sessao.id, skill: sessao.skill, titulo: sessao.titulo },
        });
      }
      // Laco de conformidade de site: confere a peca e, se preciso, retoma esta
      // mesma sessao pra corrigir. Fire-and-forget: a auditoria e a retomada
      // seguem o proprio fluxo de eventos. Uma falha aqui nao pode derrubar o
      // fechamento da sessao.
      if (vaiConferir) {
        void this.laco.aoConcluir({ ...sessao }).catch(() => {
          /* o laco ja registra pendencias no proprio fluxo */
        });
      }
    } else if (execucao.resultComErro) {
      this.definirStatus(sessao, "erro", sessao.erro);
    } else {
      // Terminou sem result. Erro. Usa o stderr como pista.
      const detalhe = stderr.trim() || `processo terminou com codigo ${codigo ?? "desconhecido"}`;
      sessao.erro = detalhe;
      this.definirStatus(sessao, "erro", detalhe);
    }

    this.agendarSalvar();
    this.processarFila();
  }

  // ---- persistencia ----

  private agendarSalvar(): void {
    if (this.timerSalvar) {
      return;
    }
    this.timerSalvar = setTimeout(() => {
      this.timerSalvar = null;
      this.salvar();
    }, 150);
  }

  // Persiste cada sessao no sessoes.json do SEU workspace. Escreve tambem os
  // workspaces que ficaram sem sessao mas ja tinham arquivo, pra persistir a
  // remocao. Nao cria arquivo vazio pra workspace que nunca teve sessao.
  private salvar(): void {
    try {
      const ids = new Set<string>(listarIdsWorkspaces());
      for (const s of this.sessoes) {
        if (s.workspaceId) ids.add(s.workspaceId);
      }
      for (const id of ids) {
        const doWorkspace = this.sessoes.filter((s) => s.workspaceId === id);
        const arquivo = path.join(pastaDadosWorkspace(id), NOME_ARQUIVO_SESSOES);
        if (doWorkspace.length === 0 && !existsSync(arquivo)) continue;
        garantirPastaDadosWorkspace(id);
        gravarJsonAtomico(arquivo, doWorkspace);
      }
    } catch {
      // Falha ao gravar nao pode derrubar o gerenciador.
    }
  }

  // Carrega o indice no boot de TODOS os workspaces do registro e normaliza:
  // nada volta rodando. Cada sessao herda o workspaceId da pasta de onde veio,
  // se ainda nao o tiver (compatibilidade com dado migrado).
  private carregar(): void {
    const todas: Sessao[] = [];
    for (const id of listarIdsWorkspaces()) {
      const arquivo = path.join(pastaDadosWorkspace(id), NOME_ARQUIVO_SESSOES);
      try {
        if (!existsSync(arquivo)) continue;
        const dados = JSON.parse(readFileSync(arquivo, "utf8"));
        if (!Array.isArray(dados)) continue;
        for (const bruta of dados) {
          // Saneamento defensivo: entrada malformada e ignorada com log, sem
          // derrubar o boot. Normaliza provedor, workspace, status e conferencia.
          const sessao = saneiaSessaoPersistida(bruta, id);
          if (!sessao) {
            console.warn(`Sessao malformada ignorada no workspace ${id}.`);
            continue;
          }
          todas.push(sessao);
        }
      } catch {
        // Roda no boot, entao nao pode lancar: um workspace corrompido nao pode
        // impedir o Hub de subir. Mas ignorar em silencio deixava a lista de
        // sessoes daquele workspace de fora, e o agendarSalvar seguinte gravava
        // a lista sem elas por cima do arquivo. Quarentena antes, pra a proxima
        // gravacao nunca alcancar o original.
        const movido = quarentenar(arquivo);
        console.warn(
          movido
            ? `Sessoes do workspace ${id} estavam corrompidas. Original preservado em ${basename(movido)}.`
            : `Sessoes do workspace ${id} estavam corrompidas e nao deu pra mover pra quarentena.`,
        );
      }
    }
    this.sessoes = todas;
  }
}

// Instancia unica usada pelas rotas.
export const gerenciador = new GerenciadorSessoes();
