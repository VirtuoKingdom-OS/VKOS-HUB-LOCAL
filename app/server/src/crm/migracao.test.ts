import assert from "node:assert/strict";
import test from "node:test";

import { normalizarEstadoCrm } from "./migracao.js";
import {
  ID_CONTATO_RECUPERACAO,
  NOME_CONTATO_RECUPERACAO,
  VERSAO_CRM_ATUAL,
  type EstadoCrm,
} from "./modelo.js";

function migrar(bruto: unknown, workspaceOrigemId = "ws-teste") {
  const resultado = normalizarEstadoCrm(bruto, workspaceOrigemId);
  assert.ok(resultado, "o arquivo precisava ser migrado, nao rejeitado");
  return resultado;
}

// ------------------------------------------------------------- guardas

test("a versao atual e a 4", () => {
  assert.equal(VERSAO_CRM_ATUAL, 4);
});

// Arquivo de uma versao futura pode ter dado que este codigo nem sabe ler.
// Migrar as cegas destruia o historico e gravava o resultado por cima.
test("versao futura devolve null em vez de ser migrada", () => {
  assert.equal(
    normalizarEstadoCrm({ versao: 5, colunas: [], contatos: [], negocios: [] }),
    null,
  );
});

test("estrutura nova sem o campo versao devolve null", () => {
  assert.equal(
    normalizarEstadoCrm({ colunas: [], contatos: [], negocios: [] }),
    null,
  );
  assert.equal(
    normalizarEstadoCrm({ colunas: [], contatos: [], organizacoes: [] }),
    null,
  );
});

test("valor que nao e objeto devolve null", () => {
  assert.equal(normalizarEstadoCrm("apenas uma string"), null);
  assert.equal(normalizarEstadoCrm(null), null);
  assert.equal(normalizarEstadoCrm([1, 2, 3]), null);
});

// ------------------------------------------------------------- colunas

test("funil vazio nasce com as colunas padrao ja tipadas", () => {
  const { estado } = migrar({ versao: 4, colunas: [] });
  assert.deepEqual(
    estado.colunas.map((coluna) => [coluna.nome, coluna.tipo]),
    [
      ["Não iniciados", "aberto"],
      ["Conversando", "aberto"],
      ["Proposta enviada", "aberto"],
      ["Fechado", "ganho"],
      ["Perdido", "perdido"],
    ],
  );
});

test("coluna sem tipo ganha tipo pelo nome, uma unica vez", () => {
  const { estado } = migrar({
    versao: 3,
    colunas: [
      { id: "k1", nome: "Conversando", ordem: 0 },
      { id: "k2", nome: "Fechado", ordem: 1 },
      { id: "k3", nome: "Perdido", ordem: 2 },
      { id: "k4", nome: "Cliente ativo", ordem: 3 },
    ],
    contatos: [],
    negocios: [],
  });
  assert.deepEqual(estado.colunas.map((coluna) => coluna.tipo), [
    "aberto",
    "ganho",
    "perdido",
    "ganho",
  ]);
});

test("tipo explicito no arquivo vence o palpite pelo nome", () => {
  const { estado } = migrar({
    versao: 4,
    colunas: [{ id: "k1", nome: "Perdido", ordem: 0, tipo: "aberto" }],
  });
  assert.equal(estado.colunas[0].tipo, "aberto");
});

// -------------------------------------------------------- organizacoes

test("cada empresa distinta vira uma organizacao e o contato aponta pra ela", () => {
  const { estado } = migrar({
    versao: 3,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [
      { id: "c1", nome: "Ana", colunaId: "k1", empresa: "Acme" },
      { id: "c2", nome: "Bruno", colunaId: "k1", empresa: " acme " },
      { id: "c3", nome: "Carla", colunaId: "k1", empresa: "Padaria Aurora" },
      { id: "c4", nome: "Davi", colunaId: "k1" },
    ],
    negocios: [],
  });
  // Deduplicacao por nome aparado e sem diferenca de caixa: "Acme" e " acme ".
  assert.deepEqual(estado.organizacoes.map((o) => o.nome), ["Acme", "Padaria Aurora"]);
  const [ana, bruno, carla, davi] = estado.contatos;
  assert.equal(ana.organizacaoId, estado.organizacoes[0].id);
  assert.equal(bruno.organizacaoId, estado.organizacoes[0].id);
  assert.equal(carla.organizacaoId, estado.organizacoes[1].id);
  assert.equal(davi.organizacaoId, undefined);
  // O campo solto "empresa" nao sobrevive no contato: quem manda e a entidade.
  assert.equal("empresa" in ana, false);
});

// ------------------------------------------------------------ contatos

test("origem tecnica de lead vira chaveExterna e rotulo humano", () => {
  const { estado } = migrar({
    versao: 3,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [
      { id: "c1", nome: "Padaria", colunaId: "k1", origem: "google-maps:place-42" },
      { id: "c2", nome: "Indicado", colunaId: "k1", origem: "Indicacao da Maria" },
    ],
    negocios: [],
  });
  const [padaria, indicado] = estado.contatos;
  // A chave de deduplicacao sai do campo que o usuario edita.
  assert.equal(padaria.chaveExterna, "google-maps:place-42");
  assert.equal(padaria.origem, "Google Maps");
  // Rotulo humano comum fica exatamente onde estava.
  assert.equal(indicado.origem, "Indicacao da Maria");
  assert.equal(indicado.chaveExterna, undefined);
});

test("telefone ganha a versao normalizada em E.164 sem perder o digitado", () => {
  const { estado } = migrar({
    versao: 3,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [
      { id: "c1", nome: "Ana", colunaId: "k1", telefone: "+55 31 99999-8888" },
      { id: "c2", nome: "Bruno", colunaId: "k1", telefone: "(31) 99999-8888" },
      { id: "c3", nome: "Carla", colunaId: "k1", telefone: "0800 123 4567" },
    ],
    negocios: [],
  });
  const [ana, bruno, carla] = estado.contatos;
  assert.equal(ana.telefone, "+55 31 99999-8888");
  assert.equal(ana.telefoneNormalizado, "+5531999998888");
  assert.equal(bruno.telefoneNormalizado, "+5531999998888");
  // Numero que nao normaliza continua na ficha, so nao vira chave.
  assert.equal(carla.telefone, "0800 123 4567");
  assert.equal(carla.telefoneNormalizado, undefined);
});

test("workspaceOrigemId marca a procedencia de quem nao tinha", () => {
  const { estado } = migrar(
    {
      versao: 3,
      colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
      contatos: [
        { id: "c1", nome: "Ana", colunaId: "k1" },
        { id: "c2", nome: "Bruno", colunaId: "k1", workspaceOrigemId: "ws-antigo" },
      ],
      negocios: [],
    },
    "ws-atual",
  );
  assert.equal(estado.contatos[0].workspaceOrigemId, "ws-atual");
  // Procedencia ja registrada nao e reescrita: ela e o que a fusao no CORE usa.
  assert.equal(estado.contatos[1].workspaceOrigemId, "ws-antigo");
});

// ------------------------------------------------- interacoes e tarefas

test("interacoes saem do contato pro jsonl, com ordem e datas preservadas", () => {
  const resultado = migrar({
    versao: 3,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [{
      id: "c1",
      nome: "Padaria Aurora",
      colunaId: "k1",
      interacoes: [
        { id: "i1", em: "2026-07-10T10:00:00.000Z", tipo: "reuniao", texto: "Briefing" },
        { id: "i2", em: "2026-07-01T10:00:00.000Z", tipo: "ligacao", texto: "Fechamos" },
      ],
      tarefas: [],
    }],
    negocios: [],
  });
  assert.deepEqual(
    resultado.interacoesExtraidas.map((i) => [i.id, i.contatoId, i.em, i.tipo, i.texto]),
    [
      ["i1", "c1", "2026-07-10T10:00:00.000Z", "reuniao", "Briefing"],
      ["i2", "c1", "2026-07-01T10:00:00.000Z", "ligacao", "Fechamos"],
    ],
  );
  // criadaEm nasce igual ao em: o arquivo antigo nao guardava os dois.
  assert.equal(resultado.interacoesExtraidas[0].criadaEm, "2026-07-10T10:00:00.000Z");
  assert.equal("interacoes" in resultado.estado.contatos[0], false);
});

test("interacao sem id ganha id estavel, pra nao duplicar na segunda rodada", () => {
  const bruto = {
    versao: 3,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [{
      id: "c1",
      nome: "Ana",
      colunaId: "k1",
      interacoes: [{ em: "2026-07-10T10:00:00.000Z", tipo: "nota", texto: "Oi" }],
    }],
    negocios: [],
  };
  assert.equal(migrar(bruto).interacoesExtraidas[0].id, "i-c1-0");
  assert.equal(migrar(bruto).interacoesExtraidas[0].id, "i-c1-0");
});

test("tarefas saem do contato pra lista de topo, com o vinculo preenchido", () => {
  const { estado } = migrar({
    versao: 3,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [{
      id: "c1",
      nome: "Ana",
      colunaId: "k1",
      tarefas: [
        {
          id: "t1",
          texto: "Enviar contrato",
          feita: false,
          prazo: "2026-08-01T12:00:00.000Z",
          criadaEm: "2026-07-10T10:00:00.000Z",
        },
      ],
    }],
    negocios: [],
  });
  assert.deepEqual(estado.tarefas, [{
    id: "t1",
    texto: "Enviar contrato",
    feita: false,
    criadaEm: "2026-07-10T10:00:00.000Z",
    prazo: "2026-08-01T12:00:00.000Z",
    contatoId: "c1",
  }]);
  assert.equal("tarefas" in estado.contatos[0], false);
});

// -------------------------------------------------------------- estagio

test("cada contato ganha uma linha de estagio na migracao", () => {
  const resultado = migrar({
    versao: 3,
    colunas: [{ id: "k1", nome: "Conversando", ordem: 0 }],
    contatos: [{
      id: "c1",
      nome: "Ana",
      colunaId: "k1",
      criadoEm: "2026-07-01T10:00:00.000Z",
    }],
    negocios: [],
  });
  assert.deepEqual(resultado.estagiosExtraidos, [{
    id: "e-c1-migracao",
    contatoId: "c1",
    colunaId: "k1",
    colunaNome: "Conversando",
    entrouEm: "2026-07-01T10:00:00.000Z",
  }]);
});

test("arquivo que ja e v4 nao gera linha de estagio de novo", () => {
  const resultado = migrar({
    versao: 4,
    colunas: [{ id: "k1", nome: "Conversando", ordem: 0, tipo: "aberto" }],
    organizacoes: [],
    contatos: [{
      id: "c1",
      nome: "Ana",
      colunaId: "k1",
      tags: [],
      workspaceOrigemId: "ws-teste",
      criadoEm: "2026-07-01T10:00:00.000Z",
      atualizadoEm: "2026-07-01T10:00:00.000Z",
    }],
    negocios: [],
    orcamentos: [],
    tarefas: [],
  });
  assert.deepEqual(resultado.estagiosExtraidos, []);
  assert.equal(resultado.precisaSalvar, false);
});

// ----------------------------------------------------------- recuperacao

// A v3 descartava estes dois casos. Dado do usuario e sagrado: nada some.
test("negocio sem titulo e recuperado em vez de descartado", () => {
  const resultado = migrar({
    versao: 3,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0 }],
    contatos: [{ id: "c1", nome: "Ana", colunaId: "k1" }],
    negocios: [{ id: "n1", contatoId: "c1", valorEstimado: 4500 }],
  });
  assert.equal(resultado.estado.negocios.length, 1);
  assert.equal(resultado.estado.negocios[0].titulo, "Sem titulo");
  assert.equal(resultado.estado.negocios[0].valorEstimado, 4500);
  assert.match(resultado.recuperados.join(" "), /sem titulo/i);
});

test("negocio orfao ganha o contato de recuperacao, com rastro", () => {
  const resultado = migrar({
    versao: 3,
    colunas: [
      { id: "k1", nome: "Novo", ordem: 0 },
      { id: "k2", nome: "Fechado", ordem: 1 },
    ],
    contatos: [{ id: "c1", nome: "Ana", colunaId: "k1" }],
    negocios: [
      { id: "n1", titulo: "Site", contatoId: "c-que-sumiu", valorEstimado: 9000 },
      { id: "n2", titulo: "Sem dono nenhum" },
    ],
  });
  const dono = resultado.estado.contatos.find((c) => c.id === ID_CONTATO_RECUPERACAO);
  assert.ok(dono, "o contato de recuperacao precisa existir");
  assert.equal(dono.nome, NOME_CONTATO_RECUPERACAO);
  // Nasce na primeira coluna do funil.
  assert.equal(dono.colunaId, "k1");
  assert.equal(resultado.estado.negocios.length, 2);
  for (const negocio of resultado.estado.negocios) {
    assert.equal(negocio.contatoId, ID_CONTATO_RECUPERACAO);
  }
  assert.equal(resultado.recuperados.length, 2);
  assert.match(resultado.recuperados[0], /c-que-sumiu/);
});

test("orcamento orfao ganha negocio de recuperacao em vez de sumir", () => {
  const resultado = migrar({
    versao: 4,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0, tipo: "aberto" }],
    organizacoes: [],
    contatos: [],
    negocios: [],
    orcamentos: [{ id: "q1", negocioId: "n-que-sumiu", valor: 3200, status: "enviado" }],
    tarefas: [],
  });
  assert.equal(resultado.estado.orcamentos.length, 1);
  assert.equal(resultado.estado.orcamentos[0].valor, 3200);
  const negocio = resultado.estado.negocios.find(
    (n) => n.id === resultado.estado.orcamentos[0].negocioId,
  );
  assert.ok(negocio, "o orcamento precisa ter um negocio de verdade");
  assert.match(resultado.recuperados.join(" "), /n-que-sumiu/);
});

test("tarefa com vinculo quebrado perde o vinculo mas nao o texto", () => {
  const resultado = migrar({
    versao: 4,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0, tipo: "aberto" }],
    organizacoes: [],
    contatos: [],
    negocios: [],
    orcamentos: [],
    tarefas: [{ id: "t1", texto: "Ligar amanha", feita: false, contatoId: "c-sumiu" }],
  });
  assert.equal(resultado.estado.tarefas.length, 1);
  assert.equal(resultado.estado.tarefas[0].texto, "Ligar amanha");
  assert.equal(resultado.estado.tarefas[0].contatoId, undefined);
  assert.match(resultado.recuperados.join(" "), /c-sumiu/);
});

test("contato sem nome e sem coluna e recuperado, nunca descartado", () => {
  const { estado } = migrar({
    versao: 3,
    colunas: [
      { id: "k1", nome: "Novo", ordem: 0 },
      { id: "k2", nome: "Fechado", ordem: 1 },
    ],
    contatos: [{ id: "c1" }, { nome: "Sem id" }],
    negocios: [],
  });
  assert.equal(estado.contatos.length, 2);
  assert.equal(estado.contatos[0].nome, "Sem nome");
  assert.equal(estado.contatos[0].colunaId, "k1");
  assert.ok(estado.contatos[1].id, "id ausente precisa ganhar um id novo");
});

// ------------------------------------------------------------- negocios

// Na v3 o unico sinal de ganho ou perdido era a coluna do dono. Ignorar isso
// deixaria todo negocio antigo marcado como aberto, e o funil continuaria
// mentindo depois da migracao.
test("status do negocio antigo sai do tipo da coluna do dono", () => {
  const { estado } = migrar({
    versao: 3,
    colunas: [
      { id: "k1", nome: "Conversando", ordem: 0 },
      { id: "k2", nome: "Fechado", ordem: 1 },
      { id: "k3", nome: "Perdido", ordem: 2 },
    ],
    contatos: [
      { id: "c1", nome: "Ana", colunaId: "k1" },
      { id: "c2", nome: "Bruno", colunaId: "k2" },
      { id: "c3", nome: "Carla", colunaId: "k3" },
    ],
    negocios: [
      { id: "n1", titulo: "A", contatoId: "c1" },
      { id: "n2", titulo: "B", contatoId: "c2" },
      { id: "n3", titulo: "C", contatoId: "c3" },
    ],
  });
  assert.deepEqual(estado.negocios.map((n) => n.status), ["aberto", "ganho", "perdido"]);
});

test("campos novos do negocio sobrevivem a uma releitura", () => {
  const negocio = {
    id: "n1",
    titulo: "Retainer",
    contatoId: "c1",
    status: "aberto",
    valorEstimado: 1000,
    valorFechado: 900,
    fechadoEm: "2026-07-20T10:00:00.000Z",
    proximaAcaoEm: "2026-07-30T10:00:00.000Z",
    proximaAcaoTexto: "Mandar a proposta",
    escopo: "Tres posts por semana",
    recorrente: true,
    valorMensal: 1500,
    diaDoCiclo: 5,
    participantes: [{ contatoId: "c1", papel: "decide" }],
    criadoEm: "2026-07-01T10:00:00.000Z",
    atualizadoEm: "2026-07-01T10:00:00.000Z",
  };
  const { estado } = migrar({
    versao: 4,
    colunas: [{ id: "k1", nome: "Novo", ordem: 0, tipo: "aberto" }],
    organizacoes: [],
    contatos: [{
      id: "c1",
      nome: "Ana",
      colunaId: "k1",
      tags: [],
      workspaceOrigemId: "ws-teste",
      criadoEm: "2026-07-01T10:00:00.000Z",
      atualizadoEm: "2026-07-01T10:00:00.000Z",
    }],
    negocios: [negocio],
    orcamentos: [],
    tarefas: [],
  });
  assert.deepEqual(estado.negocios[0], negocio);
});

// ------------------------------------------------------------ v1 e v2

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

test("contato v1 cheio chega inteiro na v4", () => {
  const resultado = migrar(fixtureV1);
  assert.equal(resultado.precisaSalvar, true);
  assert.equal(resultado.estado.versao, 4);

  const contato = resultado.estado.contatos[0];
  assert.equal(contato.id, "c-cheio");
  assert.equal(contato.nome, "Maria Completa");
  assert.equal(contato.colunaId, "proposta");
  assert.equal(contato.telefone, "+55 11 99999-8888");
  assert.equal(contato.telefoneNormalizado, "+5511999998888");
  assert.equal(contato.email, "maria@acme.test");
  assert.equal(contato.origem, "Indicacao");
  assert.deepEqual(contato.tags, ["VIP", "Retorno"]);
  assert.equal(contato.proximoContato, "2026-08-01T15:30:00.000Z");
  assert.equal(contato.criadoEm, "2026-07-01T10:00:00.000Z");
  assert.equal(contato.workspaceOrigemId, "ws-teste");

  // A empresa virou entidade.
  assert.equal(resultado.estado.organizacoes[0].nome, "Acme");
  assert.equal(contato.organizacaoId, resultado.estado.organizacoes[0].id);

  // As notas viraram interacoes no jsonl, na mesma ordem.
  assert.deepEqual(
    resultado.interacoesExtraidas.map(({ em, tipo, texto }) => ({ em, tipo, texto })),
    [
      { em: "2026-07-15T12:00:00.000Z", tipo: "nota", texto: "Nota mais nova" },
      { em: "2026-07-10T09:00:00.000Z", tipo: "nota", texto: "Nota anterior" },
    ],
  );

  // O valor solto virou negocio.
  assert.equal(resultado.estado.negocios.length, 1);
  assert.equal(resultado.estado.negocios[0].valorEstimado, 9876.54);
  assert.equal(resultado.estado.negocios[0].contatoId, "c-cheio");
  assert.equal(resultado.estado.negocios[0].status, "aberto");
});

test("v2 leva o estagio do negocio mais recente pro contato", () => {
  const { estado } = migrar({
    versao: 2,
    colunas: [
      { id: "k1", nome: "Novo", ordem: 0 },
      { id: "k2", nome: "Fechado", ordem: 1 },
    ],
    contatos: [{ id: "c1", nome: "Ana" }],
    negocios: [
      {
        id: "n1",
        titulo: "Antigo",
        contatoId: "c1",
        colunaId: "k1",
        atualizadoEm: "2026-06-01T10:00:00.000Z",
      },
      {
        id: "n2",
        titulo: "Recente",
        contatoId: "c1",
        colunaId: "k2",
        atualizadoEm: "2026-07-01T10:00:00.000Z",
      },
    ],
  });
  assert.equal(estado.contatos[0].colunaId, "k2");
  assert.equal(estado.negocios.length, 2);
  // O estagio saiu do negocio: quem caminha no funil e o contato.
  assert.equal("colunaId" in estado.negocios[0], false);
});

// ---------------------------------------------------------- idempotencia

test("migrar duas vezes nao duplica nada", () => {
  const primeira = migrar(fixtureV1);
  const segunda = migrar(JSON.parse(JSON.stringify(primeira.estado)) as EstadoCrm);
  assert.equal(segunda.precisaSalvar, false);
  assert.equal(segunda.estado.contatos.length, 1);
  assert.equal(segunda.estado.negocios.length, 1);
  assert.equal(segunda.estado.organizacoes.length, 1);
  assert.deepEqual(segunda.interacoesExtraidas, []);
  assert.deepEqual(segunda.estagiosExtraidos, []);
  assert.deepEqual(segunda.estado, primeira.estado);
});
