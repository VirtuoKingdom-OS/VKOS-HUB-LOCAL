import assert from "node:assert/strict";
import { test } from "node:test";

import { primeiraTelaDisponivel, telaPermitida } from "./permissoes";

test("hub monta rotas somente com as features ativas", () => {
  const features = new Set(["crm"]);
  assert.equal(telaPermitida("crm", features, false), true);
  assert.equal(telaPermitida("cockpit", features, false), false);
  assert.equal(primeiraTelaDisponivel(features), "crm");
});

test("telas internas nunca existem no hub mesmo se a flag antiga estiver ativa", () => {
  const antigas = new Set(["admin", "mapa", "conexoes", "automacoes"]);
  for (const tela of antigas) assert.equal(telaPermitida(tela, antigas, false), false, tela);
});

test("operador do CORE preserva acesso ao painel inteiro", () => {
  assert.equal(telaPermitida("admin", new Set(), true), true);
  assert.equal(telaPermitida("mapa", new Set(), true), true);
});

test("fontes fazem parte do cockpit e nao dependem de flag legada", () => {
  assert.equal(telaPermitida("fontes", new Set(["cockpit"]), false), true);
  assert.equal(telaPermitida("fonte:texto", new Set(["cockpit"]), false), true);
  assert.equal(telaPermitida("fontes", new Set(["fontes"]), false), false);
});

test("Arquivos abre com criador-visual ou cockpit; a sub-aba de fontes exige cockpit", () => {
  // So criador-visual: a tela abre, a sub-aba de fontes nao.
  const soCriador = new Set(["cockpit-nao", "criador-visual"]);
  assert.equal(telaPermitida("arquivos", soCriador, false), true);
  assert.equal(telaPermitida("arquivos:fontes", soCriador, false), false);
  // So cockpit: as duas abrem.
  const soCockpit = new Set(["cockpit"]);
  assert.equal(telaPermitida("arquivos", soCockpit, false), true);
  assert.equal(telaPermitida("arquivos:fontes", soCockpit, false), true);
  // Nenhuma das duas: nada abre.
  const nenhuma = new Set(["crm"]);
  assert.equal(telaPermitida("arquivos", nenhuma, false), false);
  assert.equal(telaPermitida("arquivos:fontes", nenhuma, false), false);
});

test("a tela Cerebro pertence ao cockpit", () => {
  assert.equal(telaPermitida("cerebro", new Set(["cockpit"]), false), true);
  assert.equal(telaPermitida("cerebro", new Set(["crm"]), false), false);
});

test("Meta so aparece para cliente com a feature ativa", () => {
  assert.equal(telaPermitida("meta", new Set(["meta"]), false), true);
  assert.equal(telaPermitida("meta", new Set(["crm"]), false), false);
  assert.equal(primeiraTelaDisponivel(new Set(["meta"])), "meta");
});
