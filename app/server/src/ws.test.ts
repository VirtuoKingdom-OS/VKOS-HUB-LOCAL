// Guarda do furo provado em 2026-07-26: o upgrade do WebSocket aceitava
// qualquer origem. A guarda de Host do index.ts nao alcanca esse caso, porque
// um site externo aberto numa aba manda Host local e WebSocket e isento de CORS.

import assert from "node:assert/strict";
import test from "node:test";

import { origemPermitida } from "./ws.js";

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
