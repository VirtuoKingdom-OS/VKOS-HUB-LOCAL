import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("migra contato v1 cheio para contato e negocio v2 sem perder campos", () => {
  const resultado = normalizarEstadoCrm(fixtureV1);
  assert.ok(resultado);
  assert.equal(resultado.precisaSalvar, true);
  assert.equal(resultado.estado.versao, 2);
  assert.deepEqual(resultado.estado.colunas, fixtureV1.colunas);

  const contato = resultado.estado.contatos[0];
  assert.deepEqual({
    id: contato.id,
    nome: contato.nome,
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

  assert.deepEqual(resultado.estado.negocios[0], {
    id: "n-c-cheio",
    titulo: "Maria Completa",
    contatoId: "c-cheio",
    colunaId: "proposta",
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
    assert.equal(persistido.versao, 2);
    assert.equal(primeira.contatos.length, 1);
    assert.equal(primeira.negocios.length, 1);
    assert.equal(primeira.contatos[0].interacoes.length, 2);
    assert.deepEqual(segunda, primeira);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
