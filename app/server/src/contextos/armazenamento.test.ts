import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerIndiceBrutoDeArquivo } from "./armazenamento.js";

const NOME = "contextos.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("indice ausente devolve lista vazia sem criar quarentena", () => {
  const pasta = pastaTemp("indice-ausente");
  try {
    assert.deepEqual(lerIndiceBrutoDeArquivo(join(pasta, NOME)), []);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("indice valido carrega as entradas", () => {
  const pasta = pastaTemp("indice-valido");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, JSON.stringify([{ id: "c-1", slug: "marca", tipo: "texto" }]), "utf8");
    assert.equal(lerIndiceBrutoDeArquivo(arquivo).length, 1);
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Segue com vazio (o indice se remonta do disco do VKOS), mas so depois de
// mover: o salvarIndice grava a lista inteira e apagaria o original.
test("indice corrompido vai pra quarentena com as entradas preservadas", () => {
  const pasta = pastaTemp("indice-corrompido");
  const arquivo = join(pasta, NOME);
  const original = '[{"id":"c-1","slug":"marca"';
  try {
    writeFileSync(arquivo, original, "utf8");
    assert.deepEqual(lerIndiceBrutoDeArquivo(arquivo), []);

    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido que nao e lista tambem vai pra quarentena", () => {
  const pasta = pastaTemp("indice-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, '{"entradas":[]}', "utf8");
    assert.deepEqual(lerIndiceBrutoDeArquivo(arquivo), []);
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("dois indices corrompidos seguidos nao se sobrescrevem", () => {
  const pasta = pastaTemp("indice-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    lerIndiceBrutoDeArquivo(arquivo);
    writeFileSync(arquivo, "segundo lixo", "utf8");
    lerIndiceBrutoDeArquivo(arquivo);

    const conteudos = quarentenas(pasta)
      .map((n) => readFileSync(join(pasta, n), "utf8"))
      .sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
