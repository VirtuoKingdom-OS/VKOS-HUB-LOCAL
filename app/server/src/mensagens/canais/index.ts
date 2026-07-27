// Registro dos canais de mensagem. Mesmo padrao de provedores/index.ts.
//
// Canal novo entra aqui e implementa canais/contrato.ts. Nada fora deste
// arquivo precisa saber quais canais existem.

import { ErroMensagens, type IdCanal } from "../modelo.js";
import type { CanalMensagens } from "./contrato.js";
import { canalManual } from "./manual.js";

const canais = new Map<string, CanalMensagens>();

export function registrarCanal(canal: CanalMensagens): void {
  canais.set(canal.id, canal);
}

registrarCanal(canalManual);

export const CANAL_PADRAO: IdCanal = "manual";

// Resolve o canal. Canal que nao existe e erro do pedido, nao do servidor: por
// isso 400 e nao 500. "whatsapp" cai aqui hoje, de proposito, ate a integracao
// existir de verdade.
export function obterCanal(id: string): CanalMensagens {
  const canal = canais.get(id);
  if (!canal) {
    throw new ErroMensagens(`O canal "${id}" ainda nao esta disponivel.`, 400);
  }
  return canal;
}

export function canalExiste(id: string): boolean {
  return canais.has(id);
}

export function listarCanais(): CanalMensagens[] {
  return [...canais.values()];
}

export type { CanalMensagens } from "./contrato.js";
