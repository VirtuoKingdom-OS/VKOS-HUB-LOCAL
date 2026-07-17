import assert from "node:assert/strict";
import test from "node:test";

import { hostLocalDoHub, invalidarCacheAuditoria } from "./auditoria.js";

// M3: deploy e laco resolvem o host no server, pela mesma funcao. Segue a porta
// real (VKOS_PORT no QA, 4600 no produto), entao os dois conferem a MESMA URL.
test("M3: hostLocalDoHub segue a porta real e e o host unico dos dois caminhos", () => {
  const salvo = process.env.VKOS_PORT;
  try {
    delete process.env.VKOS_PORT;
    assert.equal(hostLocalDoHub(), "127.0.0.1:4600");
    process.env.VKOS_PORT = "4700";
    assert.equal(hostLocalDoHub(), "127.0.0.1:4700");
    process.env.VKOS_PORT = "  ";
    assert.equal(hostLocalDoHub(), "127.0.0.1:4600");
  } finally {
    if (salvo === undefined) delete process.env.VKOS_PORT;
    else process.env.VKOS_PORT = salvo;
  }
});

// M3: a invalidacao e granular (workspaceId, pasta), o formato que o laco chama.
// Sem entrada no cache tambem nao pode quebrar.
test("M3: invalidarCacheAuditoria e granular e nunca lanca", () => {
  assert.doesNotThrow(() => invalidarCacheAuditoria("w-inexistente", "peca-inexistente"));
});
