import assert from "node:assert/strict";
import test from "node:test";

import type { Sessao } from "../tipos.js";
import {
  ehEscopoProjeto,
  extrairPastaAlvoDoPrompt,
  geracaoVisualEmAndamento,
  promptCitaCrm,
  resolverPastaAlvoGeracaoSite,
  skillExigeCerebro,
} from "./rotas.js";

test("so o escopo de projeto tira a sessao da pasta do workspace", () => {
  // O chat da VKOS-IDE roda na raiz da instalacao pra falar dos mesmos arquivos
  // que a arvore dela mostra. Todo o resto continua confinado no workspace, e o
  // padrao (campo ausente) tem que ser o confinado: escopo nao se abre por
  // omissao nem por engano de digitacao.
  assert.equal(ehEscopoProjeto("projeto"), true);
  for (const valor of [undefined, null, "", "Projeto", "PROJETO", "projetos", "workspace", true, 1]) {
    assert.equal(
      ehEscopoProjeto(valor),
      false,
      `${JSON.stringify(valor)} nao pode abrir o escopo pra raiz`,
    );
  }
});

test("exige Cerebro nos fluxos de criacao guiada", () => {
  assert.equal(skillExigeCerebro("carrossel"), true);
  assert.equal(skillExigeCerebro("site"), true);
  // O anuncio entrou aqui em 2026-07-31, e isso liga duas coisas de uma vez: a
  // guarda de Cerebro vazio e a trava de uma criacao guiada por vez.
  assert.equal(skillExigeCerebro("anuncio"), true);
});

test("mantem livres sessoes gerais e a cerimonia de instalacao", () => {
  assert.equal(skillExigeCerebro("instalar"), false);
  assert.equal(skillExigeCerebro(undefined), false);
});

function sessao(parcial: Partial<Sessao>): Sessao {
  return {
    id: "s-teste",
    provedor: "codex",
    titulo: "Teste",
    prompt: "Teste",
    workspaceId: "w-1",
    status: "rodando",
    criadaEm: "2026-07-15T00:00:00.000Z",
    atualizadaEm: "2026-07-15T00:00:00.000Z",
    pastaTrabalho: "C:/VKOS",
    ...parcial,
  };
}

test("encontra geracao visual ativa no Hub", () => {
  const ativa = sessao({ skill: "carrossel" });
  assert.equal(geracaoVisualEmAndamento([ativa])?.id, ativa.id);
});

test("ignora sessao concluida e skill geral", () => {
  const sessoes = [
    sessao({ id: "concluida", skill: "site", status: "concluida" }),
    sessao({ id: "geral", skill: "imagem", status: "rodando" }),
  ];
  assert.equal(geracaoVisualEmAndamento(sessoes), undefined);
});

test("bloqueio visual continua global depois de trocar de cliente", () => {
  const ativa = sessao({ skill: "site", workspaceId: "w-2", status: "fila" });
  assert.equal(geracaoVisualEmAndamento([ativa])?.id, ativa.id);
});

// A trava e uma so pras tres criacoes guiadas. Carrossel na fila barra anuncio,
// e anuncio rodando barra carrossel: as duas direcoes, porque o estado de
// progresso do Hub e singular.
test("a trava de criacao guiada vale nas duas direcoes entre anuncio e carrossel", () => {
  const carrosselNaFila = sessao({ id: "carrossel", skill: "carrossel", status: "fila" });
  assert.equal(geracaoVisualEmAndamento([carrosselNaFila])?.id, "carrossel");

  const anuncioRodando = sessao({ id: "anuncio", skill: "anuncio", status: "rodando" });
  assert.equal(geracaoVisualEmAndamento([anuncioRodando])?.id, "anuncio");
});

test("conferencia de site em andamento ocupa a trava mesmo concluida", () => {
  const conferindo = sessao({
    id: "conferindo",
    skill: "site",
    status: "concluida",
    conferenciaSite: { estado: "conferindo", volta: 0 },
  });
  assert.equal(geracaoVisualEmAndamento([conferindo])?.id, "conferindo");

  const corrigindo = sessao({
    id: "corrigindo",
    skill: "site",
    status: "concluida",
    conferenciaSite: { estado: "corrigindo", volta: 1 },
  });
  assert.equal(geracaoVisualEmAndamento([corrigindo])?.id, "corrigindo");
});

test("conferencia terminal nao ocupa mais a trava", () => {
  const aprovada = sessao({
    skill: "site",
    status: "concluida",
    conferenciaSite: { estado: "aprovada", volta: 0 },
  });
  const pendencias = sessao({
    skill: "site",
    status: "concluida",
    conferenciaSite: { estado: "pendencias", volta: 2 },
  });
  assert.equal(geracaoVisualEmAndamento([aprovada]), undefined);
  assert.equal(geracaoVisualEmAndamento([pendencias]), undefined);
});

test("detecta CRM como palavra inteira sem falso positivo", () => {
  assert.equal(promptCitaCrm("Resuma o CRM"), true);
  assert.equal(promptCitaCrm("use meu crm para decidir"), true);
  assert.equal(promptCitaCrm("prefixo crmx"), false);
});

const promptGuiado = [
  "BLOCO 3, regras técnicas. Onde salvar e como nomear:",
  "- Salve tudo em conteudo/2026-07-17-site-estudio/ (crie a pasta com esse nome exato).",
].join("\n");

test("recupera pastaAlvo do contrato do Site Guiado", () => {
  assert.equal(extrairPastaAlvoDoPrompt(promptGuiado), "2026-07-17-site-estudio");
  assert.equal(
    resolverPastaAlvoGeracaoSite({
      skill: "site",
      prompt: promptGuiado,
      pastaAlvo: undefined,
      temEscopoPeca: false,
    }),
    "2026-07-17-site-estudio",
  );
});

test("aceita pastaAlvo explicita quando coincide com o prompt", () => {
  assert.equal(
    resolverPastaAlvoGeracaoSite({
      skill: "site",
      prompt: promptGuiado,
      pastaAlvo: "2026-07-17-site-estudio",
      temEscopoPeca: false,
    }),
    "2026-07-17-site-estudio",
  );
});

test("rejeita destinos divergentes e prompt guiado sem destino valido", () => {
  assert.throws(
    () =>
      resolverPastaAlvoGeracaoSite({
        skill: "site",
        prompt: promptGuiado,
        pastaAlvo: "outra-pasta",
        temEscopoPeca: false,
      }),
    /nao corresponde/,
  );
  assert.throws(
    () =>
      resolverPastaAlvoGeracaoSite({
        skill: "site",
        prompt: "BLOCO 3, regras técnicas. Onde salvar e como nomear:",
        pastaAlvo: undefined,
        temEscopoPeca: false,
      }),
    /Recarregue o Hub/,
  );
});

// O contrato do Site Guiado continua nao valendo para ajuste: a pastaAlvo do
// ajuste de site vem do escopo ja resolvido na rota, nunca do corpo HTTP.
test("nao atribui pastaAlvo pelo contrato do wizard a ajuste nem a sessao geral", () => {
  assert.equal(
    resolverPastaAlvoGeracaoSite({
      skill: "site",
      prompt: promptGuiado,
      pastaAlvo: "2026-07-17-site-estudio",
      temEscopoPeca: true,
    }),
    undefined,
  );
  assert.equal(
    resolverPastaAlvoGeracaoSite({
      skill: "imagem",
      prompt: promptGuiado,
      pastaAlvo: "2026-07-17-site-estudio",
      temEscopoPeca: false,
    }),
    undefined,
  );
});
