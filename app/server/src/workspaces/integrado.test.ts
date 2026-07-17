import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { localizarVkosIntegrado } from "./integrado.js";

test("localiza o VKOS que veio junto do pacote", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "vkos-integrado-"));
  const pasta = join(raiz, "VKOS");
  try {
    await mkdir(join(pasta, "cerebro"), { recursive: true });
    await mkdir(join(pasta, ".claude", "skills"), { recursive: true });
    await writeFile(join(pasta, "cerebro", "cerebro.md"), "# Cerebro\n\n✍️\n", "utf8");
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
