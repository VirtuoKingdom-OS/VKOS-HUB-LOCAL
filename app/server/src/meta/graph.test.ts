import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { iniciarGraphFalso } from "./graph-falso.js";
import {
  configurarEndpointsInternosMeta,
  diagnosticarCredencialMeta,
  descobrirAtivosMeta,
  ErroGraphMeta,
  interpretarRespostaGraph,
  montarUrlGraph,
  VERSAO_GRAPH_META,
} from "./graph.js";

let falso: Awaited<ReturnType<typeof iniciarGraphFalso>>;

before(async () => {
  process.env.META_GRAPH_TESTE = "1";
  falso = await iniciarGraphFalso();
  configurarEndpointsInternosMeta({ base: falso.base, esperar: async () => undefined });
});

after(async () => {
  await falso.fechar();
});

test("cliente fixa a versao atual e monta URL sem concatenacao insegura", () => {
  assert.equal(VERSAO_GRAPH_META, "v25.0");
  const url = new URL(montarUrlGraph("/me", { fields: "id,name" }, "segredo"));
  assert.equal(url.pathname, "/v25.0/me");
  assert.equal(url.searchParams.get("fields"), "id,name");
  assert.equal(url.searchParams.get("access_token"), "segredo");
});

test("erros da Graph viram falhas tipadas e claras", () => {
  assert.throws(
    () => interpretarRespostaGraph(401, { error: { code: 190 } }),
    (erro) => erro instanceof ErroGraphMeta
      && erro.codigo === "token_invalido"
      && !erro.message.includes("190"),
  );
  assert.throws(
    () => interpretarRespostaGraph(429, { error: { code: 4 } }),
    (erro) => erro instanceof ErroGraphMeta && erro.codigo === "limite",
  );
});

test("diagnostico confirma token, permissoes e Business Manager", async () => {
  const diagnosticos = await diagnosticarCredencialMeta({
    appId: "app-1",
    appSecret: "secret",
    businessId: "business-1",
    tokenSistema: "token-valido",
  });
  assert.equal(diagnosticos.every((item) => item.ok), true);
  assert.equal(diagnosticos.some((item) => item.item === "ads_read"), true);
});

test("descoberta junta Instagram, anuncios e Paginas visiveis", async () => {
  const ativos = await descobrirAtivosMeta({
    appId: "app-1",
    appSecret: "secret",
    businessId: "business-1",
    tokenSistema: "token-valido",
  });
  assert.equal(ativos.instagram[0]?.id, "178400000001");
  assert.equal(ativos.anuncios[0]?.id, "act_123456789");
  assert.equal(ativos.paginas[0]?.id, "102900000001");
});
