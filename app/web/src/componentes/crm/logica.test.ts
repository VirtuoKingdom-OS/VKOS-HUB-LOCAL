import assert from "node:assert/strict";
import test from "node:test";

import type { Coluna, Contato, Negocio, Orcamento, Tarefa } from "../../api/crm";
import {
  PRESETS_SNOOZE,
  TETO_POR_BLOCO,
  contatoCombina,
  dataDoSnooze,
  estaEsfriando,
  montarBlocosDoDia,
  proximoContatoAposInteracao,
  resumirFunil,
} from "./logica";

const AGORA = new Date("2026-07-26T12:00:00.000Z");

function dias(quantos: number): string {
  return new Date(AGORA.getTime() + quantos * 24 * 60 * 60 * 1000).toISOString();
}

function contato(parcial: Partial<Contato> & { id: string }): Contato {
  return {
    nome: `Contato ${parcial.id}`,
    colunaId: "k1",
    tags: [],
    workspaceOrigemId: "w1",
    criadoEm: dias(-200),
    atualizadoEm: dias(-200),
    ...parcial,
  };
}

function negocio(parcial: Partial<Negocio> & { id: string; contatoId: string }): Negocio {
  return {
    titulo: `Negocio ${parcial.id}`,
    status: "aberto",
    criadoEm: dias(-30),
    atualizadoEm: dias(-30),
    ...parcial,
  };
}

function tarefa(parcial: Partial<Tarefa> & { id: string }): Tarefa {
  return { texto: `Tarefa ${parcial.id}`, feita: false, criadaEm: dias(-5), ...parcial };
}

const COLUNA_ABERTA: Coluna = { id: "k1", nome: "Conversando", ordem: 0, tipo: "aberto", diasParaEsfriar: 14 };
const COLUNA_GANHO: Coluna = { id: "k2", nome: "Fechado", ordem: 1, tipo: "ganho", diasParaEsfriar: 14 };

function entrada(parcial: {
  contatos?: Contato[];
  negocios?: Negocio[];
  tarefas?: Tarefa[];
  orcamentos?: Orcamento[];
  colunas?: Coluna[];
  ultimas?: Map<string, string>;
}) {
  return {
    agora: AGORA,
    colunas: parcial.colunas ?? [COLUNA_ABERTA, COLUNA_GANHO],
    contatos: parcial.contatos ?? [],
    negocios: parcial.negocios ?? [],
    orcamentos: parcial.orcamentos ?? [],
    tarefas: parcial.tarefas ?? [],
    organizacoes: [],
    ultimaInteracaoPorContato: parcial.ultimas ?? new Map<string, string>(),
  };
}

function bloco(blocos: ReturnType<typeof montarBlocosDoDia>, chave: string) {
  const achado = blocos.find((item) => item.chave === chave);
  assert.ok(achado, `bloco ${chave} precisa existir`);
  return achado;
}

// ---------------------------------------------------------- blocos do dia

test("separa atrasado de hoje pela data do follow-up", () => {
  const blocos = montarBlocosDoDia(entrada({
    contatos: [
      contato({ id: "a", proximoContato: dias(-3) }),
      contato({ id: "b", proximoContato: AGORA.toISOString() }),
      contato({ id: "c", proximoContato: dias(5) }),
    ],
  }));

  assert.deepEqual(bloco(blocos, "atrasado").itens.map((i) => i.contatoId), ["a"]);
  assert.deepEqual(bloco(blocos, "hoje").itens.map((i) => i.contatoId), ["b"]);
});

test("o contador conta o total real, mesmo com a lista cortada no teto", () => {
  const muitos = Array.from({ length: 23 }, (_, i) =>
    contato({ id: `c${i}`, proximoContato: dias(-(i + 1)) }));
  const atrasado = bloco(montarBlocosDoDia(entrada({ contatos: muitos })), "atrasado");

  assert.equal(atrasado.total, 23);
  assert.equal(atrasado.itens.length, TETO_POR_BLOCO);
});

test("tarefa aberta com prazo vencido cai em atrasado, sem prazo cai em outras", () => {
  const blocos = montarBlocosDoDia(entrada({
    contatos: [contato({ id: "a" })],
    tarefas: [
      tarefa({ id: "t1", contatoId: "a", prazo: dias(-2) }),
      tarefa({ id: "t2", contatoId: "a" }),
      tarefa({ id: "t3", contatoId: "a", prazo: dias(-1), feita: true }),
    ],
  }));

  assert.deepEqual(bloco(blocos, "atrasado").itens.map((i) => i.tarefaId), ["t1"]);
  assert.deepEqual(bloco(blocos, "tarefas").itens.map((i) => i.tarefaId), ["t2"]);
});

test("o mesmo contato nao aparece em dois blocos", () => {
  const blocos = montarBlocosDoDia(entrada({
    contatos: [contato({ id: "a", proximoContato: dias(-3), criadoEm: dias(-90) })],
    negocios: [negocio({ id: "n1", contatoId: "a" })],
    ultimas: new Map([["a", dias(-90)]]),
  }));

  const ondeApareceu = blocos
    .filter((item) => item.itens.some((i) => i.contatoId === "a"))
    .map((item) => item.chave);
  assert.deepEqual(ondeApareceu, ["atrasado"]);
});

test("negocio aberto sem proxima acao vira item proprio", () => {
  const blocos = montarBlocosDoDia(entrada({
    contatos: [contato({ id: "a", criadoEm: dias(-1) })],
    negocios: [negocio({ id: "n1", contatoId: "a" })],
    ultimas: new Map([["a", dias(-1)]]),
  }));

  assert.deepEqual(bloco(blocos, "sem-proxima-acao").itens.map((i) => i.negocioId), ["n1"]);
});

// --------------------------------------------------------- apodrecimento

test("esfria quando passou do limite de dias da coluna", () => {
  assert.equal(estaEsfriando({
    coluna: COLUNA_ABERTA,
    ultimaInteracaoEm: dias(-20),
    proximoContato: undefined,
    negocios: [],
    agora: AGORA,
  }), true);
});

test("nao esfria dentro do limite da coluna", () => {
  assert.equal(estaEsfriando({
    coluna: COLUNA_ABERTA,
    ultimaInteracaoEm: dias(-3),
    proximoContato: undefined,
    negocios: [],
    agora: AGORA,
  }), false);
});

test("negocio com proxima acao no futuro NAO esfria", () => {
  const comAcao = [negocio({ id: "n1", contatoId: "a", proximaAcaoEm: dias(4) })];
  const semAcao = [negocio({ id: "n1", contatoId: "a" })];

  assert.equal(estaEsfriando({
    coluna: COLUNA_ABERTA,
    ultimaInteracaoEm: dias(-40),
    proximoContato: undefined,
    negocios: comAcao,
    agora: AGORA,
  }), false, "com proxima acao futura o cartao nao pode esfriar");

  assert.equal(estaEsfriando({
    coluna: COLUNA_ABERTA,
    ultimaInteracaoEm: dias(-40),
    proximoContato: undefined,
    negocios: semAcao,
    agora: AGORA,
  }), true, "sem proxima acao, o mesmo cartao esfria");
});

test("proxima acao ja vencida nao segura o apodrecimento", () => {
  assert.equal(estaEsfriando({
    coluna: COLUNA_ABERTA,
    ultimaInteracaoEm: dias(-40),
    proximoContato: undefined,
    negocios: [negocio({ id: "n1", contatoId: "a", proximaAcaoEm: dias(-2) })],
    agora: AGORA,
  }), true);
});

test("follow-up marcado no futuro tambem segura o apodrecimento", () => {
  assert.equal(estaEsfriando({
    coluna: COLUNA_ABERTA,
    ultimaInteracaoEm: dias(-40),
    proximoContato: dias(2),
    negocios: [],
    agora: AGORA,
  }), false);
});

test("coluna de ganho ou sem limite nunca esfria", () => {
  const base = { ultimaInteracaoEm: dias(-400), proximoContato: undefined, negocios: [], agora: AGORA };
  assert.equal(estaEsfriando({ ...base, coluna: COLUNA_GANHO }), false);
  assert.equal(estaEsfriando({ ...base, coluna: { ...COLUNA_ABERTA, diasParaEsfriar: undefined } }), false);
});

// ----------------------------------------------------------------- snooze

test("os presets de snooze empurram a data pra frente", () => {
  const base = new Date("2026-07-26T09:00:00.000Z");
  const por = new Map(PRESETS_SNOOZE.map((preset) => [preset.chave, dataDoSnooze(base, preset)]));

  assert.equal(por.get("amanha")?.slice(0, 10), "2026-07-27");
  assert.equal(por.get("tres-dias")?.slice(0, 10), "2026-07-29");
  assert.equal(por.get("semana")?.slice(0, 10), "2026-08-02");
  assert.equal(por.get("mes")?.slice(0, 10), "2026-08-26");
  for (const iso of por.values()) assert.ok(Date.parse(iso) > base.getTime());
});

test("mais um mes a partir de 31 de janeiro para no fim de fevereiro", () => {
  const preset = PRESETS_SNOOZE.find((item) => item.chave === "mes");
  assert.ok(preset);
  const adiado = new Date(dataDoSnooze(new Date(2026, 0, 31, 9, 0), preset));

  assert.equal(adiado.getMonth(), 1);
  assert.equal(adiado.getDate(), 28);
});

test("item adiado sai da lista de hoje sem sumir do sistema", () => {
  const preset = PRESETS_SNOOZE[0];
  const adiado = contato({ id: "a", proximoContato: dataDoSnooze(AGORA, preset) });
  const blocos = montarBlocosDoDia(entrada({ contatos: [adiado] }));

  assert.equal(bloco(blocos, "atrasado").total, 0);
  assert.equal(bloco(blocos, "hoje").total, 0);
  assert.ok(adiado.proximoContato, "a data continua gravada no contato");
});

// -------------------------------------------------------------- follow-up

test("interacao sem cadencia fecha o follow-up", () => {
  assert.equal(proximoContatoAposInteracao(contato({ id: "a", proximoContato: dias(-3) }), AGORA), null);
});

test("interacao com cadencia reagenda o follow-up pra frente", () => {
  const proximo = proximoContatoAposInteracao(
    contato({ id: "a", proximoContato: dias(-3), cadenciaDias: 15 }),
    AGORA,
  );

  assert.ok(proximo);
  assert.equal(proximo.slice(0, 10), "2026-08-10");
});

// ------------------------------------------------------------------ funil

test("o funil separa aberto, ganho e perdido", () => {
  const resumo = resumirFunil([
    negocio({ id: "n1", contatoId: "a", valorEstimado: 1000 }),
    negocio({ id: "n2", contatoId: "a", valorEstimado: 500 }),
    negocio({ id: "n3", contatoId: "b", status: "ganho", valorEstimado: 900, valorFechado: 800, fechadoEm: dias(-2) }),
    negocio({ id: "n4", contatoId: "b", status: "perdido", valorEstimado: 300, fechadoEm: dias(-1) }),
    negocio({ id: "n5", contatoId: "b", status: "ganho", valorEstimado: 7000, fechadoEm: dias(-200) }),
  ], AGORA);

  assert.equal(resumo.emAberto, 1500);
  assert.equal(resumo.negociosAbertos, 2);
  assert.equal(resumo.ganhoNoMes, 800, "ganho usa o valor fechado e so conta o mes corrente");
  assert.equal(resumo.perdidoNoMes, 300);
});

// ------------------------------------------------------------------ busca

test("a busca acha por nome, tag e organizacao", () => {
  const alvo = contato({ id: "a", nome: "Marina Souza", tags: ["vip"], organizacaoId: "o1" });

  assert.equal(contatoCombina(alvo, "marina"), true);
  assert.equal(contatoCombina(alvo, "VIP"), true);
  assert.equal(contatoCombina(alvo, "padaria", "Padaria Central"), true);
  assert.equal(contatoCombina(alvo, "outro nome"), false);
});

test("a busca acha por telefone com qualquer formatacao", () => {
  const alvo = contato({
    id: "a",
    nome: "Marina",
    telefone: "(31) 99999-8888",
    telefoneNormalizado: "+5531999998888",
  });

  assert.equal(contatoCombina(alvo, "99999-8888"), true);
  assert.equal(contatoCombina(alvo, "31999998888"), true);
  assert.equal(contatoCombina(alvo, "+55 31 99999 8888"), true);
  assert.equal(contatoCombina(alvo, "5544332211"), false);
});

test("a busca acha por email", () => {
  const alvo = contato({ id: "a", nome: "Marina", email: "marina@estudio.com.br" });

  assert.equal(contatoCombina(alvo, "estudio.com"), true);
  assert.equal(contatoCombina(alvo, "@estudio"), true);
});

test("busca vazia devolve todo mundo", () => {
  assert.equal(contatoCombina(contato({ id: "a" }), "   "), true);
});
