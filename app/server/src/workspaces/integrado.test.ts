import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { NOME_PASTA_MODELO, localizarVkosIntegrado, semearDoModelo } from "./integrado.js";

// Monta o minimo que validarPastaVkos exige: cerebro/cerebro.md e .claude/skills.
async function montarVkos(pasta: string, corpoCerebro = "# Cerebro\n\n✍️\n"): Promise<void> {
  await mkdir(join(pasta, "cerebro"), { recursive: true });
  await mkdir(join(pasta, ".claude", "skills"), { recursive: true });
  await writeFile(join(pasta, "cerebro", "cerebro.md"), corpoCerebro, "utf8");
}

test("localiza o VKOS que veio junto do pacote", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "vkos-integrado-"));
  const pasta = join(raiz, "VKOS");
  try {
    await montarVkos(pasta);
    assert.equal(localizarVkosIntegrado(raiz), pasta);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test("nao inventa workspace quando o pacote esta incompleto", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "vkos-integrado-vazio-"));
  try {
    assert.equal(localizarVkosIntegrado(raiz), null);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test("semeia o primeiro workspace a partir do modelo versionado", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "vkos-modelo-"));
  try {
    await montarVkos(join(raiz, NOME_PASTA_MODELO));
    await mkdir(join(raiz, NOME_PASTA_MODELO, "node_modules", "peso"), { recursive: true });
    await writeFile(join(raiz, NOME_PASTA_MODELO, "node_modules", "peso", "a.js"), "//", "utf8");

    const destino = semearDoModelo(raiz);
    assert.equal(destino, join(raiz, "workspaces", "meu-negocio"));
    assert.ok(existsSync(join(destino!, "cerebro", "cerebro.md")));
    assert.ok(existsSync(join(destino!, ".claude", "skills")));
    // node_modules do modelo nao viaja junto.
    assert.equal(existsSync(join(destino!, "node_modules")), false);
    // O modelo continua no lugar, intacto.
    assert.ok(existsSync(join(raiz, NOME_PASTA_MODELO, "cerebro", "cerebro.md")));
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test("semear duas vezes nao sobrescreve o cerebro ja preenchido", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "vkos-modelo-idem-"));
  try {
    await montarVkos(join(raiz, NOME_PASTA_MODELO));
    const destino = semearDoModelo(raiz)!;
    await writeFile(join(destino, "cerebro", "cerebro.md"), "# Meu negocio de verdade\n", "utf8");

    assert.equal(semearDoModelo(raiz), destino);
    const { readFile } = await import("node:fs/promises");
    const corpo = await readFile(join(destino, "cerebro", "cerebro.md"), "utf8");
    assert.match(corpo, /Meu negocio de verdade/);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test("sem modelo no lugar, nao semeia nada", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "vkos-modelo-ausente-"));
  try {
    assert.equal(semearDoModelo(raiz), null);
    assert.equal(existsSync(join(raiz, "workspaces")), false);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});
