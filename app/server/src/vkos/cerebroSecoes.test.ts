import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  dividirSecoes,
  ErroSecaoCerebro,
  substituirSecao,
} from "./cerebroSecoes.js";

const pastaModulo = dirname(fileURLToPath(import.meta.url));
const caminhoSemente = resolve(
  pastaModulo, "..", "..", "..", "..", "vkos2", "cerebro", "cerebro.md",
);
const SEMENTE = readFileSync(caminhoSemente, "utf8");

// Cerebro torto de fixture: sem preambulo, CRLF, "###" dentro de corpo e um
// "---" no meio de uma secao (que NAO pode virar epilogo).
const TORTO = [
  "## Primeira",
  "corpo um",
  "### detalhe interno que nao abre secao",
  "",
  "## Segunda",
  "inicio",
  "---",
  "fim da segunda",
  "",
  "## Terceira",
  "corpo tres",
  "",
].join("\r\n");

test("a semente divide em 13 secoes com preambulo e epilogo", () => {
  const { preambulo, secoes, epilogo } = dividirSecoes(SEMENTE);
  assert.equal(secoes.length, 13);
  assert.ok(preambulo.includes("O Cérebro do seu negócio"));
  assert.ok(epilogo.includes("Preencheu?"));
  assert.equal(secoes[0].titulo, "1. O negócio em uma frase");
  // Template em branco: nenhuma secao conta como preenchida.
  assert.ok(secoes.every((s) => !s.preenchida));
  // O epilogo nao vaza pro corpo da ultima secao.
  assert.ok(!secoes[12].corpo.includes("Preencheu?"));
});

test("substituir cada secao pelo proprio corpo devolve a semente byte a byte", () => {
  const { secoes } = dividirSecoes(SEMENTE);
  for (const secao of secoes) {
    assert.equal(substituirSecao(SEMENTE, secao.indice, secao.corpo), SEMENTE);
  }
});

test("editar uma secao preserva todo o resto byte a byte", () => {
  const resultado = substituirSecao(SEMENTE, 2, "Atendo em Marília e região, presencial e online.");
  const antes = dividirSecoes(SEMENTE);
  const depois = dividirSecoes(resultado);
  assert.equal(depois.secoes[2].corpo, "Atendo em Marília e região, presencial e online.");
  assert.equal(depois.secoes[2].preenchida, true);
  assert.equal(depois.preambulo, antes.preambulo);
  assert.equal(depois.epilogo, antes.epilogo);
  for (const s of antes.secoes) {
    if (s.indice === 2) continue;
    assert.equal(depois.secoes[s.indice].corpo, s.corpo);
  }
  // Idempotente: substituir de novo pelo mesmo corpo nao muda nada.
  assert.equal(substituirSecao(resultado, 2, depois.secoes[2].corpo), resultado);
});

test("corpo vazio restaura o marcador e a heuristica de em branco", () => {
  const preenchido = substituirSecao(SEMENTE, 0, "Sou confeiteira de bolo por encomenda.");
  const esvaziado = substituirSecao(preenchido, 0, "   ");
  const { secoes } = dividirSecoes(esvaziado);
  assert.equal(secoes[0].corpo, "✍️");
  assert.equal(secoes[0].preenchida, false);
});

test("cerebro torto: CRLF, ### interno e --- de meio nao viram secao nem epilogo", () => {
  const { preambulo, secoes, epilogo } = dividirSecoes(TORTO);
  assert.equal(preambulo, "");
  assert.equal(secoes.length, 3);
  // O ### fica dentro do corpo da primeira.
  assert.ok(secoes[0].corpo.includes("### detalhe interno"));
  // O --- do meio pertence a segunda secao (esta antes da terceira).
  assert.ok(secoes[1].corpo.includes("---"));
  assert.equal(epilogo, "");
  // Round-trip byte a byte com CRLF preservado.
  for (const s of secoes) {
    assert.equal(substituirSecao(TORTO, s.indice, s.corpo), TORTO);
  }
  // Editar a segunda nao toca a primeira nem a terceira.
  const editado = substituirSecao(TORTO, 1, "novo corpo");
  assert.ok(editado.includes("corpo um\r\n### detalhe interno"));
  assert.ok(editado.includes("corpo tres"));
});

test("arquivo sem secoes vira preambulo unico e indices invalidos falham claro", () => {
  const solto = "# Cerebro\n\nTexto corrido sem secoes.\n";
  const dividido = dividirSecoes(solto);
  assert.equal(dividido.secoes.length, 0);
  assert.equal(dividido.preambulo, solto);
  assert.throws(() => substituirSecao(solto, 0, "x"), ErroSecaoCerebro);
  assert.throws(() => substituirSecao(SEMENTE, 99, "x"), ErroSecaoCerebro);
  assert.throws(() => substituirSecao(SEMENTE, 0, 42 as unknown as string), ErroSecaoCerebro);
});
