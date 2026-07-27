import { lerConexoes } from "../conexoes/estado.js";

const API_APIFY = "https://api.apify.com/v2";
const ATOR_GOOGLE_MAPS = "compass~crawler-google-places";

export const LIMITE_RESULTADOS = 40;
export const TIMEOUT_BUSCA_MS = 180_000;

export interface OpcoesBuscaLeads {
  localizacao?: string;
  limite?: number;
  buscarEmails?: boolean;
}

export interface LeadEncontrado {
  nome: string;
  endereco?: string;
  telefone?: string;
  site?: string;
  email?: string;
  categoria?: string;
  nota?: number;
  totalAvaliacoes?: number;
  placeId: string;
}

export class ErroLeads extends Error {
  statusHttp: number;

  constructor(mensagem: string, statusHttp = 502) {
    super(mensagem);
    this.name = "ErroLeads";
    this.statusHttp = statusHttp;
  }
}

interface ErroApify {
  type?: unknown;
  message?: unknown;
}

function texto(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.trim() || undefined;
}

function numero(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function primeiroEmail(item: Record<string, unknown>): string | undefined {
  const emailDireto = texto(item.email);
  if (emailDireto) return emailDireto;
  if (!Array.isArray(item.emails)) return undefined;
  return item.emails.map(texto).find((email): email is string => Boolean(email));
}

// Normaliza somente itens com identidade mínima. O formato abaixo segue o JSON
// documentado pelo Actor: title, address, phone, website, categoryName,
// totalScore, reviewsCount, placeId e emails quando scrapeContacts esta ativo.
export function normalizarRespostaApify(bruto: unknown): LeadEncontrado[] {
  if (!Array.isArray(bruto)) return [];
  const leads: LeadEncontrado[] = [];

  for (const valor of bruto) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) continue;
    const item = valor as Record<string, unknown>;
    const nome = texto(item.title);
    const placeId = texto(item.placeId);
    if (!nome || !placeId) continue;

    const endereco = texto(item.address);
    const telefone = texto(item.phone) ?? texto(item.phoneUnformatted);
    const site = texto(item.website);
    const email = primeiroEmail(item);
    const categoria = texto(item.categoryName);
    const nota = numero(item.totalScore);
    const totalAvaliacoes = numero(item.reviewsCount);

    leads.push({
      nome,
      ...(endereco ? { endereco } : {}),
      ...(telefone ? { telefone } : {}),
      ...(site ? { site } : {}),
      ...(email ? { email } : {}),
      ...(categoria ? { categoria } : {}),
      ...(nota !== undefined ? { nota } : {}),
      ...(totalAvaliacoes !== undefined ? { totalAvaliacoes } : {}),
      placeId,
    });
  }

  return leads;
}

function tokenApify(workspaceId: string): string {
  const conexao = lerConexoes(workspaceId).servidores.apify;
  const token = conexao?.config.token?.trim() ?? "";
  if (!conexao?.habilitado || !token) {
    throw new ErroLeads(
      "Conecte a Apify em Conexões antes de buscar leads.",
      400,
    );
  }
  return token;
}

async function lerErroApify(resposta: Response): Promise<ErroApify> {
  try {
    const corpo = (await resposta.json()) as { error?: unknown };
    return corpo.error && typeof corpo.error === "object"
      ? corpo.error as ErroApify
      : {};
  } catch {
    return {};
  }
}

function ehErroDeCredito(tipo: string, mensagem: string): boolean {
  return [
    "not-enough-usage-to-run-paid-actor",
    "monthly-usage-limit-too-low",
    "limit-reached",
    "max-total-charge-usd-below-minimum",
  ].includes(tipo) || /credit|usage limit|not enough usage|monthly limit/i.test(mensagem);
}

async function traduzirErroApify(resposta: Response): Promise<ErroLeads> {
  const erro = await lerErroApify(resposta);
  const tipo = texto(erro.type) ?? "";
  const mensagem = texto(erro.message) ?? "";

  if (ehErroDeCredito(tipo, mensagem)) {
    return new ErroLeads("Sua conta Apify está sem crédito.");
  }
  if (resposta.status === 401 || resposta.status === 403) {
    return new ErroLeads(
      "O token da Apify foi recusado. Confira a conexão em Conexões.",
      401,
    );
  }
  if (resposta.status === 408 || tipo === "run-timeout-exceeded") {
    return new ErroLeads(
      "A busca na Apify passou do tempo limite. Tente um termo mais específico.",
    );
  }
  if (resposta.status === 429 || tipo === "rate-limit-exceeded") {
    return new ErroLeads(
      "A Apify recebeu buscas demais agora. Aguarde um instante e tente novamente.",
    );
  }
  if (tipo === "actor-run-failed" || tipo === "run-failed") {
    return new ErroLeads("O robô da Apify não conseguiu concluir esta busca.");
  }
  if (resposta.status === 400) {
    return new ErroLeads("A Apify recusou os parâmetros desta busca.");
  }
  return new ErroLeads(
    `A Apify respondeu com erro ${resposta.status}. Tente novamente em instantes.`,
  );
}

function corpoDaBusca(
  termo: string,
  localizacao: string | undefined,
  limite: number,
  buscarEmails: boolean,
): Record<string, unknown> {
  return {
    searchStringsArray: [termo],
    maxCrawledPlacesPerSearch: limite,
    language: "pt-BR",
    scrapeContacts: buscarEmails,
    maximumLeadsEnrichmentRecords: 0,
    maxReviews: 0,
    ...(localizacao ? { locationQuery: localizacao } : {}),
  };
}

export async function buscarLeads(
  workspaceId: string,
  termo: string,
  opcoes: OpcoesBuscaLeads = {},
  fetchImpl: typeof fetch = fetch,
): Promise<LeadEncontrado[]> {
  const token = tokenApify(workspaceId);
  const consulta = termo.trim();
  if (!consulta) throw new ErroLeads("Informe o que você quer buscar.", 400);

  const limite = Math.min(
    LIMITE_RESULTADOS,
    Math.max(1, Math.trunc(opcoes.limite ?? 20)),
  );
  const localizacao = opcoes.localizacao?.trim() || undefined;
  const buscarEmails = opcoes.buscarEmails !== false;
  const url = `${API_APIFY}/acts/${ATOR_GOOGLE_MAPS}/run-sync-get-dataset-items?clean=true&maxItems=${limite}`;
  let resposta: Response;
  try {
    resposta = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpoDaBusca(
        consulta,
        localizacao,
        limite,
        buscarEmails,
      )),
      signal: AbortSignal.timeout(TIMEOUT_BUSCA_MS),
    });
  } catch (erro) {
    // DOMException não herda de Error no Node: comparar só o nome.
    const nome = (erro as { name?: unknown } | null)?.name;
    if (nome === "TimeoutError" || nome === "AbortError") {
      throw new ErroLeads(
        "Não foi possível concluir a busca na Apify em até 3 minutos. Tente novamente.",
      );
    }
    throw new ErroLeads(
      "Não deu pra falar com a Apify. Confira sua internet e tente de novo.",
    );
  }

  if (!resposta.ok) throw await traduzirErroApify(resposta);

  let itens: unknown;
  try {
    itens = await resposta.json();
  } catch {
    throw new ErroLeads("A Apify devolveu uma resposta que não foi possível ler.");
  }
  return normalizarRespostaApify(itens);
}
