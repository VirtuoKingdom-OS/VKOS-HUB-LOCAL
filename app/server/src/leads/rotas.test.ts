import assert from "node:assert/strict";
import test from "node:test";

import type { Contato } from "../crm/estado.js";
import { normalizarTelefone } from "../util/telefone.js";
import type { LeadEncontrado } from "./apify.js";
import {
  importarLeadsNoCrm,
  marcarLeadsJaExistentes,
} from "./rotas.js";

function contato(id: string, telefone?: string): Contato {
  const agora = "2026-07-20T12:00:00.000Z";
  return {
    id,
    nome: `Contato ${id}`,
    colunaId: "k1",
    ...(telefone ? { telefone, telefoneNormalizado: normalizarTelefone(telefone) ?? undefined } : {}),
    tags: [],
    workspaceOrigemId: "ws-1",
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

const leads: LeadEncontrado[] = [
  {
    nome: "Padaria Existente",
    telefone: "+55 (31) 99999-8888",
    placeId: "place-existente",
  },
  {
    nome: "Padaria Nova",
    telefone: "(31) 3333-4444",
    email: "contato@padarianova.test",
    placeId: "place-novo",
  },
];

test("busca marca duplicata por telefone normalizado", () => {
  const marcados = marcarLeadsJaExistentes(
    leads,
    [contato("c1", "+55 31 99999 8888")],
  );
  assert.equal(marcados[0].jaExisteNoCrm, true);
  assert.equal(marcados[1].jaExisteNoCrm, false);
});

// Bug vivo consertado: a regra antiga só removia não-dígitos, então o contato
// salvo sem DDI e o lead com DDI viravam chaves diferentes e o mesmo cliente
// entrava duas vezes.
test("contato sem DDI e lead com DDI são a mesma pessoa", () => {
  const marcados = marcarLeadsJaExistentes(leads, [contato("c1", "(31) 99999-8888")]);
  assert.equal(marcados[0].jaExisteNoCrm, true);
  const resultado = importarLeadsNoCrm(
    leads,
    [contato("c1", "(31) 99999-8888")],
    (corpo) => ({ ...contato("c2"), nome: corpo.nome as string }),
  );
  assert.equal(resultado.duplicados, 1);
  assert.equal(resultado.importados, 1);
});

// A chave técnica saiu de "origem" para "chaveExterna": "origem" voltou a ser
// só rótulo humano, e editá-la não pode mais quebrar a deduplicação.
test("importação pula duplicatas e separa rótulo humano de chave técnica", () => {
  const existentes = [contato("c1", "+55 31 99999 8888")];
  const recebidos: Record<string, unknown>[] = [];
  const criar = (corpo: Record<string, unknown>): Contato => {
    recebidos.push(corpo);
    return {
      ...contato(`c${recebidos.length + 1}`, corpo.telefone as string | undefined),
      nome: corpo.nome as string,
      origem: corpo.origem as string,
      chaveExterna: corpo.chaveExterna as string,
      tags: corpo.tags as string[],
    };
  };

  const resultado = importarLeadsNoCrm(leads, existentes, criar);
  assert.equal(resultado.importados, 1);
  assert.equal(resultado.duplicados, 1);
  assert.equal(resultado.contatos[0].nome, "Padaria Nova");
  // O nome do lugar vai como empresa e vira Organizacao no CRM.
  assert.equal(recebidos[0].empresa, "Padaria Nova");
  assert.equal(resultado.contatos[0].origem, "Google Maps");
  assert.equal(resultado.contatos[0].chaveExterna, "google-maps:place-novo");
  assert.deepEqual(resultado.contatos[0].tags, ["google-maps"]);
});

test("importação leva o retrato completo do lead pra ficha", () => {
  const rico = {
    nome: "Clinica Rica",
    telefone: "(31) 4000-0000",
    email: "ola@clinicarica.test",
    site: "clinicarica.test",
    endereco: "Rua das Flores, 100",
    categoria: "Clínica odontológica",
    nota: 4.7,
    totalAvaliacoes: 231,
    placeId: "place-rico",
    termoBusca: "clínicas odontológicas",
    localizacao: "Belo Horizonte, MG",
    capturadoEm: "2026-07-21T10:00:00.000Z",
  };
  let recebido: Record<string, unknown> | null = null;
  const criar = (corpo: Record<string, unknown>): Contato => {
    recebido = corpo;
    return { ...contato("c-rico", corpo.telefone as string), nome: corpo.nome as string };
  };
  importarLeadsNoCrm([rico], [], criar);
  assert.ok(recebido);
  const lead = (recebido as Record<string, unknown>).lead as Record<string, unknown>;
  assert.equal(lead.categoria, "Clínica odontológica");
  assert.equal(lead.endereco, "Rua das Flores, 100");
  assert.equal(lead.site, "clinicarica.test");
  assert.equal(lead.nota, 4.7);
  assert.equal(lead.totalAvaliacoes, 231);
  assert.equal(lead.termoBusca, "clínicas odontológicas");
  assert.equal(lead.localizacao, "Belo Horizonte, MG");
  assert.equal(lead.placeId, "place-rico");
});

test("importar a mesma lista duas vezes não cria contato duplicado", () => {
  const contatos: Contato[] = [];
  const criar = (corpo: Record<string, unknown>): Contato => {
    const novo = {
      ...contato(`c${contatos.length + 1}`, corpo.telefone as string | undefined),
      nome: corpo.nome as string,
      origem: corpo.origem as string,
      chaveExterna: corpo.chaveExterna as string,
      tags: corpo.tags as string[],
    };
    contatos.push(novo);
    return novo;
  };

  const primeira = importarLeadsNoCrm(leads, contatos, criar);
  const segunda = importarLeadsNoCrm(leads, contatos, criar);

  assert.equal(primeira.importados, 2);
  assert.equal(primeira.duplicados, 0);
  assert.equal(segunda.importados, 0);
  assert.equal(segunda.duplicados, 2);
  assert.equal(contatos.length, 2);
});

test("chave externa impede duplicata mesmo quando o lead não tem telefone", () => {
  const semTelefone: LeadEncontrado = {
    nome: "Empresa sem telefone",
    placeId: "place-sem-telefone",
  };
  const existente = {
    ...contato("c-origem"),
    // O rótulo é editável e não conta; a chave técnica é que decide.
    origem: "Google Maps",
    chaveExterna: "google-maps:place-sem-telefone",
  };
  const marcados = marcarLeadsJaExistentes([semTelefone], [existente]);
  assert.equal(marcados[0].jaExisteNoCrm, true);
  const resultado = importarLeadsNoCrm([semTelefone], [existente]);
  assert.equal(resultado.importados, 0);
  assert.equal(resultado.duplicados, 1);
});
