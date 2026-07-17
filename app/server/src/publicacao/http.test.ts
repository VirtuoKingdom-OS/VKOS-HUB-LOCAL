import assert from "node:assert/strict";
import test from "node:test";

import { ErroPublicacao, lerRespostaExterna } from "./http.js";

test("traduz token recusado sem expor o corpo externo", async () => {
  const resposta = new Response(JSON.stringify({ message: "Bad credentials" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
  await assert.rejects(
    () => lerRespostaExterna(resposta, "GitHub"),
    (erro: unknown) =>
      erro instanceof ErroPublicacao &&
      erro.statusHttp === 401 &&
      erro.message === "Token recusado pelo GitHub. Confira a conexão em Conexões.",
  );
});

test("preserva resposta json no caso feliz", async () => {
  const resposta = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  assert.deepEqual(await lerRespostaExterna<{ ok: boolean }>(resposta, "Netlify"), {
    ok: true,
  });
});
