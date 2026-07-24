import assert from "node:assert/strict";
import test from "node:test";

import { precoDoModelo, resolverModelo } from "./modelos.js";

const ambiente = {
  GEMINI_MODELO_PADRAO: "gemini-flash",
  GEMINI_MODELO_FORTE: "gemini-pro",
  CLAUDE_MODELO_ECONOMICO: "claude-haiku",
  CLAUDE_MODELO_PADRAO: "claude-sonnet",
  CLAUDE_MODELO_FORTE: "claude-opus",
};

test("aliases do app viram somente modelos permitidos de cada motor", () => {
  assert.equal(resolverModelo("gemini", "economico", ambiente).id, "gemini-flash");
  assert.equal(resolverModelo("gemini", "opus", ambiente).id, "gemini-pro");
  assert.equal(resolverModelo("claude_team", "haiku", ambiente).id, "claude-haiku");
  assert.equal(resolverModelo("claude_team", "forte", ambiente).id, "claude-opus");
  assert.equal(resolverModelo("claude_team", "modelo-inventado", ambiente).id, "claude-sonnet");
});

test("preco usa a faixa e preserva variavel legada como fallback", () => {
  assert.equal(
    precoDoModelo("gemini", "forte", "ENTRADA", {
      PRECO_GEMINI_FORTE_ENTRADA: "2.5",
      PRECO_GEMINI_ENTRADA: "1",
    }),
    2.5,
  );
  assert.equal(
    precoDoModelo("gemini", "padrao", "SAIDA", {
      PRECO_GEMINI_SAIDA: "3",
    }),
    3,
  );
  assert.throws(() => precoDoModelo("claude_team", "padrao", "ENTRADA", {}));
});

test("preço inválido é detectado antes de abrir uso externo", () => {
  assert.throws(
    () => precoDoModelo("gemini", "economico", "SAIDA", {
      PRECO_GEMINI_SAIDA: "INFORME_O_PRECO",
    }),
    /Tabela de custo/,
  );
});
