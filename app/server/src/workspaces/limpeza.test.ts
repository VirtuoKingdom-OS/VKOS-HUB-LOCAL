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

// A6: excluir workspace apaga os dados do hub que sobraram na pasta do cliente,
// mas nunca toca a pasta VKOS dele. Usa um id claramente de teste, sem mexer no
// registro.
//
// O CRM e as conexoes subiram pro CORE em 2026-07-27, entao o arquivo VIVO dos
// dois nao mora mais aqui. O que pode ter ficado e a copia preservada pela
// migracao ("<nome>.migrado-para-core-<carimbo>"), e ela carrega token de
// verdade. Ela precisa ir embora junto com a pasta: e o unico segredo que ainda
// vive no escopo do cliente.
test("apagar dados do workspace leva junto a copia migrada com segredo dentro", () => {
  const id = `w-teste-a6-${Math.random().toString(36).slice(2, 8)}`;
  const pastaDados = garantirPastaDadosWorkspace(id);
  const migrado = join(pastaDados, "conexoes.json.migrado-para-core-2026-07-27T00-00-00");
  writeFileSync(migrado, '{"servidores":{"apify":{"config":{"token":"segredo"}}}}', "utf8");
  writeFileSync(join(pastaDados, "crm.json.migrado-para-core-2026-07-27T00-00-00"), '{"contatos":[]}', "utf8");
  writeFileSync(join(pastaDados, "custos.jsonl"), "", "utf8");

  // Pasta VKOS do cliente, separada e representada por um tmpdir proprio.
  const pastaVkos = mkdtempSync(join(tmpdir(), "vkos-cliente-"));
  writeFileSync(join(pastaVkos, "marcador.txt"), "conteudo do cliente", "utf8");

  try {
    assert.equal(existsSync(pastaDados), true);
    assert.equal(existsSync(migrado), true);

    apagarPastaDadosWorkspace(id);

    // A pasta de dados do hub sumiu por inteiro, com a copia migrada dentro.
    assert.equal(existsSync(pastaDadosWorkspace(id)), false);
    assert.equal(existsSync(migrado), false);
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
