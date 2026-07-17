import assert from "node:assert/strict";
import test from "node:test";

import { tipoConteudo } from "./tipoConteudo.js";

test("serve os recursos de site com MIME aceito pelo navegador", () => {
  assert.equal(tipoConteudo("styles.css"), "text/css; charset=utf-8");
  assert.equal(tipoConteudo("script.js"), "text/javascript; charset=utf-8");
  assert.equal(tipoConteudo("app.mjs"), "text/javascript; charset=utf-8");
  assert.equal(tipoConteudo("fonte.woff2"), "font/woff2");
  assert.equal(tipoConteudo("site.webmanifest"), "application/manifest+json; charset=utf-8");
  assert.equal(tipoConteudo("icone.svg"), "image/svg+xml; charset=utf-8");
});

test("mantem fallback binario para extensao desconhecida", () => {
  assert.equal(tipoConteudo("arquivo.xyz"), "application/octet-stream");
});

