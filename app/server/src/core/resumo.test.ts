import assert from "node:assert/strict";
import test from "node:test";

import type { LancamentoCusto } from "../sessoes/custos.js";
import {
  DIAS_DA_SERIE,
  agregarPorDia,
  classificarAtividade,
  diaLocal,
  ordenarPorAtividade,
  ultimoTurno,
} from "./resumo.js";

const MS_DIA = 24 * 60 * 60 * 1000;

// Um lancamento com o minimo que a agregacao olha. O resto do contrato de
// custos.jsonl nao muda o resultado aqui.
function lancamento(parcial: Partial<LancamentoCusto> & { em: string }): LancamentoCusto {
  return {
    sessaoId: "s-1",
    provedor: "claude",
    modelo: "sonnet",
    ehResume: false,
    ehErro: false,
    custoConhecido: true,
    custoUsd: 0,
    tokensEntradaNova: 0,
    tokensCacheEscrita: 0,
    tokensCacheLeitura: 0,
    tokensSaida: 0,
    ...parcial,
  };
}

// Meio-dia local, pra nenhum caso depender de virada de fuso.
function meioDia(deslocamentoDias = 0): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return new Date(d.getTime() - deslocamentoDias * MS_DIA);
}

test("a serie traz um item por dia, inclusive os dias sem gasto", () => {
  const agora = meioDia();
  const serie = agregarPorDia([lancamento({ em: agora.toISOString(), custoUsd: 1 })], agora);
  assert.equal(serie.length, DIAS_DA_SERIE);
  // Do mais antigo pro mais novo, e o ultimo item e hoje.
  assert.equal(serie[serie.length - 1].dia, diaLocal(agora));
  assert.equal(serie[serie.length - 1].usd, 1);
  assert.equal(serie[0].usd, 0);
  assert.equal(serie[0].turnos, 0);
});

test("o gasto cai no dia LOCAL do turno, nao no dia UTC", () => {
  // 22h local: em boa parte dos fusos a mesma hora ja e o dia seguinte em UTC.
  const agora = meioDia();
  const noite = new Date(agora);
  noite.setHours(22, 30, 0, 0);
  const serie = agregarPorDia([lancamento({ em: noite.toISOString(), custoUsd: 2 })], agora);
  const hoje = serie.find((d) => d.dia === diaLocal(noite));
  assert.ok(hoje, "o dia local do turno tem que estar na serie");
  assert.equal(hoje.usd, 2);
});

test("turno sem preco conhecido nao soma dolar e vira piso do dia", () => {
  const agora = meioDia();
  const serie = agregarPorDia(
    [
      lancamento({ em: agora.toISOString(), custoUsd: 3 }),
      lancamento({
        em: agora.toISOString(),
        custoConhecido: false,
        custoUsd: 0,
        motivoSemCusto: "modelo fora da tabela",
      }),
    ],
    agora,
  );
  const hoje = serie[serie.length - 1];
  assert.equal(hoje.usd, 3);
  assert.equal(hoje.turnos, 2);
  assert.equal(hoje.turnosSemCusto, 1);
});

test("turno com erro nao conta como turno sem preco", () => {
  // A diferenca importa: no erro o Hub SABE que nao deve somar. No sem preco
  // ele nao sabe quanto foi, e o numero passa a ser um piso.
  const agora = meioDia();
  const serie = agregarPorDia(
    [lancamento({ em: agora.toISOString(), ehErro: true, custoConhecido: false })],
    agora,
  );
  const hoje = serie[serie.length - 1];
  assert.equal(hoje.turnos, 1);
  assert.equal(hoje.turnosSemCusto, 0);
  assert.equal(hoje.usd, 0);
});

test("turno mais velho que a serie fica de fora dela", () => {
  const agora = meioDia();
  const velho = meioDia(DIAS_DA_SERIE + 5);
  const serie = agregarPorDia([lancamento({ em: velho.toISOString(), custoUsd: 9 })], agora);
  assert.equal(serie.reduce((soma, d) => soma + d.usd, 0), 0);
});

test("data invalida no jsonl nao derruba a agregacao", () => {
  const agora = meioDia();
  const serie = agregarPorDia(
    [lancamento({ em: "isto nao e data", custoUsd: 4 }), lancamento({ em: agora.toISOString(), custoUsd: 1 })],
    agora,
  );
  assert.equal(serie.reduce((soma, d) => soma + d.usd, 0), 1);
});

test("o ultimo turno e o mais novo, na ordem que estiver", () => {
  const novo = meioDia(1).toISOString();
  const velho = meioDia(9).toISOString();
  assert.equal(ultimoTurno([lancamento({ em: novo }), lancamento({ em: velho })]), novo);
  assert.equal(ultimoTurno([lancamento({ em: velho }), lancamento({ em: novo })]), novo);
  assert.equal(ultimoTurno([]), null);
});

test("sessao em voo torna o projeto rodando, mesmo sem gasto nenhum", () => {
  const agora = meioDia();
  assert.equal(
    classificarAtividade(
      { sessoesRodando: 1, ultimoTurnoEm: null, ultimoUso: meioDia(300).toISOString() },
      agora,
    ),
    "rodando",
  );
});

test("turno dentro da janela deixa o projeto recente, fora dela deixa parado", () => {
  const agora = meioDia();
  const dentro = { sessoesRodando: 0, ultimoTurnoEm: meioDia(3).toISOString(), ultimoUso: meioDia(90).toISOString() };
  const fora = { sessoesRodando: 0, ultimoTurnoEm: meioDia(30).toISOString(), ultimoUso: meioDia(90).toISOString() };
  assert.equal(classificarAtividade(dentro, agora), "recente");
  assert.equal(classificarAtividade(fora, agora), "parado");
});

test("abrir o cliente conta como atividade, mesmo sem gastar IA", () => {
  // Ler arquivo e olhar peca tambem e trabalho. Sem isso o cliente aberto hoje
  // apareceria como parado so por nao ter disparado sessao.
  const agora = meioDia();
  assert.equal(
    classificarAtividade(
      { sessoesRodando: 0, ultimoTurnoEm: null, ultimoUso: meioDia(1).toISOString() },
      agora,
    ),
    "recente",
  );
});

test("a lista poe quem esta rodando na frente, e o mais novo dentro do grupo", () => {
  const itens = [
    { id: "parado", atividade: "parado" as const, ultimoUso: meioDia(50).toISOString(), ultimoTurnoEm: null },
    { id: "recente-velho", atividade: "recente" as const, ultimoUso: meioDia(6).toISOString(), ultimoTurnoEm: null },
    { id: "rodando", atividade: "rodando" as const, ultimoUso: meioDia(40).toISOString(), ultimoTurnoEm: null },
    { id: "recente-novo", atividade: "recente" as const, ultimoUso: meioDia(1).toISOString(), ultimoTurnoEm: null },
  ];
  assert.deepEqual(
    ordenarPorAtividade(itens).map((i) => i.id),
    ["rodando", "recente-novo", "recente-velho", "parado"],
  );
});
