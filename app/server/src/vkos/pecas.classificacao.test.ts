// Travas da classificação de peça, na parte que decide se o Studio abre.
//
// O DEFEITO QUE ESTES TESTES SEGURAM. Até 2026-08-04 o PNG de instagram/ vinha
// antes do carrossel.html: peça com PNG virava legado, legado não carrega
// fonteHtml, e sem fonteHtml o Studio recusa abrir. Como a skill /carrossel
// renderiza PNG no Passo 5, toda peça gerada sem a instrução de pular esse
// passo nascia sem edição.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { classificarPeca } from "./pecas.js";

// Um carrossel.html com N slides, no formato que contarPaginasCarrossel lê.
function pastaComCarrossel(paginas: number): string {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-peca-"));
  const slides = Array.from({ length: paginas }, (_, i) => `<div class="slide">${i}</div>`).join("");
  writeFileSync(join(pasta, "carrossel.html"), `<html><body>${slides}</body></html>`, "utf8");
  return pasta;
}

test("carrossel.html vence o PNG de instagram: a peca abre no Studio", () => {
  // O caso exato das duas peças que o Assistente criou em 2026-08-04.
  const pasta = pastaComCarrossel(5);
  mkdirSync(join(pasta, "instagram"));
  const resultado = classificarPeca(
    ["carrossel.html", "instagram/slide-01.png", "instagram/slide-02.png"],
    pasta,
  );
  assert.equal(resultado.tipo, "carrossel");
  assert.equal(resultado.fonteHtml, true, "sem fonteHtml o Studio recusa abrir");
  assert.equal(resultado.paginas, 5);
});

test("PNG sem carrossel.html continua sendo legado, com preview de imagem", () => {
  const resultado = classificarPeca(["instagram/slide-01.png", "instagram/slide-02.png"]);
  assert.equal(resultado.tipo, "carrossel");
  assert.equal(resultado.fonteHtml, undefined);
  assert.deepEqual(resultado.internosPreview, ["instagram/slide-01.png", "instagram/slide-02.png"]);
});

test("carrossel.html ilegivel nao rouba a peca do legado", () => {
  // HTML sem nenhum slide conta zero páginas. Nesse caso o PNG é a única coisa
  // que existe de verdade, e tirar ele deixaria a peça sem preview nenhum.
  const pasta = mkdtempSync(join(tmpdir(), "vkos-peca-"));
  writeFileSync(join(pasta, "carrossel.html"), "<html><body>nada</body></html>", "utf8");
  const resultado = classificarPeca(["carrossel.html", "instagram/slide-01.png"], pasta);
  assert.equal(resultado.tipo, "carrossel");
  assert.equal(resultado.fonteHtml, undefined);
  assert.deepEqual(resultado.internosPreview, ["instagram/slide-01.png"]);
});

test("stories e post continuam vencendo o carrossel.html da mesma pasta", () => {
  // Eles também têm carrossel.html dentro, e passar o HTML na frente
  // transformaria um story em carrossel na tela.
  const pasta = pastaComCarrossel(3);
  const story = classificarPeca(["carrossel.html", "instagram-stories/slide-01.png"], pasta);
  assert.equal(story.tipo, "stories");
  const post = classificarPeca(["carrossel.html", "post/slide-01.png"], pasta);
  assert.equal(post.tipo, "post");
});

test("anuncio.json continua vencendo qualquer html", () => {
  const pasta = pastaComCarrossel(3);
  const resultado = classificarPeca(["anuncio.json", "carrossel.html"], pasta);
  assert.equal(resultado.tipo, "anuncio");
});
