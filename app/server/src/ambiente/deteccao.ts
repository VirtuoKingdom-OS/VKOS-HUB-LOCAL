// Deteccao do ambiente da maquina.
// Descobre se o Claude Code esta instalado e em que versao, a versao do Node
// e a plataforma. A deteccao do claude e lenta, entao fica em cache por minutos.

import { exec } from "node:child_process";
import { homedir, platform as plataformaOs } from "node:os";
import { join } from "node:path";
import { access } from "node:fs/promises";

import type { Ambiente } from "../tipos.js";

// Tempo de vida do cache da deteccao do claude. Cinco minutos.
const CACHE_MS = 5 * 60 * 1000;
// Limite pra cada tentativa de rodar o claude. Ele pode demorar pra responder.
const TIMEOUT_MS = 10 * 1000;

interface ResultadoClaude {
  instalado: boolean;
  versao: string | null;
}

let cache: { resultado: ResultadoClaude; expira: number } | null = null;

// Traduz o codigo cru do process.platform pra um nome legivel ao usuario leigo.
function traduzirPlataforma(codigo: string): string {
  const mapa: Record<string, string> = {
    win32: "Windows",
    darwin: "macOS",
    linux: "Linux",
  };
  return mapa[codigo] ?? codigo;
}

// Roda um comando e devolve a saida. Nunca lanca: erro vira null.
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

// Extrai a versao no formato "2.1.195 (Claude Code)". Fica com o numero.
function extrairVersao(saida: string): string {
  const achado = saida.match(/\d+\.\d+\.\d+[^\s]*/);
  return achado ? achado[0] : saida.trim();
}

// Monta os caminhos onde o claude costuma ficar instalado no Windows e no Unix.
// Serve de reserva quando ele nao esta no PATH do processo do servidor.
async function caminhosCandidatos(): Promise<string[]> {
  const casa = homedir();
  const brutos = [
    join(casa, ".local", "bin", "claude.exe"),
    join(casa, ".local", "bin", "claude.cmd"),
    join(casa, ".local", "bin", "claude"),
    process.env.APPDATA ? join(process.env.APPDATA, "npm", "claude.cmd") : null,
    process.env.APPDATA ? join(process.env.APPDATA, "npm", "claude") : null,
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
  ].filter((c): c is string => c !== null);

  const existentes: string[] = [];
  for (const caminho of brutos) {
    try {
      await access(caminho);
      existentes.push(caminho);
    } catch {
      // Nao existe, ignora.
    }
  }
  return existentes;
}

// Detecta o claude de verdade. Tenta o PATH primeiro, depois os caminhos conhecidos.
async function detectarClaudeSemCache(): Promise<ResultadoClaude> {
  // Tentativa direta pelo PATH. No Windows o exec usa o shell, entao resolve o .cmd.
  const doPath = await rodar("claude --version");
  if (doPath) {
    return { instalado: true, versao: extrairVersao(doPath) };
  }

  // Reserva: procura o binario nos locais de instalacao conhecidos.
  const candidatos = await caminhosCandidatos();
  for (const caminho of candidatos) {
    const saida = await rodar(`"${caminho}" --version`);
    if (saida) {
      return { instalado: true, versao: extrairVersao(saida) };
    }
  }

  return { instalado: false, versao: null };
}

// Detecta o claude com cache. A primeira chamada e lenta, as seguintes sao rapidas.
export async function detectarClaude(): Promise<ResultadoClaude> {
  const agora = Date.now();
  if (cache && cache.expira > agora) {
    return cache.resultado;
  }
  const resultado = await detectarClaudeSemCache();
  cache = { resultado, expira: agora + CACHE_MS };
  return resultado;
}

// Limpa o cache. Util pra forcar uma nova deteccao apos o usuario instalar o claude.
export function limparCacheClaude(): void {
  cache = null;
}

// Monta o objeto Ambiente completo conforme o contrato.
export async function detectarAmbiente(): Promise<Ambiente> {
  const claude = await detectarClaude();
  return {
    plataforma: traduzirPlataforma(plataformaOs()),
    node: process.version,
    claude,
  };
}
