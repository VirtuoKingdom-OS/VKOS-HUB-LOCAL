// Estado das regras de automacao, escopado por workspace. Regras vivem em
// app/dados/workspaces/<id>/automacoes.json. Cada execucao do executor vira
// uma linha em automacoes-historico.jsonl, com a mesma rotacao preguicosa do
// barramento de eventos.
//
// Modulo folha do dominio de automacoes: so depende de fs/path, do gravador
// atomico e dos resolvedores de workspace. Nunca importa o executor nem as
// rotas, pra ninguem criar ciclo.

import { join } from "node:path";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

import { gravarJsonAtomico, gravarTextoAtomico } from "../util/gravarJson.js";
import { garantirPastaDadosWorkspace, pastaDadosWorkspace } from "../workspaces/estado.js";

// Erro de dominio das automacoes: carrega o status HTTP que a rota deve responder.
export class ErroAutomacao extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroAutomacao";
    this.status = status;
  }
}

// O gatilho de uma regra: o tipo de evento do barramento e um filtro raso
// opcional (igualdade campo a campo contra evento.dados, ex: { colunaPara: "k-1" }).
export interface Gatilho {
  evento: string;
  filtro?: Record<string, string>;
}

// Parametros da acao de criar evento no Calendar. titulo e descricao sao
// templates com {{variavel}}. duracaoMin guardado como string (formulario),
// vazio ou ausente vira 60 na hora de executar.
export interface ParametrosCriarEvento {
  titulo: string;
  descricao?: string;
  duracaoMin?: string;
  agenda?: string;
}

export interface AcaoCriarEventoCalendar {
  tipo: "calendar:criar-evento";
  parametros: ParametrosCriarEvento;
}

// Uma regra "quando <gatilho> entao <acao>".
export interface Regra {
  id: string;
  nome: string;
  ativa: boolean;
  gatilho: Gatilho;
  acao: AcaoCriarEventoCalendar;
  criadaEm: string;
}

export interface EstadoAutomacoes {
  regras: Regra[];
}

export type StatusExecucao = "sucesso" | "pendente" | "erro";

// Uma linha do historico: o que uma regra fez (ou tentou fazer) quando um
// evento chegou. detalhe carrega o link do evento criado, o motivo da
// pendencia ou a mensagem honesta do erro.
export interface ExecucaoHistorico {
  em: string;
  regraId: string;
  regraNome: string;
  evento: string;
  status: StatusExecucao;
  detalhe: string;
}

const NOME_ARQUIVO = "automacoes.json";
const NOME_HISTORICO = "automacoes-historico.jsonl";

// Rotacao do historico: mesmo padrao preguicoso do barramento de eventos.
const TETO_LINHAS = 2000;
const MANTER_LINHAS = 1000;
const CHECAR_A_CADA = 50;

function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function caminhoArquivo(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), NOME_ARQUIVO);
}

function caminhoHistorico(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), NOME_HISTORICO);
}

// Sanea um filtro vindo do disco ou do corpo: so aceita string em cada valor,
// devolve undefined se ficar vazio.
function saneiaFiltro(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object") return undefined;
  const saida: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string") saida[k] = val;
  }
  return Object.keys(saida).length ? saida : undefined;
}

function saneiaGatilho(v: unknown): Gatilho | null {
  if (!v || typeof v !== "object") return null;
  const g = v as Record<string, unknown>;
  if (typeof g.evento !== "string" || !g.evento.trim()) return null;
  const gatilho: Gatilho = { evento: g.evento.trim() };
  const filtro = saneiaFiltro(g.filtro);
  if (filtro) gatilho.filtro = filtro;
  return gatilho;
}

function saneiaAcao(v: unknown): AcaoCriarEventoCalendar | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (a.tipo !== "calendar:criar-evento") return null;
  const p = (a.parametros ?? {}) as Record<string, unknown>;
  if (typeof p.titulo !== "string" || !p.titulo.trim()) return null;
  const parametros: ParametrosCriarEvento = { titulo: p.titulo.trim().slice(0, 200) };
  if (typeof p.descricao === "string") parametros.descricao = p.descricao.slice(0, 2000);
  if (typeof p.duracaoMin === "string" && p.duracaoMin.trim()) {
    parametros.duracaoMin = p.duracaoMin.trim();
  } else if (typeof p.duracaoMin === "number" && Number.isFinite(p.duracaoMin)) {
    parametros.duracaoMin = String(p.duracaoMin);
  }
  if (typeof p.agenda === "string" && p.agenda.trim()) parametros.agenda = p.agenda.trim();
  return { tipo: "calendar:criar-evento", parametros };
}

function saneiaRegra(v: unknown): Regra | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.nome !== "string") return null;
  const gatilho = saneiaGatilho(r.gatilho);
  const acao = saneiaAcao(r.acao);
  if (!gatilho || !acao) return null;
  return {
    id: r.id,
    nome: r.nome,
    ativa: r.ativa === true,
    gatilho,
    acao,
    criadaEm: typeof r.criadaEm === "string" ? r.criadaEm : new Date().toISOString(),
  };
}

// Le e sanea o automacoes.json do workspace. Arquivo ausente ou ilegivel vira
// estado vazio, sem quebrar.
function lerArquivo(workspaceId: string): EstadoAutomacoes {
  const caminho = caminhoArquivo(workspaceId);
  if (!existsSync(caminho)) return { regras: [] };
  try {
    const dados = JSON.parse(readFileSync(caminho, "utf8"));
    const regras = Array.isArray(dados?.regras)
      ? dados.regras.map(saneiaRegra).filter((r: Regra | null): r is Regra => r !== null)
      : [];
    return { regras };
  } catch {
    return { regras: [] };
  }
}

function salvar(workspaceId: string, estado: EstadoAutomacoes): void {
  garantirPastaDadosWorkspace(workspaceId);
  gravarJsonAtomico(caminhoArquivo(workspaceId), estado);
}

function textoObrigatorio(v: unknown, rotulo: string, limite = 200): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new ErroAutomacao(`${rotulo} e obrigatorio.`, 400);
  }
  return v.trim().slice(0, limite);
}

function acharRegra(estado: EstadoAutomacoes, id: string): Regra {
  const regra = estado.regras.find((r) => r.id === id);
  if (!regra) throw new ErroAutomacao("Regra nao encontrada.", 404);
  return regra;
}

// === Regras ===

export function listarRegras(workspaceId: string): Regra[] {
  return lerArquivo(workspaceId).regras;
}

export function obterRegra(workspaceId: string, id: string): Regra {
  return acharRegra(lerArquivo(workspaceId), id);
}

// Cria uma regra nova. ativa por padrao, a menos que o corpo diga false.
export function criarRegra(workspaceId: string, corpo: Record<string, unknown>): Regra {
  const nome = textoObrigatorio(corpo.nome, "Nome");
  const gatilho = saneiaGatilho(corpo.gatilho);
  if (!gatilho) throw new ErroAutomacao("Gatilho invalido: informe o evento.", 400);
  const acao = saneiaAcao(corpo.acao);
  if (!acao) throw new ErroAutomacao("Acao invalida: informe o titulo do evento.", 400);

  const estado = lerArquivo(workspaceId);
  const regra: Regra = {
    id: gerarId("a"),
    nome,
    ativa: corpo.ativa === undefined ? true : corpo.ativa === true,
    gatilho,
    acao,
    criadaEm: new Date().toISOString(),
  };
  estado.regras.push(regra);
  salvar(workspaceId, estado);
  return regra;
}

// Atualiza campos de uma regra. So mexe no que veio no corpo.
export function atualizarRegra(
  workspaceId: string,
  id: string,
  corpo: Record<string, unknown>,
): Regra {
  const estado = lerArquivo(workspaceId);
  const regra = acharRegra(estado, id);

  if ("nome" in corpo) regra.nome = textoObrigatorio(corpo.nome, "Nome");
  if ("ativa" in corpo) regra.ativa = corpo.ativa === true;
  if ("gatilho" in corpo) {
    const gatilho = saneiaGatilho(corpo.gatilho);
    if (!gatilho) throw new ErroAutomacao("Gatilho invalido: informe o evento.", 400);
    regra.gatilho = gatilho;
  }
  if ("acao" in corpo) {
    const acao = saneiaAcao(corpo.acao);
    if (!acao) throw new ErroAutomacao("Acao invalida: informe o titulo do evento.", 400);
    regra.acao = acao;
  }

  salvar(workspaceId, estado);
  return regra;
}

export function removerRegra(workspaceId: string, id: string): void {
  const estado = lerArquivo(workspaceId);
  acharRegra(estado, id);
  estado.regras = estado.regras.filter((r) => r.id !== id);
  salvar(workspaceId, estado);
}

// === Historico ===

// Contador de gravacoes por workspace, pra rotacionar so de vez em quando.
const gravacoesPorWorkspace = new Map<string, number>();

// Registra uma execucao no historico do workspace. Falha de escrita nunca
// derruba o executor: log honesto no console e segue.
export function registrarExecucao(workspaceId: string, execucao: ExecucaoHistorico): void {
  try {
    const pasta = garantirPastaDadosWorkspace(workspaceId);
    const caminho = join(pasta, NOME_HISTORICO);
    appendFileSync(caminho, JSON.stringify(execucao) + "\n", "utf8");
    talvezRotacionar(workspaceId, caminho);
  } catch (erro) {
    console.error(`[automacoes] falha ao gravar historico do workspace ${workspaceId}:`, erro);
  }
}

function talvezRotacionar(workspaceId: string, caminho: string): void {
  const n = (gravacoesPorWorkspace.get(workspaceId) ?? 0) + 1;
  gravacoesPorWorkspace.set(workspaceId, n);
  if (n % CHECAR_A_CADA !== 0) return;
  try {
    const bruto = readFileSync(caminho, "utf8");
    const linhas = bruto.split("\n").filter((l) => l.length > 0);
    if (linhas.length <= TETO_LINHAS) return;
    const mantidas = linhas.slice(linhas.length - MANTER_LINHAS);
    gravarTextoAtomico(caminho, mantidas.join("\n") + "\n");
  } catch (erro) {
    console.error(`[automacoes] falha ao rotacionar historico do workspace ${workspaceId}:`, erro);
  }
}

// Le as ultimas execucoes do historico, da mais nova pra mais antiga.
export function lerHistorico(workspaceId: string, limite = 50): ExecucaoHistorico[] {
  try {
    const caminho = caminhoHistorico(workspaceId);
    if (!existsSync(caminho)) return [];
    const linhas = readFileSync(caminho, "utf8").split("\n").filter((l) => l.length > 0);
    const recentes = linhas.slice(Math.max(0, linhas.length - limite)).reverse();
    const saida: ExecucaoHistorico[] = [];
    for (const l of recentes) {
      try {
        const e = JSON.parse(l);
        if (e && typeof e.em === "string") saida.push(e);
      } catch {
        // linha corrompida: ignora.
      }
    }
    return saida;
  } catch {
    return [];
  }
}
