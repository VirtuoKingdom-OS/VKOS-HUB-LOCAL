import assert from "node:assert/strict";
import test from "node:test";

import type { DadosEtapasAnuncio } from "./EtapasAnuncio";
import { montarPromptAnuncio } from "./promptAnuncio";

function dadosBase(): DadosEtapasAnuncio {
  return {
    oferta: "limpeza de pele com desconto de estreia",
    objetivo: "pessoa chamar no WhatsApp e marcar horário",
    destino: "whatsapp",
    linkDestino: "41 99876-5432",
    praca: "Curitiba, bairros Batel e Água Verde",
    raio: "10 km em volta do estúdio",
    orcamentoDiario: "R$ 30 por dia",
    detalhes: 'Não usar a palavra "barato".\nCitar os 20 anos de estrada.',
    modelo: "teste",
  };
}

test("cada resposta do assistente aparece literal no prompt", () => {
  // Teste que passaria com a injeção apagada não é teste: cada campo colhido
  // pelas etapas é afirmado pelo próprio texto que o dono escreveu.
  const prompt = montarPromptAnuncio(dadosBase());
  assert.match(prompt, /limpeza de pele com desconto de estreia/);
  assert.match(prompt, /pessoa chamar no WhatsApp e marcar horário/);
  assert.match(prompt, /41 99876-5432/);
  assert.match(prompt, /Curitiba, bairros Batel e Água Verde/);
  assert.match(prompt, /10 km em volta do estúdio/);
  assert.match(prompt, /R\$ 30 por dia/);
  assert.match(prompt, /Não usar a palavra "barato"\.\nCitar os 20 anos de estrada\./);
  assert.match(prompt, /preserve integralmente o conteúdo e a ordem/);
});

test("cada destino do clique chega escrito em prosa, com o endereço", () => {
  const combinacoes: [DadosEtapasAnuncio["destino"], RegExp][] = [
    ["whatsapp", /conversa no WhatsApp, em https:\/\/exemplo\.com/],
    ["landing", /uma landing page, em https:\/\/exemplo\.com/],
    ["agendamento", /uma página de agendamento, em https:\/\/exemplo\.com/],
    ["telefone", /uma ligação de telefone, em https:\/\/exemplo\.com/],
  ];
  for (const [destino, esperado] of combinacoes) {
    const dados = dadosBase();
    dados.destino = destino;
    dados.linkDestino = "https://exemplo.com";
    assert.match(montarPromptAnuncio(dados), esperado);
  }
});

test("campo em branco vira instrução honesta, nunca invenção", () => {
  const dados = dadosBase();
  dados.objetivo = "";
  dados.linkDestino = "";
  dados.praca = "";
  dados.raio = "";
  dados.detalhes = "";
  const prompt = montarPromptAnuncio(dados);
  assert.match(prompt, /não disse o que conta como resultado/);
  assert.match(prompt, /não informou o endereço: use o contato que está no Cérebro/);
  assert.match(prompt, /não apertou a praça, siga a região que está no Cérebro/);
  // Raio e detalhes vazios não deixam linha morta no prompt.
  assert.doesNotMatch(prompt, /Raio em volta da praça/);
  assert.doesNotMatch(prompt, /DETALHES DO DONO/);
});

test("o orçamento entra como número do dono, não como estimativa", () => {
  // O Cérebro não tem nenhum bloco de dinheiro. A frase existe pra a IA não
  // tratar o valor como sugestão e inflar a campanha.
  const prompt = montarPromptAnuncio(dadosBase());
  assert.match(prompt, /Este número foi dado pelo dono, não é estimativa/);
});

test("o prompt do web não costura o que é do servidor", () => {
  // A trava da divisão de trabalho. O contrato do anuncio.json, os limites de
  // caractere do Google, a pasta alvo e o Cérebro são costurados pelo servidor,
  // que mora colado ao schema. Se um deles voltar a nascer aqui, os dois lados
  // divergem em silêncio na primeira mudança de schema.
  const prompt = montarPromptAnuncio(dadosBase());
  assert.doesNotMatch(prompt, /anuncio\.json/);
  assert.doesNotMatch(prompt, /30 caracteres/);
  assert.doesNotMatch(prompt, /conteudo\//);
  assert.doesNotMatch(prompt, /cerebro\.md/);
  assert.doesNotMatch(prompt, /\/anuncio /);
});
