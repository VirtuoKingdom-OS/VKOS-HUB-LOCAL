import assert from "node:assert/strict";
import { test } from "node:test";
import { isAbsolute, relative } from "node:path";

import { pastaClientes, pastaDoWorkspace, resolverSemente } from "./provisionamento.js";

test("pasta de cliente nasce sempre dentro da base controlada", () => {
  const id = "8ce94a50-42b9-4ca2-b9b4-fc0bdf18fb21";
  const pasta = pastaDoWorkspace(id);
  assert.equal(isAbsolute(pasta), true);
  assert.equal(relative(pastaClientes, pasta), id);
});

test("path traversal nunca vira pasta de workspace", () => {
  for (const ataque of ["../segredo", "..\\segredo", "/etc/passwd", "8ce94a50-42b9-4ca2-b9b4-fc0bdf18fb21/../outro"]) {
    assert.throws(() => pastaDoWorkspace(ataque));
  }
});

test("somente sementes conhecidas podem ser materializadas", () => {
  assert.throws(() => resolverSemente("../../ojessegomes"), /Semente desconhecida/);
});
