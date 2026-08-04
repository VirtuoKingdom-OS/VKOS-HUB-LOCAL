// A parte pura da conversa: a soma da transcrição com a fatia do stream.
//
// É a lógica que existia em três cópias divergentes no app. Ela é testável
// sozinha porque não toca React nem DOM: entra dado, sai dado.

import assert from "node:assert/strict";
import test from "node:test";

import type { TurnoSessao } from "../../tipos/dominio";
import {
  MARCAS_ZERADAS,
  montarConversa,
  sessaoEstaRodando,
} from "./usarConversaSessao.js";

function turno(papel: TurnoSessao["papel"], texto: string): TurnoSessao {
  return { papel, texto, em: "2026-07-31T10:00:00.000Z" };
}

test("sem stream, a conversa é a transcrição e mais nada", () => {
  const montada = montarConversa({
    transcricao: [turno("usuario", "oi"), turno("assistente", "olá")],
    pendentes: [],
    marcas: MARCAS_ZERADAS,
  });

  assert.equal(montada.turnos.length, 2);
  assert.equal(montada.respostaViva, "");
  assert.deepEqual(montada.ferramentasVivas, []);
});

test("a resposta viva é só o que veio DEPOIS dos turnos finalizados", () => {
  // O caso central: o stream guarda a conversa inteira desde o começo da
  // sessão. Sem a marca, a mesma resposta apareceria duas vezes, uma como turno
  // e outra como texto ao vivo.
  const montada = montarConversa({
    transcricao: [turno("assistente", "primeira resposta")],
    pendentes: [],
    stream: { texto: "primeira respostasegunda em andamento", recebeuDelta: true },
    marcas: { texto: "primeira resposta".length, ferramentas: 0 },
  });

  assert.equal(montada.respostaViva, "segunda em andamento");
});

test("só as ferramentas do turno de agora aparecem", () => {
  const montada = montarConversa({
    transcricao: [],
    pendentes: [],
    stream: {
      texto: "",
      recebeuDelta: false,
      ferramentas: [
        { nome: "Read", alvo: "anuncio.json" },
        { nome: "Write", alvo: "anuncio.json" },
        { nome: "Bash", alvo: "ls" },
      ],
    },
    marcas: { texto: 0, ferramentas: 2 },
  });

  assert.deepEqual(montada.ferramentasVivas, [{ nome: "Bash", alvo: "ls" }]);
});

test("marca maior que o stream significa stream RECOMEÇADO, e a fatia é tudo", () => {
  // A regra que faltava nas três cópias. Sessão nova no mesmo lugar zera o
  // stream, e a marca velha continua grande. Com slice cru a tela fica muda
  // enquanto a IA responde, sem erro nenhum aparecer.
  const montada = montarConversa({
    transcricao: [],
    pendentes: [],
    stream: {
      texto: "resposta nova",
      recebeuDelta: true,
      ferramentas: [{ nome: "Read", alvo: "anuncio.json" }],
    },
    marcas: { texto: 999, ferramentas: 40 },
  });

  assert.equal(montada.respostaViva, "resposta nova");
  assert.deepEqual(montada.ferramentasVivas, [{ nome: "Read", alvo: "anuncio.json" }]);
});

test("marca exatamente no fim do stream não devolve nada, e isso é o certo", () => {
  // Turno recém-terminado: tudo que está no stream já virou transcrição.
  const montada = montarConversa({
    transcricao: [turno("assistente", "pronto")],
    pendentes: [],
    stream: { texto: "pronto", recebeuDelta: true },
    marcas: { texto: 6, ferramentas: 0 },
  });

  assert.equal(montada.respostaViva, "");
});

test("as falas otimistas viajam separadas dos turnos do servidor", () => {
  // A tela precisa saber quais são otimistas pra desenhar diferente: uma fala
  // que ainda não chegou ao servidor não pode parecer confirmada.
  const montada = montarConversa({
    transcricao: [turno("assistente", "olá")],
    pendentes: [turno("usuario", "troca os títulos do grupo 2")],
    marcas: MARCAS_ZERADAS,
  });

  assert.equal(montada.turnos.length, 1);
  assert.equal(montada.pendentes.length, 1);
  assert.equal(montada.pendentes[0].texto, "troca os títulos do grupo 2");
});

test("os quatro status de trabalho, e só eles, dizem que a IA está rodando", () => {
  for (const status of ["fila", "iniciando", "rodando"]) {
    assert.equal(sessaoEstaRodando(status), true, status);
  }
  for (const status of ["concluida", "erro", "parada", "", undefined]) {
    assert.equal(sessaoEstaRodando(status), false, String(status));
  }
});
