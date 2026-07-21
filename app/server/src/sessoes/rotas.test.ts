import assert from "node:assert/strict";
import test from "node:test";

import type { Sessao } from "../tipos.js";
import {
  extrairPastaAlvoDoPrompt,
  geracaoVisualEmAndamento,
  promptCitaCrm,
  resolverPastaAlvoGeracaoSite,
  skillExigeCerebro,
} from "./rotas.js";

test("exige Cerebro nos fluxos que criam artefato visual", () => {
  assert.equal(skillExigeCerebro("carrossel"), true);
  assert.equal(skillExigeCerebro("site"), true);
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
