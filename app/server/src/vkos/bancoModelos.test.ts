import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  decidirAtualizacaoModelo,
  garantirModelosNoWorkspace,
  gerarIdModeloBanco,
  lerModeloBanco,
  listarBanco,
  listarOriginais,
  removerModeloBanco,
  restaurarModeloBanco,
  salvarModeloBanco,
  validarHtmlModelo,
} from "./bancoModelos.js";

const HTML = "<!doctype html><style>:root{--cor:#fff}</style><div class=\"slide\">Teste</div>";
const HTML_SEMENTE = "<!doctype html><div class=\"slide\">Fabrica</div>";

function temporaria(): string {
  return mkdtempSync(join(tmpdir(), "vkos-banco-modelos-"));
}

// Semente falsa no formato de pasta VKOS: um original vkos01 e o legado dark.
function sementeFalsa(): string {
  const pasta = temporaria();
  const templates = join(pasta, "templates", "carrossel");
  mkdirSync(templates, { recursive: true });
  writeFileSync(join(templates, "modelo-vkos01.html"), HTML_SEMENTE, "utf8");
  writeFileSync(join(templates, "modelo.html"), HTML_SEMENTE, "utf8");
  return pasta;
}

test("CRUD do banco preserva html, metadados e datas", () => {
  const base = temporaria();
  try {
    const criado = salvarModeloBanco({
      nome: "Neon Grid",
      descricao: "Modelo de teste",
      tipo: "completo",
      pedeImagem: true,
      html: HTML,
    }, base);
    assert.equal(criado.modelo.id, "b-neon-grid");
    assert.equal(listarBanco(base).length, 1);
    assert.equal(lerModeloBanco("b-neon-grid", base)?.html, HTML);
    const atualizado = salvarModeloBanco({
      id: "b-neon-grid",
      nome: "Neon Grid novo",
      tipo: "capa",
      html: `${HTML}\n`,
    }, base);
    assert.equal(atualizado.modelo.tipo, "capa");
    assert.equal(atualizado.modelo.criadoEm, criado.modelo.criadoEm);
    assert.equal(removerModeloBanco("b-neon-grid", base), true);
    assert.equal(listarBanco(base).length, 0);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("slug sempre usa prefixo b e recebe sufixo em colisao", () => {
  assert.equal(gerarIdModeloBanco("Ação direta"), "b-acao-direta");
  assert.equal(
    gerarIdModeloBanco("Ação direta", ["b-acao-direta", "b-acao-direta-2"]),
    "b-acao-direta-3",
  );
});

test("validacao exige slide, limita tamanho e avisa URL externa", () => {
  assert.throws(() => validarHtmlModelo("<html></html>"), /classe slide/);
  assert.throws(
    () => validarHtmlModelo(`<div class="slide">${"x".repeat(513 * 1024)}</div>`),
    /512 KB/,
  );
  assert.deepEqual(
    validarHtmlModelo(
      '<link href="https://fonts.googleapis.com/css2"><div class="slide"><img src="https://cdn.exemplo.com/a.png"></div>',
    ).avisos,
    ["Referência externa encontrada: cdn.exemplo.com."],
  );
});

test("JSON quebrado e pasta estranha nao derrubam a listagem", () => {
  const base = temporaria();
  try {
    mkdirSync(join(base, "b-quebrado"));
    writeFileSync(join(base, "b-quebrado", "modelo.json"), "{", "utf8");
    mkdirSync(join(base, "fora-do-prefixo"));
    assert.deepEqual(listarBanco(base), []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("decisao da atualizacao no uso cobre os quatro casos", () => {
  // Ausente no workspace, presente no banco: grava.
  assert.equal(decidirAtualizacaoModelo("b-x", null, HTML), "gravar");
  // Diferente do banco: grava por cima. Igual: pula.
  assert.equal(decidirAtualizacaoModelo("vkos01", HTML_SEMENTE, HTML), "gravar");
  assert.equal(decidirAtualizacaoModelo("vkos01", HTML, HTML), "pular");
  // Fora do banco: b-* foi removido (erro); original segue o local.
  assert.equal(decidirAtualizacaoModelo("b-sumiu", null, null), "erro-inexistente");
  assert.equal(decidirAtualizacaoModelo("vkos01", HTML_SEMENTE, null), "pular");
});

test("copia materializa o arquivo central no workspace uma vez", () => {
  const base = temporaria();
  const workspace = temporaria();
  try {
    salvarModeloBanco({
      nome: "Fecho direto",
      descricao: "CTA de teste",
      tipo: "cta",
      pedeImagem: false,
      html: HTML,
    }, base);
    garantirModelosNoWorkspace(workspace, ["b-fecho-direto"], base);
    const destino = join(
      workspace,
      "templates",
      "carrossel",
      "modelo-b-fecho-direto.html",
    );
    assert.equal(readFileSync(destino, "utf8"), HTML);
    garantirModelosNoWorkspace(workspace, ["b-fecho-direto"], base);
    assert.equal(readFileSync(destino, "utf8"), HTML);
    assert.throws(
      () => garantirModelosNoWorkspace(workspace, ["b-sumiu"], base),
      /não existe mais/,
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("id sem prefixo so entra no banco quando e original da semente", () => {
  const base = temporaria();
  const semente = sementeFalsa();
  try {
    const sobrescrita = salvarModeloBanco({
      id: "vkos01",
      nome: "Vkos01 novo",
      descricao: "Editado",
      tipo: "completo",
      pedeImagem: true,
      html: HTML,
    }, base, semente);
    assert.equal(sobrescrita.modelo.id, "vkos01");
    assert.throws(
      () => salvarModeloBanco({
        id: "solto",
        nome: "Solto",
        tipo: "completo",
        html: HTML,
      }, base, semente),
      /inválido/,
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(semente, { recursive: true, force: true });
  }
});

test("sobrescrita atualiza o workspace no uso e o dark usa modelo.html", () => {
  const base = temporaria();
  const semente = sementeFalsa();
  const workspace = temporaria();
  try {
    // O workspace nasceu com a copia de fabrica dos dois originais.
    const templates = join(workspace, "templates", "carrossel");
    mkdirSync(templates, { recursive: true });
    writeFileSync(join(templates, "modelo-vkos01.html"), HTML_SEMENTE, "utf8");
    writeFileSync(join(templates, "modelo.html"), HTML_SEMENTE, "utf8");
    // Sem sobrescrita, o uso nao toca em nada.
    garantirModelosNoWorkspace(workspace, ["vkos01", "dark"], base);
    assert.equal(readFileSync(join(templates, "modelo-vkos01.html"), "utf8"), HTML_SEMENTE);
    // Com sobrescrita, o uso regrava o arquivo exato de cada id.
    salvarModeloBanco({
      id: "vkos01",
      nome: "Vkos01",
      tipo: "completo",
      html: HTML,
    }, base, semente);
    salvarModeloBanco({
      id: "dark",
      nome: "Dark",
      tipo: "completo",
      html: HTML,
    }, base, semente);
    garantirModelosNoWorkspace(workspace, ["vkos01", "dark"], base);
    assert.equal(readFileSync(join(templates, "modelo-vkos01.html"), "utf8"), HTML);
    assert.equal(readFileSync(join(templates, "modelo.html"), "utf8"), HTML);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(semente, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("originais listam estado da sobrescrita e restaurar converge pra fabrica", () => {
  const base = temporaria();
  const semente = sementeFalsa();
  try {
    // Estado de fabrica: sem sobrescrita, sem badge.
    let originais = listarOriginais(base, semente);
    assert.equal(originais.length, 2);
    const fabrica = originais.find((item) => item.id === "vkos01");
    assert.deepEqual(
      { temSobrescrita: fabrica?.temSobrescrita, atualizado: fabrica?.atualizado },
      { temSobrescrita: false, atualizado: false },
    );
    // Editado: a sobrescrita vence e o badge liga.
    salvarModeloBanco({
      id: "vkos01",
      nome: "Vkos01 editado",
      tipo: "capa",
      html: HTML,
    }, base, semente);
    originais = listarOriginais(base, semente);
    const editado = originais.find((item) => item.id === "vkos01");
    assert.equal(editado?.nome, "Vkos01 editado");
    assert.equal(editado?.temSobrescrita, true);
    assert.equal(editado?.atualizado, true);
    // Original nao pode ser excluido; o caminho e o restaurar.
    assert.throws(() => removerModeloBanco("vkos01", base), /Restaurar original/);
    // Restaurar mantem a entrada, regrava a fabrica e apaga o badge.
    restaurarModeloBanco("vkos01", base, semente);
    assert.equal(lerModeloBanco("vkos01", base)?.html, HTML_SEMENTE);
    const restaurado = listarOriginais(base, semente).find((item) => item.id === "vkos01");
    assert.equal(restaurado?.temSobrescrita, true);
    assert.equal(restaurado?.atualizado, false);
    // Sem sobrescrita nao ha o que restaurar.
    assert.throws(() => restaurarModeloBanco("dark", base, semente), /fábrica/);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(semente, { recursive: true, force: true });
  }
});
