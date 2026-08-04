import { FilaAssistente, filaAssistente } from "./fila.js";
import type { AlvoDaGeracao, PedidoDeGeracao } from "../sessoes/disparo.js";
import { dispararGeracao } from "../sessoes/disparo.js";
import { gerenciador } from "../sessoes/gerenciador.js";
import { geracaoVisualEmAndamento } from "../sessoes/rotas.js";
import { workspacePorId } from "../workspaces/estado.js";
import { pastaUnica } from "../geracao/pasta.js";
import { montarPromptCriacao } from "../geracao/promptCarrossel.js";
import { montarPromptSite } from "../geracao/promptSite.js";
import { montarPromptAnuncio } from "../geracao/promptAnuncio.js";
import { registrarEfeitoAssistente } from "./rastro.js";
import type { Sessao } from "../tipos.js";
import type { Tarefa } from "./tarefa.js";

type DependenciasExecutor = {
  fila?: FilaAssistente;
  listarSessoes?: () => Sessao[];
  acharSessao?: (id: string) => Sessao | undefined;
  disparar?: (alvo: AlvoDaGeracao, pedido: PedidoDeGeracao) => { sessao: Sessao };
  esperar?: (ms: number) => Promise<void>;
};

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function pedidoDaTarefa(tarefa: Tarefa, pastaVkos: string): { pedido: PedidoDeGeracao; pastaAlvo: string } {
  if (tarefa.tipo === "carrossel") {
    const pasta = pastaUnica(pastaVkos, tarefa.dados.tema);
    return {
      pastaAlvo: pasta,
      pedido: {
        prompt: montarPromptCriacao(tarefa.dados, pasta),
        skill: "carrossel",
        modelo: undefined,
        permissao: "padrao",
      },
    };
  }
  if (tarefa.tipo === "site") {
    const pasta = pastaUnica(pastaVkos, tarefa.dados.tema);
    return {
      pastaAlvo: pasta,
      pedido: {
        prompt: montarPromptSite(tarefa.dados, pasta),
        skill: "site",
        permissao: "padrao",
        pastaAlvo: pasta,
      },
    };
  }
  const pasta = pastaUnica(pastaVkos, tarefa.dados.oferta || "anuncio");
  return {
    pastaAlvo: pasta,
    pedido: {
      prompt: montarPromptAnuncio(tarefa.dados),
      skill: "anuncio",
      permissao: "padrao",
      pastaAlvo: pasta,
    },
  };
}

export class ExecutorAssistente {
  private executando = false;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private readonly fila: FilaAssistente;
  private readonly listarSessoes: () => Sessao[];
  private readonly acharSessao: (id: string) => Sessao | undefined;
  private readonly disparar: (alvo: AlvoDaGeracao, pedido: PedidoDeGeracao) => { sessao: Sessao };
  private readonly esperar: (ms: number) => Promise<void>;

  constructor(dependencias: DependenciasExecutor = {}) {
    this.fila = dependencias.fila ?? filaAssistente;
    this.listarSessoes = dependencias.listarSessoes ?? (() => gerenciador.listar());
    this.acharSessao = dependencias.acharSessao ?? ((id) => gerenciador.acharSessao(id));
    this.disparar = dependencias.disparar ?? dispararGeracao;
    this.esperar = dependencias.esperar ?? esperar;
  }

  iniciar(): void {
    this.fila.sanearRodando("O Hub foi reiniciado durante a execução.");
    if (!this.temporizador) {
      this.temporizador = setInterval(() => void this.processar(), 250);
      this.temporizador.unref?.();
    }
    void this.processar();
  }

  parar(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  async processar(): Promise<void> {
    if (this.executando) return;
    this.executando = true;
    try {
      while (true) {
        const tarefa = this.fila.listar().find((item) => item.estado === "aprovada");
        if (!tarefa) return;
        if (geracaoVisualEmAndamento(this.listarSessoes())) return;
        await this.executarTarefa(tarefa);
      }
    } finally {
      this.executando = false;
    }
  }

  private async executarTarefa(tarefa: Tarefa): Promise<void> {
    const workspace = workspacePorId(tarefa.workspaceId);
    if (!workspace) {
      const falha = this.fila.mudarEstado(tarefa.id, "falhou", {
        erro: `Workspace ${tarefa.workspaceId} não existe mais.`,
      });
      registrarEfeitoAssistente({
        tipo: "tarefa:falhou",
        tarefaId: falha.id,
        loteId: falha.loteId,
        workspaceId: falha.workspaceId,
        workspaceNome: falha.workspaceNome,
        erro: falha.erro,
      });
      return;
    }

    this.fila.mudarEstado(tarefa.id, "na-fila");
    const preparacao = pedidoDaTarefa(tarefa, workspace.pasta);
    let sessao: Sessao;
    try {
      const emRodando = this.fila.mudarEstado(tarefa.id, "rodando", {
        pastaAlvo: preparacao.pastaAlvo,
        em: new Date().toISOString(),
      });
      sessao = this.disparar(
        { workspaceId: workspace.id, pastaVkos: workspace.pasta },
        {
          ...preparacao.pedido,
          titulo: `${tarefa.tipo}: ${tarefa.workspaceNome}`,
        },
      ).sessao;
      this.fila.mudarEstado(tarefa.id, "rodando", { sessaoId: sessao.id });
      registrarEfeitoAssistente({
        tipo: "tarefa:iniciada",
        tarefaId: emRodando.id,
        loteId: emRodando.loteId,
        workspaceId: workspace.id,
        workspaceNome: workspace.nome,
        pasta: preparacao.pastaAlvo,
        sessaoId: sessao.id,
      });
    } catch (erro) {
      const falha = this.fila.mudarEstado(tarefa.id, "falhou", {
        erro: erro instanceof Error ? erro.message : String(erro),
      });
      registrarEfeitoAssistente({
        tipo: "tarefa:falhou",
        tarefaId: falha.id,
        loteId: falha.loteId,
        workspaceId: falha.workspaceId,
        workspaceNome: falha.workspaceNome,
        erro: falha.erro,
      });
      return;
    }

    const final = await this.esperarSessao(sessao.id);
    const estadoAtual = this.fila.achar(tarefa.id);
    if (!estadoAtual || estadoAtual.estado === "cancelada") {
      return;
    }
    if (final?.status === "concluida") {
      const feita = this.fila.mudarEstado(tarefa.id, "feita", {
        sessaoId: final.id,
        pastaAlvo: final.pastaAlvo ?? preparacao.pastaAlvo,
      });
      registrarEfeitoAssistente({
        tipo: "tarefa:concluida",
        tarefaId: feita.id,
        loteId: feita.loteId,
        workspaceId: feita.workspaceId,
        workspaceNome: feita.workspaceNome,
        pasta: feita.pastaAlvo,
        sessaoId: final.id,
        custoUsd: final.custoUsd,
      });
      registrarEfeitoAssistente({
        tipo: "peca:gravada",
        tarefaId: feita.id,
        loteId: feita.loteId,
        workspaceId: feita.workspaceId,
        workspaceNome: feita.workspaceNome,
        pasta: feita.pastaAlvo,
        sessaoId: final.id,
        custoUsd: final.custoUsd,
      });
      return;
    }

    const falha = this.fila.mudarEstado(tarefa.id, "falhou", {
      sessaoId: final?.id ?? sessao.id,
      erro: final?.erro ?? "A sessão da tarefa não concluiu.",
    });
    registrarEfeitoAssistente({
      tipo: "tarefa:falhou",
      tarefaId: falha.id,
      loteId: falha.loteId,
      workspaceId: falha.workspaceId,
      workspaceNome: falha.workspaceNome,
      pasta: falha.pastaAlvo,
      sessaoId: final?.id ?? sessao.id,
      erro: falha.erro,
      custoUsd: final?.custoUsd,
    });
  }

  private async esperarSessao(id: string): Promise<Sessao | undefined> {
    while (true) {
      const sessao = this.acharSessao(id);
      if (!sessao || ["concluida", "erro", "parada"].includes(sessao.status)) return sessao;
      await this.esperar(100);
    }
  }
}

export const executorAssistente = new ExecutorAssistente();
