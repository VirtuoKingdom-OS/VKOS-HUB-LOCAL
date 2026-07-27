import { test } from "node:test";
import assert from "node:assert/strict";
import { Historico } from "./nucleo.js";

// O historico e a peca que da coragem de experimentar: sem refazer, um Ctrl+Z a
// mais apaga a edicao pra sempre. Estes testes travam o contrato inteiro.

test("historico vazio nao desfaz nem refaz", () => {
  const h = new Historico<string>();
  assert.equal(h.temDesfazer, false);
  assert.equal(h.temRefazer, false);
  assert.equal(h.desfazer("agora"), undefined);
  assert.equal(h.refazer("agora"), undefined);
});

test("desfazer devolve o estado de antes e libera o refazer", () => {
  const h = new Historico<string>();
  h.registrar("A"); // antes de virar B
  assert.equal(h.temDesfazer, true);
  assert.equal(h.temRefazer, false);
  assert.equal(h.desfazer("B"), "A");
  assert.equal(h.temDesfazer, false);
  assert.equal(h.temRefazer, true);
});

test("refazer devolve o estado que o desfazer tinha abandonado", () => {
  const h = new Historico<string>();
  h.registrar("A");
  assert.equal(h.desfazer("B"), "A");
  assert.equal(h.refazer("A"), "B");
  assert.equal(h.temRefazer, false);
  assert.equal(h.temDesfazer, true);
});

test("desfazer e refazer aguentam varios passos, na ordem certa", () => {
  const h = new Historico<string>();
  h.registrar("A"); // A -> B
  h.registrar("B"); // B -> C
  h.registrar("C"); // C -> D
  assert.equal(h.desfazer("D"), "C");
  assert.equal(h.desfazer("C"), "B");
  assert.equal(h.desfazer("B"), "A");
  assert.equal(h.temDesfazer, false);
  assert.equal(h.refazer("A"), "B");
  assert.equal(h.refazer("B"), "C");
  assert.equal(h.refazer("C"), "D");
  assert.equal(h.temRefazer, false);
});

test("acao nova depois de desfazer mata o refazer pendente", () => {
  const h = new Historico<string>();
  h.registrar("A");
  h.desfazer("B");
  assert.equal(h.temRefazer, true);
  h.registrar("A"); // editou outra coisa a partir de A
  assert.equal(h.temRefazer, false);
  assert.equal(h.refazer("X"), undefined);
});

test("refazer nao apaga a propria fila de refazer", () => {
  const h = new Historico<string>();
  h.registrar("A");
  h.registrar("B");
  h.desfazer("C");
  h.desfazer("B");
  assert.equal(h.refazer("A"), "B");
  // Ainda ha o C esperando: um refazer nao pode ter zerado a fila.
  assert.equal(h.temRefazer, true);
  assert.equal(h.refazer("B"), "C");
});

test("descartarUltimo tira o passo sem restaurar nada", () => {
  const h = new Historico<string>();
  h.registrar("A");
  h.descartarUltimo();
  assert.equal(h.temDesfazer, false);
});

test("gesto agrupado deixa um passo so, que volta ao estado de antes do gesto", () => {
  // O motor pula o registrar() dos toques seguintes de um mesmo gesto. O
  // historico entao guarda so o estado anterior ao gesto inteiro.
  const h = new Historico<string>();
  h.registrar("A"); // antes da primeira seta
  assert.equal(h.tamanho, 1);
  assert.equal(h.desfazer("A+20px"), "A");
  assert.equal(h.temDesfazer, false);
});

test("o limite descarta o passo mais antigo, nunca o mais recente", () => {
  const h = new Historico<string>(3);
  h.registrar("1");
  h.registrar("2");
  h.registrar("3");
  h.registrar("4");
  assert.equal(h.tamanho, 3);
  assert.equal(h.desfazer("5"), "4");
  assert.equal(h.desfazer("4"), "3");
  assert.equal(h.desfazer("3"), "2");
  assert.equal(h.temDesfazer, false);
});

test("limpar zera as duas pilhas", () => {
  const h = new Historico<string>();
  h.registrar("A");
  h.desfazer("B");
  h.limpar();
  assert.equal(h.temDesfazer, false);
  assert.equal(h.temRefazer, false);
});
