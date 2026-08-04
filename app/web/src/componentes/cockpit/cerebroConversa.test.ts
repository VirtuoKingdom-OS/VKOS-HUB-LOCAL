// Travas da conversa com o Cerebro.
//
// O prompt daqui e injecao de conteudo num processo de IA, entao o teste
// AFIRMA O CONTEUDO INJETADO. Teste que passaria com a injecao apagada nao e
// teste.

import assert from "node:assert/strict";
import test from "node:test";

import type { Sessao } from "../../tipos/dominio.js";
import {
  TITULO_CERIMONIA,
  acharSessaoDoCerebro,
  promptDeConversaComCerebro,
  sessaoDoCerebroMorreu,
} from "./cerebroConversa.js";

function sessao(parcial: Partial<Sessao> & { id: string }): Sessao {
  return {
    provedor: "claude",
    titulo: TITULO_CERIMONIA,
    prompt: "/instalar",
    status: "concluida",
    criadaEm: "2026-08-04T10:00:00.000Z",
    atualizadaEm: "2026-08-04T10:00:00.000Z",
    pastaTrabalho: "C:/vkos",
    ...parcial,
  } as Sessao;
}

test("a conversa do Cerebro e a mais recente com o titulo fixo", () => {
  const encontrada = acharSessaoDoCerebro([
    sessao({ id: "a" }),
    sessao({ id: "outra", titulo: "Campanha, promo de julho" }),
    sessao({ id: "b" }),
  ]);
  assert.equal(encontrada?.id, "b");
});

test("sem nenhuma sessao com o titulo, nao ha conversa", () => {
  assert.equal(acharSessaoDoCerebro([sessao({ id: "x", titulo: "Outro" })]), undefined);
  assert.equal(acharSessaoDoCerebro([]), undefined);
});

test("sessao ausente conta como morta", () => {
  // A aba Chat abre antes de existir qualquer entrevista, e esse caso precisa
  // cair na faixa de "comece outra", nunca num campo que engole o texto.
  assert.equal(sessaoDoCerebroMorreu(undefined, false), true);
});

test("sessao parada sem o id do provedor esta morta, com ele nao", () => {
  // O Hub reiniciado no meio de um turno deixa a sessao parada e sem
  // sessionIdClaude. O gerenciador recusa retomar assim, e recusar DEPOIS que
  // a pessoa escreveu e pior do que avisar antes.
  assert.equal(sessaoDoCerebroMorreu(sessao({ id: "a", status: "parada" }), false), true);
  assert.equal(
    sessaoDoCerebroMorreu(sessao({ id: "a", sessionIdClaude: "cl-1" }), false),
    false,
  );
});

test("sessao rodando nunca e morta, mesmo sem o id do provedor ainda", () => {
  // Entre criar a sessao e o provedor devolver o id existe uma janela. Chamar
  // isso de morta ali desligaria o campo no meio da primeira resposta.
  assert.equal(sessaoDoCerebroMorreu(sessao({ id: "a", status: "rodando" }), true), false);
});

test("o prompt da conversa nova aponta pro arquivo do Cerebro", () => {
  const prompt = promptDeConversaComCerebro("deixa a voz mais direta");
  assert.ok(
    prompt.includes("`cerebro/cerebro.md`"),
    "sem o caminho literal a IA nao sabe qual documento mexer"
  );
});

test("o prompt leva o pedido do dono literal", () => {
  const pedido = "tira a parte de orçamento e deixa a voz mais direta";
  assert.ok(promptDeConversaComCerebro(pedido).includes(pedido));
});

test("o prompt manda ler antes, proibe inventar e proibe recomecar a entrevista", () => {
  // As tres regras que separam "conversar com o Cerebro" de "montar o Cerebro".
  // Sem a terceira, a IA reabre a entrevista inteira num documento pronto.
  const prompt = promptDeConversaComCerebro("x").toLowerCase();
  assert.ok(prompt.includes("leia o arquivo inteiro antes"), "precisa mandar ler antes");
  assert.ok(prompt.includes("não invente"), "precisa proibir invencao");
  assert.ok(prompt.includes("não recomece a entrevista"), "precisa proibir recomecar");
});

test("o prompt da conversa nova NAO invoca o /instalar", () => {
  // A skill conduz a entrevista bloco por bloco. Invocar ela aqui faria a IA
  // remontar uma identidade que ja esta escrita.
  assert.ok(!promptDeConversaComCerebro("x").includes("/instalar"));
});

test("a conversa nova tambem fixa o idioma", () => {
  const prompt = promptDeConversaComCerebro("x").toLowerCase();
  assert.ok(prompt.includes("sempre em português do brasil"));
  assert.ok(prompt.includes("outro alfabeto"));
});
