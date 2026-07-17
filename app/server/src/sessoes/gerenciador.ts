// Gerenciador das sessoes de IA em paralelo. O coracao do orquestrador.
// Recebe eventos do provedor, transmite eventos e status pelo WebSocket,
// respeita o limite de sessoes simultaneas e persiste o indice.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ConferenciaSite, Sessao, StatusSessao } from "../tipos.js";
import type { ProcessoSessao } from "../provedores/contrato.js";
import {
  conferirSiteParaConformidade,
  type ConferenciaConformidade,
} from "../publicacao/auditoria.js";
import { listarArquivosSite } from "../vkos/siteEstatico.js";
import { pastaDaPeca } from "../publicacao/arquivos.js";
import {
  criarLacoConformidade,
  deveDispararLaco,
  type LacoConformidade,
} from "./conformidade-site.js";
import { obterProvedorAtivo, obterProvedorDaSessao } from "../provedores/index.js";
import { prepararPromptEWorkspace } from "../provedores/skills.js";
import { transmitir } from "../ws.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { obterConfigApp, obterModeloPadraoDoProvedor } from "../config/estado.js";
import { REGRA_MODO_ENXUTO } from "./modo-enxuto.js";
import { anexarTurno, apagarTranscricao } from "./transcricao.js";
import { registrarResult } from "./custos.js";
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

const REGRA_CONTEXTO_CRM =
  "REGRA DURA: use o contexto-crm como insight para orientar conteudo e decisao. " +
  "E PROIBIDO publicar em qualquer peca, site, carrossel ou texto publico: nome completo, " +
  "telefone, email ou qualquer dado identificavel de cliente. Insight agregado sim, dado pessoal nunca.";

export function montarInstrucoesExtrasSessao(
  sessao: Pick<Sessao, "modoEnxuto" | "contextoCrm">,
): string | undefined {
  const blocos: string[] = [];
  if (sessao.modoEnxuto) blocos.push(REGRA_MODO_ENXUTO);
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
    retomar: (id, prompt) => this.continuar(id, prompt),
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
    // Modo enxuto decidido UMA vez, na criacao, e travado na sessao como
    // permissao e modelo. A geracao guiada (carrossel, site) nunca recebe.
    const enxuto =
      obterConfigApp().modoEnxuto &&
      entrada.skill !== "carrossel" &&
      entrada.skill !== "site";
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
      modoEnxuto: enxuto,
      contextoCrm: entrada.contextoCrm,
      // So a geracao guiada de site preenche. E a chave do laco de conformidade.
      pastaAlvo: entrada.skill === "site" ? entrada.pastaAlvo : undefined,
    };

    this.execucoes.set(sessao.id, {
      processo: null,
      promptPendente: entrada.prompt,
      ehResume: false,
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
  continuar(id: string, texto: string): { ok: boolean; erro?: string } {
    const sessao = this.sessoes.find((s) => s.id === id);
    if (!sessao) {
      return { ok: false, erro: "sessao nao encontrada" };
    }
    if (!sessao.sessionIdClaude) {
      return { ok: false, erro: "sessao ainda nao tem id da conversa pra retomar" };
    }

    const execucao = this.garantirExecucao(id);
    execucao.promptPendente = texto;
    execucao.ehResume = true;
    execucao.recebeuResult = false;
    execucao.resultComErro = false;
    execucao.paradaManual = false;

    sessao.prompt = texto;

    // Mensagem de continuacao vira turno do usuario na transcricao.
    anexarTurno(sessao.workspaceId ?? "", id, {
      papel: "usuario",
      texto,
      em: new Date().toISOString(),
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
    transmitir(mensagem);
    this.agendarSalvar();
  }

  // Atualiza o estado do laco de conformidade na sessao e emite no WS, do mesmo
  // jeito que uma transicao de status: o frontend usa pra mostrar a fase.
  private definirConferencia(id: string, conferencia: ConferenciaSite): void {
    const sessao = this.sessoes.find((s) => s.id === id);
    if (!sessao) return;
    sessao.conferenciaSite = conferencia;
    sessao.atualizadaEm = new Date().toISOString();
    transmitir({
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

  // Host local do proprio Hub, base da conferencia visual da peca. Segue a porta
  // real (VKOS_PORT no QA, 4600 no produto), o mesmo host que as rotas usam.
  private hostLocal(): string {
    const porta = process.env.VKOS_PORT?.trim() || "4600";
    return `127.0.0.1:${porta}`;
  }

  // Roda a auditoria completa (estrutural + visual) na peca da sessao e traduz
  // pro formato que o laco espera.
  private async auditarPecaDaSessao(sessao: Sessao): Promise<ConferenciaConformidade> {
    if (!sessao.workspaceId || !sessao.pastaAlvo) {
      return { verificavel: false, valido: false, erros: [], avisos: [] };
    }
    return conferirSiteParaConformidade(
      { workspaceId: sessao.workspaceId, pasta: sessao.pastaAlvo },
      this.hostLocal(),
    );
  }

  // Pede o processo ao provedor e liga os mesmos tratadores historicos.
  private iniciar(sessao: Sessao): void {
    const execucao = this.garantirExecucao(sessao.id);

    this.definirStatus(sessao, "iniciando");
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
    transmitir({
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

      // Custo deste trecho (o result e sempre o custo do turno atual).
      const custoBruto = evento["total_cost_usd"];
      const custoTrecho = typeof custoBruto === "number" ? custoBruto : 0;
      sessao.custoUsd = (sessao.custoUsd ?? 0) + custoTrecho;
      const custoEstimado =
        sessao.provedor === "codex" || evento["estimado"] === true;
      sessao.estimado = (sessao.estimado ?? false) || custoEstimado;

      // Tokens deste trecho, ja com o split honesto: entrada nova, cache escrita,
      // cache leitura e saida. tokensEntrada segue sendo o total (soma das tres entradas).
      const { entradaNova, cacheEscrita, cacheLeitura, entrada, saida } =
        this.extrairTokens(evento["usage"]);
      sessao.tokensEntradaNova = (sessao.tokensEntradaNova ?? 0) + entradaNova;
      sessao.tokensCacheEscrita = (sessao.tokensCacheEscrita ?? 0) + cacheEscrita;
      sessao.tokensCacheLeitura = (sessao.tokensCacheLeitura ?? 0) + cacheLeitura;
      sessao.tokensEntrada = (sessao.tokensEntrada ?? 0) + entrada;
      sessao.tokensSaida = (sessao.tokensSaida ?? 0) + saida;

      const ehErro = evento["is_error"] === true || evento["subtype"] === "error";
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
          custoUsd: custoTrecho,
          estimado: custoEstimado,
        });
      } else {
        sessao.erro = typeof texto === "string" ? texto : "result com erro";
      }

      // Acumula no custos.json do workspace DA SESSAO (nao do ativo no momento).
      // So conta sessao nova quando nao e continuacao e concluiu bem.
      registrarResult(sessao.workspaceId ?? "", {
        custoUsd: custoTrecho,
        tokensEntradaNova: entradaNova,
        tokensCacheEscrita: cacheEscrita,
        tokensCacheLeitura: cacheLeitura,
        tokensEntrada: entrada,
        tokensSaida: saida,
        contarSessao: !execucao.ehResume && !ehErro,
        provedor: sessao.provedor,
        estimado: custoEstimado,
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
      transmitir({
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

  // Extrai os tokens do bloco usage do result, com o split honesto:
  // entradaNova (input direto), cacheEscrita (creation), cacheLeitura (read) e saida.
  // entrada e o total das tres entradas, tudo que entra de contexto no modelo.
  private extrairTokens(usage: unknown): {
    entradaNova: number;
    cacheEscrita: number;
    cacheLeitura: number;
    entrada: number;
    saida: number;
  } {
    if (!usage || typeof usage !== "object") {
      return { entradaNova: 0, cacheEscrita: 0, cacheLeitura: 0, entrada: 0, saida: 0 };
    }
    const u = usage as Record<string, unknown>;
    const num = (v: unknown): number => (typeof v === "number" ? v : 0);

    const entradaNova = num(u["input_tokens"]);
    const cacheEscrita = this.extrairCacheEscrita(u);
    const cacheLeitura =
      num(u["cache_read_input_tokens"]) || num(u["cached_input_tokens"]);
    const saida = num(u["output_tokens"]);
    // O dialeto interno normaliza input_tokens como entrada nova. O adaptador do
    // Codex separa cached_input_tokens em cache_read_input_tokens antes daqui.
    const entrada = entradaNova + cacheEscrita + cacheLeitura;
    return { entradaNova, cacheEscrita, cacheLeitura, entrada, saida };
  }

  // Cache de escrita robusto: usa cache_creation_input_tokens quando for numero.
  // Se nao existir, algumas versoes do CLI trazem cache_creation como objeto
  // aninhado (ephemeral_5m_input_tokens etc): nesse caso soma os numeros do objeto.
  private extrairCacheEscrita(u: Record<string, unknown>): number {
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

  // Fecha a sessao: decide status final e sobe a proxima da fila.
  private aoFechar(
    sessao: Sessao,
    execucao: Execucao,
    codigo: number | null,
    stderr: string,
  ): void {
    execucao.processo = null;

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
        for (const bruta of dados as Sessao[]) {
          const sessao: Sessao = {
            ...bruta,
            provedor: bruta.provedor ?? "claude",
            workspaceId: bruta.workspaceId ?? id,
          };
          // Qualquer sessao que estava ativa ou na fila virou parada. O processo se foi.
          if (
            sessao.status === "rodando" ||
            sessao.status === "iniciando" ||
            sessao.status === "fila"
          ) {
            sessao.status = "parada";
          }
          todas.push(sessao);
        }
      } catch {
        // Arquivo corrompido de um workspace: ignora ele, sem quebrar o boot.
      }
    }
    this.sessoes = todas;
  }
}

// Instancia unica usada pelas rotas.
export const gerenciador = new GerenciadorSessoes();
