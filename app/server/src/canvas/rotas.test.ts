import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerCanvasDeArquivo } from "./rotas.js";

const NOME = "canvas.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("canvas ausente devolve null sem criar quarentena", () => {
  const pasta = pastaTemp("canvas-ausente");
  try {
    assert.equal(lerCanvasDeArquivo(join(pasta, NOME)), null);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// O blob e opaco: volta o texto do disco sem reserializar.
test("canvas valido volta cru, do jeito que esta no disco", () => {
  const pasta = pastaTemp("canvas-valido");
  const arquivo = join(pasta, NOME);
  const original = '{"cartoes":[{"id":"a"}]}';
  try {
    writeFileSync(arquivo, original, "utf8");
    assert.equal(lerCanvasDeArquivo(arquivo), original);
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Segue com vazio (o layout o usuario refaz), mas so depois de mover: o PUT
// seguinte do frontend nao pode gravar um canvas vazio por cima do original.
test("canvas corrompido vai pra quarentena com o layout preservado", () => {
  const pasta = pastaTemp("canvas-corrompido");
  const arquivo = join(pasta, NOME);
  const original = '{"cartoes":[{"id":"a"';
  try {
    writeFileSync(arquivo, original, "utf8");
    assert.equal(lerCanvasDeArquivo(arquivo), null);

    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido que nao e objeto tambem vai pra quarentena", () => {
  const pasta = pastaTemp("canvas-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, '"so uma string"', "utf8");
    assert.equal(lerCanvasDeArquivo(arquivo), null);
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("dois canvas corrompidos seguidos nao se sobrescrevem", () => {
  const pasta = pastaTemp("canvas-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    lerCanvasDeArquivo(arquivo);
    writeFileSync(arquivo, "segundo lixo", "utf8");
    lerCanvasDeArquivo(arquivo);

    const conteudos = quarentenas(pasta)
      .map((n) => readFileSync(join(pasta, n), "utf8"))
      .sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
