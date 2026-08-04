// Custos acumulados por workspace, gravados em
// app/dados/workspaces/<id>/custos.json. Soma a cada result, mesmo que a sessao
// seja apagada depois. totalSessoes conta so sessoes novas concluidas, nunca
// continuacoes (resume). O caminho e resolvido POR CHAMADA: o workspace troca em
// runtime, nunca cachear o caminho.
//
// Tres regras que o numero segue, e que valem mais do que o numero em si:
//
// 1. Custo que nao da pra saber NUNCA vira zero calado. Vira turno contado em
//    turnosSemCusto, e o total passa a ser um piso declarado. Zero silencioso e
//    a pior mentira possivel: some do total e ninguem percebe.
// 2. Dinheiro gasto nao deixa de ter sido gasto porque a pasta sumiu. Remover um
//    cliente move o acumulado dele pro historico do CORE
//    (app/dados/custos-historico.json), e o total geral continua contando.
// 3. Cada turno vira uma linha em custos.jsonl, append-only. Sem o detalhe, um
//    pulo estranho no total e impossivel de investigar.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ProvedorIA } from "../tipos.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { anexarJsonl, lerJsonl } from "../util/jsonl.js";
import { quarentenarComErro } from "../util/quarentena.js";
import {
  garantirPastaDadosWorkspace,
  listarIdsWorkspaces,
  pastaDadosHub,
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
  // Identifica o provedor do ultimo resultado acumulado. Arquivo antigo e Claude.
  provedor: ProvedorIA;
  // Fica verdadeiro quando o total contem ao menos um custo estimado.
  estimado: boolean;
  // Totais especificos do Codex. Mantem o uso de cache auditavel sem mudar os
  // campos legados consumidos pelo painel.
  tokensCodexEntrada: number;
  tokensCodexCache: number;
  tokensCodexSaida: number;
  // Turnos que consumiram credito mas cujo valor em dolar o Hub NAO conseguiu
  // saber: modelo sem preco na tabela, retomada de Codex sem linha de base, ou
  // processo morto antes do result. Nao entram no totalUsd. Enquanto for maior
  // que zero, o total e um piso, nao o valor exato, e a tela diz isso.
  turnosSemCusto: number;
}

const ZERADO: CustosAcumulados = {
  totalUsd: 0,
  totalSessoes: 0,
  tokensEntrada: 0,
  tokensSaida: 0,
  tokensEntradaNova: 0,
  tokensCacheEscrita: 0,
  tokensCacheLeitura: 0,
  provedor: "claude",
  estimado: false,
  tokensCodexEntrada: 0,
  tokensCodexCache: 0,
  tokensCodexSaida: 0,
  turnosSemCusto: 0,
};

// O historico do CORE guarda o acumulado dos clientes JA REMOVIDOS do registro.
export interface HistoricoRemovidos extends CustosAcumulados {
  // Quantos clientes ja foram removidos com o gasto absorvido aqui.
  workspacesRemovidos: number;
  // Quantos foram removidos sem dar pra ler o custos.json deles (corrompido).
  // O gasto daqueles clientes se perdeu, entao o total geral e um piso.
  workspacesSemHistorico: number;
}

const HISTORICO_ZERADO: HistoricoRemovidos = {
  ...ZERADO,
  workspacesRemovidos: 0,
  workspacesSemHistorico: 0,
};

// Uma linha de custos.jsonl: um turno, do jeito que ele entrou no acumulado.
export interface LancamentoCusto {
  em: string;
  sessaoId: string;
  provedor: ProvedorIA;
  modelo: string;
  // Retomada (--resume) em vez de sessao nova.
  ehResume: boolean;
  // Turno que terminou com erro do provedor. Nao soma custo (M10).
  ehErro: boolean;
  // false quando o valor em dolar nao pode ser determinado. custoUsd fica 0 e o
  // turno conta em turnosSemCusto.
  custoConhecido: boolean;
  custoUsd: number;
  tokensEntradaNova: number;
  tokensCacheEscrita: number;
  tokensCacheLeitura: number;
  tokensSaida: number;
  // Preenchido quando custoConhecido e false: diz por que nao deu pra saber.
  motivoSemCusto?: string;
}

// Custos zerados (usado quando nao ha workspace ativo).
export function custosVazios(): CustosAcumulados {
  return { ...ZERADO };
}

// Caminho do custos.json de um workspace. Exportado pro teste conseguir
// corromper o arquivo sem duplicar a regra de onde ele mora.
export function arquivoDe(workspaceId: string): string {
  return workspaceId
    ? path.join(pastaDadosWorkspace(workspaceId), "custos.json")
    : path.join(pastaDadosHub(), "custos.json");
}

// Caminho do custos.jsonl (lancamento por turno) de um workspace.
export function arquivoLancamentos(workspaceId: string): string {
  return workspaceId
    ? path.join(pastaDadosWorkspace(workspaceId), "custos.jsonl")
    : path.join(pastaDadosHub(), "custos.jsonl");
}

// Caminho do historico dos clientes removidos, no escopo CORE.
//
// VKOS_DADOS_TESTE segue a mesma regra do CRM: aponta a raiz de dados pra uma
// pasta temporaria, pra o teste nunca gravar por cima do historico de gasto
// real. Lida a cada chamada, nunca na carga do modulo.
export function arquivoHistoricoRemovidos(): string {
  const raiz = process.env.VKOS_DADOS_TESTE?.trim() || pastaDadosHub();
  return path.join(raiz, "custos-historico.json");
}

function num(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

// Le os campos do acumulado de um objeto ja validado como objeto.
// Campo a campo tolerante: campo ausente ou de tipo errado cai em 0. Isso e
// retrocompatibilidade (arquivo antigo nao tinha o split nem turnosSemCusto),
// nao corrupcao.
function camposAcumulados(dados: Record<string, unknown>): CustosAcumulados {
  return {
    totalUsd: num(dados.totalUsd),
    totalSessoes: num(dados.totalSessoes),
    tokensEntrada: num(dados.tokensEntrada),
    tokensSaida: num(dados.tokensSaida),
    tokensEntradaNova: num(dados.tokensEntradaNova),
    tokensCacheEscrita: num(dados.tokensCacheEscrita),
    tokensCacheLeitura: num(dados.tokensCacheLeitura),
    provedor: dados.provedor === "codex" ? "codex" : "claude",
    estimado: dados.estimado === true,
    tokensCodexEntrada: num(dados.tokensCodexEntrada),
    tokensCodexCache: num(dados.tokensCodexCache),
    tokensCodexSaida: num(dados.tokensCodexSaida),
    turnosSemCusto: num(dados.turnosSemCusto),
  };
}

// Le um objeto de custo de um caminho. Arquivo ausente devolve null, em silencio
// (workspace que ainda nao rodou sessao). Arquivo que EXISTE mas nao parseia, ou
// que parseia sem ser objeto, vai pra quarentena e lanca.
//
// Falha fechado de proposito. O gasto acumulado nao se reconstitui: as sessoes
// que geraram esse total ja foram embora. Comecar zerado faria o proximo result
// gravar um total de poucos centavos por cima do historico inteiro.
function lerObjetoDeCusto(
  caminho: string,
  oQue: string,
): Record<string, unknown> | null {
  if (!existsSync(caminho)) return null;
  let parseado: unknown;
  try {
    parseado = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    throw quarentenarComErro(caminho, oQue);
  }
  if (!parseado || typeof parseado !== "object" || Array.isArray(parseado)) {
    throw quarentenarComErro(caminho, oQue);
  }
  return parseado as Record<string, unknown>;
}

// Le o acumulado de um caminho. Exportada pra provar o comportamento com
// fixture temporaria.
export function lerCustosDeArquivo(caminho: string): CustosAcumulados {
  const dados = lerObjetoDeCusto(caminho, "O historico de gasto");
  if (!dados) return { ...ZERADO };
  return camposAcumulados(dados);
}

// Le o acumulado de um workspace.
export function lerCustos(workspaceId: string): CustosAcumulados {
  return lerCustosDeArquivo(arquivoDe(workspaceId));
}

// Le o historico dos clientes removidos. Exportada com caminho pra ter teste.
export function lerHistoricoDeArquivo(caminho: string): HistoricoRemovidos {
  const dados = lerObjetoDeCusto(caminho, "O historico de gasto dos workspaces removidos");
  if (!dados) return { ...HISTORICO_ZERADO };
  return {
    ...camposAcumulados(dados),
    workspacesRemovidos: num(dados.workspacesRemovidos),
    workspacesSemHistorico: num(dados.workspacesSemHistorico),
  };
}

export function lerHistoricoRemovidos(): HistoricoRemovidos {
  return lerHistoricoDeArquivo(arquivoHistoricoRemovidos());
}

// Soma dois acumulados campo a campo. O provedor fica com o do segundo, que e o
// mais recente; estimado e OU logico.
function somarAcumulados(
  base: CustosAcumulados,
  outro: CustosAcumulados,
): CustosAcumulados {
  return {
    totalUsd: base.totalUsd + outro.totalUsd,
    totalSessoes: base.totalSessoes + outro.totalSessoes,
    tokensEntrada: base.tokensEntrada + outro.tokensEntrada,
    tokensSaida: base.tokensSaida + outro.tokensSaida,
    tokensEntradaNova: base.tokensEntradaNova + outro.tokensEntradaNova,
    tokensCacheEscrita: base.tokensCacheEscrita + outro.tokensCacheEscrita,
    tokensCacheLeitura: base.tokensCacheLeitura + outro.tokensCacheLeitura,
    provedor: outro.provedor,
    estimado: base.estimado || outro.estimado,
    tokensCodexEntrada: base.tokensCodexEntrada + outro.tokensCodexEntrada,
    tokensCodexCache: base.tokensCodexCache + outro.tokensCodexCache,
    tokensCodexSaida: base.tokensCodexSaida + outro.tokensCodexSaida,
    turnosSemCusto: base.turnosSemCusto + outro.turnosSemCusto,
  };
}

// Total geral: os clientes do registro MAIS o historico dos ja removidos.
// Dinheiro gasto nao deixa de ter sido gasto porque a pasta sumiu.
export function totalGeral(): {
  totalUsd: number;
  estimado: boolean;
  // true quando o total geral e um piso: algum turno sem custo conhecido, ou
  // algum cliente removido cujo historico nao deu pra ler.
  piso: boolean;
} {
  const historico = lerHistoricoRemovidos();
  const custosCore = lerCustos("");
  let totalUsd = historico.totalUsd + custosCore.totalUsd;
  let estimado = historico.estimado;
  let turnosSemCusto = historico.turnosSemCusto + custosCore.turnosSemCusto;
  estimado = estimado || custosCore.estimado;
  for (const id of listarIdsWorkspaces()) {
    const custos = lerCustos(id);
    totalUsd += custos.totalUsd;
    estimado = estimado || custos.estimado;
    turnosSemCusto += custos.turnosSemCusto;
  }
  return {
    totalUsd,
    estimado,
    piso: turnosSemCusto > 0 || historico.workspacesSemHistorico > 0,
  };
}

// Compatibilidade com quem so quer o numero.
export function totalGeralUsd(): number {
  return totalGeral().totalUsd;
}

export function totalGeralEstimado(): boolean {
  return totalGeral().estimado;
}

function salvar(workspaceId: string, custos: CustosAcumulados): void {
  try {
    if (workspaceId) garantirPastaDadosWorkspace(workspaceId);
    gravarJsonAtomico(arquivoDe(workspaceId), custos);
  } catch {
    // Falha ao gravar nao pode derrubar o gerenciador.
  }
}

// Move o acumulado de um workspace pro historico do CORE, ANTES de a pasta de
// dados dele ser apagada. Idempotencia e do chamador: a rota so remove um id que
// ainda esta no registro, e ele sai do registro na mesma requisicao.
//
// custos.json ilegivel nao impede remover o cliente: o gasto daquele cliente se
// perde, mas isso fica registrado em workspacesSemHistorico e o total geral
// passa a se declarar um piso, em vez de fingir que o cliente nao gastou nada.
export function absorverCustosDeWorkspace(workspaceId: string): void {
  const caminho = arquivoHistoricoRemovidos();
  let historico: HistoricoRemovidos;
  try {
    historico = lerHistoricoRemovidos();
  } catch (erro) {
    // O proprio historico esta corrompido: ja foi pra quarentena por lerHistorico.
    // Nao grava nada por cima e deixa a remocao seguir.
    console.warn(
      `Nao deu pra abrir o historico de gasto dos workspaces removidos: ${(erro as Error).message}`,
    );
    return;
  }

  let doCliente: CustosAcumulados | null = null;
  try {
    doCliente = lerCustos(workspaceId);
  } catch (erro) {
    console.warn(
      `Nao deu pra preservar o gasto do workspace ${workspaceId}: ${(erro as Error).message}`,
    );
  }

  const atualizado: HistoricoRemovidos = doCliente
    ? {
        ...somarAcumulados(historico, doCliente),
        workspacesRemovidos: historico.workspacesRemovidos + 1,
        workspacesSemHistorico: historico.workspacesSemHistorico,
      }
    : {
        ...historico,
        workspacesRemovidos: historico.workspacesRemovidos + 1,
        workspacesSemHistorico: historico.workspacesSemHistorico + 1,
      };

  try {
    gravarJsonAtomico(caminho, atualizado);
  } catch (erro) {
    console.warn(
      `Nao deu pra gravar o historico de gasto dos workspaces removidos: ${(erro as Error).message}`,
    );
  }
}

function ehLancamento(valor: unknown): boolean {
  if (!valor || typeof valor !== "object") return false;
  const l = valor as Record<string, unknown>;
  return typeof l.em === "string" && typeof l.custoUsd === "number";
}

// Le os lancamentos por turno de um workspace, na ordem em que entraram.
// Linha invalida e pulada, nunca derruba o resto (contrato do util/jsonl).
export function lerLancamentos(workspaceId: string): LancamentoCusto[] {
  return lerJsonl<LancamentoCusto>(arquivoLancamentos(workspaceId), ehLancamento).itens;
}

// Anexa a linha do turno. Roda dentro do stream da sessao, entao falha de
// escrita vira aviso: perder a linha de auditoria e ruim, derrubar a sessao do
// usuario e pior.
function anexarLancamento(workspaceId: string, lancamento: LancamentoCusto): void {
  try {
    if (workspaceId) garantirPastaDadosWorkspace(workspaceId);
    anexarJsonl(arquivoLancamentos(workspaceId), [lancamento]);
  } catch (erro) {
    console.warn(
      `Nao deu pra registrar o lancamento de custo do workspace ${workspaceId}: ${(erro as Error).message}`,
    );
  }
}

export interface EntradaResult {
  custoUsd: number;
  // false quando o valor em dolar nao pode ser determinado. Ver turnosSemCusto.
  custoConhecido: boolean;
  // Preenchido quando custoConhecido e false.
  motivoSemCusto?: string;
  tokensEntrada: number;
  tokensSaida: number;
  tokensEntradaNova: number;
  tokensCacheEscrita: number;
  tokensCacheLeitura: number;
  contarSessao: boolean;
  provedor: ProvedorIA;
  estimado: boolean;
  // So pro lancamento por turno, nao entra no acumulado.
  sessaoId: string;
  modelo: string;
  ehResume: boolean;
  ehErro: boolean;
}

// Soma um result ao acumulado do workspace DA SESSAO (nao do ativo no momento:
// uma sessao do cliente A pode concluir com o B ativo). contarSessao=true so
// quando for uma sessao nova concluida (nunca continuacao).
export function registrarResult(workspaceId: string, entrada: EntradaResult): void {
  let atual: CustosAcumulados;
  try {
    atual = lerCustos(workspaceId);
  } catch (erro) {
    // Rodamos dentro do stream da sessao: lancar aqui derrubaria o gerenciador.
    // Some com a soma deste result e pronto. Nao gravar e o certo: o arquivo ou
    // ja esta na quarentena, ou continua inteiro no lugar. Quem grita e o painel
    // de custos, que le pelo lerCustos e devolve 409.
    console.warn(
      `Nao deu pra somar o custo no workspace ${workspaceId}: ${(erro as Error).message}`,
    );
    return;
  }
  atual.totalUsd += entrada.custoConhecido ? entrada.custoUsd : 0;
  if (!entrada.custoConhecido) {
    atual.turnosSemCusto += 1;
  }
  atual.tokensEntrada += entrada.tokensEntrada;
  atual.tokensSaida += entrada.tokensSaida;
  atual.tokensEntradaNova += entrada.tokensEntradaNova;
  atual.tokensCacheEscrita += entrada.tokensCacheEscrita;
  atual.tokensCacheLeitura += entrada.tokensCacheLeitura;
  atual.provedor = entrada.provedor;
  atual.estimado ||= entrada.estimado;
  if (entrada.provedor === "codex") {
    atual.tokensCodexEntrada += entrada.tokensEntrada;
    atual.tokensCodexCache += entrada.tokensCacheLeitura;
    atual.tokensCodexSaida += entrada.tokensSaida;
  }
  if (entrada.contarSessao) {
    atual.totalSessoes += 1;
  }
  salvar(workspaceId, atual);

  anexarLancamento(workspaceId, {
    em: new Date().toISOString(),
    sessaoId: entrada.sessaoId,
    provedor: entrada.provedor,
    modelo: entrada.modelo,
    ehResume: entrada.ehResume,
    ehErro: entrada.ehErro,
    custoConhecido: entrada.custoConhecido,
    custoUsd: entrada.custoConhecido ? entrada.custoUsd : 0,
    tokensEntradaNova: entrada.tokensEntradaNova,
    tokensCacheEscrita: entrada.tokensCacheEscrita,
    tokensCacheLeitura: entrada.tokensCacheLeitura,
    tokensSaida: entrada.tokensSaida,
    ...(entrada.custoConhecido ? {} : { motivoSemCusto: entrada.motivoSemCusto ?? "" }),
  });
}

// Turno que consumiu credito e o Hub nunca soube quanto: o processo morreu antes
// de mandar o result (queda, timeout, parada manual no meio). Nao ha dolar nem
// token pra somar, mas fingir que nao houve gasto e mentira. Conta em
// turnosSemCusto e deixa a linha no custos.jsonl.
export function registrarTurnoSemMedicao(
  workspaceId: string,
  entrada: { sessaoId: string; provedor: ProvedorIA; modelo: string; ehResume: boolean; motivo: string },
): void {
  let atual: CustosAcumulados;
  try {
    atual = lerCustos(workspaceId);
  } catch (erro) {
    console.warn(
      `Nao deu pra registrar o turno sem medicao no workspace ${workspaceId}: ${(erro as Error).message}`,
    );
    return;
  }
  atual.turnosSemCusto += 1;
  salvar(workspaceId, atual);

  anexarLancamento(workspaceId, {
    em: new Date().toISOString(),
    sessaoId: entrada.sessaoId,
    provedor: entrada.provedor,
    modelo: entrada.modelo,
    ehResume: entrada.ehResume,
    ehErro: true,
    custoConhecido: false,
    custoUsd: 0,
    tokensEntradaNova: 0,
    tokensCacheEscrita: 0,
    tokensCacheLeitura: 0,
    tokensSaida: 0,
    motivoSemCusto: entrada.motivo,
  });
}
