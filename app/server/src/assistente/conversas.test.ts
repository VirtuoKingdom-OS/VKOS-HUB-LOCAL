import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  apagarConversaAssistente,
  acharConversaAssistente,
  criarConversaAssistente,
  listarConversasAssistente,
} from "./conversas.js";

test("conversa cria a pasta persistente antes do primeiro indice", () => {
  const anterior = process.env.VKOS_DADOS_TESTE;
  process.env.VKOS_DADOS_TESTE = mkdtempSync(join(tmpdir(), "vkos-conversas-"));

  try {
    const conversa = criarConversaAssistente();
    assert.equal(acharConversaAssistente(conversa.id)?.id, conversa.id);
    assert.equal(listarConversasAssistente()[0]?.id, conversa.id);
    assert.equal(apagarConversaAssistente(conversa.id), true);
    assert.equal(listarConversasAssistente().length, 0);
  } finally {
    if (anterior === undefined) delete process.env.VKOS_DADOS_TESTE;
    else process.env.VKOS_DADOS_TESTE = anterior;
  }
});
