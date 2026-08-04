import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { RastroAssistente } from "./rastro.js";

test("rastro conserva efeitos do servidor e pagina sem apagar o inicio", () => {
  const rastro = new RastroAssistente(join(mkdtempSync(join(tmpdir(), "vkos-rastro-")), "rastro.jsonl"));
  rastro.registrar({
    tipo: "tarefa:concluida",
    fonte: "servidor",
    workspaceId: "w-1",
    pasta: "2026-08-04-carrossel",
    sessaoId: "s-1",
    custoUsd: 0.12,
  });
  rastro.registrar({ tipo: "lote:aprovado", fonte: "servidor", loteId: "l-1" });

  const primeira = rastro.listar({ limite: 1 });
  assert.equal(primeira.itens.length, 1);
  assert.equal(primeira.itens[0]?.tipo, "lote:aprovado");
  assert.ok(primeira.proximoCursor);

  const segunda = rastro.listar({ limite: 10, cursor: primeira.proximoCursor });
  assert.equal(segunda.itens[0]?.tipo, "tarefa:concluida");
  assert.equal(segunda.itens[0]?.pasta, "2026-08-04-carrossel");
});

test("rastro recusa uma fonte que nao seja efeito do servidor", () => {
  const rastro = new RastroAssistente(join(mkdtempSync(join(tmpdir(), "vkos-rastro-")), "rastro.jsonl"));
  assert.throws(
    () => rastro.registrar({ tipo: "texto-da-ia", fonte: "ia" as never }),
    /servidor/,
  );
});
