// Leitura dos leads do formulario do site, direto no Supabase por REST.
//
// Nao existe cache local aqui, ao contrario do leads/ da Apify. A diferenca e o
// custo: cada busca na Apify se paga por execucao, entao guardar o resultado e
// obrigatorio. Ler o Supabase e de graca e a tabela e a fonte da verdade do que
// chegou, entao cache so criaria uma segunda versao pra divergir.
//
// A chave service_role passa por cima do RLS: ela le, edita e apaga tudo. Por
// isso ela nunca sai deste processo. O frontend fala com /api/formulario e
// nunca com o Supabase.

import { lerConexoes } from "../conexoes/estado.js";

export class ErroFormulario extends Error {
  statusHttp: number;

  constructor(mensagem: string, statusHttp = 502) {
    super(mensagem);
    this.name = "ErroFormulario";
    this.statusHttp = statusHttp;
  }
}

export type Temperatura = "quente" | "morno" | "frio";

// Uma linha da tabela public.leads, ja em camelCase. O ip_hash da tabela nao
// entra: e md5 de rate limit, nao serve pra exibir nem pra decidir nada.
export interface LeadFormulario {
  id: string;
  criadoEm: string;
  negocio: string;
  faturamento: string;
  papelMarketing: string;
  dores: string[];
  gatilho?: string;
  tentativas?: string;
  decisao: string;
  investimento: string;
  nome: string;
  whatsapp: string;
  horario?: string;
  // Coluna gerada no banco. E so leitura: o Postgres recusa o update.
  temperatura: Temperatura;
  status: string;
  nota?: string;
  origem?: string;
  utm?: Record<string, string>;
  referrer?: string;
}

// Teto de uma leitura. O formulario de um negocio so junta dezenas ou centenas
// de linhas, entao paginar no servidor seria complexidade sem dor. Quando o teto
// e atingido a rota devolve temMais e a tela avisa, porque corte silencioso se
// parece com "acabou".
export const TETO_LEITURA = 500;

const TIMEOUT_MS = 20_000;

const TEMPERATURAS = new Set<Temperatura>(["quente", "morno", "frio"]);

interface Credenciais {
  url: string;
  chave: string;
}

// Molde do tokenApify: exige a conexao LIGADA e preenchida, e o texto do erro
// carrega a palavra "Conexões" porque e por ela que a tela decide mostrar o
// atalho pra la.
function credenciais(): Credenciais {
  const conexao = lerConexoes().servidores.supabase;
  const url = conexao?.config.url?.trim().replace(/\/+$/, "") ?? "";
  const chave = conexao?.config.chaveServico?.trim() ?? "";
  if (!conexao?.habilitado || !url || !chave) {
    throw new ErroFormulario(
      "Conecte o formulário do site em Conexões antes de ver os leads.",
      400,
    );
  }
  return { url, chave };
}

function cabecalhos(chave: string): Record<string, string> {
  return {
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "VKOS-Hub",
  };
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function textoOpcional(valor: unknown): string | undefined {
  const limpo = texto(valor);
  return limpo || undefined;
}

// Normaliza uma linha crua. Tolerante de proposito: coluna nula, ausente ou com
// tipo trocado nao derruba a lista inteira, porque o dado vem de um formulario
// publico que pode mudar do outro lado sem avisar este codigo.
export function normalizarLinha(bruto: unknown): LeadFormulario | null {
  if (!bruto || typeof bruto !== "object") return null;
  const linha = bruto as Record<string, unknown>;
  const id = texto(linha.id);
  if (!id) return null;

  const temperaturaBruta = texto(linha.temperatura) as Temperatura;
  const dores = Array.isArray(linha.dores)
    ? linha.dores.map(texto).filter(Boolean)
    : [];
  const utm =
    linha.utm && typeof linha.utm === "object" && !Array.isArray(linha.utm)
      ? (linha.utm as Record<string, string>)
      : undefined;

  return {
    id,
    criadoEm: texto(linha.criado_em) || new Date(0).toISOString(),
    negocio: texto(linha.negocio),
    faturamento: texto(linha.faturamento),
    papelMarketing: texto(linha.papel_marketing),
    dores,
    ...(textoOpcional(linha.gatilho) ? { gatilho: texto(linha.gatilho) } : {}),
    ...(textoOpcional(linha.tentativas) ? { tentativas: texto(linha.tentativas) } : {}),
    decisao: texto(linha.decisao),
    investimento: texto(linha.investimento),
    nome: texto(linha.nome) || "Sem nome",
    whatsapp: texto(linha.whatsapp),
    ...(textoOpcional(linha.horario) ? { horario: texto(linha.horario) } : {}),
    temperatura: TEMPERATURAS.has(temperaturaBruta) ? temperaturaBruta : "morno",
    status: texto(linha.status) || "novo",
    ...(textoOpcional(linha.nota) ? { nota: texto(linha.nota) } : {}),
    ...(textoOpcional(linha.origem) ? { origem: texto(linha.origem) } : {}),
    ...(utm && Object.keys(utm).length > 0 ? { utm } : {}),
    ...(textoOpcional(linha.referrer) ? { referrer: texto(linha.referrer) } : {}),
  };
}

function traduzirResposta(status: number): ErroFormulario {
  if (status === 401 || status === 403) {
    return new ErroFormulario(
      "O Supabase recusou a chave. Confira em Conexões se você colou a service_role.",
      401,
    );
  }
  if (status === 404) {
    return new ErroFormulario(
      "O projeto do Supabase respondeu, mas não tem a tabela leads.",
      400,
    );
  }
  return new ErroFormulario(
    `O Supabase respondeu com erro ${status}. Tente de novo em instantes.`,
  );
}

export interface LeituraLeads {
  leads: LeadFormulario[];
  // Existe mais coisa alem do teto desta leitura.
  temMais: boolean;
}

export async function listarLeads(
  fetchImpl: typeof fetch = fetch,
): Promise<LeituraLeads> {
  const { url, chave } = credenciais();
  // Pede um a mais que o teto: se ele voltar, ha mais lead do que coube.
  const alvo =
    `${url}/rest/v1/leads` +
    `?select=*&order=criado_em.desc&limit=${TETO_LEITURA + 1}`;

  let resposta: Response;
  try {
    resposta = await fetchImpl(alvo, {
      headers: cabecalhos(chave),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ErroFormulario(
      "Não foi possível falar com o Supabase. Confira sua internet e a URL do projeto.",
    );
  }

  if (!resposta.ok) throw traduzirResposta(resposta.status);

  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    throw new ErroFormulario("O Supabase devolveu uma resposta ilegível.");
  }
  if (!Array.isArray(corpo)) {
    throw new ErroFormulario("O Supabase devolveu uma resposta em formato inesperado.");
  }

  const todos = corpo
    .map(normalizarLinha)
    .filter((lead): lead is LeadFormulario => lead !== null);

  return {
    leads: todos.slice(0, TETO_LEITURA),
    temMais: todos.length > TETO_LEITURA,
  };
}

// Marca no Supabase que o lead ja entrou no funil do Hub.
//
// Isso e cortesia, nao controle: quem sabe se um lead ja virou contato e o
// crm.json local, pela chaveExterna. Esta escrita existe so pra quem abrir o
// Supabase direto nao ver tudo como "novo" pra sempre. Por isso a rota trata a
// falha dela como aviso, e nunca desfaz uma importacao que ja deu certo.
export async function marcarComoContatado(
  ids: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (ids.length === 0) return;
  const { url, chave } = credenciais();
  const lista = ids.map((id) => `"${id}"`).join(",");
  const alvo = `${url}/rest/v1/leads?id=in.(${lista})&status=eq.novo`;

  const resposta = await fetchImpl(alvo, {
    method: "PATCH",
    headers: { ...cabecalhos(chave), Prefer: "return=minimal" },
    body: JSON.stringify({ status: "contatado" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!resposta.ok) throw traduzirResposta(resposta.status);
}
