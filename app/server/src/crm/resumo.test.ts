import assert from "node:assert/strict";
import test from "node:test";

import type { EstadoCrm } from "./estado.js";
import { montarResumoCrm } from "./resumo.js";

function estadoComVoz(texto: string): EstadoCrm {
  const agora = Date.now();
  return {
    versao: 2,
    colunas: [{ id: "novo", nome: "Novo", ordem: 0 }],
    contatos: [{
      id: "c-1",
      nome: "Maria Sobrenome",
      empresa: "Empresa privada",
      telefone: "+55 (11) 99999-8888",
      email: "maria.secreta@example.com",
      tags: ["VIP"],
      interacoes: [{
        id: "i-1",
        em: new Date(agora - 1000).toISOString(),
        tipo: "mensagem",
        texto,
      }],
      tarefas: [],
      proximoContato: new Date(agora + 2 * 24 * 60 * 60 * 1000).toISOString(),
      criadoEm: new Date(agora - 40 * 24 * 60 * 60 * 1000).toISOString(),
      atualizadoEm: new Date(agora - 1000).toISOString(),
    }],
    negocios: [{
      id: "n-1",
      titulo: "Orcamento",
      contatoId: "c-1",
      colunaId: "novo",
      valorEstimado: 2500,
      criadoEm: new Date(agora).toISOString(),
      atualizadoEm: new Date(agora).toISOString(),
    }],
  };
}

test("resumo agrega o funil e remove telefone, email e nome completo", () => {
  const estado = estadoComVoz(
    "Falou pelo maria.secreta@example.com e +55 (11) 99999-8888. Outro: teste@site.com, 11987654321.",
  );
  estado.colunas[0].nome = "teste@coluna.com";
  estado.contatos[0].tags.push("11999998888");
  const resumo = montarResumoCrm(estado);
  assert.ok(resumo);
  assert.match(resumo, /\[email removido\]: 1 negocio\(s\), valor 2\.500,00/);
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
  const estado = estadoComVoz("Dor relatada ".repeat(5000));
  const resumo = montarResumoCrm(estado);
  assert.ok(resumo);
  assert.ok(Buffer.byteLength(resumo, "utf8") <= 8 * 1024);
});

test("resumo vazio nao injeta contexto", () => {
  assert.equal(montarResumoCrm({ versao: 2, colunas: [], contatos: [], negocios: [] }), null);
});
