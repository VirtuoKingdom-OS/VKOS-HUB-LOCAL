// Custos acumulados por workspace, gravados em
// app/dados/workspaces/<id>/custos.json. Soma a cada result, mesmo que a sessao
// seja apagada depois. totalSessoes conta so sessoes novas concluidas, nunca
// continuacoes (resume). O caminho e resolvido POR CHAMADA: o workspace troca em
// runtime, nunca cachear o caminho.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  garantirPastaDadosWorkspace,
  listarIdsWorkspaces,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

export interface CustosAcumulados {
  totalUsd: number;
  totalSessoes: number;
  // tokensEntrada segue sendo o total: entrada nova + cache escrita + cache leitura.
  tokensEntrada: number;
  tokensSaida: number;
  // Split honesto (rodada 6). Arquivo antigo nao tem esses campos: carregam como 0
  // e so crescem daqui pra frente. Nao da pra reconstruir split retroativo do total.
  tokensEntradaNova: number;
  tokensCacheEscrita: number;
  tokensCacheLeitura: number;
}

const ZERADO: CustosAcumulados = {
  totalUsd: 0,
  totalSessoes: 0,
  tokensEntrada: 0,
  tokensSaida: 0,
  tokensEntradaNova: 0,
  tokensCacheEscrita: 0,
  tokensCacheLeitura: 0,
};

// Custos zerados (usado quando nao ha workspace ativo).
export function custosVazios(): CustosAcumulados {
  return { ...ZERADO };
}

// Caminho do custos.json de um workspace.
function arquivoDe(workspaceId: string): string {
  return path.join(pastaDadosWorkspace(workspaceId), "custos.json");
}

// Le o acumulado de um workspace. Arquivo ausente ou corrompido vira tudo zero.
// Campos do split ausentes no arquivo antigo caem em 0 sem quebrar.
export function lerCustos(workspaceId: string): CustosAcumulados {
  try {
    const arquivo = arquivoDe(workspaceId);
    if (!existsSync(arquivo)) {
      return { ...ZERADO };
    }
    const bruto = readFileSync(arquivo, "utf8");
    const dados = JSON.parse(bruto);
    return {
      totalUsd: typeof dados.totalUsd === "number" ? dados.totalUsd : 0,
      totalSessoes: typeof dados.totalSessoes === "number" ? dados.totalSessoes : 0,
      tokensEntrada: typeof dados.tokensEntrada === "number" ? dados.tokensEntrada : 0,
      tokensSaida: typeof dados.tokensSaida === "number" ? dados.tokensSaida : 0,
      tokensEntradaNova: typeof dados.tokensEntradaNova === "number" ? dados.tokensEntradaNova : 0,
      tokensCacheEscrita:
        typeof dados.tokensCacheEscrita === "number" ? dados.tokensCacheEscrita : 0,
      tokensCacheLeitura:
        typeof dados.tokensCacheLeitura === "number" ? dados.tokensCacheLeitura : 0,
    };
  } catch {
    return { ...ZERADO };
  }
}

// Soma o total em dolar de todos os workspaces do registro.
export function totalGeralUsd(): number {
  let total = 0;
  for (const id of listarIdsWorkspaces()) {
    total += lerCustos(id).totalUsd;
  }
  return total;
}

function salvar(workspaceId: string, custos: CustosAcumulados): void {
  try {
    garantirPastaDadosWorkspace(workspaceId);
    gravarJsonAtomico(arquivoDe(workspaceId), custos);
  } catch {
    // Falha ao gravar nao pode derrubar o gerenciador.
  }
}

// Soma um result ao acumulado do workspace DA SESSAO (nao do ativo no momento:
// uma sessao do cliente A pode concluir com o B ativo). contarSessao=true so
// quando for uma sessao nova concluida (nunca continuacao).
export function registrarResult(
  workspaceId: string,
  entrada: {
    custoUsd: number;
    tokensEntrada: number;
    tokensSaida: number;
    tokensEntradaNova: number;
    tokensCacheEscrita: number;
    tokensCacheLeitura: number;
    contarSessao: boolean;
  },
): void {
  if (!workspaceId) return;
  const atual = lerCustos(workspaceId);
  atual.totalUsd += entrada.custoUsd;
  atual.tokensEntrada += entrada.tokensEntrada;
  atual.tokensSaida += entrada.tokensSaida;
  atual.tokensEntradaNova += entrada.tokensEntradaNova;
  atual.tokensCacheEscrita += entrada.tokensCacheEscrita;
  atual.tokensCacheLeitura += entrada.tokensCacheLeitura;
  if (entrada.contarSessao) {
    atual.totalSessoes += 1;
  }
  salvar(workspaceId, atual);
}
