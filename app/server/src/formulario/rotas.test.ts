import assert from "node:assert/strict";
import test from "node:test";

import type { Contato } from "../crm/estado.js";
import { normalizarEstadoCrm } from "../crm/migracao.js";
import { normalizarTelefone } from "../util/telefone.js";
import {
  chaveExternaDoLead,
  importarNoCrm,
  marcarJaExistentes,
} from "./rotas.js";
import { normalizarLinha, type LeadFormulario } from "./supabase.js";

const AGORA = "2026-07-29T12:00:00.000Z";

function contato(id: string, extras: Partial<Contato> = {}): Contato {
  return {
    id,
    nome: `Contato ${id}`,
    colunaId: "k1",
    tags: [],
    workspaceOrigemId: "ws-1",
    criadoEm: AGORA,
    atualizadoEm: AGORA,
    ...extras,
  };
}

function lead(extras: Partial<LeadFormulario> = {}): LeadFormulario {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    criadoEm: AGORA,
    negocio: "Estúdio de tatuagem no centro",
    faturamento: "R$ 30 mil a R$ 80 mil",
    papelMarketing: "Sim, é peça central",
    dores: ["Encontrar e abordar novos clientes"],
    decisao: "Eu decido sozinho",
    investimento: "R$ 1.500 a R$ 5.000",
    nome: "Marina",
    whatsapp: "(31) 99999-8888",
    temperatura: "quente",
    status: "novo",
    ...extras,
  };
}

// ------------------------------------------------------- leitura do Supabase

test("normaliza a linha crua, incluindo snake_case e array de dores", () => {
  const normalizado = normalizarLinha({
    id: "abc",
    criado_em: AGORA,
    negocio: "  Padaria  ",
    papel_marketing: "Não muito",
    dores: ["Processos internos bagunçados", "  ", "Ainda não sei dizer"],
    temperatura: "frio",
    nome: "Joana",
    whatsapp: "31999998888",
  });

  assert.ok(normalizado);
  assert.equal(normalizado.negocio, "Padaria");
  assert.equal(normalizado.papelMarketing, "Não muito");
  assert.equal(normalizado.temperatura, "frio");
  // A entrada em branco do meio some, as duas reais ficam.
  assert.deepEqual(normalizado.dores, [
    "Processos internos bagunçados",
    "Ainda não sei dizer",
  ]);
});

test("linha com colunas nulas ou trocadas nao derruba a leitura", () => {
  const normalizado = normalizarLinha({
    id: "abc",
    criado_em: null,
    negocio: null,
    dores: "nao e lista",
    temperatura: "morna demais",
    nome: null,
    utm: [],
  });

  assert.ok(normalizado);
  assert.deepEqual(normalizado.dores, []);
  // Temperatura fora do vocabulario cai no meio, nunca em quente: um lead nao
  // pode subir pro topo da fila por causa de dado sujo.
  assert.equal(normalizado.temperatura, "morno");
  assert.equal(normalizado.nome, "Sem nome");
  assert.equal(normalizado.utm, undefined);
});

test("linha sem id e descartada, porque id e a chave de deduplicacao", () => {
  assert.equal(normalizarLinha({ nome: "Sem id" }), null);
  assert.equal(normalizarLinha(null), null);
});

// ------------------------------------------------------------ deduplicacao

test("marca duplicata por chave externa", () => {
  const marcados = marcarJaExistentes(
    [lead()],
    [contato("c1", { chaveExterna: chaveExternaDoLead(lead().id) })],
  );
  assert.equal(marcados[0].jaExisteNoCrm, true);
});

test("marca duplicata por telefone normalizado, com formatacao diferente", () => {
  const marcados = marcarJaExistentes(
    [lead()],
    [contato("c1", {
      telefone: "+55 31 99999 8888",
      telefoneNormalizado: normalizarTelefone("+55 31 99999 8888") ?? undefined,
    })],
  );
  assert.equal(marcados[0].jaExisteNoCrm, true);
});

test("lead novo nao e marcado", () => {
  assert.equal(marcarJaExistentes([lead()], [contato("c1")])[0].jaExisteNoCrm, false);
});

// ------------------------------------------------------------- importacao

test("importa o lead com origem, chave tecnica, tags e retrato", () => {
  const criados: Record<string, unknown>[] = [];
  const resultado = importarNoCrm([lead()], [], (corpo) => {
    criados.push(corpo);
    return contato("novo");
  });

  assert.equal(resultado.importados, 1);
  assert.deepEqual(resultado.idsImportados, [lead().id]);

  const corpo = criados[0];
  assert.equal(corpo.nome, "Marina");
  assert.equal(corpo.origem, "Formulário do site");
  assert.equal(corpo.chaveExterna, "formulario-site:11111111-1111-1111-1111-111111111111");
  assert.deepEqual(corpo.tags, ["formulario-site", "lead-quente"]);
  // A frase do negocio NAO pode virar organizacao: o CRM ficaria cheio de
  // organizacao com nome de frase.
  assert.equal(corpo.empresa, undefined);

  const retrato = corpo.formulario as Record<string, unknown>;
  assert.equal(retrato.negocio, "Estúdio de tatuagem no centro");
  assert.equal(retrato.temperatura, "quente");
  assert.equal(retrato.leadId, lead().id);
});

test("nao importa duas vezes o mesmo lead, nem dentro do mesmo lote", () => {
  const resultado = importarNoCrm([lead(), lead()], [], () => contato("novo"));
  assert.equal(resultado.importados, 1);
  assert.equal(resultado.duplicados, 1);
});

test("lead ja no funil por telefone conta como duplicado", () => {
  const resultado = importarNoCrm(
    [lead()],
    [contato("c1", {
      telefone: "31999998888",
      telefoneNormalizado: normalizarTelefone("31999998888") ?? undefined,
    })],
    () => contato("novo"),
  );
  assert.equal(resultado.importados, 0);
  assert.equal(resultado.duplicados, 1);
});

// -------------------------------------------------------- o retrato sobrevive

// O contato e reconstruido campo a campo em TODA leitura do crm.json. Um campo
// que a normalizacao nao conhece e gravado e some na leitura seguinte, sem erro
// nenhum. Este teste afirma o conteudo do retrato depois da volta completa: ele
// falharia se alguem tirasse o saneiaDadosFormulario do saneiaContato.
test("o retrato do formulario sobrevive a releitura do crm.json", () => {
  const gatilhoLongo = "Perdi dois clientes seguidos. ".repeat(40);
  const salvo = {
    versao: 4,
    colunas: [{ id: "k1", nome: "Não iniciados", ordem: 0, tipo: "aberto" }],
    organizacoes: [],
    contatos: [
      {
        ...contato("c1", { chaveExterna: chaveExternaDoLead(lead().id) }),
        formulario: {
          leadId: lead().id,
          recebidoEm: AGORA,
          negocio: "Estúdio de tatuagem no centro",
          faturamento: "R$ 30 mil a R$ 80 mil",
          dores: ["Encontrar e abordar novos clientes"],
          gatilho: gatilhoLongo,
          temperatura: "quente",
        },
      },
    ],
    negocios: [],
    orcamentos: [],
    tarefas: [],
  };

  const resultado = normalizarEstadoCrm(salvo, "ws-1");
  assert.ok(resultado);

  const retrato = resultado.estado.contatos[0].formulario;
  assert.ok(retrato, "o retrato do formulário sumiu na releitura");
  assert.equal(retrato.negocio, "Estúdio de tatuagem no centro");
  assert.equal(retrato.faturamento, "R$ 30 mil a R$ 80 mil");
  assert.equal(retrato.temperatura, "quente");
  assert.deepEqual(retrato.dores, ["Encontrar e abordar novos clientes"]);
  // Resposta aberta longa nao pode ser cortada em 300 como o resto: e o campo
  // que mais serve na hora de ligar pra pessoa. Afirma o texto inteiro, nao o
  // tamanho: assim o teste continua valendo se o teto mudar.
  assert.equal(retrato.gatilho, gatilhoLongo.trim());
  assert.ok(gatilhoLongo.length > 300, "o caso de teste precisa passar do teto curto");
});
