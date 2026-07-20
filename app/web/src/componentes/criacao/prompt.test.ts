import assert from "node:assert/strict";
import test from "node:test";

import { montarPromptCriacao, type DadosCriacao } from "./prompt";

function dadosBase(): DadosCriacao {
  return {
    tema: "sete ideias de conteúdo",
    detalhes: "Slide 1: capa forte\nSlide 2: contexto\nSlide 3: CTA",
    paginas: 3,
    estilo: "",
    estiloCapa: "vkos09",
    estiloPaginas: "vkos06",
    formato: "multiplas",
    proporcao: "4x5",
    modoImagem: "com",
    origemImagem: "usuario",
    caminhosImagens: ["materiais/cockpit/anexos/imagem.png"],
    visual: null,
  };
}

test("modelo composto vira contrato de arquivos e estrutura", () => {
  const prompt = montarPromptCriacao(dadosBase(), "carrossel-teste");
  assert.match(prompt, /CONTRATO OBRIGATÓRIO DOS MODELOS ESCOLHIDOS/);
  assert.match(prompt, /templates\/carrossel\/modelo-vkos09\.html/);
  assert.match(prompt, /templates\/carrossel\/modelo-vkos06\.html/);
  assert.match(prompt, /Copie primeiro o arquivo de páginas/);
  assert.match(prompt, /Não redesenhe nem substitua esses modelos/);
  assert.match(prompt, /sem vazamento de CSS/);
});

test("modelo simples legado aponta para o arquivo real", () => {
  const dados = dadosBase();
  dados.estiloCapa = "dark";
  dados.estiloPaginas = "dark";
  const prompt = montarPromptCriacao(dados, "carrossel-teste");
  assert.match(prompt, /CONTRATO OBRIGATÓRIO DO MODELO ESCOLHIDO/);
  assert.match(prompt, /templates\/carrossel\/modelo\.html/);
  assert.match(prompt, /copie esse arquivo/);
});

test("imagens e instrucoes finais chegam literais ao prompt", () => {
  const prompt = montarPromptCriacao(dadosBase(), "carrossel-teste");
  assert.match(prompt, /materiais\/cockpit\/anexos\/imagem\.png/);
  assert.match(prompt, /INSTRUÇÕES FINAIS DO USUÁRIO/);
  assert.match(prompt, /Slide 1: capa forte\nSlide 2: contexto\nSlide 3: CTA/);
  assert.match(prompt, /preserve integralmente o conteúdo e a ordem/);
});
