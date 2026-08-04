import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ehConversaDeAnuncio,
  ehGeracaoDeAnuncio,
  ErroGeracaoAnuncio,
  prepararConversaAnuncio,
  prepararGeracaoAnuncio,
} from "./geracao-anuncio.js";

const CEREBRO = [
  "# Cérebro da Clínica Passo Firme",
  "",
  "## Bloco 1, o negócio",
  "Fisioterapia ortopédica na Vila Mariana.",
].join("\n");

const SKILL = ["---", "name: anuncio", "---", "", "# /anuncio", "Passo 2, escrever."].join("\n");

// Monta um VKOS de teste em pasta temporária. Nada aqui toca dado real.
function vkosDeTeste(opcoes: { comSkill?: boolean } = {}): string {
  const raiz = mkdtempSync(join(tmpdir(), "vkos-anuncio-"));
  mkdirSync(join(raiz, "cerebro"), { recursive: true });
  writeFileSync(join(raiz, "cerebro", "cerebro.md"), CEREBRO, "utf8");
  mkdirSync(join(raiz, "conteudo"), { recursive: true });
  if (opcoes.comSkill !== false) {
    mkdirSync(join(raiz, ".claude", "skills", "anuncio"), { recursive: true });
    writeFileSync(join(raiz, ".claude", "skills", "anuncio", "SKILL.md"), SKILL, "utf8");
  }
  return raiz;
}

function limpar(raiz: string): void {
  rmSync(raiz, { recursive: true, force: true });
}

test("reconhece a skill de geração de anúncio, e só ela", () => {
  assert.equal(ehGeracaoDeAnuncio("anuncio"), true);
  for (const outra of ["site", "carrossel", "ajuste-site", "Anuncio", "", undefined, null]) {
    assert.equal(ehGeracaoDeAnuncio(outra), false);
  }
});

test("cria a pasta da peça e confina o cwd nela", () => {
  const raiz = vkosDeTeste();
  try {
    const alvo = join(raiz, "conteudo", "2026-07-31-anuncio-avaliacao");
    assert.equal(existsSync(alvo), false);

    const preparada = prepararGeracaoAnuncio({
      pastaVkos: raiz,
      pastaAlvo: "2026-07-31-anuncio-avaliacao",
      intencao: "Oferta: avaliação postural gratuita.",
    });

    assert.equal(existsSync(alvo), true);
    assert.equal(preparada.pastaTrabalho, alvo);
    assert.equal(preparada.pasta, "2026-07-31-anuncio-avaliacao");
  } finally {
    limpar(raiz);
  }
});

test("o prompt montado carrega Cérebro, skill, contrato e a intenção", () => {
  const raiz = vkosDeTeste();
  try {
    const { prompt } = prepararGeracaoAnuncio({
      pastaVkos: raiz,
      pastaAlvo: "2026-07-31-anuncio-avaliacao",
      intencao: "Oferta: avaliação postural gratuita.",
    });
    assert.ok(prompt.includes("Fisioterapia ortopédica na Vila Mariana."), "faltou o Cérebro");
    assert.ok(prompt.includes("Passo 2, escrever."), "faltou o conteúdo da skill");
    assert.ok(prompt.includes('"palavrasChave"'), "faltou o contrato do JSON");
    assert.ok(prompt.includes("Oferta: avaliação postural gratuita."), "faltou a intenção do dono");
  } finally {
    limpar(raiz);
  }
});

test("reaproveita a pasta que já existe, sem apagar o que está dentro", () => {
  const raiz = vkosDeTeste();
  try {
    const alvo = join(raiz, "conteudo", "2026-07-31-anuncio-avaliacao");
    mkdirSync(alvo, { recursive: true });
    writeFileSync(join(alvo, "anuncio.json"), "{}", "utf8");

    const preparada = prepararGeracaoAnuncio({
      pastaVkos: raiz,
      pastaAlvo: "2026-07-31-anuncio-avaliacao",
      intencao: "Trocar os títulos.",
    });

    assert.equal(preparada.pastaTrabalho, alvo);
    assert.equal(existsSync(join(alvo, "anuncio.json")), true);
  } finally {
    limpar(raiz);
  }
});

// A barreira e a mesma das rotas de peca (vkos/pastaPeca.ts). O que importa aqui
// e o efeito colateral: pastaAlvo recusada nao pode deixar rastro em disco.
test("pastaAlvo com travessia responde 400 e NÃO cria nada em disco", () => {
  const raiz = vkosDeTeste();
  try {
    for (const veneno of ["../cerebro", "..", "sub/pasta", "sub\\pasta", ".oculta"]) {
      assert.throws(
        () =>
          prepararGeracaoAnuncio({
            pastaVkos: raiz,
            pastaAlvo: veneno,
            intencao: "Oferta qualquer.",
          }),
        (erro: unknown) => erro instanceof ErroGeracaoAnuncio && erro.status === 400,
        `${veneno} devia ser recusada`,
      );
    }
    assert.deepEqual(readdirSync(join(raiz, "conteudo")), []);
    // A pasta irmã do Cérebro continua com o arquivo dela, intacta.
    assert.deepEqual(readdirSync(join(raiz, "cerebro")), ["cerebro.md"]);
  } finally {
    limpar(raiz);
  }
});

test("pastaAlvo ausente ou em branco responde 400", () => {
  const raiz = vkosDeTeste();
  try {
    for (const vazio of [undefined, "", "   ", 42, null]) {
      assert.throws(
        () =>
          prepararGeracaoAnuncio({
            pastaVkos: raiz,
            pastaAlvo: vazio,
            intencao: "Oferta qualquer.",
          }),
        (erro: unknown) => erro instanceof ErroGeracaoAnuncio && erro.status === 400,
      );
    }
    assert.deepEqual(readdirSync(join(raiz, "conteudo")), []);
  } finally {
    limpar(raiz);
  }
});

// Falhar cedo dizendo o motivo e melhor que gerar sem a skill e entregar lixo.
test("workspace sem a skill /anuncio responde 409 e não cria a pasta", () => {
  const raiz = vkosDeTeste({ comSkill: false });
  try {
    assert.throws(
      () =>
        prepararGeracaoAnuncio({
          pastaVkos: raiz,
          pastaAlvo: "2026-07-31-anuncio-avaliacao",
          intencao: "Oferta qualquer.",
        }),
      (erro: unknown) =>
        erro instanceof ErroGeracaoAnuncio &&
        erro.status === 409 &&
        /skill \/anuncio não foi encontrada/.test(erro.message),
    );
    assert.deepEqual(readdirSync(join(raiz, "conteudo")), []);
  } finally {
    limpar(raiz);
  }
});

test("nome de peça ocupado por um arquivo responde 400", () => {
  const raiz = vkosDeTeste();
  try {
    writeFileSync(join(raiz, "conteudo", "2026-07-31-anuncio-avaliacao"), "nao sou pasta", "utf8");
    assert.throws(
      () =>
        prepararGeracaoAnuncio({
          pastaVkos: raiz,
          pastaAlvo: "2026-07-31-anuncio-avaliacao",
          intencao: "Oferta qualquer.",
        }),
      (erro: unknown) => erro instanceof ErroGeracaoAnuncio && erro.status === 400,
    );
  } finally {
    limpar(raiz);
  }
});

// ===========================================================================
// A CONVERSA DE RESGATE. Ela nasce quando a sessao original morreu, e o que
// precisa de prova aqui e que ela nasce com o MESMO confinamento: mesma pasta,
// mesma barreira, e nunca criando peca nova.
// ===========================================================================

// Uma campanha minima em disco. O conteudo nao precisa passar no schema: o que
// vai pro prompt e o texto cru do arquivo, de proposito.
function comCampanha(raiz: string, pasta: string, texto: string): string {
  const alvo = join(raiz, "conteudo", pasta);
  mkdirSync(alvo, { recursive: true });
  writeFileSync(join(alvo, "anuncio.json"), texto, "utf8");
  return alvo;
}

test("reconhece a conversa de anúncio, e ela não se confunde com a geração", () => {
  assert.equal(ehConversaDeAnuncio("conversa-anuncio"), true);
  assert.equal(ehGeracaoDeAnuncio("conversa-anuncio"), false);
  assert.equal(ehConversaDeAnuncio("anuncio"), false);
});

test("a conversa de resgate confina na pasta da peça e embute a campanha atual", () => {
  const raiz = vkosDeTeste();
  try {
    const alvo = comCampanha(
      raiz,
      "2026-07-31-anuncio-avaliacao",
      '{ "versao": 1, "campanha": { "nome": "Busca, avaliação" } }',
    );

    const preparada = prepararConversaAnuncio({
      pastaVkos: raiz,
      pastaAlvo: "2026-07-31-anuncio-avaliacao",
      pedido: "Troca os títulos do grupo 2 por ângulo de urgência.",
    });

    assert.equal(preparada.pastaTrabalho, alvo);
    assert.equal(preparada.pasta, "2026-07-31-anuncio-avaliacao");
    // O que foi INJETADO: a campanha em disco, o Cérebro, o contrato do JSON e o
    // pedido literal. Teste que passaria com a injeção apagada não é teste.
    assert.match(preparada.prompt, /Busca, avaliação/);
    assert.match(preparada.prompt, /Clínica Passo Firme/);
    assert.match(preparada.prompt, /anuncio\.json/);
    assert.match(preparada.prompt, /ângulo de urgência/);
    assert.match(preparada.prompt, /LIMITE OBRIGATÓRIO/);
    // Ela não pede uma campanha nova: ela muda a que existe.
    assert.match(preparada.prompt, /Mude só o que foi pedido/);
    // E a skill NÃO vai junto: a skill ensina a criar do zero, e criar do zero é
    // exatamente o que esta sessão não pode fazer.
    assert.equal(preparada.prompt.includes("<skill>"), false);
  } finally {
    limpar(raiz);
  }
});

test("a conversa de resgate NÃO cria pasta: peça ausente responde 404", () => {
  const raiz = vkosDeTeste();
  try {
    assert.throws(
      () =>
        prepararConversaAnuncio({
          pastaVkos: raiz,
          pastaAlvo: "2026-07-31-anuncio-que-nao-existe",
          pedido: "Qualquer coisa.",
        }),
      (erro: unknown) => erro instanceof ErroGeracaoAnuncio && erro.status === 404,
    );
    assert.deepEqual(readdirSync(join(raiz, "conteudo")), []);
  } finally {
    limpar(raiz);
  }
});

test("pasta sem anuncio.json responde 404: não há campanha para conversar sobre", () => {
  const raiz = vkosDeTeste();
  try {
    mkdirSync(join(raiz, "conteudo", "2026-07-31-anuncio-vazio"), { recursive: true });
    assert.throws(
      () =>
        prepararConversaAnuncio({
          pastaVkos: raiz,
          pastaAlvo: "2026-07-31-anuncio-vazio",
          pedido: "Qualquer coisa.",
        }),
      (erro: unknown) => erro instanceof ErroGeracaoAnuncio && erro.status === 404,
    );
  } finally {
    limpar(raiz);
  }
});

test("a conversa de resgate passa pela mesma barreira de travessia", () => {
  const raiz = vkosDeTeste();
  try {
    for (const travessia of ["../cerebro", "..", "sub/pasta", "/etc", ""]) {
      assert.throws(
        () =>
          prepararConversaAnuncio({
            pastaVkos: raiz,
            pastaAlvo: travessia,
            pedido: "Qualquer coisa.",
          }),
        (erro: unknown) => erro instanceof ErroGeracaoAnuncio && erro.status === 400,
        `pastaAlvo "${travessia}" precisa ser recusada`,
      );
    }
  } finally {
    limpar(raiz);
  }
});
