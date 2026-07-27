// O registro de clientes precisa obedecer VKOS_DADOS_TESTE.
//
// Ate 2026-07-27 ele nao obedecia: o caminho era calculado uma vez, na carga do
// modulo. Os testes de rota registravam cliente no app/dados/workspaces.json de
// VERDADE, salvavam o registro antes e restauravam no fim. Como o runner roda os
// arquivos em paralelo, duas restauracoes concorrentes se atropelavam.
//
// O estrago so apareceu na conferencia visual: cinco clientes "Teste rotas CRM"
// no Dashboard do dono, apontando pra pasta temporaria que ja tinha sumido.
// Portao verde nenhum viu, porque nenhum deles olha o dado do usuario.
//
// Este teste existe pra isso nunca mais acontecer em silencio.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  adicionarWorkspace,
  lerRegistro,
  pastaDadosHub,
  pastaDadosWorkspace,
  pastaWorkspacesHub,
} from "./estado.js";

function comRaizTemporaria<T>(acao: (raiz: string) => T): T {
  const anterior = process.env.VKOS_DADOS_TESTE;
  const raiz = mkdtempSync(join(tmpdir(), "vkos-isolamento-"));
  process.env.VKOS_DADOS_TESTE = raiz;
  try {
    return acao(raiz);
  } finally {
    if (anterior === undefined) delete process.env.VKOS_DADOS_TESTE;
    else process.env.VKOS_DADOS_TESTE = anterior;
    rmSync(raiz, { recursive: true, force: true });
  }
}

test("com a raiz desviada, registrar cliente nao toca o registro real", () => {
  // A foto do registro real ANTES, byte a byte.
  const caminhoReal = join(pastaDadosHub(), "workspaces.json");
  const antes = existsSync(caminhoReal) ? readFileSync(caminhoReal, "utf8") : null;

  comRaizTemporaria((raiz) => {
    const pasta = mkdtempSync(join(tmpdir(), "vkos-cliente-isolado-"));
    try {
      const criado = adicionarWorkspace(pasta, "Cliente que so existe no teste");
      // Ele existe, mas dentro da raiz desviada.
      assert.ok(lerRegistro().workspaces.some((w) => w.id === criado.id));
      assert.equal(existsSync(join(raiz, "workspaces.json")), true);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  // E o registro real ficou exatamente como estava.
  const depois = existsSync(caminhoReal) ? readFileSync(caminhoReal, "utf8") : null;
  assert.equal(depois, antes, "o registro real nao pode ter mudado");
  if (depois) {
    const real = JSON.parse(depois) as { workspaces: { nome: string }[] };
    assert.ok(
      !real.workspaces.some((w) => w.nome === "Cliente que so existe no teste"),
      "cliente de teste nao pode aparecer no registro do usuario",
    );
  }
});

test("os caminhos de dados seguem a raiz desviada, nao a de producao", () => {
  const producao = pastaDadosHub();
  comRaizTemporaria((raiz) => {
    assert.equal(pastaDadosHub(), raiz);
    assert.equal(pastaWorkspacesHub(), join(raiz, "workspaces"));
    assert.equal(pastaDadosWorkspace("w-qualquer"), join(raiz, "workspaces", "w-qualquer"));
  });
  // E voltam sozinhos quando a variavel sai.
  assert.equal(pastaDadosHub(), producao);
});

// O cache em memoria era o outro jeito de vazar: ele nao sabia de qual raiz
// tinha vindo, entao continuava respondendo o registro da raiz anterior.
test("o cache do registro nao atravessa a troca de raiz", () => {
  const real = lerRegistro();
  const nomesReais = real.workspaces.map((w) => w.nome).sort();

  const nomesIsolados = comRaizTemporaria(() => {
    const pasta = mkdtempSync(join(tmpdir(), "vkos-cliente-cache-"));
    try {
      adicionarWorkspace(pasta, "So no isolado");
      return lerRegistro().workspaces.map((w) => w.nome).sort();
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  assert.deepEqual(nomesIsolados, ["So no isolado"], "a raiz desviada comeca do zero");
  assert.deepEqual(
    lerRegistro().workspaces.map((w) => w.nome).sort(),
    nomesReais,
    "voltando pra raiz real, o registro real volta inteiro",
  );
});
