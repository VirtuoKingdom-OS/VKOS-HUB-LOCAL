import { AsyncLocalStorage } from "node:async_hooks";

export interface UsuarioRequisicao {
  id: string;
  email: string;
  papel: "operador" | "cliente";
}

export interface ContextoRequisicao {
  usuario: UsuarioRequisicao | null;
  workspaceId: string | null;
  workspacePasta: string | null;
  features: ReadonlySet<string>;
}

export const armazenamentoRequisicao = new AsyncLocalStorage<ContextoRequisicao>();

export function contextoAtual(): ContextoRequisicao | null {
  return armazenamentoRequisicao.getStore() ?? null;
}
