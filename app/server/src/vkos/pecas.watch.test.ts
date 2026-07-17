import assert from "node:assert/strict";
import test from "node:test";

import { eventoDeConteudoRelevante } from "./pecas.js";

// M5: o watcher de conteudo ignora eventos de .astro-build (ensaio e publicacao
// Astro), pra nao disparar refresh nem o falso "o site mudou por fora".
test("M5: watcher ignora .astro-build e mantem o resto", () => {
  assert.equal(eventoDeConteudoRelevante("meu-site/index.html"), true);
  assert.equal(eventoDeConteudoRelevante("meu-site/styles.css"), true);
  assert.equal(eventoDeConteudoRelevante("meu-site/.astro-build/dist/index.html"), false);
  assert.equal(eventoDeConteudoRelevante(".astro-build/node_modules/astro/x.js"), false);
  // Windows entrega o nome como string; alguns SOs entregam Buffer.
  assert.equal(eventoDeConteudoRelevante(Buffer.from("peca/.astro-build/dist/a.html")), false);
  assert.equal(eventoDeConteudoRelevante(Buffer.from("peca/app.js")), true);
  // Nome nulo (alguns SOs nao entregam) conta como relevante pra nao perder evento real.
  assert.equal(eventoDeConteudoRelevante(null), true);
});
