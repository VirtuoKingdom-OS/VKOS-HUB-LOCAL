// Fixture do JSONL observado no Codex CLI 0.144.2.
// Rode com: npx tsx src/provedores/codex.fixture.test.ts

import assert from "node:assert/strict";

import type { OpcoesSessaoProvedor } from "./contrato.js";
import {
  estimarCustoCodex,
  montarArgsCodex,
  montarPromptCodex,
  TradutorEventosCodex,
} from "./codex.js";

const opcoes: OpcoesSessaoProvedor = {
  pastaTrabalho: "C:\\temp\\vkos-codex",
  prompt: "responda ok",
  modelo: "gpt-5.4-mini",
  permissao: "padrao",
};

assert.deepEqual(montarArgsCodex(opcoes), [
  "exec",
  "--json",
  "--model",
  "gpt-5.4-mini",
  "--sandbox",
  "workspace-write",
  "--skip-git-repo-check",
  "-C",
  "C:\\temp\\vkos-codex",
  "-",
]);

const argsTotalResume = montarArgsCodex({
  ...opcoes,
  permissao: "total",
  retomada: "0199a213-81c0-7800-8aa1-bbab2a035a53",
});
assert(argsTotalResume.includes("--dangerously-bypass-approvals-and-sandbox"));
assert(!argsTotalResume.includes("--sandbox"));
assert.deepEqual(argsTotalResume.slice(-3), [
  "resume",
  "0199a213-81c0-7800-8aa1-bbab2a035a53",
  "-",
]);

const argsResumeAposRestart = montarArgsCodex({
  ...opcoes,
  modelo: "",
  retomada: "0199a213-81c0-7800-8aa1-bbab2a035a53",
});
assert(!argsResumeAposRestart.includes("--model"));
assert.deepEqual(argsResumeAposRestart.slice(-3), [
  "resume",
  "0199a213-81c0-7800-8aa1-bbab2a035a53",
  "-",
]);

// Sem instrucoes extras, o prompt do stdin vai intocado.
assert.equal(montarPromptCodex(opcoes), "responda ok");

// Com instrucoes extras, o bloco marcado prefixa o prompt real, com uma
// linha em branco entre eles. As instrucoes nunca entram nos args.
assert.equal(
  montarPromptCodex({ ...opcoes, instrucoesExtras: "seja direto" }),
  "<regras-da-sessao>\nseja direto\n</regras-da-sessao>\n\nresponda ok",
);
assert.deepEqual(
  montarArgsCodex({ ...opcoes, instrucoesExtras: "seja direto" }),
  montarArgsCodex(opcoes),
);

const fixtureBruta = [
  {
    type: "thread.started",
    thread_id: "0199a213-81c0-7800-8aa1-bbab2a035a53",
  },
  { type: "turn.started" },
  {
    type: "item.completed",
    item: { id: "item_0", type: "agent_message", text: "Vou criar o arquivo." },
  },
  {
    type: "item.started",
    item: {
      id: "item_1",
      type: "command_execution",
      command: "Get-Content README.md",
      status: "in_progress",
    },
  },
  {
    type: "item.completed",
    item: {
      id: "item_1",
      type: "command_execution",
      command: "Get-Content README.md",
      aggregated_output: "VKOS",
      exit_code: 0,
      status: "completed",
    },
  },
  {
    type: "item.started",
    item: {
      id: "item_2",
      type: "file_change",
      changes: [{ path: "resultado.txt", kind: "add" }],
      status: "in_progress",
    },
  },
  {
    type: "item.completed",
    item: {
      id: "item_2",
      type: "file_change",
      changes: [{ path: "resultado.txt", kind: "add" }],
      status: "completed",
    },
  },
  {
    type: "item.completed",
    item: { id: "item_3", type: "agent_message", text: "Arquivo criado." },
  },
  {
    type: "turn.completed",
    usage: {
      input_tokens: 25130,
      cached_input_tokens: 17664,
      output_tokens: 140,
      reasoning_output_tokens: 20,
    },
  },
];
const fixtureJsonl = fixtureBruta.map((evento) => JSON.stringify(evento)).join("\n");
const fixture = fixtureJsonl
  .split("\n")
  .map((linha) => JSON.parse(linha) as Record<string, unknown>);

const tradutor = new TradutorEventosCodex("gpt-5.4-mini");
const eventos = fixture.flatMap((evento) => tradutor.traduzir(evento));

assert.deepEqual(eventos[0], {
  type: "system",
  subtype: "init",
  session_id: "0199a213-81c0-7800-8aa1-bbab2a035a53",
  model: "gpt-5.4-mini",
});
assert.equal(eventos.filter((evento) => evento.type === "assistant").length, 4);

const ferramentas = eventos
  .filter((evento) => evento.type === "assistant")
  .flatMap((evento) => {
    const mensagem = evento.message as { content?: Array<Record<string, unknown>> };
    return mensagem.content ?? [];
  })
  .filter((bloco) => bloco.type === "tool_use");
assert.deepEqual(
  ferramentas.map((bloco) => bloco.name),
  ["Executar comando", "Alterar arquivo"],
);

const result = eventos.at(-1) as Record<string, unknown>;
assert.equal(result.type, "result");
assert.equal(result.result, "Vou criar o arquivo.\n\nArquivo criado.");
assert.equal(result.total_cost_usd, 0.0075543);
assert.equal(result.estimado, true);
assert.deepEqual(result.usage, {
  input_tokens: 7466,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 17664,
  output_tokens: 140,
  cached_input_tokens: 17664,
  reasoning_output_tokens: 20,
});
assert.equal(
  estimarCustoCodex("gpt-5.4-mini", fixture.at(-1)?.usage),
  0.0075543,
);

const incremental = new TradutorEventosCodex("gpt-5.6-luna");
const deltas = [
  {
    type: "item.updated",
    item: { id: "msg", type: "agent_message", text: "Ola" },
  },
  {
    type: "item.updated",
    item: { id: "msg", type: "agent_message", text: "Ola, VKOS" },
  },
  {
    type: "item.completed",
    item: { id: "msg", type: "agent_message", text: "Ola, VKOS Hub" },
  },
].flatMap((evento) => incremental.traduzir(evento));
assert.deepEqual(
  deltas.map((evento) => {
    const e = evento.event as { delta?: { text?: string } };
    return e.delta?.text;
  }),
  ["Ola", ", VKOS", " Hub"],
);
assert.equal(deltas.some((evento) => evento.type === "assistant"), false);

const falha = new TradutorEventosCodex("gpt-5.4-mini").traduzir({
  type: "turn.failed",
  error: { message: "Not logged in" },
});
assert.equal(falha[0]?.is_error, true);
assert.match(String(falha[0]?.result), /nao esta logado/i);

console.log("Fixture do provedor Codex validada.");
