// Trava da camada de escalas do design system.
//
// O que este teste protege: as escalas de tipografia, espacamento, raio,
// movimento, elevacao e empilhamento vivem numa camada so, a base, porque nao
// mudam por tema. Antes delas o app tinha 24 tamanhos de fonte, 42
// espacamentos e 117 sombras distintas. Sem trava, em tres meses volta tudo.
//
// Ver planos/vkos-hub-local-v1/05-design-system.md, secao 3.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pasta = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(join(pasta, "global.css"), "utf8");
const tema = readFileSync(join(pasta, "visual-hub.css"), "utf8");

function declaracao(css: string, token: string) {
  return css.match(new RegExp(`^\\s*${token.replace("--", "--")}\\s*:\\s*([^;]+);`, "m"))?.[1].trim();
}

const ESPACAMENTO = ["--esp-2", "--esp-4", "--esp-8", "--esp-12", "--esp-16", "--esp-24", "--esp-32", "--esp-48"];
const TIPOGRAFIA = ["--txt-micro", "--txt-legenda", "--txt-corpo", "--txt-leitura", "--txt-titulo-p", "--txt-titulo", "--txt-display"];
const RAIO = ["--raio-p", "--raio", "--raio-g", "--raio-gg", "--raio-pilula"];
const MOVIMENTO = ["--mov-rapido", "--mov-padrao", "--mov-lento", "--curva", "--curva-simetrica"];
const EMPILHAMENTO = ["--z-base", "--z-fixo", "--z-popover", "--z-camada", "--z-veu", "--z-modal", "--z-aviso"];
const ELEVACAO = ["--sombra-popover", "--sombra-modal", "--sombra-arrasto"];
const PESO = ["--peso-normal", "--peso-medio", "--peso-forte", "--peso-pesado"];

test("as escalas existem todas na camada base", () => {
  for (const token of [...ESPACAMENTO, ...TIPOGRAFIA, ...RAIO, ...MOVIMENTO, ...EMPILHAMENTO, ...ELEVACAO, ...PESO]) {
    assert.ok(declaracao(base, token), `${token} precisa existir no global.css`);
  }
});

test("todo espacamento deriva de --base, senao a densidade nao e ajustavel", () => {
  assert.equal(declaracao(base, "--base"), "4px");
  for (const token of ESPACAMENTO) {
    const valor = declaracao(base, token)!;
    assert.match(
      valor,
      /var\(--base\)/,
      `${token} vale "${valor}". Espacamento fixo mata o controle de densidade: ` +
        `trocar --base tem que folgar a interface inteira sem tocar em componente.`
    );
  }
});

test("a entrelinha e px absoluto e par, nunca numero relativo", () => {
  for (const token of TIPOGRAFIA) {
    const lh = declaracao(base, token.replace("--txt-", "--lh-"))!;
    assert.match(lh, /^\d+px$/, `a entrelinha de ${token} tem que ser px absoluto, achei "${lh}"`);
    assert.equal(Number.parseInt(lh, 10) % 2, 0, `a entrelinha de ${token} tem que ser par, achei "${lh}"`);
  }
});

test("sao quatro pesos e so quatro, sem intermediario de fonte variavel", () => {
  assert.deepEqual(
    PESO.map((t) => declaracao(base, t)),
    ["400", "500", "600", "700"]
  );
});

test("a camada de tema nao redeclara escala, so cor", () => {
  // Escala nao muda por tema. Se o visual-hub.css redeclarar um raio ou uma
  // duracao, ele vence por camada e a escala da base vira decoracao.
  for (const token of [...ESPACAMENTO, ...TIPOGRAFIA, ...RAIO, ...MOVIMENTO, ...PESO]) {
    assert.equal(
      declaracao(tema, token),
      undefined,
      `${token} e escala, nao cor. Ele nao pode ser redeclarado no visual-hub.css.`
    );
  }
});
