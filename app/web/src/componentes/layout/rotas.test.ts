import assert from "node:assert/strict";
import test from "node:test";
import {
  TELAS_CORE,
  TELAS_WORKSPACE,
  caminhoParaTela,
  destinoAposCriacao,
  nivelDaTela,
  retornoSeguroDaCriacao,
  telaParaCaminho,
  tipoCriacaoDaTela,
} from "./rotas";

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

test("rotas de peças continuam preservadas", () => {
  assert.equal(caminhoParaTela("/site/site-novo"), "site:site-novo");
  assert.equal(telaParaCaminho("site:site-novo"), "/site/site-novo");
  assert.equal(caminhoParaTela("/studio/carrossel-novo"), "studio:carrossel-novo");
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
    assert.equal(caminhoParaTela(`/${tela}`), tela);
    assert.equal(telaParaCaminho(tela), `/${tela}`);
  }
});

test("cada tela fixa mora em um nível só, e a divisão é a do HUB CORE", () => {
  // O CORE é o nível do dono: nada aqui muda quando se troca de workspace. A
  // ordem é a dos três grupos da barra: Core, Gestão e Sistema.
  assert.deepEqual(
    [...TELAS_CORE],
    ["dashboard", "clientes", "workspaces", "crm", "financas", "conexoes", "mapa"],
  );
  // O workspace é o nível do projeto aberto.
  assert.deepEqual([...TELAS_WORKSPACE], ["inicio", "cockpit", "galerias", "fontes"]);
  for (const tela of TELAS_CORE) assert.equal(nivelDaTela(tela), "core");
  for (const tela of TELAS_WORKSPACE) assert.equal(nivelDaTela(tela), "workspace");
});

test("abrir o Hub cai no Dashboard do CORE", () => {
  // Critério de saída da fase. Caminho vazio, desconhecido ou quebrado vai pro
  // nível de cima, nunca pra dentro de um projeto.
  assert.equal(caminhoParaTela(""), "dashboard");
  assert.equal(caminhoParaTela("/"), "dashboard");
  assert.equal(caminhoParaTela("/rota-que-nao-existe"), "dashboard");
});

test("nenhum endereço do Hub sai com hash", () => {
  // O defeito relatado: as rotas apareciam como <endereço>/#/<rota>. Nenhum
  // caminho gerado pode voltar a carregar "#", em nenhuma das famílias.
  const telas = [
    ...TELAS_CORE,
    ...TELAS_WORKSPACE,
    "criar:carrossel",
    "studio:minha-peca",
    "site:meu-site",
    "fluxo:site",
    "fonte:documento",
    "rota-invalida",
  ];
  for (const tela of telas) {
    const caminho = telaParaCaminho(tela);
    assert.ok(!caminho.includes("#"), `${tela} gerou um caminho com hash: ${caminho}`);
    assert.ok(caminho.startsWith("/"), `${tela} gerou um caminho relativo: ${caminho}`);
  }
});

test("favorito antigo com hash ainda abre a tela certa", () => {
  // Quem salvou o endereço velho não pode cair no Dashboard por engano. O
  // formato com hash continua sendo lido, só não é mais gerado.
  assert.equal(caminhoParaTela("/#/crm"), "crm");
  assert.equal(caminhoParaTela("#/crm"), "crm");
  assert.equal(caminhoParaTela("#/studio/peca-antiga"), "studio:peca-antiga");
  assert.equal(caminhoParaTela("#/criar/post"), "criar:post");
  assert.equal(caminhoParaTela("#/"), "dashboard");
});

test("query e barra sobrando não confundem a rota", () => {
  assert.equal(caminhoParaTela("/crm?aba=funil"), "crm");
  assert.equal(caminhoParaTela("/crm/"), "crm");
  assert.equal(caminhoParaTela("//crm"), "crm");
});

test("conclusão troca a criação pelo editor correto", () => {
  assert.equal(destinoAposCriacao("site", "meu site"), "site:meu%20site");
  assert.equal(destinoAposCriacao("carrossel", "minha peça"), "studio:minha%20pe%C3%A7a");
  assert.equal(destinoAposCriacao("post", "post"), "studio:post");
  assert.equal(destinoAposCriacao("story", "story"), "studio:story");
});
