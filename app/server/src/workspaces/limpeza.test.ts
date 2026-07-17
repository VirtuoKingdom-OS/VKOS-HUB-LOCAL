import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  apagarPastaDadosWorkspace,
  garantirPastaDadosWorkspace,
  pastaDadosWorkspace,
} from "./estado.js";

// A6: excluir workspace apaga os dados do hub (segredos e PII) mas nunca toca a
// pasta VKOS do cliente. Usa um id claramente de teste, sem mexer no registro.
test("apagar dados do workspace remove segredos e PII e deixa a pasta VKOS intacta", () => {
  const id = `w-teste-a6-${Math.random().toString(36).slice(2, 8)}`;
  const pastaDados = garantirPastaDadosWorkspace(id);
  writeFileSync(join(pastaDados, "conexoes.json"), '{"refreshToken":"segredo"}', "utf8");
  writeFileSync(join(pastaDados, "crm.json"), '{"contatos":[]}', "utf8");

  // Pasta VKOS do cliente, separada e representada por um tmpdir proprio.
  const pastaVkos = mkdtempSync(join(tmpdir(), "vkos-cliente-"));
  writeFileSync(join(pastaVkos, "marcador.txt"), "conteudo do cliente", "utf8");

  try {
    assert.equal(existsSync(pastaDados), true);

    apagarPastaDadosWorkspace(id);

    // A pasta de dados do hub sumiu por inteiro.
    assert.equal(existsSync(pastaDadosWorkspace(id)), false);
    // A pasta do cliente segue intacta.
    assert.equal(existsSync(join(pastaVkos, "marcador.txt")), true);

    // Idempotente: apagar de novo uma pasta ausente nao quebra.
    apagarPastaDadosWorkspace(id);
  } finally {
    rmSync(pastaVkos, { recursive: true, force: true });
    const p = pastaDadosWorkspace(id);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
});
