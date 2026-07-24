import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { montarPromptModelo } from "./promptModelo";

const FIXTURE = readFileSync(
  new URL("./fixtures/prompt-modelo-referencia.txt", import.meta.url),
  "utf8",
).trimEnd();

test("prompt de cópia por referência mantém o contrato do modelo", () => {
  const prompt = montarPromptModelo({
    nome: "Grid editorial",
    tipo: "completo",
    pasta: "2026-07-23-modelo-grid-editorial",
    imagem: "materiais/cockpit/anexos/referencia.png",
    instrucoes: "Mantenha o bloco numérico no canto.",
  });
  assert.equal(prompt, FIXTURE);
  assert.match(prompt, /principios-modelos\.md inteiro/);
  assert.match(prompt, /largura 1080px, altura 1350px/);
  assert.match(prompt, /variáveis no :root/);
  assert.match(prompt, /não uma peça pública/);
});
