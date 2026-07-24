import assert from "node:assert/strict";
import test from "node:test";

import { unirModelosCarrossel } from "./modelos.js";

test("uniao remove sombra b local e usa metadados do banco", () => {
  const resultado = unirModelosCarrossel(
    [
      { id: "vkos01", nome: "VKOS01", descricao: "", arquivo: "modelo-vkos01.html", pedeImagem: true },
      { id: "b-central", nome: "Sombra velha", descricao: "", arquivo: "modelo-b-central.html", pedeImagem: false },
    ],
    [{
      id: "b-central",
      nome: "Central",
      descricao: "Fonte da verdade",
      tipo: "cta",
      pedeImagem: false,
      criadoEm: "2026-01-01",
      atualizadoEm: "2026-01-01",
    }],
  );
  assert.deepEqual(resultado.map((item) => item.nome), ["VKOS01", "Central"]);
  assert.equal(resultado[1].origem, "banco");
  assert.equal(resultado[1].tipo, "cta");
});
