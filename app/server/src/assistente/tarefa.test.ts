import assert from "node:assert/strict";
import test from "node:test";

import { LotePropostaSchema, TarefaSchema, descreverErroDeTarefa } from "./tarefa.js";

const dados = {
  tema: "Como vender sem desconto",
  detalhes: "Falar com donos de pequenos negocios.",
  paginas: 5,
  estilo: "",
  estiloCapa: "",
  estiloPaginas: "",
  formato: "multiplas",
  proporcao: "4x5",
  modoImagem: "sem",
  origemImagem: "usuario",
  caminhosImagens: [],
  visual: null,
  aprimorarComIA: true,
};

test("tarefa valida pertence ao catalogo e carrega o alvo", () => {
  const resultado = TarefaSchema.safeParse({
    id: "t-1",
    loteId: "l-1",
    criadaEm: "2026-08-04T00:00:00.000Z",
    origem: "assistente",
    conversaId: "c-1",
    workspaceId: "w-mae",
    workspaceNome: "Mae Pixel",
    tipo: "carrossel",
    dados,
    estado: "proposta",
  });

  assert.equal(resultado.success, true);
  if (resultado.success) {
    assert.equal(resultado.data.workspaceId, "w-mae");
    assert.equal(resultado.data.tipo, "carrossel");
  }
});

test("tipo fora do catalogo e recusado dizendo o campo", () => {
  const resultado = LotePropostaSchema.safeParse({
    id: "l-1",
    conversaId: "c-1",
    tarefas: [{ workspaceId: "w-1", workspaceNome: "X", tipo: "arquivo", dados: {} }],
  });

  assert.equal(resultado.success, false);
  if (!resultado.success) {
    assert.match(descreverErroDeTarefa(resultado.error), /tipo/);
  }
});

test("lote nao aceita tarefa sem workspace id", () => {
  const resultado = LotePropostaSchema.safeParse({
    id: "l-1",
    tarefas: [{ workspaceNome: "Mae Pixel", tipo: "carrossel", dados }],
  });

  assert.equal(resultado.success, false);
  if (!resultado.success) {
    assert.match(descreverErroDeTarefa(resultado.error), /workspaceId/);
  }
});
