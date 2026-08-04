import assert from "node:assert/strict";
import test from "node:test";

import { montarContratoAnuncioJson } from "./contratoPrompt.js";
import { montarPromptGeracaoAnuncio } from "./prompt.js";

const CEREBRO = [
  "# Cérebro da Clínica Passo Firme",
  "",
  "## Bloco 1, o negócio",
  "Fisioterapia ortopédica na Vila Mariana, São Paulo.",
  "",
  "## Bloco 8, a voz",
  "Direta, sem promessa de cura.",
].join("\n");

const SKILL = [
  "---",
  "name: anuncio",
  "description: Escreve o texto de anúncios pra Google e Meta.",
  "---",
  "",
  "# /anuncio, texto de anúncio que traz cliente",
  "",
  "## Passo 2, escrever",
  "Se Google, rede de busca: 8 a 12 títulos de 30 caracteres.",
].join("\n");

const INTENCAO = [
  "Oferta: avaliação postural gratuita.",
  "Destino do clique: WhatsApp da recepção.",
  "Praça: Vila Mariana e Ipiranga.",
  "Orçamento: 50 reais por dia.",
].join("\n");

function prompt(): string {
  return montarPromptGeracaoAnuncio({
    intencao: INTENCAO,
    cerebro: CEREBRO,
    conteudoSkill: SKILL,
    pasta: "2026-07-31-anuncio-avaliacao-postural",
  });
}

// A REGRA QUE JA CUSTOU CARO NESTE PROJETO: teste de injeção afirma o CONTEÚDO
// injetado, não o entorno. Um teste que passaria com a injeção apagada não é
// teste. Por isso cada bloco abaixo confere uma linha de dentro do material, e
// não só o marcador que o envolve.
test("injeta o Cérebro inteiro, e não só o marcador", () => {
  const texto = prompt();
  assert.match(texto, /<cerebro>/);
  assert.match(texto, /<\/cerebro>/);
  assert.ok(texto.includes("Fisioterapia ortopédica na Vila Mariana, São Paulo."));
  assert.ok(texto.includes("Direta, sem promessa de cura."));
  // O bloco tem que estar FECHADO em volta do conteúdo, não solto no prompt.
  const dentro = texto.slice(texto.indexOf("<cerebro>"), texto.indexOf("</cerebro>"));
  assert.ok(dentro.includes("Bloco 8, a voz"));
});

test("injeta o SKILL.md inteiro, porque o cwd é a pasta da peça", () => {
  const texto = prompt();
  const dentro = texto.slice(texto.indexOf("<skill>"), texto.indexOf("</skill>"));
  assert.ok(dentro.includes("# /anuncio, texto de anúncio que traz cliente"));
  assert.ok(dentro.includes("Se Google, rede de busca: 8 a 12 títulos de 30 caracteres."));
});

test("injeta o contrato do JSON inteiro, com os limites do Google", () => {
  const texto = prompt();
  const dentro = texto.slice(texto.indexOf("<contrato>"), texto.indexOf("</contrato>"));
  assert.ok(dentro.includes(montarContratoAnuncioJson()));
  assert.ok(dentro.includes('"palavrasChave"'));
  assert.ok(dentro.includes("Título: no máximo 30 caracteres"));
});

test("injeta a intenção do dono literal, sem reescrever", () => {
  const texto = prompt();
  const dentro = texto.slice(texto.indexOf("<pedido>"), texto.indexOf("</pedido>"));
  assert.ok(dentro.includes("Oferta: avaliação postural gratuita."));
  assert.ok(dentro.includes("Orçamento: 50 reais por dia."));
});

test("declara Google rede de busca e manda ignorar o ramo Meta", () => {
  const texto = prompt();
  assert.match(texto, /REDE DE BUSCA/);
  assert.match(texto, /ignore por inteiro o ramo Meta, Instagram e Facebook/);
});

// A skill pergunta três coisas no passo 1 dela. O assistente do Hub já colheu as
// três, então perguntar de novo travaria a geração esperando resposta que nunca
// vem.
test("proíbe perguntar, porque as três perguntas da skill já foram colhidas", () => {
  assert.match(prompt(), /NÃO FAÇA NENHUMA PERGUNTA/);
});

test("declara o anuncio.json como único artefato e fecha a escrita na pasta", () => {
  const texto = prompt();
  assert.match(texto, /ÚNICO ARTEFATO desta tarefa é o arquivo anuncio\.json/);
  assert.ok(texto.includes("conteudo/2026-07-31-anuncio-avaliacao-postural/"));
  assert.match(texto, /LIMITE OBRIGATÓRIO: não leia, escreva, renomeie nem apague nada fora do diretório atual/);
});

// A ordem é contrato: o trabalho, a proibição de perguntar, a skill, o Cérebro,
// o contrato, o pedido e o limite. Ela existe pra a IA ler o método antes do
// material e o material antes do pedido.
test("mantém a ordem dos blocos do prompt", () => {
  const texto = prompt();
  const posicoes = [
    texto.indexOf("REDE DE BUSCA"),
    texto.indexOf("NÃO FAÇA NENHUMA PERGUNTA"),
    texto.indexOf("<skill>"),
    texto.indexOf("<cerebro>"),
    texto.indexOf("<contrato>"),
    texto.indexOf("<pedido>"),
    texto.indexOf("ÚNICO ARTEFATO"),
  ];
  for (const posicao of posicoes) {
    assert.notEqual(posicao, -1);
  }
  assert.deepEqual(posicoes, [...posicoes].sort((a, b) => a - b));
});
