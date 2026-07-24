import assert from "node:assert/strict";
import { test } from "node:test";

import { lerModo, lerProducao, permiteIaLocal } from "./modo.js";

test("core e o modo seguro para compatibilidade do 2.x", () => {
  assert.equal(lerModo(undefined), "core");
  assert.equal(lerModo("CORE"), "core");
  assert.equal(permiteIaLocal("core"), true);
});

test("hub nunca permite IA local", () => {
  assert.equal(lerModo("hub"), "hub");
  assert.equal(permiteIaLocal("hub"), false);
});

test("modo desconhecido falha cedo", () => {
  assert.throws(() => lerModo("cliente"), /MODO invalido/);
});

test("core local so exige login quando producao ou override esta ligado", () => {
  assert.equal(lerProducao(undefined, undefined), false);
  assert.equal(lerProducao("1", undefined), true);
  assert.equal(lerProducao(undefined, "1"), true);
});
