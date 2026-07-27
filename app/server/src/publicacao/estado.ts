import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { quarentenarOuFalhar } from "../util/quarentena.js";
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

// Le o registro de um caminho. Arquivo ausente vira registro vazio, em silencio
// (nada foi exportado ainda). Arquivo que EXISTE mas nao parseia, ou que parseia
// sem o mapa de pecas, vai pra quarentena e vira registro vazio.
//
// Quarentena e segue com vazio: isto e metadado de tela, a data e o modo da
// ultima exportacao de cada peca. O conteudo exportado esta no disco do usuario,
// nao aqui, e a proxima exportacao reescreve a entrada. Mas o
// atualizarRegistroPeca grava o mapa inteiro de uma vez, entao se a quarentena
// falhar isto lanca antes que uma peca sozinha apague o registro das outras.
//
// Exportada pra provar o comportamento com fixture temporaria.
export function lerPublicacoesDeArquivo(arquivo: string): EstadoPublicacoes {
  if (!existsSync(arquivo)) return { pecas: {} };
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(arquivo, "utf8"));
  } catch {
    quarentenarOuFalhar(arquivo, "O historico de exportacao");
    return { pecas: {} };
  }
  const pecas = (bruto as { pecas?: unknown } | null)?.pecas;
  if (!bruto || typeof bruto !== "object" || !pecas || typeof pecas !== "object") {
    quarentenarOuFalhar(arquivo, "O historico de exportacao");
    return { pecas: {} };
  }
  // Arquivo antigo pode trazer github e netlify. Sao descartados aqui, pra
  // resposta e disco so falarem do que o produto ainda faz.
  const limpo: Record<string, RegistroPublicacaoPeca> = {};
  for (const [pasta, registro] of Object.entries(pecas as Record<string, unknown>)) {
    const exportacao = (registro as RegistroPublicacaoPeca | null)?.exportacao;
    if (exportacao) limpo[pasta] = { exportacao };
  }
  return { pecas: limpo };
}

export function lerPublicacoes(workspaceId: string): EstadoPublicacoes {
  return lerPublicacoesDeArquivo(caminho(workspaceId));
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
