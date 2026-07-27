import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { anexarJsonl, anexarJsonlSemRepetir, lerJsonl } from "./jsonl.js";

interface Linha {
  id: string;
  texto: string;
}

function ehLinha(valor: unknown): boolean {
  if (!valor || typeof valor !== "object") return false;
  const linha = valor as Record<string, unknown>;
  return typeof linha.id === "string" && typeof linha.texto === "string";
}

function pastaTemp(nome: string): string {
  return mkdtempSync(join(tmpdir(), `vkos-jsonl-${nome}-`));
}

test("arquivo ausente devolve lista vazia sem criar nada", () => {
  const pasta = pastaTemp("ausente");
  try {
    const caminho = join(pasta, "historico.jsonl");
    assert.deepEqual(lerJsonl<Linha>(caminho, ehLinha), { itens: [], linhasInvalidas: 0 });
    assert.equal(existsSync(caminho), false);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("anexa preservando a ordem e cria a pasta que faltava", () => {
  const pasta = pastaTemp("ordem");
  try {
    // A pasta do meio nao existe: anexar precisa cria-la.
    const caminho = join(pasta, "crm", "historico.jsonl");
    anexarJsonl(caminho, [{ id: "a", texto: "primeiro" }]);
    anexarJsonl(caminho, [{ id: "b", texto: "segundo" }, { id: "c", texto: "terceiro" }]);
    const { itens, linhasInvalidas } = lerJsonl<Linha>(caminho, ehLinha);
    assert.equal(linhasInvalidas, 0);
    assert.deepEqual(itens.map((item) => item.id), ["a", "b", "c"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("anexar lista vazia nem toca no disco", () => {
  const pasta = pastaTemp("vazio");
  try {
    const caminho = join(pasta, "historico.jsonl");
    anexarJsonl(caminho, []);
    assert.equal(existsSync(caminho), false);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// Uma linha corrompida custa um registro, nunca o arquivo inteiro.
test("linha invalida e pulada e contada, o resto continua legivel", () => {
  const pasta = pastaTemp("corrompida");
  try {
    const caminho = join(pasta, "historico.jsonl");
    anexarJsonl(caminho, [{ id: "a", texto: "bom" }]);
    appendFileSync(caminho, '{"id":"b","texto":\n', "utf8");
    appendFileSync(caminho, "42\n", "utf8");
    appendFileSync(caminho, '{"sem":"forma"}\n', "utf8");
    anexarJsonl(caminho, [{ id: "z", texto: "tambem bom" }]);

    const { itens, linhasInvalidas } = lerJsonl<Linha>(caminho, ehLinha);
    assert.deepEqual(itens.map((item) => item.id), ["a", "z"]);
    assert.equal(linhasInvalidas, 3);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

// E o que deixa a migracao rodar duas vezes sem duplicar historico.
test("anexar sem repetir ignora id que ja esta no arquivo", () => {
  const pasta = pastaTemp("repetir");
  try {
    const caminho = join(pasta, "historico.jsonl");
    const lote: Linha[] = [
      { id: "a", texto: "um" },
      { id: "b", texto: "dois" },
    ];
    assert.equal(anexarJsonlSemRepetir(caminho, lote, (i) => i.id, ehLinha), 2);
    assert.equal(anexarJsonlSemRepetir(caminho, lote, (i) => i.id, ehLinha), 0);
    assert.equal(
      anexarJsonlSemRepetir(
        caminho,
        [...lote, { id: "c", texto: "tres" }],
        (i) => i.id,
        ehLinha,
      ),
      1,
    );
    const { itens } = lerJsonl<Linha>(caminho, ehLinha);
    assert.deepEqual(itens.map((item) => item.id), ["a", "b", "c"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("id repetido dentro do mesmo lote entra uma vez so", () => {
  const pasta = pastaTemp("lote");
  try {
    const caminho = join(pasta, "historico.jsonl");
    const gravadas = anexarJsonlSemRepetir(
      caminho,
      [
        { id: "a", texto: "um" },
        { id: "a", texto: "um de novo" },
      ],
      (i) => i.id,
      ehLinha,
    );
    assert.equal(gravadas, 1);
    assert.equal(readFileSync(caminho, "utf8").trim().split("\n").length, 1);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
