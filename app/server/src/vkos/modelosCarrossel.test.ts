import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { listarModelosCarrossel } from "./modelosCarrossel.js";

function vkosDeTeste(arquivos: string[]): string {
  const raiz = mkdtempSync(join(tmpdir(), "vkos-modelos-"));
  const pasta = join(raiz, "templates", "carrossel");
  mkdirSync(pasta, { recursive: true });
  for (const nome of arquivos) writeFileSync(join(pasta, nome), "<html></html>", "utf8");
  return raiz;
}

test("o id de cada modelo sai do nome do arquivo, e modelo.html e o dark", () => {
  // A regra é a inversa exata de arquivoDoModelo, em promptCarrossel.ts. Se uma
  // das duas mudar sozinha, o assistente manda um estilo que o prompt não acha.
  const raiz = vkosDeTeste([
    "modelo.html",
    "modelo-vkos09.html",
    "modelo-editorial.html",
    "README.md",
    "render.js",
    "estilos.md",
  ]);
  assert.deepEqual(listarModelosCarrossel(raiz), ["dark", "editorial", "vkos09"]);
});

test("workspace sem pasta de templates devolve lista vazia, sem quebrar", () => {
  const raiz = mkdtempSync(join(tmpdir(), "vkos-sem-modelos-"));
  assert.deepEqual(listarModelosCarrossel(raiz), []);
});

test("arquivo com nome fora do padrao nao vira modelo", () => {
  // "modelo antigo.html" e "modelo-.html" não têm id resolvível, e um id vazio
  // viraria o caminho templates/carrossel/modelo-.html, que não existe.
  const raiz = vkosDeTeste(["modelo antigo.html", "modelo-.html", "modelo-vkos01.html"]);
  assert.deepEqual(listarModelosCarrossel(raiz), ["vkos01"]);
});
