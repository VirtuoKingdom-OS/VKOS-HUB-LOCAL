import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ErroDadoCorrompido,
  quarentenar,
  quarentenarComErro,
  quarentenarOuFalhar,
} from "./quarentena.js";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

test("quarentenar move o arquivo e preserva o conteudo byte a byte", () => {
  const pasta = pastaTemp("quarentena");
  const arquivo = join(pasta, "estado.json");
  const original = "{ isto nao e json valido";
  try {
    writeFileSync(arquivo, original, "utf8");
    const destino = quarentenar(arquivo);

    assert.ok(destino);
    assert.equal(existsSync(arquivo), false);
    assert.equal(readFileSync(destino, "utf8"), original);
    // Carimbo AAAA-MM-DDTHH-mm-ss, sem ":" (nome de arquivo invalido no Windows).
    assert.match(destino, /estado\.json\.corrompido-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("arquivo ausente nao cria quarentena", () => {
  const pasta = pastaTemp("quarentena-ausente");
  try {
    assert.equal(quarentenar(join(pasta, "nao-existe.json")), null);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("duas quarentenas seguidas nao se sobrescrevem", () => {
  const pasta = pastaTemp("quarentena-colisao");
  const arquivo = join(pasta, "estado.json");
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    const um = quarentenar(arquivo);
    writeFileSync(arquivo, "segundo lixo", "utf8");
    const dois = quarentenar(arquivo);

    assert.ok(um && dois);
    assert.notEqual(um, dois);
    assert.equal(readFileSync(um, "utf8"), "primeiro lixo");
    assert.equal(readFileSync(dois, "utf8"), "segundo lixo");
    assert.equal(readdirSync(pasta).length, 2);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("quarentenarComErro devolve erro 409 citando o arquivo preservado", () => {
  const pasta = pastaTemp("quarentena-erro");
  const arquivo = join(pasta, "estado.json");
  try {
    writeFileSync(arquivo, "lixo", "utf8");
    const erro = quarentenarComErro(arquivo, "O registro de clientes");

    assert.ok(erro instanceof ErroDadoCorrompido);
    assert.equal(erro.statusCode, 409);
    assert.match(erro.message, /O registro de clientes esta corrompido/);
    assert.match(erro.message, /estado\.json\.corrompido-/);
    assert.equal(existsSync(arquivo), false);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("quarentenarOuFalhar lanca quando nao ha o que mover", () => {
  const pasta = pastaTemp("quarentena-falha");
  try {
    assert.throws(
      () => quarentenarOuFalhar(join(pasta, "nao-existe.json"), "O estado"),
      (erro: unknown) => erro instanceof ErroDadoCorrompido && erro.quarentena === null,
    );
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
