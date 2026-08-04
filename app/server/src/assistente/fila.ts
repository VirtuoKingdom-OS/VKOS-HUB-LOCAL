import { existsSync } from "node:fs";
import { join } from "node:path";

import { anexarJsonl, lerJsonl } from "../util/jsonl.js";
import { pastaDadosHub } from "../workspaces/estado.js";
import { transmitir } from "../nucleo/ws.js";
import { TarefaSchema, validarTarefa, type Tarefa } from "./tarefa.js";

const ESTADOS_FINAIS = new Set(["feita", "falhou", "cancelada"]);
const TRANSICOES: Record<Tarefa["estado"], readonly Tarefa["estado"][]> = {
  proposta: ["aprovada", "cancelada"],
  aprovada: ["na-fila", "cancelada"],
  "na-fila": ["rodando", "cancelada"],
  rodando: ["feita", "falhou", "cancelada"],
  feita: [],
  falhou: [],
  cancelada: [],
};

export function caminhoFilaAssistente(): string {
  return join(pastaDadosHub(), "assistente", "fila.jsonl");
}

function ehTarefa(valor: unknown): valor is Tarefa {
  return TarefaSchema.safeParse(valor).success;
}

function colapsar(itens: Tarefa[]): Tarefa[] {
  const porId = new Map<string, Tarefa>();
  for (const tarefa of itens) porId.set(tarefa.id, tarefa);
  return [...porId.values()];
}

export class FilaAssistente {
  constructor(public readonly caminho: string = caminhoFilaAssistente()) {}

  listar(): Tarefa[] {
    return colapsar(lerJsonl<Tarefa>(this.caminho, ehTarefa).itens).map((tarefa) => ({
      ...tarefa,
      dados: { ...tarefa.dados },
    })) as Tarefa[];
  }

  achar(id: string): Tarefa | undefined {
    return this.listar().find((tarefa) => tarefa.id === id);
  }

  adicionar(tarefa: Tarefa): Tarefa {
    const validada = validarTarefa(tarefa);
    if (this.achar(validada.id)) throw new Error(`A tarefa ${validada.id} já existe na fila.`);
    anexarJsonl(this.caminho, [validada]);
    transmitir({ tipo: "assistente:atualizado" });
    return validada;
  }

  adicionarLote(tarefas: readonly Tarefa[]): void {
    for (const tarefa of tarefas) validarTarefa(tarefa);
    const existentes = new Set(this.listar().map((tarefa) => tarefa.id));
    for (const tarefa of tarefas) {
      if (existentes.has(tarefa.id)) throw new Error(`A tarefa ${tarefa.id} já existe na fila.`);
      existentes.add(tarefa.id);
    }
    anexarJsonl(this.caminho, tarefas);
    transmitir({ tipo: "assistente:atualizado" });
  }

  mudarEstado(
    id: string,
    estado: Tarefa["estado"],
    campos: Partial<Pick<Tarefa, "sessaoId" | "pastaAlvo" | "erro" | "em">> = {},
  ): Tarefa {
    const atual = this.achar(id);
    if (!atual) throw new Error(`Tarefa ${id} não encontrada.`);
    if (estado !== atual.estado && !TRANSICOES[atual.estado].includes(estado)) {
      if (atual.estado === "proposta" && estado !== "aprovada" && estado !== "cancelada") {
        throw new Error("Uma tarefa em proposta só pode sair pela aprovação do lote ou pelo cancelamento.");
      }
      throw new Error(`Não é possível mudar a tarefa ${id} de ${atual.estado} para ${estado}.`);
    }
    const atualizada = validarTarefa({
      ...atual,
      ...campos,
      estado,
      atualizadaEm: new Date().toISOString(),
    });
    anexarJsonl(this.caminho, [atualizada]);
    transmitir({ tipo: "assistente:atualizado" });
    return atualizada;
  }

  aprovarLote(loteId: string): Tarefa[] {
    const propostas = this.listar().filter(
      (tarefa) => tarefa.loteId === loteId && tarefa.estado === "proposta",
    );
    if (propostas.length === 0) throw new Error(`Lote ${loteId} não tem tarefas propostas.`);
    const aprovadas = propostas.map((tarefa) => this.mudarEstado(tarefa.id, "aprovada"));
    return aprovadas;
  }

  cancelar(id: string): Tarefa {
    return this.mudarEstado(id, "cancelada");
  }

  sanearRodando(motivo: string): Tarefa[] {
    const presas = this.listar().filter((tarefa) => tarefa.estado === "rodando");
    return presas.map((tarefa) => this.mudarEstado(tarefa.id, "falhou", { erro: motivo }));
  }

  temArquivo(): boolean {
    return existsSync(this.caminho);
  }

  static estadosFinais = ESTADOS_FINAIS;
}

export const filaAssistente = new FilaAssistente();
