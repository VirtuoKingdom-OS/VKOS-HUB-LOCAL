// Rotas do CORE, o nivel de cima do Hub. Montado sob /api pelo index.ts.
//
// Aqui mora a leitura que o Dashboard do CORE faz: o gasto com IA de tudo que
// existe (inclusive de cliente ja removido) e o estado de cada workspace.
// A decisao vive em resumo.ts, sem disco; aqui e so a costura com o estado real.

import type { FastifyPluginAsync } from "fastify";

import { gerenciador } from "../sessoes/gerenciador.js";
import {
  lerCustos,
  lerHistoricoRemovidos,
  lerLancamentos,
  custosVazios,
  type CustosAcumulados,
} from "../sessoes/custos.js";
import { idWorkspaceAtivo, lerRegistro } from "../workspaces/estado.js";
import type { GastoDoCore, ResumoCore, WorkspaceNoCore } from "./modelo.js";
import { VERSAO_RESUMO_CORE } from "./modelo.js";
import {
  DIAS_DA_SERIE,
  JANELA_ATIVIDADE_DIAS,
  agregarPorDia,
  classificarAtividade,
  ordenarPorAtividade,
  ultimoTurno,
} from "./resumo.js";

// Status de sessao que contam como "em voo". Espelha o INFO_STATUS do web.
const EM_VOO = new Set(["fila", "iniciando", "rodando"]);

// Le o acumulado de um workspace sem deixar um arquivo corrompido derrubar o
// Dashboard inteiro. O caso vira gastoIlegivel na resposta, entao a tela diz
// que aquele cliente ficou de fora em vez de fingir que ele gastou zero.
function custosTolerante(id: string): { custos: CustosAcumulados; ilegivel: boolean } {
  try {
    return { custos: lerCustos(id), ilegivel: false };
  } catch (erro) {
    console.warn(`[core] nao deu pra ler o gasto do workspace ${id}: ${(erro as Error).message}`);
    return { custos: custosVazios(), ilegivel: true };
  }
}

function lancamentosTolerante(id: string) {
  try {
    return lerLancamentos(id);
  } catch {
    return [];
  }
}

export function montarResumoCore(agora: Date = new Date()): ResumoCore {
  const registro = lerRegistro();
  const ativo = idWorkspaceAtivo();
  const historico = lerHistoricoRemovidos();

  let totalUsd = historico.totalUsd;
  let estimado = historico.estimado;
  let turnosSemCusto = historico.turnosSemCusto;
  let algumIlegivel = false;
  const todosLancamentos = [];
  const lista: WorkspaceNoCore[] = [];

  for (const workspace of registro.workspaces) {
    const { custos, ilegivel } = custosTolerante(workspace.id);
    const lancamentos = lancamentosTolerante(workspace.id);
    todosLancamentos.push(...lancamentos);

    totalUsd += custos.totalUsd;
    estimado = estimado || custos.estimado || custos.totalUsd > 0;
    turnosSemCusto += custos.turnosSemCusto;
    algumIlegivel = algumIlegivel || ilegivel;

    const sessoesRodando = gerenciador
      .listar(workspace.id)
      .filter((sessao) => EM_VOO.has(sessao.status)).length;
    const ultimoTurnoEm = ultimoTurno(lancamentos);

    lista.push({
      id: workspace.id,
      nome: workspace.nome,
      pasta: workspace.pasta,
      ativo: workspace.id === ativo,
      atividade: classificarAtividade(
        { sessoesRodando, ultimoTurnoEm, ultimoUso: workspace.ultimoUso },
        agora,
      ),
      sessoesRodando,
      totalUsd: custos.totalUsd,
      estimado: custos.estimado || custos.totalUsd > 0,
      piso: custos.turnosSemCusto > 0 || ilegivel,
      turnosSemCusto: custos.turnosSemCusto,
      totalSessoes: custos.totalSessoes,
      ultimoUso: workspace.ultimoUso,
      ultimoTurnoEm,
      gastoIlegivel: ilegivel,
    });
  }

  const ordenados = ordenarPorAtividade(lista);

  const gasto: GastoDoCore = {
    totalUsd,
    // Com assinatura nenhum dolar e cobranca real: havendo gasto, e estimativa.
    estimado: estimado || totalUsd > 0,
    // Piso sempre que falta informacao: turno sem preco, cliente removido sem
    // historico legivel, ou cliente do registro com custos.json corrompido.
    piso:
      turnosSemCusto > 0 || historico.workspacesSemHistorico > 0 || algumIlegivel,
    turnosSemCusto,
    usdDeRemovidos: historico.totalUsd,
    workspacesRemovidos: historico.workspacesRemovidos,
    workspacesSemHistorico: historico.workspacesSemHistorico,
    porDia: agregarPorDia(todosLancamentos, agora, DIAS_DA_SERIE),
  };

  return {
    versao: VERSAO_RESUMO_CORE,
    gasto,
    workspaces: ordenados,
    sessoesRodando: ordenados.reduce((soma, w) => soma + w.sessoesRodando, 0),
    projetosAtivos: ordenados.filter((w) => w.atividade !== "parado").length,
    janelaAtividadeDias: JANELA_ATIVIDADE_DIAS,
    diasDaSerie: DIAS_DA_SERIE,
  };
}

export const rotasCore: FastifyPluginAsync = async (app) => {
  // Tudo que o Dashboard do CORE mostra, numa leitura so.
  app.get("/core/resumo", async () => montarResumoCore());
};
