// A trava do caminho portavel. O que ela protege: o Hub inteiro pode mudar de
// pasta sem que os projetos do dono sumam da tela.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { doDisco, paraDisco, raizDoHub } from "./caminhoPortavel.js";

test("a raiz do Hub e a pasta que tem o app dentro", () => {
  assert.ok(existsSync(join(raizDoHub(), "app", "package.json")));
});

test("pasta de dentro do Hub vai pro disco relativa e com barra normal", () => {
  const dentro = join(raizDoHub(), "workspaces", "jdv");
  assert.equal(paraDisco(dentro), "workspaces/jdv");
});

test("pasta de fora do Hub continua absoluta, porque relativa ali nao diria nada", () => {
  const fora = resolve(raizDoHub(), "..", "..", "outra-pasta");
  const gravado = paraDisco(fora);
  assert.ok(gravado.includes("outra-pasta"));
  assert.ok(!gravado.startsWith(".."));
});

test("o que foi gravado relativo volta absoluto contra a raiz do Hub", () => {
  assert.equal(
    doDisco("workspaces/jdv"),
    join(raizDoHub(), "workspaces", "jdv").split("\\").join("/"),
  );
});

test("ida e volta devolve a mesma pasta, dentro e fora do Hub", () => {
  const dentro = join(raizDoHub(), "vkos");
  const fora = resolve(raizDoHub(), "..", "..", "outra-pasta");
  assert.equal(doDisco(paraDisco(dentro)), doDisco(dentro));
  assert.equal(doDisco(paraDisco(fora)), doDisco(fora));
});

test("as duas pontas falam a mesma forma canonica: barra normal, sem barra no fim", () => {
  const comBarraNoFim = join(raizDoHub(), "vkos") + "/";
  assert.equal(doDisco(comBarraNoFim), doDisco(join(raizDoHub(), "vkos")));
  assert.ok(!doDisco(comBarraNoFim).includes("\\"));
  assert.ok(!paraDisco(comBarraNoFim).includes("\\"));
});
