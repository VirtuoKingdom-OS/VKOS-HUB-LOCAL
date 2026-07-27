// Estado global do app: provedor e modelo padrao de cada motor.
// Persiste em app/dados/config-app.json com leitura retrocompativel.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { ErroDadoCorrompido, quarentenar } from "../util/quarentena.js";

const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");
const pastaDados = join(pastaApp, "dados");
const caminhoConfig = join(pastaDados, "config-app.json");

export type ProvedorApp = "claude" | "codex";
export type ModeloApp = "opus" | "sonnet" | "haiku";

export interface ConfigApp {
  provedorPadrao?: ProvedorApp;
  modeloPadraoClaude: ModeloApp;
  modeloPadraoCodex: string;
}

const MODELOS_CLAUDE_VALIDOS: ModeloApp[] = ["opus", "sonnet", "haiku"];
const MODELO_CLAUDE_INICIAL: ModeloApp = "sonnet";
const MODELO_CODEX_INICIAL = "gpt-5.4-mini";

export function ehProvedorValido(valor: unknown): valor is ProvedorApp {
  return valor === "claude" || valor === "codex";
}

export function ehModeloValido(valor: unknown): valor is ModeloApp {
  return (
    typeof valor === "string" &&
    (MODELOS_CLAUDE_VALIDOS as string[]).includes(valor)
  );
}

export function ehModeloCodexValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0 && valor.length <= 120;
}

let cache: ConfigApp | null = null;
// Fica verdadeiro quando o arquivo estava corrompido e nao deu pra quarentenar.
// Enquanto estiver assim, gravar preferencia por cima apagaria o original.
let gravacaoBloqueada = false;

function garantirPastaDados(): void {
  if (!existsSync(pastaDados)) {
    mkdirSync(pastaDados, { recursive: true });
  }
}

function configInicial(): ConfigApp {
  return {
    modeloPadraoClaude: MODELO_CLAUDE_INICIAL,
    modeloPadraoCodex: MODELO_CODEX_INICIAL,
  };
}

// Le a config de um caminho. Arquivo ausente devolve o inicial, em silencio.
// Arquivo que EXISTE mas nao parseia, ou que parseia sem ser objeto, vai pra
// quarentena e devolve o inicial.
//
// Quarentena e segue com o padrao, sem lancar: isto e lido no boot e sao
// preferencias (provedor e modelo). Se lancasse, um config-app.json corrompido
// impediria o servidor de subir por causa de duas escolhas que o usuario refaz
// em dois cliques.
//
// O podeGravar e o que segura a regra. Quando a quarentena falha e o original
// continua no lugar, ele volta false e o salvar recusa: preferencia refeita
// nunca vale apagar um arquivo que talvez ainda de pra recuperar.
//
// Campo invalido dentro de um objeto valido nao e corrupcao, e tolerancia: cai
// no padrao, como sempre caiu (config antiga so tinha modeloPadrao).
//
// Exportada pra provar o comportamento com fixture temporaria.
export function lerConfigAppDeArquivo(caminho: string): {
  config: ConfigApp;
  podeGravar: boolean;
} {
  const inicial = configInicial();
  if (!existsSync(caminho)) return { config: inicial, podeGravar: true };

  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    return { config: inicial, podeGravar: quarentenar(caminho) !== null };
  }
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
    return { config: inicial, podeGravar: quarentenar(caminho) !== null };
  }

  const dados = bruto as Record<string, unknown>;
  // Config antiga tinha apenas modeloPadrao. Ele migra para o modelo Claude.
  const modeloLegado = ehModeloValido(dados.modeloPadrao)
    ? dados.modeloPadrao
    : undefined;

  return {
    config: {
      ...(ehProvedorValido(dados.provedorPadrao)
        ? { provedorPadrao: dados.provedorPadrao }
        : {}),
      modeloPadraoClaude: ehModeloValido(dados.modeloPadraoClaude)
        ? dados.modeloPadraoClaude
        : modeloLegado ?? inicial.modeloPadraoClaude,
      modeloPadraoCodex: ehModeloCodexValido(dados.modeloPadraoCodex)
        ? dados.modeloPadraoCodex.trim()
        : inicial.modeloPadraoCodex,
    },
    podeGravar: true,
  };
}

function carregar(): ConfigApp {
  if (cache) return cache;
  const lido = lerConfigAppDeArquivo(caminhoConfig);
  cache = lido.config;
  gravacaoBloqueada = !lido.podeGravar;
  return cache;
}

function salvar(config: ConfigApp): void {
  carregar();
  if (gravacaoBloqueada) {
    throw new ErroDadoCorrompido(
      "As preferencias estao corrompidas e nao deu pra mover o arquivo pra quarentena. Nada foi gravado por cima. Feche quem estiver usando config-app.json e tente de novo.",
      null,
    );
  }
  cache = { ...config };
  garantirPastaDados();
  gravarJsonAtomico(caminhoConfig, {
    ...config,
    // Alias legado enquanto o frontend antigo ainda pede modeloPadrao.
    modeloPadrao: config.modeloPadraoClaude,
  });
}

export function obterConfigApp(): ConfigApp {
  return { ...carregar() };
}

export function obterProvedorPadrao(): ProvedorApp | undefined {
  return carregar().provedorPadrao;
}

// Export legado usado pelas sessoes Claude atuais.
export function obterModeloPadrao(): ModeloApp {
  return carregar().modeloPadraoClaude;
}

export function obterModeloPadraoDoProvedor(provedor: ProvedorApp): string {
  const config = carregar();
  return provedor === "codex"
    ? config.modeloPadraoCodex
    : config.modeloPadraoClaude;
}

// Export legado usado pelas rotas e consumidores atuais.
export function definirModeloPadrao(modelo: ModeloApp): void {
  definirModeloPadraoClaude(modelo);
}

export function definirProvedorPadrao(provedor: ProvedorApp): void {
  salvar({ ...carregar(), provedorPadrao: provedor });
}

export function definirModeloPadraoClaude(modelo: ModeloApp): void {
  salvar({ ...carregar(), modeloPadraoClaude: modelo });
}

export function definirModeloPadraoCodex(modelo: string): void {
  salvar({ ...carregar(), modeloPadraoCodex: modelo.trim() });
}
