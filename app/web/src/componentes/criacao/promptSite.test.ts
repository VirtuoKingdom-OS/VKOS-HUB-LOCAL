import assert from "node:assert/strict";
import test from "node:test";

import type { DadosEtapasSite } from "./EtapasSite";
import { montarPromptSite } from "./promptSite";

function dadosBase(): DadosEtapasSite {
  return {
    tema: "estúdio fotográfico",
    detalhes: "",
    formato: "unica",
    objetivo: "whatsapp",
    objetivoLivre: "vender o pacote fotográfico premium",
    linkObjetivo: "11 91234-5678",
    modelo: "teste",
    secoesLivre: "abertura com foto, três pacotes com preços, depoimentos e contato",
    modoImagem: "sem",
    anexos: [],
    visualModo: "negocio",
    corFundo: "#101418",
    corDestaque: "#00c896",
    corTexto: "#ffffff",
    fonteTitulos: "Poppins",
    fonteCorpo: "Inter",
  };
}

test("prompt preserva objetivo e secoes livres do usuario", () => {
  const prompt = montarPromptSite(dadosBase(), "site-teste");
  assert.match(prompt, /vender o pacote fotográfico premium/);
  assert.match(prompt, /abertura com foto, três pacotes com preços, depoimentos e contato/);
  assert.match(prompt, /na ordem que ele deu/);
  assert.match(prompt, /https:\/\/wa\.me\/11912345678/);
});

test("secoes vazias mantem a escolha automatica do metodo", () => {
  const dados = dadosBase();
  dados.secoesLivre = "";
  const prompt = montarPromptSite(dados, "site-teste");
  assert.match(prompt, /escolha as seções que fizerem sentido pro negócio/);
});

test("o design vem primeiro: a declaracao aparece no topo, antes do conteudo", () => {
  const prompt = montarPromptSite(dadosBase(), "site-teste");
  assert.match(prompt, /BLOCO 1, O DESIGN VEM PRIMEIRO/);
  assert.match(prompt, /templates\/design\/cartela\.md/);
  assert.match(prompt, /templates\/design\/estilos\/indice\.md/);
  assert.match(prompt, /Declare no início do trabalho, em até 3 linhas/);
  // O bloco de design vem antes do bloco de conteudo e do bloco tecnico.
  const posDesign = prompt.indexOf("O DESIGN VEM PRIMEIRO");
  const posConteudo = prompt.indexOf("BLOCO 2, conteúdo e estrutura");
  const posTecnico = prompt.indexOf("BLOCO 3, regras técnicas");
  assert.ok(posDesign >= 0 && posConteudo > posDesign && posTecnico > posConteudo);
});

test("formato completo exige os marcadores no formato completo com exemplo", () => {
  const dados = dadosBase();
  dados.formato = "completo";
  const prompt = montarPromptSite(dados, "site-teste");
  assert.match(prompt, /OBRIGATÓRIOS neste formato/);
  assert.match(prompt, /<nav data-vk-nav>/);
  assert.match(prompt, /<footer data-vk-footer>/);
  assert.match(prompt, /<main data-vk-pagina>/);
  assert.match(prompt, /<title> e <meta name="description"> únicos/);
});

test("proibe wrapper generico no body, glow no cursor, vidro sem camada e absolute solto", () => {
  const prompt = montarPromptSite(dadosBase(), "site-teste");
  // (a) wrapper/painel generico envolvendo o body.
  assert.match(prompt, /PROIBIDO envolver o conteúdo da página num painel ou wrapper genérico/);
  assert.match(prompt, /overlay position fixed que abre e fecha/);
  // (b) efeito decorativo que segue o cursor.
  assert.match(prompt, /PROIBIDO efeito decorativo que segue o cursor/);
  assert.match(prompt, /glow, blob, spotlight/);
  // (c) backdrop-filter so sobre conteudo real.
  assert.match(prompt, /backdrop-filter só em elemento que fica de fato sobre conteúdo real/);
  assert.match(prompt, /Vidro decorativo sem nada atrás é proibido/);
  // (d) position absolute confinado, conferido em 390px.
  assert.match(prompt, /position absolute precisa estar confinado/);
  assert.match(prompt, /Confira em 390px que nada vaza/);
});

test("visual personalizado troca so as cores e mantem a tipografia do estilo", () => {
  const dados = dadosBase();
  dados.visualModo = "personalizado";
  const prompt = montarPromptSite(dados, "site-teste");
  assert.match(prompt, /substituem apenas os tokens de cor do estilo/);
  assert.match(prompt, /#101418/);
  assert.match(prompt, /A escala tipográfica[\s\S]*continuam vindo do estilo escolhido/);
  // O "ignore o design-guide" morreu.
  assert.doesNotMatch(prompt, /ignore.*design-guide/i);
});
