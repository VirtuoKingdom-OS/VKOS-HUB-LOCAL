// A raiz da instalacao: a pasta que contem o app/.
//
// Numa instalacao real a estrutura e <raiz>/app/ ao lado de <raiz>/VKOS/, que e
// o que o instalador monta e o que o integrado.ts procura. No desenvolvimento e
// a raiz do repositorio. Nos dois casos vale a mesma conta: subir de src/util/
// ate passar do app/.
//
// Serve a VKOS-IDE, que desde 2026-07-27 abre o projeto inteiro em vez da pasta
// do workspace ativo. Ver docs/decisoes/2026-07-27-a-ide-abre-o-projeto.md.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// src/util -> src -> server -> app -> raiz. O dist/ mora no mesmo nivel que o
// src/, entao a contagem vale rodando por tsx ou pelo build.
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

export function raizProjeto(): string {
  return RAIZ;
}
