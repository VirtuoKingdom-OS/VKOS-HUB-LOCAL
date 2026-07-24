import assert from "node:assert/strict";
import test from "node:test";

import {
  motivoBloqueioMotor,
  motorInicialDoModelo,
} from "./regrasMotores.js";

test("todo workspace nasce com Gemini, inclusive a partir de modelo antigo", () => {
  assert.equal(motorInicialDoModelo("claude_team"), "gemini");
  assert.equal(motorInicialDoModelo("gemini"), "gemini");
  assert.equal(motorInicialDoModelo("nenhum"), "gemini");
});

test("Gemini é sempre selecionável e Claude exige credencial válida", () => {
  assert.equal(
    motivoBloqueioMotor("gemini", { geminiDisponivel: false }),
    null,
  );
  assert.match(
    motivoBloqueioMotor("claude_team", {
      claudeCredencialStatus: "nao_testada",
    }) ?? "",
    /teste/,
  );
  assert.equal(
    motivoBloqueioMotor("claude_team", {
      claudeCredencialStatus: "valida",
    }),
    null,
  );
  assert.equal(motivoBloqueioMotor("nenhum", {}), null);
});
