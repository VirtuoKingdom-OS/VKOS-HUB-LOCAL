import assert from "node:assert/strict";
import test from "node:test";
import {
  TELAS_CORE,
  TELAS_WORKSPACE,
  destinoAposCriacao,
  hashParaTela,
  nivelDaTela,
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

test("cancelamento nunca retorna para outra criação, e cai no workspace", () => {
  // Quem estava criando peça estava dentro de um projeto. Cair no CORE ali
  // tiraria a pessoa do nível em que ela estava trabalhando.
  assert.equal(retornoSeguroDaCriacao("site:anterior"), "site:anterior");
  assert.equal(retornoSeguroDaCriacao("criar:site"), "inicio");
  assert.equal(retornoSeguroDaCriacao("rota-inventada"), "inicio");
  assert.equal(retornoSeguroDaCriacao(null), "inicio");
});

test("as duas camadas de navegação têm rota própria e reversível", () => {
  for (const tela of [...TELAS_CORE, ...TELAS_WORKSPACE]) {
    assert.equal(hashParaTela(`#/${tela}`), tela);
    assert.equal(telaParaHash(tela), `#/${tela}`);
  }
});

test("cada tela fixa mora em um nível só, e a divisão é a do HUB CORE", () => {
  // O CORE é o nível do dono: nada aqui muda quando se troca de workspace.
  assert.deepEqual([...TELAS_CORE], ["dashboard", "workspaces", "conexoes", "crm", "mapa"]);
  // O workspace é o nível do projeto aberto.
  assert.deepEqual([...TELAS_WORKSPACE], ["inicio", "cockpit", "galerias", "fontes"]);
  for (const tela of TELAS_CORE) assert.equal(nivelDaTela(tela), "core");
  for (const tela of TELAS_WORKSPACE) assert.equal(nivelDaTela(tela), "workspace");
});

test("abrir o Hub cai no Dashboard do CORE", () => {
  // Critério de saída da fase. Hash vazio, desconhecido ou quebrado vai pro
  // nível de cima, nunca pra dentro de um projeto.
  assert.equal(hashParaTela(""), "dashboard");
  assert.equal(hashParaTela("#/"), "dashboard");
  assert.equal(hashParaTela("#/rota-que-nao-existe"), "dashboard");
});

test("conclusão troca a criação pelo editor correto", () => {
  assert.equal(destinoAposCriacao("site", "meu site"), "site:meu%20site");
  assert.equal(destinoAposCriacao("carrossel", "minha peça"), "studio:minha%20pe%C3%A7a");
  assert.equal(destinoAposCriacao("post", "post"), "studio:post");
  assert.equal(destinoAposCriacao("story", "story"), "studio:story");
});
