import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import { test } from "node:test";

import { decifrar } from "./cofre.js";

test("motor decifra AES-256-GCM e rejeita alteracao", () => {
  const anterior = process.env.COFRE_MASTER_KEY;
  const chave = randomBytes(32);
  process.env.COFRE_MASTER_KEY = chave.toString("base64");
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", chave, iv);
    const cifrado = Buffer.concat([
      cipher.update("segredo-do-cliente", "utf8"),
      cipher.final(),
    ]);
    const valor = [
      "v1",
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      cifrado.toString("base64"),
    ].join(".");
    assert.equal(decifrar(valor), "segredo-do-cliente");
    const partes = valor.split(".");
    const tagAlterada = Buffer.from(partes[2], "base64");
    tagAlterada[0] ^= 1;
    partes[2] = tagAlterada.toString("base64");
    assert.throws(() => decifrar(partes.join(".")));
  } finally {
    if (anterior === undefined) delete process.env.COFRE_MASTER_KEY;
    else process.env.COFRE_MASTER_KEY = anterior;
  }
});
