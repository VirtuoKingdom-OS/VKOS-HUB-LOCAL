import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { criarContato, lerEstado, lerEstagios, lerInteracoes } from "./estado.js";
import { NOME_DUPLICATAS } from "./fusao.js";

// Todo caso monta uma raiz de dados temporaria com o mesmo desenho de
// app/dados/ e aponta o CRM pra ela pelo VKOS_DADOS_TESTE. Nada aqui toca o
// funil real nem o crm.json de um cliente de verdade.
function raizTemp(nome: string): string {
  const raiz = mkdtempSync(join(tmpdir(), `vkos-fusao-${nome}-`));
  mkdirSync(join(raiz, "workspaces"), { recursive: true });
  process.env.VKOS_DADOS_TESTE = raiz;
  return raiz;
}

function limpar(raiz: string): void {
  delete process.env.VKOS_DADOS_TESTE;
  rmSync(raiz, { recursive: true, force: true });
}

function pastaCliente(raiz: string, id: string): string {
  const pasta = join(raiz, "workspaces", id);
  mkdirSync(pasta, { recursive: true });
  return pasta;
}

// Escreve um crm.json de cliente ja na v4, pra fusao ser o unico assunto do
// teste. Cada caso passa so o que importa pra ele.
function gravarCrm(pasta: string, estado: Record<string, unknown>): void {
  writeFileSync(
    join(pasta, "crm.json"),
    JSON.stringify({
      versao: 4,
      colunas: [],
      organizacoes: [],
      contatos: [],
      negocios: [],
      orcamentos: [],
      tarefas: [],
      ...estado,
    }),
    "utf8",
  );
}

function contato(campos: Record<string, unknown>): Record<string, unknown> {
  return {
    tags: [],
    criadoEm: "2026-06-01T10:00:00.000Z",
    atualizadoEm: "2026-06-01T10:00:00.000Z",
    ...campos,
  };
}

function lerDuplicatas(raiz: string): Array<Record<string, string>> {
  const caminho = join(raiz, "crm", NOME_DUPLICATAS);
  if (!existsSync(caminho)) return [];
  return readFileSync(caminho, "utf8")
    .split("\n")
    .filter((linha) => linha.trim())
    .map((linha) => JSON.parse(linha) as Record<string, string>);
}

// ------------------------------------------------------------------ colunas

test("coluna de mesmo nome escrita diferente vira uma so, com os contatos dos dois", () => {
  const raiz = raizTemp("colunas");
  try {
    gravarCrm(pastaCliente(raiz, "w-1"), {
      colunas: [
        { id: "k-a1", nome: "Não iniciados", ordem: 0, tipo: "aberto" },
        { id: "k-a2", nome: "Conversando", ordem: 1, tipo: "aberto" },
      ],
      contatos: [contato({ id: "c-a", nome: "Da Padaria", colunaId: "k-a2" })],
    });
    gravarCrm(pastaCliente(raiz, "w-2"), {
      colunas: [{ id: "k-b1", nome: "  conversando  ", ordem: 0, tipo: "aberto" }],
      contatos: [contato({ id: "c-b", nome: "Da Clinica", colunaId: "k-b1" })],
    });

    const estado = lerEstado();

    // Dois nomes distintos entre os dois clientes, entao duas colunas.
    assert.deepEqual(
      estado.colunas.map((coluna) => coluna.nome),
      ["Não iniciados", "Conversando"],
    );
    // A ordem foi recalculada em sequencia.
    assert.deepEqual(estado.colunas.map((coluna) => coluna.ordem), [0, 1]);

    const conversando = estado.colunas.find((coluna) => coluna.nome === "Conversando");
    assert.ok(conversando);
    // O que mais importa: o contato do segundo cliente foi remapeado pra coluna
    // vencedora, em vez de ficar apontando pra um id que nao existe mais.
    assert.equal(conversando.id, "k-a2");
    const porNome = new Map(estado.contatos.map((c) => [c.nome, c.colunaId]));
    assert.equal(porNome.get("Da Padaria"), "k-a2");
    assert.equal(porNome.get("Da Clinica"), "k-a2");
  } finally {
    limpar(raiz);
  }
});

// ------------------------------------------------------------- colisao de id

test("id de contato repetido entre clientes e renomeado, e o negocio segue o dono certo", () => {
  const raiz = raizTemp("colisao");
  try {
    gravarCrm(pastaCliente(raiz, "w-1"), {
      colunas: [{ id: "k-1", nome: "Conversando", ordem: 0, tipo: "aberto" }],
      contatos: [contato({ id: "c-igual", nome: "Contato do primeiro", colunaId: "k-1" })],
      negocios: [{
        id: "n-igual",
        titulo: "Negocio do primeiro",
        contatoId: "c-igual",
        status: "aberto",
        criadoEm: "2026-06-01T10:00:00.000Z",
        atualizadoEm: "2026-06-01T10:00:00.000Z",
      }],
      tarefas: [{
        id: "t-igual",
        texto: "Tarefa do primeiro",
        feita: false,
        contatoId: "c-igual",
        negocioId: "n-igual",
        criadaEm: "2026-06-01T10:00:00.000Z",
      }],
    });
    gravarCrm(pastaCliente(raiz, "w-2"), {
      colunas: [{ id: "k-2", nome: "Conversando", ordem: 0, tipo: "aberto" }],
      contatos: [contato({ id: "c-igual", nome: "Contato do segundo", colunaId: "k-2" })],
      negocios: [{
        id: "n-igual",
        titulo: "Negocio do segundo",
        contatoId: "c-igual",
        status: "aberto",
        criadoEm: "2026-06-01T10:00:00.000Z",
        atualizadoEm: "2026-06-01T10:00:00.000Z",
      }],
      tarefas: [{
        id: "t-igual",
        texto: "Tarefa do segundo",
        feita: false,
        contatoId: "c-igual",
        negocioId: "n-igual",
        criadaEm: "2026-06-01T10:00:00.000Z",
      }],
    });

    const estado = lerEstado();

    // Ninguem se perdeu e os ids ficaram distintos.
    assert.equal(estado.contatos.length, 2);
    const primeiro = estado.contatos.find((c) => c.nome === "Contato do primeiro");
    const segundo = estado.contatos.find((c) => c.nome === "Contato do segundo");
    assert.ok(primeiro && segundo);
    assert.equal(primeiro.id, "c-igual");
    assert.notEqual(segundo.id, primeiro.id);
    // A procedencia diz de qual cliente cada um veio.
    assert.equal(primeiro.workspaceOrigemId, "w-1");
    assert.equal(segundo.workspaceOrigemId, "w-2");

    // O negocio do segundo aponta pro contato do segundo, nao pro do primeiro.
    const negocioDoSegundo = estado.negocios.find((n) => n.titulo === "Negocio do segundo");
    const negocioDoPrimeiro = estado.negocios.find((n) => n.titulo === "Negocio do primeiro");
    assert.ok(negocioDoSegundo && negocioDoPrimeiro);
    assert.equal(negocioDoSegundo.contatoId, segundo.id);
    assert.equal(negocioDoPrimeiro.contatoId, primeiro.id);
    assert.notEqual(negocioDoSegundo.id, negocioDoPrimeiro.id);

    // E a tarefa do segundo tambem, nos dois vinculos.
    const tarefaDoSegundo = estado.tarefas.find((t) => t.texto === "Tarefa do segundo");
    assert.ok(tarefaDoSegundo);
    assert.equal(tarefaDoSegundo.contatoId, segundo.id);
    assert.equal(tarefaDoSegundo.negocioId, negocioDoSegundo.id);
  } finally {
    limpar(raiz);
  }
});

test("orcamento acompanha o negocio renomeado na colisao", () => {
  const raiz = raizTemp("orcamento");
  try {
    for (const id of ["w-1", "w-2"]) {
      gravarCrm(pastaCliente(raiz, id), {
        colunas: [{ id: `k-${id}`, nome: "Conversando", ordem: 0, tipo: "aberto" }],
        contatos: [contato({ id: "c-igual", nome: `Contato ${id}`, colunaId: `k-${id}` })],
        negocios: [{
          id: "n-igual",
          titulo: `Negocio ${id}`,
          contatoId: "c-igual",
          status: "aberto",
          criadoEm: "2026-06-01T10:00:00.000Z",
          atualizadoEm: "2026-06-01T10:00:00.000Z",
        }],
        orcamentos: [{
          id: "q-igual",
          negocioId: "n-igual",
          valor: id === "w-1" ? 100 : 200,
          status: "rascunho",
          criadoEm: "2026-06-01T10:00:00.000Z",
          atualizadoEm: "2026-06-01T10:00:00.000Z",
        }],
      });
    }

    const estado = lerEstado();
    assert.equal(estado.orcamentos.length, 2);
    const doSegundo = estado.orcamentos.find((o) => o.valor === 200);
    const negocioDoSegundo = estado.negocios.find((n) => n.titulo === "Negocio w-2");
    assert.ok(doSegundo && negocioDoSegundo);
    assert.equal(doSegundo.negocioId, negocioDoSegundo.id);
  } finally {
    limpar(raiz);
  }
});

// ------------------------------------------------------------- idempotencia

test("ler duas vezes nao duplica contato, interacao nem estagio", () => {
  const raiz = raizTemp("duasvezes");
  try {
    const pasta = pastaCliente(raiz, "w-1");
    gravarCrm(pasta, {
      colunas: [{ id: "k-1", nome: "Conversando", ordem: 0, tipo: "aberto" }],
      contatos: [contato({ id: "c-1", nome: "Padaria Aurora", colunaId: "k-1" })],
    });
    writeFileSync(
      join(pasta, "interacoes.jsonl"),
      JSON.stringify({
        id: "i-1",
        contatoId: "c-1",
        em: "2026-07-01T10:00:00.000Z",
        tipo: "ligacao",
        texto: "Primeiro toque",
        criadaEm: "2026-07-01T10:00:00.000Z",
      }) + "\n",
      "utf8",
    );
    writeFileSync(
      join(pasta, "estagios.jsonl"),
      JSON.stringify({
        id: "e-1",
        contatoId: "c-1",
        colunaId: "k-1",
        colunaNome: "Conversando",
        entrouEm: "2026-06-01T10:00:00.000Z",
      }) + "\n",
      "utf8",
    );

    const primeira = lerEstado();
    const segunda = lerEstado();

    assert.equal(primeira.contatos.length, 1);
    assert.deepEqual(segunda, primeira);
    assert.equal(lerInteracoes().length, 1);
    assert.equal(lerInteracoes()[0].texto, "Primeiro toque");
    assert.equal(lerEstagios().length, 1);
    assert.equal(lerEstagios()[0].colunaNome, "Conversando");
  } finally {
    limpar(raiz);
  }
});

// ------------------------------------------------------------- casos vazios

test("cliente sem crm.json e ignorado sem quebrar", () => {
  const raiz = raizTemp("semcrm");
  try {
    // Um cliente com pasta de dados, mas sem CRM nenhum.
    pastaCliente(raiz, "w-vazio");
    gravarCrm(pastaCliente(raiz, "w-1"), {
      colunas: [{ id: "k-1", nome: "Conversando", ordem: 0, tipo: "aberto" }],
      contatos: [contato({ id: "c-1", nome: "Unico", colunaId: "k-1" })],
    });

    const estado = lerEstado();
    assert.equal(estado.contatos.length, 1);
    assert.equal(estado.contatos[0].nome, "Unico");
    // A pasta do cliente sem CRM ficou intocada.
    assert.deepEqual(readdirSync(join(raiz, "workspaces", "w-vazio")), []);
  } finally {
    limpar(raiz);
  }
});

test("sem cliente nenhum o CRM nasce vazio e funcional", () => {
  const raiz = raizTemp("semcliente");
  try {
    const estado = lerEstado();
    assert.equal(estado.versao, 4);
    assert.equal(estado.contatos.length, 0);
    // As cinco colunas padrao nascem junto.
    assert.equal(estado.colunas.length, 5);
    assert.equal(existsSync(join(raiz, "crm", "crm.json")), true);

    // Funcional: da pra criar contato sem cliente aberto, e ele persiste.
    const criado = criarContato({ nome: "Primeiro do funil" });
    assert.equal(lerEstado().contatos.some((c) => c.id === criado.id), true);
    assert.equal(lerEstagios(criado.id).length, 1);
  } finally {
    limpar(raiz);
  }
});

// ------------------------------------------------------------- duplicatas

test("telefone igual em dois clientes vira suspeita, e os dois contatos continuam vivos", () => {
  const raiz = raizTemp("duplicata");
  try {
    gravarCrm(pastaCliente(raiz, "w-1"), {
      colunas: [{ id: "k-1", nome: "Conversando", ordem: 0, tipo: "aberto" }],
      contatos: [contato({
        id: "c-1",
        nome: "Padaria Aurora",
        colunaId: "k-1",
        telefone: "(31) 99999-8888",
      })],
    });
    gravarCrm(pastaCliente(raiz, "w-2"), {
      colunas: [{ id: "k-2", nome: "Conversando", ordem: 0, tipo: "aberto" }],
      contatos: [contato({
        id: "c-2",
        nome: "Padaria Aurora ME",
        colunaId: "k-2",
        telefone: "+55 31 99999 8888",
      })],
    });

    const estado = lerEstado();

    // Nada foi fundido: os dois contatos continuam la, com nome e id proprios.
    assert.equal(estado.contatos.length, 2);
    assert.deepEqual(
      estado.contatos.map((c) => c.id).sort(),
      ["c-1", "c-2"],
    );

    const linhas = lerDuplicatas(raiz);
    assert.equal(linhas.length, 1);
    const linha = linhas[0];
    assert.equal(linha.oQueBateu, "telefone");
    assert.equal(linha.valor, "+5531999998888");
    assert.equal(linha.contatoA, "c-1");
    assert.equal(linha.workspaceA, "w-1");
    assert.equal(linha.contatoB, "c-2");
    assert.equal(linha.workspaceB, "w-2");
  } finally {
    limpar(raiz);
  }
});

test("chaveExterna igual em dois clientes tambem vira suspeita", () => {
  const raiz = raizTemp("chave");
  try {
    for (const id of ["w-1", "w-2"]) {
      gravarCrm(pastaCliente(raiz, id), {
        colunas: [{ id: `k-${id}`, nome: "Conversando", ordem: 0, tipo: "aberto" }],
        contatos: [contato({
          id: `c-${id}`,
          nome: `Lead ${id}`,
          colunaId: `k-${id}`,
          chaveExterna: "google-maps:place-42",
        })],
      });
    }

    assert.equal(lerEstado().contatos.length, 2);
    const linhas = lerDuplicatas(raiz);
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].oQueBateu, "chaveExterna");
    assert.equal(linhas[0].valor, "google-maps:place-42");
  } finally {
    limpar(raiz);
  }
});

// ------------------------------------------------------ arquivos de origem

test("os arquivos de origem sao renomeados e o conteudo fica intacto", () => {
  const raiz = raizTemp("rename");
  try {
    const pasta = pastaCliente(raiz, "w-1");
    gravarCrm(pasta, {
      colunas: [{ id: "k-1", nome: "Conversando", ordem: 0, tipo: "aberto" }],
      contatos: [contato({ id: "c-1", nome: "Padaria Aurora", colunaId: "k-1" })],
    });
    const linhaInteracao = JSON.stringify({
      id: "i-1",
      contatoId: "c-1",
      em: "2026-07-01T10:00:00.000Z",
      tipo: "nota",
      texto: "Anotado",
      criadaEm: "2026-07-01T10:00:00.000Z",
    }) + "\n";
    writeFileSync(join(pasta, "interacoes.jsonl"), linhaInteracao, "utf8");
    const crmOriginal = readFileSync(join(pasta, "crm.json"), "utf8");

    lerEstado();

    // Os originais sairam do caminho, entao a fusao nunca roda duas vezes.
    assert.equal(existsSync(join(pasta, "crm.json")), false);
    assert.equal(existsSync(join(pasta, "interacoes.jsonl")), false);

    const migrados = readdirSync(pasta).filter((nome) =>
      nome.includes(".migrado-para-core-"),
    );
    assert.equal(migrados.length, 2, "crm.json e interacoes.jsonl foram marcados");

    // E o conteudo chegou do outro lado byte a byte.
    const crmMigrado = migrados.find((nome) => nome.startsWith("crm.json"));
    const interacoesMigradas = migrados.find((nome) => nome.startsWith("interacoes.jsonl"));
    assert.ok(crmMigrado && interacoesMigradas);
    assert.equal(readFileSync(join(pasta, crmMigrado), "utf8"), crmOriginal);
    assert.equal(readFileSync(join(pasta, interacoesMigradas), "utf8"), linhaInteracao);
  } finally {
    limpar(raiz);
  }
});

// -------------------------------------------------------- origem invalida

test("crm.json quebrado de um cliente nao derruba a fusao dos outros", () => {
  const raiz = raizTemp("quebrado");
  try {
    const quebrado = pastaCliente(raiz, "w-1");
    writeFileSync(join(quebrado, "crm.json"), "{ isto nao e json", "utf8");
    gravarCrm(pastaCliente(raiz, "w-2"), {
      colunas: [{ id: "k-2", nome: "Conversando", ordem: 0, tipo: "aberto" }],
      contatos: [contato({ id: "c-2", nome: "Sobrevivente", colunaId: "k-2" })],
    });

    const estado = lerEstado();
    assert.equal(estado.contatos.length, 1);
    assert.equal(estado.contatos[0].nome, "Sobrevivente");

    // O arquivo ilegivel continua onde estava, sem rename e sem perda.
    assert.equal(readFileSync(join(quebrado, "crm.json"), "utf8"), "{ isto nao e json");
    // E o usuario tem onde ler sobre isso.
    const rastro = readFileSync(join(raiz, "crm", "recuperacoes.jsonl"), "utf8");
    assert.match(rastro, /w-1/);
  } finally {
    limpar(raiz);
  }
});
