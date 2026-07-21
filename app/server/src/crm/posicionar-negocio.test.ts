import assert from "node:assert/strict";
import test from "node:test";

import { posicionarNoFunil } from "./estado.js";

// A ordem do array de contatos e a ordem visual do quadro. Estes casos travam a
// regra de insercao, que precisa ser identica a do cliente em moverContatoLocal.
// posicionarNoFunil e generica: aqui exercitamos com itens minimos {id, colunaId}.
function item(id: string, colunaId: string): { id: string; colunaId: string } {
  return { id, colunaId };
}

function ids(lista: { id: string }[]): string[] {
  return lista.map((i) => i.id);
}

test("reordena dentro da mesma coluna sem tocar nas outras", () => {
  const a = item("a", "col1");
  const b = item("b", "col1");
  const c = item("c", "col1");
  const z = item("z", "col2");

  assert.deepEqual(ids(posicionarNoFunil([a, b, c, z], c, 0)), ["c", "a", "b", "z"]);
  assert.deepEqual(ids(posicionarNoFunil([a, b, c, z], a, 1)), ["b", "a", "c", "z"]);
  assert.deepEqual(ids(posicionarNoFunil([a, b, c, z], a, 2)), ["b", "c", "a", "z"]);
});

test("soltar na posicao atual mantem a ordem", () => {
  const a = item("a", "col1");
  const b = item("b", "col1");
  assert.deepEqual(ids(posicionarNoFunil([a, b], a, 0)), ["a", "b"]);
  assert.deepEqual(ids(posicionarNoFunil([a, b], b, 1)), ["a", "b"]);
});

test("entra na coluna de destino na posicao pedida", () => {
  const a = item("a", "col1");
  const x = item("x", "col2");
  const y = item("y", "col2");
  const movido = { ...a, colunaId: "col2" };

  assert.deepEqual(ids(posicionarNoFunil([a, x, y], movido, 0)), ["a", "x", "y"]);
  assert.deepEqual(ids(posicionarNoFunil([a, x, y], movido, 1)), ["x", "a", "y"]);
  assert.deepEqual(ids(posicionarNoFunil([a, x, y], movido, 2)), ["x", "y", "a"]);
});

test("indice fora da faixa e preso no limite da coluna", () => {
  const a = item("a", "col1");
  const b = item("b", "col1");
  const c = item("c", "col1");
  assert.deepEqual(ids(posicionarNoFunil([a, b, c], a, 99)), ["b", "c", "a"]);
  assert.deepEqual(ids(posicionarNoFunil([a, b, c], c, -5)), ["c", "a", "b"]);
});

test("primeiro cartao de uma coluna vazia vai pro fim do array", () => {
  const a = item("a", "col1");
  const b = item("b", "col1");
  const movido = { ...a, colunaId: "col2" };
  assert.deepEqual(ids(posicionarNoFunil([a, b], movido, 0)), ["b", "a"]);
});
