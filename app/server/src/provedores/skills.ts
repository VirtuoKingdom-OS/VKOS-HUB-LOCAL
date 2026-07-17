// Compatibilidade das instrucoes do workspace entre Claude Code e Codex.

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { gravarTextoAtomico } from "../util/gravarJson.js";
import type { IdProvedor } from "./contrato.js";

export const MARCA_AGENTS_GERADO =
  "<!-- VKOS-HUB:AGENTS-GERADO-DE-CLAUDE-MD:v1 -->";

export type ResultadoAgents =
  | "criado"
  | "atualizado"
  | "inalterado"
  | "manual-preservado"
  | "sem-claude";

const INVOCACAO_NA_LINHA =
  /^([ \t]*)\/([a-z0-9][a-z0-9_-]*)(?:[ \t]+([^\r\n]*?))?[ \t]*$/gim;
const INVOCACAO_ISOLADA =
  /(^|[\s(])\/([a-z0-9][a-z0-9_-]*)(?=$|[\s),.!?;:])/gim;

function instrucaoSkill(nome: string): string {
  return `Leia o arquivo \`.claude/skills/${nome}/SKILL.md\` e siga as instrucoes dele como se fossem parte deste prompt.`;
}

// Expande comandos de skill somente no Codex. Uma linha que comeca pelo comando
// ganha uma linha separada para os argumentos. Invocacoes isoladas no meio do
// texto trocam apenas o token. Caminhos de arquivo nao casam com a regra.
export function expandirSkills(prompt: string, provedor: IdProvedor): string {
  if (provedor !== "codex") return prompt;

  const linhasExpandidas = prompt.replace(
    INVOCACAO_NA_LINHA,
    (_trecho, recuo: string, nomeBruto: string, argumentos?: string) => {
      const nome = nomeBruto.toLowerCase();
      const instrucao = `${recuo}${instrucaoSkill(nome)}`;
      const args = argumentos?.trim();
      return args ? `${instrucao}\n${recuo}Argumentos da skill: ${args}` : instrucao;
    },
  );

  return linhasExpandidas.replace(
    INVOCACAO_ISOLADA,
    (_trecho, prefixo: string, nomeBruto: string) =>
      `${prefixo}${instrucaoSkill(nomeBruto.toLowerCase())}`,
  );
}

export function montarAgentsGerado(conteudoClaude: string): string {
  const conteudo = conteudoClaude.replace(/^\uFEFF/, "").trimEnd();
  return [
    MARCA_AGENTS_GERADO,
    "# Instrucoes do workspace para o Codex",
    "",
    "Arquivo gerado automaticamente pelo VKOS Hub a partir do CLAUDE.md. Nao edite na mao.",
    "",
    "## Instrucoes herdadas do CLAUDE.md",
    "",
    conteudo,
    "",
  ].join("\n");
}

// Garante AGENTS.md somente quando ha CLAUDE.md. Um arquivo manual, sem a
// marca inequívoca acima, sempre e preservado. Um gerado so muda quando a fonte
// ficou mais nova ou quando seu conteudo nao corresponde mais a fonte.
export function garantirAgentsGerado(pastaTrabalho: string): ResultadoAgents {
  const caminhoClaude = join(pastaTrabalho, "CLAUDE.md");
  const caminhoAgents = join(pastaTrabalho, "AGENTS.md");

  if (!existsSync(caminhoClaude)) return "sem-claude";

  const esperado = montarAgentsGerado(readFileSync(caminhoClaude, "utf8"));
  if (!existsSync(caminhoAgents)) {
    gravarTextoAtomico(caminhoAgents, esperado);
    return "criado";
  }

  const atual = readFileSync(caminhoAgents, "utf8");
  if (!atual.includes(MARCA_AGENTS_GERADO)) {
    return "manual-preservado";
  }
  if (atual === esperado) return "inalterado";

  const fonteMaisNova =
    statSync(caminhoClaude).mtimeMs > statSync(caminhoAgents).mtimeMs;
  const conteudoDefasado = atual !== esperado;
  if (fonteMaisNova || conteudoDefasado) {
    gravarTextoAtomico(caminhoAgents, esperado);
    return "atualizado";
  }
  return "inalterado";
}

export function prepararPromptEWorkspace(
  pastaTrabalho: string,
  prompt: string,
  provedor: IdProvedor,
): { prompt: string; agents: ResultadoAgents | null } {
  if (provedor !== "codex") {
    return { prompt, agents: null };
  }
  return {
    prompt: expandirSkills(prompt, provedor),
    agents: garantirAgentsGerado(pastaTrabalho),
  };
}
