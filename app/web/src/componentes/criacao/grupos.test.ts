import assert from "node:assert/strict";
import test from "node:test";

import type { ModeloCarrossel } from "../../tipos/dominio";
import { modelosDoGrupo } from "./grupos";

const modelos = (["capa", "desenvolvimento", "cta", "completo"] as const).map(
  (tipo): ModeloCarrossel => ({
    id: tipo,
    nome: tipo,
    descricao: "",
    arquivo: `${tipo}.html`,
    pedeImagem: false,
    tipo,
  }),
);

test("cada grupo recebe somente os tipos compatíveis", () => {
  assert.deepEqual(modelosDoGrupo(modelos, "capa").map((m) => m.id), ["capa", "completo"]);
  assert.deepEqual(
    modelosDoGrupo(modelos, "desenvolvimento").map((m) => m.id),
    ["desenvolvimento", "completo"],
  );
  assert.deepEqual(modelosDoGrupo(modelos, "cta").map((m) => m.id), ["cta", "completo"]);
  assert.deepEqual(
    modelosDoGrupo(modelos, "unica").map((m) => m.id),
    ["capa", "desenvolvimento", "completo"],
  );
});

test("modelo antigo sem tipo continua completo", () => {
  const antigo = { ...modelos[0], id: "antigo", tipo: undefined };
  for (const grupo of ["capa", "desenvolvimento", "cta", "unica"] as const) {
    assert.equal(modelosDoGrupo([antigo], grupo).length, 1);
  }
});
