import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { lerModo, permiteIaLocal } from "./modo.js";

const AQUI = dirname(fileURLToPath(import.meta.url));

// A regra de ouro do 3.0: o runtime que atende cliente nunca alcanca o provedor
// local (o Claude pessoal do Jesse). Isso e garantido por construcao, e estes
// testes travam a garantia contra regressao.

test("so o modo core executa IA local; o hub sempre passa pelo motor", () => {
  assert.equal(permiteIaLocal("core"), true);
  assert.equal(permiteIaLocal("hub"), false);
  assert.equal(lerModo("hub"), "hub");
  assert.equal(lerModo(undefined), "core");
});

test("o caminho de sessao do hub nao importa o provedor local em hipotese alguma", () => {
  const fonte = readFileSync(join(AQUI, "sessoesNuvem.ts"), "utf8");
  assert.ok(
    !/provedores\/(claude|codex|index)/.test(fonte),
    "sessoesNuvem.ts nao pode referenciar os provedores locais",
  );
  assert.ok(
    !/child_process|spawn/.test(fonte),
    "sessoesNuvem.ts nao pode disparar processo local de IA",
  );
  // O caminho do hub fala com o motor por rede: e assim que a credencial do
  // cliente (e nunca a do Jesse) atende a sessao.
  assert.ok(/MOTOR_URL|\/interno\/sessao/.test(fonte), "sessoesNuvem.ts deve chamar o motor");
});

test("o motor resolve o provedor pela coluna motor do workspace, por sessao", () => {
  const fonte = readFileSync(join(AQUI, "sessoesNuvem.ts"), "utf8");
  assert.ok(
    /SELECT motor.*FROM workspaces WHERE id = \$1/s.test(fonte),
    "cada sessao do hub resolve o motor do proprio workspace",
  );
});
