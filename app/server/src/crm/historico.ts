// Historico do CRM que sai do crm.json: interacoes e transicoes de estagio.
//
// Os dois crescem sem teto e so recebem linha nova, nunca alteracao de linha
// antiga. Por isso vivem em append-only, ao lado do crm.json, em vez de dentro
// dele. Antes, registrar uma interacao reescrevia a base inteira de contatos.
//
// Nada aqui rotaciona: e historico permanente, nao log de auditoria.

import { join } from "node:path";

import { anexarJsonl, anexarJsonlSemRepetir, lerJsonl } from "../util/jsonl.js";
import {
  TIPOS_INTERACAO,
  type Interacao,
  type RegistroEstagio,
  type TipoInteracao,
} from "./modelo.js";

export const NOME_INTERACOES = "interacoes.jsonl";
export const NOME_ESTAGIOS = "estagios.jsonl";

export function caminhoInteracoes(pasta: string): string {
  return join(pasta, NOME_INTERACOES);
}

export function caminhoEstagios(pasta: string): string {
  return join(pasta, NOME_ESTAGIOS);
}

function texto(valor: unknown): boolean {
  return typeof valor === "string" && valor.length > 0;
}

export function ehInteracao(valor: unknown): boolean {
  if (!valor || typeof valor !== "object") return false;
  const linha = valor as Record<string, unknown>;
  return (
    texto(linha.id) &&
    texto(linha.contatoId) &&
    texto(linha.em) &&
    typeof linha.texto === "string" &&
    TIPOS_INTERACAO.has(linha.tipo as TipoInteracao)
  );
}

export function ehRegistroEstagio(valor: unknown): boolean {
  if (!valor || typeof valor !== "object") return false;
  const linha = valor as Record<string, unknown>;
  return (
    texto(linha.id) &&
    texto(linha.contatoId) &&
    texto(linha.colunaId) &&
    texto(linha.entrouEm)
  );
}

// Le todas as interacoes da pasta, na ordem em que foram gravadas.
export function lerInteracoesDaPasta(pasta: string): Interacao[] {
  return lerJsonl<Interacao>(caminhoInteracoes(pasta), ehInteracao).itens;
}

export function lerEstagiosDaPasta(pasta: string): RegistroEstagio[] {
  return lerJsonl<RegistroEstagio>(caminhoEstagios(pasta), ehRegistroEstagio).itens;
}

// Agrupa as interacoes por contato, mais novas primeiro. E como a ficha e o
// resumo enxergam a linha do tempo sem varrer a lista inteira por contato.
export function agruparInteracoesPorContato(
  interacoes: readonly Interacao[],
): Map<string, Interacao[]> {
  const mapa = new Map<string, Interacao[]>();
  for (const interacao of interacoes) {
    const lista = mapa.get(interacao.contatoId);
    if (lista) lista.push(interacao);
    else mapa.set(interacao.contatoId, [interacao]);
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
  }
  return mapa;
}

export function anexarInteracoes(pasta: string, itens: readonly Interacao[]): void {
  anexarJsonl(caminhoInteracoes(pasta), itens);
}

export function anexarEstagios(pasta: string, itens: readonly RegistroEstagio[]): void {
  anexarJsonl(caminhoEstagios(pasta), itens);
}

// Versoes usadas so pela migracao. Comparam por id antes de gravar, entao rodar
// a migracao duas vezes nao duplica linha.
export function anexarInteracoesSemRepetir(
  pasta: string,
  itens: readonly Interacao[],
): number {
  return anexarJsonlSemRepetir(
    caminhoInteracoes(pasta),
    itens,
    (item) => item.id,
    ehInteracao,
  );
}

export function anexarEstagiosSemRepetir(
  pasta: string,
  itens: readonly RegistroEstagio[],
): number {
  return anexarJsonlSemRepetir(
    caminhoEstagios(pasta),
    itens,
    (item) => item.id,
    ehRegistroEstagio,
  );
}
