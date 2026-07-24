import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AREAS, caminhoDaArea, lerArea } from "./rotasGestao";

test("a raiz cai no Painel", () => {
  assert.equal(lerArea("/").area, "painel");
  assert.equal(lerArea("").area, "painel");
});

test("Workspace tem area e caminho proprios", () => {
  assert.equal(lerArea("/workspace").area, "workspace");
  assert.equal(caminhoDaArea("workspace"), "/workspace");
  assert.ok(AREAS.some((a) => a.id === "workspace" && a.nome === "Workspace"));
});

test("os caminhos antigos /clientes e /modelos redirecionam pra Workspace", () => {
  assert.equal(lerArea("/clientes").area, "workspace");
  assert.equal(lerArea("/modelos").area, "workspace");
});

test("Clientes e Planos nao existem mais como area propria", () => {
  const ids = AREAS.map((a) => a.id as string);
  assert.ok(!ids.includes("clientes"));
  assert.ok(!ids.includes("modelos"));
});

test("sistema resolve a sub-area, com fallback pra meu-claude", () => {
  assert.deepEqual(lerArea("/sistema/seguranca"), { area: "sistema", sub: "seguranca" });
  assert.deepEqual(lerArea("/sistema/inexistente"), { area: "sistema", sub: "meu-claude" });
  assert.equal(caminhoDaArea("sistema", "auditoria"), "/sistema/auditoria");
});

test("caminho desconhecido cai no Painel", () => {
  assert.equal(lerArea("/nao-existe").area, "painel");
});
