import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { gravarTextoAtomico } from "../util/gravarJson.js";

const NOME_SKILL = /^[a-z0-9][a-z0-9_-]*$/;
const COMANDO_SKILL = /^\/([a-z0-9][a-z0-9_-]*)(?:\s+([\s\S]*))?$/i;
const BLOCO_ARQUIVO =
  /<VKOS_ARQUIVO caminho="([^"]+)">\s*\n?([\s\S]*?)\n?<\/VKOS_ARQUIVO>/g;
const LIMITE_SKILL = 200_000;
const LIMITE_ARQUIVO = 2_000_000;

export const PROTOCOLO_ARQUIVOS = [
  "Você não tem acesso direto ao sistema de arquivos.",
  "Quando a skill mandar criar ou alterar um arquivo de texto, devolva o conteúdo completo neste formato exato:",
  '<VKOS_ARQUIVO caminho="pasta/arquivo.ext">',
  "conteúdo completo do arquivo",
  "</VKOS_ARQUIVO>",
  "Use um bloco por arquivo e somente caminhos relativos ao workspace.",
].join("\n");

export class ErroSkillNuvem extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroSkillNuvem";
  }
}

export interface PedidoResolvido {
  pedido: string;
  skill: string | null;
  instrucao: string | null;
}

function nomePedido(prompt: string): { nome: string; argumentos: string } | null {
  const resultado = prompt.trim().match(COMANDO_SKILL);
  return resultado
    ? { nome: resultado[1].toLowerCase(), argumentos: resultado[2]?.trim() ?? "" }
    : null;
}

export function resolverPedidoComSkill(
  pastaWorkspace: string,
  prompt: string,
  skillRecebida: unknown,
): PedidoResolvido {
  const comando = nomePedido(prompt);
  const skill = typeof skillRecebida === "string" && skillRecebida.trim()
    ? skillRecebida.trim().toLowerCase()
    : comando?.nome ?? null;

  if (!skill) {
    if (prompt.trim().startsWith("/")) {
      throw new ErroSkillNuvem(
        "Esse comando não corresponde a uma skill válida do workspace.",
      );
    }
    return { pedido: prompt.trim(), skill: null, instrucao: null };
  }
  if (!NOME_SKILL.test(skill)) {
    throw new ErroSkillNuvem("Nome de skill inválido.");
  }
  if (comando && comando.nome !== skill) {
    throw new ErroSkillNuvem(
      `O comando /${comando.nome} não corresponde à skill ${skill}.`,
    );
  }

  const caminho = resolve(
    pastaWorkspace,
    ".claude",
    "skills",
    skill,
    "SKILL.md",
  );
  const baseSkills = resolve(pastaWorkspace, ".claude", "skills");
  const trecho = relative(baseSkills, caminho);
  if (
    trecho.startsWith(`..${sep}`)
    || trecho === ".."
    || isAbsolute(trecho)
    || !existsSync(caminho)
  ) {
    throw new ErroSkillNuvem(
      `A skill "${skill}" não existe neste workspace.`,
    );
  }
  const instrucao = readFileSync(caminho, "utf8").trim();
  if (!instrucao || instrucao.length > LIMITE_SKILL) {
    throw new ErroSkillNuvem(`A skill "${skill}" está vazia ou é grande demais.`);
  }
  const pedido = comando
    ? comando.argumentos || `Inicie a execução da skill ${skill}.`
    : prompt.trim();
  return { pedido, skill, instrucao };
}

function alvoSeguro(pastaWorkspace: string, caminhoRelativo: string): string {
  const limpo = caminhoRelativo.trim().replace(/\\/g, "/");
  if (
    !limpo
    || limpo.startsWith("/")
    || limpo.split("/").some((parte) => !parte || parte === "." || parte === "..")
  ) {
    throw new ErroSkillNuvem("A skill devolveu um caminho de arquivo inválido.");
  }
  const base = resolve(pastaWorkspace);
  const alvo = resolve(base, ...limpo.split("/"));
  const trecho = relative(base, alvo);
  if (
    trecho.startsWith(`..${sep}`)
    || trecho === ".."
    || isAbsolute(trecho)
  ) {
    throw new ErroSkillNuvem("A skill tentou escrever fora do workspace.");
  }

  let atual = base;
  for (const parte of limpo.split("/").slice(0, -1)) {
    atual = resolve(atual, parte);
    if (existsSync(atual) && lstatSync(atual).isSymbolicLink()) {
      throw new ErroSkillNuvem("A skill tentou atravessar um atalho de pasta.");
    }
  }
  return alvo;
}

export function aplicarArquivosDoResultado(
  pastaWorkspace: string,
  resultado: string,
): { texto: string; arquivos: string[] } {
  const arquivos: string[] = [];
  const texto = resultado.replace(
    BLOCO_ARQUIVO,
    (_bloco, caminhoRelativo: string, conteudo: string) => {
      if (conteudo.length > LIMITE_ARQUIVO) {
        throw new ErroSkillNuvem(
          `O arquivo "${caminhoRelativo}" excede o limite permitido.`,
        );
      }
      const alvo = alvoSeguro(pastaWorkspace, caminhoRelativo);
      mkdirSync(dirname(alvo), { recursive: true });
      gravarTextoAtomico(alvo, conteudo.trimEnd());
      arquivos.push(caminhoRelativo.replace(/\\/g, "/"));
      return `Arquivo ${caminhoRelativo} atualizado.`;
    },
  );
  return { texto: texto.trim(), arquivos };
}
