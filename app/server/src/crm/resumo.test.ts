import assert from "node:assert/strict";
import test from "node:test";

import type { EstadoCrm, Interacao } from "./estado.js";
import { montarResumoCrm } from "./resumo.js";

function estadoVazio(): EstadoCrm {
  return {
    versao: 4,
    colunas: [],
    organizacoes: [],
    contatos: [],
    negocios: [],
    orcamentos: [],
    tarefas: [],
  };
}

// As interacoes nao moram mais no contato: elas chegam de fora, do jsonl.
function cenario(texto: string): { estado: EstadoCrm; interacoes: Interacao[] } {
  const agora = Date.now();
  const estado: EstadoCrm = {
    ...estadoVazio(),
    colunas: [{ id: "novo", nome: "Novo", ordem: 0, tipo: "aberto" }],
    contatos: [{
      id: "c-1",
      nome: "Maria Sobrenome",
      colunaId: "novo",
      telefone: "+55 (11) 99999-8888",
      telefoneNormalizado: "+5511999998888",
      email: "maria.secreta@example.com",
      tags: ["VIP"],
      workspaceOrigemId: "ws-1",
      proximoContato: new Date(agora + 2 * 24 * 60 * 60 * 1000).toISOString(),
      criadoEm: new Date(agora - 40 * 24 * 60 * 60 * 1000).toISOString(),
      atualizadoEm: new Date(agora - 1000).toISOString(),
    }],
    negocios: [{
      id: "n-1",
      titulo: "Orcamento",
      contatoId: "c-1",
      status: "aberto",
      valorEstimado: 2500,
      criadoEm: new Date(agora).toISOString(),
      atualizadoEm: new Date(agora).toISOString(),
    }],
  };
  const interacoes: Interacao[] = [{
    id: "i-1",
    contatoId: "c-1",
    em: new Date(agora - 1000).toISOString(),
    tipo: "mensagem",
    texto,
    criadaEm: new Date(agora - 1000).toISOString(),
  }];
  return { estado, interacoes };
}

test("resumo agrega o funil e remove telefone, email e nome completo", () => {
  const { estado, interacoes } = cenario(
    "Falou pelo maria.secreta@example.com e +55 (11) 99999-8888. Outro: teste@site.com, 11987654321.",
  );
  estado.colunas[0].nome = "teste@coluna.com";
  estado.contatos[0].tags.push("11999998888");
  const resumo = montarResumoCrm(estado, interacoes);
  assert.ok(resumo);
  assert.match(resumo, /\[email removido\]: 1 contato\(s\), valor 2\.500,00/);
  assert.match(resumo, /Maria \(mensagem\)/);
  assert.doesNotMatch(resumo, /Sobrenome/);
  assert.doesNotMatch(resumo, /maria\.secreta@example\.com/i);
  assert.doesNotMatch(resumo, /teste@site\.com/i);
  assert.doesNotMatch(resumo, /99999-8888/);
  assert.doesNotMatch(resumo, /11987654321/);
  assert.doesNotMatch(resumo, /teste@coluna\.com/i);
  assert.doesNotMatch(resumo, /11999998888/);
});

test("resumo respeita o teto de 8 KB", () => {
  const { estado, interacoes } = cenario("Dor relatada ".repeat(5000));
  const resumo = montarResumoCrm(estado, interacoes);
  assert.ok(resumo);
  assert.ok(Buffer.byteLength(resumo, "utf8") <= 8 * 1024);
});

test("resumo vazio nao injeta contexto", () => {
  assert.equal(montarResumoCrm(estadoVazio(), []), null);
});

// Contato sem nenhuma interacao no jsonl conta como esquecido pela data de
// criacao, nao quebra o resumo.
test("contato sem interacao nenhuma continua no resumo", () => {
  const { estado } = cenario("nao usada");
  const resumo = montarResumoCrm(estado, []);
  assert.ok(resumo);
  assert.match(resumo, /Nenhuma interacao registrada/);
  assert.match(resumo, /1 contato\(s\) sem interacao ha mais de 30 dias/);
});
