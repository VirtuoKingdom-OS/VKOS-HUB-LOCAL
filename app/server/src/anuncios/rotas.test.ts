// As rotas da conversa de uma peça de anúncio.
//
// O que precisa de prova aqui, e o que o teste do vinculo.ts sozinho não pega:
// que a rota casa o nome da pasta da URL com a chave do registro, que ela passa
// pela MESMA barreira de pasta das outras rotas de peça, e que peça sem conversa
// responde 200 com nulo em vez de 404. A tela trata 404 como falha, e "esta
// campanha ainda não tem conversa" é um estado normal.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";

import { definirPastaVkos } from "../vkos/estado.js";
import {
  adicionarWorkspace,
  lerRegistro,
  marcarAtivo,
  salvarRegistro,
} from "../workspaces/estado.js";
import { lerVinculo, lerVinculos } from "./vinculo.js";
import { rotasAnuncios } from "./rotas.js";

const PASTA_PECA = "2026-07-31-anuncio-avaliacao";

let app: FastifyInstance;
let raizDados: string;
let raizVkos: string;
let raizAnterior: string | undefined;
let registroOriginal: ReturnType<typeof lerRegistro>;
let workspaceId: string;

before(async () => {
  // Tudo em pasta temporária: este teste ESCREVE em app/dados, e o Hub do dono
  // pode estar no ar enquanto ele roda.
  raizAnterior = process.env.VKOS_DADOS_TESTE;
  raizDados = mkdtempSync(join(tmpdir(), "vkos-anuncio-rotas-dados-"));
  process.env.VKOS_DADOS_TESTE = raizDados;
  registroOriginal = structuredClone(lerRegistro());

  raizVkos = mkdtempSync(join(tmpdir(), "vkos-anuncio-rotas-vkos-"));
  mkdirSync(join(raizVkos, "conteudo", PASTA_PECA), { recursive: true });
  writeFileSync(
    join(raizVkos, "conteudo", PASTA_PECA, "anuncio.json"),
    "{}",
    "utf8",
  );

  const workspace = adicionarWorkspace(raizVkos, "Teste de rotas de anúncio");
  workspaceId = workspace.id;
  marcarAtivo(workspaceId);
  definirPastaVkos(raizVkos);

  app = Fastify();
  await app.register(rotasAnuncios, { prefix: "/api" });
  await app.ready();
});

after(async () => {
  await app.close();
  salvarRegistro(registroOriginal);
  if (raizAnterior === undefined) delete process.env.VKOS_DADOS_TESTE;
  else process.env.VKOS_DADOS_TESTE = raizAnterior;
  rmSync(raizDados, { recursive: true, force: true });
  rmSync(raizVkos, { recursive: true, force: true });
});

test("peça sem conversa responde 200 com sessaoId nulo, e não 404", () => {
  return app
    .inject({ method: "GET", url: `/api/anuncios/${PASTA_PECA}/conversa` })
    .then((resposta) => {
      assert.equal(resposta.statusCode, 200);
      assert.deepEqual(resposta.json(), { sessaoId: null, atualizadoEm: null });
    });
});

test("o PUT aponta a peça pra sessão, e o GET devolve a mesma", async () => {
  const gravou = await app.inject({
    method: "PUT",
    url: `/api/anuncios/${PASTA_PECA}/conversa`,
    payload: { sessaoId: "s-viva" },
  });
  assert.equal(gravou.statusCode, 200);
  assert.equal(gravou.json().sessaoId, "s-viva");

  const leu = await app.inject({
    method: "GET",
    url: `/api/anuncios/${PASTA_PECA}/conversa`,
  });
  assert.equal(leu.json().sessaoId, "s-viva");

  // A chave do registro é o NOME da pasta, e não o caminho absoluto. Errar isso
  // faria a tela nunca reencontrar a conversa dela.
  assert.equal(lerVinculo(workspaceId, PASTA_PECA)?.sessaoId, "s-viva");
});

test("PUT sem sessaoId responde 400", async () => {
  const resposta = await app.inject({
    method: "PUT",
    url: `/api/anuncios/${PASTA_PECA}/conversa`,
    payload: { sessaoId: "   " },
  });
  assert.equal(resposta.statusCode, 400);
});

test("as duas rotas passam pela mesma barreira de pasta das outras rotas de peça", async () => {
  // Parte dos venenos morre no roteador (ele normaliza ".." antes do parâmetro)
  // e parte morre na barreira. O que importa é que NENHUM chega ao registro: por
  // isso a asserção final é sobre o que ficou gravado, e não sobre o número.
  for (const veneno of ["%2E%2E", "sub%2Fpasta", ".oculta", "%2Fetc", "  "]) {
    const leu = await app.inject({
      method: "GET",
      url: `/api/anuncios/${veneno}/conversa`,
    });
    assert.ok(
      leu.statusCode >= 400,
      `GET com "${veneno}" devia ser recusado, veio ${leu.statusCode}`,
    );

    const gravou = await app.inject({
      method: "PUT",
      url: `/api/anuncios/${veneno}/conversa`,
      payload: { sessaoId: "s-invasora" },
    });
    assert.ok(
      gravou.statusCode >= 400,
      `PUT com "${veneno}" devia ser recusado, veio ${gravou.statusCode}`,
    );
  }

  // O registro continua só com a peça de verdade, apontando pra sessão de verdade.
  assert.deepEqual(Object.keys(lerVinculos(workspaceId)), [PASTA_PECA]);
  assert.equal(lerVinculo(workspaceId, PASTA_PECA)?.sessaoId, "s-viva");
});

test("peça que não existe responde 404 nas duas rotas", async () => {
  const leu = await app.inject({
    method: "GET",
    url: "/api/anuncios/2026-07-31-anuncio-fantasma/conversa",
  });
  assert.equal(leu.statusCode, 404);

  const gravou = await app.inject({
    method: "PUT",
    url: "/api/anuncios/2026-07-31-anuncio-fantasma/conversa",
    payload: { sessaoId: "s-qualquer" },
  });
  assert.equal(gravou.statusCode, 404);
});
