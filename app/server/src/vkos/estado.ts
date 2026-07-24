// Estado da ponte VKOS: qual pasta de um VKOS instalado o app esta usando.
// Persiste a escolha em app/dados/config.json e valida se a pasta e um VKOS.

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { contextoAtual } from "../plataforma/contexto.js";

// Este modulo mora em src/vkos (dev) ou dist/vkos (build). Subir tres niveis
// chega na pasta app em ambos os casos, porque src e dist sao irmaos dentro de server.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");
const pastaDados = join(pastaApp, "dados");
const caminhoConfig = join(pastaDados, "config.json");

// Cache em memoria da pasta escolhida. Carrega do disco no primeiro uso.
let pastaVkosCache: string | null = null;
let carregado = false;

export interface Validacao {
  valida: boolean;
  motivo?: string;
}

// Garante que app/dados existe antes de gravar o config.
function garantirPastaDados(): void {
  if (!existsSync(pastaDados)) {
    mkdirSync(pastaDados, { recursive: true });
  }
}

// Le o config do disco uma vez. Falha silenciosa vira "sem pasta escolhida".
function carregar(): void {
  if (carregado) return;
  carregado = true;
  try {
    if (existsSync(caminhoConfig)) {
      const texto = readFileSync(caminhoConfig, "utf8");
      const dados = JSON.parse(texto);
      if (dados && typeof dados.pastaVkos === "string" && dados.pastaVkos.length > 0) {
        pastaVkosCache = dados.pastaVkos;
      }
    }
  } catch {
    pastaVkosCache = null;
  }
}

// Retorna a pasta VKOS escolhida, ou null se ainda nao escolheram nenhuma.
export function obterPastaVkos(): string | null {
  const workspaceId = contextoAtual()?.workspaceId;
  if (workspaceId) return contextoAtual()?.workspacePasta ?? null;
  carregar();
  return pastaVkosCache;
}

// Grava a pasta escolhida em memoria e no disco.
export function definirPastaVkos(caminho: string): void {
  carregar();
  pastaVkosCache = caminho;
  garantirPastaDados();
  const dados = { pastaVkos: caminho };
  gravarJsonAtomico(caminhoConfig, dados);
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
