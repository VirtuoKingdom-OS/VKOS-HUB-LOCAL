import { CABECALHO_ABA, ID_DESTA_ABA } from "./aba";
import type { Contato } from "./crm";

export type StatusLead = "minerado" | "arquivado";

export interface LeadMinerado {
  id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  site?: string;
  email?: string;
  categoria?: string;
  nota?: number;
  totalAvaliacoes?: number;
  placeId: string;
  status: StatusLead;
  capturadoEm: string;
  atualizadoEm: string;
  termoBusca: string;
  localizacao?: string;
  jaExisteNoCrm: boolean;
}

export interface ListasLeads {
  minerados: LeadMinerado[];
  arquivados: LeadMinerado[];
}

export interface FiltrosBuscaLeads {
  termo: string;
  localizacao?: string;
  limite: number;
  buscarEmails: boolean;
}

export interface ResultadoBuscaLeads extends ListasLeads {
  resumo: {
    encontrados: number;
    novos: number;
    atualizados: number;
  };
}

export interface ResultadoImportacaoLeads {
  importados: number;
  duplicados: number;
  contatos: Contato[];
  listas: ListasLeads;
}

export class ErroApiLeads extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApiLeads";
    this.status = status;
  }
}

async function lerResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo.erro) mensagem = corpo.erro;
    } catch {
      // Mantém a mensagem HTTP quando a resposta não é JSON.
    }
    throw new ErroApiLeads(mensagem, resposta.status);
  }
  return (await resposta.json()) as T;
}

async function pedir<T>(
  url: string,
  opcoes: RequestInit = {},
  timeoutMs?: number,
): Promise<T> {
  const controlador = timeoutMs ? new AbortController() : null;
  const temporizador = controlador
    ? window.setTimeout(() => controlador.abort(), timeoutMs)
    : null;
  try {
    const resposta = await fetch(url, {
      ...opcoes,
      headers: {
        ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
        // Importar lead grava no CRM. A aba se identifica pelo mesmo cabecalho
        // das gravacoes do CRM pra nao recarregar por causa do proprio import.
        ...(opcoes.method && opcoes.method !== "GET"
          ? { [CABECALHO_ABA]: ID_DESTA_ABA }
          : {}),
        ...opcoes.headers,
      },
      ...(controlador ? { signal: controlador.signal } : {}),
    });
    return await lerResposta<T>(resposta);
  } catch (erro) {
    if (erro instanceof ErroApiLeads) throw erro;
    if (controlador?.signal.aborted) {
      throw new ErroApiLeads(
        "A busca passou de 3 minutos. Tente novamente com menos resultados.",
        408,
      );
    }
    throw new ErroApiLeads("Servidor fora do ar.", 0);
  } finally {
    if (temporizador !== null) window.clearTimeout(temporizador);
  }
}

export function obterLeads(): Promise<ListasLeads> {
  return pedir<ListasLeads>("/api/leads");
}

export function buscarLeads(filtros: FiltrosBuscaLeads): Promise<ResultadoBuscaLeads> {
  // Um pouco acima do timeout do server (180s), pra mensagem de erro real
  // chegar em vez de o client abortar primeiro.
  return pedir<ResultadoBuscaLeads>("/api/leads/buscar", {
    method: "POST",
    body: JSON.stringify(filtros),
  }, 190_000);
}

export function importarLeads(ids: string[]): Promise<ResultadoImportacaoLeads> {
  return pedir<ResultadoImportacaoLeads>("/api/leads/importar", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function alterarStatusLead(id: string, status: StatusLead): Promise<ListasLeads> {
  return pedir<ListasLeads>(`/api/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function excluirLead(id: string): Promise<ListasLeads> {
  return pedir<ListasLeads>(`/api/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
