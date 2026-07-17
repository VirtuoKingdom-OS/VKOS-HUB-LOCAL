import assert from "node:assert/strict";
import test from "node:test";

import {
  argumentosWinget,
  limparSaidaInstalacao,
  pacoteDoProvedor,
} from "./instalacaoMotor.js";

test("instalador aceita somente os pacotes oficiais mapeados", () => {
  assert.equal(pacoteDoProvedor("claude"), "Anthropic.ClaudeCode");
  assert.equal(pacoteDoProvedor("codex"), "OpenAI.Codex");
  assert.deepEqual(argumentosWinget("codex").slice(0, 5), [
    "install",
    "--id",
    "OpenAI.Codex",
    "--exact",
    "--source",
  ]);
  assert.ok(argumentosWinget("claude").includes("--disable-interactivity"));
});

test("log remove controles do terminal e progresso vazio", () => {
  const saida = limparSaidaInstalacao(
    "\u001b[32mBaixando\u001b[0m\r\n  |  \r\nInstalado com sucesso\u0000",
  );
  assert.equal(saida, "Baixando\nInstalado com sucesso");
});

