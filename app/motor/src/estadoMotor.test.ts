import assert from "node:assert/strict";
import test from "node:test";

import {
  classificarFalhaMotor,
  statusCredencialClaude,
} from "./estadoMotor.js";

test("falha de autenticação vira manutenção sem expor a chave", () => {
  const falha = classificarFalhaMotor(
    Object.assign(new Error("invalid api key sk-secreta"), { status: 401 }),
  );
  assert.equal(falha.codigo, "autenticacao");
  assert.match(falha.mensagemCliente, /manutenção/);
  assert.doesNotMatch(falha.mensagemCliente, /sk-secreta/);
});

test("quota e indisponibilidade têm mensagens distintas", () => {
  assert.equal(classificarFalhaMotor({ status: 429 }).codigo, "quota");
  assert.equal(
    classificarFalhaMotor(new Error("connect ECONNREFUSED")).codigo,
    "indisponivel",
  );
});

test("só autenticação recusada invalida a credencial Claude", () => {
  assert.equal(statusCredencialClaude("operante", null), "valida");
  assert.equal(
    statusCredencialClaude("manutencao", "autenticacao"),
    "invalida",
  );
  assert.equal(
    statusCredencialClaude("manutencao", "configuracao"),
    null,
  );
});
