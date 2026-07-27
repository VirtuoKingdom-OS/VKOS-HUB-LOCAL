// O CRM ao vivo, do lado da tela.
//
// O risco que estes testes cobrem nao e "a mensagem chegou". E o que acontece
// depois dela: com a ficha aberta e um campo sendo editado, a recarga NAO pode
// entrar, e tambem NAO pode se perder. Teste que so verifica que o aviso chegou
// passaria com o adiamento apagado, e nao seria teste.

import assert from "node:assert/strict";
import test from "node:test";

import { criarSincronizador, relerLinhaDoTempo, type SituacaoDaAba } from "./aovivo.js";

const ESTA_ABA = "aba-desta-tela";
const OUTRA_ABA = "aba-vizinha";

const PARADA: SituacaoDaAba = { editando: false, gravando: false };
const DIGITANDO: SituacaoDaAba = { editando: true, gravando: false };
const GRAVANDO: SituacaoDaAba = { editando: false, gravando: true };

test("aviso de outra aba no funil pede o funil, e so ele", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  sinc.receber({ escopo: "funil", origem: OUTRA_ABA });

  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga, "a recarga precisa sair com a aba parada");
  assert.equal(recarga.funil, true);
  // Mexer no funil nao mexe no interacoes.jsonl: pedir a leitura do ultimo
  // toque aqui seria uma requisicao a toa em toda gravacao da ficha.
  assert.equal(recarga.ultimasInteracoes, false);
  assert.deepEqual(recarga.linhaDoTempoDe, []);
});

test("aviso da PROPRIA aba nao vira pendencia, entao nao ha laco", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  sinc.receber({ escopo: "funil", origem: ESTA_ABA });

  assert.equal(sinc.pendente(), false);
  assert.equal(sinc.tomar(PARADA), null);
});

test("com a ficha aberta e campo sendo editado, a recarga espera e nao se perde", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  sinc.receber({ escopo: "funil", origem: OUTRA_ABA });

  // O usuario esta digitando: nada entra por cima.
  assert.equal(sinc.tomar(DIGITANDO), null);
  // E o que chegou continua guardado. Adiar nao pode virar perder.
  assert.equal(sinc.pendente(), true);

  // Outro aviso chega enquanto ele ainda digita. Continua guardado.
  sinc.receber({ escopo: "interacoes", contatoId: "c-1", origem: OUTRA_ABA });
  assert.equal(sinc.tomar(DIGITANDO), null);

  // Saiu do campo: agora entra, com tudo que se acumulou junto.
  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga, "a recarga guardada precisa entrar quando o campo libera");
  assert.equal(recarga.funil, true);
  assert.equal(recarga.ultimasInteracoes, true);
  assert.deepEqual(recarga.linhaDoTempoDe, ["c-1"]);
});

test("gravacao desta aba no ar tambem adia, pra leitura nao passar na frente da escrita", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  sinc.receber({ escopo: "funil", origem: OUTRA_ABA });

  assert.equal(sinc.tomar(GRAVANDO), null);
  assert.equal(sinc.pendente(), true);
  assert.ok(sinc.tomar(PARADA));
});

test("interacao registrada pede o ultimo toque e a linha do tempo daquele contato, nao o funil", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  sinc.receber({ escopo: "interacoes", contatoId: "c-9", origem: OUTRA_ABA });

  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga);
  assert.equal(recarga.funil, false, "registrar interacao nao muda o funil na tela");
  assert.equal(recarga.ultimasInteracoes, true);
  assert.deepEqual(recarga.linhaDoTempoDe, ["c-9"]);
  // A ficha aberta de outro contato nao tem por que reler nada.
  assert.equal(relerLinhaDoTempo(recarga, "c-9"), true);
  assert.equal(relerLinhaDoTempo(recarga, "c-outro"), false);
  assert.equal(relerLinhaDoTempo(recarga, null), false);
});

test("o mesmo contato repetido nao entra duas vezes na lista", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  sinc.receber({ escopo: "interacoes", contatoId: "c-1", origem: OUTRA_ABA });
  sinc.receber({ escopo: "interacoes", contatoId: "c-1", origem: OUTRA_ABA });
  sinc.receber({ escopo: "interacoes", contatoId: "c-2", origem: OUTRA_ABA });

  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga);
  assert.deepEqual(recarga.linhaDoTempoDe, ["c-1", "c-2"]);
});

test("reconexao rele tudo, inclusive a linha do tempo da ficha aberta", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  // Aviso de reconexao nao tem origem: ninguem o causou, e a aba nao pode
  // descartar como se fosse eco proprio.
  sinc.receber({ escopo: "tudo" });

  const recarga = sinc.tomar(PARADA);
  assert.ok(recarga);
  assert.equal(recarga.funil, true);
  assert.equal(recarga.ultimasInteracoes, true);
  assert.equal(recarga.linhaDoTempoDeTodos, true);
  // Enquanto o socket esteve fora nao da pra saber quem mudou, entao qualquer
  // ficha aberta rele.
  assert.equal(relerLinhaDoTempo(recarga, "c-qualquer"), true);
});

test("depois de aplicada, a recarga nao volta sozinha", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  sinc.receber({ escopo: "funil", origem: OUTRA_ABA });

  assert.ok(sinc.tomar(PARADA));
  assert.equal(sinc.pendente(), false);
  assert.equal(sinc.tomar(PARADA), null);
});

test("sem aviso nenhum nao ha recarga", () => {
  const sinc = criarSincronizador(ESTA_ABA);
  assert.equal(sinc.pendente(), false);
  assert.equal(sinc.tomar(PARADA), null);
});
