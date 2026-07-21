// Operacoes locais da jornada de setup do motor de IA.
// O teste usa uma pasta temporaria e passa direto pelo contrato do provedor.
// Nao cria sessao do hub, transcricao, custo nem exige workspace.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { EventoSessao, ProvedorIA } from "../provedores/contrato.js";

const PROMPT_TESTE = "Responda somente: olá, VKOS Hub no ar";
const TEMPO_LIMITE_MS = 2 * 60 * 1000;

export type EventoTesteSetup =
  | { tipo: "inicio"; modelo: string }
  | { tipo: "texto"; texto: string }
  | {
      tipo: "resultado";
      texto: string;
      custoUsd: number;
      estimado: boolean;
    }
  | { tipo: "erro"; mensagem: string };

export interface ResultadoTesteSetup {
  sucesso: boolean;
  modelo: string;
}

function comoObjeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : null;
}

function textoConsolidado(evento: EventoSessao): string {
  const mensagem = comoObjeto(evento["message"]);
  const conteudo = mensagem?.["content"];
  if (!Array.isArray(conteudo)) return "";
  return conteudo
    .map(comoObjeto)
    .filter((bloco) => bloco?.["type"] === "text")
    .map((bloco) =>
      typeof bloco?.["text"] === "string" ? bloco["text"] : "",
    )
    .join("");
}

function deltaTexto(evento: EventoSessao): string {
  if (evento["type"] !== "stream_event") return "";
  const interno = comoObjeto(evento["event"]);
  const delta = comoObjeto(interno?.["delta"]);
  return interno?.["type"] === "content_block_delta" &&
    delta?.["type"] === "text_delta" &&
    typeof delta["text"] === "string"
    ? delta["text"]
    : "";
}

function mensagemDeProcesso(stderr: string, codigo: number | null): string {
  const detalhe = stderr.trim();
  if (detalhe) return detalhe.slice(-1200);
  return `O teste terminou sem resposta, código ${codigo ?? "desconhecido"}.`;
}

export async function executarTesteSetup(
  provedor: ProvedorIA,
  emitir: (evento: EventoTesteSetup) => void,
): Promise<ResultadoTesteSetup> {
  const pasta = await mkdtemp(join(tmpdir(), "vkos-hub-setup-"));
  const modelos = provedor.modelos();
  const modelo = modelos.at(-1)?.alias ?? modelos[0]?.alias;
  if (!modelo) {
    await rm(pasta, { recursive: true, force: true });
    throw new Error("Esse motor não publicou nenhum modelo para o teste.");
  }

  emitir({ tipo: "inicio", modelo });

  try {
    return await new Promise<ResultadoTesteSetup>((resolver) => {
      let encerrado = false;
      let recebeuDelta = false;
      let recebeuResultado = false;
      let resultadoFinal: boolean | null = null;
      const processo = provedor.iniciarSessao({
        pastaTrabalho: pasta,
        prompt: PROMPT_TESTE,
        modelo,
        permissao: "padrao",
        mcp: null,
      });

      const concluir = (sucesso: boolean) => {
        if (encerrado) return;
        encerrado = true;
        clearTimeout(limite);
        resolver({ sucesso, modelo });
      };

      const limite = setTimeout(() => {
        emitir({
          tipo: "erro",
          mensagem: "O teste demorou mais de dois minutos. Tente de novo.",
        });
        processo.parar();
        concluir(false);
      }, TEMPO_LIMITE_MS);

      processo.aoEvento((evento) => {
        const delta = deltaTexto(evento);
        if (delta) {
          recebeuDelta = true;
          emitir({ tipo: "texto", texto: delta });
          return;
        }

        if (evento["type"] === "assistant" && !recebeuDelta) {
          const texto = textoConsolidado(evento);
          if (texto) emitir({ tipo: "texto", texto });
          return;
        }

        if (evento["type"] !== "result") return;
        recebeuResultado = true;
        const ehErro =
          evento["is_error"] === true || evento["subtype"] === "error";
        const texto =
          typeof evento["result"] === "string" ? evento["result"] : "";
        if (ehErro) {
          emitir({
            tipo: "erro",
            mensagem: texto || "O motor encerrou o teste com erro.",
          });
          resultadoFinal = false;
          return;
        }
        emitir({
          tipo: "resultado",
          texto,
          custoUsd:
            typeof evento["total_cost_usd"] === "number"
              ? evento["total_cost_usd"]
              : 0,
          // O custo do teste tambem sai de tabela de precos, nunca cobranca real.
          estimado: true,
        });
        resultadoFinal = true;
      });

      processo.aoErro((erro) => {
        emitir({ tipo: "erro", mensagem: erro.message });
        concluir(false);
      });

      processo.aoFechar(({ codigo, stderr }) => {
        if (recebeuResultado && resultadoFinal !== null) {
          concluir(resultadoFinal);
          return;
        }
        if (!recebeuResultado && !encerrado) {
          emitir({ tipo: "erro", mensagem: mensagemDeProcesso(stderr, codigo) });
          concluir(false);
        }
      });
    });
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
}

export function abrirTerminalDeLogin(
  provedor: "claude" | "codex",
  binario: string,
): void {
  if (process.platform !== "win32") {
    throw new Error("O login guiado está disponível somente no Windows.");
  }

  const argumentos =
    provedor === "claude" ? ["auth", "login"] : ["login"];
  const processo = spawn(
    "cmd.exe",
    ["/d", "/k", binario, ...argumentos],
    {
      detached: true,
      windowsHide: false,
      stdio: "ignore",
    },
  );
  processo.unref();
}

function literalPowerShell(valor: string): string {
  return `'${valor.replace(/'/g, "''")}'`;
}

export async function criarAtalhoNaAreaDeTrabalho(): Promise<string> {
  if (process.platform !== "win32") {
    throw new Error("O atalho está disponível somente no Windows.");
  }

  const pastaModulo = dirname(fileURLToPath(import.meta.url));
  const pastaRaiz = resolve(pastaModulo, "..", "..", "..", "..");
  const iniciar = join(pastaRaiz, "Iniciar VKOS Hub.cmd");
  if (!existsSync(iniciar)) {
    throw new Error("O arquivo Iniciar VKOS Hub.cmd não foi encontrado.");
  }

  const script = [
    "$w = New-Object -ComObject WScript.Shell;",
    "$d = [Environment]::GetFolderPath('Desktop');",
    "$p = Join-Path $d 'VKOS Hub.lnk';",
    "$a = $w.CreateShortcut($p);",
    `$a.TargetPath = ${literalPowerShell(iniciar)};`,
    `$a.WorkingDirectory = ${literalPowerShell(pastaRaiz)};`,
    "$a.Description = 'Abrir o VKOS Hub';",
    "$a.Save();",
    "Write-Output $p;",
  ].join(" ");

  return await new Promise<string>((resolver, rejeitar) => {
    const processo = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let saida = "";
    let erro = "";
    processo.stdout.setEncoding("utf8");
    processo.stderr.setEncoding("utf8");
    processo.stdout.on("data", (trecho: string) => (saida += trecho));
    processo.stderr.on("data", (trecho: string) => (erro += trecho));
    processo.on("error", rejeitar);
    processo.on("close", (codigo) => {
      if (codigo === 0 && saida.trim()) resolver(saida.trim());
      else rejeitar(new Error(erro.trim() || "Não consegui criar o atalho."));
    });
  });
}
