import { readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import { workspacePorId } from "../workspaces/estado.js";
import {
  auditarSiteEstatico,
  listarArquivosSite,
  type AuditoriaSiteEstatico,
} from "../vkos/siteEstatico.js";

export interface ArquivoPublicavel {
  caminho: string;
  conteudo: Buffer;
}

export function pastaDaPeca(workspaceId: string, pasta: string): string {
  const workspace = workspacePorId(workspaceId);
  if (!workspace) throw new Error("Workspace não encontrado.");
  if (
    !pasta ||
    pasta.includes("\0") ||
    pasta.includes("/") ||
    pasta.includes("\\") ||
    pasta.includes("..") ||
    pasta.startsWith(".")
  ) {
    throw new Error("Nome de peça inválido.");
  }
  const base = resolve(workspace.pasta, "conteudo");
  const alvo = resolve(base, pasta);
  const rel = relative(base, alvo);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Nome de peça inválido.");
  }
  try {
    if (!statSync(alvo).isDirectory()) throw new Error();
  } catch {
    throw new Error("Peça não encontrada.");
  }
  return alvo;
}

export function coletarArquivosPublicaveis(
  workspaceId: string,
  pasta: string,
): ArquivoPublicavel[] {
  const raiz = pastaDaPeca(workspaceId, pasta);
  const arquivos = listarArquivosSite(raiz).map((caminho) => ({
    caminho,
    conteudo: readFileSync(join(raiz, caminho)),
  }));
  if (arquivos.length === 0) {
    throw new Error("A peça não tem arquivos para publicar.");
  }
  return arquivos;
}

export function auditarPecaParaPublicacao(
  workspaceId: string,
  pasta: string,
): AuditoriaSiteEstatico {
  return auditarSiteEstatico(pastaDaPeca(workspaceId, pasta));
}

// Assinatura barata da árvore publicável. Permite reutilizar a auditoria em
// navegador entre a abertura do painel e o clique de publicar sem aceitar
// resultado antigo depois de qualquer edição de arquivo.
export function versaoPecaParaPublicacao(
  workspaceId: string,
  pasta: string,
): string {
  const raiz = pastaDaPeca(workspaceId, pasta);
  return listarArquivosSite(raiz)
    .map((caminho) => {
      const estado = statSync(join(raiz, caminho));
      return `${caminho}:${estado.size}:${estado.mtimeMs}`;
    })
    .join("|");
}
