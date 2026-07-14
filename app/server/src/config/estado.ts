// Estado da config do app: qual modelo o Claude usa por padrao numa sessao nova.
// Persiste a escolha em app/dados/config-app.json. Padrao inicial: "sonnet".

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

import { gravarJsonAtomico } from "../util/gravarJson.js";

// Este modulo mora em src/config (dev) ou dist/config (build). Subir tres niveis
// chega na pasta app nos dois casos, porque src e dist sao irmaos dentro de server.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");
const pastaDados = join(pastaApp, "dados");
const caminhoConfig = join(pastaDados, "config-app.json");

// Modelos aceitos. Um alias por opcao, o mesmo que o CLI entende no --model.
export type ModeloApp = "opus" | "sonnet" | "haiku";
const MODELOS_VALIDOS: ModeloApp[] = ["opus", "sonnet", "haiku"];
const MODELO_INICIAL: ModeloApp = "sonnet";

// Confere se um valor qualquer e um modelo valido.
export function ehModeloValido(valor: unknown): valor is ModeloApp {
  return typeof valor === "string" && (MODELOS_VALIDOS as string[]).includes(valor);
}

// Cache em memoria. Carrega do disco no primeiro uso.
let modeloCache: ModeloApp | null = null;
let carregado = false;

function garantirPastaDados(): void {
  if (!existsSync(pastaDados)) {
    mkdirSync(pastaDados, { recursive: true });
  }
}

// Le a config do disco uma vez. Falha silenciosa cai no padrao inicial.
function carregar(): void {
  if (carregado) return;
  carregado = true;
  try {
    if (existsSync(caminhoConfig)) {
      const texto = readFileSync(caminhoConfig, "utf8");
      const dados = JSON.parse(texto);
      if (dados && ehModeloValido(dados.modeloPadrao)) {
        modeloCache = dados.modeloPadrao;
      }
    }
  } catch {
    modeloCache = null;
  }
}

// Retorna o modelo padrao configurado (ou o inicial se nada foi escolhido).
export function obterModeloPadrao(): ModeloApp {
  carregar();
  return modeloCache ?? MODELO_INICIAL;
}

// Grava o modelo padrao em memoria e no disco.
export function definirModeloPadrao(modelo: ModeloApp): void {
  carregar();
  modeloCache = modelo;
  garantirPastaDados();
  const dados = { modeloPadrao: modelo };
  gravarJsonAtomico(caminhoConfig, dados);
}
