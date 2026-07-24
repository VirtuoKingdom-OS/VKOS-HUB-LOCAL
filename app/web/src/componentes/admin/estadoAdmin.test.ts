import assert from "node:assert/strict";
import test from "node:test";

import { trocarAbaLimpando } from "./estadoAdmin.js";

test("trocar de aba limpa erro e aviso antes de navegar", () => {
  const chamadas: string[] = [];
  trocarAbaLimpando(
    "acesso",
    (aba) => chamadas.push(`aba:${aba}`),
    (erro) => chamadas.push(`erro:${erro}`),
    (aviso) => chamadas.push(`aviso:${aviso}`),
  );
  assert.deepEqual(chamadas, ["erro:", "aviso:", "aba:acesso"]);
});
