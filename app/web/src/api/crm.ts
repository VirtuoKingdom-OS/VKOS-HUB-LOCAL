// Cliente REST do CRM. Fetch proprio, no padrao de erro { erro } do backend.
// Nao passa pelo cliente.ts pra manter o modulo do CRM autocontido.

// Uma nota de contato: hora e texto. A mais nova vem no topo do array.
export interface Nota {
  em: string;
  texto: string;
}

// Um contato do funil.
export interface Contato {
  id: string;
  nome: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  valorEstimado?: number;
  // Data e hora do proximo contato (ISO). Opcional.
  proximoContato?: string;
  colunaId: string;
  tags: string[];
  notas: Nota[];
  criadoEm: string;
  atualizadoEm: string;
}

// Uma coluna do kanban.
export interface Coluna {
  id: string;
  nome: string;
  ordem: number;
}

// O estado inteiro do funil.
export interface EstadoCrm {
  colunas: Coluna[];
  contatos: Contato[];
}

// Campos que dao pra criar ou editar num contato. valorEstimado aceita null pra
// LIMPAR o valor: undefined some no JSON.stringify e o backend nao veria a
// intencao de apagar; null sobrevive e sinaliza "zerar este campo".
export interface DadosContato {
  nome?: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  valorEstimado?: number | null;
  // Aceita null pra LIMPAR o campo, mesma razao do valorEstimado.
  proximoContato?: string | null;
  colunaId?: string;
  tags?: string[];
}

// Erro de resposta do CRM: carrega a mensagem que o backend mandou em { erro }.
export class ErroCrm extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroCrm";
    this.status = status;
  }
}

// Faz a chamada e trata o erro no padrao { erro }. Rede fora vira ErroCrm(0).
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
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo?.erro) mensagem = corpo.erro;
    } catch {
      // corpo sem json, mantem a mensagem padrao
    }
    throw new ErroCrm(mensagem, resposta.status);
  }
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}

function corpo(metodo: string, dados: unknown): RequestInit {
  return { method: metodo, body: JSON.stringify(dados) };
}

// Estado inteiro do funil do workspace ativo.
export function obterCrm(): Promise<EstadoCrm> {
  return pedir<EstadoCrm>("/api/crm");
}

// Cria um contato. Devolve o criado.
export function criarContato(dados: DadosContato): Promise<Contato> {
  return pedir<Contato>("/api/crm/contatos", corpo("POST", dados));
}

// Atualiza campos de um contato. Devolve o atualizado.
export function atualizarContato(id: string, dados: DadosContato): Promise<Contato> {
  return pedir<Contato>(`/api/crm/contatos/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

// Exclui um contato.
export function excluirContato(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(`/api/crm/contatos/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// Adiciona uma nota a um contato. Devolve o contato com a nota nova no topo.
export function adicionarNota(id: string, texto: string): Promise<Contato> {
  return pedir<Contato>(`/api/crm/contatos/${encodeURIComponent(id)}/notas`, corpo("POST", { texto }));
}

// Move um contato pra outra coluna. Devolve o contato.
export function moverContato(id: string, colunaId: string): Promise<Contato> {
  return pedir<Contato>(`/api/crm/contatos/${encodeURIComponent(id)}/mover`, corpo("PATCH", { colunaId }));
}

// Cria uma coluna nova no fim do funil. Devolve a criada.
export function criarColuna(nome: string): Promise<Coluna> {
  return pedir<Coluna>("/api/crm/colunas", corpo("POST", { nome }));
}

// Renomeia uma coluna. Devolve a atualizada.
export function renomearColuna(id: string, nome: string): Promise<Coluna> {
  return pedir<Coluna>(`/api/crm/colunas/${encodeURIComponent(id)}`, corpo("PATCH", { nome }));
}

// Exclui uma coluna. Os contatos dela vao pra primeira coluna que sobrar.
export function excluirColuna(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(`/api/crm/colunas/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// Reordena as colunas conforme a lista de ids. Devolve as colunas ordenadas.
export function reordenarColunas(ordem: string[]): Promise<{ colunas: Coluna[] }> {
  return pedir<{ colunas: Coluna[] }>("/api/crm/colunas/reordenar", corpo("PATCH", { ordem }));
}
