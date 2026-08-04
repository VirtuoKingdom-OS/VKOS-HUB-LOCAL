import { join } from "node:path";

import { assinar, type EventoDominio } from "../eventos/barramento.js";
import { anexarJsonl, lerJsonl } from "../util/jsonl.js";
import { pastaDadosHub } from "../workspaces/estado.js";

const EVENTOS_DO_RASTRO = new Set(["peca:criada", "peca:exportada", "sessao:concluida"]);

export interface EntradaRastro {
  id?: string;
  em?: string;
  tipo: string;
  fonte: "servidor";
  loteId?: string;
  tarefaId?: string;
  conversaId?: string;
  workspaceId?: string;
  workspaceNome?: string;
  pasta?: string;
  sessaoId?: string;
  custoUsd?: number;
  estado?: string;
  erro?: string;
  dados?: Record<string, unknown>;
}

function ehEntrada(valor: unknown): valor is EntradaRastro {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Record<string, unknown>;
  return typeof item.tipo === "string" && item.fonte === "servidor";
}

export function caminhoRastroAssistente(): string {
  return join(pastaDadosHub(), "assistente", "rastro.jsonl");
}

export class RastroAssistente {
  constructor(public readonly caminho: string = caminhoRastroAssistente()) {}

  registrar(entrada: EntradaRastro): EntradaRastro {
    if (entrada.fonte !== "servidor") {
      throw new Error("O rastro só aceita efeitos observados pelo servidor.");
    }
    const completa: EntradaRastro = {
      ...entrada,
      id: entrada.id ?? `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      em: entrada.em ?? new Date().toISOString(),
      fonte: "servidor",
    };
    anexarJsonl(this.caminho, [completa]);
    return completa;
  }

  listar(opcoes: { limite?: number; cursor?: string } = {}): {
    itens: EntradaRastro[];
    proximoCursor?: string;
  } {
    const todos = lerJsonl<EntradaRastro>(this.caminho, ehEntrada).itens;
    const limite = Math.max(1, Math.min(opcoes.limite ?? 50, 200));
    const deslocamentoBruto = opcoes.cursor ? Number(opcoes.cursor) : 0;
    const deslocamento = Number.isInteger(deslocamentoBruto) && deslocamentoBruto >= 0 ? deslocamentoBruto : 0;
    const fim = Math.max(0, todos.length - deslocamento);
    const inicio = Math.max(0, fim - limite);
    const itens = todos.slice(inicio, fim).reverse();
    const consumidos = deslocamento + itens.length;
    return {
      itens,
      ...(inicio > 0 ? { proximoCursor: String(consumidos) } : {}),
    };
  }
}

export const rastroAssistente = new RastroAssistente();
let assinaturaAtiva = false;

export function inicializarRastro(): void {
  if (assinaturaAtiva) return;
  assinaturaAtiva = true;
  assinar("*", (evento: EventoDominio) => {
    if (!EVENTOS_DO_RASTRO.has(evento.tipo)) return;
    rastroAssistente.registrar({
      tipo: evento.tipo,
      fonte: "servidor",
      workspaceId: evento.workspaceId || undefined,
      em: evento.em,
      dados: evento.dados,
      ...(typeof evento.dados.pasta === "string" ? { pasta: evento.dados.pasta } : {}),
      ...(typeof evento.dados.id === "string" ? { sessaoId: evento.dados.id } : {}),
    });
  });
}

export function registrarEfeitoAssistente(entrada: Omit<EntradaRastro, "fonte">): EntradaRastro {
  return rastroAssistente.registrar({ ...entrada, fonte: "servidor" });
}
