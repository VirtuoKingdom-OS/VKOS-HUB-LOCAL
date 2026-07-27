// Trava de contraste da paleta, nos tres temas.
//
// POR QUE ISTO EXISTE: cor aprovada no olho foi como o tema Claro chegou a um
// botao principal com 3,69:1 no rotulo, e como a borda de campo ficou em
// 1,55:1 nos tres temas. A paleta antiga falhava em 13 destas 48 verificacoes.
// Contraste nao se mede no olho, se mede com a formula.
//
// A formula e a do WCAG 2.2: luminancia relativa com o canal linearizado, e
// (L1 + 0,05) / (L2 + 0,05). Ver https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pasta = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(pasta, "visual-hub.css"), "utf8");

const TEMAS = ["escuro", "vkos", "claro"] as const;

function tokensDoTema(tema: string): Map<string, string> {
  const marca = `:root[data-theme="${tema}"] {`;
  const inicio = css.indexOf(marca);
  assert.ok(inicio >= 0, `o tema ${tema} precisa existir no visual-hub.css`);
  const fim = css.indexOf("\n}", inicio);
  const bloco = css.slice(inicio, fim);
  const mapa = new Map<string, string>();
  for (const m of bloco.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    mapa.set(m[1], m[2].trim());
  }
  return mapa;
}

function paraRgb(valor: string): [number, number, number] {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(valor);
  assert.ok(hex, `esperava um hex de 6 digitos, achei "${valor}"`);
  const n = Number.parseInt(hex[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminancia(cor: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = paraRgb(cor);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function razao(frente: string, fundo: string): number {
  const a = luminancia(frente);
  const b = luminancia(fundo);
  const [claro, escuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (escuro + 0.05);
}

// Os 16 pares criticos. O minimo de 4,5 vem do criterio 1.4.3 (texto). O de 3
// vem do 1.4.11, que vale onde a borda E o unico indicador de um controle.
const PARES: { frente: string; fundo: string; minimo: number; oque: string }[] = [
  { frente: "--texto", fundo: "--fundo", minimo: 4.5, oque: "texto na area de trabalho" },
  { frente: "--texto", fundo: "--superficie", minimo: 4.5, oque: "texto em cartao" },
  { frente: "--texto", fundo: "--superficie-alta", minimo: 4.5, oque: "texto em linha selecionada" },
  { frente: "--texto", fundo: "--superficie-flutuante", minimo: 4.5, oque: "texto em popover" },
  { frente: "--texto-suave", fundo: "--superficie", minimo: 4.5, oque: "subtitulo em cartao" },
  { frente: "--texto-suave", fundo: "--superficie-alta", minimo: 4.5, oque: "subtitulo em hover" },
  { frente: "--texto-fraco", fundo: "--superficie", minimo: 4.5, oque: "metadado em cartao" },
  { frente: "--texto-fraco", fundo: "--superficie-alta", minimo: 4.5, oque: "metadado em hover" },
  { frente: "--menta", fundo: "--fundo", minimo: 4.5, oque: "menta sobre o canvas" },
  { frente: "--menta", fundo: "--superficie", minimo: 4.5, oque: "menta como texto ou icone" },
  { frente: "--sobre-menta", fundo: "--menta", minimo: 4.5, oque: "rotulo do botao principal" },
  { frente: "--alerta", fundo: "--superficie", minimo: 4.5, oque: "texto de erro" },
  { frente: "--aviso", fundo: "--superficie", minimo: 4.5, oque: "texto de aviso" },
  { frente: "--linha-forte", fundo: "--superficie", minimo: 3, oque: "borda de campo dentro de cartao" },
  { frente: "--linha-forte", fundo: "--fundo", minimo: 3, oque: "borda de campo na tela" },
  { frente: "--menta-linha", fundo: "--superficie", minimo: 3, oque: "borda de campo em foco" },
];

for (const tema of TEMAS) {
  test(`contraste do tema ${tema}: os 16 pares criticos passam`, () => {
    const tokens = tokensDoTema(tema);
    const falhas: string[] = [];
    for (const par of PARES) {
      const frente = tokens.get(par.frente);
      const fundo = tokens.get(par.fundo);
      assert.ok(frente, `${par.frente} precisa ter valor no tema ${tema}`);
      assert.ok(fundo, `${par.fundo} precisa ter valor no tema ${tema}`);
      const r = razao(frente, fundo);
      if (r < par.minimo) {
        falhas.push(
          `${par.frente} sobre ${par.fundo} deu ${r.toFixed(2)}:1, ` +
            `precisa de ${par.minimo}:1 (${par.oque})`
        );
      }
    }
    assert.deepEqual(falhas, [], `\n  ${falhas.join("\n  ")}\n`);
  });
}

test("a borda de controle e a de decoracao nao podem ter a mesma cor", () => {
  // Se as duas apontarem pro mesmo valor, alguem juntou os dois trabalhos de
  // novo e o campo volta a 1,55:1.
  for (const tema of TEMAS) {
    const tokens = tokensDoTema(tema);
    assert.notEqual(
      tokens.get("--linha"),
      tokens.get("--linha-forte"),
      `no tema ${tema} a --linha e a --linha-forte ficaram iguais`
    );
  }
});
