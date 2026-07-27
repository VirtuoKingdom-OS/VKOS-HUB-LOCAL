// As regras do chat do CRM.
//
// O runner do web e `tsx --test`, sem DOM. Entao o que se prova aqui e a
// DECISAO, nao o pixel: quando a recarga entra e quando ela espera, quanto
// falta da janela de 24 horas, onde cada dia da thread comeca, se a tela rola
// ou fica quieta, e o que exatamente vai no corpo do POST.
//
// Cada teste abaixo falharia se a regra que ele descreve fosse apagada. Teste
// que passaria com a regra removida nao esta cobrindo nada.

import assert from "node:assert/strict";
import test from "node:test";

import {
  JANELA_24H_MS,
  agruparPorDia,
  calcularJanela24h,
  criarSincronizadorConversas,
  deveRolarParaOFim,
  estaNoFim,
  juntarPaginaAnterior,
  mesclarThread,
  montarPayloadComposer,
  relerThread,
  type MensagemNaTela,
  type SituacaoDaAbaConversas,
} from "./conversas.js";
import type { CapacidadesCanal, Mensagem } from "../../tipos/mensagens.js";

const ESTA_ABA = "aba-desta-tela";
const OUTRA_ABA = "aba-vizinha";

const PARADA: SituacaoDaAbaConversas = { editandoCampoDeDados: false, gravando: false };
const EDITANDO: SituacaoDaAbaConversas = { editandoCampoDeDados: true, gravando: false };
const GRAVANDO: SituacaoDaAbaConversas = { editandoCampoDeDados: false, gravando: true };

const SEM_JANELA: CapacidadesCanal = {
  envioReal: false,
  janela24h: false,
  templates: false,
  recebePorWebhook: false,
  anexos: true,
};
const COM_JANELA: CapacidadesCanal = { ...SEM_JANELA, janela24h: true };

function mensagem(parcial: Partial<Mensagem> & { id: string; enviadaEm: string }): MensagemNaTela {
  return {
    conversaId: "cv-1",
    direcao: "saida",
    canal: "manual",
    origem: "manual",
    tipo: "texto",
    texto: "",
    privada: false,
    status: "enviada",
    chaveIdempotencia: `chave-${parcial.id}`,
    autorTipo: "usuario",
    criadaEm: parcial.enviadaEm,
    anexos: [],
    ...parcial,
  };
}

// ------------------------------------------------------------------ ao vivo

test("aviso de thread de outra aba pede a thread E a lista", () => {
  const sinc = criarSincronizadorConversas(ESTA_ABA);
  sinc.receber({ tipo: "mensagens:atualizadas", escopo: "thread", conversaId: "cv-9", origem: OUTRA_ABA });

  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga, "a recarga precisa sair com a aba parada");
  // Mensagem nova muda previa, ordem e nao lidas na coluna da esquerda. Reler
  // so a thread deixaria a lista mentindo sobre quem falou por ultimo.
  assert.equal(recarga.lista, true);
  assert.deepEqual(recarga.threadDe, ["cv-9"]);
  assert.equal(recarga.threadDeTodas, false);
});

test("aviso de lista NAO faz thread nenhuma reler", () => {
  const sinc = criarSincronizadorConversas(ESTA_ABA);
  sinc.receber({ tipo: "mensagens:atualizadas", escopo: "conversas", origem: OUTRA_ABA });

  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga);
  assert.equal(recarga.lista, true);
  assert.deepEqual(recarga.threadDe, []);
  assert.equal(recarga.threadDeTodas, false);
});

test("aviso da PROPRIA aba nao vira pendencia, entao nao ha laco", () => {
  const sinc = criarSincronizadorConversas(ESTA_ABA);
  sinc.receber({ tipo: "mensagens:atualizadas", escopo: "thread", conversaId: "cv-9", origem: ESTA_ABA });

  assert.equal(sinc.pendente(), false);
  assert.equal(sinc.tomar(PARADA), null);
});

test("editando campo do painel de contexto, a recarga ESPERA e nao se perde", () => {
  const sinc = criarSincronizadorConversas(ESTA_ABA);
  sinc.receber({ tipo: "mensagens:atualizadas", escopo: "thread", conversaId: "cv-9", origem: OUTRA_ABA });

  assert.equal(sinc.tomar(EDITANDO), null, "nao pode atropelar quem digita");
  assert.equal(sinc.tomar(GRAVANDO), null, "nao pode ler no meio da propria gravacao");
  // A prova de que nada se perdeu: assim que o campo libera, a recarga sai
  // inteira. Um teste que so conferisse o null passaria com a pendencia jogada
  // fora, que e justamente o bug.
  assert.equal(sinc.pendente(), true);
  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga);
  assert.deepEqual(recarga.threadDe, ["cv-9"]);
});

test("digitar no composer NAO adia a recarga: so campo ligado ao servidor adia", () => {
  const sinc = criarSincronizadorConversas(ESTA_ABA);
  sinc.receber({ tipo: "mensagens:atualizadas", escopo: "thread", conversaId: "cv-9", origem: OUTRA_ABA });

  // O texto do composer e estado local, nao reflexo de campo do servidor. Se
  // ele adiasse, a conversa congelaria exatamente enquanto se digita.
  assert.ok(sinc.tomar({ editandoCampoDeDados: false, gravando: false }));
});

test("uma rajada de avisos vira uma recarga so, sem repetir conversa", () => {
  const sinc = criarSincronizadorConversas(ESTA_ABA);
  for (let i = 0; i < 4; i++) {
    sinc.receber({ tipo: "mensagens:atualizadas", escopo: "thread", conversaId: "cv-9", origem: OUTRA_ABA });
  }
  sinc.receber({ tipo: "mensagens:atualizadas", escopo: "thread", conversaId: "cv-7", origem: OUTRA_ABA });

  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga);
  assert.deepEqual(recarga.threadDe, ["cv-9", "cv-7"]);
  assert.equal(sinc.tomar(PARADA), null, "tomar zera a pendencia");
});

test("aviso de thread sem conversaId manda reler qualquer thread aberta", () => {
  const sinc = criarSincronizadorConversas(ESTA_ABA);
  sinc.receber({ tipo: "mensagens:atualizadas", escopo: "thread" });

  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga);
  assert.equal(recarga.threadDeTodas, true);
  assert.equal(relerThread(recarga, "cv-qualquer"), true);
  assert.equal(relerThread(recarga, null), false, "sem thread aberta nao ha o que reler");
});

test("thread fechada nao rele por causa de conversa alheia", () => {
  const sinc = criarSincronizadorConversas(ESTA_ABA);
  sinc.receber({ tipo: "mensagens:atualizadas", escopo: "thread", conversaId: "cv-9", origem: OUTRA_ABA });
  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga);

  assert.equal(relerThread(recarga, "cv-9"), true);
  assert.equal(relerThread(recarga, "cv-outra"), false);
});

// ------------------------------------------------------ janela de 24 horas

test("canal sem janela nao mostra relogio, e o composer nunca fecha", () => {
  const janela = calcularJanela24h({ ultimaEntradaEm: undefined }, SEM_JANELA, new Date());

  // A tela le a CAPACIDADE, nunca o nome do canal. Com o canal manual de hoje o
  // relogio nao existe, e no dia que a capacidade virar verdadeira ele nasce
  // sozinho, sem mudar componente nenhum.
  assert.equal(janela.visivel, false);
  assert.equal(janela.aberta, true, "sem janela se responde sempre");
});

test("a janela conta a partir de ultimaEntradaEm, nao da ultima mensagem", () => {
  const agora = new Date("2026-07-27T12:00:00.000Z");
  // O contato falou ha 4 horas. Faltam 20.
  const entrada = new Date(agora.getTime() - 4 * 60 * 60 * 1000).toISOString();

  const janela = calcularJanela24h({ ultimaEntradaEm: entrada }, COM_JANELA, agora);
  assert.equal(janela.visivel, true);
  assert.equal(janela.aberta, true);
  assert.equal(janela.restanteMs, 20 * 60 * 60 * 1000);
  assert.match(janela.rotulo, /20 h/);
});

test("passou de 24 horas desde a ultima entrada, a janela fecha", () => {
  const agora = new Date("2026-07-27T12:00:00.000Z");
  const entrada = new Date(agora.getTime() - JANELA_24H_MS - 1000).toISOString();

  const janela = calcularJanela24h({ ultimaEntradaEm: entrada }, COM_JANELA, agora);
  assert.equal(janela.visivel, true);
  assert.equal(janela.aberta, false);
  assert.equal(janela.restanteMs, 0);
});

test("contato que nunca escreveu nao tem janela aberta", () => {
  // Sem entrada nenhuma nao ha o que contar: com canal de janela, isso e
  // fechado. Tratar como aberto faria o usuario digitar, enviar e receber erro
  // do provedor sem entender.
  const janela = calcularJanela24h({ ultimaEntradaEm: undefined }, COM_JANELA, new Date());
  assert.equal(janela.visivel, true);
  assert.equal(janela.aberta, false);
});

test("o rotulo cai pra minutos no fim da janela", () => {
  const agora = new Date("2026-07-27T12:00:00.000Z");
  const entrada = new Date(agora.getTime() - JANELA_24H_MS + 25 * 60 * 1000).toISOString();

  const janela = calcularJanela24h({ ultimaEntradaEm: entrada }, COM_JANELA, agora);
  assert.equal(janela.aberta, true);
  assert.match(janela.rotulo, /25 min/);
  assert.doesNotMatch(janela.rotulo, / h /);
});

// ------------------------------------------------------- agrupar por dia

test("a thread quebra em blocos de dia, com Hoje e Ontem por extenso", () => {
  const hoje = new Date(2026, 6, 27, 15, 0, 0);
  const ontem = new Date(2026, 6, 26, 9, 0, 0);
  const antes = new Date(2026, 6, 20, 9, 0, 0);

  const grupos = agruparPorDia(
    [
      mensagem({ id: "a", enviadaEm: antes.toISOString() }),
      mensagem({ id: "b", enviadaEm: ontem.toISOString() }),
      mensagem({ id: "c", enviadaEm: new Date(2026, 6, 26, 18, 0, 0).toISOString() }),
      mensagem({ id: "d", enviadaEm: new Date(2026, 6, 27, 8, 0, 0).toISOString() }),
    ],
    hoje,
  );

  assert.equal(grupos.length, 3);
  assert.deepEqual(grupos.map((g) => g.rotulo), ["20/07/2026", "Ontem", "Hoje"]);
  // Duas mensagens do mesmo dia ficam no mesmo bloco, na ordem que chegaram.
  assert.deepEqual(grupos[1].mensagens.map((m) => m.id), ["b", "c"]);
});

test("o corte do dia e a meia-noite local, nao 24 horas corridas", () => {
  const hoje = new Date(2026, 6, 27, 0, 30, 0);
  const grupos = agruparPorDia(
    [
      mensagem({ id: "a", enviadaEm: new Date(2026, 6, 26, 23, 50, 0).toISOString() }),
      mensagem({ id: "b", enviadaEm: new Date(2026, 6, 27, 0, 10, 0).toISOString() }),
    ],
    hoje,
  );

  // Vinte minutos de diferenca, mas dias diferentes: o separador tem que
  // aparecer, senao a thread mente sobre quando as coisas aconteceram.
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos.map((g) => g.rotulo), ["Ontem", "Hoje"]);
});

test("thread vazia nao inventa bloco de dia", () => {
  assert.deepEqual(agruparPorDia([], new Date()), []);
});

// --------------------------------------------------------------- rolagem

test("a thread rola sozinha pra quem ja estava no fim", () => {
  assert.equal(
    deveRolarParaOFim({ primeiraCarga: false, ehPropria: false, estavaNoFim: true, lendoHistorico: false }),
    true,
  );
});

test("mensagem de fora NAO arrasta a tela de quem esta lendo historico", () => {
  // A regra que todo chat mal feito quebra. Sem ela, a pessoa procura uma coisa
  // no historico e a tela pula pro fim porque o outro lado digitou.
  assert.equal(
    deveRolarParaOFim({ primeiraCarga: false, ehPropria: false, estavaNoFim: false, lendoHistorico: true }),
    false,
  );
});

test("o que EU mando rola sempre, mesmo lendo historico", () => {
  assert.equal(
    deveRolarParaOFim({ primeiraCarga: false, ehPropria: true, estavaNoFim: false, lendoHistorico: true }),
    true,
  );
});

test("a thread abre embaixo", () => {
  assert.equal(
    deveRolarParaOFim({ primeiraCarga: true, ehPropria: false, estavaNoFim: false, lendoHistorico: true }),
    true,
  );
});

test("estaNoFim tolera a folga, e so ela", () => {
  assert.equal(estaNoFim({ topo: 900, alturaVisivel: 100, alturaTotal: 1040 }), true);
  assert.equal(estaNoFim({ topo: 500, alturaVisivel: 100, alturaTotal: 1040 }), false);
  // Fim exato continua sendo fim.
  assert.equal(estaNoFim({ topo: 940, alturaVisivel: 100, alturaTotal: 1040 }), true);
});

// ------------------------------------------------------ payload do composer

test("o payload leva a chave de idempotencia que a tela criou", () => {
  const payload = montarPayloadComposer(
    { texto: "  oi  ", direcao: "saida", chaveIdempotencia: "chave-1" },
    new Date("2026-07-27T12:00:00.000Z"),
  );

  assert.ok(payload);
  assert.equal(payload.chaveIdempotencia, "chave-1");
  assert.equal(payload.texto, "oi", "o texto vai aparado");
  assert.equal(payload.direcao, "saida");
  assert.equal(payload.privada, false);
  // Sem retroativo, enviadaEm nao vai: quem carimba e o servidor.
  assert.equal("enviadaEm" in payload, false);
});

test("registro retroativo vira enviadaEm em ISO", () => {
  const agora = new Date(2026, 6, 27, 12, 0, 0);
  const payload = montarPayloadComposer(
    { texto: "respondi ontem", direcao: "entrada", retroativoEm: "2026-07-26T09:30", chaveIdempotencia: "k" },
    agora,
  );

  assert.ok(payload);
  assert.equal(payload.enviadaEm, new Date(2026, 6, 26, 9, 30, 0).toISOString());
  assert.equal(payload.direcao, "entrada");
});

test("retroativo no futuro cai pra agora, senao embaralha a thread e a janela", () => {
  const agora = new Date(2026, 6, 27, 12, 0, 0);
  const payload = montarPayloadComposer(
    { texto: "oi", direcao: "saida", retroativoEm: "2027-01-01T10:00", chaveIdempotencia: "k" },
    agora,
  );

  assert.ok(payload);
  assert.equal(payload.enviadaEm, agora.toISOString());
});

test("data retroativa ilegivel nao derruba o envio", () => {
  const payload = montarPayloadComposer(
    { texto: "oi", direcao: "saida", retroativoEm: "nao e data", chaveIdempotencia: "k" },
    new Date(),
  );

  assert.ok(payload, "o texto da pessoa vale mais que o carimbo digitado errado");
  assert.equal("enviadaEm" in payload, false);
});

test("mensagem sem texto so passa com anexo", () => {
  const agora = new Date();
  assert.equal(
    montarPayloadComposer({ texto: "   ", direcao: "saida", chaveIdempotencia: "k" }, agora),
    null,
  );

  const comAnexo = montarPayloadComposer(
    {
      texto: "",
      direcao: "saida",
      chaveIdempotencia: "k",
      anexos: [{ id: "an-1", tipo: "imagem", nome: "foto.png", caminhoLocal: "C:/fotos/foto.png" }],
    },
    agora,
  );
  assert.ok(comAnexo);
  assert.equal(comAnexo.anexos?.length, 1);
});

test("nota privada viaja marcada", () => {
  const payload = montarPayloadComposer(
    { texto: "lembrar de cobrar", direcao: "saida", privada: true, chaveIdempotencia: "k" },
    new Date(),
  );
  assert.ok(payload);
  assert.equal(payload.privada, true);
});

// --------------------------------------------------------- montar a thread

test("a mensagem otimista some quando a mesma chave volta do servidor", () => {
  const pendente = mensagem({ id: "local-1", enviadaEm: "2026-07-27T12:00:00.000Z" });
  pendente.chaveIdempotencia = "k1";
  pendente.envio = "pendente";
  const gravada = mensagem({ id: "servidor-1", enviadaEm: "2026-07-27T12:00:00.000Z" });
  gravada.chaveIdempotencia = "k1";

  const thread = mesclarThread([gravada], [pendente]);

  // O id local e o do servidor sao diferentes de proposito (o id nasce na tela
  // pro envio otimista existir). Sem a comparacao por chave, a mesma frase
  // apareceria duas vezes na thread.
  assert.deepEqual(thread.map((m) => m.id), ["servidor-1"]);
  assert.equal(thread[0].envio, undefined);
});

test("versao nova da mesma mensagem colapsa por id, a ultima vence", () => {
  const antiga = mensagem({ id: "m1", enviadaEm: "2026-07-27T12:00:00.000Z", status: "enviada" });
  const nova = mensagem({ id: "m1", enviadaEm: "2026-07-27T12:00:00.000Z", status: "entregue" });

  // O arquivo e append-only: a confirmacao de entrega entra como linha nova com
  // o mesmo id. A tela colapsa igual ao servidor, senao a mensagem duplica a
  // cada callback do provedor.
  const thread = mesclarThread([antiga, nova], []);
  assert.equal(thread.length, 1);
  assert.equal(thread[0].status, "entregue");
});

test("mensagem que falhou continua na thread pra poder tentar de novo", () => {
  const falhou = mensagem({ id: "local-2", enviadaEm: "2026-07-27T12:05:00.000Z" });
  falhou.chaveIdempotencia = "k2";
  falhou.envio = "falhou";

  const thread = mesclarThread([mensagem({ id: "s1", enviadaEm: "2026-07-27T12:00:00.000Z" })], [falhou]);

  // Ela NUNCA some. Sumir e o unico jeito de a pessoa achar que mandou.
  assert.deepEqual(thread.map((m) => m.id), ["s1", "local-2"]);
  assert.equal(thread[1].envio, "falhou");
});

test("a thread e ordenada por quando aconteceu, nao por quando entrou no arquivo", () => {
  const retroativa = mensagem({ id: "retro", enviadaEm: "2026-07-20T10:00:00.000Z" });
  retroativa.criadaEm = "2026-07-27T12:10:00.000Z";
  const recente = mensagem({ id: "hoje", enviadaEm: "2026-07-27T09:00:00.000Z" });

  const thread = mesclarThread([recente, retroativa], []);
  assert.deepEqual(thread.map((m) => m.id), ["retro", "hoje"]);
});

test("pagina anterior entra na frente, sem duplicar a fronteira", () => {
  const antigas = [
    mensagem({ id: "a", enviadaEm: "2026-07-20T10:00:00.000Z" }),
    mensagem({ id: "b", enviadaEm: "2026-07-21T10:00:00.000Z" }),
  ];
  const atuais = [
    mensagem({ id: "b", enviadaEm: "2026-07-21T10:00:00.000Z" }),
    mensagem({ id: "c", enviadaEm: "2026-07-22T10:00:00.000Z" }),
  ];

  assert.deepEqual(juntarPaginaAnterior(antigas, atuais).map((m) => m.id), ["a", "b", "c"]);
});
