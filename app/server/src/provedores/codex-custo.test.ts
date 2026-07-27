// Custo por turno no Codex.
//
// MEDIDO em 2026-07-27 com o codex-cli 0.144.4: o usage do turn.completed e o
// ACUMULADO DA THREAD, nao o do turno. Tres turnos "responda so: X" seguidos na
// mesma thread deram output_tokens 40, 62 e 80, e input_tokens 12411, 24839 e
// 37284. Somar esse valor a cada retomada inflava o gasto de forma composta.
// Os numeros usados aqui saem dessa medicao.

import assert from "node:assert/strict";
import test from "node:test";

import {
  deltaDeUso,
  estimarCustoCodexUso,
  TradutorEventosCodex,
} from "./codex.js";

const MEDIDO = [
  { input_tokens: 12411, cached_input_tokens: 4480, output_tokens: 40, reasoning_output_tokens: 33 },
  { input_tokens: 24839, cached_input_tokens: 16640, output_tokens: 62, reasoning_output_tokens: 48 },
  { input_tokens: 37284, cached_input_tokens: 28800, output_tokens: 80, reasoning_output_tokens: 59 },
];

function resultDe(tradutor: TradutorEventosCodex, usage: unknown): Record<string, unknown> {
  const eventos = tradutor.traduzir({ type: "turn.completed", usage });
  const result = eventos.find((e) => e.type === "result");
  assert.ok(result, "o turn.completed tem que virar um result");
  return result as Record<string, unknown>;
}

function usoDoResult(result: Record<string, unknown>): Record<string, number> {
  return result["usage"] as Record<string, number>;
}

test("thread nova conta o acumulado inteiro, porque ele E o primeiro turno", () => {
  const result = resultDe(new TradutorEventosCodex("gpt-5.4-mini"), MEDIDO[0]);
  const uso = usoDoResult(result);
  assert.equal(uso.cache_read_input_tokens, 4480);
  assert.equal(uso.input_tokens, 12411 - 4480);
  assert.equal(uso.output_tokens, 40);
  assert.equal(result["custo_conhecido"], true);
  assert.deepEqual(result["uso_acumulado"], {
    entradaTotal: 12411,
    entradaCache: 4480,
    saida: 40,
    raciocinio: 33,
  });
});

// O caso que inflava: a retomada trazia o acumulado da thread e o Hub somava
// tudo de novo. Com a linha de base, o turno vale so o que ele consumiu.
test("retomada com linha de base cobra o turno, nao a thread inteira", () => {
  const tradutor = new TradutorEventosCodex("gpt-5.4-mini", {
    entradaTotal: 12411,
    entradaCache: 4480,
    saida: 40,
    raciocinio: 33,
  });
  const result = resultDe(tradutor, MEDIDO[1]);
  const uso = usoDoResult(result);

  assert.equal(uso.cache_read_input_tokens, 16640 - 4480);
  assert.equal(uso.input_tokens, 24839 - 12411 - (16640 - 4480));
  assert.equal(uso.output_tokens, 62 - 40, "22 tokens de saida, nao os 62 da thread");
  assert.equal(uso.reasoning_output_tokens, 48 - 33);
  assert.equal(result["custo_conhecido"], true);
  // A linha de base do proximo turno e o acumulado cru, nao o delta.
  assert.deepEqual(result["uso_acumulado"], {
    entradaTotal: 24839,
    entradaCache: 16640,
    saida: 62,
    raciocinio: 48,
  });
});

// A conta que interessa: somar os tres turnos tem que dar o mesmo que o
// acumulado final da thread. Antes dava quase o dobro.
test("somar os tres turnos da exatamente o acumulado final da thread", () => {
  let base: { entradaTotal: number; entradaCache: number; saida: number; raciocinio: number } | undefined;
  let entradaNova = 0;
  let cacheLeitura = 0;
  let saida = 0;

  for (const [indice, usage] of MEDIDO.entries()) {
    const tradutor = new TradutorEventosCodex("gpt-5.4-mini", indice === 0 ? undefined : base);
    const result = resultDe(tradutor, usage);
    const uso = usoDoResult(result);
    entradaNova += uso.input_tokens;
    cacheLeitura += uso.cache_read_input_tokens;
    saida += uso.output_tokens;
    base = result["uso_acumulado"] as typeof base;
  }

  assert.equal(cacheLeitura, 28800);
  assert.equal(entradaNova + cacheLeitura, 37284);
  assert.equal(saida, 80);
});

// Nao chutar e melhor do que inflar. Sem a linha de base, o turno sai declarado
// como sem custo conhecido, e ja devolve a base pra proxima retomada acertar.
test("retomada sem linha de base nao chuta: declara o turno sem custo conhecido", () => {
  const tradutor = new TradutorEventosCodex("gpt-5.4-mini", null);
  const result = resultDe(tradutor, MEDIDO[1]);

  assert.equal(result["custo_conhecido"], false);
  assert.equal(result["total_cost_usd"], 0);
  assert.match(String(result["motivo_sem_custo"]), /acumulado da thread/i);
  const uso = usoDoResult(result);
  assert.equal(uso.input_tokens, 0);
  assert.equal(uso.output_tokens, 0);
  assert.deepEqual(result["uso_acumulado"], {
    entradaTotal: 24839,
    entradaCache: 16640,
    saida: 62,
    raciocinio: 48,
  });
});

// Modelo fora da tabela nao custa zero: custa desconhecido. Zero calado some do
// total e ninguem percebe.
test("modelo sem preco na tabela sai como custo desconhecido, nunca como zero", () => {
  const result = resultDe(new TradutorEventosCodex("gpt-9-inexistente"), MEDIDO[0]);
  assert.equal(result["custo_conhecido"], false);
  assert.equal(result["total_cost_usd"], 0);
  assert.match(String(result["motivo_sem_custo"]), /tabela de precos/i);
  // Os tokens continuam medidos: o que falta e o preco, nao o consumo.
  assert.equal(usoDoResult(result).output_tokens, 40);

  const estimativa = estimarCustoCodexUso("gpt-9-inexistente", {
    entradaTotal: 100,
    entradaCache: 0,
    entradaNova: 100,
    saida: 10,
    raciocinio: 0,
  });
  assert.equal(estimativa.conhecido, false);
  assert.equal(estimativa.custoUsd, 0);
});

// O CLI pode reiniciar a contagem numa retomada. O delta nunca fica negativo.
test("acumulado menor que a linha de base vira zero, nunca negativo", () => {
  const delta = deltaDeUso(
    { entradaTotal: 100, entradaCache: 40, entradaNova: 60, saida: 5, raciocinio: 1 },
    { entradaTotal: 500, entradaCache: 300, saida: 50, raciocinio: 10 },
  );
  assert.deepEqual(delta, {
    entradaTotal: 0,
    entradaCache: 0,
    entradaNova: 0,
    saida: 0,
    raciocinio: 0,
  });
});

// O preco do turno sai do delta, entao a estimativa de uma retomada tem que ser
// muito menor que a do acumulado. Aqui a diferenca fica explicita em dolar.
test("a estimativa da retomada cai junto com o delta", () => {
  const doAcumulado = estimarCustoCodexUso("gpt-5.4-mini", {
    entradaTotal: 24839,
    entradaCache: 16640,
    entradaNova: 8199,
    saida: 62,
    raciocinio: 48,
  });
  const doTurno = estimarCustoCodexUso(
    "gpt-5.4-mini",
    deltaDeUso(
      { entradaTotal: 24839, entradaCache: 16640, entradaNova: 8199, saida: 62, raciocinio: 48 },
      { entradaTotal: 12411, entradaCache: 4480, saida: 40, raciocinio: 33 },
    ),
  );
  assert.equal(doAcumulado.conhecido, true);
  assert.equal(doTurno.conhecido, true);
  assert.ok(
    doTurno.custoUsd < doAcumulado.custoUsd / 2,
    `o turno (${doTurno.custoUsd}) tinha que custar bem menos que o acumulado (${doAcumulado.custoUsd})`,
  );
});
