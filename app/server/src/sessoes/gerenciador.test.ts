import assert from "node:assert/strict";
import test from "node:test";

import {
  custoDoResult,
  montarInstrucoesExtrasSessao,
  resolverModeloDaExecucao,
  saneiaSessaoPersistida,
} from "./gerenciador.js";

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

// M10: custo de result com erro nao soma.
test("result sem erro contabiliza o custo do turno", () => {
  const { custoUsd, ehErro } = custoDoResult({ total_cost_usd: 0.42 });
  assert.equal(custoUsd, 0.42);
  assert.equal(ehErro, false);
});

test("result com is_error nao soma custo", () => {
  const { custoUsd, ehErro } = custoDoResult({ total_cost_usd: 0.42, is_error: true });
  assert.equal(custoUsd, 0);
  assert.equal(ehErro, true);
});

test("result com subtype error nao soma custo", () => {
  const { custoUsd, ehErro } = custoDoResult({ total_cost_usd: 0.9, subtype: "error" });
  assert.equal(custoUsd, 0);
  assert.equal(ehErro, true);
});

test("custo ausente ou nao numerico vira zero", () => {
  assert.equal(custoDoResult({}).custoUsd, 0);
  assert.equal(custoDoResult({ total_cost_usd: "caro" }).custoUsd, 0);
});

// A3 + B8: saneamento de sessao persistida.
test("saneia normaliza provedor, workspace e status ativo para parada", () => {
  const s = saneiaSessaoPersistida(
    {
      id: "s-1",
      titulo: "Site",
      prompt: "gere",
      pastaTrabalho: "/vkos",
      criadaEm: "2026-07-17T00:00:00.000Z",
      atualizadaEm: "2026-07-17T00:00:00.000Z",
      status: "rodando",
    },
    "w-pasta",
  );
  assert.ok(s);
  assert.equal(s.provedor, "claude");
  assert.equal(s.workspaceId, "w-pasta");
  assert.equal(s.status, "parada");
});

test("saneia respeita workspaceId proprio e provedor codex", () => {
  const s = saneiaSessaoPersistida(
    { id: "s-2", provedor: "codex", workspaceId: "w-real", status: "concluida" },
    "w-pasta",
  );
  assert.ok(s);
  assert.equal(s.provedor, "codex");
  assert.equal(s.workspaceId, "w-real");
  assert.equal(s.status, "concluida");
});

test("A3: conferencia em conferindo ou corrigindo vira pendencias no boot", () => {
  const conferindo = saneiaSessaoPersistida(
    { id: "s-3", status: "concluida", conferenciaSite: { estado: "conferindo", volta: 0 } },
    "w",
  );
  assert.equal(conferindo?.conferenciaSite?.estado, "pendencias");

  const corrigindo = saneiaSessaoPersistida(
    { id: "s-4", status: "concluida", conferenciaSite: { estado: "corrigindo", volta: 1 } },
    "w",
  );
  assert.equal(corrigindo?.conferenciaSite?.estado, "pendencias");
  assert.equal(corrigindo?.conferenciaSite?.volta, 1);
});

test("A3: conferencia terminal e preservada no boot", () => {
  const aprovada = saneiaSessaoPersistida(
    { id: "s-5", status: "concluida", conferenciaSite: { estado: "aprovada", volta: 0 } },
    "w",
  );
  assert.equal(aprovada?.conferenciaSite?.estado, "aprovada");
});

test("B8: entrada malformada devolve null sem derrubar", () => {
  assert.equal(saneiaSessaoPersistida(null, "w"), null);
  assert.equal(saneiaSessaoPersistida(42, "w"), null);
  assert.equal(saneiaSessaoPersistida({ semId: true }, "w"), null);
  assert.equal(saneiaSessaoPersistida({ id: 123 }, "w"), null);
});

test("B8: campos faltando ganham padrao seguro sem quebrar", () => {
  const s = saneiaSessaoPersistida({ id: "s-6" }, "w");
  assert.ok(s);
  assert.equal(s.titulo, "Sessao");
  assert.equal(s.prompt, "");
  assert.equal(s.status, "parada");
  assert.equal(typeof s.criadaEm, "string");
});
