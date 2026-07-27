// A rota do Dashboard do CORE. O que se prova aqui e o que o dono precisa
// conseguir confiar: o total inclui cliente ja removido, e ele se declara piso
// quando falta informacao.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";

import {
  arquivoHistoricoRemovidos,
  registrarResult,
  registrarTurnoSemMedicao,
  type EntradaResult,
} from "../sessoes/custos.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  adicionarWorkspace,
  apagarPastaDadosWorkspace,
  lerRegistro,
  marcarAtivo,
  salvarRegistro,
} from "../workspaces/estado.js";
import type { ResumoCore } from "./modelo.js";
import { rotasCore } from "./rotas.js";

let app: FastifyInstance;
let registroOriginal: ReturnType<typeof lerRegistro>;
let raizTeste: string;
const pastasCriadas: string[] = [];
const workspacesCriados: string[] = [];

const RESULT: EntradaResult = {
  custoUsd: 2.5,
  custoConhecido: true,
  tokensEntrada: 1000,
  tokensSaida: 400,
  tokensEntradaNova: 700,
  tokensCacheEscrita: 200,
  tokensCacheLeitura: 100,
  contarSessao: true,
  provedor: "claude",
  estimado: true,
  sessaoId: "s-core",
  modelo: "claude-haiku-4-5",
  ehResume: false,
  ehErro: false,
};

function cliente(nome: string): string {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-core-cliente-"));
  pastasCriadas.push(pasta);
  const workspace = adicionarWorkspace(pasta, nome);
  workspacesCriados.push(workspace.id);
  return workspace.id;
}

async function resumo(): Promise<ResumoCore> {
  const resposta = await app.inject({ method: "GET", url: "/api/core/resumo" });
  assert.equal(resposta.statusCode, 200);
  return resposta.json() as ResumoCore;
}

before(async () => {
  registroOriginal = structuredClone(lerRegistro());
  raizTeste = mkdtempSync(join(tmpdir(), "vkos-core-"));
  process.env.VKOS_DADOS_TESTE = raizTeste;
  // O registro do teste comeca limpo: o resumo fala de todos os clientes, entao
  // os reais da maquina bagunçariam a contagem.
  salvarRegistro({ workspaces: [], ativo: null });
  app = Fastify();
  await app.register(rotasCore, { prefix: "/api" });
  await app.ready();
});

after(async () => {
  await app.close();
  for (const id of workspacesCriados) apagarPastaDadosWorkspace(id);
  for (const pasta of pastasCriadas) rmSync(pasta, { recursive: true, force: true });
  delete process.env.VKOS_DADOS_TESTE;
  rmSync(raizTeste, { recursive: true, force: true });
  salvarRegistro(registroOriginal);
});

test("o resumo soma o gasto dos clientes e o de quem ja foi removido", async () => {
  const a = cliente("Cliente A");
  marcarAtivo(a);
  registrarResult(a, RESULT);

  // O historico do CORE guarda o acumulado dos clientes ja removidos.
  gravarJsonAtomico(arquivoHistoricoRemovidos(), {
    totalUsd: 10,
    totalSessoes: 3,
    tokensEntrada: 0,
    tokensSaida: 0,
    tokensEntradaNova: 0,
    tokensCacheEscrita: 0,
    tokensCacheLeitura: 0,
    provedor: "claude",
    estimado: true,
    tokensCodexEntrada: 0,
    tokensCodexCache: 0,
    tokensCodexSaida: 0,
    turnosSemCusto: 0,
    workspacesRemovidos: 2,
    workspacesSemHistorico: 0,
  });

  const dados = await resumo();
  assert.equal(dados.gasto.totalUsd, 12.5);
  assert.equal(dados.gasto.usdDeRemovidos, 10);
  assert.equal(dados.gasto.workspacesRemovidos, 2);
  // Dinheiro gasto nao deixa de ter sido gasto porque a pasta sumiu.
  assert.ok(dados.gasto.totalUsd > dados.workspaces[0].totalUsd);
  assert.equal(dados.gasto.estimado, true);
  assert.equal(dados.gasto.piso, false);
});

test("turno sem preco conhecido faz o total virar piso declarado", async () => {
  const b = cliente("Cliente B");
  registrarTurnoSemMedicao(b, {
    sessaoId: "s-morta",
    provedor: "codex",
    modelo: "gpt",
    ehResume: true,
    motivo: "processo morto antes do result",
  });

  const dados = await resumo();
  assert.equal(dados.gasto.piso, true);
  assert.ok(dados.gasto.turnosSemCusto >= 1);
  const doB = dados.workspaces.find((w) => w.id === b);
  assert.ok(doB);
  assert.equal(doB.piso, true);
  assert.ok(doB.turnosSemCusto >= 1);
});

test("a serie diaria tem o gasto de hoje e o tamanho declarado", async () => {
  const dados = await resumo();
  assert.equal(dados.gasto.porDia.length, dados.diasDaSerie);
  const hoje = dados.gasto.porDia[dados.gasto.porDia.length - 1];
  // O turno do primeiro caso entrou hoje.
  assert.ok(hoje.usd >= 2.5, `esperava o gasto de hoje na serie, achei ${hoje.usd}`);
});

test("cliente recem-criado aparece como projeto ativo, sem sessao nenhuma", async () => {
  const dados = await resumo();
  // Todo cliente deste teste nasceu agora, entao nenhum esta parado.
  assert.equal(dados.projetosAtivos, dados.workspaces.length);
  assert.equal(dados.sessoesRodando, 0);
  for (const w of dados.workspaces) {
    assert.equal(w.atividade, "recente");
    assert.equal(w.gastoIlegivel, false);
  }
});
