import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  garantirPastaDadosWorkspace,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";
import type { LeadEncontrado } from "./apify.js";

export type StatusLead = "minerado" | "arquivado";

export interface LeadMinerado extends LeadEncontrado {
  id: string;
  status: StatusLead;
  capturadoEm: string;
  atualizadoEm: string;
  termoBusca: string;
  localizacao?: string;
}

export interface EstadoLeads {
  versao: 1;
  leads: LeadMinerado[];
}

export interface ResumoPersistenciaBusca {
  encontrados: number;
  novos: number;
  atualizados: number;
}

export class ErroEstadoLeads extends Error {
  statusHttp = 409;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroEstadoLeads";
  }
}

const NOME_ARQUIVO = "leads.json";

function caminhoArquivo(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), NOME_ARQUIVO);
}

function estadoVazio(): EstadoLeads {
  return { versao: 1, leads: [] };
}

function texto(v: unknown): string | undefined {
  return typeof v === "string" ? v.trim() || undefined : undefined;
}

function numero(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function normalizarLead(v: unknown): LeadMinerado | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const item = v as Record<string, unknown>;
  const placeId = texto(item.placeId);
  const nome = texto(item.nome);
  const capturadoEm = texto(item.capturadoEm);
  if (!placeId || !nome || !capturadoEm) return null;
  const atualizadoEm = texto(item.atualizadoEm) ?? capturadoEm;
  return {
    id: texto(item.id) ?? placeId,
    placeId,
    nome,
    status: item.status === "arquivado" ? "arquivado" : "minerado",
    capturadoEm,
    atualizadoEm,
    termoBusca: texto(item.termoBusca) ?? "Busca anterior",
    ...(texto(item.localizacao) ? { localizacao: texto(item.localizacao) } : {}),
    ...(texto(item.endereco) ? { endereco: texto(item.endereco) } : {}),
    ...(texto(item.telefone) ? { telefone: texto(item.telefone) } : {}),
    ...(texto(item.site) ? { site: texto(item.site) } : {}),
    ...(texto(item.email) ? { email: texto(item.email) } : {}),
    ...(texto(item.categoria) ? { categoria: texto(item.categoria) } : {}),
    ...(numero(item.nota) !== undefined ? { nota: numero(item.nota) } : {}),
    ...(numero(item.totalAvaliacoes) !== undefined
      ? { totalAvaliacoes: numero(item.totalAvaliacoes) }
      : {}),
  };
}

export function lerEstadoLeads(workspaceId: string): EstadoLeads {
  const caminho = caminhoArquivo(workspaceId);
  if (!existsSync(caminho)) return estadoVazio();
  try {
    const bruto = JSON.parse(readFileSync(caminho, "utf8")) as Record<string, unknown>;
    if (!Array.isArray(bruto.leads)) throw new Error("formato inválido");
    const leads = bruto.leads.map(normalizarLead);
    if (leads.some((lead) => !lead)) throw new Error("item inválido");
    return {
      versao: 1,
      leads: leads as LeadMinerado[],
    };
  } catch {
    throw new ErroEstadoLeads(
      "A lista de leads está ilegível. O arquivo foi preservado para não perder dados.",
    );
  }
}

export function salvarEstadoLeads(workspaceId: string, estado: EstadoLeads): void {
  garantirPastaDadosWorkspace(workspaceId);
  gravarJsonAtomico(caminhoArquivo(workspaceId), estado);
}

export function persistirBusca(
  workspaceId: string,
  encontrados: LeadEncontrado[],
  termoBusca: string,
  localizacao?: string,
): ResumoPersistenciaBusca {
  const estado = lerEstadoLeads(workspaceId);
  const porPlaceId = new Map(estado.leads.map((lead) => [lead.placeId, lead]));
  const agora = new Date().toISOString();
  let novos = 0;
  let atualizados = 0;

  for (const encontrado of encontrados) {
    const anterior = porPlaceId.get(encontrado.placeId);
    if (anterior) {
      Object.assign(anterior, encontrado, {
        id: anterior.id,
        status: anterior.status,
        capturadoEm: anterior.capturadoEm,
        atualizadoEm: agora,
        termoBusca,
        ...(localizacao ? { localizacao } : {}),
      });
      atualizados++;
      continue;
    }
    const lead: LeadMinerado = {
      ...encontrado,
      id: encontrado.placeId,
      status: "minerado",
      capturadoEm: agora,
      atualizadoEm: agora,
      termoBusca,
      ...(localizacao ? { localizacao } : {}),
    };
    estado.leads.push(lead);
    porPlaceId.set(lead.placeId, lead);
    novos++;
  }

  salvarEstadoLeads(workspaceId, estado);
  return { encontrados: encontrados.length, novos, atualizados };
}

export function alterarStatusLead(
  workspaceId: string,
  id: string,
  status: StatusLead,
): LeadMinerado {
  const estado = lerEstadoLeads(workspaceId);
  const lead = estado.leads.find((item) => item.id === id);
  if (!lead) throw new Error("Lead não encontrado.");
  lead.status = status;
  lead.atualizadoEm = new Date().toISOString();
  salvarEstadoLeads(workspaceId, estado);
  return lead;
}

export function excluirLead(workspaceId: string, id: string): boolean {
  const estado = lerEstadoLeads(workspaceId);
  const quantidade = estado.leads.length;
  estado.leads = estado.leads.filter((lead) => lead.id !== id);
  if (estado.leads.length === quantidade) return false;
  salvarEstadoLeads(workspaceId, estado);
  return true;
}
