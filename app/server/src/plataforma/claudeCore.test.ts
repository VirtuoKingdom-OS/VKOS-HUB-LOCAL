import assert from "node:assert/strict";
import test from "node:test";

import { contaDoStatusClaude } from "./claudeCore.js";

test("extrai a conta do status JSON sem devolver o documento inteiro", () => {
  assert.equal(
    contaDoStatusClaude(
      JSON.stringify({ loggedIn: true, email: "jesse@exemplo.com", token: "segredo" }),
    ),
    "jesse@exemplo.com",
  );
});

test("aceita status textual antigo e ausência de conta", () => {
  assert.equal(
    contaDoStatusClaude("Logged in as jesse@exemplo.com"),
    "jesse@exemplo.com",
  );
  assert.equal(contaDoStatusClaude("Logged in"), null);
});
