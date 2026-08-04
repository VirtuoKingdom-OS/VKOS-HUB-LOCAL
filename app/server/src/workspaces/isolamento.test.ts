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
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  adicionarWorkspace,
  guardarCopiaSeEncolheu,
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

// A REDE DE SEGURANCA, escrita depois do 2026-08-01.
//
// O isolamento acima impede que teste escreva no registro real. Ele nao impede
// tudo: naquele dia o registro do Jesse foi de tres workspaces para zero e as
// pastas de trabalho continuaram intactas, mas o Hub esqueceu onde elas
// estavam. Nao havia copia nenhuma. Estes tres testes cobrem a copia que agora
// nasce sozinha quando a conta diminui.

function comPastaTemporaria<T>(acao: (pasta: string) => T): T {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-encolheu-"));
  try {
    return acao(pasta);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

function registroCom(nomes: string[]) {
  return {
    workspaces: nomes.map((nome, i) => ({
      id: `w-${i}`,
      nome,
      pasta: `/vkos/${nome}`,
      criadoEm: "2026-08-01T00:00:00.000Z",
      ultimoUso: "2026-08-01T00:00:00.000Z",
    })),
    ativo: null,
  };
}

test("registro que encolhe deixa copia datada antes de ser sobrescrito", () => {
  comPastaTemporaria((pasta) => {
    const caminho = join(pasta, "workspaces.json");
    const tres = registroCom(["Meu negocio", "JDV", "Mae Pixel"]);
    writeFileSync(caminho, JSON.stringify(tres), "utf8");

    const copia = guardarCopiaSeEncolheu(caminho, registroCom([]), new Date("2026-08-01T03:39:19.000Z"));

    assert.ok(copia, "cair de tres para zero precisa deixar copia");
    assert.match(copia, /perdeu-2026-08-01T03-39-19/);
    // A copia precisa carregar os TRES, senao ela nao salva ninguem.
    const salvo = JSON.parse(readFileSync(copia, "utf8"));
    assert.deepEqual(
      salvo.workspaces.map((w: { nome: string }) => w.nome),
      ["Meu negocio", "JDV", "Mae Pixel"],
    );
  });
});

test("ativar ou renomear nao suja a pasta com copia", () => {
  comPastaTemporaria((pasta) => {
    const caminho = join(pasta, "workspaces.json");
    const dois = registroCom(["Meu negocio", "JDV"]);
    writeFileSync(caminho, JSON.stringify(dois), "utf8");

    // Mesma quantidade, so mudou o ativo: o caso comum, e o mais frequente.
    assert.equal(guardarCopiaSeEncolheu(caminho, { ...dois, ativo: "w-1" }), null);
    // Adicionar tambem nao deixa copia.
    assert.equal(guardarCopiaSeEncolheu(caminho, registroCom(["a", "b", "c"])), null);
    assert.deepEqual(readdirSync(pasta), ["workspaces.json"]);
  });
});

test("sem registro em disco nao ha o que copiar, e nada quebra", () => {
  comPastaTemporaria((pasta) => {
    const caminho = join(pasta, "workspaces.json");
    assert.equal(guardarCopiaSeEncolheu(caminho, registroCom([])), null);
    assert.deepEqual(readdirSync(pasta), []);
  });
});
