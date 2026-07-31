// Trava do escopo da VKOS-IDE.
//
// POR QUE ISTO EXISTE: a IDE abria a pasta do workspace VKOS ativo, entao ela
// mostrava cerebro/, marca/ e materiais/ de um cliente e nao mostrava app/,
// docs/ nem ferramentas/. Quem abria a bancada do dono encontrava a pasta de um
// projeto de cliente. Ver docs/decisoes/2026-07-27-a-ide-abre-o-projeto.md.
//
// O segundo teste guarda o dado do Hub. app/dados tem o registro de workspaces,
// o CRM e o token da conexao, e o chat da IDE pode rodar com "Poder total".
// Sumir da lista nao basta: se o caminho continuasse alcancavel por URL, seria
// esconder, nao proteger.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test, { after, before } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";

import { raizProjeto } from "../util/raizProjeto.js";
import { rotasIde } from "./rotas.js";

interface NoArvore {
  nome: string;
  caminho: string;
  tipo: "pasta" | "arquivo";
  filhos?: NoArvore[];
}

let app: FastifyInstance;

before(async () => {
  app = Fastify();
  await app.register(rotasIde);
  await app.ready();
});

after(async () => {
  await app.close();
});

test("a raiz do projeto e a pasta que contem o app/", () => {
  const raiz = raizProjeto();
  assert.ok(
    existsSync(join(raiz, "app")),
    `a raiz calculada (${raiz}) precisa conter o app/. Se a contagem de niveis ` +
      `mudar, a IDE abre a pasta errada em silencio.`,
  );
  assert.ok(existsSync(join(raiz, "app", "server")), "o app/ precisa ter o server/ dentro");
});

test("a IDE abre o projeto inteiro, nao a pasta do workspace", async () => {
  const resposta = await app.inject({ method: "GET", url: "/ide/arvore" });
  assert.equal(resposta.statusCode, 200);
  const corpo = resposta.json() as { base: string; itens: NoArvore[] };

  const topo = new Set(corpo.itens.map((i) => i.nome));
  // O que caracteriza o projeto. Sem app/ e docs/ a IDE voltou pro escopo velho.
  for (const esperada of ["app", "docs"]) {
    assert.ok(
      topo.has(esperada),
      `a arvore da IDE precisa mostrar ${esperada}/ na raiz. Achei: ${[...topo].join(", ")}`,
    );
  }
  // A marca do escopo antigo: cerebro/ e marca/ sao pastas de dentro de um
  // workspace VKOS, e nunca aparecem na raiz do projeto.
  for (const velha of ["cerebro", "marca", "materiais"]) {
    assert.ok(
      !topo.has(velha),
      `${velha}/ na raiz quer dizer que a IDE voltou a abrir a pasta do workspace`,
    );
  }
});

test("app/dados nao aparece na arvore nem abre por caminho digitado", async () => {
  const resposta = await app.inject({ method: "GET", url: "/ide/arvore" });
  const corpo = resposta.json() as { itens: NoArvore[] };

  const app_ = corpo.itens.find((i) => i.nome === "app");
  assert.ok(app_, "o app/ precisa estar na arvore");
  assert.ok(
    !(app_.filhos ?? []).some((f) => f.nome === "dados"),
    "app/dados nao pode aparecer na arvore da IDE",
  );

  // Some da lista E do alcance. As quatro operacoes recusam.
  const leitura = await app.inject({
    method: "GET",
    url: "/ide/arquivo?caminho=app/dados/workspaces.json",
  });
  assert.equal(leitura.statusCode, 403, "ler app/dados por caminho tem que dar 403");

  const gravacao = await app.inject({
    method: "PUT",
    url: "/ide/arquivo",
    payload: { caminho: "app/dados/workspaces.json", conteudo: "{}" },
  });
  assert.equal(gravacao.statusCode, 403, "gravar em app/dados tem que dar 403");

  const exclusao = await app.inject({
    method: "DELETE",
    url: "/ide/arquivo?caminho=app/dados/config.json",
  });
  assert.equal(exclusao.statusCode, 403, "apagar em app/dados tem que dar 403");

  // Caixa diferente nao contorna: no Windows abriria a mesma pasta.
  const caixaAlta = await app.inject({
    method: "GET",
    url: "/ide/arquivo?caminho=APP/Dados/workspaces.json",
  });
  assert.equal(caixaAlta.statusCode, 403, "a guarda tem que ignorar a caixa do caminho");
});

test("a arvore nao carrega node_modules nem .git", async () => {
  const resposta = await app.inject({ method: "GET", url: "/ide/arvore" });
  const corpo = resposta.json() as { itens: NoArvore[] };

  const achou = (nos: NoArvore[], alvo: string): boolean =>
    nos.some((n) => n.nome === alvo || (n.filhos ? achou(n.filhos, alvo) : false));

  for (const ruido of ["node_modules", ".git"]) {
    assert.ok(!achou(corpo.itens, ruido), `${ruido} nao pode entrar na arvore`);
  }
});

test("caminho pra fora da raiz continua recusado", async () => {
  for (const fuga of ["../segredo.txt", "app/../../fora.txt"]) {
    const r = await app.inject({
      method: "GET",
      url: `/ide/arquivo?caminho=${encodeURIComponent(fuga)}`,
    });
    assert.equal(r.statusCode, 400, `"${fuga}" tinha que ser recusado`);
  }
});
