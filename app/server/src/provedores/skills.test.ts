import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  MARCA_AGENTS_GERADO,
  expandirSkills,
  garantirAgentsGerado,
} from "./skills.js";

test("Claude recebe o prompt sem alteracao", () => {
  const prompt = "/instalar";
  assert.equal(expandirSkills(prompt, "claude"), prompt);
});

test("Codex expande /instalar puro", () => {
  const final = expandirSkills("/instalar", "codex");
  assert.match(final, /\.claude\/skills\/instalar\/SKILL\.md/);
  assert.doesNotMatch(final, /(^|\s)\/instalar($|\s)/);
});

test("Codex preserva os argumentos da skill", () => {
  const final = expandirSkills("/carrossel campanha de julho", "codex");
  assert.match(final, /\.claude\/skills\/carrossel\/SKILL\.md/);
  assert.match(final, /Argumentos da skill: campanha de julho/);
});

test("prompt sem skill passa intacto", () => {
  const prompt = "Crie uma pagina curta.";
  assert.equal(expandirSkills(prompt, "codex"), prompt);
});

test("caminho de SKILL.md nao e tratado como invocacao", () => {
  const prompt = "Leia .claude/skills/site/SKILL.md antes de comecar.";
  assert.equal(expandirSkills(prompt, "codex"), prompt);
});

test("invocacao isolada no meio do texto e expandida", () => {
  const final = expandirSkills("Agora use /instalar para continuar.", "codex");
  assert.match(final, /\.claude\/skills\/instalar\/SKILL\.md/);
});

test("AGENTS gerado nasce, fica estavel e acompanha a fonte", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-skills-"));
  try {
    const claude = join(pasta, "CLAUDE.md");
    const agents = join(pasta, "AGENTS.md");
    writeFileSync(claude, "# Regra\n\nPrimeira versao.\n", "utf8");

    assert.equal(garantirAgentsGerado(pasta), "criado");
    const primeira = readFileSync(agents, "utf8");
    assert.match(primeira, new RegExp(MARCA_AGENTS_GERADO.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(garantirAgentsGerado(pasta), "inalterado");
    assert.equal(readFileSync(agents, "utf8"), primeira);

    writeFileSync(claude, "# Regra\n\nSegunda versao.\n", "utf8");
    const futuro = new Date(Date.now() + 2_000);
    utimesSync(claude, futuro, futuro);
    assert.equal(garantirAgentsGerado(pasta), "atualizado");
    assert.match(readFileSync(agents, "utf8"), /Segunda versao/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("AGENTS manual nunca e sobrescrito", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-skills-"));
  try {
    writeFileSync(join(pasta, "CLAUDE.md"), "Fonte automatica", "utf8");
    writeFileSync(join(pasta, "AGENTS.md"), "Instrucao manual", "utf8");
    assert.equal(garantirAgentsGerado(pasta), "manual-preservado");
    assert.equal(readFileSync(join(pasta, "AGENTS.md"), "utf8"), "Instrucao manual");
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("AGENTS gerado defasado e corrigido mesmo com data mais nova", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-skills-"));
  try {
    const claude = join(pasta, "CLAUDE.md");
    const agents = join(pasta, "AGENTS.md");
    writeFileSync(claude, "Fonte correta", "utf8");
    assert.equal(garantirAgentsGerado(pasta), "criado");
    writeFileSync(agents, `${MARCA_AGENTS_GERADO}\nConteudo alterado`, "utf8");
    const futuro = new Date(Date.now() + 2_000);
    utimesSync(agents, futuro, futuro);

    assert.equal(garantirAgentsGerado(pasta), "atualizado");
    assert.match(readFileSync(agents, "utf8"), /Fonte correta/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
