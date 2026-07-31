// O CRM ao vivo, do lado do servidor.
//
// O que precisa de prova aqui: gravou, avisou; leu, nao avisou; falhou, nao
// avisou. E o aviso sai por WebSocket de verdade, nao por objeto falso: o hook
// que dispara vive dentro do plugin de rotas, e um erro de encapsulamento do
// Fastify (hook no escopo errado) so aparece com o socket ligado.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";
import { WebSocket } from "ws";

import {
  adicionarWorkspace,
  lerRegistro,
  marcarAtivo,
  pastaDadosWorkspace,
  salvarRegistro,
} from "../workspaces/estado.js";
import { configurarWs } from "../nucleo/ws.js";
import { deveAvisar, escopoDaRota, montarAviso } from "./aovivo.js";
import { rotasCrm } from "./rotas.js";

let app: FastifyInstance;
let workspaceId: string;
let raizDados: string;
let registroOriginal: ReturnType<typeof lerRegistro>;
let base: string;

// Mesmo cuidado do rotas.test.ts: o funil vai pra uma raiz temporaria, senao o
// teste grava no CRM real do usuario.
before(async () => {
  registroOriginal = structuredClone(lerRegistro());
  raizDados = mkdtempSync(join(tmpdir(), "vkos-crm-aovivo-"));
  process.env.VKOS_DADOS_TESTE = raizDados;
  const pasta = mkdtempSync(join(tmpdir(), "vkos-crm-aovivo-ws-"));
  workspaceId = adicionarWorkspace(pasta, "Teste CRM ao vivo").id;
  marcarAtivo(workspaceId);

  app = Fastify({ logger: false });
  await configurarWs(app, 0, "http://localhost:5173");
  await app.register(rotasCrm, { prefix: "/api" });
  // Vizinho de prefixo, pra provar que o hook do CRM fica dentro do plugin
  // dele. Se vazar, todo POST do app (sessao, upload, canvas) viraria um aviso
  // falso de CRM e a tela recarregaria a base sem motivo nenhum.
  await app.register(
    async (parte) => {
      parte.post("/vizinho", async () => ({ ok: true }));
    },
    { prefix: "/api" },
  );
  await app.listen({ port: 0, host: "127.0.0.1" });
  base = `ws://127.0.0.1:${(app.server.address() as AddressInfo).port}/ws`;
});

after(async () => {
  await app.close();
  const pasta = pastaDadosWorkspace(workspaceId);
  if (existsSync(pasta)) rmSync(pasta, { recursive: true, force: true });
  rmSync(raizDados, { recursive: true, force: true });
  delete process.env.VKOS_DADOS_TESTE;
  salvarRegistro(registroOriginal);
});

interface Aba {
  socket: WebSocket;
  avisos: Record<string, unknown>[];
}

function abrirAba(): Promise<Aba> {
  return new Promise((resolver, rejeitar) => {
    const socket = new WebSocket(base);
    const avisos: Record<string, unknown>[] = [];
    socket.on("message", (dado) => {
      avisos.push(JSON.parse(dado.toString()) as Record<string, unknown>);
    });
    socket.on("open", () => resolver({ socket, avisos }));
    socket.on("error", rejeitar);
  });
}

function respirar(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, 60));
}

// Toda chamada de preparacao afirma o status: um POST que devolvesse 400 sem
// ninguem notar faria a falha aparecer tres passos adiante, ilegivel.
async function chamar(
  metodo: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  opcoes: { payload?: Record<string, unknown>; aba?: string; status?: number } = {},
): Promise<Record<string, unknown>> {
  const resposta = await app.inject({
    method: metodo,
    url,
    ...(opcoes.payload ? { payload: opcoes.payload } : {}),
    ...(opcoes.aba ? { headers: { "x-vkos-aba": opcoes.aba } } : {}),
  });
  if (opcoes.status !== undefined) {
    assert.equal(
      resposta.statusCode,
      opcoes.status,
      `${metodo} ${url} devolveu ${resposta.statusCode}: ${resposta.body}`,
    );
  }
  return resposta.json() as Record<string, unknown>;
}

// ------------------------------------------------------------- as regras

test("so gravacao bem sucedida avisa", () => {
  assert.equal(deveAvisar("POST", 201), true);
  assert.equal(deveAvisar("PATCH", 200), true);
  assert.equal(deveAvisar("DELETE", 200), true);
  assert.equal(deveAvisar("GET", 200), false);
  assert.equal(deveAvisar("POST", 400), false);
  assert.equal(deveAvisar("PATCH", 404), false);
});

test("so as rotas de historico entram no escopo de interacoes", () => {
  assert.equal(escopoDaRota("/api/crm/contatos/:id/interacoes"), "interacoes");
  assert.equal(escopoDaRota("/api/crm/contatos/:id/notas"), "interacoes");
  assert.equal(escopoDaRota("/api/crm/contatos/:id"), "funil");
  assert.equal(escopoDaRota("/api/crm/colunas/reordenar"), "funil");
  assert.equal(escopoDaRota("/api/crm/negocios/:id"), "funil");
});

test("o aviso nunca carrega dado de contato", () => {
  const aviso = montarAviso({ escopo: "interacoes", contatoId: "c-1", origem: "aba-1" });
  assert.deepEqual(aviso, {
    tipo: "crm:atualizado",
    escopo: "interacoes",
    contatoId: "c-1",
    origem: "aba-1",
  });
  // contatoId so faz sentido no historico: no funil ele sugeriria que so aquele
  // contato mudou, e uma exclusao de coluna move contato que nem foi citado.
  assert.deepEqual(montarAviso({ escopo: "funil", contatoId: "c-1" }), {
    tipo: "crm:atualizado",
    escopo: "funil",
  });
});

// ---------------------------------------------------------- pelo socket

test("criar contato avisa as abas com escopo de funil", async () => {
  const aba = await abrirAba();
  await respirar();

  const contato = await chamar("POST", "/api/crm/contatos", {
    payload: { nome: "Cliente do aviso" },
    status: 201,
  });
  await respirar();

  assert.equal(aba.avisos.length, 1, "a gravacao precisa avisar uma vez");
  assert.deepEqual(aba.avisos[0], { tipo: "crm:atualizado", escopo: "funil" });
  assert.ok(contato.id);
  aba.socket.close();
});

test("registrar interacao avisa o historico daquele contato, sem pedir o funil", async () => {
  const contato = await chamar("POST", "/api/crm/contatos", {
    payload: { nome: "Cliente da interacao" },
    status: 201,
  });
  const id = contato.id as string;

  const aba = await abrirAba();
  await respirar();

  await chamar("POST", `/api/crm/contatos/${id}/interacoes`, {
    payload: { tipo: "ligacao", texto: "Liguei agora." },
    status: 201,
  });
  await respirar();

  assert.equal(aba.avisos.length, 1);
  assert.deepEqual(aba.avisos[0], {
    tipo: "crm:atualizado",
    escopo: "interacoes",
    contatoId: id,
  });
  aba.socket.close();
});

test("a aba que gravou volta identificada, pra nao recarregar por causa de si mesma", async () => {
  const contato = await chamar("POST", "/api/crm/contatos", {
    payload: { nome: "Cliente da origem" },
    status: 201,
  });

  const aba = await abrirAba();
  await respirar();

  await chamar("PATCH", `/api/crm/contatos/${contato.id as string}`, {
    payload: { telefone: "31999998888" },
    aba: "aba-que-gravou",
    status: 200,
  });
  await respirar();

  assert.equal(aba.avisos.length, 1);
  assert.deepEqual(aba.avisos[0], {
    tipo: "crm:atualizado",
    escopo: "funil",
    origem: "aba-que-gravou",
  });
  aba.socket.close();
});

test("leitura e gravacao recusada nao avisam ninguem", async () => {
  const aba = await abrirAba();
  await respirar();

  await chamar("GET", "/api/crm", { status: 200 });
  await chamar("GET", "/api/crm/interacoes/ultimas", { status: 200 });
  // Nome vazio e recusado: 400 nao pode virar aviso de mudanca.
  await chamar("POST", "/api/crm/contatos", { payload: { nome: "  " }, status: 400 });
  // Id que nao existe: 404 tambem nao mudou nada.
  await chamar("PATCH", "/api/crm/contatos/nao-existe", {
    payload: { nome: "x" },
    status: 404,
  });
  await respirar();

  assert.deepEqual(aba.avisos, []);
  aba.socket.close();
});

test("gravacao de outro modulo nao vira aviso de CRM", async () => {
  const aba = await abrirAba();
  await respirar();

  await chamar("POST", "/api/vizinho", { status: 200 });
  await respirar();

  assert.deepEqual(aba.avisos, [], "o hook do CRM nao pode alcancar outras rotas");
  aba.socket.close();
});

test("o aviso do CRM chega em toda aba, com ou sem cliente declarado", async () => {
  // O CRM subiu pro nivel CORE: o funil e o mesmo pra qualquer aba do dono.
  // Uma aba que declarou um cliente e outra que nao declarou nada precisam
  // receber igual, senao a tela do CRM de uma delas fica velha em silencio.
  const semCliente = await abrirAba();
  const comCliente = await abrirAba();
  comCliente.socket.send(JSON.stringify({ tipo: "workspace", workspaceId: workspaceId }));
  await respirar();

  await chamar("POST", "/api/crm/contatos", {
    payload: { nome: "Cliente do CORE" },
    status: 201,
  });
  await respirar();

  assert.equal(semCliente.avisos.length, 1);
  assert.equal(comCliente.avisos.length, 1);
  semCliente.socket.close();
  comCliente.socket.close();
});
