// Leitura crua de um conexoes.json, e os tipos do estado.
//
// Modulo folha de verdade: depende so de fs, do path e da quarentena. Ele existe
// separado de estado.ts porque a fusao (fusao.ts) precisa ler os arquivos de
// origem, e estado.ts precisa chamar a fusao. Com tudo num arquivo so, o ciclo
// era garantido.

import { existsSync, readFileSync } from "node:fs";

import { quarentenarComErro } from "../util/quarentena.js";

// Estado de um servidor: ligado ou nao, mais a config (tokens por chave).
export interface EstadoServidor {
  habilitado: boolean;
  config: Record<string, string>;
}

// Estado inteiro das conexoes.
export interface EstadoConexoes {
  servidores: Record<string, EstadoServidor>;
}

// So aceita string nos valores de config. Descarta o resto sem quebrar.
function normalizarConfig(v: unknown): Record<string, string> {
  const saida: Record<string, string> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "string") saida[k] = val;
    }
  }
  return saida;
}

// Le o estado das conexoes de um caminho. Arquivo ausente vira estado vazio, em
// silencio (primeira execucao, ninguem ligou servidor ainda). Arquivo que EXISTE
// mas nao parseia, ou que parseia sem o mapa de servidores, vai pra quarentena e
// lanca.
//
// Falha fechado de proposito. Aqui moram os segredos: o token da Apify e as
// configs dos servidores MCP, digitados na mao e sem copia em lugar nenhum.
// Comecar vazio faria o primeiro toggle da tela de conexoes gravar um arquivo
// sem token por cima do arquivo com token.
export function lerConexoesDeArquivo(caminho: string): EstadoConexoes {
  if (!existsSync(caminho)) return { servidores: {} };
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    throw quarentenarComErro(caminho, "O arquivo de conexoes");
  }
  const dados = bruto as { servidores?: unknown } | null;
  if (
    !dados ||
    typeof dados !== "object" ||
    !dados.servidores ||
    typeof dados.servidores !== "object" ||
    Array.isArray(dados.servidores)
  ) {
    throw quarentenarComErro(caminho, "O arquivo de conexoes");
  }
  const servidores: Record<string, EstadoServidor> = {};
  for (const [id, servidor] of Object.entries(dados.servidores as Record<string, unknown>)) {
    if (!servidor || typeof servidor !== "object") continue;
    const s = servidor as Record<string, unknown>;
    servidores[id] = {
      habilitado: s.habilitado === true,
      config: normalizarConfig(s.config),
    };
  }
  return { servidores };
}
