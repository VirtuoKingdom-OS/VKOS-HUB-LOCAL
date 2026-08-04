// Trava da regra de empilhamento.
//
// O defeito que trouxe esta rodada: reordenar camada mexia no eixo Y da
// pagina. A causa era reordenar o DOM, e a correcao e nunca mais fazer isso no
// carrossel. Estes testes seguram a aritmetica que substituiu o DOM.

import assert from "node:assert/strict";
import test from "node:test";

import {
  calcularDestinos,
  moverNaOrdem,
  mudouAOrdem,
  reordenarEmpilhamento,
  zDaPosicao,
} from "./camadas.js";

test("mover pra cima e pra baixo preserva o resto da ordem", () => {
  const l = ["a", "b", "c", "d"];
  assert.deepEqual(moverNaOrdem(l, 2, 0), ["c", "a", "b", "d"]);
  assert.deepEqual(moverNaOrdem(l, 0, 3), ["b", "c", "d", "a"]);
  assert.deepEqual(moverNaOrdem(l, 1, 2), ["a", "c", "b", "d"]);
  // A entrada nao muda.
  assert.deepEqual(l, ["a", "b", "c", "d"]);
});

test("destino fora da lista gruda na borda em vez de sumir", () => {
  const l = ["a", "b", "c"];
  assert.deepEqual(moverNaOrdem(l, 0, 99), ["b", "c", "a"]);
  assert.deepEqual(moverNaOrdem(l, 2, -5), ["c", "a", "b"]);
});

test("o topo da ordem visual leva o MAIOR z", () => {
  // Confundir as duas ordens e o erro classico: a lista mostra do mais alto
  // pro mais baixo, e z-index maior pinta por cima.
  assert.equal(zDaPosicao(0, 4), 3);
  assert.equal(zDaPosicao(3, 4), 0);
});

test("z nunca fica negativo", () => {
  // Filho com z negativo pinta ATRAS do fundo do proprio pai. Num conteiner
  // com fundo e blur, como o .wrap dos carrosseis, o texto sumiria. E um bug
  // que so aparece depois de salvo.
  for (let total = 1; total <= 6; total++) {
    for (let i = 0; i < total; i++) {
      assert.ok(zDaPosicao(i, total) >= 0, `posicao ${i} de ${total} deu negativo`);
    }
  }
  assert.equal(zDaPosicao(5, 1), 0);
});

test("reordenar devolve uma escala estritamente decrescente", () => {
  const r = reordenarEmpilhamento(["a", "b", "c", "d"], "d", 0);
  assert.deepEqual(r, [
    { id: "d", z: 3 },
    { id: "a", z: 2 },
    { id: "b", z: 1 },
    { id: "c", z: 0 },
  ]);
  // Estritamente decrescente: empate deixaria a ordem indefinida, e ai o
  // navegador desempata pela ordem do DOM, que e justamente o que saimos de
  // depender.
  for (let i = 1; i < r.length; i++) {
    assert.ok(r[i - 1].z > r[i].z, "a escala precisa ser estritamente decrescente");
  }
});

test("o caso real do carrossel: os quatro filhos do .wrap", () => {
  // Slide 2 de "os jovens ja aprenderam a usar a": dentro do .wrap ficam o
  // bloco de titulo, o corpo e a nota, todos com z "auto" (que le 0). Antes,
  // reordenar aqui trocava os nos no DOM e o texto ANDAVA na coluna flex.
  const antes = ["titulo", "corpo", "nota"];
  const r = reordenarEmpilhamento(antes, "nota", 0);
  assert.deepEqual(r.map((x) => x.id), ["nota", "titulo", "corpo"]);
  assert.deepEqual(r.map((x) => x.z), [2, 1, 0]);
});

test("id que nao esta na lista nao produz atribuicao nenhuma", () => {
  assert.deepEqual(reordenarEmpilhamento(["a", "b"], "z", 0), []);
  assert.equal(mudouAOrdem(["a", "b"], "z", 0), false);
});

test("arrasto que termina no mesmo lugar nao conta como mudanca", () => {
  // Sem esta guarda, soltar no proprio lugar gastaria um passo de desfazer e
  // gravaria z-index inline em todo mundo sem motivo.
  assert.equal(mudouAOrdem(["a", "b", "c"], "b", 1), false);
  assert.equal(mudouAOrdem(["a", "b", "c"], "b", 0), true);
  // Destino estourado que resolve pra posicao atual tambem nao e mudanca.
  assert.equal(mudouAOrdem(["a", "b", "c"], "c", 99), false);
});

// ===== Os pontos de soltar do arrasto.

// A anatomia real do slide 2: fundo, veu, contador, a caixa .wrap com tres
// filhos, e a assinatura. E o caso que o Jesse esta tentando editar.
const SLIDE_REAL: Array<{ id: string; nivel: 0 | 1; paiId: string | null }> = [
  { id: "handle", nivel: 0, paiId: null },
  { id: "cnt", nivel: 0, paiId: null },
  { id: "wrap", nivel: 0, paiId: null },
  { id: "titulo", nivel: 1, paiId: "wrap" },
  { id: "corpo", nivel: 1, paiId: "wrap" },
  { id: "nota", nivel: 1, paiId: "wrap" },
  { id: "scrim", nivel: 0, paiId: null },
];

test("cada fresta da lista vira um destino, e sobra uma no fim", () => {
  assert.equal(calcularDestinos(SLIDE_REAL).length, SLIDE_REAL.length + 1);
});

test("a fresta acima de um item de raiz solta na raiz, na posicao dele", () => {
  const d = calcularDestinos(SLIDE_REAL);
  assert.deepEqual(d[0], { paiId: null, indice: 0 }); // antes do handle
  assert.deepEqual(d[2], { paiId: null, indice: 2 }); // antes do wrap
  // O .scrim e o quarto item de RAIZ, mesmo sendo o setimo da lista plana: os
  // filhos do wrap nao contam na numeracao da raiz.
  assert.deepEqual(d[6], { paiId: null, indice: 3 });
});

test("a fresta acima de um filho solta DENTRO do conteiner", () => {
  const d = calcularDestinos(SLIDE_REAL);
  assert.deepEqual(d[3], { paiId: "wrap", indice: 0 }); // antes do titulo
  assert.deepEqual(d[4], { paiId: "wrap", indice: 1 }); // antes do corpo
  assert.deepEqual(d[5], { paiId: "wrap", indice: 2 }); // antes da nota
});

test("a ultima fresta e sempre o fim da raiz", () => {
  // E o gesto de TIRAR DE DENTRO: arrastar um texto do wrap ate o fim da lista
  // solta ele no slide. Era isso que nao existia.
  const d = calcularDestinos(SLIDE_REAL);
  assert.deepEqual(d[d.length - 1], { paiId: null, indice: 4 });
});

test("lista vazia ainda oferece um destino", () => {
  assert.deepEqual(calcularDestinos([]), [{ paiId: null, indice: 0 }]);
});

// A anatomia REAL do slide 7 do mesmo carrossel, que e onde o teto de dois
// niveis apareceu: o `.card` guarda um div anonimo, e os quatro textos moram
// dentro DELE. Nivel 2. Antes de 2026-07-31 eles nao existiam pro painel.
const SLIDE_FUNDO: Array<{ id: string; nivel: number; paiId: string | null }> = [
  { id: "handle", nivel: 0, paiId: null },
  { id: "card", nivel: 0, paiId: null },
  { id: "interno", nivel: 1, paiId: "card" },
  { id: "brand", nivel: 2, paiId: "interno" },
  { id: "title", nivel: 2, paiId: "interno" },
  { id: "body", nivel: 2, paiId: "interno" },
  { id: "cta", nivel: 2, paiId: "interno" },
  { id: "cnt", nivel: 0, paiId: null },
];

test("a arvore tem profundidade qualquer, nao dois niveis", () => {
  const d = calcularDestinos(SLIDE_FUNDO);
  // Dentro do bloco de nivel 2 a contagem e entre os irmaos dele, e nao
  // entre os itens da lista plana.
  assert.deepEqual(d[3], { paiId: "interno", indice: 0 }); // antes do brand
  assert.deepEqual(d[6], { paiId: "interno", indice: 3 }); // antes do cta
  // O item de raiz que vem depois de quatro netos continua contando so os
  // irmaos de raiz.
  assert.deepEqual(d[7], { paiId: null, indice: 2 });
});

test("de qualquer profundidade da pra sair pra raiz", () => {
  const d = calcularDestinos(SLIDE_FUNDO);
  assert.deepEqual(d[d.length - 1], { paiId: null, indice: 3 });
});

test("o nivel e so recuo: quem manda no destino e o paiId", () => {
  // Duas listas com os mesmos pais e niveis diferentes tem que dar o mesmo
  // resultado. Foi amarrar a regra ao numero do nivel que cegou o bloco
  // aninhado.
  const a = calcularDestinos([
    { id: "p", nivel: 0, paiId: null },
    { id: "f", nivel: 1, paiId: "p" },
  ]);
  const b = calcularDestinos([
    { id: "p", nivel: 3, paiId: null },
    { id: "f", nivel: 9, paiId: "p" },
  ]);
  assert.deepEqual(a, b);
});
