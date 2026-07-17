// Servidor MCP stdio proprio do Google Calendar. Roda como processo filho do
// claude CLI dentro de uma sessao de IA, exposto pelo --mcp-config. Le as
// credenciais SO por variavel de ambiente (VK_GCAL_CLIENT_ID,
// VK_GCAL_CLIENT_SECRET, VK_GCAL_REFRESH_TOKEN): este processo NAO le o
// conexoes.json. Quem monta o env e o montarServidor do googlecalendar no
// catalogo, com o refresh token da conexao do workspace.
//
// Faz o proprio refresh do access token com as envs e fala direto com a REST v3
// do Google Calendar. Nunca vaza stack pro Claude: erro vira texto legivel, e o
// 401 (token revogado ou expirado) vira pedido de reconexao.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Fuso padrao do produto. Todo evento criado leva o timeZone explicito pra
// nao depender do padrao da agenda.
const FUSO_PADRAO = "America/Sao_Paulo";
// Base da API REST v3 do Google Calendar.
const BASE = "https://www.googleapis.com/calendar/v3";
// Endpoint de token do Google (troca do refresh por access token).
const ENDPOINT_TOKEN = "https://oauth2.googleapis.com/token";
// Margem do cache: renova 60s antes de expirar.
const MARGEM_MS = 60 * 1000;
// Agenda padrao quando o Claude nao informa qual.
const AGENDA_PADRAO = "primary";

// Erro com mensagem pronta pro Claude. status 401 = pedir reconexao.
class ErroCal extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroCal";
    this.status = status;
  }
}

// Mensagem unica de reconexao, reusada onde o token nao serve mais.
const MSG_RECONECTAR =
  "A conexao com o Google Calendar expirou ou foi revogada. Reconecte na tela Conexoes do VKOS Hub.";

// Le as credenciais do ambiente. Faltando qualquer uma, pede pra conectar.
function credenciais(): { clientId: string; clientSecret: string; refreshToken: string } {
  const clientId = (process.env.VK_GCAL_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.VK_GCAL_CLIENT_SECRET ?? "").trim();
  const refreshToken = (process.env.VK_GCAL_REFRESH_TOKEN ?? "").trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new ErroCal(
      "A conexao com o Google Calendar nao esta configurada. Conecte na tela Conexoes do VKOS Hub.",
      401,
    );
  }
  return { clientId, clientSecret, refreshToken };
}

// Cache do access token em memoria: o processo vive o tempo da sessao.
let cache: { token: string; expiraEm: number } | null = null;

// Devolve um access token valido, trocando o refresh token quando o cache vence.
async function accessToken(): Promise<string> {
  if (cache && cache.expiraEm - MARGEM_MS > Date.now()) return cache.token;
  const { clientId, clientSecret, refreshToken } = credenciais();
  const corpo = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  let resposta: Response;
  try {
    resposta = await fetch(ENDPOINT_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: corpo.toString(),
    });
  } catch {
    throw new ErroCal(
      "Nao foi possivel falar com o Google. Confira a conexao de internet.",
      502,
    );
  }
  const dados = (await resposta.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!resposta.ok || !dados.access_token) {
    // Refresh recusado: token revogado ou expirado. Pede reconexao.
    throw new ErroCal(MSG_RECONECTAR, 401);
  }
  cache = {
    token: dados.access_token,
    expiraEm: Date.now() + (dados.expires_in ?? 3600) * 1000,
  };
  return cache.token;
}

// Chamada autenticada na REST v3. Anexa o Bearer e traduz erro em ErroCal.
async function chamar(caminho: string, init: RequestInit = {}): Promise<unknown> {
  const token = await accessToken();
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    ...(init.body ? { "content-type": "application/json" } : {}),
  };
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, { ...init, headers });
  } catch {
    throw new ErroCal(
      "Nao foi possivel falar com o Google Calendar. Confira a conexao de internet.",
      502,
    );
  }
  if (resposta.status === 401) {
    cache = null;
    throw new ErroCal(MSG_RECONECTAR, 401);
  }
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhe = mensagemDeErro(dados) || `HTTP ${resposta.status}`;
    throw new ErroCal(`O Google Calendar recusou a operacao: ${detalhe}`, resposta.status);
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

// Recorte fino de um evento pro texto de resposta.
interface EventoFino {
  id: string;
  titulo: string;
  descricao?: string;
  inicioIso?: string;
  fimIso?: string;
  link?: string;
}

// Traduz um evento da API pro recorte fino.
function mapearEvento(bruto: unknown): EventoFino {
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

// Monta o corpo de criacao ou edicao de evento, com o timeZone explicito.
function corpoEvento(dados: {
  titulo?: string;
  descricao?: string;
  inicioIso?: string;
  fimIso?: string;
}): Record<string, unknown> {
  const corpo: Record<string, unknown> = {};
  if (dados.titulo !== undefined) corpo.summary = dados.titulo;
  if (dados.descricao !== undefined) corpo.description = dados.descricao;
  if (dados.inicioIso !== undefined)
    corpo.start = { dateTime: dados.inicioIso, timeZone: FUSO_PADRAO };
  if (dados.fimIso !== undefined) corpo.end = { dateTime: dados.fimIso, timeZone: FUSO_PADRAO };
  return corpo;
}

// Operacoes de calendario por cima do chamar.
async function listarAgendas(): Promise<EventoAgenda[]> {
  const dados = (await chamar("/users/me/calendarList")) as {
    items?: Array<{ id?: string; summary?: string; primary?: boolean }>;
  };
  return (dados.items ?? []).map((a) => ({
    id: a.id ?? "",
    nome: a.summary ?? a.id ?? "(sem nome)",
    principal: a.primary === true,
  }));
}

interface EventoAgenda {
  id: string;
  nome: string;
  principal: boolean;
}

async function listarEventos(
  agendaId: string,
  deIso: string,
  ateIso: string,
): Promise<EventoFino[]> {
  const q = new URLSearchParams({
    timeMin: deIso,
    timeMax: ateIso,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const dados = (await chamar(
    `/calendars/${encodeURIComponent(agendaId)}/events?${q.toString()}`,
  )) as { items?: unknown[] };
  return (dados.items ?? []).map(mapearEvento);
}

async function criarEvento(
  agendaId: string,
  dados: { titulo: string; descricao?: string; inicioIso: string; fimIso: string },
): Promise<EventoFino> {
  const criado = await chamar(`/calendars/${encodeURIComponent(agendaId)}/events`, {
    method: "POST",
    body: JSON.stringify(corpoEvento(dados)),
  });
  return mapearEvento(criado);
}

async function atualizarEvento(
  agendaId: string,
  eventoId: string,
  dados: { titulo?: string; descricao?: string; inicioIso?: string; fimIso?: string },
): Promise<EventoFino> {
  const atualizado = await chamar(
    `/calendars/${encodeURIComponent(agendaId)}/events/${encodeURIComponent(eventoId)}`,
    { method: "PATCH", body: JSON.stringify(corpoEvento(dados)) },
  );
  return mapearEvento(atualizado);
}

async function excluirEvento(agendaId: string, eventoId: string): Promise<void> {
  await chamar(
    `/calendars/${encodeURIComponent(agendaId)}/events/${encodeURIComponent(eventoId)}`,
    { method: "DELETE" },
  );
}

// Resultado de sucesso: texto (JSON legivel) pro Claude.
function ok(texto: string) {
  return { content: [{ type: "text" as const, text: texto }] };
}

// Resultado de erro: mensagem legivel, marcada como isError pro Claude reagir.
function falha(mensagem: string) {
  return { content: [{ type: "text" as const, text: mensagem }], isError: true };
}

// Executa a operacao e embrulha o resultado, traduzindo ErroCal em texto limpo.
async function executar(fn: () => Promise<string>) {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof ErroCal) return falha(e.message);
    return falha("Nao foi possivel completar a operacao no Google Calendar.");
  }
}

// Monta e registra o servidor MCP com as cinco ferramentas de agenda.
function montarServidor(): McpServer {
  const servidor = new McpServer({ name: "vkos-google-calendar", version: "1.0.0" });

  servidor.registerTool(
    "listar_agendas",
    {
      title: "Listar agendas",
      description:
        "Lista as agendas (calendarios) da conta Google conectada, com id, nome e qual e a principal. Use o id da agenda nas outras ferramentas.",
      inputSchema: {},
    },
    async () =>
      executar(async () => JSON.stringify(await listarAgendas(), null, 2)),
  );

  servidor.registerTool(
    "listar_eventos",
    {
      title: "Listar eventos",
      description:
        "Lista os eventos de uma agenda numa janela de tempo. Datas em ISO 8601 (ex: 2026-07-20T09:00:00-03:00). Sem agendaId, usa a agenda principal.",
      inputSchema: {
        agendaId: z
          .string()
          .optional()
          .describe('Id da agenda. Padrao "primary" (a agenda principal da conta).'),
        deIso: z.string().describe("Inicio da janela, em ISO 8601."),
        ateIso: z.string().describe("Fim da janela, em ISO 8601."),
      },
    },
    async ({ agendaId, deIso, ateIso }) =>
      executar(async () =>
        JSON.stringify(
          await listarEventos(agendaId?.trim() || AGENDA_PADRAO, deIso, ateIso),
          null,
          2,
        ),
      ),
  );

  servidor.registerTool(
    "criar_evento",
    {
      title: "Criar evento",
      description:
        "Cria um evento na agenda. Datas em ISO 8601 com fuso (ex: 2026-07-20T14:00:00-03:00). Sem agendaId, cria na agenda principal.",
      inputSchema: {
        agendaId: z
          .string()
          .optional()
          .describe('Id da agenda. Padrao "primary".'),
        titulo: z.string().describe("Titulo do evento."),
        descricao: z.string().optional().describe("Descricao do evento (opcional)."),
        inicioIso: z.string().describe("Inicio do evento, em ISO 8601."),
        fimIso: z.string().describe("Fim do evento, em ISO 8601."),
      },
    },
    async ({ agendaId, titulo, descricao, inicioIso, fimIso }) =>
      executar(async () =>
        JSON.stringify(
          await criarEvento(agendaId?.trim() || AGENDA_PADRAO, {
            titulo,
            descricao,
            inicioIso,
            fimIso,
          }),
          null,
          2,
        ),
      ),
  );

  servidor.registerTool(
    "atualizar_evento",
    {
      title: "Atualizar evento",
      description:
        "Atualiza campos de um evento existente (so os campos informados mudam). Precisa do eventoId. Datas em ISO 8601. Sem agendaId, usa a agenda principal.",
      inputSchema: {
        agendaId: z
          .string()
          .optional()
          .describe('Id da agenda. Padrao "primary".'),
        eventoId: z.string().describe("Id do evento a atualizar."),
        titulo: z.string().optional().describe("Novo titulo (opcional)."),
        descricao: z.string().optional().describe("Nova descricao (opcional)."),
        inicioIso: z.string().optional().describe("Novo inicio, em ISO 8601 (opcional)."),
        fimIso: z.string().optional().describe("Novo fim, em ISO 8601 (opcional)."),
      },
    },
    async ({ agendaId, eventoId, titulo, descricao, inicioIso, fimIso }) =>
      executar(async () =>
        JSON.stringify(
          await atualizarEvento(agendaId?.trim() || AGENDA_PADRAO, eventoId, {
            titulo,
            descricao,
            inicioIso,
            fimIso,
          }),
          null,
          2,
        ),
      ),
  );

  servidor.registerTool(
    "excluir_evento",
    {
      title: "Excluir evento",
      description:
        "Exclui um evento da agenda pelo eventoId. Sem agendaId, usa a agenda principal. Acao sem volta.",
      inputSchema: {
        agendaId: z
          .string()
          .optional()
          .describe('Id da agenda. Padrao "primary".'),
        eventoId: z.string().describe("Id do evento a excluir."),
      },
    },
    async ({ agendaId, eventoId }) =>
      executar(async () => {
        await excluirEvento(agendaId?.trim() || AGENDA_PADRAO, eventoId);
        return `Evento ${eventoId} excluido.`;
      }),
  );

  return servidor;
}

// Sobe o servidor no transporte stdio. Erro fatal vai pro stderr, nunca pro
// stdout (o stdout e o canal JSON-RPC do MCP).
async function principal(): Promise<void> {
  const servidor = montarServidor();
  const transporte = new StdioServerTransport();
  await servidor.connect(transporte);
}

principal().catch((e) => {
  process.stderr.write(`[mcp-calendar] falha ao iniciar: ${String(e)}\n`);
  process.exit(1);
});
