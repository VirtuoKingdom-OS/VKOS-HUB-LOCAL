import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { pastaDadosWorkspace } from "../workspaces/estado.js";

export interface UltimaColetaMeta {
  quando: string;
  ok: boolean;
  erro: string | null;
}

export interface VinculoMeta {
  instagramId?: string;
  contaAnunciosId?: string;
  paginaId?: string;
  vinculadoEm?: string;
  ultimaColeta?: UltimaColetaMeta;
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

function normalizar(bruto: unknown): VinculoMeta {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return {};
  const item = bruto as Record<string, unknown>;
  const ultima = item.ultimaColeta && typeof item.ultimaColeta === "object"
    ? item.ultimaColeta as Record<string, unknown>
    : null;
  return {
    ...(texto(item.instagramId) ? { instagramId: texto(item.instagramId) } : {}),
    ...(texto(item.contaAnunciosId) ? { contaAnunciosId: texto(item.contaAnunciosId) } : {}),
    ...(texto(item.paginaId) ? { paginaId: texto(item.paginaId) } : {}),
    ...(texto(item.vinculadoEm) ? { vinculadoEm: texto(item.vinculadoEm) } : {}),
    ...(ultima && texto(ultima.quando) && typeof ultima.ok === "boolean"
      ? {
          ultimaColeta: {
            quando: texto(ultima.quando)!,
            ok: ultima.ok,
            erro: texto(ultima.erro) ?? null,
          },
        }
      : {}),
  };
}

export function pastaMeta(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), "meta");
}

export function caminhoVinculoMeta(workspaceId: string): string {
  return join(pastaMeta(workspaceId), "vinculo.json");
}

export function lerVinculoMeta(workspaceId: string): VinculoMeta {
  try {
    const caminho = caminhoVinculoMeta(workspaceId);
    return existsSync(caminho)
      ? normalizar(JSON.parse(readFileSync(caminho, "utf8")))
      : {};
  } catch {
    return {};
  }
}

export function salvarVinculoMeta(
  workspaceId: string,
  alteracoes: VinculoMeta,
): VinculoMeta {
  const atual = lerVinculoMeta(workspaceId);
  const proximo = normalizar({
    ...atual,
    ...alteracoes,
    vinculadoEm: atual.vinculadoEm ?? new Date().toISOString(),
  });
  const caminho = caminhoVinculoMeta(workspaceId);
  mkdirSync(dirname(caminho), { recursive: true });
  gravarJsonAtomico(caminho, proximo);
  return proximo;
}

export function temProdutoMeta(vinculo: VinculoMeta): boolean {
  return Boolean(vinculo.instagramId || vinculo.contaAnunciosId || vinculo.paginaId);
}

export function lerJsonMeta<T>(workspaceId: string, nome: string, padrao: T): T {
  try {
    const caminho = join(pastaMeta(workspaceId), nome);
    return existsSync(caminho) ? JSON.parse(readFileSync(caminho, "utf8")) as T : padrao;
  } catch {
    return padrao;
  }
}

export function lerJsonlMeta<T>(workspaceId: string, nome: string): T[] {
  try {
    const caminho = join(pastaMeta(workspaceId), nome);
    if (!existsSync(caminho)) return [];
    return readFileSync(caminho, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .flatMap((linha) => {
        try {
          return [JSON.parse(linha) as T];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}
