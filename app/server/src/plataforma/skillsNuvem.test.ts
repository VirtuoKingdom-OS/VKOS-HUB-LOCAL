import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  aplicarArquivosDoResultado,
  ErroSkillNuvem,
  resolverPedidoComSkill,
} from "./skillsNuvem.js";

function workspaceTeste(): string {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-skill-nuvem-"));
  const skill = join(pasta, ".claude", "skills", "instalar");
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), "# Instalar\nFaça uma pergunta.", "utf8");
  return pasta;
}

test("skill existente vira instrução real e remove comando de barra", () => {
  const pasta = workspaceTeste();
  const resolvido = resolverPedidoComSkill(pasta, "/instalar", "instalar");
  assert.equal(resolvido.skill, "instalar");
  assert.match(resolvido.instrucao ?? "", /Faça uma pergunta/);
  assert.doesNotMatch(resolvido.pedido, /^\/instalar/);
});

test("comando sem skill falha antes de chamar o motor", () => {
  const pasta = workspaceTeste();
  assert.throws(
    () => resolverPedidoComSkill(pasta, "/inexistente", undefined),
    (erro: unknown) =>
      erro instanceof ErroSkillNuvem && /não existe/.test(erro.message),
  );
});

test("resultado grava arquivo dentro do workspace e limpa o protocolo", () => {
  const pasta = workspaceTeste();
  const resultado = aplicarArquivosDoResultado(
    pasta,
    'Pronto.\n<VKOS_ARQUIVO caminho="cerebro/cerebro.md">\n# Meu negócio\nCompleto\n</VKOS_ARQUIVO>',
  );
  assert.deepEqual(resultado.arquivos, ["cerebro/cerebro.md"]);
  assert.match(resultado.texto, /Arquivo cerebro\/cerebro.md atualizado/);
  assert.equal(
    readFileSync(join(pasta, "cerebro", "cerebro.md"), "utf8"),
    "# Meu negócio\nCompleto",
  );
});

test("protocolo nunca atravessa a pasta do workspace", () => {
  const pasta = workspaceTeste();
  assert.throws(
    () => aplicarArquivosDoResultado(
      pasta,
      '<VKOS_ARQUIVO caminho="../fora.txt">\nnão\n</VKOS_ARQUIVO>',
    ),
    /caminho de arquivo inválido|fora do workspace/,
  );
});
