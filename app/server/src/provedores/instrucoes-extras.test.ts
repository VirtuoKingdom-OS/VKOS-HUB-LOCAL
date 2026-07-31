// Guarda do bug provado em 2026-07-26: instrucao extra de sessao viajando como
// argumento de linha de comando era cortada na primeira quebra de linha sob
// shell no Windows, e levava junto --mcp-config e --allowedTools, em silencio.
// Ver docs/decisoes/2026-07-26-instrucoes-extras-por-stdin.md.

import assert from "node:assert/strict";
import test from "node:test";

import { montarArgsClaude } from "./claude.js";
import { montarPromptCodex } from "./codex.js";
import { montarPromptComInstrucoes } from "./util.js";
import type { OpcoesSessaoProvedor } from "./contrato.js";

// Instrucao realista: multilinha, acentuada, com os caracteres que o cmd.exe
// trata de forma especial.
const INSTRUCAO = `# Contexto agregado

Primeira regra do bloco.
Segunda regra, com acento e pontuação.

- Item de lista (com parênteses)
- Outro item`;

function opcoes(extras?: string): OpcoesSessaoProvedor {
  return {
    pastaTrabalho: "C:/trabalho",
    prompt: "gere a peça",
    modelo: "sonnet",
    permissao: "padrao",
    ...(extras ? { instrucoesExtras: extras } : {}),
    mcp: { caminho: "C:/dados/mcp.json", servidores: ["apify"] },
  } as OpcoesSessaoProvedor;
}

test("nenhum argumento do Claude carrega quebra de linha", () => {
  const args = montarArgsClaude(opcoes(INSTRUCAO));
  for (const arg of args) {
    assert.ok(
      !arg.includes("\n"),
      `argumento multilinha quebra sob shell no Windows: ${JSON.stringify(arg)}`,
    );
  }
});

test("o Claude nao usa mais --append-system-prompt", () => {
  const args = montarArgsClaude(opcoes(INSTRUCAO));
  assert.equal(args.includes("--append-system-prompt"), false);
});

test("instrucao extra nao derruba --mcp-config nem --allowedTools", () => {
  const sem = montarArgsClaude(opcoes());
  const com = montarArgsClaude(opcoes(INSTRUCAO));
  // A instrucao nao entra em argumento, entao os dois conjuntos sao iguais.
  assert.deepEqual(com, sem);
  assert.ok(com.includes("--mcp-config"));
  assert.ok(com.includes("--allowedTools"));
  assert.ok(com.includes("mcp__apify"));
});

test("a instrucao chega inteira no prompt do Claude, pelo stdin", () => {
  const prompt = montarPromptComInstrucoes(opcoes(INSTRUCAO));
  assert.ok(prompt.includes(INSTRUCAO), "a instrucao precisa chegar literal");
  assert.ok(prompt.includes("<regras-da-sessao>"));
  assert.ok(prompt.endsWith("gere a peça"), "o pedido real fecha o prompt");
});

test("a instrucao chega inteira no prompt do Codex, pelo stdin", () => {
  const prompt = montarPromptCodex(opcoes(INSTRUCAO));
  assert.ok(prompt.includes(INSTRUCAO), "a instrucao precisa chegar literal");
  assert.ok(prompt.includes("<regras-da-sessao>"));
  assert.ok(prompt.endsWith("gere a peça"));
});

test("os dois provedores montam o mesmo prompt", () => {
  assert.equal(
    montarPromptCodex(opcoes(INSTRUCAO)),
    montarPromptComInstrucoes(opcoes(INSTRUCAO)),
  );
});

test("sem instrucao extra o prompt passa cru, sem bloco de regras", () => {
  const prompt = montarPromptComInstrucoes(opcoes());
  assert.equal(prompt, "gere a peça");
  assert.equal(prompt.includes("<regras-da-sessao>"), false);
});
