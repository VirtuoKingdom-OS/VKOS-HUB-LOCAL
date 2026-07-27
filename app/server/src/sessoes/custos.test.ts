import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { apagarPastaDadosWorkspace } from "../workspaces/estado.js";
import {
  absorverCustosDeWorkspace,
  arquivoDe,
  arquivoHistoricoRemovidos,
  lerCustos,
  lerCustosDeArquivo,
  lerHistoricoRemovidos,
  lerLancamentos,
  registrarResult,
  registrarTurnoSemMedicao,
  type EntradaResult,
} from "./custos.js";

const NOME = "custos.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("custos ausentes devolvem zerado sem criar quarentena", () => {
  const pasta = pastaTemp("custos-ausente");
  try {
    assert.equal(lerCustosDeArquivo(join(pasta, NOME)).totalUsd, 0);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Arquivo antigo sem o split de tokens nao e corrupcao, e retrocompatibilidade.
test("arquivo antigo sem os campos novos carrega sem quarentena", () => {
  const pasta = pastaTemp("custos-antigo");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, JSON.stringify({ totalUsd: 12.5, totalSessoes: 3 }), "utf8");
    const custos = lerCustosDeArquivo(arquivo);
    assert.equal(custos.totalUsd, 12.5);
    assert.equal(custos.tokensCacheLeitura, 0);
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// O gasto acumulado nao se reconstitui. Falha fechado: lanca, nunca zera.
test("custos corrompidos vao pra quarentena com o total preservado e lancam", () => {
  const pasta = pastaTemp("custos-corrompido");
  const arquivo = join(pasta, NOME);
  const original = '{"totalUsd": 987.65, "totalSessoes":';
  try {
    writeFileSync(arquivo, original, "utf8");
    assert.throws(() => lerCustosDeArquivo(arquivo), /corrompido/i);

    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido que nao e objeto tambem vai pra quarentena", () => {
  const pasta = pastaTemp("custos-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "[1,2,3]", "utf8");
    assert.throws(() => lerCustosDeArquivo(arquivo), /corrompido/i);
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("dois custos corrompidos seguidos nao se sobrescrevem", () => {
  const pasta = pastaTemp("custos-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    assert.throws(() => lerCustosDeArquivo(arquivo));
    writeFileSync(arquivo, "segundo lixo", "utf8");
    assert.throws(() => lerCustosDeArquivo(arquivo));

    const conteudos = quarentenas(pasta)
      .map((n) => readFileSync(join(pasta, n), "utf8"))
      .sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// ---- turno sem custo conhecido, lancamento por turno e historico do CORE ----

function workspaceTeste(): string {
  return `w-teste-custos-${Math.random().toString(36).slice(2, 9)}`;
}

const RESULT_BASE: EntradaResult = {
  custoUsd: 0,
  custoConhecido: true,
  tokensEntrada: 0,
  tokensSaida: 0,
  tokensEntradaNova: 0,
  tokensCacheEscrita: 0,
  tokensCacheLeitura: 0,
  contarSessao: false,
  provedor: "claude",
  estimado: true,
  sessaoId: "s-teste",
  modelo: "claude-haiku-4-5",
  ehResume: false,
  ehErro: false,
};

// Custo desconhecido virando zero era a pior mentira possivel: sumia do total e
// ninguem percebia. Agora ele fica contado a parte, e o total se declara piso.
test("turno sem custo conhecido nao entra no total e fica contado a parte", () => {
  const id = workspaceTeste();
  try {
    registrarResult(id, { ...RESULT_BASE, custoUsd: 0.5, contarSessao: true });
    registrarResult(id, {
      ...RESULT_BASE,
      custoUsd: 99,
      custoConhecido: false,
      motivoSemCusto: "modelo fora da tabela",
      provedor: "codex",
      tokensSaida: 120,
    });

    const custos = lerCustos(id);
    assert.equal(custos.totalUsd, 0.5, "custo desconhecido nao pode entrar no total");
    assert.equal(custos.turnosSemCusto, 1);
    // Os tokens do turno desconhecido continuam contando: eles foram medidos.
    assert.equal(custos.tokensSaida, 120);
  } finally {
    apagarPastaDadosWorkspace(id);
  }
});

// Sem o detalhe por turno, um pulo estranho no total e impossivel de investigar.
test("cada turno vira uma linha em custos.jsonl com o motivo de nao ter preco", () => {
  const id = workspaceTeste();
  try {
    registrarResult(id, {
      ...RESULT_BASE,
      custoUsd: 0.25,
      tokensEntradaNova: 10,
      tokensCacheEscrita: 20,
      tokensCacheLeitura: 30,
      tokensSaida: 40,
      sessaoId: "s-primeira",
    });
    registrarResult(id, {
      ...RESULT_BASE,
      custoUsd: 7,
      custoConhecido: false,
      motivoSemCusto: "O modelo gpt-9 nao esta na tabela de precos do Codex.",
      provedor: "codex",
      modelo: "gpt-9",
      ehResume: true,
      sessaoId: "s-primeira",
    });
    registrarTurnoSemMedicao(id, {
      sessaoId: "s-primeira",
      provedor: "claude",
      modelo: "claude-opus-5",
      ehResume: true,
      motivo: "A sessao foi parada com o turno em andamento.",
    });

    const linhas = lerLancamentos(id);
    assert.equal(linhas.length, 3);

    assert.equal(linhas[0].custoUsd, 0.25);
    assert.equal(linhas[0].custoConhecido, true);
    assert.equal(linhas[0].sessaoId, "s-primeira");
    assert.equal(linhas[0].tokensCacheEscrita, 20);
    assert.equal(linhas[0].tokensCacheLeitura, 30);
    assert.equal(linhas[0].motivoSemCusto, undefined);

    // O turno sem preco grava zero em dolar, mas diz que zero nao e o custo.
    assert.equal(linhas[1].custoConhecido, false);
    assert.equal(linhas[1].custoUsd, 0);
    assert.equal(linhas[1].modelo, "gpt-9");
    assert.equal(linhas[1].ehResume, true);
    assert.match(String(linhas[1].motivoSemCusto), /tabela de precos/);

    assert.equal(linhas[2].custoConhecido, false);
    assert.match(String(linhas[2].motivoSemCusto), /parada com o turno em andamento/);

    // Dois turnos sem custo conhecido, um deles sem medicao nenhuma.
    assert.equal(lerCustos(id).turnosSemCusto, 2);
  } finally {
    apagarPastaDadosWorkspace(id);
  }
});

// Dinheiro gasto nao deixa de ter sido gasto porque a pasta sumiu.
test("remover um cliente move o gasto dele pro historico do CORE", () => {
  const raiz = pastaTemp("custos-core");
  process.env.VKOS_DADOS_TESTE = raiz;
  const id = workspaceTeste();
  try {
    registrarResult(id, {
      ...RESULT_BASE,
      custoUsd: 3.5,
      contarSessao: true,
      tokensSaida: 900,
    });
    registrarResult(id, { ...RESULT_BASE, custoConhecido: false });

    absorverCustosDeWorkspace(id);
    apagarPastaDadosWorkspace(id);

    const historico = lerHistoricoRemovidos();
    assert.equal(historico.totalUsd, 3.5, "o gasto do cliente removido tem que sobreviver");
    assert.equal(historico.totalSessoes, 1);
    assert.equal(historico.tokensSaida, 900);
    assert.equal(historico.turnosSemCusto, 1);
    assert.equal(historico.workspacesRemovidos, 1);
    assert.equal(historico.workspacesSemHistorico, 0);
    // E o custos.json do cliente foi embora junto com a pasta dele.
    assert.equal(lerCustos(id).totalUsd, 0);
  } finally {
    apagarPastaDadosWorkspace(id);
    delete process.env.VKOS_DADOS_TESTE;
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("historico acumula clientes removidos um depois do outro", () => {
  const raiz = pastaTemp("custos-core2");
  process.env.VKOS_DADOS_TESTE = raiz;
  const primeiro = workspaceTeste();
  const segundo = workspaceTeste();
  try {
    registrarResult(primeiro, { ...RESULT_BASE, custoUsd: 1.25, contarSessao: true });
    registrarResult(segundo, { ...RESULT_BASE, custoUsd: 2, contarSessao: true });
    absorverCustosDeWorkspace(primeiro);
    absorverCustosDeWorkspace(segundo);

    const historico = lerHistoricoRemovidos();
    assert.equal(historico.totalUsd, 3.25);
    assert.equal(historico.workspacesRemovidos, 2);
    assert.equal(historico.totalSessoes, 2);
  } finally {
    apagarPastaDadosWorkspace(primeiro);
    apagarPastaDadosWorkspace(segundo);
    delete process.env.VKOS_DADOS_TESTE;
    rmSync(raiz, { recursive: true, force: true });
  }
});

// Custos ilegiveis nao podem travar a remocao do cliente, mas tambem nao podem
// virar "esse cliente nao gastou nada". Ficam declarados como perda.
test("cliente removido com custos.json corrompido marca o total geral como piso", () => {
  const raiz = pastaTemp("custos-core3");
  process.env.VKOS_DADOS_TESTE = raiz;
  const id = workspaceTeste();
  try {
    registrarResult(id, { ...RESULT_BASE, custoUsd: 5, contarSessao: true });
    writeFileSync(arquivoDe(id), "{ lixo", "utf8");

    absorverCustosDeWorkspace(id);

    const historico = lerHistoricoRemovidos();
    assert.equal(historico.totalUsd, 0);
    assert.equal(historico.workspacesRemovidos, 1);
    assert.equal(historico.workspacesSemHistorico, 1);
  } finally {
    apagarPastaDadosWorkspace(id);
    delete process.env.VKOS_DADOS_TESTE;
    rmSync(raiz, { recursive: true, force: true });
  }
});

// Dado antigo nao pode morrer numa mudanca de formato.
test("custos.json antigo sobrevive a uma gravacao no formato novo", () => {
  const id = workspaceTeste();
  try {
    // Cria a pasta e depois planta um arquivo do formato anterior, sem
    // turnosSemCusto e sem o split de cache.
    registrarResult(id, { ...RESULT_BASE });
    writeFileSync(
      arquivoDe(id),
      JSON.stringify({
        totalUsd: 12.5,
        totalSessoes: 3,
        tokensEntrada: 5000,
        tokensSaida: 900,
      }),
      "utf8",
    );

    const antes = lerCustos(id);
    assert.equal(antes.totalUsd, 12.5);
    assert.equal(antes.turnosSemCusto, 0);

    registrarResult(id, { ...RESULT_BASE, custoUsd: 1.5, contarSessao: true });

    const depois = lerCustos(id);
    assert.equal(depois.totalUsd, 14, "o total antigo nao pode ser descartado");
    assert.equal(depois.totalSessoes, 4);
    assert.equal(depois.tokensEntrada, 5000);
    assert.equal(depois.tokensSaida, 900);
    assert.equal(depois.turnosSemCusto, 0);
  } finally {
    apagarPastaDadosWorkspace(id);
  }
});

// O historico do CORE tambem e dado do usuario: corrompido vai pra quarentena e
// nunca e sobrescrito por um estado novo.
test("historico do CORE corrompido vai pra quarentena e nao e sobrescrito", () => {
  const raiz = pastaTemp("custos-core4");
  process.env.VKOS_DADOS_TESTE = raiz;
  const id = workspaceTeste();
  const original = '{"totalUsd": 40, "workspaces';
  try {
    const caminho = arquivoHistoricoRemovidos();
    writeFileSync(caminho, original, "utf8");
    registrarResult(id, { ...RESULT_BASE, custoUsd: 1 });

    absorverCustosDeWorkspace(id);

    assert.equal(existsSync(caminho), false, "o original tem que sair do lugar");
    const movidos = readdirSync(raiz).filter((n) =>
      n.startsWith("custos-historico.json.corrompido-"),
    );
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(raiz, movidos[0]), "utf8"), original);
  } finally {
    apagarPastaDadosWorkspace(id);
    delete process.env.VKOS_DADOS_TESTE;
    rmSync(raiz, { recursive: true, force: true });
  }
});
