// Cliente REST do CRM v4.
//
// FRONTEIRA DE TIPOS: as entidades do CRM nao sao redeclaradas aqui. Elas vem
// de ../tipos/crm, que reexporta app/server/src/crm/modelo.ts. Antes este
// arquivo tinha a propria copia dos tipos, e foi por isso que o servidor pulou
// pra v4 sem o typecheck do web reclamar: existiam duas verdades. Agora existe
// uma so, e divergencia de modelo vira erro de compilacao.
//
// O que continua morando aqui: os corpos de requisicao (Dados*). Eles nao sao
// entidades, sao o formato do que a tela ENVIA, e o servidor aceita coisas que
// a entidade nao tem (o caso do "empresa", que ele resolve numa Organizacao).

import { apagar, corpo, pedir } from "./rest";
import type {
  Coluna,
  Contato,
  EstadoCrm,
  Interacao,
  Negocio,
  Orcamento,
  Organizacao,
  StatusNegocio,
  StatusOrcamento,
  Tarefa,
  TipoColuna,
  TipoInteracao,
} from "../tipos/crm";

export type {
  Coluna,
  Contato,
  DadosLead,
  EstadoCrm,
  Interacao,
  Negocio,
  Orcamento,
  Organizacao,
  RegistroEstagio,
  StatusNegocio,
  StatusOrcamento,
  Tarefa,
  TipoColuna,
  TipoInteracao,
} from "../tipos/crm";

// Corpo do POST e do PATCH de contato. "empresa" nao e campo da entidade: o
// servidor recebe o nome e resolve (ou cria) a Organizacao, entao a tela pode
// continuar tendo um campo de texto simples.
export interface DadosContato {
  nome?: string;
  empresa?: string;
  organizacaoId?: string | null;
  telefone?: string;
  email?: string;
  origem?: string;
  proximoContato?: string | null;
  cadenciaDias?: number | null;
  tags?: string[];
  colunaId?: string;
  arquivado?: boolean;
}

export interface DadosNegocio {
  titulo?: string;
  contatoId?: string;
  status?: StatusNegocio;
  valorEstimado?: number | null;
  valorFechado?: number | null;
  fechadoEm?: string | null;
  proximaAcaoEm?: string | null;
  proximaAcaoTexto?: string | null;
  escopo?: string | null;
  recorrente?: boolean;
  valorMensal?: number | null;
  diaDoCiclo?: number | null;
}

export interface DadosTarefa {
  texto?: string;
  prazo?: string | null;
  feita?: boolean;
  contatoId?: string | null;
  negocioId?: string | null;
}

export interface DadosOrcamento {
  negocioId?: string;
  valor?: number;
  status?: StatusOrcamento;
  enviadoEm?: string | null;
  validoAte?: string | null;
  arquivo?: string | null;
  link?: string | null;
}

export interface DadosColuna {
  nome?: string;
  tipo?: TipoColuna;
  diasParaEsfriar?: number | null;
}

// O erro do CRM e o erro da API: o nome antigo continua exportado porque a tela
// o conhece por ele, mas a classe e uma so.
export { ErroApi as ErroCrm } from "./rest";

export function obterCrm(): Promise<EstadoCrm> {
  return pedir<EstadoCrm>("/api/crm");
}

// ------------------------------------------------------------- contatos

export function criarContato(dados: DadosContato): Promise<Contato> {
  return pedir<Contato>("/api/crm/contatos", corpo("POST", dados));
}

export function atualizarContato(id: string, dados: DadosContato): Promise<Contato> {
  return pedir<Contato>(`/api/crm/contatos/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

export function excluirContato(id: string): Promise<{ ok: boolean }> {
  return apagar(`/api/crm/contatos/${encodeURIComponent(id)}`);
}

export function moverContato(id: string, colunaId: string, indice?: number): Promise<Contato> {
  return pedir<Contato>(
    `/api/crm/contatos/${encodeURIComponent(id)}/mover`,
    corpo("PATCH", { colunaId, ...(indice === undefined ? {} : { indice }) }),
  );
}

// ----------------------------------------------------------- interacoes

// A linha do tempo saiu de dentro do contato pro interacoes.jsonl, entao ela e
// pedida por contato, sob demanda.
// Data do ultimo toque de cada contato, em uma requisicao so.
//
// A tela do dia precisa disto pro bloco "Esfriando". Pedir contato a contato
// seria uma requisicao por contato, e cair na data de atualizacao do contato
// faz todo mundo parecer mais quente do que esta. Contato sem interacao nao
// vem no mapa: quem chama decide o que fazer com a ausencia.
export async function obterUltimasInteracoes(): Promise<Map<string, string>> {
  const dados = await pedir<{ ultimas: Record<string, string> }>("/api/crm/interacoes/ultimas");
  return new Map(Object.entries(dados.ultimas ?? {}));
}

export async function listarInteracoes(contatoId: string): Promise<Interacao[]> {
  const dados = await pedir<{ interacoes: Interacao[] }>(
    `/api/crm/contatos/${encodeURIComponent(contatoId)}/interacoes`,
  );
  return dados.interacoes;
}

export function registrarInteracao(
  contatoId: string,
  tipo: TipoInteracao,
  texto: string,
): Promise<Interacao> {
  return pedir<Interacao>(
    `/api/crm/contatos/${encodeURIComponent(contatoId)}/interacoes`,
    corpo("POST", { tipo, texto }),
  );
}

// ------------------------------------------------------- organizacoes

export function criarOrganizacao(nome: string): Promise<Organizacao> {
  return pedir<Organizacao>("/api/crm/organizacoes", corpo("POST", { nome }));
}

// --------------------------------------------------------------- tarefas

// Tarefa saiu de dentro do contato: nasce na lista de topo, podendo apontar pro
// contato, pro negocio, ou pra nenhum dos dois.
export function criarTarefa(dados: DadosTarefa & { texto: string }): Promise<Tarefa> {
  return pedir<Tarefa>("/api/crm/tarefas", corpo("POST", dados));
}

export function atualizarTarefa(id: string, dados: DadosTarefa): Promise<Tarefa> {
  return pedir<Tarefa>(`/api/crm/tarefas/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

export function excluirTarefa(id: string): Promise<{ ok: boolean }> {
  return apagar(`/api/crm/tarefas/${encodeURIComponent(id)}`);
}

// -------------------------------------------------------------- negocios

export function criarNegocio(dados: DadosNegocio & { titulo: string; contatoId: string }): Promise<Negocio> {
  return pedir<Negocio>("/api/crm/negocios", corpo("POST", dados));
}

export function atualizarNegocio(id: string, dados: DadosNegocio): Promise<Negocio> {
  return pedir<Negocio>(`/api/crm/negocios/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

export function excluirNegocio(id: string): Promise<{ ok: boolean }> {
  return apagar(`/api/crm/negocios/${encodeURIComponent(id)}`);
}

// ------------------------------------------------------------ orcamentos

export function criarOrcamento(dados: DadosOrcamento & { negocioId: string; valor: number }): Promise<Orcamento> {
  return pedir<Orcamento>("/api/crm/orcamentos", corpo("POST", dados));
}

export function atualizarOrcamento(id: string, dados: DadosOrcamento): Promise<Orcamento> {
  return pedir<Orcamento>(`/api/crm/orcamentos/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

export function excluirOrcamento(id: string): Promise<{ ok: boolean }> {
  return apagar(`/api/crm/orcamentos/${encodeURIComponent(id)}`);
}

// --------------------------------------------------------------- colunas

export function criarColuna(nome: string, tipo: TipoColuna = "aberto"): Promise<Coluna> {
  return pedir<Coluna>("/api/crm/colunas", corpo("POST", { nome, tipo }));
}

export function atualizarColuna(id: string, dados: DadosColuna): Promise<Coluna> {
  return pedir<Coluna>(`/api/crm/colunas/${encodeURIComponent(id)}`, corpo("PATCH", dados));
}

export function renomearColuna(id: string, nome: string): Promise<Coluna> {
  return atualizarColuna(id, { nome });
}

export function excluirColuna(id: string): Promise<{ ok: boolean }> {
  return apagar(`/api/crm/colunas/${encodeURIComponent(id)}`);
}

export function reordenarColunas(ordem: string[]): Promise<{ colunas: Coluna[] }> {
  return pedir<{ colunas: Coluna[] }>("/api/crm/colunas/reordenar", corpo("PATCH", { ordem }));
}
