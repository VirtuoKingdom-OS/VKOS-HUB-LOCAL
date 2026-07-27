import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerConfigAppDeArquivo } from "./estado.js";

const NOME = "config-app.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("config ausente devolve o padrao sem criar quarentena", () => {
  const pasta = pastaTemp("config-ausente");
  try {
    const lido = lerConfigAppDeArquivo(join(pasta, NOME));
    assert.equal(lido.config.modeloPadraoClaude, "sonnet");
    assert.equal(lido.podeGravar, true);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Campo invalido dentro de objeto valido e tolerancia, nao corrupcao.
test("campo invalido cai no padrao sem quarentena", () => {
  const pasta = pastaTemp("config-campo");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, '{"modeloPadraoClaude":"inexistente"}', "utf8");
    const lido = lerConfigAppDeArquivo(arquivo);
    assert.equal(lido.config.modeloPadraoClaude, "sonnet");
    assert.equal(existsSync(arquivo), true);
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Lido no boot: quarentena e segue com o padrao, nunca lanca. O que nao pode e
// gravar preferencia nova por cima de um arquivo que ainda esta la.
test("config corrompida vai pra quarentena, segue com o padrao e libera a gravacao", () => {
  const pasta = pastaTemp("config-corrompida");
  const arquivo = join(pasta, NOME);
  const original = '{"provedorPadrao":"codex"';
  try {
    writeFileSync(arquivo, original, "utf8");
    const lido = lerConfigAppDeArquivo(arquivo);

    assert.equal(lido.config.modeloPadraoClaude, "sonnet");
    assert.equal(lido.podeGravar, true);
    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido que nao e objeto tambem vai pra quarentena", () => {
  const pasta = pastaTemp("config-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "[]", "utf8");
    assert.equal(lerConfigAppDeArquivo(arquivo).config.modeloPadraoCodex, "gpt-5.4-mini");
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("duas configs corrompidas seguidas nao se sobrescrevem", () => {
  const pasta = pastaTemp("config-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    lerConfigAppDeArquivo(arquivo);
    writeFileSync(arquivo, "segundo lixo", "utf8");
    lerConfigAppDeArquivo(arquivo);

    const conteudos = quarentenas(pasta)
      .map((n) => readFileSync(join(pasta, n), "utf8"))
      .sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
