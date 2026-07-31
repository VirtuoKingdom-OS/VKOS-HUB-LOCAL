import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { caminhoParaTela, telaParaCaminho } from "../layout/rotas";

// Le o mapa de telas real do repositorio (5 niveis acima deste arquivo).
const caminho = fileURLToPath(
  new URL("../../../../../interno/mapa-telas.json", import.meta.url),
);
const mapa = JSON.parse(readFileSync(caminho, "utf8")) as {
  telas: { id: string; destino: string | null }[];
};

// Destinos especiais e parametrizados que nao passam pela gramatica padrao.
const ESPECIAIS = new Set(["setup", "ide"]);
function ehParametrizado(destino: string): boolean {
  return (
    destino.startsWith("studio:@") ||
    destino.startsWith("site:@") ||
    destino.startsWith("fonte:@")
  );
}

test("todo destino padrao faz round-trip pela gramatica de rotas do Shell", () => {
  for (const tela of mapa.telas) {
    const d = tela.destino;
    if (d === null || ESPECIAIS.has(d) || ehParametrizado(d)) continue;
    // telaParaCaminho e caminhoParaTela precisam ser inversas: se nao forem, o
    // botao Abrir apontaria pra uma tela que o Shell nao reconhece.
    const roundTrip = caminhoParaTela(telaParaCaminho(d));
    assert.equal(roundTrip, d, `destino invalido em ${tela.id}: ${d}`);
  }
});

test("nenhum destino cai no fallback silencioso do dashboard", () => {
  for (const tela of mapa.telas) {
    const d = tela.destino;
    if (d === null || ESPECIAIS.has(d) || ehParametrizado(d) || d === "dashboard") {
      continue;
    }
    // Um destino que nao seja dashboard mas vire "/dashboard" e um erro de
    // digitacao no JSON: a gramatica nao o reconheceu.
    assert.notEqual(
      telaParaCaminho(d),
      "/dashboard",
      `destino desconhecido em ${tela.id}: ${d}`,
    );
  }
});

test("ids de tela sao unicos", () => {
  const vistos = new Set<string>();
  for (const tela of mapa.telas) {
    assert.ok(!vistos.has(tela.id), `id repetido: ${tela.id}`);
    vistos.add(tela.id);
  }
});
