import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

const temporaria = mkdtempSync(join(tmpdir(), "vkos-meta-"));
const workspaceId = `meta-coletor-${process.pid}`;
process.env.VKOS_CONEXOES_ARQUIVO = join(temporaria, "conexoes.json");
process.env.VKOS_META_TESTE_ARQUIVO = join(temporaria, "teste.json");
process.env.META_GRAPH_TESTE = "1";

let falso: Awaited<ReturnType<typeof import("./graph-falso.js").iniciarGraphFalso>>;
let pasta: string;

before(async () => {
  const { iniciarGraphFalso } = await import("./graph-falso.js");
  falso = await iniciarGraphFalso();
  const { configurarEndpointsInternosMeta } = await import("./graph.js");
  configurarEndpointsInternosMeta({ base: falso.base, esperar: async () => undefined });
  const { salvarCredencialMeta } = await import("./credencial.js");
  const estado = await salvarCredencialMeta({
    appId: "app-1",
    appSecret: "secret",
    businessId: "business-1",
    tokenSistema: "token-valido",
  });
  assert.equal(estado.config.appSecret.includes("secret"), false);
  assert.equal(estado.config.tokenSistema.includes("token-valido"), false);
  const { pastaMeta, salvarVinculoMeta } = await import("./estado.js");
  pasta = pastaMeta(workspaceId);
  salvarVinculoMeta(workspaceId, {
    instagramId: "178400000001",
    contaAnunciosId: "act_123456789",
    paginaId: "102900000001",
  });
});

after(async () => {
  await falso.fechar();
  if (pasta) {
    assert.equal(pasta.includes(workspaceId), true);
    rmSync(pasta, { recursive: true, force: true });
  }
  rmSync(temporaria, { recursive: true, force: true });
});

test("coletor grava todos os produtos, poda a serie e aplica intervalo manual", async () => {
  mkdirSync(pasta, { recursive: true });
  writeFileSync(
    join(pasta, "instagram-perfil.jsonl"),
    Array.from({ length: 401 }, (_, indice) =>
      JSON.stringify({ data: `2025-${String(Math.floor(indice / 28) + 1).padStart(2, "0")}-${String(indice % 28 + 1).padStart(2, "0")}`, seguidores: indice }),
    ).join("\n") + "\n",
    "utf8",
  );

  const { coletarAgoraMeta } = await import("./coletor.js");
  await coletarAgoraMeta(workspaceId);

  const perfil = readFileSync(join(pasta, "instagram-perfil.jsonl"), "utf8")
    .trim().split(/\r?\n/);
  assert.equal(perfil.length, 400);
  assert.equal(existsSync(join(pasta, "instagram-publicacoes.json")), true);
  assert.equal(existsSync(join(pasta, "anuncios.jsonl")), true);
  assert.equal(existsSync(join(pasta, "facebook.jsonl")), true);
  assert.equal(existsSync(join(pasta, "facebook-publicacoes.json")), true);

  assert.throws(
    () => coletarAgoraMeta(workspaceId),
    /Aguarde 15 minutos/,
  );
});
