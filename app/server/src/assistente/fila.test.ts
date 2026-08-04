import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FilaAssistente } from "./fila.js";

function filaTeste(): FilaAssistente {
  return new FilaAssistente(join(mkdtempSync(join(tmpdir(), "vkos-fila-")), "fila.jsonl"));
}

const tarefa = {
  id: "t-1",
  loteId: "l-1",
  criadaEm: "2026-08-04T00:00:00.000Z",
  origem: "assistente" as const,
  conversaId: "c-1",
  workspaceId: "w-1",
  workspaceNome: "Mae Pixel",
  tipo: "site" as const,
  dados: {
    tema: "Studio de fotografia",
    detalhes: "",
    formato: "unica" as const,
    objetivo: "contato" as const,
    objetivoLivre: "",
    linkObjetivo: "",
    secoesLivre: "",
    modoImagem: "sem" as const,
    anexos: [],
    visualModo: "negocio" as const,
    corFundo: "",
    corDestaque: "",
    corTexto: "",
    fonteTitulos: "Inter",
    fonteCorpo: "Inter",
    aprimorarComIA: true,
  },
  estado: "proposta" as const,
};

test("fila e append-only e a leitura colapsa a ultima versao por id", () => {
  const fila = filaTeste();
  fila.adicionar(tarefa);
  fila.mudarEstado("t-1", "aprovada");
  fila.mudarEstado("t-1", "na-fila");

  assert.equal(fila.listar().length, 1);
  assert.equal(fila.listar()[0]?.estado, "na-fila");
  const linhas = readFileSync(fila.caminho, "utf8").trim().split("\n");
  assert.equal(linhas.length, 3);
});

test("aprovar lote e o unico caminho de proposta para aprovada", () => {
  const fila = filaTeste();
  fila.adicionar(tarefa);

  assert.throws(() => fila.mudarEstado("t-1", "na-fila"), /proposta.*aprova/i);
  fila.aprovarLote("l-1");
  assert.equal(fila.listar()[0]?.estado, "aprovada");
});

test("tarefa que estava rodando no boot vira falha declarada", () => {
  const fila = filaTeste();
  fila.adicionar({ ...tarefa, estado: "aprovada" });
  fila.mudarEstado("t-1", "na-fila");
  fila.mudarEstado("t-1", "rodando");

  fila.sanearRodando("O Hub foi reiniciado durante a execução.");
  const recuperada = fila.achar("t-1");
  assert.equal(recuperada?.estado, "falhou");
  assert.equal(recuperada?.erro, "O Hub foi reiniciado durante a execução.");
});
