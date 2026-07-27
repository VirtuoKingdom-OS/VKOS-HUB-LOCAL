import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerPastaVkosDeArquivo } from "./estado.js";

const NOME = "config.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("config ausente devolve nenhuma pasta sem criar quarentena", () => {
  const pasta = pastaTemp("vkos-config-ausente");
  try {
    assert.deepEqual(lerPastaVkosDeArquivo(join(pasta, NOME)), { pasta: null, podeGravar: true });
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("config valida devolve a pasta escolhida", () => {
  const pasta = pastaTemp("vkos-config-valida");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, JSON.stringify({ pastaVkos: "C:/clientes/acme" }), "utf8");
    assert.equal(lerPastaVkosDeArquivo(arquivo).pasta, "C:/clientes/acme");
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Objeto valido sem a chave nao e corrupcao, e "ninguem escolheu pasta ainda".
test("objeto sem pastaVkos segue sem quarentena", () => {
  const pasta = pastaTemp("vkos-config-vazia");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "{}", "utf8");
    assert.deepEqual(lerPastaVkosDeArquivo(arquivo), { pasta: null, podeGravar: true });
    assert.equal(existsSync(arquivo), true);
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Lido no boot: quarentena e segue com null, nunca lanca.
test("config corrompida vai pra quarentena com o caminho preservado", () => {
  const pasta = pastaTemp("vkos-config-corrompida");
  const arquivo = join(pasta, NOME);
  const original = '{"pastaVkos":"C:/clientes/acme"';
  try {
    writeFileSync(arquivo, original, "utf8");
    const lido = lerPastaVkosDeArquivo(arquivo);

    assert.equal(lido.pasta, null);
    assert.equal(lido.podeGravar, true);
    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("pastaVkos com tipo errado tambem vai pra quarentena", () => {
  const pasta = pastaTemp("vkos-config-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, '{"pastaVkos":42}', "utf8");
    assert.equal(lerPastaVkosDeArquivo(arquivo).pasta, null);
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("duas configs corrompidas seguidas nao se sobrescrevem", () => {
  const pasta = pastaTemp("vkos-config-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    lerPastaVkosDeArquivo(arquivo);
    writeFileSync(arquivo, "segundo lixo", "utf8");
    lerPastaVkosDeArquivo(arquivo);

    const conteudos = quarentenas(pasta)
      .map((n) => readFileSync(join(pasta, n), "utf8"))
      .sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
