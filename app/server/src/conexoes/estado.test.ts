import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerConexoesDeArquivo } from "./estado.js";

const NOME = "conexoes.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("conexoes ausentes devolvem estado vazio sem criar quarentena", () => {
  const pasta = pastaTemp("conexoes-ausente");
  try {
    assert.deepEqual(lerConexoesDeArquivo(join(pasta, NOME)), { servidores: {} });
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("conexoes validas carregam o token de config", () => {
  const pasta = pastaTemp("conexoes-valida");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(
      arquivo,
      JSON.stringify({ servidores: { apify: { habilitado: true, config: { token: "segredo" } } } }),
      "utf8",
    );
    const estado = lerConexoesDeArquivo(arquivo);
    assert.equal(estado.servidores.apify.config.token, "segredo");
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Aqui moram os segredos digitados na mao. Falha fechado: lanca, nunca vazio.
test("conexoes corrompidas vao pra quarentena com o token preservado e lancam", () => {
  const pasta = pastaTemp("conexoes-corrompida");
  const arquivo = join(pasta, NOME);
  const original = '{"servidores":{"apify":{"config":{"token":"segredo"';
  try {
    writeFileSync(arquivo, original, "utf8");
    assert.throws(() => lerConexoesDeArquivo(arquivo), /corrompido/i);

    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    // O token continua legivel no arquivo movido, byte a byte.
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido sem o mapa de servidores tambem vai pra quarentena", () => {
  const pasta = pastaTemp("conexoes-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, '{"servidores":[]}', "utf8");
    assert.throws(() => lerConexoesDeArquivo(arquivo), /corrompido/i);
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("duas conexoes corrompidas seguidas nao se sobrescrevem", () => {
  const pasta = pastaTemp("conexoes-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    assert.throws(() => lerConexoesDeArquivo(arquivo));
    writeFileSync(arquivo, "segundo lixo", "utf8");
    assert.throws(() => lerConexoesDeArquivo(arquivo));

    const conteudos = quarentenas(pasta)
      .map((n) => readFileSync(join(pasta, n), "utf8"))
      .sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
