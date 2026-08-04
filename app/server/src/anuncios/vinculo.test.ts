// O vinculo peca para sessao.
//
// A prova que importa mais aqui nao e "grava e le". E que o arquivo nasce SOB
// VKOS_DADOS_TESTE: este modulo escreve em app/dados, e um teste que ignorasse
// a variavel gravaria no registro real do usuario, que esta no ar enquanto isto
// roda.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import { garantirPastaDadosWorkspace, pastaDadosWorkspace } from "../workspaces/estado.js";
import { gravarVinculo, lerVinculo, lerVinculos } from "./vinculo.js";

const WORKSPACE = "w-teste-vinculo";

let raizDados: string;
let raizAnterior: string | undefined;

before(() => {
  raizAnterior = process.env.VKOS_DADOS_TESTE;
  raizDados = mkdtempSync(join(tmpdir(), "vkos-vinculo-"));
  process.env.VKOS_DADOS_TESTE = raizDados;
});

after(() => {
  if (raizAnterior === undefined) delete process.env.VKOS_DADOS_TESTE;
  else process.env.VKOS_DADOS_TESTE = raizAnterior;
  rmSync(raizDados, { recursive: true, force: true });
});

function arquivo(): string {
  return join(pastaDadosWorkspace(WORKSPACE), "anuncios.json");
}

test("sem arquivo, o registro e vazio e o vinculo e nulo", () => {
  assert.deepEqual(lerVinculos("w-que-nunca-existiu"), {});
  assert.equal(lerVinculo("w-que-nunca-existiu", "qualquer-pasta"), null);
});

test("gravar aponta a peca pra sessao, dentro da raiz de teste", () => {
  const vinculo = gravarVinculo(WORKSPACE, "2026-07-31-anuncio-newborn-v2", "s-abc");

  assert.equal(vinculo.sessaoId, "s-abc");
  assert.ok(vinculo.atualizadoEm, "o vinculo precisa dizer quando foi gravado");

  // O arquivo nasceu na raiz de teste, e nao em app/dados.
  assert.ok(arquivo().startsWith(raizDados), `o arquivo saiu em ${arquivo()}`);
  assert.ok(existsSync(arquivo()));

  const lido = lerVinculo(WORKSPACE, "2026-07-31-anuncio-newborn-v2");
  assert.equal(lido?.sessaoId, "s-abc");
});

test("uma peca nova nao apaga a que ja estava no registro", () => {
  gravarVinculo(WORKSPACE, "2026-07-31-anuncio-outra", "s-def");

  const registro = lerVinculos(WORKSPACE);
  assert.equal(registro["2026-07-31-anuncio-newborn-v2"].sessaoId, "s-abc");
  assert.equal(registro["2026-07-31-anuncio-outra"].sessaoId, "s-def");
});

test("gravar de novo na mesma peca troca a sessao: a ultima vence", () => {
  // Esta e a regra que faz a sessao de resgate substituir a que morreu. Sem
  // ela, a proxima visita reencontraria o cadaver.
  gravarVinculo(WORKSPACE, "2026-07-31-anuncio-newborn-v2", "s-viva");
  assert.equal(lerVinculo(WORKSPACE, "2026-07-31-anuncio-newborn-v2")?.sessaoId, "s-viva");
});

test("arquivo torto vira registro vazio, e nao excecao", () => {
  // Perder o vinculo custa uma conversa nova. Derrubar a leitura da peca por
  // causa de um JSON quebrado custaria a campanha inteira.
  const outro = "w-torto";
  garantirPastaDadosWorkspace(outro);
  writeFileSync(join(pastaDadosWorkspace(outro), "anuncios.json"), "{ isto nao e json", "utf8");
  assert.deepEqual(lerVinculos(outro), {});

  writeFileSync(join(pastaDadosWorkspace(outro), "anuncios.json"), '["lista"]', "utf8");
  assert.deepEqual(lerVinculos(outro), {});
});

test("entrada sem sessaoId e descartada, o resto do registro sobrevive", () => {
  const outro = "w-meio-torto";
  garantirPastaDadosWorkspace(outro);
  writeFileSync(
    join(pastaDadosWorkspace(outro), "anuncios.json"),
    JSON.stringify({
      boa: { sessaoId: "s-1", atualizadoEm: "2026-07-31T10:00:00.000Z" },
      ruim: { atualizadoEm: "2026-07-31T10:00:00.000Z" },
    }),
    "utf8",
  );

  const registro = lerVinculos(outro);
  assert.deepEqual(Object.keys(registro), ["boa"]);
});

test("o JSON gravado tem a forma que o plano declarou", () => {
  const cru = JSON.parse(readFileSync(arquivo(), "utf8")) as Record<string, unknown>;
  const entrada = cru["2026-07-31-anuncio-newborn-v2"] as Record<string, unknown>;
  assert.deepEqual(Object.keys(entrada).sort(), ["atualizadoEm", "sessaoId"]);
});
