// Onde as pastas de workspace moram no disco: <raiz do projeto>/workspaces/.
//
// Antes de 2026-07-27 cada workspace nascia onde o usuario apontasse no
// navegador de pastas, e na pratica caia solto na raiz do projeto (jdv/,
// mae-pixel/). Duas dores: o usuario tinha que decidir um caminho a cada
// cliente, e Cerebro de cliente ficava fora do alcance do .gitignore, a um
// "git add ." de entrar no repositorio.
//
// Agora o destino nasce pronto. A raiz aceita ser injetada pra o teste
// trabalhar num tmpdir: raizProjeto() e constante e aponta pro projeto real,
// entao teste que dependesse dela mexeria em pasta de verdade.
// Ver docs/decisoes/2026-07-27-a-pasta-dos-workspaces.md.

import { join } from "node:path";

import { raizProjeto } from "../util/raizProjeto.js";

// Nome da pasta que guarda todos os workspaces. O .gitignore da raiz tem a
// linha /workspaces/ (com barra inicial, pra nao engolir server/src/workspaces).
export const NOME_RAIZ_WORKSPACES = "workspaces";

// Fallback do slug: nome que so tem emoji ou simbolo viraria pasta sem nome.
const SLUG_PADRAO = "workspace";

// A pasta que guarda todos os workspaces: <raiz>/workspaces/.
export function raizWorkspaces(raiz: string = raizProjeto()): string {
  return join(raiz, NOME_RAIZ_WORKSPACES);
}

// Nome do workspace virando nome de pasta. NFD separa a letra do acento
// combinado, o replace seguinte descarta o acento, e o que nao for letra ou
// numero vira hifen. Mesma regra que o frontend usava antes de o servidor
// assumir a composicao do destino.
export function slugWorkspace(nome: string): string {
  const limpo = (nome ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpo || SLUG_PADRAO;
}

// O destino padrao de um workspace novo: <raiz>/workspaces/<slug do nome>.
export function destinoPadraoWorkspace(nome: string, raiz?: string): string {
  return join(raizWorkspaces(raiz), slugWorkspace(nome));
}
