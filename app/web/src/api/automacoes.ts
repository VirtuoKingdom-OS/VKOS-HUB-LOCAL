// Cliente REST das automacoes. Fetch proprio, erros no formato { erro }, igual
// ao padrao de api/conexoes.ts e api/crm.ts. Passa pelo proxy do Vite (/api).

// Gatilho de uma regra: o evento de dominio e um filtro opcional (ex: a coluna
// de destino no evento "cartao movido").
export interface GatilhoRegra {
  evento: string;
  filtro?: Record<string, string>;
}

// Acao de uma regra. Nesta fase so existe criar evento no Google Calendar.
export interface AcaoRegra {
  tipo: "calendar:criar-evento";
  parametros: {
    titulo: string;
    descricao: string;
    duracaoMin: string;
    agenda: string;
  };
}

// Uma regra de automacao, no shape do contrato (peca 6 da arquitetura).
export interface Regra {
  id: string;
  nome: string;
  ativa: boolean;
  gatilho: GatilhoRegra;
  acao: AcaoRegra;
  criadaEm: string;
}

// Campos que dao pra mandar ao criar ou editar uma regra (sem id nem criadaEm).
export interface DadosRegra {
  nome: string;
  ativa: boolean;
  gatilho: GatilhoRegra;
  acao: AcaoRegra;
}

// Resposta do GET /automacoes: as regras do workspace e se o Google esta ligado.
export interface RespostaAutomacoes {
  regras: Regra[];
  conectadoGoogle: boolean;
}

// Resultado do ensaio: o que SERIA criado, sem chamar o Google. Com aviso quando
// a regra nao gera evento (ex: cartao sem proximo contato).
export interface ResultadoEnsaio {
  titulo: string;
  descricao: string;
  // Ausentes quando vem um aviso (ex: cartao sem proximo contato, sem evento).
  inicioIso?: string;
  fimIso?: string;
  aviso?: string;
}

// Uma linha do historico de execucoes.
export interface LinhaHistorico {
  em: string;
  regraId: string;
  regraNome: string;
  evento: string;
  status: "sucesso" | "pendente" | "erro";
  detalhe: string;
}

// Erro de resposta das automacoes: carrega a mensagem { erro } do backend.
// status 0 sinaliza servidor fora do ar.
export class ErroAutomacoes extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroAutomacoes";
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
    throw new ErroAutomacoes("Servidor fora do ar.", 0);
  }
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo?.erro) mensagem = corpo.erro;
    } catch {
      // corpo sem json, mantem a mensagem padrao
    }
    throw new ErroAutomacoes(mensagem, resposta.status);
  }
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}

// Regras do workspace ativo mais o estado da conexao Google.
export function obterAutomacoes(): Promise<RespostaAutomacoes> {
  return pedir<RespostaAutomacoes>("/api/automacoes");
}

// Cria uma regra. Devolve a criada (com id e criadaEm).
export function criarRegra(dados: DadosRegra): Promise<Regra> {
  return pedir<Regra>("/api/automacoes", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

// Atualiza campos de uma regra (ex: ligar ou desligar). Devolve a atualizada.
export function atualizarRegra(
  id: string,
  dados: Partial<DadosRegra>
): Promise<Regra> {
  return pedir<Regra>(`/api/automacoes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

// Exclui uma regra.
export function excluirRegra(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(`/api/automacoes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Ensaia uma regra ja salva: devolve o que seria feito, sem efeito real. Sem
// evento no corpo, o backend usa o ultimo evento compativel do log de eventos.
export function ensaiarRegra(
  id: string,
  evento?: Record<string, unknown>
): Promise<ResultadoEnsaio> {
  return pedir<ResultadoEnsaio>(
    `/api/automacoes/${encodeURIComponent(id)}/ensaiar`,
    {
      method: "POST",
      body: JSON.stringify(evento ? { evento } : {}),
    }
  );
}

// Ultimas execucoes registradas. O backend devolve { execucoes: [...] }; por
// tolerancia tambem aceita um array cru, caso a forma mude.
export async function obterHistorico(limite = 50): Promise<LinhaHistorico[]> {
  const resp = await pedir<LinhaHistorico[] | { execucoes: LinhaHistorico[] }>(
    `/api/automacoes/historico?limite=${limite}`
  );
  if (Array.isArray(resp)) return resp;
  return resp?.execucoes ?? [];
}
