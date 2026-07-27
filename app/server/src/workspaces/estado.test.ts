import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerRegistroDeArquivo } from "./estado.js";

const NOME = "workspaces.json";

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-${nome}-`));
}

function quarentenas(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.startsWith(`${NOME}.corrompido-`));
}

test("registro ausente devolve null sem criar quarentena", () => {
  const pasta = pastaTemp("registro-ausente");
  try {
    assert.equal(lerRegistroDeArquivo(join(pasta, NOME)), null);
    assert.equal(readdirSync(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("registro valido carrega os workspaces e o ativo", () => {
  const pasta = pastaTemp("registro-valido");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(
      arquivo,
      JSON.stringify({
        workspaces: [{ id: "w-1", nome: "Cliente", pasta: "C:/vkos", criadoEm: "", ultimoUso: "" }],
        ativo: "w-1",
      }),
      "utf8",
    );
    const registro = lerRegistroDeArquivo(arquivo);
    assert.equal(registro?.workspaces.length, 1);
    assert.equal(registro?.ativo, "w-1");
    assert.equal(quarentenas(pasta).length, 0);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// O registro e a lista de clientes. Falha fechado: lanca em vez de devolver vazio.
test("registro corrompido vai pra quarentena com o conteudo original e lanca", () => {
  const pasta = pastaTemp("registro-corrompido");
  const arquivo = join(pasta, NOME);
  const original = '{ "workspaces": [ isto quebra';
  try {
    writeFileSync(arquivo, original, "utf8");
    assert.throws(() => lerRegistroDeArquivo(arquivo), /corrompido/i);

    // Saiu do lugar em vez de virar registro vazio.
    assert.equal(existsSync(arquivo), false);
    const movidos = quarentenas(pasta);
    assert.equal(movidos.length, 1);
    assert.equal(readFileSync(join(pasta, movidos[0]), "utf8"), original);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("json valido sem a lista de workspaces tambem vai pra quarentena", () => {
  const pasta = pastaTemp("registro-forma");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, '{"ativo":"w-1"}', "utf8");
    assert.throws(() => lerRegistroDeArquivo(arquivo), /corrompido/i);
    assert.equal(existsSync(arquivo), false);
    assert.equal(quarentenas(pasta).length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("dois registros corrompidos seguidos nao se sobrescrevem", () => {
  const pasta = pastaTemp("registro-colisao");
  const arquivo = join(pasta, NOME);
  try {
    writeFileSync(arquivo, "primeiro lixo", "utf8");
    assert.throws(() => lerRegistroDeArquivo(arquivo));
    writeFileSync(arquivo, "segundo lixo", "utf8");
    assert.throws(() => lerRegistroDeArquivo(arquivo));

    const movidos = quarentenas(pasta).sort();
    assert.equal(movidos.length, 2);
    const conteudos = movidos.map((n) => readFileSync(join(pasta, n), "utf8")).sort();
    assert.deepEqual(conteudos, ["primeiro lixo", "segundo lixo"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
