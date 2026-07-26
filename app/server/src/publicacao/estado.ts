import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  garantirPastaDadosWorkspace,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

// Registro local do que ja saiu de cada peca. Desde 2026-07-26 guarda somente a
// exportacao: a publicacao integrada no GitHub e na Netlify saiu do produto (ver
// decisoes/2026-07-26-fim-da-publicacao-integrada.md). O arquivo mantem o nome
// antigo de proposito: entradas velhas com github e netlify sao simplesmente
// ignoradas na leitura, sem migracao.
const NOME_ARQUIVO = "publicacoes.json";

export type ModoPublicacaoRegistro = "astro" | "html";

export interface RegistroExportacao {
  em: string;
  modo: ModoPublicacaoRegistro;
}

export interface RegistroPublicacaoPeca {
  exportacao?: RegistroExportacao;
}

export interface EstadoPublicacoes {
  pecas: Record<string, RegistroPublicacaoPeca>;
}

function caminho(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), NOME_ARQUIVO);
}

export function lerPublicacoes(workspaceId: string): EstadoPublicacoes {
  try {
    const arquivo = caminho(workspaceId);
    if (!existsSync(arquivo)) return { pecas: {} };
    const bruto = JSON.parse(readFileSync(arquivo, "utf8")) as unknown;
    if (!bruto || typeof bruto !== "object") return { pecas: {} };
    const pecas = (bruto as { pecas?: unknown }).pecas;
    if (!pecas || typeof pecas !== "object") return { pecas: {} };
    // Arquivo antigo pode trazer github e netlify. Sao descartados aqui, pra
    // resposta e disco so falarem do que o produto ainda faz.
    const limpo: Record<string, RegistroPublicacaoPeca> = {};
    for (const [pasta, registro] of Object.entries(pecas as Record<string, unknown>)) {
      const exportacao = (registro as RegistroPublicacaoPeca | null)?.exportacao;
      if (exportacao) limpo[pasta] = { exportacao };
    }
    return { pecas: limpo };
  } catch {
    return { pecas: {} };
  }
}

export function registroDaPeca(
  workspaceId: string,
  pasta: string,
): RegistroPublicacaoPeca {
  return lerPublicacoes(workspaceId).pecas[pasta] ?? {};
}

export function atualizarRegistroPeca(
  workspaceId: string,
  pasta: string,
  parcial: RegistroPublicacaoPeca,
): RegistroPublicacaoPeca {
  const estado = lerPublicacoes(workspaceId);
  const atual = estado.pecas[pasta] ?? {};
  const novo = { ...atual, ...parcial };
  estado.pecas[pasta] = novo;
  garantirPastaDadosWorkspace(workspaceId);
  gravarJsonAtomico(caminho(workspaceId), estado);
  return novo;
}
