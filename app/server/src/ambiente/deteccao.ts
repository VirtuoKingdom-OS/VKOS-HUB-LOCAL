// Deteccao dos motores de IA instalados na maquina.
// Claude e Codex seguem o mesmo shape e ficam em cache por cinco minutos.

import { exec } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir, platform as plataformaOs } from "node:os";
import { join } from "node:path";

import type { Ambiente } from "../tipos.js";

const CACHE_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 10 * 1000;

export interface ResultadoDeteccaoProvedor {
  instalado: boolean;
  versao: string | null;
  logado: boolean | null;
  binario: string | null;
}

type ProvedorDetectavel = "claude" | "codex";

const caches: Partial<
  Record<
    ProvedorDetectavel,
    { resultado: ResultadoDeteccaoProvedor; expira: number }
  >
> = {};

function traduzirPlataforma(codigo: string): string {
  const mapa: Record<string, string> = {
    win32: "Windows",
    darwin: "macOS",
    linux: "Linux",
  };
  return mapa[codigo] ?? codigo;
}

function rodar(comando: string): Promise<string | null> {
  return new Promise((resolver) => {
    exec(
      comando,
      { timeout: TIMEOUT_MS, windowsHide: true },
      (erro, stdout, stderr) => {
        if (erro) {
          resolver(null);
          return;
        }
        const saida = (stdout || stderr || "").trim();
        resolver(saida.length > 0 ? saida : null);
      },
    );
  });
}

function rodarComErro(comando: string): Promise<string> {
  return new Promise((resolver) => {
    exec(
      comando,
      { timeout: TIMEOUT_MS, windowsHide: true },
      (_erro, stdout, stderr) => {
        resolver((stdout || stderr || "").trim());
      },
    );
  });
}

function citarBinario(binario: string): string {
  return `"${binario.replace(/"/g, '\\"')}"`;
}

async function rodarVersao(binario: string): Promise<string | null> {
  return rodar(`${citarBinario(binario)} --version`);
}

async function checarLoginCodex(binario: string): Promise<boolean | null> {
  const saida = await rodarComErro(`${citarBinario(binario)} login status`);
  if (/not logged in|nao esta logado|login required/i.test(saida)) {
    return false;
  }
  if (/logged in using|authenticated/i.test(saida)) {
    return true;
  }
  return null;
}

async function checarLoginClaude(binario: string): Promise<boolean | null> {
  const saida = await rodarComErro(`${citarBinario(binario)} auth status`);
  try {
    const dados = JSON.parse(saida) as { loggedIn?: unknown };
    if (dados.loggedIn === true) return true;
    if (dados.loggedIn === false) return false;
  } catch {
    // Versao sem JSON, tenta as mensagens legiveis abaixo.
  }
  if (/not logged in|nao esta logado|login required/i.test(saida)) return false;
  if (/logged in|authenticated/i.test(saida)) return true;
  return null;
}

async function checarLogin(
  provedor: ProvedorDetectavel,
  binario: string,
): Promise<boolean | null> {
  return provedor === "codex"
    ? checarLoginCodex(binario)
    : checarLoginClaude(binario);
}

function extrairVersao(saida: string): string {
  const achado = saida.match(/\d+\.\d+(?:\.\d+)?[^\s]*/);
  return achado ? achado[0] : saida.trim();
}

async function caminhosCandidatos(provedor: ProvedorDetectavel): Promise<string[]> {
  const casa = homedir();
  const nomes = [`${provedor}.exe`, `${provedor}.cmd`, provedor];
  const brutos = [
    ...nomes.map((nome) => join(casa, ".local", "bin", nome)),
    ...(process.env.APPDATA
      ? nomes.map((nome) => join(process.env.APPDATA as string, "npm", nome))
      : []),
    ...(process.env.LOCALAPPDATA
      ? [
          ...nomes.map((nome) =>
            join(process.env.LOCALAPPDATA as string, "Microsoft", "WinGet", "Links", nome),
          ),
          ...(provedor === "codex"
            ? nomes.map((nome) =>
                join(
                  process.env.LOCALAPPDATA as string,
                  "Programs",
                  "OpenAI",
                  "Codex",
                  "bin",
                  nome,
                ),
              )
            : []),
        ]
      : []),
    ...nomes.map((nome) => join("/usr/local/bin", nome)),
    ...nomes.map((nome) => join("/opt/homebrew/bin", nome)),
  ];

  const existentes: string[] = [];
  for (const caminho of brutos) {
    try {
      await access(caminho);
      existentes.push(caminho);
    } catch {
      // Caminho ausente, segue para o proximo.
    }
  }
  return existentes;
}

async function detectarSemCache(
  provedor: ProvedorDetectavel,
): Promise<ResultadoDeteccaoProvedor> {
  const chaveOverride =
    provedor === "claude" ? "VKOS_CLAUDE_BIN" : "VKOS_CODEX_BIN";
  const override = process.env[chaveOverride]?.trim();

  if (override) {
    const saida = await rodarVersao(override);
    if (!saida) {
      return { instalado: false, versao: null, logado: null, binario: null };
    }
    return {
      instalado: true,
      versao: extrairVersao(saida),
      logado: await checarLogin(provedor, override),
      binario: override,
    };
  }

  const doPath = await rodarVersao(provedor);
  if (doPath) {
    return {
      instalado: true,
      versao: extrairVersao(doPath),
      logado: await checarLogin(provedor, provedor),
      binario: provedor,
    };
  }

  const candidatos = await caminhosCandidatos(provedor);
  for (const caminho of candidatos) {
    const saida = await rodarVersao(caminho);
    if (saida) {
      return {
        instalado: true,
        versao: extrairVersao(saida),
        logado: await checarLogin(provedor, caminho),
        binario: caminho,
      };
    }
  }

  return { instalado: false, versao: null, logado: null, binario: null };
}

async function detectar(
  provedor: ProvedorDetectavel,
): Promise<ResultadoDeteccaoProvedor> {
  const agora = Date.now();
  const cache = caches[provedor];
  if (cache && cache.expira > agora) {
    return cache.resultado;
  }

  const resultado = await detectarSemCache(provedor);
  caches[provedor] = { resultado, expira: Date.now() + CACHE_MS };
  return resultado;
}

export function detectarClaude(): Promise<ResultadoDeteccaoProvedor> {
  return detectar("claude");
}

export function detectarCodex(): Promise<ResultadoDeteccaoProvedor> {
  return detectar("codex");
}

export function limparCacheClaude(): void {
  delete caches.claude;
}

export function limparCacheCodex(): void {
  delete caches.codex;
}

export function limparCacheProvedores(): void {
  limparCacheClaude();
  limparCacheCodex();
}

export async function detectarAmbiente(): Promise<Ambiente> {
  const [claude, codex] = await Promise.all([detectarClaude(), detectarCodex()]);
  return {
    plataforma: traduzirPlataforma(plataformaOs()),
    node: process.version,
    claude,
    codex,
  };
}
