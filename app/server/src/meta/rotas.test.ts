import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("rotas do cliente leem snapshots e nao importam o cliente Graph", () => {
  const fonte = readFileSync(new URL("./rotas.ts", import.meta.url), "utf8");
  assert.equal(fonte.includes('from "./graph.js"'), false);
  assert.equal(fonte.includes("lerJsonlMeta"), true);
  assert.equal(fonte.includes("lerJsonMeta"), true);
});
