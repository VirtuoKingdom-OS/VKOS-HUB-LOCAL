import { spawn } from "node:child_process";

import {
  detectarClaude,
  limparCacheClaude,
} from "../ambiente/deteccao.js";
import { localizarClaude } from "../sessoes/localizar-claude.js";

interface ExecucaoClaude {
  codigo: number | null;
  stdout: string;
  stderr: string;
}

function executarClaude(
  argumentos: string[],
  timeoutMs: number,
): Promise<ExecucaoClaude> {
  return new Promise((resolver) => {
    const { binario, usarShell } = localizarClaude();
    const processo = spawn(binario, argumentos, {
      shell: usarShell,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const acumular = (atual: string, trecho: Buffer | string) =>
      `${atual}${String(trecho)}`.slice(-20_000);
    processo.stdout?.on("data", (trecho) => {
      stdout = acumular(stdout, trecho);
    });
    processo.stderr?.on("data", (trecho) => {
      stderr = acumular(stderr, trecho);
    });
    processo.on("error", (erro) => {
      stderr = erro.message;
    });
    processo.on("close", (codigo) => resolver({ codigo, stdout, stderr }));
    setTimeout(() => processo.kill(), timeoutMs).unref();
  });
}

export function contaDoStatusClaude(saida: string): string | null {
  try {
    const dados = JSON.parse(saida) as Record<string, unknown>;
    for (const chave of [
      "email",
      "accountEmail",
      "account",
      "subscriptionType",
      "authMethod",
    ]) {
      const valor = dados[chave];
      if (typeof valor === "string" && valor.trim()) return valor.trim();
    }
  } catch {
    // Versões antigas podem responder texto simples.
  }
  const email = saida.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
  return email ?? null;
}

export async function estadoClaudeCore(atualizar = false) {
  if (atualizar) limparCacheClaude();
  const deteccao = await detectarClaude();
  let conta: string | null = null;
  if (deteccao.instalado) {
    const status = await executarClaude(["auth", "status"], 10_000);
    conta = contaDoStatusClaude(status.stdout || status.stderr);
  }
  return {
    instalado: deteccao.instalado,
    versao: deteccao.versao,
    logado: deteccao.logado,
    conta,
    loginVps: "docker compose exec core claude",
  };
}

export async function testarClaudeCore() {
  limparCacheClaude();
  const estado = await estadoClaudeCore();
  if (!estado.instalado) {
    throw new Error("O Claude Code não está instalado no container CORE.");
  }
  if (estado.logado !== true) {
    throw new Error("O Claude do CORE ainda não está logado.");
  }
  const execucao = await executarClaude(
    [
      "-p",
      "Responda somente com a palavra OK.",
      "--max-turns",
      "1",
      "--output-format",
      "text",
    ],
    60_000,
  );
  if (execucao.codigo !== 0) {
    throw new Error(
      /login|auth|credential|unauthorized/i.test(execucao.stderr)
        ? "O login do Claude do CORE precisa ser renovado."
        : "O Claude do CORE não respondeu ao teste.",
    );
  }
  return {
    ok: true as const,
    resposta: execucao.stdout.trim().slice(0, 120),
  };
}
