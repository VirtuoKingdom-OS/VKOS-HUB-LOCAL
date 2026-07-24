import assert from "node:assert/strict";
import test from "node:test";

import { MOTORES_ADMIN, nomeMotorAdmin } from "./motoresAdmin.js";

test("Admin oferece somente Gemini e Claude Team", () => {
  assert.deepEqual(
    MOTORES_ADMIN.map((motor) => motor.id),
    ["gemini", "claude_team"],
  );
  assert.equal(nomeMotorAdmin("nenhum"), "IA em manutenção");
});
