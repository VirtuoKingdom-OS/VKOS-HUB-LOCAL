// Instalacao local dos CLIs permitidos pelo onboarding.
// O cliente escolhe apenas o id. Pacote, executavel e argumentos vivem nesta
// lista fechada para nenhum texto vindo da interface virar comando de sistema.

import { spawn } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { IdProvedor } from "../provedores/contrato.js";

const PACOTES: Record<IdProvedor, string> = {
  claude: "Anthropic.ClaudeCode",
  codex: "OpenAI.Codex",
};

const TEMPO_LIMITE_MS = 10 * 60 * 1000;
const pastaApp = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const caminhoLog = join(pastaApp, "dados", "instalacao.log");

export type EventoInstalacaoMotor =
  | { tipo: "inicio"; provedor: IdProvedor; pacote: string }
  | { tipo: "texto"; texto: string }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "fim"; sucesso: boolean };

export function pacoteDoProvedor(provedor: IdProvedor): string {
  return PACOTES[provedor];
}

export function argumentosWinget(provedor: IdProvedor): string[] {
  return [
    "install",
    "--id",
    pacoteDoProvedor(provedor),
    "--exact",
    "--source",
    "winget",
    "--accept-package-agreements",
    "--accept-source-agreements",
    "--disable-interactivity",
  ];
}

export function limparSaidaInstalacao(texto: string): string {
  return texto
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0 && !/^[\\|/\-\s]+$/.test(linha))
    .join("\n")
    .slice(-12_000);
}

async function registrarLog(
  provedor: IdProvedor,
  codigo: number | null,
  saida: string,
): Promise<void> {
  await mkdir(dirname(caminhoLog), { recursive: true });
  const limpo = limparSaidaInstalacao(saida) || "sem saída";
  const registro = [
    "",
    `[${new Date().toISOString()}] instalação ${provedor}, código ${codigo ?? "desconhecido"}`,
    limpo,
  ].join("\n");
  await appendFile(caminhoLog, `${registro}\n`, "utf8");
}

export async function instalarMotorComWinget(
  provedor: IdProvedor,
  emitir: (evento: EventoInstalacaoMotor) => void,
): Promise<boolean> {
  if (process.platform !== "win32") {
    throw new Error("A instalação automática está disponível somente no Windows.");
  }

  const pacote = pacoteDoProvedor(provedor);
  emitir({ tipo: "inicio", provedor, pacote });
  emitir({
    tipo: "texto",
    texto: "Baixando e instalando o programa oficial. O Windows pode pedir autorização.",
  });

  return await new Promise<boolean>((resolver, rejeitar) => {
    const processo = spawn("winget.exe", argumentosWinget(provedor), {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let saida = "";
    let encerrado = false;

    const concluir = (sucesso: boolean, codigo: number | null) => {
      if (encerrado) return;
      encerrado = true;
      clearTimeout(limite);
      void registrarLog(provedor, codigo, saida).catch(() => undefined);
      resolver(sucesso);
    };

    processo.stdout.setEncoding("utf8");
    processo.stderr.setEncoding("utf8");
    processo.stdout.on("data", (trecho: string) => {
      saida = (saida + trecho).slice(-200_000);
    });
    processo.stderr.on("data", (trecho: string) => {
      saida = (saida + trecho).slice(-200_000);
    });
    processo.on("error", (erro: NodeJS.ErrnoException) => {
      if (encerrado) return;
      encerrado = true;
      clearTimeout(limite);
      if (erro.code === "ENOENT") {
        rejeitar(new Error("O WinGet não está disponível nesta versão do Windows."));
        return;
      }
      rejeitar(erro);
    });
    processo.on("close", (codigo) => concluir(codigo === 0, codigo));

    const limite = setTimeout(() => {
      if (encerrado) return;
      saida += "\nTempo limite de dez minutos atingido.";
      processo.kill();
      concluir(false, null);
    }, TEMPO_LIMITE_MS);
  });
}
