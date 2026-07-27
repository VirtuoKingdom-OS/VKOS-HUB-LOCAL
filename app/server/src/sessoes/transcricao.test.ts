import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerTranscricaoDeArquivo } from "./transcricao.js";

const NOME = "s-1.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("transcricao ausente devolve lista vazia sem criar quarentena", () => {
  const pasta = pastaTemp("transcricao-ausente");
  try {
    assert.deepEqual(lerTranscricaoDeArquivo(join(pasta, NOME)), []);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("transcricao valida carrega os turnos", () => {
  const pasta = pastaTemp("transcricao-valida");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, JSON.stringify([{ papel: "usuario", texto: "oi", em: "" }]), "utf8");
    assert.equal(lerTranscricaoDeArquivo(arquivo).length, 1);
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Segue com vazio, mas so depois de mover: a conversa velha fica na quarentena e
// o anexarTurno grava um arquivo novo, nunca por cima do historico.
test("transcricao corrompida vai pra quarentena com a conversa preservada", () => {
  const pasta = pastaTemp("transcricao-corrompida");
  const arquivo = join(pasta, NOME);
  const original = '[{"papel":"usuario","texto":"conversa antiga"';
  try {
    writeFileSync(arquivo, original, "utf8");
    assert.deepEqual(lerTranscricaoDeArquivo(arquivo), []);

    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido que nao e lista tambem vai pra quarentena", () => {
  const pasta = pastaTemp("transcricao-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, '{"turnos":[]}', "utf8");
    assert.deepEqual(lerTranscricaoDeArquivo(arquivo), []);
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("duas transcricoes corrompidas seguidas nao se sobrescrevem", () => {
  const pasta = pastaTemp("transcricao-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    lerTranscricaoDeArquivo(arquivo);
    writeFileSync(arquivo, "segundo lixo", "utf8");
    lerTranscricaoDeArquivo(arquivo);

    const conteudos = quarentenas(pasta)
      .map((n) => readFileSync(join(pasta, n), "utf8"))
      .sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
