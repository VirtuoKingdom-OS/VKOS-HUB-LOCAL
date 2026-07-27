// A rota de exclusao de cliente precisa absorver o gasto dele antes de apagar
// a pasta. O modulo de custos ja prova que absorverCustosDeWorkspace funciona,
// mas nada provava que a ROTA chama. Conferido em 2026-07-27: comentando a
// chamada em rotas.ts, os doze testes de custos.test.ts continuavam passando.
//
// Funcao testada que ninguem chama e o mesmo que funcao quebrada.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";

import { lerHistoricoRemovidos, registrarResult, type EntradaResult } from "../sessoes/custos.js";
import {
  adicionarWorkspace,
  lerRegistro,
  marcarAtivo,
  salvarRegistro,
} from "./estado.js";
import { rotasWorkspaces } from "./rotas.js";

let app: FastifyInstance;
let registroOriginal: ReturnType<typeof lerRegistro>;
let raizTeste: string;

const RESULT: EntradaResult = {
  custoUsd: 7.25,
  custoConhecido: true,
  tokensEntrada: 1200,
  tokensSaida: 480,
  tokensEntradaNova: 800,
  tokensCacheEscrita: 300,
  tokensCacheLeitura: 100,
  contarSessao: true,
  provedor: "claude",
  estimado: true,
  sessaoId: "s-teste-rota",
  modelo: "claude-haiku-4-5",
  ehResume: false,
  ehErro: false,
};

before(async () => {
  registroOriginal = structuredClone(lerRegistro());
  raizTeste = mkdtempSync(join(tmpdir(), "vkos-rota-custos-"));
  process.env.VKOS_DADOS_TESTE = raizTeste;
  app = Fastify();
  await app.register(rotasWorkspaces, { prefix: "/api" });
  await app.ready();
});

after(async () => {
  await app.close();
  delete process.env.VKOS_DADOS_TESTE;
  rmSync(raizTeste, { recursive: true, force: true });
  salvarRegistro(registroOriginal);
});

test("excluir um cliente pela rota preserva o gasto dele no total do Hub", async () => {
  // Dois clientes: um fica ativo, porque a rota recusa remover o ativo.
  const pastaA = mkdtempSync(join(tmpdir(), "vkos-cliente-a-"));
  const pastaB = mkdtempSync(join(tmpdir(), "vkos-cliente-b-"));
  try {
    const ativo = adicionarWorkspace(pastaA, "Fica aberto");
    const alvo = adicionarWorkspace(pastaB, "Vai ser removido");
    marcarAtivo(ativo.id);

    registrarResult(alvo.id, RESULT);

    const antes = lerHistoricoRemovidos().totalUsd;

    const resposta = await app.inject({
      method: "DELETE",
      url: `/api/workspaces/${alvo.id}`,
    });
    assert.equal(resposta.statusCode, 200, "a exclusao precisa ter dado certo");

    // O cliente saiu do registro.
    const restantes = lerRegistro().workspaces.map((w) => w.id);
    assert.ok(!restantes.includes(alvo.id), "o cliente removido nao pode ficar no registro");

    // E o dinheiro continua contado. Este e o ponto do teste.
    const historico = lerHistoricoRemovidos();
    assert.equal(
      historico.totalUsd - antes,
      7.25,
      "o gasto do cliente removido precisa sobreviver a exclusao",
    );
    assert.equal(historico.tokensSaida, 480);
    assert.equal(historico.totalSessoes, 1);
    assert.ok(historico.workspacesRemovidos >= 1);
  } finally {
    rmSync(pastaA, { recursive: true, force: true });
    rmSync(pastaB, { recursive: true, force: true });
  }
});

test("a rota recusa remover o cliente aberto, e nada e absorvido", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-cliente-ativo-"));
  try {
    const ativo = adicionarWorkspace(pasta, "Aberto agora");
    marcarAtivo(ativo.id);
    registrarResult(ativo.id, RESULT);

    const antes = lerHistoricoRemovidos().totalUsd;
    const resposta = await app.inject({
      method: "DELETE",
      url: `/api/workspaces/${ativo.id}`,
    });

    assert.equal(resposta.statusCode, 400);
    // Recusou, entao o gasto continua no cliente e nao foi pro historico.
    assert.equal(lerHistoricoRemovidos().totalUsd, antes);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
