// Cliente REST do CRM v2. Mantem o tratamento de erro autocontido e o contrato
// do servidor em tipos pequenos, usados pelas tres visoes da tela.

export type TipoInteracao = "nota" | "ligacao" | "mensagem" | "reuniao" | "outro";

export interface Interacao {
  id: string;
  em: string;
  tipo: TipoInteracao;
  texto: string;
}

export interface Tarefa {
  id: string;
  texto: string;
  prazo?: string;
  feita: boolean;
  criadaEm: string;
}

// Retrato do lead de origem (mineracao no Google Maps). So leitura.
export interface DadosLead {
  placeId?: string;
  categoria?: string;
  endereco?: string;
  site?: string;
  nota?: number;
  totalAvaliacoes?: number;
  termoBusca?: string;
  localizacao?: string;
  capturadoEm?: string;
}

export interface Contato {
  id: string;
  nome: string;
  // Estagio do contato no funil: o contato e o cartao do quadro.
  colunaId: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  tags: string[];
  interacoes: Interacao[];
  tarefas: Tarefa[];
  proximoContato?: string;
  lead?: DadosLead;
  criadoEm: string;
  atualizadoEm: string;
}

// Valor/oportunidade preso a um contato, sem estagio proprio.
export interface Negocio {
  id: string;
  titulo: string;
  contatoId: string;
  valorEstimado?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Coluna {
  id: string;
  nome: string;
  ordem: number;
}

export interface EstadoCrm {
  versao: 3;
  colunas: Coluna[];
  contatos: Contato[];
  negocios: Negocio[];
}

export interface DadosContato {
  nome?: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  proximoContato?: string | null;
  tags?: string[];
  colunaId?: string;
}

export interface DadosNegocio {
  titulo?: string;
  contatoId?: string;
  valorEstimado?: number | null;
}

export interface DadosTarefa {
  texto?: string;
  prazo?: string | null;
  feita?: boolean;
}

export class ErroCrm extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroCrm";
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
    throw new ErroCrm("Servidor fora do ar.", 0);
  }
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpoErro = (await resposta.json()) as { erro?: string };
      if (corpoErro.erro) mensagem = corpoErro.erro;
    } catch {
      // Mantem a mensagem HTTP quando o corpo nao e JSON.
    }
    throw new ErroCrm(mensagem, resposta.status);
  }
  return (await resposta.json()) as T;
}

function corpo(metodo: string, dados: unknown): RequestInit {
  return { method: metodo, body: JSON.stringify(dados) };
}

export function obterCrm(): Promise<EstadoCrm> {
  return pedir<EstadoCrm>("/api/crm");
}

export function criarContato(dados: DadosContato): Promise<Contato> {
  return pedir<Contato>("/api/crm/contatos", corpo("POST", dados));
}

export function atualizarContato(id: string, dados: DadosContato): Promise<Contato> {
  return pedir<Contato>(`/api/crm/contatos/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

export function excluirContato(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(`/api/crm/contatos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function moverContato(id: string, colunaId: string, indice?: number): Promise<Contato> {
  return pedir<Contato>(
    `/api/crm/contatos/${encodeURIComponent(id)}/mover`,
    corpo("PATCH", { colunaId, ...(indice === undefined ? {} : { indice }) }),
  );
}

export function registrarInteracao(
  id: string,
  tipo: TipoInteracao,
  texto: string,
): Promise<Interacao> {
  return pedir<Interacao>(
    `/api/crm/contatos/${encodeURIComponent(id)}/interacoes`,
    corpo("POST", { tipo, texto }),
  );
}

export function criarTarefa(id: string, texto: string, prazo?: string): Promise<Tarefa> {
  return pedir<Tarefa>(
    `/api/crm/contatos/${encodeURIComponent(id)}/tarefas`,
    corpo("POST", { texto, ...(prazo ? { prazo } : {}) }),
  );
}

export function atualizarTarefa(id: string, dados: DadosTarefa): Promise<Tarefa> {
  return pedir<Tarefa>(`/api/crm/tarefas/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

export function excluirTarefa(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(`/api/crm/tarefas/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function criarNegocio(dados: {
  titulo: string;
  contatoId: string;
  valorEstimado?: number;
}): Promise<Negocio> {
  return pedir<Negocio>("/api/crm/negocios", corpo("POST", dados));
}

export function atualizarNegocio(id: string, dados: DadosNegocio): Promise<Negocio> {
  return pedir<Negocio>(`/api/crm/negocios/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

export function excluirNegocio(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(`/api/crm/negocios/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function criarColuna(nome: string): Promise<Coluna> {
  return pedir<Coluna>("/api/crm/colunas", corpo("POST", { nome }));
}

export function renomearColuna(id: string, nome: string): Promise<Coluna> {
  return pedir<Coluna>(`/api/crm/colunas/${encodeURIComponent(id)}`, corpo("PATCH", { nome }));
}

export function excluirColuna(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(`/api/crm/colunas/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function reordenarColunas(ordem: string[]): Promise<{ colunas: Coluna[] }> {
  return pedir<{ colunas: Coluna[] }>("/api/crm/colunas/reordenar", corpo("PATCH", { ordem }));
}
