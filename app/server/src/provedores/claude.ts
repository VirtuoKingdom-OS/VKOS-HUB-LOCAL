// Implementacao do provedor Claude Code.
// Mantem os mesmos argumentos, eventos e regras de processo do motor historico.

import { spawn, type ChildProcess } from "node:child_process";

import { detectarClaude } from "../ambiente/deteccao.js";
import { localizarClaude } from "../sessoes/localizar-claude.js";
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
import { citarArg } from "./util.js";

const MODELOS: OpcaoModelo[] = [
  { alias: "opus", rotulo: "Opus", observacaoCusto: "mais capaz, mais caro" },
  { alias: "sonnet", rotulo: "Sonnet", observacaoCusto: "equilíbrio" },
  { alias: "haiku", rotulo: "Haiku", observacaoCusto: "rápido e barato" },
];

class ProcessoClaude implements ProcessoSessao {
  private processo: ChildProcess;
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

  constructor(opcoes: OpcoesSessaoProvedor) {
    const { binario, usarShell } = localizarClaude();
    const args = this.montarArgs(opcoes);

    if (usarShell) {
      const linha = [binario, ...args].map(citarArg).join(" ");
      this.processo = spawn(linha, {
        cwd: opcoes.pastaTrabalho,
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      this.processo = spawn(binario, args, {
        cwd: opcoes.pastaTrabalho,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    try {
      this.processo.stdin?.write(opcoes.prompt);
      this.processo.stdin?.end();
    } catch {
      // stdin ja fechado, sem drama.
    }

    this.processo.stdout?.setEncoding("utf8");
    this.processo.stdout?.on("data", (pedaco: string) => {
      this.consumirStdout(pedaco);
    });

    this.processo.stderr?.setEncoding("utf8");
    this.processo.stderr?.on("data", (pedaco: string) => {
      this.stderr += pedaco;
      if (this.stderr.length > 20000) {
        this.stderr = this.stderr.slice(-20000);
      }
    });

    this.processo.on("error", (erro: Error) => {
      this.emitirErro(erro);
    });

    this.processo.on("close", (codigo: number | null) => {
      this.descarregarResto();
      this.emitirFechamento({ codigo, stderr: this.stderr });
    });
  }

  aoEvento(ouvinte: (evento: EventoSessao) => void): RemoverOuvinte {
    this.ouvintesEvento.add(ouvinte);
    if (this.eventosPendentes.length > 0) {
      const pendentes = this.eventosPendentes;
      this.eventosPendentes = [];
      for (const evento of pendentes) {
        ouvinte(evento);
      }
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
    if (this.processo.pid === undefined) return;
    if (process.platform === "win32") {
      try {
        spawn("taskkill", ["/pid", String(this.processo.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      } catch {
        this.processo.kill();
      }
    } else {
      try {
        this.processo.kill("SIGTERM");
      } catch {
        // ja morto.
      }
    }
  }

  private montarArgs(opcoes: OpcoesSessaoProvedor): string[] {
    const modoPermissao =
      opcoes.permissao === "total" ? "bypassPermissions" : "acceptEdits";
    const args = [
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--permission-mode",
      modoPermissao,
    ];

    if (opcoes.modelo) {
      args.push("--model", opcoes.modelo);
    }
    if (opcoes.retomada) {
      args.push("--resume", opcoes.retomada);
    }
    if (opcoes.instrucoesExtras) {
      args.push("--append-system-prompt", opcoes.instrucoesExtras);
    }

    const ferramentasMcp: string[] = [];
    if (opcoes.mcp) {
      args.push("--mcp-config", opcoes.mcp.caminho);
      for (const idServidor of opcoes.mcp.servidores) {
        ferramentasMcp.push(`mcp__${idServidor}`);
      }
    }

    args.push(
      "--allowedTools",
      "Bash(node:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      ...ferramentasMcp,
    );
    return args;
  }

  private consumirStdout(pedaco: string): void {
    this.bufferLinha += pedaco;
    const linhas = this.bufferLinha.split("\n");
    this.bufferLinha = linhas.pop() ?? "";
    for (const bruta of linhas) {
      this.consumirLinha(bruta);
    }
  }

  private consumirLinha(bruta: string): void {
    const linha = bruta.trim();
    if (!linha) return;
    try {
      this.emitirEvento(JSON.parse(linha) as EventoSessao);
    } catch {
      // Aviso que nao e JSON nao faz parte do dialeto.
    }
  }

  private descarregarResto(): void {
    const resto = this.bufferLinha;
    this.bufferLinha = "";
    if (resto.trim()) {
      this.consumirLinha(resto);
    }
  }

  private emitirEvento(evento: EventoSessao): void {
    if (this.ouvintesEvento.size === 0) {
      this.eventosPendentes.push(evento);
      return;
    }
    for (const ouvinte of this.ouvintesEvento) {
      ouvinte(evento);
    }
  }

  private emitirErro(erro: Error): void {
    if (this.ouvintesErro.size === 0) {
      this.erroPendente = erro;
      return;
    }
    for (const ouvinte of this.ouvintesErro) {
      ouvinte(erro);
    }
  }

  private emitirFechamento(fechamento: FechamentoProcessoSessao): void {
    if (this.ouvintesFechamento.size === 0) {
      this.fechamentoPendente = fechamento;
      return;
    }
    for (const ouvinte of this.ouvintesFechamento) {
      ouvinte(fechamento);
    }
  }
}

async function detectar(): Promise<DeteccaoProvedor> {
  const resultado = await detectarClaude();
  return {
    instalado: resultado.instalado,
    versao: resultado.versao,
    logado: resultado.logado,
    binario: resultado.binario,
  };
}

export const provedorClaude: ProvedorIA = {
  id: "claude",
  detectar,
  modelos: () => MODELOS.map((modelo) => ({ ...modelo })),
  iniciarSessao: (opcoes) => new ProcessoClaude(opcoes),
};
