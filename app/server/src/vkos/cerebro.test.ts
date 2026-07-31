// Trava da heuristica de "o Cerebro esta preenchido".
//
// Ela decide duas coisas visiveis: o selo do no do Cerebro no cockpit e o
// portao das skills que exigem identidade (carrossel, site). Errar pra menos
// tranca a pessoa fora do produto depois de ela ter feito a entrevista
// inteira; errar pra mais libera geracao em cima de identidade vazia.

import assert from "node:assert/strict";
import test from "node:test";

import { cerebroPreenchido } from "./cerebro.js";

const MARCADOR = "✍️";

// O template em branco, do jeito que ele nasce: 13 blocos, cada um com o lapis
// e mais nada, e um lapis solto debaixo do titulo.
function templateEmBranco(): string {
  const blocos = [
    "1. O negócio em uma frase",
    "2. O que você vende (oferta)",
    "3. Onde você atende",
    "4. Pra quem é (cliente ideal)",
    "5. A dor concreta dele",
    "6. O que ele quer (o desejo)",
    "7. Objeções comuns",
    "8. Sua voz (como você fala)",
    "9. Provas (por que confiar em você)",
    "10. Pilares de conteúdo",
    "11. Termos que seu cliente busca",
    "12. Pra onde você leva a pessoa (CTA / destino)",
    "13. Identidade visual",
  ];
  return [
    "# 🧠 O Cérebro do seu negócio",
    "",
    MARCADOR,
    "",
    ...blocos.flatMap((b) => [`## ${b}`, "", MARCADOR, ""]),
  ].join("\n");
}

// O mesmo template com todos os blocos respondidos.
function cerebroCheio(): string {
  return templateEmBranco().split(MARCADOR).join("Resposta de verdade.");
}

test("o template recem-instalado nao esta preenchido", () => {
  assert.equal(cerebroPreenchido(templateEmBranco()), false);
});

test("o Cerebro com todos os blocos respondidos esta preenchido", () => {
  assert.equal(cerebroPreenchido(cerebroCheio()), true);
});

test("um detalhe pendente dentro de um bloco respondido nao derruba o Cerebro", () => {
  // ESTE E O CASO QUE QUEBROU EM USO REAL (Mãe Pixel, 2026-07-31). O bloco 12
  // tinha paragrafo e quatro contatos; so o link do hub central estava em
  // aberto. O Hub dizia "Ainda em branco" e travava a geracao.
  const cerebro = cerebroCheio().replace(
    "## 12. Pra onde você leva a pessoa (CTA / destino)\n\nResposta de verdade.",
    [
      "## 12. Pra onde você leva a pessoa (CTA / destino)",
      "",
      "Destino principal: um hub central que reúne o projeto inteiro.",
      "",
      "- **WhatsApp:** `https://wa.me/5527999999999`",
      "- **Instagram:** @exemplo",
      `- **Hub central (link único):** ${MARCADOR} [a definir]`,
    ].join("\n")
  );
  assert.ok(cerebro.includes(MARCADOR), "o teste precisa mesmo ter o marcador");
  assert.equal(cerebroPreenchido(cerebro), true);
});

test("um bloco que ficou so com o marcador segura o Cerebro", () => {
  // Entrevista abandonada no meio: o bloco 9 nunca foi respondido. Aqui dizer
  // "pronto" seria liberar carrossel e site sem saber por que confiar no
  // negocio.
  const cerebro = cerebroCheio().replace(
    "## 9. Provas (por que confiar em você)\n\nResposta de verdade.",
    `## 9. Provas (por que confiar em você)\n\n${MARCADOR} [a definir]`
  );
  assert.equal(cerebroPreenchido(cerebro), false);
});

test("separador e linha em branco nao contam como resposta", () => {
  // O template usa "---" entre blocos. Sem esta regra, o separador sozinho
  // faria um bloco vazio passar por respondido.
  const cerebro = cerebroCheio().replace(
    "## 7. Objeções comuns\n\nResposta de verdade.",
    "## 7. Objeções comuns\n\n---\n\n   \n"
  );
  assert.equal(cerebroPreenchido(cerebro), false);
});

test("Cerebro escrito fora do template cai na regra antiga", () => {
  // Sem nenhum "## ", nao ha bloco pra medir. O unico sinal que sobra e a
  // ausencia de marcador, que era a regra inteira antes de 2026-07-31.
  assert.equal(cerebroPreenchido("Vendo bolo caseiro no bairro."), true);
  assert.equal(cerebroPreenchido(`Vendo bolo. Preço: ${MARCADOR}`), false);
});

test("Cerebro vazio nao esta preenchido", () => {
  assert.equal(cerebroPreenchido(""), false);
  assert.equal(cerebroPreenchido("   \n\n"), false);
});
