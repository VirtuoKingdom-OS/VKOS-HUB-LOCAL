import assert from "node:assert/strict";
import test from "node:test";

import {
  custoDoResult,
  extrairTokensDoResult,
  montarInstrucoesExtrasSessao,
  resolverModeloDaExecucao,
  saneiaSessaoPersistida,
  usoAcumuladoDoResult,
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

test("contexto do CRM entra com a regra dura de privacidade", () => {
  const contexto = "## Funil\n- Novo: 2";
  const instrucoes = montarInstrucoesExtrasSessao({ contextoCrm: contexto });
  assert.ok(instrucoes);
  // O contexto precisa chegar literal, nao so o entorno dele. Um teste que
  // afirma apenas os marcadores passaria com a injecao apagada.
  assert.ok(instrucoes.includes(contexto));
  assert.match(instrucoes, /<contexto-crm>/);
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

// Zero calado e a pior mentira que este numero pode contar: some do total e
// ninguem percebe. Turno que concluiu bem sem custo vira DESCONHECIDO, nao zero.
test("custo ausente ou nao numerico e desconhecido, nao zero", () => {
  const semCampo = custoDoResult({});
  assert.equal(semCampo.custoUsd, 0);
  assert.equal(semCampo.custoConhecido, false);
  assert.match(String(semCampo.motivoSemCusto), /total_cost_usd/);

  const naoNumerico = custoDoResult({ total_cost_usd: "caro" });
  assert.equal(naoNumerico.custoConhecido, false);

  assert.equal(custoDoResult({ total_cost_usd: Number.NaN }).custoConhecido, false);
});

test("custo valido continua conhecido", () => {
  assert.equal(custoDoResult({ total_cost_usd: 0.42 }).custoConhecido, true);
  // Zero de verdade existe e continua sendo zero conhecido.
  assert.equal(custoDoResult({ total_cost_usd: 0 }).custoConhecido, true);
});

// Turno com erro nao soma custo (M10) e nao entra na conta de "sem preco": o
// Hub sabe que ele nao deve entrar no total, isso nao e falta de informacao.
test("result com erro nao vira turno sem custo conhecido", () => {
  const comErro = custoDoResult({ total_cost_usd: 0.42, is_error: true });
  assert.equal(comErro.custoUsd, 0);
  assert.equal(comErro.custoConhecido, true);
});

// O provedor pode declarar que nao sabe. O motivo dele chega inteiro na tela.
test("provedor que declara custo_conhecido false manda o motivo junto", () => {
  const lido = custoDoResult({
    total_cost_usd: 0,
    custo_conhecido: false,
    motivo_sem_custo: 'O modelo "gpt-9" nao esta na tabela de precos do Codex.',
  });
  assert.equal(lido.custoConhecido, false);
  assert.equal(lido.motivoSemCusto, 'O modelo "gpt-9" nao esta na tabela de precos do Codex.');
});

// MEDIDO em 2026-07-27 (Claude Code 2.1.220): num turno simples o bloco usage
// dizia 10 tokens de entrada e 305 de saida, e o modelUsage dizia 532 e 317. O
// total_cost_usd batia com o modelUsage, entao contar pelo usage mostrava menos
// token do que o dolar cobrava. Estes sao os numeros reais daquela medicao.
test("os tokens saem do modelUsage, que e a base do custo em dolar", () => {
  const tokens = extrairTokensDoResult({
    usage: {
      input_tokens: 10,
      cache_creation_input_tokens: 7123,
      cache_read_input_tokens: 24196,
      output_tokens: 305,
    },
    modelUsage: {
      "claude-haiku-4-5-20251001": {
        inputTokens: 532,
        outputTokens: 317,
        cacheReadInputTokens: 24196,
        cacheCreationInputTokens: 7123,
        costUSD: 0.0187826,
      },
    },
  });
  assert.equal(tokens.entradaNova, 532, "o usage subcontava a entrada em 522 tokens");
  assert.equal(tokens.saida, 317);
  assert.equal(tokens.cacheEscrita, 7123);
  assert.equal(tokens.cacheLeitura, 24196);
  assert.equal(tokens.entrada, 532 + 7123 + 24196);
});

test("modelUsage com varios modelos soma todos", () => {
  const tokens = extrairTokensDoResult({
    modelUsage: {
      "claude-haiku-4-5": { inputTokens: 100, outputTokens: 20, cacheReadInputTokens: 5 },
      "claude-sonnet-4-5": { inputTokens: 300, outputTokens: 80, cacheCreationInputTokens: 7 },
    },
  });
  assert.equal(tokens.entradaNova, 400);
  assert.equal(tokens.saida, 100);
  assert.equal(tokens.cacheEscrita, 7);
  assert.equal(tokens.cacheLeitura, 5);
});

// O Codex nao manda modelUsage. O caminho antigo continua inteiro.
test("sem modelUsage os tokens saem do usage, com cache_creation aninhado", () => {
  const tokens = extrairTokensDoResult({
    usage: {
      input_tokens: 40,
      cache_creation: { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 90 },
      cached_input_tokens: 200,
      output_tokens: 7,
    },
  });
  assert.equal(tokens.entradaNova, 40);
  assert.equal(tokens.cacheEscrita, 100);
  assert.equal(tokens.cacheLeitura, 200);
  assert.equal(tokens.saida, 7);
  assert.equal(tokens.entrada, 340);
});

test("result sem usage nenhum devolve tudo zero", () => {
  assert.deepEqual(extrairTokensDoResult({}), {
    entradaNova: 0,
    cacheEscrita: 0,
    cacheLeitura: 0,
    entrada: 0,
    saida: 0,
  });
});

// A linha de base do provedor acumulativo tem que atravessar o gerenciador
// inteira, senao a proxima retomada volta a inflar.
test("a linha de base de uso do result e lida inteira", () => {
  assert.deepEqual(
    usoAcumuladoDoResult({
      uso_acumulado: { entradaTotal: 24839, entradaCache: 16640, saida: 62, raciocinio: 48 },
    }),
    { entradaTotal: 24839, entradaCache: 16640, saida: 62, raciocinio: 48 },
  );
  assert.equal(usoAcumuladoDoResult({}), undefined);
  assert.equal(usoAcumuladoDoResult({ uso_acumulado: "nada" }), undefined);
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
