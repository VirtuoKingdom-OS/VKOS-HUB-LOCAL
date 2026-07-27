// Guarda do furo provado em 2026-07-26: o upgrade do WebSocket aceitava
// qualquer origem. A guarda de Host do index.ts nao alcanca esse caso, porque
// um site externo aberto numa aba manda Host local e WebSocket e isento de CORS.
//
// E a guarda do escopo, de 2026-07-27: sessao:evento repassa o stream cru do
// provedor (o Cerebro do cliente, trechos de arquivo lido) e ia em broadcast pra
// toda aba, com o frontend filtrando pelo workspaceId do payload. Agora o
// servidor e quem decide. Se transmitirPara vazar, o teste abaixo quebra.

import assert from "node:assert/strict";
import test from "node:test";
import { AddressInfo } from "node:net";

import Fastify from "fastify";
import { WebSocket } from "ws";

import {
  configurarWs,
  lerDeclaracaoDeWorkspace,
  origemPermitida,
  transmitir,
  transmitirPara,
} from "./ws.js";

const PORTA = 4600;
const DEV = "http://localhost:5173";

test("aceita a propria origem do Hub, nas duas formas de loopback", () => {
  assert.equal(origemPermitida("http://127.0.0.1:4600", PORTA, DEV), true);
  assert.equal(origemPermitida("http://localhost:4600", PORTA, DEV), true);
});

test("aceita a origem do dev do Vite", () => {
  assert.equal(origemPermitida(DEV, PORTA, DEV), true);
});

test("recusa site externo", () => {
  assert.equal(
    origemPermitida("https://site-malicioso.com", PORTA, DEV),
    false,
  );
  assert.equal(origemPermitida("http://evil.local", PORTA, DEV), false);
});

test("recusa a porta errada no proprio loopback", () => {
  assert.equal(origemPermitida("http://127.0.0.1:9999", PORTA, DEV), false);
});

test("recusa https no loopback, que o Hub nunca serve", () => {
  assert.equal(origemPermitida("https://127.0.0.1:4600", PORTA, DEV), false);
});

test("aceita origem ausente, que e cliente fora do navegador", () => {
  // Site malicioso NAO consegue suprimir o header: o navegador sempre carimba
  // a origem real. Ausencia significa script local ou ferramenta de teste.
  assert.equal(origemPermitida(undefined, PORTA, DEV), true);
});

test("acompanha a porta configurada por VKOS_PORT", () => {
  assert.equal(origemPermitida("http://127.0.0.1:46210", 46210, DEV), true);
  assert.equal(origemPermitida("http://127.0.0.1:4600", 46210, DEV), false);
});

// -------------------------------------------------------- escopo por cliente

test("declaracao de workspace so aceita a mensagem certa", () => {
  assert.equal(lerDeclaracaoDeWorkspace('{"tipo":"workspace","workspaceId":"a"}'), "a");
  // Sair de todo workspace e uma declaracao valida: devolve "".
  assert.equal(lerDeclaracaoDeWorkspace('{"tipo":"workspace"}'), "");
  // Qualquer outra coisa nao e declaracao, e o socket ignora.
  assert.equal(lerDeclaracaoDeWorkspace('{"tipo":"outra","workspaceId":"a"}'), null);
  assert.equal(lerDeclaracaoDeWorkspace("nao e json"), null);
  assert.equal(lerDeclaracaoDeWorkspace(Buffer.from('{"tipo":"workspace","workspaceId":"b"}')), "b");
  assert.equal(lerDeclaracaoDeWorkspace(42), null);
});

// Sobe um servidor de verdade e conecta clientes de verdade. Nao da pra provar
// escopo com objeto falso: o que se quer garantir e que o byte nao sai pelo
// socket errado.
async function comServidor(
  corpo: (base: string) => Promise<void>,
): Promise<void> {
  const app = Fastify({ logger: false });
  await configurarWs(app, 0, DEV);
  await app.listen({ port: 0, host: "127.0.0.1" });
  const porta = (app.server.address() as AddressInfo).port;
  try {
    await corpo(`ws://127.0.0.1:${porta}/ws`);
  } finally {
    await app.close();
  }
}

// Cliente com caixa de entrada. Guarda tudo que chegar, pra o teste conferir
// depois inclusive o que NAO deveria ter chegado.
function conectar(url: string): Promise<{ socket: WebSocket; recebidas: string[] }> {
  return new Promise((resolver, rejeitar) => {
    const socket = new WebSocket(url);
    const recebidas: string[] = [];
    socket.on("message", (dado) => recebidas.push(dado.toString()));
    socket.on("open", () => resolver({ socket, recebidas }));
    socket.on("error", rejeitar);
  });
}

// Espera o suficiente pro que foi enviado chegar (ou provar que nao chegou).
function respirar(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, 60));
}

test("transmitirPara nao entrega o do workspace B pra quem esta no A", async () => {
  await comServidor(async (base) => {
    const a = await conectar(`${base}?workspace=cliente-a`);
    const b = await conectar(`${base}?workspace=cliente-b`);
    const mudo = await conectar(base);
    await respirar();

    transmitirPara("cliente-b", { tipo: "sessao:evento", segredo: "cerebro do B" });
    await respirar();

    assert.deepEqual(a.recebidas, [], "a aba do cliente A nao pode ver nada do B");
    assert.equal(b.recebidas.length, 1);
    assert.equal(JSON.parse(b.recebidas[0]).segredo, "cerebro do B");
    assert.deepEqual(mudo.recebidas, [], "quem nao declarou workspace nao recebe escopo");

    a.socket.close();
    b.socket.close();
    mudo.socket.close();
  });
});

test("transmitir continua chegando em todo mundo, inclusive em quem nao declarou", async () => {
  await comServidor(async (base) => {
    const a = await conectar(`${base}?workspace=cliente-a`);
    const mudo = await conectar(base);
    await respirar();

    // workspace:ativado precisa continuar em broadcast: toda aba tem que saber
    // que o cliente ativo mudou, inclusive a que ainda nao declarou nada.
    transmitir({ tipo: "workspace:ativado", id: "cliente-b" });
    await respirar();

    assert.equal(a.recebidas.length, 1);
    assert.equal(mudo.recebidas.length, 1);
    assert.equal(JSON.parse(mudo.recebidas[0]).id, "cliente-b");

    a.socket.close();
    mudo.socket.close();
  });
});

test("trocar de cliente pelo socket muda o escopo sem reconectar", async () => {
  await comServidor(async (base) => {
    const aba = await conectar(`${base}?workspace=cliente-a`);
    await respirar();

    // A aba foi pro cliente B e avisa pela conexao que ja existe.
    aba.socket.send(JSON.stringify({ tipo: "workspace", workspaceId: "cliente-b" }));
    await respirar();

    transmitirPara("cliente-a", { tipo: "sessao:evento", de: "a" });
    transmitirPara("cliente-b", { tipo: "sessao:evento", de: "b" });
    await respirar();

    assert.equal(aba.recebidas.length, 1, "a aba nao pode continuar presa no cliente antigo");
    assert.equal(JSON.parse(aba.recebidas[0]).de, "b");

    aba.socket.close();
  });
});
