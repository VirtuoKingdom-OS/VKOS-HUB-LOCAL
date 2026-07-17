// Orquestra o modo Astro da publicacao. Decide o modo, converte a peca, garante
// o motor, builda, confere o dist e coleta os artefatos: a FONTE do projeto
// (src/, public/, configs) pro GitHub e o DIST pronto pra Netlify. Qualquer
// falha e lancada pra o chamador cair no modo HTML na mesma requisicao.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { ArquivoPublicavel } from "../arquivos.js";
import {
  converterParaAstro,
  inspecionarMarcadores,
  type ProjetoAstro,
} from "./conversor.js";
import { buildarProjeto, conferirDist, garantirMotor } from "./motor.js";

export type ModoPublicacao = "astro" | "html";

// Nunca sobem pro GitHub como fonte, nem entram no ZIP da Netlify pela fonte.
// .astro e cache/tipos gerados pelo build; dist e o resultado; node_modules e
// o motor via junction. Nada disso pertence a arvore fonte do projeto.
const EXCLUIR_DA_FONTE = new Set(["node_modules", "dist", ".astro"]);

export function resolverModoPublicacao(pastaPeca: string): ModoPublicacao {
  return inspecionarMarcadores(pastaPeca) ? "astro" : "html";
}

function coletar(
  raiz: string,
  filtroTopo?: Set<string>,
  prefixo = "",
  saida: ArquivoPublicavel[] = [],
): ArquivoPublicavel[] {
  let entradas;
  try {
    entradas = readdirSync(raiz, { withFileTypes: true });
  } catch {
    return saida;
  }
  for (const entrada of entradas) {
    if (!prefixo && filtroTopo?.has(entrada.name)) continue;
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    const absoluto = join(raiz, entrada.name);
    if (entrada.isDirectory()) {
      coletar(absoluto, filtroTopo, relativo, saida);
    } else if (entrada.isFile()) {
      saida.push({ caminho: relativo, conteudo: readFileSync(absoluto) });
    }
  }
  return saida;
}

export interface ArtefatosAstro {
  projeto: ProjetoAstro;
  // Arvore fonte do projeto (sem dist/ nem node_modules), pro GitHub.
  fonte: ArquivoPublicavel[];
  // Conteudo de dist/ pronto pro deploy, pro ZIP da Netlify.
  dist: ArquivoPublicavel[];
}

// Converte, garante o motor, builda e confere. Devolve fonte e dist prontos.
// Lanca ConversaoInviavel, MotorIndisponivel ou BuildFalhou em qualquer falha.
export async function prepararAstro(
  pastaPeca: string,
  urlPublica?: string,
): Promise<ArtefatosAstro> {
  const projeto = await converterParaAstro(pastaPeca, { urlPublica });
  await garantirMotor();
  await buildarProjeto(projeto.pastaProjeto);
  conferirDist(projeto.pastaProjeto, projeto.paginas);

  const fonte = coletar(projeto.pastaProjeto, EXCLUIR_DA_FONTE);
  const dist = coletar(join(projeto.pastaProjeto, "dist"));
  if (fonte.length === 0) {
    throw new Error("O projeto Astro nao tem arquivos de fonte para publicar.");
  }
  if (dist.length === 0) {
    throw new Error("O build do Astro nao gerou arquivos em dist.");
  }
  return { projeto, fonte, dist };
}
