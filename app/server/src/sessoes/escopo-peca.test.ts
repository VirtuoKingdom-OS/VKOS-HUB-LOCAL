import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ErroEscopoPeca,
  montarPromptAjustePeca,
  resolverEscopoPeca,
} from "./escopo-peca.js";

function comVkos(fn: (base: string) => void) {
  const base = mkdtempSync(join(tmpdir(), "vkos-ajuste-"));
  try {
    mkdirSync(join(base, "conteudo", "carrossel-a"), { recursive: true });
    mkdirSync(join(base, "conteudo", "site-a"), { recursive: true });
    mkdirSync(join(base, "conteudo", "site-a", "servicos"), { recursive: true });
    writeFileSync(join(base, "conteudo", "carrossel-a", "carrossel.html"), "<html></html>");
    writeFileSync(join(base, "conteudo", "site-a", "index.html"), "<html></html>");
    writeFileSync(
      join(base, "conteudo", "site-a", "servicos", "index.html"),
      "<html><title>Serviços</title></html>",
    );
    fn(base);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

test("resolve carrossel e site dentro da propria pasta", () => {
  comVkos((base) => {
    const carrossel = resolverEscopoPeca(base, { pasta: "carrossel-a", tipo: "carrossel" });
    assert.equal(carrossel.arquivo, "carrossel.html");
    assert.equal(carrossel.skill, "ajuste-carrossel");

    const site = resolverEscopoPeca(base, { pasta: "site-a", tipo: "site", arquivo: "index.html" });
    assert.equal(site.arquivo, "index.html");
    assert.equal(site.skill, "ajuste-site");

    const paginaAninhada = resolverEscopoPeca(base, {
      pasta: "site-a",
      tipo: "site",
      arquivo: "servicos/index.html",
    });
    assert.equal(paginaAninhada.arquivo, "servicos/index.html");
  });
});

test("barra travessia e arquivo externo sao rejeitados", () => {
  comVkos((base) => {
    assert.throws(
      () => resolverEscopoPeca(base, { pasta: "../site-a", tipo: "site", arquivo: "index.html" }),
      ErroEscopoPeca,
    );
    assert.throws(
      () => resolverEscopoPeca(base, { pasta: "site-a", tipo: "site", arquivo: "../fora.html" }),
      ErroEscopoPeca,
    );
  });
});

test("prompt injeta contexto integral e repete o limite da peca", () => {
  comVkos((base) => {
    const escopo = resolverEscopoPeca(base, { pasta: "site-a", tipo: "site", arquivo: "index.html" });
    const prompt = montarPromptAjustePeca("Mude o CTA", escopo, "# Cérebro completo");
    assert.match(prompt, /<cerebro>\n# Cérebro completo\n<\/cerebro>/);
    assert.match(prompt, /<pedido>Mude o CTA<\/pedido>/);
    assert.match(prompt, /<arquivo_atual>\n<html><\/html>\n<\/arquivo_atual>/i);
    assert.match(prompt, /sem depender de comandos de shell/i);
    assert.match(prompt, /nao autoriza nenhuma mudanca fora desta peca/i);
    assert.match(prompt, /nao leia, escreva, renomeie nem apague nada fora/i);
  });
});

test("revisao de design injeta o guia e autoriza o site inteiro", () => {
  comVkos((base) => {
    const escopo = resolverEscopoPeca(base, {
      pasta: "site-a",
      tipo: "site",
      arquivo: "index.html",
      revisaoDesign: true,
    });
    const prompt = montarPromptAjustePeca(
      "Revise o design",
      escopo,
      "# Cérebro",
      "# Princípios visuais\n\nSem gradiente no texto.",
    );
    assert.equal(escopo.revisaoDesign, true);
    assert.match(prompt, /revisao do SITE INTEIRO/i);
    assert.match(prompt, /<principios_visuais>[\s\S]*Sem gradiente no texto/i);
  });
});

test("revisao de design rejeita tipo invalido e carrossel", () => {
  comVkos((base) => {
    assert.throws(
      () => resolverEscopoPeca(base, {
        pasta: "site-a",
        tipo: "site",
        arquivo: "index.html",
        revisaoDesign: "sim",
      }),
      ErroEscopoPeca,
    );
    assert.throws(
      () => resolverEscopoPeca(base, {
        pasta: "carrossel-a",
        tipo: "carrossel",
        revisaoDesign: true,
      }),
      ErroEscopoPeca,
    );
  });
});

test("prompt prioriza anexos somente quando o pedido cita a pasta", () => {
  comVkos((base) => {
    const escopo = resolverEscopoPeca(base, { pasta: "site-a", tipo: "site", arquivo: "index.html" });
    const comAnexo = montarPromptAjustePeca(
      "Troque o fundo por anexos/referencia.png",
      escopo,
      "# Cérebro",
    );
    const semAnexo = montarPromptAjustePeca("Troque o CTA", escopo, "# Cérebro");
    assert.match(comAnexo, /eles sao a fonte preferencial/i);
    assert.match(comAnexo, /Nao gere imagem nova quando um anexo de imagem atende o pedido/i);
    assert.doesNotMatch(semAnexo, /eles sao a fonte preferencial/i);
  });
});
