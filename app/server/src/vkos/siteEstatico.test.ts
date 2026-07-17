import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  auditarSiteEstatico,
  listarArquivosSite,
  neutralizarScriptsParaEdicao,
  resolverArquivoSite,
} from "./siteEstatico.js";

function pastaTeste(): string {
  return mkdtempSync(join(tmpdir(), "vkos-site-"));
}

test("audita landing, multipagina e paginas aninhadas com recursos compartilhados", () => {
  const pasta = pastaTeste();
  try {
    mkdirSync(join(pasta, "img"));
    mkdirSync(join(pasta, "servicos"));
    writeFileSync(
      join(pasta, "index.html"),
      '<link rel="stylesheet" href="styles.css"><script src="script.js"></script><a href="servicos/">Serviços</a><img src="img/capa.png">',
    );
    writeFileSync(
      join(pasta, "servicos", "index.html"),
      '<link rel="stylesheet" href="../styles.css"><a href="../index.html">Início</a>',
    );
    writeFileSync(join(pasta, "styles.css"), ".hero{background:url('img/capa.png')}");
    writeFileSync(join(pasta, "script.js"), "export const pronto = true;");
    writeFileSync(join(pasta, "img", "capa.png"), "png");

    const resultado = auditarSiteEstatico(pasta);
    assert.equal(resultado.valido, true);
    assert.deepEqual(resultado.erros, []);
    assert.deepEqual(resultado.paginas, ["index.html", "servicos/index.html"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("barra deploy quando falta index, recurso ou caminho e absoluto", () => {
  const pasta = pastaTeste();
  try {
    writeFileSync(
      join(pasta, "contato.html"),
      '<link rel="stylesheet" href="/styles.css"><img src="img/ausente.png">',
    );
    const resultado = auditarSiteEstatico(pasta);
    assert.equal(resultado.valido, false);
    assert.ok(resultado.erros.some((erro) => erro.includes("Falta o arquivo index.html")));
    assert.ok(resultado.erros.some((erro) => erro.includes("caminho absoluto")));
    assert.ok(resultado.erros.some((erro) => erro.includes("não existe")));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("exclui anexos, backups, temporarios e dependencias da arvore publicavel", () => {
  const pasta = pastaTeste();
  try {
    mkdirSync(join(pasta, "anexos"));
    mkdirSync(join(pasta, "node_modules"));
    writeFileSync(join(pasta, "index.html"), "<h1>Site</h1>");
    writeFileSync(join(pasta, "index.html.bak"), "backup");
    writeFileSync(join(pasta, ".pagina-1.tmp"), "parcial");
    writeFileSync(join(pasta, "site.md"), "texto legado");
    writeFileSync(join(pasta, "anexos", "briefing.pdf"), "pdf");
    writeFileSync(join(pasta, "node_modules", "pacote.js"), "js");

    assert.deepEqual(listarArquivosSite(pasta), ["index.html"]);
    const resultado = auditarSiteEstatico(pasta);
    assert.equal(resultado.valido, false);
    assert.ok(resultado.erros.some((erro) => erro.includes("site.md")));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("resolve pagina aninhada e bloqueia traversal", () => {
  const pasta = pastaTeste();
  try {
    assert.equal(
      resolverArquivoSite(pasta, "servicos/index.html"),
      join(pasta, "servicos", "index.html"),
    );
    assert.throws(() => resolverArquivoSite(pasta, "../index.html"));
    assert.throws(() => resolverArquivoSite(pasta, "/index.html"));
    assert.throws(() => resolverArquivoSite(pasta, "carrossel.html"));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("neutraliza scripts sem perder o tipo original", () => {
  const html = [
    '<script src="app.js"></script>',
    '<script type="module" src="modulo.js"></script>',
    '<script type="application/ld+json">{"ok":true}</script>',
  ].join("");
  const editavel = neutralizarScriptsParaEdicao(html);
  assert.match(editavel, /data-vkos-script-sem-type="1"/);
  assert.match(editavel, /data-vkos-script-type="module"/);
  assert.match(editavel, /data-vkos-script-type="application%2Fld%2Bjson"/);
  assert.equal(
    (editavel.match(/type="application\/x-vkos-disabled"/g) ?? []).length,
    3,
  );
});
