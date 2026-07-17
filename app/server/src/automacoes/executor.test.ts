import assert from "node:assert/strict";
import test from "node:test";

import type { EventoDominio } from "../eventos/barramento.js";
import { variaveisDoEvento } from "./executor.js";

function evento(dados: Record<string, unknown>): EventoDominio {
  return {
    tipo: "crm:contato-movido",
    workspaceId: "w-teste",
    em: "2026-07-16T00:00:00.000Z",
    dados,
  };
}

test("usa valor do negocio no evento CRM v2", () => {
  const variaveis = variaveisDoEvento(evento({
    contato: { nome: "Maria", valorEstimado: 100 },
    negocio: { valorEstimado: 250 },
  }));
  assert.equal(variaveis.valorEstimado, "250");
});

test("mantem fallback do valor no contato para eventos historicos", () => {
  const variaveis = variaveisDoEvento(evento({
    contato: { nome: "Maria", valorEstimado: 100 },
  }));
  assert.equal(variaveis.valorEstimado, "100");
});
