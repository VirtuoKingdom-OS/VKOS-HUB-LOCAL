import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerEstadoCrmDeArquivo, normalizarEstadoCrm } from "./estado.js";

const fixtureV1 = {
  colunas: [
    { id: "novo", nome: "Novo contato", ordem: 0 },
    { id: "proposta", nome: "Proposta enviada", ordem: 1 },
  ],
  contatos: [{
    id: "c-cheio",
    nome: "Maria Completa",
    empresa: "Acme",
    telefone: "+55 11 99999-8888",
    email: "maria@acme.test",
    origem: "Indicacao",
    valorEstimado: 9876.54,
    proximoContato: "2026-08-01T15:30:00.000Z",
    colunaId: "proposta",
    tags: ["VIP", "Retorno"],
    notas: [
      { em: "2026-07-15T12:00:00.000Z", texto: "Nota mais nova" },
      { em: "2026-07-10T09:00:00.000Z", texto: "Nota anterior" },
    ],
    criadoEm: "2026-07-01T10:00:00.000Z",
    atualizadoEm: "2026-07-15T12:00:00.000Z",
  }],
};

test("migra contato v1 cheio para contato v3 com estagio, valor vira negocio", () => {
  const resultado = normalizarEstadoCrm(fixtureV1);
  assert.ok(resultado);
  assert.equal(resultado.precisaSalvar, true);
  assert.equal(resultado.estado.versao, 3);
  assert.deepEqual(resultado.estado.colunas, fixtureV1.colunas);

  const contato = resultado.estado.contatos[0];
  assert.deepEqual({
    id: contato.id,
    nome: contato.nome,
    colunaId: contato.colunaId,
    empresa: contato.empresa,
    telefone: contato.telefone,
    email: contato.email,
    origem: contato.origem,
    tags: contato.tags,
    proximoContato: contato.proximoContato,
    criadoEm: contato.criadoEm,
    atualizadoEm: contato.atualizadoEm,
  }, {
    id: "c-cheio",
    nome: "Maria Completa",
    colunaId: "proposta",
    empresa: "Acme",
    telefone: "+55 11 99999-8888",
    email: "maria@acme.test",
    origem: "Indicacao",
    tags: ["VIP", "Retorno"],
    proximoContato: "2026-08-01T15:30:00.000Z",
    criadoEm: "2026-07-01T10:00:00.000Z",
    atualizadoEm: "2026-07-15T12:00:00.000Z",
  });
  assert.deepEqual(
    contato.interacoes.map(({ em, tipo, texto }) => ({ em, tipo, texto })),
    [
      { em: "2026-07-15T12:00:00.000Z", tipo: "nota", texto: "Nota mais nova" },
      { em: "2026-07-10T09:00:00.000Z", tipo: "nota", texto: "Nota anterior" },
    ],
  );
  assert.deepEqual(contato.tarefas, []);

  // O valor vira um negocio sem estagio (o estagio agora e do contato).
  assert.deepEqual(resultado.estado.negocios[0], {
    id: "n-c-cheio",
    titulo: "Maria Completa",
    contatoId: "c-cheio",
    valorEstimado: 9876.54,
    criadoEm: "2026-07-01T10:00:00.000Z",
    atualizadoEm: "2026-07-15T12:00:00.000Z",
  });
});

test("persiste a migracao uma vez e a segunda leitura nao duplica dados", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-crm-v2-"));
  const arquivo = join(pasta, "crm.json");
  try {
    writeFileSync(arquivo, JSON.stringify(fixtureV1), "utf8");
    const primeira = lerEstadoCrmDeArquivo(arquivo);
    const persistido = JSON.parse(readFileSync(arquivo, "utf8"));
    const segunda = lerEstadoCrmDeArquivo(arquivo);

    assert.ok(primeira);
    assert.ok(segunda);
    assert.equal(persistido.versao, 3);
    assert.equal(primeira.contatos.length, 1);
    assert.equal(primeira.contatos[0].colunaId, "proposta");
    assert.equal(primeira.negocios.length, 1);
    assert.equal(primeira.contatos[0].interacoes.length, 2);
    assert.deepEqual(segunda, primeira);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// C1: arquivo corrompido nunca pode ser sobrescrito por estado vazio.
test("arquivo corrompido vai pra quarentena e nunca e sobrescrito", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-crm-corrompido-"));
  const arquivo = join(pasta, "crm.json");
  const conteudoOriginal = "{ isto nao e json valido";
  try {
    writeFileSync(arquivo, conteudoOriginal, "utf8");
    assert.throws(() => lerEstadoCrmDeArquivo(arquivo), /corrompido/i);
    // O crm.json saiu do lugar (nao foi sobrescrito) e virou quarentena.
    assert.equal(existsSync(arquivo), false);
    const quarentenas = readdirSync(pasta).filter((n) => n.startsWith("crm.json.corrompido-"));
    assert.equal(quarentenas.length, 1);
    // O conteudo original ficou preservado byte a byte na quarentena.
    assert.equal(readFileSync(join(pasta, quarentenas[0]), "utf8"), conteudoOriginal);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido mas sem forma de CRM tambem vai pra quarentena", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-crm-forma-"));
  const arquivo = join(pasta, "crm.json");
  try {
    writeFileSync(arquivo, '"apenas uma string"', "utf8");
    assert.throws(() => lerEstadoCrmDeArquivo(arquivo), /invalido|corrompido/i);
    assert.equal(existsSync(arquivo), false);
    assert.equal(
      readdirSync(pasta).filter((n) => n.startsWith("crm.json.corrompido-")).length,
      1,
    );
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("arquivo ausente devolve null sem criar quarentena", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-crm-ausente-"));
  const arquivo = join(pasta, "crm.json");
  try {
    assert.equal(lerEstadoCrmDeArquivo(arquivo), null);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// M7: migracao e saneamento com fallback, nunca descarte de contato.
test("migra contato v1 sem colunaId para a primeira coluna", () => {
  const resultado = normalizarEstadoCrm({
    colunas: [
      { id: "k1", nome: "Novo", ordem: 0 },
      { id: "k2", nome: "Fechado", ordem: 1 },
    ],
    contatos: [{ id: "c1", nome: "Sem Coluna" }],
  });
  assert.ok(resultado);
  assert.equal(resultado.estado.contatos.length, 1);
  // O contato e o cartao do funil: sem estagio informado, cai na primeira coluna.
  assert.equal(resultado.estado.contatos[0].colunaId, "k1");
  // Sem valor, nao nasce negocio: o contato ja caminha sozinho no quadro.
  assert.equal(resultado.estado.negocios.length, 0);
});

test("migra contato v1 sem nome para 'Sem nome' sem descartar", () => {
  const resultado = normalizarEstadoCrm({
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [{ id: "c1", colunaId: "k1" }],
  });
  assert.ok(resultado);
  assert.equal(resultado.estado.contatos.length, 1);
  assert.equal(resultado.estado.contatos[0].nome, "Sem nome");
  assert.equal(resultado.estado.contatos[0].colunaId, "k1");
});

test("sanea contato v2 com nome invalido para 'Sem nome' sem descartar", () => {
  const resultado = normalizarEstadoCrm({
    versao: 2,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [{ id: "c1", nome: 123 }],
    negocios: [],
  });
  assert.ok(resultado);
  assert.equal(resultado.estado.contatos.length, 1);
  assert.equal(resultado.estado.contatos[0].id, "c1");
  assert.equal(resultado.estado.contatos[0].nome, "Sem nome");
});

test("contato v2 saneado nao derruba o negocio que aponta pra ele", () => {
  const resultado = normalizarEstadoCrm({
    versao: 2,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [{ id: "c1", nome: null }],
    negocios: [{ id: "n1", titulo: "Deal", contatoId: "c1", colunaId: "k1" }],
  });
  assert.ok(resultado);
  assert.equal(resultado.estado.negocios.length, 1);
  assert.equal(resultado.estado.negocios[0].contatoId, "c1");
});
