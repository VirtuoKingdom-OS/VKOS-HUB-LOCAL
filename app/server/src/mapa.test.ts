import assert from "node:assert/strict";
import test from "node:test";

import { lerMapaTelas, validarMapaTelas } from "./mapa.js";

test("o mapa de telas real do repositorio passa no schema", async () => {
  const mapa = await lerMapaTelas();
  assert.ok(mapa, "mapa-telas.json deveria ser valido");
  assert.equal(mapa.versao, 1);
  assert.ok(mapa.telas.length > 0);
  assert.ok(mapa.zonas.length > 0);
});

test("cada tela aponta para uma zona existente", async () => {
  const mapa = await lerMapaTelas();
  assert.ok(mapa);
  const zonas = new Set(mapa.zonas.map((z) => z.id));
  for (const tela of mapa.telas) {
    assert.ok(zonas.has(tela.zona), `zona ausente: ${tela.zona}`);
  }
});

test("ligacoes e jornadas so citam telas existentes", async () => {
  const mapa = await lerMapaTelas();
  assert.ok(mapa);
  const telas = new Set(mapa.telas.map((t) => t.id));
  for (const l of mapa.ligacoes) {
    assert.ok(telas.has(l.de) && telas.has(l.para), `ponta ausente: ${l.de}->${l.para}`);
  }
  for (const j of mapa.jornadas) {
    for (const passo of j.passos) {
      assert.ok(telas.has(passo), `jornada ${j.id} cita tela ausente: ${passo}`);
    }
  }
});

test("recusa mapa com ligacao apontando pra tela inexistente", () => {
  const invalido = {
    versao: 1,
    zonas: [{ id: "z", nome: "Z", cor: "menta" }],
    telas: [
      {
        id: "a",
        zona: "z",
        nome: "A",
        rota: "#/a",
        destino: "dashboard",
        resumo: "r",
        descricao: "d",
        estados: [],
        esqueleto: "lista",
      },
    ],
    ligacoes: [{ de: "a", para: "fantasma", gesto: "clica" }],
    jornadas: [],
  };
  assert.equal(validarMapaTelas(invalido), null);
});

test("recusa jornada citando tela inexistente", () => {
  const invalido = {
    versao: 1,
    zonas: [{ id: "z", nome: "Z", cor: "menta" }],
    telas: [
      {
        id: "a",
        zona: "z",
        nome: "A",
        rota: "#/a",
        destino: null,
        resumo: "r",
        descricao: "d",
        estados: [],
        esqueleto: "lista",
      },
    ],
    ligacoes: [],
    jornadas: [{ id: "j", nome: "J", resumo: "r", cor: "menta", passos: ["a", "fantasma"] }],
  };
  assert.equal(validarMapaTelas(invalido), null);
});
