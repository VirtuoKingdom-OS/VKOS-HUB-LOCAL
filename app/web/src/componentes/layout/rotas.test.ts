import assert from "node:assert/strict";
import test from "node:test";
import {
  destinoAposCriacao,
  hashParaTela,
  retornoSeguroDaCriacao,
  telaParaHash,
  tipoCriacaoDaTela,
} from "./rotas";

test("as quatro criações guiadas têm rota própria e reversível", () => {
  for (const tipo of ["carrossel", "post", "story", "site"]) {
    const tela = `criar:${tipo}`;
    const hash = `#/criar/${tipo}`;
    assert.equal(telaParaHash(tela), hash);
    assert.equal(hashParaTela(hash), tela);
    assert.equal(tipoCriacaoDaTela(tela), tipo);
  }
});

test("rota de criação desconhecida cai no dashboard", () => {
  assert.equal(hashParaTela("#/criar/desconhecido"), "dashboard");
  assert.equal(telaParaHash("criar:desconhecido"), "#/dashboard");
  assert.equal(tipoCriacaoDaTela("criar:desconhecido"), null);
});

test("rotas de peças continuam preservadas", () => {
  assert.equal(hashParaTela("#/site/site-novo"), "site:site-novo");
  assert.equal(telaParaHash("site:site-novo"), "#/site/site-novo");
  assert.equal(hashParaTela("#/studio/carrossel-novo"), "studio:carrossel-novo");
});

test("cancelamento nunca retorna para outra criação", () => {
  assert.equal(retornoSeguroDaCriacao("site:anterior"), "site:anterior");
  assert.equal(retornoSeguroDaCriacao("criar:site"), "dashboard");
  assert.equal(retornoSeguroDaCriacao("rota-inventada"), "dashboard");
  assert.equal(retornoSeguroDaCriacao(null), "dashboard");
});

test("conclusão troca a criação pelo editor correto", () => {
  assert.equal(destinoAposCriacao("site", "meu site"), "site:meu%20site");
  assert.equal(destinoAposCriacao("carrossel", "minha peça"), "studio:minha%20pe%C3%A7a");
  assert.equal(destinoAposCriacao("post", "post"), "studio:post");
  assert.equal(destinoAposCriacao("story", "story"), "studio:story");
});
