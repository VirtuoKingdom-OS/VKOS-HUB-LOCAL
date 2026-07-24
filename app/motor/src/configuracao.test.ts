import assert from "node:assert/strict";
import test from "node:test";

import { geminiConfigurado } from "./configuracao.js";

test("Gemini aceita identidade do ambiente sem arquivo explícito", () => {
  assert.equal(geminiConfigurado({ GOOGLE_CLOUD_PROJECT: "projeto" }), true);
  assert.equal(geminiConfigurado({}), false);
});

test("arquivo explícito precisa conter uma conta de serviço", () => {
  const ambiente = {
    GOOGLE_CLOUD_PROJECT: "projeto",
    GOOGLE_APPLICATION_CREDENTIALS: "/segredo.json",
  };
  assert.equal(
    geminiConfigurado(ambiente, {
      existe: () => true,
      ler: () => "{}",
    }),
    false,
  );
  assert.equal(
    geminiConfigurado(ambiente, {
      existe: () => true,
      ler: () => JSON.stringify({
        client_email: "motor@projeto.iam.gserviceaccount.com",
        private_key: "segredo",
      }),
    }),
    true,
  );
});
