import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { DadosEtapasSite } from "./EtapasSite";
import { montarPromptSite } from "./promptSite";

// Snapshots do prompt do modo ligado, capturados ANTES do modo economico
// existir. Provam que o interruptor desligado so troca o Bloco 1 e que o modo
// ligado continua identico, linha por linha.
const SNAPSHOT_LIGADO = readFileSync(
  new URL("./fixtures/prompt-ligado-site.txt", import.meta.url),
  "utf8"
);
const SNAPSHOT_LIGADO_COMPLETO = readFileSync(
  new URL("./fixtures/prompt-ligado-site-completo.txt", import.meta.url),
  "utf8"
);
// Snapshot do modo sem Cerebro: trava o bloco de topo, a troca da linha do
// Cerebro no Bloco 1, o CTA sem contato do Cerebro e o visual pela paleta.
const SNAPSHOT_SEM_CEREBRO = readFileSync(
  new URL("./fixtures/prompt-sem-cerebro-site.txt", import.meta.url),
  "utf8"
);

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

test("modo ligado gera prompt identico ao snapshot de antes do modo economico", () => {
  // Sem o campo (rascunho antigo) e com o campo ligado, nos dois formatos.
  assert.equal(montarPromptSite(dadosBase(), "site-teste"), SNAPSHOT_LIGADO);
  const ligado = dadosBase();
  ligado.aprimorarComIA = true;
  assert.equal(montarPromptSite(ligado, "site-teste"), SNAPSHOT_LIGADO);
  const completo = dadosBase();
  completo.formato = "completo";
  assert.equal(montarPromptSite(completo, "site-teste"), SNAPSHOT_LIGADO_COMPLETO);
});

test("modo desligado substitui o Bloco 1 de design pelo bloco de montagem", () => {
  const dados = dadosBase();
  dados.aprimorarComIA = false;
  const prompt = montarPromptSite(dados, "site-teste");
  // O Bloco 1 do modo ligado (cartela e escolha de direcao) some inteiro.
  assert.doesNotMatch(prompt, /O DESIGN VEM PRIMEIRO/);
  assert.doesNotMatch(prompt, /templates\/design\/cartela\.md/);
  assert.doesNotMatch(prompt, /estilos\/indice\.md/);
  assert.doesNotMatch(prompt, /Declare no início do trabalho/);
  // No lugar entra o bloco enxuto com o estilo fixo Grade de zinco.
  assert.match(prompt, /BLOCO 1, DESIGN NO MODO MONTAGEM/);
  assert.match(prompt, /templates\/design\/estilos\/grade-zinco\.md/);
  assert.match(prompt, /Não crie direção de arte nova/);
  assert.match(prompt, /NUNCA cite a marca de origem do estilo/);
});

test("modo desligado mantem os Blocos 2 e 3 inteiros, com marcadores e contraste", () => {
  const dados = dadosBase();
  dados.aprimorarComIA = false;
  dados.formato = "completo";
  const prompt = montarPromptSite(dados, "site-teste");
  // Blocos 2 e 3 e as exigencias finais continuam identicos ao modo ligado:
  // tudo depois do Bloco 1 bate com o snapshot, pedaco a pedaco.
  const inicioBloco2 = "BLOCO 2, conteúdo e estrutura.";
  const caudaEconomico = prompt.slice(prompt.indexOf(inicioBloco2));
  const caudaLigado = SNAPSHOT_LIGADO_COMPLETO.slice(
    SNAPSHOT_LIGADO_COMPLETO.indexOf(inicioBloco2)
  );
  assert.equal(caudaEconomico, caudaLigado);
  // Amostras do que o laco de conformidade audita.
  assert.match(prompt, /<nav data-vk-nav>/);
  assert.match(prompt, /<footer data-vk-footer>/);
  assert.match(prompt, /<main data-vk-pagina>/);
  assert.match(prompt, /4\.5:1 contra o fundo real/);
  assert.match(prompt, /BLOCO 3, regras técnicas/);
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

function dadosSemCerebro(): DadosEtapasSite {
  const dados = dadosBase();
  dados.linkObjetivo = "";
  dados.semCerebro = true;
  dados.descricaoNegocio = "estúdio de fotografia de gestante e newborn em Curitiba";
  return dados;
}

test("modo sem Cerebro casa com o snapshot e nao manda ler o Cerebro", () => {
  assert.equal(montarPromptSite(dadosSemCerebro(), "site-teste"), SNAPSHOT_SEM_CEREBRO);
  const prompt = montarPromptSite(dadosSemCerebro(), "site-teste");
  assert.match(prompt, /MODO SEM CÉREBRO/);
  // No Bloco 1, a leitura do Cerebro vira uma proibicao explicita.
  assert.match(prompt, /NÃO leia cerebro\/cerebro\.md\. A identidade/);
  assert.doesNotMatch(prompt, /É a fonte da verdade do visual e do conteúdo/);
});

test("modo sem Cerebro: CTA sem link e visual nao citam o Cerebro", () => {
  const prompt = montarPromptSite(dadosSemCerebro(), "site-teste");
  // CTA sem numero aponta pra #contato, sem recuperar contato do Cerebro.
  assert.match(prompt, /Sem número informado, aponte o CTA pra #contato/);
  assert.doesNotMatch(prompt, /WhatsApp do Cérebro/);
  // Visual padrao usa a paleta do estilo, sem "identidade do Cérebro".
  assert.match(prompt, /use o sistema completo do estilo escolhido, incluindo a paleta dele/);
  assert.doesNotMatch(prompt, /As cores se adaptam à identidade do Cérebro/);
});

test("modo sem Cerebro tambem vale no modo montagem economico", () => {
  const dados = dadosSemCerebro();
  dados.aprimorarComIA = false;
  const prompt = montarPromptSite(dados, "site-teste");
  assert.match(prompt, /BLOCO 1, DESIGN NO MODO MONTAGEM/);
  assert.match(prompt, /NÃO leia cerebro\/cerebro\.md\. O conteúdo vem do que o usuário forneceu/);
  assert.doesNotMatch(prompt, /É a fonte da verdade do conteúdo/);
});
