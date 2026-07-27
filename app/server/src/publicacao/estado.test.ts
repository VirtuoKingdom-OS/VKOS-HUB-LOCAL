import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerPublicacoesDeArquivo } from "./estado.js";

const NOME = "publicacoes.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("historico ausente devolve vazio sem criar quarentena", () => {
  const pasta = pastaTemp("publicacoes-ausente");
  try {
    assert.deepEqual(lerPublicacoesDeArquivo(join(pasta, NOME)), { pecas: {} });
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("historico valido carrega a exportacao da peca", () => {
  const pasta = pastaTemp("publicacoes-valido");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(
      arquivo,
      JSON.stringify({ pecas: { "site-x": { exportacao: { em: "2026-07-26", modo: "astro" } } } }),
      "utf8",
    );
    assert.equal(lerPublicacoesDeArquivo(arquivo).pecas["site-x"].exportacao?.modo, "astro");
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Segue com vazio (e metadado de tela), mas so depois de mover: o
// atualizarRegistroPeca grava o mapa inteiro e uma peca apagaria as outras.
test("historico corrompido vai pra quarentena com o registro preservado", () => {
  const pasta = pastaTemp("publicacoes-corrompido");
  const arquivo = join(pasta, NOME);
  const original = '{"pecas":{"site-x":{"exportacao"';
  try {
    writeFileSync(arquivo, original, "utf8");
    assert.deepEqual(lerPublicacoesDeArquivo(arquivo), { pecas: {} });

    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido sem o mapa de pecas tambem vai pra quarentena", () => {
  const pasta = pastaTemp("publicacoes-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "[]", "utf8");
    assert.deepEqual(lerPublicacoesDeArquivo(arquivo), { pecas: {} });
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("dois historicos corrompidos seguidos nao se sobrescrevem", () => {
  const pasta = pastaTemp("publicacoes-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    lerPublicacoesDeArquivo(arquivo);
    writeFileSync(arquivo, "segundo lixo", "utf8");
    lerPublicacoesDeArquivo(arquivo);

    const conteudos = quarentenas(pasta)
      .map((n) => readFileSync(join(pasta, n), "utf8"))
      .sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
