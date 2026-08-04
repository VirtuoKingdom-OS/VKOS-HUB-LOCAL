import type { Workspace } from "../workspaces/estado.js";
import { listarIdsWorkspaces, lerRegistro } from "../workspaces/estado.js";
import { lerCustos, totalGeral } from "../sessoes/custos.js";
import { lerPecas } from "../vkos/pecas.js";
import { lerCerebro } from "../vkos/cerebro.js";
import { listarModelosCarrossel } from "../vkos/modelosCarrossel.js";
import { filaAssistente } from "./fila.js";

function resumoWorkspace(workspace: Workspace): Record<string, unknown> {
  const pecas = lerPecas(workspace.pasta).slice(0, 8).map((peca) => ({
    pasta: peca.pasta,
    tema: peca.tema,
    tipo: peca.tipo,
    criadoEm: peca.criadoEm,
  }));
  const custos = lerCustos(workspace.id);
  return {
    id: workspace.id,
    nome: workspace.nome,
    cerebro: lerCerebro(workspace.pasta).preenchido,
    ultimaAtividade: workspace.ultimoUso,
    gastoTotalUsd: custos.totalUsd,
    pecasRecentes: pecas,
    // O catálogo visual deste workspace. Sem ele o assistente não tinha como
    // mandar um `estilo` na tarefa, e duas peças do mesmo lote saíam com a
    // mesma cara.
    modelosDeCarrossel: listarModelosCarrossel(workspace.pasta),
  };
}

export function montarBriefingAssistente(): string {
  const registro = lerRegistro();
  const fila = filaAssistente.listar()
    .filter((tarefa) => ["proposta", "aprovada", "na-fila", "rodando", "falhou"].includes(tarefa.estado))
    .map((tarefa) => ({
      id: tarefa.id,
      loteId: tarefa.loteId,
      workspaceId: tarefa.workspaceId,
      workspaceNome: tarefa.workspaceNome,
      tipo: tarefa.tipo,
      estado: tarefa.estado,
      erro: tarefa.erro,
    }));
  const resumo = {
    workspaces: registro.workspaces.map(resumoWorkspace),
    workspaceAtivo: registro.ativo,
    gastoDoHub: totalGeral(),
    fila,
  };
  return [
    "<briefing-assistente>",
    "Este é um retrato curado do Hub. Use ids de workspace, nunca tente descobrir um alvo por nome quando o id estiver disponível.",
    JSON.stringify(resumo, null, 2),
    "</briefing-assistente>",
  ].join("\n");
}

export function idsDeWorkspacesDoBriefing(): string[] {
  return listarIdsWorkspaces();
}
