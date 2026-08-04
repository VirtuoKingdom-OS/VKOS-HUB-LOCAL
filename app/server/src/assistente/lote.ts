// DO lote.json PROPOSTO ÀS TAREFAS DA FILA.
//
// Este é o ponto onde o pouco que a IA escreveu vira o muito que a fila guarda,
// e ele mora fora de rotas.ts de propósito: é a única parte da sincronização
// que não precisa de disco, de sessão nem de servidor de pé, então é a única
// que pode ser afirmada por teste direto.
//
// Isso importa por causa de um elo que já quebrou em silêncio. A fila valida
// com TarefaSchema antes de gravar. Se a tarefa completada não passasse ali,
// adicionarLote lançaria, e o dono voltaria a ver exatamente o que viu em
// 2026-08-04: a IA dizendo que criou o lote e a fila vazia do lado.

import {
  completarAnuncio,
  completarCarrossel,
  completarSite,
  type EntradaAnuncio,
  type EntradaCarrossel,
  type EntradaSite,
} from "./entrada.js";
import { validarTarefa, type LoteProposta, type Tarefa } from "./tarefa.js";

export interface WorkspaceDoLote {
  id: string;
  nome: string;
}

// Os dados MÍNIMOS viram os COMPLETOS. O porquê da diferença está em entrada.ts.
export function completarDados(entrada: LoteProposta["tarefas"][number]): Tarefa["dados"] {
  if (entrada.tipo === "carrossel") return completarCarrossel(entrada.dados as EntradaCarrossel);
  if (entrada.tipo === "site") return completarSite(entrada.dados as EntradaSite);
  return completarAnuncio(entrada.dados as EntradaAnuncio);
}

export function criarTarefasDoLote(entrada: {
  lote: LoteProposta;
  conversaId: string;
  // Devolve null ou undefined quando não achou: o registro de workspaces
  // responde null, e um teste responde undefined. Os dois querem dizer a mesma
  // coisa aqui, e forçar um deles só criaria adaptador pra nada.
  acharWorkspace: (id: string) => WorkspaceDoLote | null | undefined;
  agora?: string;
}): Tarefa[] {
  const criadaEm = entrada.agora ?? new Date().toISOString();
  return entrada.lote.tarefas.map((proposta, indice) => {
    const workspace = entrada.acharWorkspace(proposta.workspaceId);
    if (!workspace) {
      throw new Error(
        `O workspace ${proposta.workspaceId} não existe. O assistente não vai escolher outro.`,
      );
    }
    // Nome divergente do id não é detalhe: ele denuncia que a IA resolveu o
    // workspace pelo nome e errou. Gerar peça do cliente A na pasta do cliente
    // B é o pior erro possível nesta tela.
    if (proposta.workspaceNome && proposta.workspaceNome !== workspace.nome) {
      throw new Error(
        `workspaceNome "${proposta.workspaceNome}" não corresponde ao workspaceId ${proposta.workspaceId}, que é "${workspace.nome}".`,
      );
    }
    // Validada AQUI, e não só na fila: o erro sai com o caminho do campo, e
    // quem chama já tem a conversa em mãos pra mostrar isso ao dono.
    return validarTarefa({
      id: proposta.id ?? `${entrada.lote.id}-t${indice + 1}`,
      loteId: entrada.lote.id,
      criadaEm,
      origem: "assistente",
      conversaId: entrada.conversaId,
      workspaceId: workspace.id,
      workspaceNome: workspace.nome,
      tipo: proposta.tipo,
      dados: completarDados(proposta),
      estado: "proposta",
    });
  });
}
