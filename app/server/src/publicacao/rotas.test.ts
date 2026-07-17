import assert from "node:assert/strict";
import test from "node:test";

import { nomePecaPublicacaoValido } from "./rotas.js";

test("aceita somente um segmento de peça", () => {
  assert.equal(nomePecaPublicacaoValido("2026-07-15-site-ferramentas"), true);
  assert.equal(nomePecaPublicacaoValido("site com espaço"), true);
});

test("bloqueia traversal e segmentos ocultos na publicação", () => {
  for (const nome of ["", "..", "../site", "site/arquivo", "site\\arquivo", ".oculto", "site\0x"]) {
    assert.equal(nomePecaPublicacaoValido(nome), false, nome);
  }
});
