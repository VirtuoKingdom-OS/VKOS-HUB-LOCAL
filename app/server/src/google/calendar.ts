// Cliente fino da Google Calendar REST v3. Sem SDK pesado: fetch direto nos
// endpoints, com o access token vindo do oauth.ts (que cuida do refresh e do
// cache). Usado pelos dois consumidores: o servidor MCP (sessoes de IA) e o
// executor de automacoes. Erros com mensagem honesta em portugues.

import { ErroOAuth, tokenDeAcesso } from "./oauth.js";

// Base da API REST v3 do Google Calendar.
const BASE = "https://www.googleapis.com/calendar/v3";

// Fuso padrao do produto. Todo evento criado carrega o timeZone explicito pra
// nao depender do padrao da agenda.
export const FUSO_PADRAO = "America/Sao_Paulo";

// Erro de dominio do Calendar: carrega o status HTTP que a rota deve responder.
export class ErroCalendar extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroCalendar";
    this.status = status;
  }
}

// Uma agenda (calendario) da conta.
export interface Agenda {
  id: string;
  nome: string;
  principal: boolean;
}

// Um evento, no recorte fino que o hub usa.
export interface Evento {
  id: string;
  titulo: string;
  descricao?: string;
  inicioIso?: string;
  fimIso?: string;
  link?: string;
}

// Dados pra criar ou atualizar um evento.
export interface DadosEvento {
  titulo: string;
  descricao?: string;
  inicioIso: string;
  fimIso: string;
  timeZone?: string;
}

// Chamada autenticada na API do Calendar. Anexa o Bearer, trata 401 como pedido
// de reconexao e traduz os demais erros em ErroCalendar legivel.
async function chamar(
  workspaceId: string,
  caminho: string,
  init: RequestInit = {},
): Promise<unknown> {
  let token: string;
  try {
    token = await tokenDeAcesso(workspaceId);
  } catch (e) {
    if (e instanceof ErroOAuth) {
      throw new ErroCalendar(
        "A conexao com o Google nao esta ativa (expirou ou nunca foi conectada). Conecte na tela Conexoes.",
        401,
      );
    }
    throw e;
  }

  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    ...(init.body ? { "content-type": "application/json" } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, { ...init, headers });
  } catch {
    throw new ErroCalendar(
      "Nao foi possivel falar com o Google Calendar. Confira a conexao de internet.",
      502,
    );
  }

  if (resposta.status === 401) {
    throw new ErroCalendar(
      "A conexao com o Google nao esta ativa (expirou ou nunca foi conectada). Conecte na tela Conexoes.",
      401,
    );
  }
  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhe = mensagemDeErro(dados) || `HTTP ${resposta.status}`;
    throw new ErroCalendar(`O Google Calendar recusou a operacao: ${detalhe}`, resposta.status);
  }
  return dados;
}

// Extrai a mensagem de erro do corpo da API do Google, quando presente.
function mensagemDeErro(dados: unknown): string {
  if (dados && typeof dados === "object" && "error" in dados) {
    const erro = (dados as { error: unknown }).error;
    if (erro && typeof erro === "object" && "message" in erro) {
      const msg = (erro as { message: unknown }).message;
      if (typeof msg === "string") return msg;
    }
    if (typeof erro === "string") return erro;
  }
  return "";
}

// Lista as agendas da conta conectada.
export async function listarAgendas(workspaceId: string): Promise<Agenda[]> {
  const dados = (await chamar(workspaceId, "/users/me/calendarList")) as {
    items?: Array<{ id?: string; summary?: string; primary?: boolean }>;
  };
  return (dados.items ?? []).map((a) => ({
    id: a.id ?? "",
    nome: a.summary ?? a.id ?? "(sem nome)",
    principal: a.primary === true,
  }));
}

// Lista eventos de uma agenda numa janela de tempo. Ordenados por inicio.
export async function listarEventos(
  workspaceId: string,
  agendaId: string,
  deIso: string,
  ateIso: string,
): Promise<Evento[]> {
  const q = new URLSearchParams({
    timeMin: deIso,
    timeMax: ateIso,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const dados = (await chamar(
    workspaceId,
    `/calendars/${encodeURIComponent(agendaId)}/events?${q.toString()}`,
  )) as { items?: unknown[] };
  return (dados.items ?? []).map(mapearEvento);
}

// Cria um evento na agenda. Devolve o evento criado (com id e link).
export async function criarEvento(
  workspaceId: string,
  agendaId: string,
  dados: DadosEvento,
): Promise<Evento> {
  const corpo = corpoEvento(dados);
  const criado = await chamar(
    workspaceId,
    `/calendars/${encodeURIComponent(agendaId)}/events`,
    { method: "POST", body: JSON.stringify(corpo) },
  );
  return mapearEvento(criado);
}

// Atualiza campos de um evento (patch parcial). Devolve o evento atualizado.
export async function atualizarEvento(
  workspaceId: string,
  agendaId: string,
  eventoId: string,
  dados: Partial<DadosEvento>,
): Promise<Evento> {
  const corpo: Record<string, unknown> = {};
  const fuso = dados.timeZone ?? FUSO_PADRAO;
  if (dados.titulo !== undefined) corpo.summary = dados.titulo;
  if (dados.descricao !== undefined) corpo.description = dados.descricao;
  if (dados.inicioIso !== undefined) corpo.start = { dateTime: dados.inicioIso, timeZone: fuso };
  if (dados.fimIso !== undefined) corpo.end = { dateTime: dados.fimIso, timeZone: fuso };
  const atualizado = await chamar(
    workspaceId,
    `/calendars/${encodeURIComponent(agendaId)}/events/${encodeURIComponent(eventoId)}`,
    { method: "PATCH", body: JSON.stringify(corpo) },
  );
  return mapearEvento(atualizado);
}

// Exclui um evento da agenda.
export async function excluirEvento(
  workspaceId: string,
  agendaId: string,
  eventoId: string,
): Promise<void> {
  await chamar(
    workspaceId,
    `/calendars/${encodeURIComponent(agendaId)}/events/${encodeURIComponent(eventoId)}`,
    { method: "DELETE" },
  );
}

// Monta o corpo de um evento pra API, com o timeZone explicito.
function corpoEvento(dados: DadosEvento): Record<string, unknown> {
  const fuso = dados.timeZone ?? FUSO_PADRAO;
  return {
    summary: dados.titulo,
    description: dados.descricao ?? "",
    start: { dateTime: dados.inicioIso, timeZone: fuso },
    end: { dateTime: dados.fimIso, timeZone: fuso },
  };
}

// Traduz um evento da API pro shape fino do hub.
function mapearEvento(bruto: unknown): Evento {
  const e = (bruto ?? {}) as {
    id?: string;
    summary?: string;
    description?: string;
    htmlLink?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  };
  return {
    id: e.id ?? "",
    titulo: e.summary ?? "(sem titulo)",
    descricao: e.description,
    inicioIso: e.start?.dateTime ?? e.start?.date,
    fimIso: e.end?.dateTime ?? e.end?.date,
    link: e.htmlLink,
  };
}
