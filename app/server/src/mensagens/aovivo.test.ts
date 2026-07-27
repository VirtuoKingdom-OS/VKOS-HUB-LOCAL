// As conversas ao vivo, do lado do servidor.
//
// O que precisa de prova aqui: gravou, avisou; leu, nao avisou; e o aviso NAO
// LEVA TEXTO DE MENSAGEM. O socket e broadcast pra todas as abas, e o conteudo
// da conversa e o dado mais sensivel do CRM. Por isso a prova e feita com o
// socket de verdade, e nao com objeto falso: um erro de encapsulamento de hook
// do Fastify so aparece com o barramento ligado.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";
import { WebSocket } from "ws";

import { rotasCrm } from "../crm/rotas.js";
import { configurarWs } from "../ws.js";
import { escopoDaRotaMensagens, montarAvisoMensagens } from "./aovivo.js";
import { rotasMensagens } from "./rotas.js";

let app: FastifyInstance;
let raizDados: string;
let base: string;

before(async () => {
  raizDados = mkdtempSync(join(tmpdir(), "vkos-mensagens-aovivo-"));
  process.env.VKOS_DADOS_TESTE = raizDados;
  app = Fastify({ logger: false });
  await configurarWs(app, 0, "http://localhost:5173");
  await app.register(rotasCrm, { prefix: "/api" });
  await app.register(rotasMensagens, { prefix: "/api" });
  await app.listen({ port: 0, host: "127.0.0.1" });
  base = `ws://127.0.0.1:${(app.server.address() as AddressInfo).port}/ws`;
});

after(async () => {
  await app.close();
  rmSync(raizDados, { recursive: true, force: true });
  delete process.env.VKOS_DADOS_TESTE;
});

interface Aba {
  socket: WebSocket;
  avisos: Record<string, unknown>[];
  cru: string[];
}

function abrirAba(): Promise<Aba> {
  return new Promise((resolver, rejeitar) => {
    const socket = new WebSocket(base);
    const avisos: Record<string, unknown>[] = [];
    const cru: string[] = [];
    socket.on("message", (dado) => {
      const texto = dado.toString();
      cru.push(texto);
      avisos.push(JSON.parse(texto) as Record<string, unknown>);
    });
    socket.on("open", () => resolver({ socket, avisos, cru }));
    socket.on("error", rejeitar);
  });
}

function respirar(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, 60));
}

async function chamar(
  metodo: "GET" | "POST" | "PATCH",
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

async function prepararConversa(nome: string): Promise<string> {
  const contato = await chamar("POST", "/api/crm/contatos", {
    payload: { nome },
    status: 201,
  });
  const conversa = await chamar("POST", "/api/crm/mensagens/conversas", {
    payload: { contatoId: contato.id },
    status: 201,
  });
  return conversa.id as string;
}

// ------------------------------------------------------------- as regras

test("so o que muda o conteudo da conversa entra no escopo de thread", () => {
  assert.equal(
    escopoDaRotaMensagens("/api/crm/mensagens/conversas/:id/mensagens"),
    "thread",
  );
  assert.equal(escopoDaRotaMensagens("/api/crm/mensagens/conversas/:id/lida"), "thread");
  assert.equal(escopoDaRotaMensagens("/api/crm/mensagens/conversas"), "conversas");
  assert.equal(escopoDaRotaMensagens("/api/crm/mensagens/conversas/:id"), "conversas");
});

test("o aviso so carrega id, escopo e origem", () => {
  assert.deepEqual(
    montarAvisoMensagens({ escopo: "thread", conversaId: "cv-1", origem: "aba-1" }),
    {
      tipo: "mensagens:atualizadas",
      escopo: "thread",
      conversaId: "cv-1",
      origem: "aba-1",
    },
  );
  assert.deepEqual(montarAvisoMensagens({ escopo: "conversas" }), {
    tipo: "mensagens:atualizadas",
    escopo: "conversas",
  });
});

// ----------------------------------------------------------- pelo socket

test("registrar mensagem avisa a thread e NAO manda o texto pelo socket", async () => {
  const conversaId = await prepararConversa("Cliente do sigilo");
  const aba = await abrirAba();
  await respirar();

  const segredo = "meu cartao termina em 4417 e a senha do portao e 9182";
  await chamar("POST", `/api/crm/mensagens/conversas/${conversaId}/mensagens`, {
    payload: { direcao: "entrada", texto: segredo },
    aba: "aba-que-gravou",
    status: 201,
  });
  await respirar();

  assert.equal(aba.avisos.length, 1);
  assert.deepEqual(aba.avisos[0], {
    tipo: "mensagens:atualizadas",
    escopo: "thread",
    conversaId,
    origem: "aba-que-gravou",
  });
  // A prova que importa: nem o texto, nem um pedaco dele, nem a previa saem no
  // barramento. Quem quiser o conteudo pede pela rota, com o id na mao.
  for (const bruto of aba.cru) {
    assert.equal(bruto.includes(segredo), false, "texto de mensagem no socket");
    assert.equal(bruto.includes("4417"), false, "trecho de mensagem no socket");
    assert.equal(bruto.includes("previa"), false, "previa no socket");
  }
  aba.socket.close();
});

test("criar conversa e mudar status avisam a lista, sem tocar em thread", async () => {
  const contato = await chamar("POST", "/api/crm/contatos", {
    payload: { nome: "Cliente da lista" },
    status: 201,
  });
  const aba = await abrirAba();
  await respirar();

  const conversa = await chamar("POST", "/api/crm/mensagens/conversas", {
    payload: { contatoId: contato.id },
    status: 201,
  });
  await chamar("PATCH", `/api/crm/mensagens/conversas/${conversa.id as string}`, {
    payload: { status: "resolvida" },
    status: 200,
  });
  await respirar();

  assert.deepEqual(
    aba.avisos.map((aviso) => aviso.escopo),
    ["conversas", "conversas"],
  );
  aba.socket.close();
});

test("marcar como lida avisa a thread daquela conversa", async () => {
  const conversaId = await prepararConversa("Cliente lido");
  const aba = await abrirAba();
  await respirar();

  await chamar("POST", `/api/crm/mensagens/conversas/${conversaId}/lida`, {
    status: 200,
  });
  await respirar();

  assert.equal(aba.avisos.length, 1);
  assert.deepEqual(aba.avisos[0], {
    tipo: "mensagens:atualizadas",
    escopo: "thread",
    conversaId,
  });
  aba.socket.close();
});

test("leitura e gravacao recusada nao avisam ninguem", async () => {
  const conversaId = await prepararConversa("Cliente calado");
  const aba = await abrirAba();
  await respirar();

  await chamar("GET", "/api/crm/mensagens/conversas", { status: 200 });
  await chamar("GET", `/api/crm/mensagens/conversas/${conversaId}`, { status: 200 });
  await chamar("POST", `/api/crm/mensagens/conversas/${conversaId}/mensagens`, {
    payload: { direcao: "saida", texto: "   " },
    status: 400,
  });
  await chamar("POST", "/api/crm/mensagens/conversas", {
    payload: { contatoId: "c-nao-existe" },
    status: 404,
  });
  await respirar();

  assert.deepEqual(aba.avisos, []);
  aba.socket.close();
});

test("cada hook fica no seu plugin: CRM avisa CRM, conversa avisa conversa", async () => {
  const aba = await abrirAba();
  await respirar();

  const contato = await chamar("POST", "/api/crm/contatos", {
    payload: { nome: "Cliente das fronteiras" },
    status: 201,
  });
  await respirar();
  assert.deepEqual(
    aba.avisos.map((aviso) => aviso.tipo),
    ["crm:atualizado"],
    "criar contato nao pode virar aviso de conversa",
  );

  await chamar("POST", "/api/crm/mensagens/conversas", {
    payload: { contatoId: contato.id },
    status: 201,
  });
  await respirar();
  assert.deepEqual(
    aba.avisos.map((aviso) => aviso.tipo),
    ["crm:atualizado", "mensagens:atualizadas"],
    "criar conversa nao pode virar aviso de funil",
  );
  aba.socket.close();
});
