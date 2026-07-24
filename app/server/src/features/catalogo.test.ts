import assert from "node:assert/strict";
import { test } from "node:test";

import { CATALOGO_FEATURES, normalizarFeaturesLegadas, validarDependencias } from "./catalogo.js";

test("catalogo registra as 11 features sem ids ou rotas repetidas", () => {
  assert.equal(CATALOGO_FEATURES.length, 11);
  assert.equal(new Set(CATALOGO_FEATURES.map((feature) => feature.id)).size, 11);
  const rotas = CATALOGO_FEATURES.flatMap((feature) => feature.rotasApi);
  assert.equal(new Set(rotas).size, rotas.length);
});

test("recursos internos nunca ficam disponiveis no hub do cliente", () => {
  for (const id of ["admin", "automacoes", "conexoes"]) {
    const feature = CATALOGO_FEATURES.find((item) => item.id === id);
    assert.equal(feature?.disponivelParaCliente, false, id);
  }
});

test("dependencias ausentes sao explicadas", () => {
  assert.deepEqual(validarDependencias(["leads"]), [
    "Buscar leads depende de CRM.",
  ]);
  assert.deepEqual(validarDependencias(["leads", "crm"]), []);
  assert.deepEqual(validarDependencias(["site-guiado"]), [
    "Site guiado depende de Cockpit.",
  ]);
});

test("features antigas do nucleo viram um unico cockpit sem duplicar", () => {
  assert.deepEqual(
    normalizarFeaturesLegadas([
      "cerebro",
      { id: "fontes", config: { origem: true } },
      { id: "cockpit", config: { canvas: true } },
      "crm",
    ]),
    [
      { id: "cockpit", config: { origem: true, canvas: true } },
      { id: "crm" },
    ],
  );
});
