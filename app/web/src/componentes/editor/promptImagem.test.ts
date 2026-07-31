import { test } from "node:test";
import assert from "node:assert/strict";
import { montarPromptImagem, normalizarTexto } from "./promptImagem.js";

// O prompt de imagem carrega quatro coisas que nao podem sumir: o caminho exato
// de gravacao, as travas de escopo (nao editar outro arquivo, nao inventar
// texto), o contexto do elemento e, agora, a descricao que o usuario escreveu.
//
// Regra do projeto: teste de injecao afirma o CONTEUDO injetado, nao so o
// entorno. Por isso cada caso abaixo procura a frase do usuario dentro do
// prompt, e nao apenas que o prompt cresceu.

const BASE = {
  pasta: "2026-07-14-cafe-especial",
  caminhoRelativo: "img/vkos-ia-abc12.png",
  contexto: "Seção de abertura do carrossel sobre café especial",
};

test("sem descricao, o prompt mantem o comportamento de hoje", () => {
  const prompt = montarPromptImagem(BASE);

  assert.equal(
    prompt,
    [
      "Use explicitamente $imagegen para gerar uma unica imagem original.",
      "Salve o bitmap final EXATAMENTE em conteudo/2026-07-14-cafe-especial/img/vkos-ia-abc12.png.",
      "Nao edite HTML, CSS, markdown nem qualquer outro arquivo. Nao crie variantes.",
      "A imagem precisa seguir o Cerebro do negocio e representar o contexto do elemento, sem texto ou logotipo inventado.",
      "Contexto visual: Seção de abertura do carrossel sobre café especial.",
      "Ao terminar, responda apenas com o caminho salvo.",
    ].join("\n"),
  );
  assert.doesNotMatch(prompt, /usuario descreveu/);
});

test("com descricao, o texto do usuario entra inteiro no prompt", () => {
  const descricao = "Um barista servindo café coado numa xícara branca, luz da manhã";
  const prompt = montarPromptImagem({ ...BASE, descricao });

  // O conteudo injetado, palavra por palavra.
  assert.ok(
    prompt.includes(`O usuario descreveu a imagem que quer: ${descricao}`),
    "a frase do usuario tem que aparecer inteira no prompt",
  );
  assert.match(prompt, /barista servindo café coado numa xícara branca/);
  assert.match(prompt, /luz da manhã/);
});

test("a descricao do usuario manda sobre o contexto do elemento", () => {
  const prompt = montarPromptImagem({ ...BASE, descricao: "Uma plantação de café ao pôr do sol" });

  const ordem = prompt.indexOf("O usuario descreveu a imagem que quer:");
  const apoio = prompt.indexOf("Esse pedido do usuario MANDA.");
  assert.ok(ordem >= 0 && apoio > ordem, "a regra de prioridade vem logo depois do pedido");
  assert.match(prompt, /so apoio de estilo e de assunto/);
  assert.match(prompt, /onde ele discordar do pedido, siga o pedido/);
  // O contexto do DOM continua no prompt, so que rebaixado a apoio.
  assert.match(prompt, /Contexto visual: Seção de abertura do carrossel sobre café especial\./);
});

test("descricao so com espaco em branco conta como ausente", () => {
  const soEspaco = montarPromptImagem({ ...BASE, descricao: "   \n\t  " });
  assert.equal(soEspaco, montarPromptImagem(BASE));
  assert.doesNotMatch(soEspaco, /usuario descreveu/);
});

test("o caminho de destino aparece exato, com a pasta da peca", () => {
  const prompt = montarPromptImagem({
    ...BASE,
    pasta: "2026-07-27-lancamento",
    caminhoRelativo: "img/vkos-ia-zz999.png",
    descricao: "Fundo abstrato em tons de menta",
  });

  assert.ok(
    prompt.includes(
      "Salve o bitmap final EXATAMENTE em conteudo/2026-07-27-lancamento/img/vkos-ia-zz999.png.",
    ),
    "o caminho tem que sair exato, senao a imagem cai fora da peca",
  );
});

test("as travas de escopo continuam no prompt nos dois caminhos", () => {
  for (const descricao of [undefined, "Uma xícara fumegando sobre madeira"]) {
    const prompt = montarPromptImagem({ ...BASE, descricao });
    assert.match(prompt, /Use explicitamente \$imagegen para gerar uma unica imagem original\./);
    assert.match(
      prompt,
      /Nao edite HTML, CSS, markdown nem qualquer outro arquivo\. Nao crie variantes\./,
    );
    assert.match(prompt, /seguir o Cerebro do negocio/);
    assert.match(prompt, /sem texto ou logotipo inventado/);
    assert.match(prompt, /Ao terminar, responda apenas com o caminho salvo\./);
  }
});

test("descricao gigante e cortada, mas o comeco do pedido sobrevive", () => {
  const descricao = `Comece por aqui. ${"detalhe ".repeat(400)}`;
  const prompt = montarPromptImagem({ ...BASE, descricao });

  assert.match(prompt, /O usuario descreveu a imagem que quer: Comece por aqui\. detalhe/);
  assert.ok(prompt.length < 4600, "prompt sem teto afoga a instrucao e custa token");
});

test("normalizarTexto achata quebra de linha e respeita o teto", () => {
  assert.equal(normalizarTexto("  uma\n\n  frase   quebrada  ", 100), "uma frase quebrada");
  assert.equal(normalizarTexto("abcdef", 3), "abc");
  assert.equal(normalizarTexto("", 10), "");
});
