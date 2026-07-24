import assert from "node:assert/strict";
import { test } from "node:test";

import { ehLogoValida, gerarSlugUnico, normalizarSlug } from "./admin.js";

test("slug nasce do nome sem acento ou detalhe tecnico na interface", () => {
  assert.equal(normalizarSlug("Clínica São José"), "clinica-sao-jose");
});

test("slug recebe sufixo numerico quando ja existe", () => {
  assert.equal(
    gerarSlugUnico("Clínica São José", ["clinica-sao-jose", "clinica-sao-jose-2"]),
    "clinica-sao-jose-3",
  );
});

test("logo aceita data URL de imagem e recusa o resto", () => {
  assert.equal(ehLogoValida("data:image/png;base64,iVBORw0KGgoAAAA="), true);
  assert.equal(ehLogoValida("data:image/jpeg;base64,/9j/4AAQSkZJRg=="), true);
  assert.equal(ehLogoValida("data:text/html;base64,PHNjcmlwdD4="), false);
  assert.equal(ehLogoValida("https://exemplo.com/logo.png"), false);
  assert.equal(ehLogoValida(""), false);
  assert.equal(ehLogoValida(null), false);
  assert.equal(ehLogoValida("data:image/png;base64," + "A".repeat(400_001)), false);
});
