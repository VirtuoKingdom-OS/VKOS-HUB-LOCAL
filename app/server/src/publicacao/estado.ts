import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  garantirPastaDadosWorkspace,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

const NOME_ARQUIVO = "publicacoes.json";

export type ModoPublicacaoRegistro = "astro" | "html";

export interface RegistroGithub {
  repo: string;
  url: string;
  branch: string;
  em: string;
  modo?: ModoPublicacaoRegistro;
}

export interface RegistroNetlify {
  siteId: string;
  url: string;
  em: string;
  modo?: ModoPublicacaoRegistro;
}

export interface RegistroPublicacaoPeca {
  github?: RegistroGithub;
  netlify?: RegistroNetlify;
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
    return { pecas: pecas as Record<string, RegistroPublicacaoPeca> };
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
