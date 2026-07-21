import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  blocoMontagemEconomica,
  montarPromptCriacao,
  type DadosCriacao,
} from "./prompt";

// Snapshot do prompt do modo ligado, capturado ANTES do modo economico existir.
// Prova que o interruptor desligado so ANEXA: nenhuma linha do fluxo atual muda.
const SNAPSHOT_LIGADO = readFileSync(
  new URL("./fixtures/prompt-ligado-carrossel.txt", import.meta.url),
  "utf8"
);

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

test("modo ligado gera prompt identico ao snapshot de antes do modo economico", () => {
  // Sem o campo (rascunho antigo) e com o campo ligado: os dois batem byte a
  // byte com o prompt capturado antes desta rodada.
  assert.equal(montarPromptCriacao(dadosBase(), "carrossel-teste"), SNAPSHOT_LIGADO);
  const dados = dadosBase();
  dados.aprimorarComIA = true;
  assert.equal(montarPromptCriacao(dados, "carrossel-teste"), SNAPSHOT_LIGADO);
});

test("modo desligado anexa o bloco de montagem sem mudar o resto", () => {
  const dados = dadosBase();
  dados.aprimorarComIA = false;
  const prompt = montarPromptCriacao(dados, "carrossel-teste");
  // O prompt do modo ligado permanece inteiro no comeco; o bloco vem anexado.
  assert.ok(prompt.startsWith(SNAPSHOT_LIGADO));
  assert.equal(prompt, `${SNAPSHOT_LIGADO}\n\n${blocoMontagemEconomica()}`);
  assert.match(prompt, /MODO MONTAGEM/);
  assert.match(prompt, /SEM alterar anatomia, cores, fontes ou layout/);
  assert.match(prompt, /instruções finais do usuário e do Cérebro/);
  assert.match(prompt, /Não invente direção de arte/);
  assert.match(prompt, /Não adicione elementos novos/);
  assert.match(prompt, /Preencha o template com o conteúdo e pare/);
});

test("imagens e instrucoes finais chegam literais ao prompt", () => {
  const prompt = montarPromptCriacao(dadosBase(), "carrossel-teste");
  assert.match(prompt, /materiais\/cockpit\/anexos\/imagem\.png/);
  assert.match(prompt, /INSTRUÇÕES FINAIS DO USUÁRIO/);
  assert.match(prompt, /Slide 1: capa forte\nSlide 2: contexto\nSlide 3: CTA/);
  assert.match(prompt, /preserve integralmente o conteúdo e a ordem/);
});
