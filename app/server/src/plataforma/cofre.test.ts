import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { cifrar, decifrar, mascarar } from "./cofre.js";

test("cofre usa valor autenticado e nunca devolve a credencial na mascara", () => {
  const anterior = process.env.COFRE_MASTER_KEY;
  process.env.COFRE_MASTER_KEY = randomBytes(32).toString("base64");
  try {
    const segredo = "credencial-super-secreta-1234";
    const cifrado = cifrar(segredo);
    assert.notEqual(cifrado.includes(segredo), true);
    assert.equal(decifrar(cifrado), segredo);
    assert.equal(mascarar(segredo), "****1234");
    assert.throws(() => decifrar(`${cifrado.slice(0, -1)}A`));
  } finally {
    if (anterior === undefined) delete process.env.COFRE_MASTER_KEY;
    else process.env.COFRE_MASTER_KEY = anterior;
  }
});
