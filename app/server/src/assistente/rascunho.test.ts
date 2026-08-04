import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerLoteDoRascunho } from "./rascunho.js";

test("rascunho aceita lote.json e recusa qualquer outro arquivo", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-rascunho-"));
  writeFileSync(
    join(pasta, "lote.json"),
    JSON.stringify({
      id: "l-1",
      conversaId: "c-1",
      tarefas: [
        {
          workspaceId: "w-1",
          tipo: "anuncio",
          dados: {
            oferta: "Sessão de fotos",
            objetivo: "gerar contatos",
            destino: "whatsapp",
            linkDestino: "",
            praca: "Curitiba",
            raio: "",
            orcamentoDiario: "30",
            detalhes: "",
          },
        },
      ],
    }),
    "utf8",
  );
  assert.equal(lerLoteDoRascunho(pasta)?.id, "l-1");

  mkdirSync(join(pasta, "nao-permitido"));
  writeFileSync(join(pasta, "nao-permitido", "segredo.txt"), "x", "utf8");
  assert.throws(() => lerLoteDoRascunho(pasta), /só pode escrever lote\.json/);
});
