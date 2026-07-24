import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, test } from "node:test";

import {
  caminhoVinculoMeta,
  lerVinculoMeta,
  pastaMeta,
  salvarVinculoMeta,
} from "./estado.js";

const workspaceId = `meta-teste-${process.pid}`;

after(() => {
  const pasta = pastaMeta(workspaceId);
  assert.equal(pasta.endsWith(`workspaces\\${workspaceId}\\meta`) || pasta.endsWith(`workspaces/${workspaceId}/meta`), true);
  rmSync(pasta, { recursive: true, force: true });
});

test("vinculo por workspace e atomico e descarta campos desconhecidos", () => {
  const salvo = salvarVinculoMeta(workspaceId, {
    instagramId: "1784",
    paginaId: "1029",
  });
  assert.equal(salvo.instagramId, "1784");
  assert.equal(salvo.paginaId, "1029");
  assert.ok(salvo.vinculadoEm);
  assert.equal(caminhoVinculoMeta(workspaceId).endsWith("vinculo.json"), true);
  assert.deepEqual(lerVinculoMeta(workspaceId), salvo);
});
