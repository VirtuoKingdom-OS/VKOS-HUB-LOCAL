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

import { lerEstadoCrmDeArquivo } from "./estado.js";
import { lerEstagiosDaPasta, lerInteracoesDaPasta } from "./historico.js";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-crm-${nome}-`));
}

// Guarda do pior modo de falha que este arquivo ja teve, provado em 2026-07-27.
// Um crm.json de versao desconhecida caia no ramo de migracao da v1: ele le
// "notas" em vez de "interacoes", forca tarefas vazias e nem olha "negocios".
// Uma unica leitura destruia o historico e gravava o resultado por cima do
// original, sem quarentena, porque o arquivo era considerado valido.
const fixtureVersaoFutura = {
  versao: 5,
  colunas: [{ id: "k1", nome: "Conversando", ordem: 0, tipo: "aberto" }],
  organizacoes: [],
  contatos: [{
    id: "c1",
    nome: "Padaria Aurora",
    colunaId: "k1",
    tags: ["cliente"],
    workspaceOrigemId: "ws-1",
    criadoEm: "2026-06-01T10:00:00.000Z",
    atualizadoEm: "2026-07-10T10:00:00.000Z",
  }],
  negocios: [{
    id: "n1",
    titulo: "Site",
    contatoId: "c1",
    status: "aberto",
    valorEstimado: 4500,
    criadoEm: "2026-06-01T10:00:00.000Z",
    atualizadoEm: "2026-07-01T10:00:00.000Z",
  }],
  orcamentos: [],
  tarefas: [],
};

test("versao futura vai pra quarentena com o dado intacto", () => {
  const pasta = pastaTemp("versao");
  try {
    const caminho = join(pasta, "crm.json");
    const texto = JSON.stringify(fixtureVersaoFutura, null, 2);
    writeFileSync(caminho, texto, "utf8");

    assert.throws(() => lerEstadoCrmDeArquivo(caminho));

    // O original saiu do lugar em vez de ser sobrescrito por estado vazio.
    assert.equal(existsSync(caminho), false);
    const quarentena = readdirSync(pasta).find((n) => n.includes("corrompido"));
    assert.ok(quarentena, "o original precisa ir pra quarentena");
    assert.equal(readFileSync(join(pasta, quarentena), "utf8"), texto);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("arquivo corrompido vai pra quarentena e nunca e sobrescrito", () => {
  const pasta = pastaTemp("corrompido");
  const arquivo = join(pasta, "crm.json");
  const conteudoOriginal = "{ isto nao e json valido";
  try {
    writeFileSync(arquivo, conteudoOriginal, "utf8");
    assert.throws(() => lerEstadoCrmDeArquivo(arquivo), /corrompido/i);
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
  const pasta = pastaTemp("forma");
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
  const pasta = pastaTemp("ausente");
  try {
    assert.equal(lerEstadoCrmDeArquivo(join(pasta, "crm.json")), null);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

const fixtureV3 = {
  versao: 3,
  colunas: [
    { id: "k1", nome: "Conversando", ordem: 0 },
    { id: "k2", nome: "Fechado", ordem: 1 },
  ],
  contatos: [{
    id: "c1",
    nome: "Padaria Aurora",
    colunaId: "k2",
    empresa: "Padaria Aurora ME",
    telefone: "(31) 99999-8888",
    origem: "google-maps:place-42",
    tags: ["cliente"],
    interacoes: [
      { id: "i1", em: "2026-07-10T10:00:00.000Z", tipo: "reuniao", texto: "Briefing" },
      { id: "i2", em: "2026-07-01T10:00:00.000Z", tipo: "ligacao", texto: "Fechamos" },
    ],
    tarefas: [
      { id: "t1", texto: "Enviar contrato", feita: false, criadaEm: "2026-07-10T10:00:00.000Z" },
    ],
    criadoEm: "2026-06-01T10:00:00.000Z",
    atualizadoEm: "2026-07-10T10:00:00.000Z",
  }],
  negocios: [
    { id: "n1", titulo: "Site", contatoId: "c1", valorEstimado: 4500 },
    // Orfao: a v3 descartava este em silencio.
    { id: "n2", titulo: "Perdido no tempo", contatoId: "c-que-sumiu", valorEstimado: 800 },
  ],
};

test("migracao da v3 grava o historico no jsonl e o resto no crm.json", () => {
  const pasta = pastaTemp("v3");
  const arquivo = join(pasta, "crm.json");
  try {
    writeFileSync(arquivo, JSON.stringify(fixtureV3), "utf8");
    const estado = lerEstadoCrmDeArquivo(arquivo, "ws-1");
    assert.ok(estado);
    assert.equal(estado.versao, 4);

    // Interacoes sairam de dentro do contato pro arquivo append-only.
    const interacoes = lerInteracoesDaPasta(pasta);
    assert.deepEqual(interacoes.map((i) => i.id), ["i1", "i2"]);
    assert.equal(interacoes[0].contatoId, "c1");

    // Uma linha de estagio por contato, com a coluna em que ele estava.
    const estagios = lerEstagiosDaPasta(pasta);
    assert.equal(estagios.length, 2, "um por contato, contando o de recuperacao");
    const doContato = estagios.find((e) => e.contatoId === "c1");
    assert.equal(doContato?.colunaId, "k2");
    assert.equal(doContato?.colunaNome, "Fechado");

    // Tarefa virou lista de topo, organizacao virou entidade, telefone em E.164.
    assert.equal(estado.tarefas[0].contatoId, "c1");
    assert.equal(estado.organizacoes[0].nome, "Padaria Aurora ME");
    assert.equal(estado.contatos[0].telefoneNormalizado, "+5531999998888");
    assert.equal(estado.contatos[0].chaveExterna, "google-maps:place-42");

    // Nenhum negocio se perdeu: o orfao ganhou dono de recuperacao.
    assert.equal(estado.negocios.length, 2);
    // E o que foi recuperado ficou registrado num arquivo ao lado.
    const rastro = readFileSync(join(pasta, "recuperacoes.jsonl"), "utf8");
    assert.match(rastro, /c-que-sumiu/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("persiste a migracao uma vez e a segunda leitura nao duplica nada", () => {
  const pasta = pastaTemp("idempotente");
  const arquivo = join(pasta, "crm.json");
  try {
    writeFileSync(arquivo, JSON.stringify(fixtureV3), "utf8");
    const primeira = lerEstadoCrmDeArquivo(arquivo, "ws-1");
    const persistido = JSON.parse(readFileSync(arquivo, "utf8"));
    const segunda = lerEstadoCrmDeArquivo(arquivo, "ws-1");

    assert.ok(primeira);
    assert.ok(segunda);
    assert.equal(persistido.versao, 4);
    assert.deepEqual(segunda, primeira);
    assert.equal(lerInteracoesDaPasta(pasta).length, 2);
    assert.equal(lerEstagiosDaPasta(pasta).length, 2);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Se o processo cair depois de gravar o historico e antes de gravar o crm.json
// novo, a proxima leitura repete a migracao. Nada pode duplicar por causa disso.
test("migracao repetida sobre o arquivo antigo nao duplica o historico", () => {
  const pasta = pastaTemp("recaida");
  const arquivo = join(pasta, "crm.json");
  try {
    writeFileSync(arquivo, JSON.stringify(fixtureV3), "utf8");
    lerEstadoCrmDeArquivo(arquivo, "ws-1");
    // Volta o arquivo antigo por cima, simulando a queda antes da gravacao.
    writeFileSync(arquivo, JSON.stringify(fixtureV3), "utf8");
    lerEstadoCrmDeArquivo(arquivo, "ws-1");

    assert.equal(lerInteracoesDaPasta(pasta).length, 2);
    assert.equal(lerEstagiosDaPasta(pasta).length, 2);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
