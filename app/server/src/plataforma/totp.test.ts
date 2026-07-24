import assert from "node:assert/strict";
import { test } from "node:test";
import { codigoTotp, gerarSegredoTotp, segundoFatorValido, validarTotp } from "./totp.js";

test("TOTP aceita a janela atual e uma janela vizinha", () => {
  const segredo = gerarSegredoTotp();
  const agora = 1_800_000_000_000;
  assert.equal(validarTotp(segredo, codigoTotp(segredo, agora), agora), true);
  assert.equal(validarTotp(segredo, codigoTotp(segredo, agora - 30_000), agora), true);
  assert.equal(validarTotp(segredo, "000000", agora), false);
});

test("operador sem TOTP entra sem codigo e operador protegido exige codigo valido", () => {
  const segredo = gerarSegredoTotp();
  const agora = 1_800_000_000_000;
  assert.equal(segundoFatorValido("operador", null, undefined, agora), true);
  assert.equal(segundoFatorValido("operador", segredo, undefined, agora), false);
  assert.equal(
    segundoFatorValido("operador", segredo, codigoTotp(segredo, agora), agora),
    true,
  );
  assert.equal(segundoFatorValido("cliente", segredo, undefined, agora), true);
});
