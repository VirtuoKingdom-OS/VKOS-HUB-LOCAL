// Orquestra o modo Astro. Decide o modo, converte a peca, garante o motor,
// builda, confere o dist e coleta os artefatos: a FONTE do projeto (src/,
// public/, configs) e o DIST compilado, que e o que a exportacao baixa.
// Qualquer falha e lancada pra o chamador cair no modo HTML na mesma
// requisicao.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { ArquivoPublicavel } from "../arquivos.js";
import {
  converterParaAstro,
  inspecionarMarcadores,
  type ProjetoAstro,
} from "./conversor.js";
import { buildarProjeto, conferirDist, garantirMotor, motorViavel } from "./motor.js";

export type ModoPublicacao = "astro" | "html";

// Nunca entram na arvore fonte do projeto. .astro e cache/tipos gerados pelo
// build; dist e o resultado; node_modules e o motor via junction.
const EXCLUIR_DA_FONTE = new Set(["node_modules", "dist", ".astro"]);

// Decisao pura do modo: so promete Astro com marcadores validos E motor viavel.
export function decidirModo(temMarcadores: boolean, motorOk: boolean): ModoPublicacao {
  return temMarcadores && motorOk ? "astro" : "html";
}

// Modo previsto pra UI e pro deploy. Alem dos marcadores, confere a viabilidade
// barata do motor: sem Astro instalado e sem npm no PATH, o deploy cairia no
// HTML puro logo apos o clique, entao o badge nao pode prometer Astro.
export function resolverModoPublicacao(pastaPeca: string): ModoPublicacao {
  return decidirModo(inspecionarMarcadores(pastaPeca), motorViavel());
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
  // Arvore fonte do projeto (sem dist/ nem node_modules).
  fonte: ArquivoPublicavel[];
  // Conteudo de dist/, o site compilado que vai no ZIP da exportacao.
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
