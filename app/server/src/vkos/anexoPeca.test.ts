import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LIMITE_ANEXO_BYTES } from "../anexos.js";
import { ErroCarrossel } from "./carrossel.js";
import { salvarAnexoPeca } from "./anexoPeca.js";

function comPeca(fn: (pasta: string) => void): void {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-anexo-"));
  try {
    fn(pasta);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

test("salva extensao aceita e cria nome livre em colisao", () => {
  comPeca((pasta) => {
    assert.equal(salvarAnexoPeca(pasta, "briefing.pdf", "dGVzdGU="), "anexos/briefing.pdf");
    assert.equal(salvarAnexoPeca(pasta, "briefing.pdf", "b3V0cm8="), "anexos/briefing-2.pdf");
    assert.equal(readFileSync(join(pasta, "anexos", "briefing-2.pdf"), "utf8"), "outro");
  });
});

test("recusa extensao e traversal", () => {
  comPeca((pasta) => {
    assert.throws(() => salvarAnexoPeca(pasta, "arquivo.exe", "dGVzdGU="), ErroCarrossel);
    assert.throws(() => salvarAnexoPeca(pasta, "../arquivo.pdf", "dGVzdGU="), ErroCarrossel);
    assert.equal(existsSync(join(pasta, "arquivo.pdf")), false);
  });
});

test("recusa arquivo maior que o limite", () => {
  comPeca((pasta) => {
    const conteudo = Buffer.alloc(LIMITE_ANEXO_BYTES + 1).toString("base64");
    assert.throws(
      () => salvarAnexoPeca(pasta, "grande.pdf", conteudo),
      (erro: unknown) => erro instanceof ErroCarrossel && erro.status === 413,
    );
  });
});
