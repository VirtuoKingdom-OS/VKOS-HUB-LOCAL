// Cliente REST do CORE, o nivel de cima do Hub.
//
// FRONTEIRA DE TIPOS: o resumo nao e redeclarado aqui. Ele vem de ../tipos/core,
// que reexporta app/server/src/core/modelo.ts. Uma definicao so, e divergencia
// de modelo vira erro de compilacao.

import { pedir } from "./rest";
import type { ResumoCore } from "../tipos/core";

export type {
  DiaDeGasto,
  EstadoAtividade,
  GastoDoCore,
  ResumoCore,
  WorkspaceNoCore,
} from "../tipos/core";

// Tudo que o Dashboard do CORE mostra, numa leitura so.
export function obterResumoCore(): Promise<ResumoCore> {
  return pedir<ResumoCore>("/api/core/resumo");
}
