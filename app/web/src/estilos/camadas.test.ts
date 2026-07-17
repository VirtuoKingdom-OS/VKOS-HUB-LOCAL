import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("./visual-hub.css", import.meta.url), "utf8");

test("galeria de fontes fica acima dos fluxos que podem abri-la", () => {
  const regra = css.match(/\.galeria-fontes-camada\s*\{[^}]+\}/)?.[0];

  assert.ok(regra, "a galeria precisa de uma regra de camada própria");
  assert.match(regra, /z-index:\s*var\(--z-modal\)/);
  assert.doesNotMatch(css, /\.overlay-cerebro,\s*\.galeria-fontes-camada\s*\{/);
});
