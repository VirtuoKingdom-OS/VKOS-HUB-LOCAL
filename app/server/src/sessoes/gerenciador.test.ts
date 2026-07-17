import assert from "node:assert/strict";
import test from "node:test";

import { montarInstrucoesExtrasSessao, resolverModeloDaExecucao } from "./gerenciador.js";

test("sessao nova usa o modelo que esta na execucao", () => {
  assert.equal(
    resolverModeloDaExecucao(
      { provedor: "codex", modelo: "gpt-5.6-luna" },
      "gpt-5.4-mini",
      false,
    ),
    "gpt-5.4-mini",
  );
});

test("resume Codex apos restart usa o modelo persistido", () => {
  assert.equal(
    resolverModeloDaExecucao(
      { provedor: "codex", modelo: "gpt-5.6-luna" },
      "",
      true,
    ),
    "gpt-5.6-luna",
  );
});

test("resume Claude preserva a heranca nativa do CLI", () => {
  assert.equal(
    resolverModeloDaExecucao(
      { provedor: "claude", modelo: "claude-sonnet-4-5" },
      "",
      true,
    ),
    "",
  );
});

test("combina modo enxuto e CRM com a regra dura de privacidade", () => {
  const instrucoes = montarInstrucoesExtrasSessao({
    modoEnxuto: true,
    contextoCrm: "## Funil\n- Novo: 2",
  });
  assert.ok(instrucoes);
  assert.match(instrucoes, /<contexto-crm>/);
  assert.match(instrucoes, /Novo: 2/);
  assert.match(instrucoes, /REGRA DURA/);
  assert.match(instrucoes, /dado pessoal nunca/);
});

test("nao injeta instrucoes extras quando nao ha contexto", () => {
  assert.equal(montarInstrucoesExtrasSessao({}), undefined);
});
