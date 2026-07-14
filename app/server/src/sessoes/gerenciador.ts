// Gerenciador das sessoes claude -p em paralelo. O coracao do orquestrador.
// Spawna processos do Claude Code, faz o parse do stream-json linha a linha,
// transmite eventos e status pelo WebSocket, respeita o limite de sessoes
// simultaneas e persiste o indice em app/dados/sessoes.json.

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Sessao, StatusSessao } from "../tipos.js";
import { transmitir } from "../ws.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { localizarClaude } from "./localizar-claude.js";
import { obterModeloPadrao } from "../config/estado.js";
import { anexarTurno, apagarTranscricao } from "./transcricao.js";
import { registrarResult } from "./custos.js";
import {
  garantirPastaDadosWorkspace,
  listarIdsWorkspaces,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";
import { montarConfigMcp } from "../conexoes/mcp.js";

// Teto de sessoes ativas ao mesmo tempo (iniciando ou rodando). GLOBAL: e limite
// de maquina, nao de cliente. Vale somando as sessoes de todos os workspaces.
const LIMITE_ATIVAS = 5;

// Nome do arquivo de persistencia por workspace: app/dados/workspaces/<id>/sessoes.json.
const NOME_ARQUIVO_SESSOES = "sessoes.json";

// Estado de runtime de cada sessao, separado do dado persistido.
// Guarda o processo vivo, os buffers e o que enviar no proximo spawn.
interface Execucao {
  processo: ChildProcess | null;
  bufferLinha: string;
  stderr: string;
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

export class GerenciadorSessoes {
  private sessoes: Sessao[] = [];
  private execucoes = new Map<string, Execucao>();
  private timerSalvar: NodeJS.Timeout | null = null;

  private iniciado = false;

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
  }): Sessao {
    const agora = new Date().toISOString();
    // Sem modelo escolhido, cai no padrao da config.
    const modeloAlias = entrada.modelo ?? obterModeloPadrao();
    const sessao: Sessao = {
      id: this.gerarId(),
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
    };

    this.execucoes.set(sessao.id, {
      processo: null,
      bufferLinha: "",
      stderr: "",
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
      return { ok: false, erro: "sessao ainda nao tem id do claude pra retomar" };
    }

    const execucao = this.garantirExecucao(id);
    execucao.promptPendente = texto;
    execucao.ehResume = true;
    execucao.recebeuResult = false;
    execucao.resultComErro = false;
    execucao.paradaManual = false;
    execucao.stderr = "";
    execucao.bufferLinha = "";

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
      this.matarProcesso(execucao.processo);
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
      this.matarProcesso(execucao.processo);
      execucao.processo = null;
    }
    this.execucoes.delete(id);

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
        bufferLinha: "",
        stderr: "",
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

  // Spawna o processo do claude pra uma sessao e liga o parser do stdout.
  private iniciar(sessao: Sessao): void {
    const execucao = this.garantirExecucao(sessao.id);

    const { binario, usarShell } = localizarClaude();
    // Modo de permissao da sessao. total = bypassPermissions (poder total),
    // padrao = acceptEdits (comportamento historico). Vale tambem no resume,
    // porque le da propria sessao, que persiste o campo.
    const modoPermissao = sessao.permissao === "total" ? "bypassPermissions" : "acceptEdits";
    const args: string[] = [
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--permission-mode",
      modoPermissao,
    ];
    // Modelo escolhido pra sessao (opus/sonnet/haiku). Reusado nas continuacoes.
    if (execucao.modeloAlias) {
      args.push("--model", execucao.modeloAlias);
    }
    // Retoma a conversa anterior quando for continuacao.
    if (execucao.ehResume && sessao.sessionIdClaude) {
      args.push("--resume", sessao.sessionIdClaude);
    }

    // Conexoes MCP habilitadas no workspace desta sessao. Se ha config, aponta o
    // arquivo e libera as ferramentas de cada servidor (prefixo mcp__<idServidor>).
    // Sem nenhum servidor habilitado, montarConfigMcp devolve null e nada muda.
    const ferramentasMcp: string[] = [];
    const configMcp = montarConfigMcp(sessao.workspaceId ?? "");
    if (configMcp) {
      args.push("--mcp-config", configMcp.caminho);
      for (const idServidor of configMcp.servidores) {
        ferramentasMcp.push(`mcp__${idServidor}`);
      }
    }

    // allowedTools por ultimo: e variadico, para no proximo "--".
    // Sintaxe confirmada nesta maquina: Bash(node:*) etc liberam o Bash pro render.
    // As ferramentas MCP entram na mesma lista variadica.
    args.push(
      "--allowedTools",
      "Bash(node:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      ...ferramentasMcp,
    );

    this.definirStatus(sessao, "iniciando");
    execucao.bufferLinha = "";
    execucao.stderr = "";
    execucao.recebeuResult = false;
    execucao.resultComErro = false;
    // O prompt vai por stdin, nunca como argumento, pra fugir do inferno de
    // aspas no shell do Windows (e do problema de parenteses do cmd.exe).
    const prompt = execucao.promptPendente;

    let processo: ChildProcess;
    try {
      if (usarShell) {
        const linha = [binario, ...args].map((a) => this.citarArg(a)).join(" ");
        processo = spawn(linha, {
          cwd: sessao.pastaTrabalho,
          shell: true,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } else {
        processo = spawn(binario, args, {
          cwd: sessao.pastaTrabalho,
          shell: false,
          stdio: ["pipe", "pipe", "pipe"],
        });
      }
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : String(e);
      this.definirStatus(sessao, "erro", `falha ao spawnar o claude: ${detalhe}`);
      sessao.erro = detalhe;
      this.processarFila();
      return;
    }

    execucao.processo = processo;

    // Manda o prompt e fecha o stdin. Sem isso o claude espera 3s por stdin.
    try {
      processo.stdin?.write(prompt);
      processo.stdin?.end();
    } catch {
      // stdin ja fechado, sem drama.
    }

    processo.stdout?.setEncoding("utf8");
    processo.stdout?.on("data", (pedaco: string) => {
      this.consumirStdout(sessao, execucao, pedaco);
    });

    processo.stderr?.setEncoding("utf8");
    processo.stderr?.on("data", (pedaco: string) => {
      execucao.stderr += pedaco;
      // Segura o tamanho pra nao vazar memoria em sessao longa.
      if (execucao.stderr.length > 20000) {
        execucao.stderr = execucao.stderr.slice(-20000);
      }
    });

    processo.on("error", (erro: Error) => {
      this.definirStatus(sessao, "erro", erro.message);
      sessao.erro = erro.message;
      execucao.processo = null;
      this.processarFila();
    });

    processo.on("close", (codigo: number | null) => {
      this.aoFechar(sessao, execucao, codigo);
    });
  }

  // Trata cada pedaco do stdout: quebra em linhas e parseia JSON.
  private consumirStdout(sessao: Sessao, execucao: Execucao, pedaco: string): void {
    execucao.bufferLinha += pedaco;
    const linhas = execucao.bufferLinha.split("\n");
    // A ultima parte pode ser uma linha incompleta, guarda pro proximo pedaco.
    execucao.bufferLinha = linhas.pop() ?? "";

    for (const bruta of linhas) {
      const linha = bruta.trim();
      if (!linha) {
        continue;
      }
      let evento: unknown;
      try {
        evento = JSON.parse(linha);
      } catch {
        // Linha nao e JSON (ex: aviso de stdin na saida). Ignora.
        continue;
      }
      this.tratarEvento(sessao, execucao, evento as Record<string, unknown>);
    }
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

      // Tokens deste trecho, ja com o split honesto: entrada nova, cache escrita,
      // cache leitura e saida. tokensEntrada segue sendo o total (soma das tres entradas).
      const { entradaNova, cacheEscrita, cacheLeitura, entrada, saida } = this.extrairTokens(
        evento["usage"],
      );
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
    const cacheLeitura = num(u["cache_read_input_tokens"]);
    const saida = num(u["output_tokens"]);
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
  private aoFechar(sessao: Sessao, execucao: Execucao, codigo: number | null): void {
    // Descarrega o resto do buffer, caso a ultima linha nao tenha vindo com \n.
    const resto = execucao.bufferLinha.trim();
    if (resto) {
      try {
        this.tratarEvento(sessao, execucao, JSON.parse(resto) as Record<string, unknown>);
      } catch {
        // Ignora sobra nao-JSON.
      }
      execucao.bufferLinha = "";
    }

    execucao.processo = null;

    // Parada manual ja definiu o status. Nao mexe.
    if (execucao.paradaManual) {
      this.processarFila();
      return;
    }

    if (execucao.recebeuResult && !execucao.resultComErro) {
      this.definirStatus(sessao, "concluida");
    } else if (execucao.resultComErro) {
      this.definirStatus(sessao, "erro", sessao.erro);
    } else {
      // Terminou sem result. Erro. Usa o stderr como pista.
      const detalhe = execucao.stderr.trim() || `processo terminou com codigo ${codigo ?? "desconhecido"}`;
      sessao.erro = detalhe;
      this.definirStatus(sessao, "erro", detalhe);
    }

    this.agendarSalvar();
    this.processarFila();
  }

  // Mata o processo e a arvore de filhos. No Windows sem taskkill o filho sobrevive.
  private matarProcesso(processo: ChildProcess | null): void {
    if (!processo || processo.pid === undefined) {
      return;
    }
    if (process.platform === "win32") {
      try {
        spawn("taskkill", ["/pid", String(processo.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        processo.kill();
      }
    } else {
      try {
        processo.kill("SIGTERM");
      } catch {
        // ja morto.
      }
    }
  }

  // Coloca aspas num argumento pro caso de shell. Trata parenteses do cmd.
  private citarArg(arg: string): string {
    if (arg.length > 0 && !/[\s"()<>|&^]/.test(arg)) {
      return arg;
    }
    return `"${arg.replace(/"/g, '\\"')}"`;
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
          const sessao: Sessao = { ...bruta, workspaceId: bruta.workspaceId ?? id };
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
