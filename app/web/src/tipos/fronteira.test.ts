// Guarda a fronteira de tipos do CRM.
//
// O bug que este teste existe pra impedir: o web tinha a propria copia das
// entidades do CRM, o servidor foi pra v4 e o typecheck do web continuou verde
// enquanto a tela quebrava em runtime. Se alguem redeclarar as entidades no
// cliente, o erro volta a ser invisivel pro compilador. Aqui ele grita.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ponte = readFileSync(new URL("./crm.ts", import.meta.url), "utf8");
const cliente = readFileSync(new URL("../api/crm.ts", import.meta.url), "utf8");

test("a ponte de tipos aponta pro modelo do servidor", () => {
  assert.match(ponte, /from "\.\.\/\.\.\/\.\.\/server\/src\/crm\/modelo"/);
  // So tipo atravessa a fronteira: import de valor traria codigo de servidor
  // pro bundle do navegador.
  assert.doesNotMatch(ponte, /^\s*import\s+\{/m);
});

test("o cliente HTTP nao redeclara as entidades do CRM", () => {
  for (const entidade of ["Contato", "Negocio", "Coluna", "Tarefa", "Orcamento", "EstadoCrm"]) {
    assert.doesNotMatch(
      cliente,
      new RegExp(`\\binterface\\s+${entidade}\\b`),
      `${entidade} precisa vir do servidor, nao de uma copia local`,
    );
  }
});

test("o cliente pega os tipos da ponte, nunca do servidor direto", () => {
  assert.match(cliente, /from "\.\.\/tipos\/crm"/);
  assert.doesNotMatch(cliente, /from "[^"]*server\/src/);
});
