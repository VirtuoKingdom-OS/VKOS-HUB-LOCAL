// Travas do contrato do lote.
//
// A REGRA DA CASA: teste de injeção afirma o CONTEÚDO INJETADO, não o entorno.
// A versão anterior deste arquivo percorria uma lista de chaves escrita à mão e
// passava com o contrato dizendo "O contrato de estado do servidor é: ." pra
// IA. Os testes daqui percorrem os schemas de verdade.

import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAVES_CONTRATO_LOTE,
  contratoLoteAssistente,
  exemploDeLote,
  linhasDoSchema,
  montarPromptAssistente,
} from "./prompt.js";
import {
  EntradaAnuncioSchema,
  EntradaCarrosselSchema,
  EntradaSiteSchema,
} from "./entrada.js";
import { LotePropostaSchema } from "./tarefa.js";

test("o contrato cita todas as chaves de nivel do lote", () => {
  const prompt = contratoLoteAssistente();
  for (const chave of CHAVES_CONTRATO_LOTE) assert.match(prompt, new RegExp(chave));
});

test("o contrato cita TODO campo de dados de cada tipo, direto do schema", () => {
  // Este é o teste que teria pego o defeito de 2026-08-04. O contrato não
  // listava campo nenhum, a IA inventou {tema, briefing}, e o schema recusou 22
  // campos faltando. Campo novo no schema e prompt esquecido reprovam aqui.
  const prompt = contratoLoteAssistente();
  for (const schema of [EntradaCarrosselSchema, EntradaSiteSchema, EntradaAnuncioSchema]) {
    for (const campo of Object.keys(schema.shape)) {
      assert.ok(
        prompt.includes(`- ${campo} `),
        `o contrato precisa descrever o campo ${campo}`,
      );
    }
  }
});

test("o contrato escreve os valores aceitos de cada enum, um por um", () => {
  // Sem a lista fechada, a IA escolhe um valor plausível e errado: "vertical"
  // no lugar de "9x16" é o erro que o schema recusa depois, quando já custou um
  // turno de IA.
  const prompt = contratoLoteAssistente();
  for (const valor of ["multiplas", "unica", "1x1", "4x5", "9x16", "intercalado"]) {
    assert.ok(prompt.includes(valor), `o contrato precisa citar o valor ${valor}`);
  }
  for (const valor of ["whatsapp", "landing", "agendamento", "telefone"]) {
    assert.ok(prompt.includes(valor), `o contrato precisa citar o destino ${valor}`);
  }
});

test("campo obrigatorio e campo opcional saem escritos com essas palavras", () => {
  const linhas = linhasDoSchema(EntradaCarrosselSchema).join("\n");
  assert.match(linhas, /- tema \(obrigatório\)/);
  assert.match(linhas, /- detalhes \(obrigatório\)/);
  assert.match(linhas, /- proporcao \(opcional/);
});

test("o padrao do Hub aparece por extenso no campo opcional que tem um", () => {
  // "opcional" sem dizer o que acontece na falta empurra a IA a preencher por
  // via das dúvidas, que é exatamente o chute que os padrões existem pra evitar.
  const prompt = contratoLoteAssistente();
  assert.ok(prompt.includes('o Hub usa "4x5"'), "o padrão de proporção precisa estar escrito");
  assert.ok(prompt.includes('o Hub usa "multiplas"'), "o padrão de formato precisa estar escrito");
});

test("o exemplo do contrato passa no proprio schema do lote", () => {
  // Exemplo inválido ensina a IA a errar, e ela copia o exemplo antes de ler a
  // lista inteira.
  const exemplo = JSON.parse(exemploDeLote());
  assert.ok(LotePropostaSchema.safeParse(exemplo).success, "o exemplo precisa ser um lote válido");
  assert.equal(exemplo.tarefas.length, 2);
});

test("o exemplo mostra os dois formatos: com campo opcional e sem", () => {
  const exemplo = JSON.parse(exemploDeLote());
  assert.ok("paginas" in exemplo.tarefas[0].dados, "a primeira tarefa mostra um opcional preenchido");
  assert.ok(!("paginas" in exemplo.tarefas[1].dados), "a segunda mostra o opcional ausente");
});

test("pedido ambiguo manda perguntar e nao inventar lote", () => {
  const prompt = montarPromptAssistente({
    conversaId: "c-1",
    briefing: "<briefing>workspace w-1</briefing>",
    pedido: "Cria uns carrosseis.",
  });
  assert.match(prompt, /faltarem quantidade, tema ou workspace/i);
  assert.match(prompt, /não crie lote\.json/i);
  assert.match(prompt, /<briefing>workspace w-1<\/briefing>/);
});

test("o prompt proibe anunciar gravacao que nao aconteceu", () => {
  // O sintoma que abriu esta rodada: a IA disse "criei o lote.json" e o dono
  // ficou com a fila vazia do lado.
  const prompt = montarPromptAssistente({ conversaId: "c-1", briefing: "", pedido: "x" });
  assert.match(prompt, /nunca anuncie que gravou sem ter gravado/i);
});

test("o prompt do assistente tambem fixa o idioma", () => {
  const prompt = montarPromptAssistente({ conversaId: "c-1", briefing: "", pedido: "x" });
  assert.match(prompt, /português brasileiro/i);
  assert.match(prompt, /outro alfabeto/i);
});
