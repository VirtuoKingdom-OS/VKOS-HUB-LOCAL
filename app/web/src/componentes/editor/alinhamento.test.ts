import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularAlinhamento,
  deveAgruparPasso,
  JANELA_GESTO_MS,
  type Caixa,
} from "./alinhamento.js";

// Palco no formato de um slide de carrossel: 1080 x 1350, canto na origem.
const PALCO: Caixa = { esquerda: 0, topo: 0, largura: 1080, altura: 1350 };

function caixa(esquerda: number, topo: number, largura: number, altura: number): Caixa {
  return { esquerda, topo, largura, altura };
}

test("longe de tudo nao gruda e nao desenha guia", () => {
  const r = calcularAlinhamento(caixa(200, 300, 100, 50), [], PALCO, 6);
  assert.equal(r.dx, 0);
  assert.equal(r.dy, 0);
  assert.deepEqual(r.guias, []);
});

test("centro do palco gruda nos dois eixos e marca as duas guias como centro", () => {
  // Centro do palco: x=540, y=675. A caixa esta 4px pra esquerda e 3px acima.
  const movel = caixa(540 - 50 - 4, 675 - 25 - 3, 100, 50);
  const r = calcularAlinhamento(movel, [], PALCO, 6);
  assert.equal(r.dx, 4);
  assert.equal(r.dy, 3);
  assert.equal(r.guias.length, 2);
  const v = r.guias.find((g) => g.eixo === "v")!;
  const h = r.guias.find((g) => g.eixo === "h")!;
  assert.equal(v.posicao, 540);
  assert.equal(h.posicao, 675);
  assert.equal(v.tipo, "centro");
  assert.equal(h.tipo, "centro");
});

test("fora do limiar em um eixo gruda so no outro", () => {
  // 3px do centro em x (gruda), 40px do centro em y (nao gruda).
  const movel = caixa(540 - 50 - 3, 675 - 25 - 40, 100, 50);
  const r = calcularAlinhamento(movel, [], PALCO, 6);
  assert.equal(r.dx, 3);
  assert.equal(r.dy, 0);
  assert.equal(r.guias.length, 1);
  assert.equal(r.guias[0].eixo, "v");
});

test("alinha pela borda esquerda de um vizinho", () => {
  const vizinho = caixa(120, 900, 300, 100);
  // Movel 2px a direita da borda esquerda do vizinho, longe de qualquer centro.
  const movel = caixa(122, 400, 80, 40);
  const r = calcularAlinhamento(movel, [vizinho], PALCO, 6);
  assert.equal(r.dx, -2);
  const v = r.guias.find((g) => g.eixo === "v")!;
  assert.equal(v.posicao, 120);
  assert.equal(v.tipo, "borda");
});

test("guia de borda cobre o movel e o vizinho, com folga nas duas pontas", () => {
  const vizinho = caixa(120, 900, 300, 100);
  const movel = caixa(122, 400, 80, 40);
  const r = calcularAlinhamento(movel, [vizinho], PALCO, 6, 8);
  const v = r.guias.find((g) => g.eixo === "v")!;
  // Extensao vertical: do topo mais alto (400) ao fundo mais baixo (1000).
  assert.equal(v.de, 400 - 8);
  assert.equal(v.ate, 1000 + 8);
});

test("empate de distancia entrega o centro, nao a borda", () => {
  // Vizinho cuja BORDA esquerda fica a 5px do centro do movel, e o palco cujo
  // CENTRO fica a 5px do centro do movel. Mesma distancia, o centro vence.
  const movel = caixa(540 - 50 + 5, 100, 100, 40); // centro do movel em x = 545
  const vizinho = caixa(550, 800, 100, 40); // borda esquerda em 550, 5px adiante
  const r = calcularAlinhamento(movel, [vizinho], PALCO, 6);
  const v = r.guias.find((g) => g.eixo === "v")!;
  assert.equal(v.tipo, "centro");
  assert.equal(v.posicao, 540);
  assert.equal(r.dx, -5);
});

test("o encaixe mais proximo vence o mais distante", () => {
  const perto = caixa(300, 800, 100, 40); // borda esquerda em 300
  const longe = caixa(305, 900, 100, 40); // borda esquerda em 305
  const movel = caixa(301, 200, 60, 30);
  const r = calcularAlinhamento(movel, [longe, perto], PALCO, 6);
  assert.equal(r.dx, -1);
  assert.equal(r.guias.find((g) => g.eixo === "v")!.posicao, 300);
});

test("limiar zero ou negativo desliga o alinhamento", () => {
  const movel = caixa(540 - 50, 675 - 25, 100, 50);
  assert.deepEqual(calcularAlinhamento(movel, [], PALCO, 0), { dx: 0, dy: 0, guias: [] });
  assert.deepEqual(calcularAlinhamento(movel, [], PALCO, -3), { dx: 0, dy: 0, guias: [] });
});

test("borda direita do palco tambem alinha", () => {
  const movel = caixa(1080 - 100 - 3, 200, 100, 50); // borda direita 3px antes de 1080
  const r = calcularAlinhamento(movel, [], PALCO, 6);
  assert.equal(r.dx, 3);
  assert.equal(r.guias.find((g) => g.eixo === "v")!.posicao, 1080);
});

test("um eixo gruda no maximo uma vez, nunca soma dois encaixes", () => {
  // Dois vizinhos, os dois dentro do limiar em x. So um deslocamento sai.
  const a = caixa(200, 500, 50, 50);
  const b = caixa(203, 700, 50, 50);
  const movel = caixa(202, 100, 50, 50);
  const r = calcularAlinhamento(movel, [a, b], PALCO, 6);
  assert.equal(r.dx, 1); // encostou em 203, o mais proximo
  assert.equal(r.guias.filter((g) => g.eixo === "v").length, 1);
});

// ===== Agrupamento de passos no desfazer.

test("o primeiro passo de um gesto nunca agrupa", () => {
  assert.equal(deveAgruparPasso(null, { acao: "seta", alvo: "a1", momento: 100 }), false);
});

test("setas seguidas no mesmo elemento agrupam num passo so", () => {
  const antes = { acao: "seta", alvo: "a1", momento: 1000 };
  assert.equal(deveAgruparPasso(antes, { acao: "seta", alvo: "a1", momento: 1120 }), true);
});

test("a janela padrao e a de 500 ms das bibliotecas de historico", () => {
  assert.equal(JANELA_GESTO_MS, 500);
  const antes = { acao: "seta", alvo: "a1", momento: 1000 };
  assert.equal(deveAgruparPasso(antes, { acao: "seta", alvo: "a1", momento: 1500 }), true);
  assert.equal(deveAgruparPasso(antes, { acao: "seta", alvo: "a1", momento: 1501 }), false);
});

test("pausa maior que a janela quebra o agrupamento", () => {
  const antes = { acao: "seta", alvo: "a1", momento: 1000 };
  assert.equal(deveAgruparPasso(antes, { acao: "seta", alvo: "a1", momento: 1701 }, 700), false);
  assert.equal(deveAgruparPasso(antes, { acao: "seta", alvo: "a1", momento: 1700 }, 700), true);
});

test("trocar de elemento quebra o agrupamento", () => {
  const antes = { acao: "seta", alvo: "a1", momento: 1000 };
  assert.equal(deveAgruparPasso(antes, { acao: "seta", alvo: "a2", momento: 1050 }), false);
});

test("trocar de acao quebra o agrupamento", () => {
  const antes = { acao: "seta", alvo: "a1", momento: 1000 };
  assert.equal(deveAgruparPasso(antes, { acao: "cor", alvo: "a1", momento: 1050 }), false);
});

test("alvo vazio nunca agrupa, pra nao juntar acoes de elementos sem id", () => {
  const antes = { acao: "seta", alvo: "", momento: 1000 };
  assert.equal(deveAgruparPasso(antes, { acao: "seta", alvo: "", momento: 1050 }), false);
});

test("momento que anda pra tras nao agrupa", () => {
  const antes = { acao: "seta", alvo: "a1", momento: 1000 };
  assert.equal(deveAgruparPasso(antes, { acao: "seta", alvo: "a1", momento: 900 }), false);
});
