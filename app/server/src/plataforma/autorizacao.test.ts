import assert from "node:assert/strict";
import { test } from "node:test";

import { CATALOGO_FEATURES } from "../features/catalogo.js";
import { clientePodeAcessarRota, featureDaRota } from "./autorizacao.js";

test("cada rota declarada exige a feature dona no hub", () => {
  for (const feature of CATALOGO_FEATURES) {
    for (const rota of feature.rotasApi) {
      assert.equal(featureDaRota(rota), feature.id, rota);
      assert.equal(clientePodeAcessarRota(rota, new Set()), false, rota);
      assert.equal(
        clientePodeAcessarRota(rota, new Set([feature.id])),
        true,
        rota,
      );
    }
  }
});

test("prefixos respeitam fronteira e rotas de sistema nao ganham dono", () => {
  assert.equal(featureDaRota("/api/vkos/cerebro/salvar"), "cockpit");
  assert.equal(featureDaRota("/api/crm-inventado"), null);
  assert.equal(featureDaRota("/api/auth/me"), null);
  assert.equal(featureDaRota("/api/features-ativas"), null);
  assert.equal(clientePodeAcessarRota("/api/saude", new Set()), true);
});
