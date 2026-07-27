import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";

import {
  adicionarWorkspace,
  lerRegistro,
  marcarAtivo,
  pastaDadosWorkspace,
  salvarRegistro,
} from "../workspaces/estado.js";
import { rotasCrm } from "./rotas.js";

// As rotas do CRM dependem do workspace ativo. O teste registra um workspace
// proprio, guarda o registro real antes e restaura no fim, pra nao deixar
// rastro nos dados do usuario.
let app: FastifyInstance;
let workspaceId: string;
let registroOriginal: ReturnType<typeof lerRegistro>;

before(async () => {
  registroOriginal = structuredClone(lerRegistro());
  const pasta = mkdtempSync(join(tmpdir(), "vkos-crm-rotas-"));
  const workspace = adicionarWorkspace(pasta, "Teste rotas CRM");
  workspaceId = workspace.id;
  marcarAtivo(workspaceId);
  app = Fastify();
  await app.register(rotasCrm, { prefix: "/api" });
  await app.ready();
});

after(async () => {
  await app.close();
  const pasta = pastaDadosWorkspace(workspaceId);
  if (existsSync(pasta)) rmSync(pasta, { recursive: true, force: true });
  salvarRegistro(registroOriginal);
});

async function chamar(
  metodo: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  payload?: Record<string, unknown>,
) {
  const resposta = await app.inject({ method: metodo, url, payload });
  return { status: resposta.statusCode, corpo: resposta.json() as Record<string, unknown> };
}

async function criarContato(nome: string): Promise<string> {
  const { status, corpo } = await chamar("POST", "/api/crm/contatos", { nome });
  assert.equal(status, 201);
  return corpo.id as string;
}

// --------------------------------------------------------------- estado

test("GET /crm devolve o estado v4 com todas as listas", async () => {
  const { status, corpo } = await chamar("GET", "/api/crm");
  assert.equal(status, 200);
  assert.equal(corpo.versao, 4);
  for (const lista of [
    "colunas",
    "organizacoes",
    "contatos",
    "negocios",
    "orcamentos",
    "tarefas",
  ]) {
    assert.ok(Array.isArray(corpo[lista]), `${lista} precisa vir como lista`);
  }
  // O funil nasce com as cinco colunas padrao ja tipadas.
  const colunas = corpo.colunas as Array<{ nome: string; tipo: string }>;
  assert.equal(colunas.length, 5);
  assert.equal(colunas[3].tipo, "ganho");
  assert.equal(colunas[4].tipo, "perdido");
});

// ------------------------------------------------------------- contatos

test("POST /crm/contatos cria com 201 e ja normaliza o telefone", async () => {
  const { status, corpo } = await chamar("POST", "/api/crm/contatos", {
    nome: "Padaria Aurora",
    telefone: "(31) 99999-8888",
    empresa: "Aurora ME",
    tags: ["cliente", "cliente", "VIP"],
  });
  assert.equal(status, 201);
  assert.equal(corpo.nome, "Padaria Aurora");
  assert.equal(corpo.telefoneNormalizado, "+5531999998888");
  assert.equal(corpo.workspaceOrigemId, workspaceId);
  // Tag repetida entra uma vez so.
  assert.deepEqual(corpo.tags, ["cliente", "VIP"]);

  // A empresa virou organizacao de verdade, com o contato apontando pra ela.
  const estado = (await chamar("GET", "/api/crm")).corpo;
  const organizacoes = estado.organizacoes as Array<{ id: string; nome: string }>;
  const aurora = organizacoes.find((o) => o.nome === "Aurora ME");
  assert.ok(aurora);
  assert.equal(corpo.organizacaoId, aurora.id);
});

test("POST /crm/contatos sem nome responde 400", async () => {
  const { status, corpo } = await chamar("POST", "/api/crm/contatos", { telefone: "31999998888" });
  assert.equal(status, 400);
  assert.match(corpo.erro as string, /nome/i);
});

test("PATCH /crm/contatos atualiza e apaga campo com valor vazio", async () => {
  const id = await criarContato("Cliente a editar");
  const alterado = await chamar("PATCH", `/api/crm/contatos/${id}`, {
    nome: "Cliente editado",
    email: "novo@teste.test",
    cadenciaDias: 15,
  });
  assert.equal(alterado.status, 200);
  assert.equal(alterado.corpo.nome, "Cliente editado");
  assert.equal(alterado.corpo.cadenciaDias, 15);

  const limpo = await chamar("PATCH", `/api/crm/contatos/${id}`, { email: "" });
  assert.equal(limpo.status, 200);
  assert.equal(limpo.corpo.email, undefined);
});

test("PATCH /crm/contatos com id inexistente responde 404", async () => {
  const { status, corpo } = await chamar("PATCH", "/api/crm/contatos/c-nao-existe", {
    nome: "Fantasma",
  });
  assert.equal(status, 404);
  assert.match(corpo.erro as string, /nao encontrado/i);
});

test("PATCH /crm/contatos recusa data invalida com 400", async () => {
  const id = await criarContato("Cliente com data");
  const { status, corpo } = await chamar("PATCH", `/api/crm/contatos/${id}`, {
    proximoContato: "amanha de tarde",
  });
  assert.equal(status, 400);
  assert.match(corpo.erro as string, /data valida/i);
});

test("DELETE /crm/contatos remove e o segundo DELETE responde 404", async () => {
  const id = await criarContato("Cliente a excluir");
  const primeiro = await chamar("DELETE", `/api/crm/contatos/${id}`);
  assert.equal(primeiro.status, 200);
  assert.equal(primeiro.corpo.ok, true);
  assert.equal((await chamar("DELETE", `/api/crm/contatos/${id}`)).status, 404);
});

test("PATCH mover troca o estagio e grava o historico", async () => {
  const id = await criarContato("Cliente que anda");
  const colunas = (await chamar("GET", "/api/crm")).corpo.colunas as Array<{ id: string }>;
  const movido = await chamar("PATCH", `/api/crm/contatos/${id}/mover`, {
    colunaId: colunas[3].id,
    indice: 0,
  });
  assert.equal(movido.status, 200);
  assert.equal(movido.corpo.colunaId, colunas[3].id);

  const { status, corpo } = await chamar("GET", `/api/crm/contatos/${id}/estagios`);
  assert.equal(status, 200);
  const estagios = corpo.estagios as Array<{ colunaId: string; colunaNome: string }>;
  // Uma linha no nascimento da ficha, outra na mudanca de coluna.
  assert.equal(estagios.length, 2);
  assert.equal(estagios[1].colunaId, colunas[3].id);
  assert.equal(estagios[1].colunaNome, "Fechado");
});

test("PATCH mover pra coluna inexistente responde 404", async () => {
  const id = await criarContato("Cliente parado");
  const { status } = await chamar("PATCH", `/api/crm/contatos/${id}/mover`, {
    colunaId: "k-nao-existe",
  });
  assert.equal(status, 404);
});

// ---------------------------------------------------------- interacoes

test("POST interacao responde 201 e a linha aparece no GET", async () => {
  const id = await criarContato("Cliente que fala");
  const criada = await chamar("POST", `/api/crm/contatos/${id}/interacoes`, {
    tipo: "ligacao",
    texto: "Liguei e ficou de retornar",
  });
  assert.equal(criada.status, 201);
  assert.equal(criada.corpo.contatoId, id);

  const { corpo } = await chamar("GET", `/api/crm/contatos/${id}/interacoes`);
  const interacoes = corpo.interacoes as Array<{ texto: string; tipo: string }>;
  assert.equal(interacoes.length, 1);
  assert.equal(interacoes[0].texto, "Liguei e ficou de retornar");
});

test("POST interacao com tipo invalido responde 400", async () => {
  const id = await criarContato("Cliente calado");
  const { status, corpo } = await chamar("POST", `/api/crm/contatos/${id}/interacoes`, {
    tipo: "telepatia",
    texto: "Pensei nele",
  });
  assert.equal(status, 400);
  assert.match(corpo.erro as string, /tipo de interacao/i);
});

test("POST interacao em contato inexistente responde 404", async () => {
  const { status } = await chamar("POST", "/api/crm/contatos/c-nao-existe/interacoes", {
    tipo: "nota",
    texto: "Oi",
  });
  assert.equal(status, 404);
});

// ------------------------------------------------------- organizacoes

test("organizacao aceita POST, PATCH e DELETE sem levar o contato junto", async () => {
  const criada = await chamar("POST", "/api/crm/organizacoes", {
    nome: "Clinica Bela",
    documento: "12.345.678/0001-90",
  });
  assert.equal(criada.status, 201);
  const organizacaoId = criada.corpo.id as string;

  const contato = await chamar("POST", "/api/crm/contatos", {
    nome: "Dono da clinica",
    organizacaoId,
  });
  assert.equal(contato.status, 201);
  assert.equal(contato.corpo.organizacaoId, organizacaoId);

  const alterada = await chamar("PATCH", `/api/crm/organizacoes/${organizacaoId}`, {
    site: "clinicabela.test",
  });
  assert.equal(alterada.status, 200);
  assert.equal(alterada.corpo.site, "clinicabela.test");

  const removida = await chamar("DELETE", `/api/crm/organizacoes/${organizacaoId}`);
  assert.equal(removida.status, 200);
  const estado = (await chamar("GET", "/api/crm")).corpo;
  const contatos = estado.contatos as Array<{ id: string; organizacaoId?: string }>;
  const ainda = contatos.find((c) => c.id === contato.corpo.id);
  // O contato sobrevive a exclusao da organizacao: perde so o vinculo.
  assert.ok(ainda);
  assert.equal(ainda.organizacaoId, undefined);
});

test("POST organizacao sem nome responde 400 e nome repetido responde 409", async () => {
  assert.equal((await chamar("POST", "/api/crm/organizacoes", {})).status, 400);
  const primeira = await chamar("POST", "/api/crm/organizacoes", { nome: "Repetida SA" });
  assert.equal(primeira.status, 201);
  const segunda = await chamar("POST", "/api/crm/organizacoes", { nome: "repetida sa" });
  assert.equal(segunda.status, 409);
});

test("PATCH organizacao inexistente responde 404", async () => {
  const { status } = await chamar("PATCH", "/api/crm/organizacoes/o-nao-existe", {
    nome: "Fantasma",
  });
  assert.equal(status, 404);
});

// ------------------------------------------------------------ negocios

test("negocio nasce aberto e aceita os campos novos", async () => {
  const contatoId = await criarContato("Cliente com negocio");
  const criado = await chamar("POST", "/api/crm/negocios", {
    contatoId,
    titulo: "Site institucional",
    valorEstimado: 4500,
  });
  assert.equal(criado.status, 201);
  assert.equal(criado.corpo.status, "aberto");

  const alterado = await chamar("PATCH", `/api/crm/negocios/${criado.corpo.id}`, {
    status: "ganho",
    valorFechado: 4200,
    proximaAcaoTexto: "Marcar o kickoff",
    recorrente: true,
    diaDoCiclo: 10,
  });
  assert.equal(alterado.status, 200);
  assert.equal(alterado.corpo.status, "ganho");
  assert.equal(alterado.corpo.valorFechado, 4200);
  assert.equal(alterado.corpo.recorrente, true);
  assert.equal(alterado.corpo.diaDoCiclo, 10);
});

test("negocio recusa status invalido, valor negativo e dia de ciclo fora da faixa", async () => {
  const contatoId = await criarContato("Cliente exigente");
  const base = { contatoId, titulo: "Projeto" };
  assert.equal(
    (await chamar("POST", "/api/crm/negocios", { ...base, status: "quase" })).status,
    400,
  );
  assert.equal(
    (await chamar("POST", "/api/crm/negocios", { ...base, valorEstimado: -10 })).status,
    400,
  );
  assert.equal(
    (await chamar("POST", "/api/crm/negocios", { ...base, diaDoCiclo: 99 })).status,
    400,
  );
});

test("POST negocio com contato inexistente responde 404", async () => {
  const { status } = await chamar("POST", "/api/crm/negocios", {
    contatoId: "c-nao-existe",
    titulo: "Projeto orfao",
  });
  assert.equal(status, 404);
});

test("DELETE negocio responde 200 e depois 404", async () => {
  const contatoId = await criarContato("Cliente a desistir");
  const criado = await chamar("POST", "/api/crm/negocios", {
    contatoId,
    titulo: "Vai cair",
  });
  const id = criado.corpo.id as string;
  assert.equal((await chamar("DELETE", `/api/crm/negocios/${id}`)).status, 200);
  assert.equal((await chamar("DELETE", `/api/crm/negocios/${id}`)).status, 404);
});

// ---------------------------------------------------------- orcamentos

test("orcamento nasce rascunho, atualiza status e some junto com o negocio", async () => {
  const contatoId = await criarContato("Cliente com proposta");
  const negocio = await chamar("POST", "/api/crm/negocios", {
    contatoId,
    titulo: "Proposta grande",
  });
  const negocioId = negocio.corpo.id as string;

  const criado = await chamar("POST", "/api/crm/orcamentos", { negocioId, valor: 8000 });
  assert.equal(criado.status, 201);
  assert.equal(criado.corpo.status, "rascunho");
  assert.equal(criado.corpo.valor, 8000);

  const enviado = await chamar("PATCH", `/api/crm/orcamentos/${criado.corpo.id}`, {
    status: "enviado",
    enviadoEm: "2026-07-20T10:00:00.000Z",
    validoAte: "2026-08-20T10:00:00.000Z",
  });
  assert.equal(enviado.status, 200);
  assert.equal(enviado.corpo.status, "enviado");
  assert.equal(enviado.corpo.validoAte, "2026-08-20T10:00:00.000Z");

  // Excluir o negocio leva o orcamento dele junto: ele so existia por causa dele.
  await chamar("DELETE", `/api/crm/negocios/${negocioId}`);
  const estado = (await chamar("GET", "/api/crm")).corpo;
  const orcamentos = estado.orcamentos as Array<{ id: string }>;
  assert.equal(orcamentos.some((o) => o.id === criado.corpo.id), false);
});

test("orcamento recusa payload invalido e negocio inexistente", async () => {
  const contatoId = await criarContato("Cliente sem proposta");
  const negocio = await chamar("POST", "/api/crm/negocios", { contatoId, titulo: "Base" });
  const negocioId = negocio.corpo.id as string;
  // Sem valor.
  assert.equal((await chamar("POST", "/api/crm/orcamentos", { negocioId })).status, 400);
  // Status que nao existe.
  assert.equal(
    (await chamar("POST", "/api/crm/orcamentos", { negocioId, valor: 10, status: "meio" })).status,
    400,
  );
  // Negocio que nao existe.
  assert.equal(
    (await chamar("POST", "/api/crm/orcamentos", { negocioId: "n-nao-existe", valor: 10 })).status,
    404,
  );
  assert.equal((await chamar("DELETE", "/api/crm/orcamentos/q-nao-existe")).status, 404);
});

// ------------------------------------------------------------- tarefas

test("tarefa nasce de topo, aceita vinculo e sobrevive ao negocio", async () => {
  const contatoId = await criarContato("Cliente com pendencia");
  const negocio = await chamar("POST", "/api/crm/negocios", {
    contatoId,
    titulo: "Com tarefa",
  });
  const negocioId = negocio.corpo.id as string;

  const criada = await chamar("POST", "/api/crm/tarefas", {
    texto: "Mandar o contrato",
    contatoId,
    negocioId,
    prazo: "2026-08-01T12:00:00.000Z",
  });
  assert.equal(criada.status, 201);
  assert.equal(criada.corpo.feita, false);
  assert.equal(criada.corpo.contatoId, contatoId);
  assert.equal(criada.corpo.negocioId, negocioId);

  const feita = await chamar("PATCH", `/api/crm/tarefas/${criada.corpo.id}`, { feita: true });
  assert.equal(feita.status, 200);
  assert.equal(feita.corpo.feita, true);

  // Excluir o negocio nao apaga a tarefa: o texto dela e trabalho do usuario.
  await chamar("DELETE", `/api/crm/negocios/${negocioId}`);
  const estado = (await chamar("GET", "/api/crm")).corpo;
  const tarefas = estado.tarefas as Array<{ id: string; negocioId?: string }>;
  const ainda = tarefas.find((t) => t.id === criada.corpo.id);
  assert.ok(ainda);
  assert.equal(ainda.negocioId, undefined);
});

test("atalho de tarefa pelo contato preenche o vinculo sozinho", async () => {
  const contatoId = await criarContato("Cliente com atalho");
  const { status, corpo } = await chamar("POST", `/api/crm/contatos/${contatoId}/tarefas`, {
    texto: "Confirmar reuniao",
  });
  assert.equal(status, 201);
  assert.equal(corpo.contatoId, contatoId);
});

test("tarefa recusa texto vazio e feita que nao e booleano", async () => {
  assert.equal((await chamar("POST", "/api/crm/tarefas", { texto: "   " })).status, 400);
  const criada = await chamar("POST", "/api/crm/tarefas", { texto: "Valida" });
  const { status, corpo } = await chamar("PATCH", `/api/crm/tarefas/${criada.corpo.id}`, {
    feita: "sim",
  });
  assert.equal(status, 400);
  assert.match(corpo.erro as string, /verdadeiro ou falso/i);
});

test("DELETE tarefa responde 200 e depois 404", async () => {
  const criada = await chamar("POST", "/api/crm/tarefas", { texto: "Some depois" });
  const id = criada.corpo.id as string;
  assert.equal((await chamar("DELETE", `/api/crm/tarefas/${id}`)).status, 200);
  assert.equal((await chamar("DELETE", `/api/crm/tarefas/${id}`)).status, 404);
});

// ------------------------------------------------------------- colunas

test("coluna aceita tipo e dias para esfriar, e recusa tipo invalido", async () => {
  const criada = await chamar("POST", "/api/crm/colunas", {
    nome: "Em negociacao",
    tipo: "aberto",
    diasParaEsfriar: 7,
  });
  assert.equal(criada.status, 201);
  assert.equal(criada.corpo.tipo, "aberto");
  assert.equal(criada.corpo.diasParaEsfriar, 7);

  const alterada = await chamar("PATCH", `/api/crm/colunas/${criada.corpo.id}`, {
    nome: "Negociando",
    tipo: "ganho",
  });
  assert.equal(alterada.status, 200);
  assert.equal(alterada.corpo.nome, "Negociando");
  assert.equal(alterada.corpo.tipo, "ganho");

  const invalida = await chamar("PATCH", `/api/crm/colunas/${criada.corpo.id}`, {
    tipo: "mais ou menos",
  });
  assert.equal(invalida.status, 400);
  assert.equal((await chamar("DELETE", `/api/crm/colunas/${criada.corpo.id}`)).status, 200);
});

test("PATCH coluna inexistente responde 404", async () => {
  const { status } = await chamar("PATCH", "/api/crm/colunas/k-nao-existe", { nome: "X" });
  assert.equal(status, 404);
});

test("reordenar colunas recusa payload que nao e lista de ids", async () => {
  const { status, corpo } = await chamar("PATCH", "/api/crm/colunas/reordenar", {
    ordem: "primeira, segunda",
  });
  assert.equal(status, 400);
  assert.match(corpo.erro as string, /lista de ids/i);
});
