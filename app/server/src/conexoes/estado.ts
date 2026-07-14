// Estado das conexoes MCP por workspace. Guarda quais servidores estao ligados
// e a config de cada um (tokens). Os segredos vivem SO neste arquivo local, em
// app/dados/workspaces/<id>/conexoes.json. Escrita atomica.
//
// Modulo folha: depende so de fs/path, do gravarJson e dos resolvedores de
// caminho de workspace. Nunca importa rotas nem catalogo, pra nao criar ciclo.

import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { garantirPastaDadosWorkspace, pastaDadosWorkspace } from "../workspaces/estado.js";

const NOME_ARQUIVO = "conexoes.json";

// Estado de um servidor: ligado ou nao, mais a config (tokens por chave).
export interface EstadoServidor {
  habilitado: boolean;
  config: Record<string, string>;
}

// Estado inteiro das conexoes de um workspace.
export interface EstadoConexoes {
  servidores: Record<string, EstadoServidor>;
}

function caminhoArquivo(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), NOME_ARQUIVO);
}

// So aceita string nos valores de config. Descarta o resto sem quebrar.
function normalizarConfig(v: unknown): Record<string, string> {
  const saida: Record<string, string> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "string") saida[k] = val;
    }
  }
  return saida;
}

// Le o estado das conexoes de um workspace. Arquivo ausente ou corrompido vira
// estado vazio, sem quebrar.
export function lerConexoes(workspaceId: string): EstadoConexoes {
  try {
    const arquivo = caminhoArquivo(workspaceId);
    if (existsSync(arquivo)) {
      const dados = JSON.parse(readFileSync(arquivo, "utf8"));
      if (dados && typeof dados === "object" && dados.servidores && typeof dados.servidores === "object") {
        const servidores: Record<string, EstadoServidor> = {};
        for (const [id, bruto] of Object.entries(dados.servidores as Record<string, unknown>)) {
          if (!bruto || typeof bruto !== "object") continue;
          const s = bruto as Record<string, unknown>;
          servidores[id] = {
            habilitado: s.habilitado === true,
            config: normalizarConfig(s.config),
          };
        }
        return { servidores };
      }
    }
  } catch {
    // Arquivo ilegivel: comeca vazio.
  }
  return { servidores: {} };
}

// Grava o estado das conexoes de um workspace, de forma atomica.
export function salvarConexoes(workspaceId: string, estado: EstadoConexoes): void {
  garantirPastaDadosWorkspace(workspaceId);
  gravarJsonAtomico(caminhoArquivo(workspaceId), estado);
}
