// Adaptador do Codex CLI para o dialeto de eventos do VKOS Hub.
// Toda particularidade do JSONL do Codex fica concentrada neste arquivo.

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { detectarCodex } from "../ambiente/deteccao.js";
import type {
  DeteccaoProvedor,
  EventoSessao,
  FechamentoProcessoSessao,
  OpcaoModelo,
  OpcoesSessaoProvedor,
  ProcessoSessao,
  ProvedorIA,
  RemoverOuvinte,
} from "./contrato.js";
import { citarArg, montarPromptComInstrucoes } from "./util.js";

const TIMEOUT_INATIVIDADE_MS = 30 * 60 * 1000;
const LIMITE_STDERR = 20000;
const AVISO_MCP =
  "Conexoes MCP nao funcionam com Codex nesta versao. A sessao segue sem elas.";

const MODELOS: OpcaoModelo[] = [
  {
    alias: "gpt-5.6-sol",
    rotulo: "GPT-5.6 Sol",
    observacaoCusto: "mais capaz, custo mais alto",
  },
  {
    alias: "gpt-5.6-terra",
    rotulo: "GPT-5.6 Terra",
    observacaoCusto: "equilibrio entre capacidade e custo",
  },
  {
    alias: "gpt-5.6-luna",
    rotulo: "GPT-5.6 Luna",
    observacaoCusto: "economico para alto volume",
  },
  {
    alias: "gpt-5.4-mini",
    rotulo: "GPT-5.4 mini",
    observacaoCusto: "rapido e mais barato",
    economico: true,
  },
];

interface PrecoModelo {
  entrada: number;
  entradaCache: number;
  saida: number;
}

interface TabelaPrecos {
  modelos: Record<string, PrecoModelo>;
}

interface UsoCodex {
  entradaTotal: number;
  entradaCache: number;
  entradaNova: number;
  saida: number;
  raciocinio: number;
}

interface CodexLocalizado {
  binario: string;
  usarShell: boolean;
}

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : null;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function carregarPrecos(): TabelaPrecos {
  try {
    const arquivo = new URL("./precos-codex.json", import.meta.url);
    return JSON.parse(readFileSync(arquivo, "utf8")) as TabelaPrecos;
  } catch {
    return { modelos: {} };
  }
}

function localizarPreco(modelo: string): PrecoModelo | null {
  const tabela = carregarPrecos();
  const exato = tabela.modelos[modelo];
  if (exato) return exato;

  const base = Object.keys(tabela.modelos).find(
    (alias) => modelo.startsWith(`${alias}-`) || alias.startsWith(`${modelo}-`),
  );
  return base ? tabela.modelos[base] ?? null : null;
}

function extrairUso(valor: unknown): UsoCodex {
  const uso = objeto(valor) ?? {};
  const entradaTotal = Math.max(0, numero(uso["input_tokens"]));
  const entradaCache = Math.min(
    entradaTotal,
    Math.max(0, numero(uso["cached_input_tokens"])),
  );
  return {
    entradaTotal,
    entradaCache,
    entradaNova: Math.max(0, entradaTotal - entradaCache),
    saida: Math.max(0, numero(uso["output_tokens"])),
    raciocinio: Math.max(0, numero(uso["reasoning_output_tokens"])),
  };
}

export function estimarCustoCodex(modelo: string, valorUso: unknown): number {
  const preco = localizarPreco(modelo);
  if (!preco) return 0;
  const uso = extrairUso(valorUso);
  const custo =
    (uso.entradaNova * preco.entrada +
      uso.entradaCache * preco.entradaCache +
      uso.saida * preco.saida) /
    1_000_000;
  return Number(custo.toFixed(10));
}

function erroDoEvento(evento: Record<string, unknown>): string {
  const erro = objeto(evento["error"]);
  return (
    texto(erro?.["message"]) ||
    texto(evento["message"]) ||
    "O Codex encerrou o turno com erro."
  );
}

function normalizarErro(mensagem: string): string {
  const limpa = mensagem.trim();
  if (!limpa) return "O processo do Codex terminou sem explicar o motivo.";
  if (/not logged in|login required|authentication required|unauthorized/i.test(limpa)) {
    return "O Codex nao esta logado. Abra o login do Codex e tente de novo.";
  }
  if (/not recognized|not found|enoent|cannot find/i.test(limpa)) {
    return "O Codex CLI nao foi encontrado. Instale o Codex e abra o VKOS Hub de novo.";
  }
  if (/timed? out|timeout/i.test(limpa)) {
    return "O Codex demorou demais sem responder. Tente de novo.";
  }
  return `O Codex encontrou um erro: ${limpa}`;
}

function blocoFerramenta(nome: string, input: Record<string, unknown>): EventoSessao {
  return {
    type: "assistant",
    message: {
      content: [{ type: "tool_use", name: nome, input }],
    },
  };
}

function primeiroCaminho(item: Record<string, unknown>): string {
  const mudancas = item["changes"];
  if (!Array.isArray(mudancas)) return "";
  for (const mudanca of mudancas) {
    const valor = objeto(mudanca);
    const caminho = texto(valor?.["path"]);
    if (caminho) return caminho;
  }
  return "";
}

// Tradutor puro. O teste de fixture o exercita sem iniciar uma sessao paga.
export class TradutorEventosCodex {
  private modelo: string;
  private textosFinais: string[] = [];
  private textoParcialPorItem = new Map<string, string>();
  private ferramentasEmitidas = new Set<string>();
  private modoDelta = false;
  private resultadoEmitido = false;

  constructor(modelo: string) {
    this.modelo = modelo;
  }

  get finalizou(): boolean {
    return this.resultadoEmitido;
  }

  traduzir(evento: Record<string, unknown>): EventoSessao[] {
    const tipo = texto(evento["type"]);

    if (tipo === "thread.started") {
      const id = texto(evento["thread_id"]);
      return id
        ? [
            {
              type: "system",
              subtype: "init",
              session_id: id,
              model: this.modelo,
            },
          ]
        : [];
    }

    if (tipo === "item.started" || tipo === "item.updated" || tipo === "item.completed") {
      return this.traduzirItem(tipo, evento["item"]);
    }

    if (tipo === "turn.completed") {
      this.resultadoEmitido = true;
      const usoCodex = extrairUso(evento["usage"]);
      return [
        {
          type: "result",
          subtype: "success",
          result: this.textosFinais.join("\n\n"),
          total_cost_usd: estimarCustoCodex(this.modelo, evento["usage"]),
          usage: {
            input_tokens: usoCodex.entradaNova,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: usoCodex.entradaCache,
            output_tokens: usoCodex.saida,
            cached_input_tokens: usoCodex.entradaCache,
            reasoning_output_tokens: usoCodex.raciocinio,
          },
          usage_codex: evento["usage"],
          estimado: true,
          provedor: "codex",
        },
      ];
    }

    if ((tipo === "turn.failed" || tipo === "error") && !this.resultadoEmitido) {
      this.resultadoEmitido = true;
      return [
        {
          type: "result",
          subtype: "error",
          is_error: true,
          result: normalizarErro(erroDoEvento(evento)),
          total_cost_usd: 0,
          usage: {
            input_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            output_tokens: 0,
          },
          estimado: true,
          provedor: "codex",
        },
      ];
    }

    return [];
  }

  private traduzirItem(tipoEvento: string, valorItem: unknown): EventoSessao[] {
    const item = objeto(valorItem);
    if (!item) return [];
    const tipoItem = texto(item["type"]);
    const id = texto(item["id"]) || JSON.stringify(item);

    if (tipoItem === "agent_message") {
      return this.traduzirMensagem(tipoEvento, id, texto(item["text"]));
    }

    if (tipoItem === "command_execution") {
      if (this.ferramentasEmitidas.has(id)) return [];
      if (tipoEvento !== "item.started" && tipoEvento !== "item.completed") return [];
      this.ferramentasEmitidas.add(id);
      return [
        blocoFerramenta("Executar comando", {
          command: texto(item["command"]),
          status: texto(item["status"]),
        }),
      ];
    }

    if (
      tipoItem === "file_change" &&
      (tipoEvento === "item.started" || tipoEvento === "item.completed")
    ) {
      if (this.ferramentasEmitidas.has(id)) return [];
      this.ferramentasEmitidas.add(id);
      return [
        blocoFerramenta("Alterar arquivo", {
          file_path: primeiroCaminho(item),
          changes: Array.isArray(item["changes"]) ? item["changes"] : [],
          status: texto(item["status"]),
        }),
      ];
    }

    return [];
  }

  private traduzirMensagem(
    tipoEvento: string,
    id: string,
    mensagem: string,
  ): EventoSessao[] {
    if (!mensagem) return [];
    const anterior = this.textoParcialPorItem.get(id) ?? "";

    if (tipoEvento !== "item.completed") {
      const delta = mensagem.startsWith(anterior) ? mensagem.slice(anterior.length) : mensagem;
      this.textoParcialPorItem.set(id, mensagem);
      if (!delta) return [];
      this.modoDelta = true;
      return [
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: delta },
          },
        },
      ];
    }

    this.textoParcialPorItem.delete(id);
    this.textosFinais.push(mensagem);

    if (this.modoDelta) {
      const delta = mensagem.startsWith(anterior) ? mensagem.slice(anterior.length) : mensagem;
      return delta
        ? [
            {
              type: "stream_event",
              event: {
                type: "content_block_delta",
                delta: { type: "text_delta", text: delta },
              },
            },
          ]
        : [];
    }

    return [
      {
        type: "assistant",
        message: { content: [{ type: "text", text: mensagem }] },
      },
    ];
  }
}

function precisaShell(caminho: string): boolean {
  const minusculo = caminho.toLowerCase();
  return minusculo.endsWith(".cmd") || minusculo.endsWith(".bat");
}

function localizarCodex(): CodexLocalizado {
  const casa = homedir();
  const ehWindows = process.platform === "win32";
  const override = process.env.VKOS_CODEX_BIN?.trim();
  if (override) {
    return { binario: override, usarShell: precisaShell(override) };
  }
  const candidatos: Array<string | undefined> = [
    join(casa, ".local", "bin", ehWindows ? "codex.exe" : "codex"),
    ehWindows && process.env.APPDATA
      ? join(process.env.APPDATA, "npm", "codex.cmd")
      : undefined,
    ehWindows && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Microsoft", "WindowsApps", "codex.exe")
      : undefined,
    !ehWindows ? "/usr/local/bin/codex" : undefined,
    !ehWindows ? "/opt/homebrew/bin/codex" : undefined,
  ];

  for (const candidato of candidatos) {
    if (candidato && existsSync(candidato)) {
      return { binario: candidato, usarShell: precisaShell(candidato) };
    }
  }
  return { binario: "codex", usarShell: ehWindows };
}

export function montarArgsCodex(opcoes: OpcoesSessaoProvedor): string[] {
  const args = ["exec", "--json"];
  // Depois de um restart, uma sessao persistida pode nao ter o alias que vivia
  // na execucao em memoria. No resume, sem --model, o Codex herda o modelo da
  // propria conversa. Sessao nova sempre chega com o padrao configurado.
  if (opcoes.modelo) {
    args.push("--model", opcoes.modelo);
  }

  if (opcoes.permissao === "total") {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  } else {
    args.push("--sandbox", "workspace-write");
  }

  args.push("--skip-git-repo-check", "-C", opcoes.pastaTrabalho);
  if (opcoes.retomada) {
    args.push("resume", opcoes.retomada, "-");
  } else {
    args.push("-");
  }
  return args;
}

// Instrucoes extras entram como bloco marcado antes do prompt real, via stdin.
// A montagem e a mesma dos dois provedores, entao mora em util.
export function montarPromptCodex(opcoes: OpcoesSessaoProvedor): string {
  return montarPromptComInstrucoes(opcoes);
}

class ProcessoCodex implements ProcessoSessao {
  private processo: ChildProcess;
  private tradutor: TradutorEventosCodex;
  private bufferLinha = "";
  private stderr = "";
  private eventosPendentes: EventoSessao[] = [];
  private erroPendente: Error | null = null;
  private fechamentoPendente: FechamentoProcessoSessao | null = null;
  private ouvintesEvento = new Set<(evento: EventoSessao) => void>();
  private ouvintesErro = new Set<(erro: Error) => void>();
  private ouvintesFechamento = new Set<
    (fechamento: FechamentoProcessoSessao) => void
  >();
  private timerInatividade: NodeJS.Timeout | null = null;

  constructor(opcoes: OpcoesSessaoProvedor) {
    this.tradutor = new TradutorEventosCodex(opcoes.modelo);
    const { binario, usarShell } = localizarCodex();
    const args = montarArgsCodex(opcoes);

    if (usarShell) {
      const linha = [binario, ...args].map(citarArg).join(" ");
      this.processo = spawn(linha, {
        cwd: opcoes.pastaTrabalho,
        shell: true,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      this.processo = spawn(binario, args, {
        cwd: opcoes.pastaTrabalho,
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    if (opcoes.mcp && opcoes.mcp.servidores.length > 0) {
      this.emitirEvento({
        type: "assistant",
        message: { content: [{ type: "text", text: AVISO_MCP }] },
        aviso: "mcp_indisponivel",
      });
    }

    this.rearmarTimeout();
    this.processo.stdout?.setEncoding("utf8");
    this.processo.stdout?.on("data", (pedaco: string) => {
      this.rearmarTimeout();
      this.consumirStdout(pedaco);
    });

    this.processo.stderr?.setEncoding("utf8");
    this.processo.stderr?.on("data", (pedaco: string) => {
      this.rearmarTimeout();
      this.adicionarStderr(pedaco);
    });

    this.processo.on("error", (erro: NodeJS.ErrnoException) => {
      this.limparTimeout();
      const mensagem =
        erro.code === "ENOENT"
          ? "O Codex CLI nao foi encontrado. Instale o Codex e abra o VKOS Hub de novo."
          : normalizarErro(erro.message);
      this.emitirErro(new Error(mensagem));
    });

    this.processo.on("close", (codigo: number | null) => {
      this.limparTimeout();
      this.descarregarResto();
      const stderr =
        codigo === 0 || this.tradutor.finalizou
          ? this.stderr
          : normalizarErro(this.stderr || `codigo de saida ${codigo ?? "desconhecido"}`);
      this.emitirFechamento({ codigo, stderr });
    });

    try {
      this.processo.stdin?.write(montarPromptCodex(opcoes));
      this.processo.stdin?.end();
    } catch {
      this.emitirErro(new Error("Nao foi possivel enviar o pedido ao Codex."));
    }
  }

  aoEvento(ouvinte: (evento: EventoSessao) => void): RemoverOuvinte {
    this.ouvintesEvento.add(ouvinte);
    if (this.eventosPendentes.length > 0) {
      const pendentes = this.eventosPendentes;
      this.eventosPendentes = [];
      for (const evento of pendentes) ouvinte(evento);
    }
    return () => this.ouvintesEvento.delete(ouvinte);
  }

  aoErro(ouvinte: (erro: Error) => void): RemoverOuvinte {
    this.ouvintesErro.add(ouvinte);
    if (this.erroPendente) {
      const erro = this.erroPendente;
      this.erroPendente = null;
      ouvinte(erro);
    }
    return () => this.ouvintesErro.delete(ouvinte);
  }

  aoFechar(
    ouvinte: (fechamento: FechamentoProcessoSessao) => void,
  ): RemoverOuvinte {
    this.ouvintesFechamento.add(ouvinte);
    if (this.fechamentoPendente) {
      const fechamento = this.fechamentoPendente;
      this.fechamentoPendente = null;
      ouvinte(fechamento);
    }
    return () => this.ouvintesFechamento.delete(ouvinte);
  }

  parar(): void {
    this.limparTimeout();
    if (this.processo.pid === undefined) return;
    if (process.platform === "win32") {
      try {
        spawn("taskkill", ["/pid", String(this.processo.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch {
        this.processo.kill();
      }
    } else {
      try {
        this.processo.kill("SIGTERM");
      } catch {
        // Processo ja encerrado.
      }
    }
  }

  private consumirStdout(pedaco: string): void {
    this.bufferLinha += pedaco;
    const linhas = this.bufferLinha.split("\n");
    this.bufferLinha = linhas.pop() ?? "";
    for (const linha of linhas) this.consumirLinha(linha);
  }

  private consumirLinha(bruta: string): void {
    const linha = bruta.trim();
    if (!linha) return;
    try {
      const evento = JSON.parse(linha) as Record<string, unknown>;
      for (const traduzido of this.tradutor.traduzir(evento)) {
        this.emitirEvento(traduzido);
      }
    } catch {
      this.adicionarStderr(`Saida inesperada do Codex: ${linha}\n`);
    }
  }

  private descarregarResto(): void {
    const resto = this.bufferLinha;
    this.bufferLinha = "";
    if (resto.trim()) this.consumirLinha(resto);
  }

  private adicionarStderr(pedaco: string): void {
    this.stderr += pedaco;
    if (this.stderr.length > LIMITE_STDERR) {
      this.stderr = this.stderr.slice(-LIMITE_STDERR);
    }
  }

  private rearmarTimeout(): void {
    this.limparTimeout();
    this.timerInatividade = setTimeout(() => {
      this.adicionarStderr("O Codex ficou 30 minutos sem responder.");
      this.emitirErro(new Error("O Codex demorou demais sem responder. Tente de novo."));
      this.parar();
    }, TIMEOUT_INATIVIDADE_MS);
    this.timerInatividade.unref();
  }

  private limparTimeout(): void {
    if (this.timerInatividade) {
      clearTimeout(this.timerInatividade);
      this.timerInatividade = null;
    }
  }

  private emitirEvento(evento: EventoSessao): void {
    if (this.ouvintesEvento.size === 0) {
      this.eventosPendentes.push(evento);
      return;
    }
    for (const ouvinte of this.ouvintesEvento) ouvinte(evento);
  }

  private emitirErro(erro: Error): void {
    if (this.ouvintesErro.size === 0) {
      this.erroPendente = erro;
      return;
    }
    for (const ouvinte of this.ouvintesErro) ouvinte(erro);
  }

  private emitirFechamento(fechamento: FechamentoProcessoSessao): void {
    if (this.ouvintesFechamento.size === 0) {
      this.fechamentoPendente = fechamento;
      return;
    }
    for (const ouvinte of this.ouvintesFechamento) ouvinte(fechamento);
  }
}

async function detectar(): Promise<DeteccaoProvedor> {
  const resultado = await detectarCodex();
  return {
    instalado: resultado.instalado,
    versao: resultado.versao,
    logado: resultado.logado,
    binario: resultado.binario,
  };
}

export const provedorCodex: ProvedorIA = {
  id: "codex",
  detectar,
  modelos: () => MODELOS.map((modelo) => ({ ...modelo })),
  iniciarSessao: (opcoes) => new ProcessoCodex(opcoes),
};
