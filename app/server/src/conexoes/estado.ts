// Estado das conexoes MCP do CORE. Guarda quais servidores estao ligados e a
// config de cada um (tokens). As conexoes sao do sistema, nao de um workspace:
// GitHub, Netlify, Notion, Google e Apify sao contas do operador e valem pra
// operacao inteira. Os segredos vivem SO em app/dados/conexoes.json, com
// escrita atomica. Decisao registrada em decisoes/2026-07-23-conexoes-no-core.md.
//
// As funcoes mantem o parametro workspaceId por compatibilidade com os
// consumidores (calendario, publicacao, sessoes MCP, leads), mas no CORE ele e
// ignorado: todo workspace le o mesmo estado central. A primeira leitura migra
// os conexoes.json antigos por workspace pro arquivo central.
//
// Modulo folha: depende so de fs/path, do gravarJson e do registro de
// workspaces. Nunca importa rotas nem catalogo, pra nao criar ciclo.

import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { lerRegistro, pastaDadosWorkspace } from "../workspaces/estado.js";
import { MODO } from "../plataforma/modo.js";

const NOME_ARQUIVO = "conexoes.json";

// Este modulo mora em src/conexoes (dev) ou dist/conexoes (build). Subir tres
// niveis chega na pasta app nos dois casos.
const pastaApp = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const pastaDados = join(pastaApp, "dados");

// Caminho do arquivo central. O override por ambiente existe pros testes nao
// tocarem o conexoes.json real do operador; com ele ativo a migracao dos
// legados nao roda (arquivo ausente = estado vazio).
function caminhoCentral(): string {
  return process.env.VKOS_CONEXOES_ARQUIVO?.trim() || join(pastaDados, NOME_ARQUIVO);
}

function centralForcado(): boolean {
  return Boolean(process.env.VKOS_CONEXOES_ARQUIVO?.trim());
}

function garantirPastaDados(): void {
  const pasta = dirname(caminhoCentral());
  if (!existsSync(pasta)) mkdirSync(pasta, { recursive: true });
}

// Estado de um servidor: ligado ou nao, mais a config (tokens por chave).
export interface EstadoServidor {
  habilitado: boolean;
  config: Record<string, string>;
}

// Estado inteiro das conexoes de um workspace.
export interface EstadoConexoes {
  servidores: Record<string, EstadoServidor>;
}

function caminhoArquivoLegado(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), NOME_ARQUIVO);
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

// Interpreta um conteudo cru de conexoes.json. Forma invalida vira null.
function interpretar(texto: string): EstadoConexoes | null {
  try {
    const dados = JSON.parse(texto);
    if (dados && typeof dados === "object" && dados.servidores && typeof dados.servidores === "object") {
      const servidores: Record<string, EstadoServidor> = {};
      for (const [id, bruto] of Object.entries(dados.servidores as Record<string, unknown>)) {
        if (!bruto || typeof bruto !== "object") continue;
        const s = bruto as Record<string, unknown>;
        servidores[id] = {
          habilitado: s.habilitado === true,
          config: normalizarConfig(s.config),
        };
      }
      return { servidores };
    }
  } catch {
    // Arquivo ilegivel.
  }
  return null;
}

function lerArquivo(caminho: string): EstadoConexoes | null {
  try {
    if (existsSync(caminho)) return interpretar(readFileSync(caminho, "utf8"));
  } catch {
    // Sem leitura, sem estado.
  }
  return null;
}

// Migra os conexoes.json antigos por workspace pro arquivo central, uma vez.
// Percorre o registro comecando pelo workspace ativo (onde o operador de fato
// configurou as contas): o primeiro servidor encontrado de cada id vence. Os
// arquivos antigos ficam no lugar e somem junto com a pasta de dados do
// workspace quando ele for removido.
function migrarParaCentral(): EstadoConexoes {
  const resultado: EstadoConexoes = { servidores: {} };
  const reg = lerRegistro();
  const ordenados = [...reg.workspaces].sort((a, b) =>
    (a.id === reg.ativo ? -1 : 0) - (b.id === reg.ativo ? -1 : 0),
  );
  for (const w of ordenados) {
    const antigo = lerArquivo(caminhoArquivoLegado(w.id));
    if (!antigo) continue;
    for (const [id, servidor] of Object.entries(antigo.servidores)) {
      if (!(id in resultado.servidores)) resultado.servidores[id] = servidor;
    }
  }
  garantirPastaDados();
  gravarJsonAtomico(caminhoCentral(), resultado);
  return resultado;
}

// Le o estado central das conexoes do CORE. O workspaceId e ignorado: as
// conexoes valem pra operacao inteira. Arquivo ausente dispara a migracao dos
// legados por workspace; corrompido vira estado vazio, sem quebrar.
export function lerConexoes(_workspaceId: string): EstadoConexoes {
  // O Hub nao monta a chave do cofre e nunca pode consumir os tokens legados
  // em texto aberto. As integracoes voltam quando falarem com o cofre central.
  if (MODO === "hub") return { servidores: {} };
  const central = lerArquivo(caminhoCentral());
  if (central) return central;
  if (centralForcado() || existsSync(caminhoCentral())) return { servidores: {} };
  return migrarParaCentral();
}

// Grava o estado central das conexoes, de forma atomica.
export function salvarConexoes(_workspaceId: string, estado: EstadoConexoes): void {
  if (MODO === "hub") {
    throw new Error("Conexoes externas no Hub exigem o cofre central.");
  }
  garantirPastaDados();
  gravarJsonAtomico(caminhoCentral(), estado);
}
