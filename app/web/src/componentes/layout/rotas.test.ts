import assert from "node:assert/strict";
import test from "node:test";
import {
  basePrefixoWorkspace,
  caminhoDoHashLegado,
  caminhoParaTela,
  comBase,
  destinoAposCriacao,
  idDoCaminhoWorkspace,
  retornoSeguroDaCriacao,
  semBase,
  telaParaCaminho,
  tipoCriacaoDaTela,
} from "./rotas";

test("o prefixo de workspace do operador faz round-trip com a gramática de telas", () => {
  const id = "abc-123";
  const base = basePrefixoWorkspace(id);
  assert.equal(base, "/w/abc-123");
  assert.equal(idDoCaminhoWorkspace("/w/abc-123/crm"), id);
  assert.equal(idDoCaminhoWorkspace("/w/abc-123"), id);
  assert.equal(idDoCaminhoWorkspace("/clientes"), null);
  // dashboard vira a raiz do workspace e volta a dashboard.
  assert.equal(comBase(base, telaParaCaminho("dashboard")), base);
  assert.equal(caminhoParaTela(semBase(base, base)), "dashboard");
  // uma tela fixa concatena e volta identica.
  for (const tela of ["crm", "cockpit", "calendario", "meta"]) {
    const url = comBase(base, telaParaCaminho(tela));
    assert.equal(url, `${base}/${tela}`);
    assert.equal(caminhoParaTela(semBase(base, url)), tela);
  }
});

test("sem base, os caminhos passam intactos (experiência do cliente)", () => {
  assert.equal(comBase("", "/crm"), "/crm");
  assert.equal(semBase("", "/crm"), "/crm");
});

test("as quatro criações guiadas têm rota própria e reversível", () => {
  for (const tipo of ["carrossel", "post", "story", "site"]) {
    const tela = `criar:${tipo}`;
    const caminho = `/criar/${tipo}`;
    assert.equal(telaParaCaminho(tela), caminho);
    assert.equal(caminhoParaTela(caminho), tela);
    assert.equal(tipoCriacaoDaTela(tela), tipo);
  }
});

test("rota de criação desconhecida cai no dashboard", () => {
  assert.equal(caminhoParaTela("/criar/desconhecido"), "dashboard");
  assert.equal(telaParaCaminho("criar:desconhecido"), "/dashboard");
  assert.equal(tipoCriacaoDaTela("criar:desconhecido"), null);
});

test("a tela Arquivos tem as duas sub-abas e absorve os caminhos antigos", () => {
  // Ids novos com caminho proprio, reversiveis.
  assert.equal(telaParaCaminho("arquivos"), "/arquivos");
  assert.equal(caminhoParaTela("/arquivos"), "arquivos");
  assert.equal(telaParaCaminho("arquivos:fontes"), "/arquivos/fontes");
  assert.equal(caminhoParaTela("/arquivos/fontes"), "arquivos:fontes");
  // Link salvo e navegacao antiga caem na tela nova.
  assert.equal(caminhoParaTela("/galerias"), "arquivos");
  assert.equal(caminhoParaTela("/fontes"), "arquivos:fontes");
  assert.equal(telaParaCaminho("galerias"), "/arquivos");
  assert.equal(telaParaCaminho("fontes"), "/arquivos/fontes");
});

test("a tela Cerebro faz round-trip como tela fixa", () => {
  assert.equal(telaParaCaminho("cerebro"), "/cerebro");
  assert.equal(caminhoParaTela("/cerebro"), "cerebro");
});

test("rotas de peças continuam preservadas", () => {
  assert.equal(caminhoParaTela("/site/site-novo"), "site:site-novo");
  assert.equal(telaParaCaminho("site:site-novo"), "/site/site-novo");
  assert.equal(caminhoParaTela("/studio/carrossel-novo"), "studio:carrossel-novo");
});

test("Administração faz round-trip e rota desconhecida mantém o fallback", () => {
  assert.equal(telaParaCaminho("admin"), "/admin");
  assert.equal(caminhoParaTela("/admin"), "admin");
  assert.equal(caminhoParaTela("/rota-inexistente"), "dashboard");
});

test("hash legado vira caminho limpo e preserva a query string", () => {
  assert.equal(
    caminhoDoHashLegado("#/convite?token=token-antigo"),
    "/convite?token=token-antigo",
  );
  assert.equal(caminhoDoHashLegado(""), null);
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
