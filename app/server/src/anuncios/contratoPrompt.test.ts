import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { montarContratoAnuncioJson } from "./contratoPrompt.js";
import { LIMITES_GOOGLE } from "./limites.js";
import { PecaAnuncioSchema } from "./modelo.js";

// Percorre o schema inteiro e junta o nome de toda chave de objeto, em qualquer
// profundidade. E este passeio que transforma "esqueci de citar o campo novo no
// prompt" em teste vermelho.
function chavesDoSchema(
  schema: z.ZodTypeAny,
  saida: Set<string> = new Set(),
): Set<string> {
  if (schema instanceof z.ZodObject) {
    const forma = schema.shape as Record<string, z.ZodTypeAny>;
    for (const [chave, valor] of Object.entries(forma)) {
      saida.add(chave);
      chavesDoSchema(valor, saida);
    }
  } else if (schema instanceof z.ZodArray) {
    chavesDoSchema(schema.element as z.ZodTypeAny, saida);
  } else if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
    chavesDoSchema(schema.unwrap() as z.ZodTypeAny, saida);
  }
  return saida;
}

// O passeio acima e o unico juiz do teste seguinte. Se ele quebrar em silencio e
// passar a devolver um punhado de chaves, o teste principal fica verde sem
// conferir nada. Estas ancoras seguram isso: sao campos de tres niveis
// diferentes de profundidade.
test("o passeio pelo schema alcança os campos aninhados", () => {
  const chaves = chavesDoSchema(PecaAnuncioSchema);
  for (const ancora of ["versao", "estrategia", "dorPrincipal", "grupos", "urlFinal", "valorBrl"]) {
    assert.equal(chaves.has(ancora), true, `o passeio perdeu o campo ${ancora}`);
  }
  assert.ok(chaves.size >= 40, `o schema tem ${chaves.size} campos, esperava 40 ou mais`);
});

// O PONTO DESTA SEPARACAO DE ARQUIVO.
//
// O contrato mora colado no schema porque os dois precisam andar juntos pra
// sempre. Este teste e o que garante isso: campo novo em modelo.ts que nao for
// citado no texto do prompt reprova aqui. Sem ele, os dois divergem em silencio
// e a IA passa a entregar peca sem o campo novo, sem ninguem perceber.
test("o contrato do prompt cita TODO campo do schema", () => {
  const texto = montarContratoAnuncioJson();
  const faltando = [...chavesDoSchema(PecaAnuncioSchema)].filter(
    (chave) => !texto.includes(`"${chave}"`),
  );
  assert.deepEqual(
    faltando,
    [],
    `estes campos existem no schema e não aparecem no contrato do prompt: ${faltando.join(", ")}`,
  );
});

// A IA precisa saber o limite pra RESPEITAR, nao so pra ser reprovada depois.
test("o contrato escreve os limites de caractere do Google por extenso", () => {
  const texto = montarContratoAnuncioJson();
  for (const regra of Object.values(LIMITES_GOOGLE)) {
    assert.ok(
      texto.includes(`${regra.campo}: no máximo ${regra.maxCaracteres} caracteres`),
      `o contrato não diz o limite de ${regra.campo}`,
    );
  }
  // As duas ancoras da tabela do Google, escritas: se alguem redigitar um numero
  // aqui em vez de derivar da constante, este par denuncia.
  assert.match(texto, /Título: no máximo 30 caracteres\. Escreva de 3 a 15 por anúncio\./);
  assert.match(texto, /Descrição: no máximo 90 caracteres\. Escreva de 2 a 4 por anúncio\./);
});

// Os numeros saem de LIMITES_GOOGLE, nunca redigitados. Este teste prova a
// ligacao: mexer na constante muda o texto.
test("os limites do texto vêm da constante, não de número digitado à mão", () => {
  const original = LIMITES_GOOGLE.titulos.maxCaracteres;
  const mutavel = LIMITES_GOOGLE as unknown as {
    titulos: { maxCaracteres: number };
  };
  mutavel.titulos.maxCaracteres = 27;
  try {
    assert.match(montarContratoAnuncioJson(), /Título: no máximo 27 caracteres/);
  } finally {
    mutavel.titulos.maxCaracteres = original;
  }
});

test("a faixa de quantidade sai em português para cada forma de regra", () => {
  const texto = montarContratoAnuncioJson();
  // caminhos tem minimo 0: nao existe piso, so teto.
  assert.match(texto, /Caminho de exibição: no máximo 15 caracteres\. Escreva no máximo 2 por anúncio\./);
  // frasesDestaque nao tem teto: so piso.
  assert.match(texto, /Frase de destaque: no máximo 25 caracteres\. Escreva pelo menos 4 na campanha\./);
  // descricoesSitelink tem piso igual ao teto.
  assert.match(
    texto,
    /Descrição do sitelink: no máximo 35 caracteres\. Escreva exatamente 2 por sitelink\./,
  );
});
