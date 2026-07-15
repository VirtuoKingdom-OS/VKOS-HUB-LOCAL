// Cliente REST do calendario. Fetch proprio, erros no formato { erro }, igual
// ao padrao de api/automacoes.ts. Passa pelo proxy do Vite (/api). O backend
// fino de calendario ja existe: aqui so a camada do front.

// Um evento da agenda. Eventos de dia inteiro vem com inicioIso/fimIso sem
// hora (ex: "2026-07-20"), o backend repassa o date cru do Google nesse caso.
export interface Evento {
  id: string;
  titulo: string;
  descricao?: string;
  inicioIso?: string;
  fimIso?: string;
  link?: string;
}

// Estado da conexao do calendario no workspace ativo. A agenda e local-first:
// funciona sem Google. sincronizarCrm liga a sincronizacao CRM -> agenda.
// sincronizarGoogle liga a sincronizacao com o Google Calendar (so quando
// conectado). conectado diz se ha uma conta Google autorizada disponivel.
export interface EstadoCalendario {
  conectado: boolean;
  contaEmail: string;
  sincronizarCrm: boolean;
  sincronizarGoogle: boolean;
}

// Resultado de ligar ou desligar a sincronizacao com o CRM. Ao ligar, o
// backend roda a sincronizacao inicial e devolve o resumo; ao desligar, so
// { ligado: false }.
export interface ResultadoSincronizacao {
  ligado: boolean;
  criados?: number;
  atualizados?: number;
  erros?: number;
}

// Resultado de ligar ou desligar a sincronizacao com o Google Calendar. Ao
// ligar, o backend envia a agenda local pro Google e devolve quantos foram
// enviados (e quantos falharam); ao desligar, so { ligado: false }.
export interface ResultadoSincronizacaoGoogle {
  ligado: boolean;
  enviados?: number;
  erros?: number;
}

// Campos que dao pra mandar ao criar ou editar um evento.
export interface DadosEvento {
  titulo: string;
  inicioIso: string;
  fimIso: string;
  descricao?: string;
}

// Erro de resposta do calendario: carrega a mensagem { erro } do backend.
// status 0 sinaliza servidor fora do ar. status 409 costuma ser conexao
// nao ativa (sem workspace ou sem Google conectado).
export class ErroCalendario extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroCalendario";
    this.status = status;
  }
}

async function pedir<T>(url: string, opcoes?: RequestInit): Promise<T> {
  let resposta: Response;
  const cabecalhos = opcoes?.body
    ? { "Content-Type": "application/json", ...(opcoes.headers ?? {}) }
    : opcoes?.headers;
  try {
    resposta = await fetch(url, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new ErroCalendario("Servidor fora do ar.", 0);
  }
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo?.erro) mensagem = corpo.erro;
    } catch {
      // corpo sem json, mantem a mensagem padrao
    }
    throw new ErroCalendario(mensagem, resposta.status);
  }
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}

// Estado da conexao. 409 quando nao ha workspace ativo.
export function obterCalendario(): Promise<EstadoCalendario> {
  return pedir<EstadoCalendario>("/api/calendario");
}

// Eventos num intervalo. de e ate sao ISO. Funciona sem Google (agenda local)
// e com (agenda do Google), mesmo shape de Evento.
export async function obterEventos(
  deIso: string,
  ateIso: string
): Promise<Evento[]> {
  const busca = new URLSearchParams({ de: deIso, ate: ateIso });
  const resp = await pedir<{ eventos: Evento[] }>(
    `/api/calendario/eventos?${busca.toString()}`
  );
  return resp?.eventos ?? [];
}

// Cria um evento. Devolve o criado.
export async function criarEvento(dados: DadosEvento): Promise<Evento> {
  const resp = await pedir<{ evento: Evento }>("/api/calendario/eventos", {
    method: "POST",
    body: JSON.stringify(dados),
  });
  return resp.evento;
}

// Atualiza campos de um evento. Devolve o atualizado.
export async function atualizarEvento(
  id: string,
  dados: Partial<DadosEvento>
): Promise<Evento> {
  const resp = await pedir<{ evento: Evento }>(
    `/api/calendario/eventos/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(dados),
    }
  );
  return resp.evento;
}

// Exclui um evento.
export function excluirEvento(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(
    `/api/calendario/eventos/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

// Liga ou desliga a sincronizacao CRM -> agenda. Ligar roda a sincronizacao
// inicial dos cartoes com proximo contato e devolve o resumo (criados,
// atualizados, erros). Nao exige Google: funciona na agenda local.
export function sincronizarCrm(
  ligado: boolean
): Promise<ResultadoSincronizacao> {
  return pedir<ResultadoSincronizacao>("/api/calendario/sincronizar-crm", {
    method: "POST",
    body: JSON.stringify({ ligado }),
  });
}

// Liga ou desliga a sincronizacao com o Google Calendar. Ligar exige o Google
// conectado (409 se nao estiver) e envia a agenda local pro Google, devolvendo
// { ligado: true, enviados, erros }. Desligar devolve { ligado: false } e nao
// apaga nada da agenda local.
export function sincronizarGoogle(
  ligado: boolean
): Promise<ResultadoSincronizacaoGoogle> {
  return pedir<ResultadoSincronizacaoGoogle>(
    "/api/calendario/sincronizar-google",
    {
      method: "POST",
      body: JSON.stringify({ ligado }),
    }
  );
}
