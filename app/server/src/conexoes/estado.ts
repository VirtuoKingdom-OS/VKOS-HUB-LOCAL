// Estado das conexoes, unico do Hub, no nivel CORE.
//
// A conexao e do DONO do Hub, nao do cliente atendido: a conta da Apify e uma
// so, e quem paga por ela e quem opera o Hub. Por isso o estado vive em
// app/dados/conexoes.json e existe com ou sem cliente aberto. Antes ele morava
// em app/dados/workspaces/<id>/conexoes.json e cada cliente tinha o seu, o que
// obrigava a redigitar o mesmo token em cada um.
//
// O que ficou nos clientes sobe na primeira leitura, uma vez so (ver fusao.ts).
//
// Os segredos vivem SO neste arquivo local. Escrita atomica.

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { pastaDadosHub, pastaWorkspacesHub } from "../workspaces/estado.js";
import { lerConexoesDeArquivo, type EstadoConexoes, type EstadoServidor } from "./arquivo.js";
import { NOME_ARQUIVO_CONEXOES, fundirConexoesDosWorkspaces } from "./fusao.js";

export type { EstadoConexoes, EstadoServidor } from "./arquivo.js";
// Reexportada: o teste prova o comportamento de leitura com fixture temporaria.
export { lerConexoesDeArquivo } from "./arquivo.js";

// Pasta do estado do CORE.
//
// VKOS_DADOS_TESTE aponta a raiz de dados pra uma pasta temporaria, pra o teste
// nunca gravar por cima do token real do dono. Mesma regra do CRM e do historico
// de custos. Lida a cada chamada, nunca na carga do modulo.
export function pastaConexoes(): string {
  return process.env.VKOS_DADOS_TESTE?.trim() || pastaDadosHub();
}

// Pasta de onde a fusao le as origens. Sob VKOS_DADOS_TESTE, os "workspaces"
// ficam dentro da raiz de teste, senao a fusao leria os clientes reais.
function pastaOrigens(): string {
  const teste = process.env.VKOS_DADOS_TESTE?.trim();
  return teste ? join(teste, "workspaces") : pastaWorkspacesHub();
}

export function arquivoConexoes(): string {
  return join(pastaConexoes(), NOME_ARQUIVO_CONEXOES);
}

function garantirPasta(): string {
  const pasta = pastaConexoes();
  if (!existsSync(pasta)) mkdirSync(pasta, { recursive: true });
  return pasta;
}

// Le o estado das conexoes do CORE.
//
// Na primeira leitura, quando o arquivo do CORE ainda nao existe, tenta subir o
// que ficou nos clientes. A fusao grava o destino antes de renomear as origens,
// entao uma queda no meio repete sem duplicar.
export function lerConexoes(): EstadoConexoes {
  const caminho = arquivoConexoes();
  if (existsSync(caminho)) return lerConexoesDeArquivo(caminho);

  const pasta = garantirPasta();
  const fundido = fundirConexoesDosWorkspaces(pastaOrigens(), pasta);
  if (fundido) return fundido.estado;
  return { servidores: {} };
}

// Grava o estado das conexoes do CORE, de forma atomica.
export function salvarConexoes(estado: EstadoConexoes): void {
  garantirPasta();
  gravarJsonAtomico(arquivoConexoes(), estado);
}
