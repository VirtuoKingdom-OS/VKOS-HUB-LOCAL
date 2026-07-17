// Registro e resolucao central dos provedores de IA.
// Sessao antiga sem provedor sempre pertence ao Claude.

import { obterProvedorPadrao } from "../config/estado.js";
import type { Sessao } from "../tipos.js";
import { provedorClaude } from "./claude.js";
import { provedorCodex } from "./codex.js";
import type { IdProvedor, ProvedorIA } from "./contrato.js";

const provedores = new Map<IdProvedor, ProvedorIA>();

export function registrarProvedor(provedor: ProvedorIA): void {
  provedores.set(provedor.id, provedor);
}

registrarProvedor(provedorClaude);
registrarProvedor(provedorCodex);

export function obterProvedor(id: IdProvedor): ProvedorIA {
  const provedor = provedores.get(id);
  if (!provedor) {
    throw new Error(`Provedor ${id} ainda nao esta disponivel.`);
  }
  return provedor;
}

export function obterProvedorAtivo(): ProvedorIA {
  return obterProvedor(obterProvedorPadrao() ?? "claude");
}

export function obterIdProvedorDaSessao(
  sessao: Pick<Sessao, "provedor"> | Partial<Pick<Sessao, "provedor">>,
): IdProvedor {
  return sessao.provedor === "codex" ? "codex" : "claude";
}

export function obterProvedorDaSessao(
  sessao: Pick<Sessao, "provedor"> | Partial<Pick<Sessao, "provedor">>,
): ProvedorIA {
  return obterProvedor(obterIdProvedorDaSessao(sessao));
}

export function listarProvedoresRegistrados(): ProvedorIA[] {
  return Array.from(provedores.values());
}
