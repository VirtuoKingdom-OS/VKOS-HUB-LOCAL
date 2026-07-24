import assert from "node:assert/strict";
import test from "node:test";

import { deveEntregarSpa } from "./spa.js";

test("entrega o shell nas rotas limpas da aplicacao", () => {
  for (const caminho of [
    "/dashboard",
    "/cockpit",
    "/studio/peca-1",
    "/site/site-1",
    "/entrar?token=abc",
  ]) {
    assert.equal(deveEntregarSpa("GET", caminho, true), true, caminho);
  }
});

test("nao mascara APIs, arquivos e metodos de escrita", () => {
  for (const caminho of [
    "/api/saude",
    "/assets/inexistente.js",
    "/pecas/arquivo.png",
    "/favicon.ico",
    "/ws",
  ]) {
    assert.equal(deveEntregarSpa("GET", caminho, true), false, caminho);
  }
  assert.equal(deveEntregarSpa("POST", "/dashboard", true), false);
  assert.equal(deveEntregarSpa("GET", "/dashboard", false), false);
});
