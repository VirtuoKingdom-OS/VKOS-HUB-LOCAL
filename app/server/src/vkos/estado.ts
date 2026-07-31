// Estado da ponte VKOS: qual pasta de um VKOS instalado o app esta usando.
// Persiste a escolha em app/dados/config.json e valida se a pasta e um VKOS.

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { ErroDadoCorrompido, quarentenar } from "../util/quarentena.js";

// Este modulo mora em src/vkos (dev) ou dist/vkos (build). Subir tres niveis
// chega na pasta app em ambos os casos, porque src e dist sao irmaos dentro de server.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");

// Raiz dos dados, lida a CADA chamada e nunca fixada na carga do modulo.
// VKOS_DADOS_TESTE desvia a raiz, do mesmo jeito que o registro de workspaces
// (ver workspaces/estado.ts). Sem isso, qualquer teste que ativasse um workspace
// gravaria a pasta temporaria dele no config.json de VERDADE, e o app do usuario
// abriria apontando pra uma pasta que ja sumiu.
function raizDados(): string {
  return process.env.VKOS_DADOS_TESTE?.trim() || join(pastaApp, "dados");
}

function caminhoConfigAtual(): string {
  return join(raizDados(), "config.json");
}

// Cache em memoria da pasta escolhida. Carrega do disco no primeiro uso.
let pastaVkosCache: string | null = null;
let carregado = false;
// De qual raiz o cache veio. Trocou a raiz, o cache nao vale mais.
let raizDoCache: string | null = null;
// Fica verdadeiro quando o arquivo estava corrompido e nao deu pra quarentenar.
// Enquanto estiver assim, gravar a pasta por cima apagaria o original.
let gravacaoBloqueada = false;

export interface Validacao {
  valida: boolean;
  motivo?: string;
}

// Garante que a raiz de dados existe antes de gravar o config.
function garantirPastaDados(): void {
  const raiz = raizDados();
  if (!existsSync(raiz)) {
    mkdirSync(raiz, { recursive: true });
  }
}

// Le a pasta escolhida de um caminho. Arquivo ausente devolve null, em silencio
// (ninguem escolheu pasta ainda). Arquivo que EXISTE mas nao parseia, ou que
// parseia sem ser objeto, ou que traz pastaVkos com lixo no lugar do caminho,
// vai pra quarentena e devolve null.
//
// Quarentena e segue com null, sem lancar: isto e lido no boot. Se lancasse, um
// config.json corrompido travaria o servidor por causa de uma escolha que o
// usuario refaz na tela de onboarding.
//
// O podeGravar e o que segura a regra. Quando a quarentena falha e o original
// continua no lugar, ele volta false e o definirPastaVkos recusa gravar.
//
// Objeto valido sem a chave pastaVkos nao e corrupcao, e "nenhuma pasta
// escolhida": nao ha nada a perder ali, entao nao vai pra quarentena.
//
// Exportada pra provar o comportamento com fixture temporaria.
export function lerPastaVkosDeArquivo(caminho: string): {
  pasta: string | null;
  podeGravar: boolean;
} {
  if (!existsSync(caminho)) return { pasta: null, podeGravar: true };

  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    return { pasta: null, podeGravar: quarentenar(caminho) !== null };
  }
  const dados = bruto as { pastaVkos?: unknown } | null;
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return { pasta: null, podeGravar: quarentenar(caminho) !== null };
  }
  if (dados.pastaVkos === undefined) {
    return { pasta: null, podeGravar: true };
  }
  if (typeof dados.pastaVkos !== "string" || dados.pastaVkos.length === 0) {
    return { pasta: null, podeGravar: quarentenar(caminho) !== null };
  }
  return { pasta: dados.pastaVkos, podeGravar: true };
}

// Le o config do disco uma vez por raiz. Trocou a raiz (teste), rele.
function carregar(): void {
  const raiz = raizDados();
  if (carregado && raizDoCache === raiz) return;
  carregado = true;
  raizDoCache = raiz;
  const lido = lerPastaVkosDeArquivo(caminhoConfigAtual());
  pastaVkosCache = lido.pasta;
  gravacaoBloqueada = !lido.podeGravar;
}

// Retorna a pasta VKOS escolhida, ou null se ainda nao escolheram nenhuma.
export function obterPastaVkos(): string | null {
  carregar();
  return pastaVkosCache;
}

// Grava a pasta escolhida em memoria e no disco.
export function definirPastaVkos(caminho: string): void {
  carregar();
  if (gravacaoBloqueada) {
    throw new ErroDadoCorrompido(
      "O config.json esta corrompido e nao deu pra mover pra quarentena. Nada foi gravado por cima. Feche quem estiver usando o arquivo e tente de novo.",
      null,
    );
  }
  pastaVkosCache = caminho;
  garantirPastaDados();
  const dados = { pastaVkos: caminho };
  gravarJsonAtomico(caminhoConfigAtual(), dados);
}

// Confere se um caminho e um diretorio de verdade.
function ehDiretorio(caminho: string): boolean {
  try {
    return statSync(caminho).isDirectory();
  } catch {
    return false;
  }
}

// Valida se um caminho e um VKOS: existe, tem cerebro/cerebro.md e .claude/skills.
// Retorna motivo em portugues claro quando invalida, pra virar mensagem de erro 400.
export function validarPastaVkos(caminho: string): Validacao {
  if (!caminho || typeof caminho !== "string") {
    return { valida: false, motivo: "Informe o caminho da pasta do seu VKOS." };
  }
  if (!ehDiretorio(caminho)) {
    return { valida: false, motivo: "Essa pasta nao existe ou nao e uma pasta." };
  }
  const cerebro = join(caminho, "cerebro", "cerebro.md");
  if (!existsSync(cerebro)) {
    return {
      valida: false,
      motivo: "Nao achei cerebro/cerebro.md nessa pasta. Nao parece um VKOS instalado.",
    };
  }
  const skills = join(caminho, ".claude", "skills");
  if (!ehDiretorio(skills)) {
    return {
      valida: false,
      motivo: "Nao achei a pasta .claude/skills. Nao parece um VKOS instalado.",
    };
  }
  return { valida: true };
}
