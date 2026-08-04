// Descoberta das skills do VKOS. Cada skill e uma pasta em .claude/skills com
// um SKILL.md que abre com um frontmatter YAML de dois campos: name e description.
// A description costuma ser um escalar dobrado (>), multilinha. Parser proprio,
// simples e robusto, sem depender de lib de YAML.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillVkos } from "../tipos.js";

// Descobre todas as skills da pasta do VKOS, em ordem alfabetica pelo nome.
export function lerSkills(pastaVkos: string): SkillVkos[] {
  const pastaSkills = join(pastaVkos, ".claude", "skills");
  if (!existsSync(pastaSkills)) return [];

  const skills: SkillVkos[] = [];
  let entradas;
  try {
    entradas = readdirSync(pastaSkills, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;
    const arquivo = join(pastaSkills, entrada.name, "SKILL.md");
    if (!existsSync(arquivo)) continue;

    let texto: string;
    try {
      texto = readFileSync(arquivo, "utf8");
    } catch {
      continue;
    }

    const frontmatter = extrairFrontmatter(texto);
    if (!frontmatter) continue;

    const nome = extrairCampoSimples(frontmatter, "name") || entrada.name;
    const descricao = extrairDescription(frontmatter);
    skills.push({ nome, descricao });
  }

  skills.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return skills;
}

// Nome de skill aceito: o mesmo formato de pasta que o Claude Code usa. Serve
// tambem de barreira, porque este nome vira segmento de caminho logo abaixo.
const NOME_DE_SKILL = /^[a-z0-9][a-z0-9_-]*$/i;

// O SKILL.md INTEIRO de uma skill, nao so o frontmatter.
//
// Quem usa e o prompt de geracao de anuncio: a sessao dele nasce com o cwd na
// pasta da peca, la dentro de conteudo/, e de la ninguem mediu se o provedor
// acha .claude/skills/ subindo diretorios. Entao o Hub embute o arquivo no
// prompt. Devolve null quando a skill nao existe neste workspace, e quem chama
// responde 409: falhar cedo dizendo o motivo e melhor que gerar sem a skill.
export function lerConteudoSkill(pastaVkos: string, nome: string): string | null {
  if (!NOME_DE_SKILL.test(nome)) return null;
  const arquivo = join(pastaVkos, ".claude", "skills", nome, "SKILL.md");
  try {
    const texto = readFileSync(arquivo, "utf8").replace(/^﻿/, "").trim();
    return texto || null;
  } catch {
    return null;
  }
}

// Isola o bloco de frontmatter entre o primeiro par de linhas "---".
function extrairFrontmatter(texto: string): string | null {
  // Normaliza quebras de linha e tira BOM, se houver.
  const limpo = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = limpo.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

// Le um campo escalar simples do frontmatter (ex: name: carrossel).
function extrairCampoSimples(frontmatter: string, chave: string): string {
  const linhas = frontmatter.split("\n");
  const alvo = new RegExp("^" + chave + ":\\s*(.*)$");
  for (const linha of linhas) {
    const m = linha.match(alvo);
    if (m) return tirarAspas(m[1].trim());
  }
  return "";
}

// Le a description, que pode ser inline ou um bloco multilinha (> dobrado ou |
// literal). Junta as linhas do bloco num texto unico e colapsa os espacos.
function extrairDescription(frontmatter: string): string {
  const linhas = frontmatter.split("\n");
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(/^description:\s*(.*)$/);
    if (!m) continue;

    const resto = m[1].trim();
    const ehBloco = resto === "" || resto.startsWith(">") || resto.startsWith("|");
    if (!ehBloco) {
      // Valor na mesma linha.
      return tirarAspas(resto);
    }

    // Bloco: coleta as linhas indentadas seguintes ate a proxima chave de topo.
    const partes: string[] = [];
    for (let j = i + 1; j < linhas.length; j++) {
      const l = linhas[j];
      if (l.trim() === "") continue; // linha em branco nao interrompe o bloco
      if (!/^\s/.test(l)) break; // linha sem indentacao = proxima chave, fim do bloco
      partes.push(l.trim());
    }
    return partes.join(" ").replace(/\s+/g, " ").trim();
  }
  return "";
}

// Remove aspas simples ou duplas ao redor de um valor, se existirem.
function tirarAspas(valor: string): string {
  if (valor.length >= 2) {
    const abre = valor[0];
    const fecha = valor[valor.length - 1];
    if ((abre === '"' && fecha === '"') || (abre === "'" && fecha === "'")) {
      return valor.slice(1, -1);
    }
  }
  return valor;
}
