import type { CredencialMeta, DiagnosticoMeta } from "./credencial.js";

export const VERSAO_GRAPH_META = "v25.0";
const BASE_OFICIAL = `https://graph.facebook.com/${VERSAO_GRAPH_META}`;

let baseGraph = BASE_OFICIAL;
let esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

if (process.env.META_GRAPH_TESTE === "1" && process.env.META_GRAPH_BASE_URL?.trim()) {
  baseGraph = process.env.META_GRAPH_BASE_URL.trim().replace(/\/+$/, "");
}

export const METRICAS_META = {
  instagramPerfil: ["reach", "profile_views", "website_clicks"],
  instagramPublicacao: ["reach", "saved", "shares", "views"],
  anuncios: [
    "campaign_id", "campaign_name", "date_start", "spend", "impressions",
    "reach", "clicks", "cpc", "cpm", "actions", "cost_per_action_type",
  ],
  facebookPagina: ["page_impressions_unique"],
  facebookPublicacao: ["post_impressions_unique", "post_engaged_users"],
} as const;

export type CodigoErroMeta =
  | "token_invalido"
  | "permissao"
  | "ativo_inexistente"
  | "limite"
  | "externo";

export class ErroGraphMeta extends Error {
  readonly codigo: CodigoErroMeta;
  readonly status: number;
  constructor(codigo: CodigoErroMeta, mensagem: string, status = 502) {
    super(mensagem);
    this.name = "ErroGraphMeta";
    this.codigo = codigo;
    this.status = status;
  }
}

interface RespostaErro {
  error?: { code?: number; message?: string; error_subcode?: number };
}

export function configurarEndpointsInternosMeta(opcoes?: {
  base?: string;
  esperar?: (ms: number) => Promise<void>;
}): void {
  if (process.env.NODE_ENV !== "test" && process.env.META_GRAPH_TESTE !== "1") {
    throw new Error("Endpoints da Meta so podem mudar em teste.");
  }
  baseGraph = opcoes?.base?.replace(/\/+$/, "") || BASE_OFICIAL;
  esperar = opcoes?.esperar
    ?? ((ms) => new Promise<void>((resolver) => setTimeout(resolver, ms)));
}

export function montarUrlGraph(
  caminho: string,
  parametros: Record<string, string | number | undefined> = {},
  token?: string,
): string {
  const url = new URL(`${baseGraph}/${caminho.replace(/^\/+/, "")}`);
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined) url.searchParams.set(chave, String(valor));
  }
  if (token) url.searchParams.set("access_token", token);
  return url.toString();
}

function classificarErro(codigo: number | undefined, status: number): ErroGraphMeta {
  if (codigo === 190 || status === 401) {
    return new ErroGraphMeta(
      "token_invalido",
      "O token da Meta foi recusado ou revogado.",
      401,
    );
  }
  if (codigo === 10 || codigo === 200 || status === 403) {
    return new ErroGraphMeta(
      "permissao",
      "A Meta recusou uma permissao necessaria para este dado.",
      403,
    );
  }
  if (codigo === 100) {
    return new ErroGraphMeta(
      "ativo_inexistente",
      "O ativo nao existe ou nao esta compartilhado com a Business Manager.",
      404,
    );
  }
  if (codigo === 4 || codigo === 17 || status === 429) {
    return new ErroGraphMeta(
      "limite",
      "A Meta limitou as consultas. A coleta tentara novamente mais tarde.",
      429,
    );
  }
  return new ErroGraphMeta("externo", "A Meta respondeu com uma falha temporaria.", 502);
}

export function interpretarRespostaGraph<T>(status: number, corpo: unknown): T {
  const erro = corpo && typeof corpo === "object"
    ? (corpo as RespostaErro).error
    : undefined;
  if (status < 200 || status >= 300 || erro) {
    throw classificarErro(erro?.code, status);
  }
  return corpo as T;
}

async function consultar<T>(
  caminho: string,
  parametros: Record<string, string | number | undefined>,
  token: string,
  repeticao = false,
): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(montarUrlGraph(caminho, parametros, token), {
      headers: { Accept: "application/json", "User-Agent": "VKOS-Meta" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ErroGraphMeta("externo", "Nao foi possivel falar com a Meta.");
  }
  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = {};
  }
  try {
    return interpretarRespostaGraph<T>(resposta.status, corpo);
  } catch (erro) {
    if (erro instanceof ErroGraphMeta && erro.codigo === "limite" && !repeticao) {
      await esperar(1_500);
      return consultar<T>(caminho, parametros, token, true);
    }
    throw erro;
  }
}

interface ListaGraph<T> {
  data?: T[];
}

export interface AtivoMeta {
  id: string;
  nome: string;
  usuario?: string;
}

async function listarArestas(
  businessId: string,
  arestas: string[],
  token: string,
): Promise<AtivoMeta[]> {
  const unidos = new Map<string, AtivoMeta>();
  for (const aresta of arestas) {
    const resposta = await consultar<ListaGraph<Record<string, unknown>>>(
      `${businessId}/${aresta}`,
      { fields: "id,name,username,account_id", limit: 100 },
      token,
    );
    for (const item of resposta.data ?? []) {
      const idBruto = String(item.id ?? item.account_id ?? "").trim();
      if (!idBruto) continue;
      const id = aresta.includes("ad_accounts") && !idBruto.startsWith("act_")
        ? `act_${idBruto}`
        : idBruto;
      unidos.set(id, {
        id,
        nome: String(item.name ?? item.username ?? id),
        ...(item.username ? { usuario: String(item.username) } : {}),
      });
    }
  }
  return [...unidos.values()];
}

export async function descobrirAtivosMeta(credencial: CredencialMeta): Promise<{
  instagram: AtivoMeta[];
  anuncios: AtivoMeta[];
  paginas: AtivoMeta[];
}> {
  const [instagram, anuncios, paginas] = await Promise.all([
    listarArestas(
      credencial.businessId,
      ["owned_instagram_accounts", "client_instagram_accounts"],
      credencial.tokenSistema,
    ),
    listarArestas(
      credencial.businessId,
      ["owned_ad_accounts", "client_ad_accounts"],
      credencial.tokenSistema,
    ),
    listarArestas(
      credencial.businessId,
      ["owned_pages", "client_pages"],
      credencial.tokenSistema,
    ),
  ]);
  return { instagram, anuncios, paginas };
}

export async function diagnosticarCredencialMeta(
  credencial: CredencialMeta,
): Promise<DiagnosticoMeta[]> {
  const campos: Array<[keyof CredencialMeta, string]> = [
    ["appId", "App ID"],
    ["appSecret", "App Secret"],
    ["businessId", "ID da Business Manager"],
    ["tokenSistema", "Token do usuario de sistema"],
  ];
  const diagnosticos: DiagnosticoMeta[] = campos.map(([chave, item]) => ({
    item,
    ok: Boolean(credencial[chave]),
    mensagem: credencial[chave] ? "Preenchido." : "Ainda nao foi preenchido.",
  }));
  if (diagnosticos.some((item) => !item.ok)) return diagnosticos;

  const identidade = await consultar<{ id?: string; name?: string }>(
    "me",
    { fields: "id,name" },
    credencial.tokenSistema,
  );
  diagnosticos.push({
    item: "Token",
    ok: Boolean(identidade.id),
    mensagem: identidade.name ? `Token reconhecido para ${identidade.name}.` : "Token reconhecido.",
  });

  const permissoes = await consultar<ListaGraph<{ permission?: string; status?: string }>>(
    "me/permissions",
    {},
    credencial.tokenSistema,
  );
  const concedidas = new Set(
    (permissoes.data ?? [])
      .filter((item) => item.status === "granted")
      .map((item) => item.permission),
  );
  for (const permissao of [
    "instagram_basic",
    "instagram_manage_insights",
    "ads_read",
    "pages_read_engagement",
    "read_insights",
    "business_management",
  ]) {
    diagnosticos.push({
      item: permissao,
      ok: concedidas.has(permissao),
      mensagem: concedidas.has(permissao)
        ? "Permissao concedida."
        : "Permissao ausente no token.",
    });
  }
  const empresa = await consultar<{ id?: string; name?: string }>(
    credencial.businessId,
    { fields: "id,name" },
    credencial.tokenSistema,
  );
  diagnosticos.push({
    item: "Business Manager",
    ok: empresa.id === credencial.businessId,
    mensagem: empresa.name ? `Acesso confirmado a ${empresa.name}.` : "Business Manager acessivel.",
  });
  return diagnosticos;
}

function numero(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

function valorMetrica(
  dados: Array<{ name?: string; values?: Array<{ value?: unknown }> }> | undefined,
  nome: string,
): number | null {
  const valor = dados?.find((item) => item.name === nome)?.values?.at(-1)?.value;
  return numero(valor);
}

export async function coletarInstagramGraph(id: string, token: string) {
  const [perfil, metricas, midias] = await Promise.all([
    consultar<Record<string, unknown>>(
      id,
      { fields: "id,name,username,followers_count" },
      token,
    ),
    consultar<ListaGraph<{ name?: string; values?: Array<{ value?: unknown }> }>>(
      `${id}/insights`,
      { metric: METRICAS_META.instagramPerfil.join(","), period: "day" },
      token,
    ),
    consultar<ListaGraph<Record<string, unknown>>>(
      `${id}/media`,
      {
        fields: "id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count",
        limit: 30,
      },
      token,
    ),
  ]);
  const publicacoes = [];
  for (const item of (midias.data ?? []).slice(0, 30)) {
    const insights = await consultar<ListaGraph<{ name?: string; values?: Array<{ value?: unknown }> }>>(
      `${String(item.id)}/insights`,
      { metric: METRICAS_META.instagramPublicacao.join(",") },
      token,
    );
    publicacoes.push({
      ...item,
      alcance: valorMetrica(insights.data, "reach"),
      salvamentos: valorMetrica(insights.data, "saved"),
      compartilhamentos: valorMetrica(insights.data, "shares"),
      visualizacoes: valorMetrica(insights.data, "views"),
    });
  }
  return {
    perfil: {
      seguidores: numero(perfil.followers_count),
      alcance: valorMetrica(metricas.data, "reach"),
      visitasPerfil: valorMetrica(metricas.data, "profile_views"),
      cliquesSite: valorMetrica(metricas.data, "website_clicks"),
    },
    publicacoes,
  };
}

export async function coletarAnunciosGraph(id: string, token: string) {
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - 36);
  const resposta = await consultar<ListaGraph<Record<string, unknown>>>(
    `${id}/insights`,
    {
      level: "campaign",
      fields: METRICAS_META.anuncios.join(","),
      time_increment: 1,
      time_range: JSON.stringify({
        since: inicio.toISOString().slice(0, 10),
        until: fim.toISOString().slice(0, 10),
      }),
      limit: 500,
    },
    token,
  );
  return resposta.data ?? [];
}

export async function coletarFacebookGraph(id: string, token: string) {
  const [pagina, metricas, posts] = await Promise.all([
    consultar<Record<string, unknown>>(id, { fields: "id,name,followers_count" }, token),
    consultar<ListaGraph<{ name?: string; values?: Array<{ value?: unknown }> }>>(
      `${id}/insights`,
      { metric: METRICAS_META.facebookPagina.join(","), period: "day" },
      token,
    ),
    consultar<ListaGraph<Record<string, unknown>>>(
      `${id}/posts`,
      { fields: "id,message,created_time,permalink_url", limit: 15 },
      token,
    ),
  ]);
  const publicacoes = [];
  for (const item of (posts.data ?? []).slice(0, 15)) {
    const insights = await consultar<ListaGraph<{ name?: string; values?: Array<{ value?: unknown }> }>>(
      `${String(item.id)}/insights`,
      { metric: METRICAS_META.facebookPublicacao.join(",") },
      token,
    );
    publicacoes.push({
      ...item,
      alcance: valorMetrica(insights.data, "post_impressions_unique"),
      engajamento: valorMetrica(insights.data, "post_engaged_users"),
    });
  }
  return {
    pagina: {
      seguidores: numero(pagina.followers_count),
      alcance: valorMetrica(metricas.data, "page_impressions_unique"),
    },
    publicacoes,
  };
}
