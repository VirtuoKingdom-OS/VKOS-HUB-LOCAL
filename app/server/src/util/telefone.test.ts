import assert from "node:assert/strict";
import test from "node:test";

import { chaveTelefone, normalizarTelefone } from "./telefone.js";

// O bug que motivou este modulo: a regra antiga so removia nao-digitos, entao
// as tres formas abaixo viravam tres chaves diferentes e o mesmo cliente
// entrava ate tres vezes no CRM.
test("as formas do mesmo celular viram uma chave so", () => {
  const esperado = "+5531999998888";
  assert.equal(normalizarTelefone("+55 31 99999-8888"), esperado);
  assert.equal(normalizarTelefone("(31) 99999-8888"), esperado);
  assert.equal(normalizarTelefone("5531999998888"), esperado);
  assert.equal(normalizarTelefone("+55 (31) 9 9999-8888"), esperado);
});

// Depois da migracao da Anatel nao existe mais celular com 8 digitos. O numero
// antigo e o novo sao a MESMA linha, entao precisam dar a mesma chave, senao o
// cliente cadastrado antes da migracao vira uma segunda ficha.
test("celular de 8 digitos ganha o nono e casa com o numero atual", () => {
  assert.equal(normalizarTelefone("31 9999-8888"), "+5531999998888");
  assert.equal(normalizarTelefone("+55 31 8888-7777"), "+5531988887777");
});

test("fixo de 8 digitos nao ganha nono digito", () => {
  assert.equal(normalizarTelefone("(31) 3333-4444"), "+553133334444");
  assert.equal(normalizarTelefone("31 2222 1111"), "+553122221111");
  assert.equal(normalizarTelefone("+55 11 5555-1234"), "+551155551234");
});

test("prefixo de operadora nao entra no numero", () => {
  assert.equal(normalizarTelefone("031 99999-8888"), "+5531999998888");
});

// 0800 nao tem DDD, entao nao vira E.164 confiavel. Devolver null e melhor que
// inventar uma chave: quem chamou guarda o texto digitado e nao deduplica.
test("0800 e numero de servico devolvem null", () => {
  assert.equal(normalizarTelefone("0800 123 4567"), null);
  assert.equal(normalizarTelefone("0800-701-0000"), null);
  assert.equal(normalizarTelefone("4004 1234"), null);
});

test("numero curto demais devolve null", () => {
  assert.equal(normalizarTelefone("1234"), null);
  assert.equal(normalizarTelefone("99999-8888"), null);
  assert.equal(normalizarTelefone("190"), null);
});

test("DDD que nao existe devolve null", () => {
  assert.equal(normalizarTelefone("(10) 99999-8888"), null);
  assert.equal(normalizarTelefone("(30) 3333-4444"), null);
});

// DDI de outro pais ja chega em E.164: so confere o tamanho e devolve. O Hub
// nao tenta interpretar plano de numeracao estrangeiro.
test("DDI de outro pais e preservado como veio", () => {
  assert.equal(normalizarTelefone("+1 415 555 2671"), "+14155552671");
  assert.equal(normalizarTelefone("+351 912 345 678"), "+351912345678");
  assert.equal(normalizarTelefone("+44 20 7123 4567"), "+442071234567");
});

test("DDI 55 sem DDD nao vira numero brasileiro torto", () => {
  assert.equal(normalizarTelefone("+55 9999-8888"), null);
});

test("entrada que nao e texto util devolve null", () => {
  assert.equal(normalizarTelefone(undefined), null);
  assert.equal(normalizarTelefone(null), null);
  assert.equal(normalizarTelefone(5531999998888), null);
  assert.equal(normalizarTelefone(""), null);
  assert.equal(normalizarTelefone("   "), null);
  assert.equal(normalizarTelefone("sem numero aqui"), null);
});

// Normalizar duas vezes nao pode mudar o resultado: a saida e a entrada canonica.
test("normalizar o resultado de novo devolve o mesmo valor", () => {
  for (const entrada of ["(31) 99999-8888", "31 3333-4444", "+1 415 555 2671"]) {
    const primeira = normalizarTelefone(entrada);
    assert.ok(primeira);
    assert.equal(normalizarTelefone(primeira), primeira);
  }
});

test("chaveTelefone devolve texto vazio no lugar de null", () => {
  assert.equal(chaveTelefone("(31) 99999-8888"), "+5531999998888");
  assert.equal(chaveTelefone("0800 123 4567"), "");
  assert.equal(chaveTelefone(undefined), "");
});
