import assert from "node:assert/strict";
import test from "node:test";

import {
  MENSAGEM_CONFERENCIA_DEMOROU,
  rotuloConferencia,
} from "./geracao";

// A8: terminais principais do estado de geracao no que toca a conferencia de site.

test("sem conferencia nao ha rotulo", () => {
  assert.equal(rotuloConferencia(undefined, false), null);
});

test("conferindo mostra a fase enquanto dentro do tempo", () => {
  assert.equal(
    rotuloConferencia({ estado: "conferindo", volta: 0 }, false),
    "Conferindo o site",
  );
});

test("corrigindo mostra a volta atual", () => {
  assert.equal(
    rotuloConferencia({ estado: "corrigindo", volta: 1 }, false),
    "Corrigindo pendências (volta 1 de 2)",
  );
});

test("terminal aprovada nao tem rotulo de andamento", () => {
  assert.equal(rotuloConferencia({ estado: "aprovada", volta: 0 }, false), null);
  assert.equal(rotuloConferencia({ estado: "aprovada", volta: 0 }, true), null);
});

test("terminal pendencias nao tem rotulo de andamento", () => {
  assert.equal(rotuloConferencia({ estado: "pendencias", volta: 2 }, false), null);
  assert.equal(rotuloConferencia({ estado: "pendencias", volta: 2 }, true), null);
});

test("timeout: conferindo demorado cai pro estado honesto sem travar", () => {
  assert.equal(
    rotuloConferencia({ estado: "conferindo", volta: 0 }, true),
    MENSAGEM_CONFERENCIA_DEMOROU,
  );
  assert.equal(
    rotuloConferencia({ estado: "corrigindo", volta: 2 }, true),
    MENSAGEM_CONFERENCIA_DEMOROU,
  );
});
