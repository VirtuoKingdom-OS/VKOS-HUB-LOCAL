import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { arquivoConexoes, lerConexoes, salvarConexoes } from "./estado.js";
import { NOME_CONFLITOS } from "./fusao.js";

// Todo caso monta uma raiz de dados temporaria com o mesmo desenho de
// app/dados/ e aponta as conexoes pra ela pelo VKOS_DADOS_TESTE. Nada aqui toca
// o token real do dono.
function raizTemp(nome: string): string {
  const raiz = mkdtempSync(join(tmpdir(), `vkos-cx-${nome}-`));
  mkdirSync(join(raiz, "workspaces"), { recursive: true });
  process.env.VKOS_DADOS_TESTE = raiz;
  return raiz;
}

function limpar(raiz: string): void {
  delete process.env.VKOS_DADOS_TESTE;
  rmSync(raiz, { recursive: true, force: true });
}

function gravarOrigem(raiz: string, id: string, servidores: unknown): string {
  const pasta = join(raiz, "workspaces", id);
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, "conexoes.json"), JSON.stringify({ servidores }), "utf8");
  return pasta;
}

function migrados(pasta: string): string[] {
  return readdirSync(pasta).filter((n) => n.includes(".migrado-para-core-"));
}

function linhas(caminho: string): Record<string, unknown>[] {
  if (!existsSync(caminho)) return [];
  return readFileSync(caminho, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

test("sem cliente nenhum, o CORE comeca vazio e nao inventa arquivo", () => {
  const raiz = raizTemp("vazio");
  try {
    assert.deepEqual(lerConexoes(), { servidores: {} });
    assert.equal(existsSync(arquivoConexoes()), false);
  } finally {
    limpar(raiz);
  }
});

test("o token de um cliente sobe pro CORE na primeira leitura", () => {
  const raiz = raizTemp("sobe");
  const pasta = gravarOrigem(raiz, "w-1", {
    apify: { habilitado: true, config: { token: "token-do-dono" } },
  });
  try {
    const estado = lerConexoes();
    assert.equal(estado.servidores.apify.habilitado, true);
    assert.equal(estado.servidores.apify.config.token, "token-do-dono");
    // Gravado no CORE, e a origem preservada com o carimbo.
    assert.equal(existsSync(arquivoConexoes()), true);
    assert.equal(existsSync(join(pasta, "conexoes.json")), false);
    assert.equal(migrados(pasta).length, 1);
  } finally {
    limpar(raiz);
  }
});

test("a origem preservada mantem os bytes originais, com o token dentro", () => {
  const raiz = raizTemp("bytes");
  const conteudo = JSON.stringify({
    servidores: { apify: { habilitado: true, config: { token: "abc123" } } },
  });
  const pasta = join(raiz, "workspaces", "w-1");
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, "conexoes.json"), conteudo, "utf8");
  try {
    lerConexoes();
    const preservado = migrados(pasta)[0];
    assert.ok(preservado, "a origem tem que continuar em disco");
    // Byte a byte: rename, nunca reescrita. Apagar o segredo aqui destruiria o
    // unico original, e ele nao se reconstitui de lugar nenhum.
    assert.equal(readFileSync(join(pasta, preservado), "utf8"), conteudo);
  } finally {
    limpar(raiz);
  }
});

test("o primeiro cliente em ordem de id vence, e a divergencia vira rastro", () => {
  const raiz = raizTemp("conflito");
  gravarOrigem(raiz, "w-b", {
    apify: { habilitado: false, config: { token: "token-do-b" } },
  });
  const pastaA = gravarOrigem(raiz, "w-a", {
    apify: { habilitado: true, config: { token: "token-do-a" } },
  });
  try {
    const estado = lerConexoes();
    // Ordem por id: w-a vem antes de w-b e leva o estado final.
    assert.equal(estado.servidores.apify.config.token, "token-do-a");
    assert.equal(estado.servidores.apify.habilitado, true);
    assert.ok(pastaA);

    const rastro = linhas(join(raiz, NOME_CONFLITOS));
    assert.equal(rastro.length, 1);
    assert.equal(rastro[0].servidor, "apify");
    assert.equal(rastro[0].workspaceVencedor, "w-a");
    assert.equal(rastro[0].workspacePerdedor, "w-b");
    assert.deepEqual(rastro[0].chavesDivergentes, ["token"]);
    assert.equal(rastro[0].habilitadoDivergente, true);
    // O rastro aponta pro arquivo preservado, e o valor perdedor esta LA.
    const preservado = String(rastro[0].arquivoPreservado);
    assert.equal(existsSync(preservado), true);
    assert.match(readFileSync(preservado, "utf8"), /token-do-b/);
  } finally {
    limpar(raiz);
  }
});

test("nenhum valor de config entra no rastro de conflito", () => {
  const raiz = raizTemp("segredo");
  gravarOrigem(raiz, "w-a", {
    apify: { habilitado: true, config: { token: "SEGREDO-A" } },
  });
  gravarOrigem(raiz, "w-b", {
    apify: { habilitado: true, config: { token: "SEGREDO-B" } },
  });
  try {
    lerConexoes();
    const bruto = readFileSync(join(raiz, NOME_CONFLITOS), "utf8");
    // O arquivo de rastro mora ao lado do estado. Se ele carregasse o valor,
    // viraria uma segunda copia do token, que e exatamente o que nao pode.
    assert.equal(bruto.includes("SEGREDO-A"), false);
    assert.equal(bruto.includes("SEGREDO-B"), false);
    assert.match(bruto, /"chavesDivergentes":\["token"\]/);
  } finally {
    limpar(raiz);
  }
});

test("config igual em dois clientes nao gera conflito nenhum", () => {
  const raiz = raizTemp("igual");
  gravarOrigem(raiz, "w-a", {
    apify: { habilitado: true, config: { token: "mesmo" } },
  });
  gravarOrigem(raiz, "w-b", {
    apify: { habilitado: true, config: { token: "mesmo" } },
  });
  try {
    lerConexoes();
    assert.equal(linhas(join(raiz, NOME_CONFLITOS)).length, 0);
  } finally {
    limpar(raiz);
  }
});

test("a fusao roda uma vez so e repetir nao duplica rastro", () => {
  const raiz = raizTemp("idempotente");
  gravarOrigem(raiz, "w-a", { apify: { habilitado: true, config: { token: "a" } } });
  gravarOrigem(raiz, "w-b", { apify: { habilitado: true, config: { token: "b" } } });
  try {
    lerConexoes();
    const depoisDaPrimeira = linhas(join(raiz, NOME_CONFLITOS)).length;
    // A segunda leitura ja acha o arquivo do CORE e nem tenta fundir.
    lerConexoes();
    lerConexoes();
    assert.equal(linhas(join(raiz, NOME_CONFLITOS)).length, depoisDaPrimeira);
    assert.equal(depoisDaPrimeira, 1);
  } finally {
    limpar(raiz);
  }
});

test("gravar depois da fusao nao volta a ler as origens", () => {
  const raiz = raizTemp("grava");
  gravarOrigem(raiz, "w-a", { apify: { habilitado: true, config: { token: "antigo" } } });
  try {
    lerConexoes();
    salvarConexoes({ servidores: { apify: { habilitado: true, config: { token: "novo" } } } });
    assert.equal(lerConexoes().servidores.apify.config.token, "novo");
  } finally {
    limpar(raiz);
  }
});

test("cliente com conexoes.json ilegivel fica de fora e nao derruba a fusao", () => {
  const raiz = raizTemp("ilegivel");
  const quebrado = join(raiz, "workspaces", "w-a");
  mkdirSync(quebrado, { recursive: true });
  writeFileSync(join(quebrado, "conexoes.json"), "{ isto nao e json", "utf8");
  gravarOrigem(raiz, "w-b", { apify: { habilitado: true, config: { token: "bom" } } });
  try {
    const estado = lerConexoes();
    assert.equal(estado.servidores.apify.config.token, "bom");
    // O ilegivel foi pra quarentena e nao ganhou carimbo de migrado.
    assert.equal(migrados(quebrado).length, 0);
  } finally {
    limpar(raiz);
  }
});
