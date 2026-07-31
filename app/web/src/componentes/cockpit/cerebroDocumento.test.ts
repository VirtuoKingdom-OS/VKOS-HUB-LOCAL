// Trava da cerimonia semeada por documento.
//
// O prompt daqui e injecao de conteudo num processo de IA. A regra do projeto
// e que teste de injecao AFIRMA O CONTEUDO INJETADO, e nao so o entorno: um
// teste que passaria com a injecao apagada nao e teste.

import assert from "node:assert/strict";
import test from "node:test";

import { ehDocumentoDeCerebro, promptComDocumento } from "./cerebroDocumento.js";

test("o prompt aponta pro arquivo que a pessoa soltou", () => {
  const caminho = "materiais/cockpit/anexos/2026-07-31/meu-negocio.md";
  const prompt = promptComDocumento(caminho);
  // O caminho tem que aparecer LITERAL. Sem ele o modelo comeca a entrevista
  // do zero e o arquivo que a pessoa enviou vira um anexo que ninguem le.
  assert.ok(
    prompt.includes(`\`${caminho}\``),
    "o caminho do documento precisa aparecer literal no prompt"
  );
});

test("a primeira linha e o comando da skill, sozinha", () => {
  // No Codex o expansor de skills so troca "/instalar" por "leia o SKILL.md"
  // quando ele ocupa a linha inteira. Comando grudado em texto vira um token
  // solto e a entrevista roda sem a skill que sabe conduzi-la.
  const linhas = promptComDocumento("materiais/x.md").split("\n");
  assert.equal(linhas[0], "/instalar");
});

test("o prompt manda ler antes de perguntar, e proibe inventar", () => {
  // As duas instrucoes que justificam esta porta existir. Sem a primeira, a
  // cerimonia pergunta o que ja esta escrito. Sem a segunda, ela preenche o
  // Cerebro com deducao, que e o pior defeito possivel na identidade do
  // negocio: erro que se propaga pra toda geracao seguinte.
  const prompt = promptComDocumento("materiais/x.md").toLowerCase();
  assert.ok(
    prompt.includes("leia o arquivo inteiro antes de perguntar"),
    "o prompt precisa mandar ler o documento antes da primeira pergunta"
  );
  assert.ok(
    prompt.includes("não invente nada"),
    "o prompt precisa proibir invencao"
  );
});

test("o caminho do documento nao vira invocacao de skill por acidente", () => {
  // O expansor do Codex troca "/palavra" isolada por uma instrucao. Um caminho
  // com barra no meio ("materiais/cockpit") nao casa, porque a barra vem
  // colada numa letra. Esta trava existe pra que mudar o formato do caminho
  // (uma barra no comeco, por exemplo) nao passe em silencio.
  const prompt = promptComDocumento("materiais/cockpit/anexos/2026-07-31/x.md");
  const invocacoes = prompt.match(/(^|[\s(])\/([a-z0-9][a-z0-9_-]*)(?=$|[\s),.!?;:])/gim) ?? [];
  const nomes = invocacoes.map((i) => i.trim());
  assert.deepEqual(
    nomes,
    ["/instalar", "/instalar"],
    "só as duas menções ao /instalar podem parecer invocação de skill"
  );
});

test("so arquivo .md abre esta porta", () => {
  assert.equal(ehDocumentoDeCerebro("negocio.md"), true);
  assert.equal(ehDocumentoDeCerebro("NEGOCIO.MD"), true);
  // Um pdf chegaria como binario ilegivel no meio da entrevista, e um txt
  // prometeria um processamento que a skill nao faz.
  assert.equal(ehDocumentoDeCerebro("negocio.pdf"), false);
  assert.equal(ehDocumentoDeCerebro("negocio.txt"), false);
  assert.equal(ehDocumentoDeCerebro("negocio.md.exe"), false);
});
