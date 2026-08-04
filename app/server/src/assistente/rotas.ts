import type { FastifyPluginAsync } from "fastify";

import { gerenciador } from "../sessoes/gerenciador.js";
import { lerTranscricao } from "../sessoes/transcricao.js";
import { workspacePorId } from "../workspaces/estado.js";
import { executorAssistente } from "./executor.js";
import {
  acharConversaAssistente,
  atualizarConversaAssistente,
  apagarConversaAssistente,
  criarConversaAssistente,
  listarConversasAssistente,
  registrarErroDeLote,
  type ConversaAssistente,
} from "./conversas.js";
import { montarBriefingAssistente } from "./briefing.js";
import { montarPromptAssistente } from "./prompt.js";
import { criarPastaRascunho, lerLoteDoRascunho } from "./rascunho.js";
import { criarTarefasDoLote } from "./lote.js";
import { filaAssistente } from "./fila.js";
import { registrarEfeitoAssistente, rastroAssistente } from "./rastro.js";
import type { Tarefa } from "./tarefa.js";

function idSeguro(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}


// Lê o lote.json que a sessão da conversa deixou e transforma em tarefas na
// fila. Lança quando o rascunho está fora do contrato.
//
// SEMPRE deixa registrado na conversa o que aconteceu: o motivo da recusa, ou
// null quando deu certo. Quem chama pode escolher não derrubar a resposta por
// causa disso, mas ninguém pode escolher esconder do dono.
export function sincronizarRascunhoDaConversa(conversaId: string): Tarefa[] {
  try {
    const tarefas = lerRascunhoParaFila(conversaId);
    registrarErroDeLote(conversaId, null);
    return tarefas;
  } catch (erro) {
    registrarErroDeLote(conversaId, erro instanceof Error ? erro.message : String(erro));
    throw erro;
  }
}

function lerRascunhoParaFila(conversaId: string): Tarefa[] {
  const conversa = acharConversaAssistente(conversaId);
  if (!conversa?.sessaoId) return [];
  const sessao = gerenciador.acharSessao(conversa.sessaoId);
  if (!sessao || sessao.status !== "concluida") return [];
  const lote = lerLoteDoRascunho(sessao.pastaTrabalho);
  if (!lote) return [];
  if (filaAssistente.listar().some((tarefa) => tarefa.loteId === lote.id)) {
    return filaAssistente.listar().filter((tarefa) => tarefa.loteId === lote.id);
  }
  const tarefas = criarTarefasDoLote({ lote, conversaId, acharWorkspace: workspacePorId });
  filaAssistente.adicionarLote(tarefas);
  registrarEfeitoAssistente({
    tipo: "lote:proposto",
    loteId: lote.id,
    conversaId,
    workspaceId: tarefas[0]?.workspaceId,
    dados: { quantidade: tarefas.length },
  });
  return tarefas;
}

function sincronizarTodos(): void {
  for (const conversa of listarConversasAssistente()) {
    try {
      sincronizarRascunhoDaConversa(conversa.id);
    } catch {
      // Um rascunho malformado não pode derrubar a listagem inteira. O motivo
      // já ficou gravado na conversa pelo sincronizar, e a tela mostra ele.
    }
  }
}

function conversaComDados(conversa: ConversaAssistente): Record<string, unknown> {
  const sessao = conversa.sessaoId ? gerenciador.acharSessao(conversa.sessaoId) : undefined;
  return {
    ...conversa,
    estadoSessao: sessao?.status ?? null,
    turnos: conversa.sessaoId ? lerTranscricao("", conversa.sessaoId) : [],
  };
}

export const rotasAssistente: FastifyPluginAsync = async (app) => {
  app.get("/assistente/conversas", async () => {
    sincronizarTodos();
    return { conversas: listarConversasAssistente() };
  });

  app.post("/assistente/conversas", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as { titulo?: unknown };
    const conversa = criarConversaAssistente(typeof corpo.titulo === "string" ? corpo.titulo : undefined);
    return resposta.code(201).send({ conversa });
  });

  app.get("/assistente/conversas/:id", async (requisicao, resposta) => {
    const id = idSeguro((requisicao.params as { id?: unknown }).id);
    if (!acharConversaAssistente(id)) {
      return resposta.code(404).send({ erro: "Conversa não encontrada." });
    }
    try {
      sincronizarRascunhoDaConversa(id);
    } catch {
      // A tela ainda abre o histórico. O motivo da recusa vai junto, no
      // erroLote da conversa relida abaixo.
    }
    // Relê DEPOIS de sincronizar: a conversa lida antes ainda não carregava o
    // erroLote que a sincronização acabou de gravar, e a tela mostraria a falha
    // só na consulta seguinte.
    const atual = acharConversaAssistente(id);
    if (!atual) return resposta.code(404).send({ erro: "Conversa não encontrada." });
    return conversaComDados(atual);
  });

  app.patch("/assistente/conversas/:id", async (requisicao, resposta) => {
    const id = idSeguro((requisicao.params as { id?: unknown }).id);
    const corpo = (requisicao.body ?? {}) as { titulo?: unknown };
    const conversa = atualizarConversaAssistente(id, {
      ...(typeof corpo.titulo === "string" ? { titulo: corpo.titulo.trim().slice(0, 120) } : {}),
    });
    if (!conversa) return resposta.code(404).send({ erro: "Conversa não encontrada." });
    return { conversa };
  });

  app.delete("/assistente/conversas/:id", async (requisicao, resposta) => {
    const id = idSeguro((requisicao.params as { id?: unknown }).id);
    if (!apagarConversaAssistente(id)) return resposta.code(404).send({ erro: "Conversa não encontrada." });
    return { ok: true };
  });

  app.post("/assistente/conversas/:id/mensagem", async (requisicao, resposta) => {
    const id = idSeguro((requisicao.params as { id?: unknown }).id);
    const conversa = acharConversaAssistente(id);
    if (!conversa) return resposta.code(404).send({ erro: "Conversa não encontrada." });
    const corpo = (requisicao.body ?? {}) as { texto?: unknown };
    const texto = typeof corpo.texto === "string" ? corpo.texto.trim() : "";
    if (!texto) return resposta.code(400).send({ erro: "texto e obrigatorio" });

    if (conversa.sessaoId) {
      const resultado = gerenciador.continuar(conversa.sessaoId, texto);
      if (!resultado.ok) return resposta.code(400).send({ erro: resultado.erro });
      atualizarConversaAssistente(id, { previa: texto });
      return { ok: true, sessaoId: conversa.sessaoId };
    }

    const pastaTrabalho = criarPastaRascunho(id);
    const briefing = montarBriefingAssistente();
    const sessao = gerenciador.criar({
      titulo: conversa.titulo,
      prompt: montarPromptAssistente({ conversaId: id, briefing, pedido: texto }),
      promptVisivel: texto,
      skill: "assistente",
      pastaTrabalho,
      workspaceId: "",
      permissao: "padrao",
      instrucoesExtras: briefing,
    });
    atualizarConversaAssistente(id, { sessaoId: sessao.id, previa: texto });
    return resposta.code(201).send({ ok: true, sessaoId: sessao.id });
  });

  app.post("/assistente/conversas/:id/sincronizar", async (requisicao, resposta) => {
    const id = idSeguro((requisicao.params as { id?: unknown }).id);
    if (!acharConversaAssistente(id)) return resposta.code(404).send({ erro: "Conversa não encontrada." });
    try {
      return { tarefas: sincronizarRascunhoDaConversa(id) };
    } catch (erro) {
      return resposta.code(422).send({ erro: erro instanceof Error ? erro.message : String(erro) });
    }
  });

  app.get("/assistente/fila", async () => {
    sincronizarTodos();
    return { tarefas: filaAssistente.listar() };
  });

  app.post("/assistente/lotes/:id/aprovar", async (requisicao, resposta) => {
    const id = idSeguro((requisicao.params as { id?: unknown }).id);
    try {
      const tarefas = filaAssistente.aprovarLote(id);
      registrarEfeitoAssistente({ tipo: "lote:aprovado", loteId: id, dados: { quantidade: tarefas.length } });
      void executorAssistente.processar();
      return { tarefas };
    } catch (erro) {
      return resposta.code(409).send({ erro: erro instanceof Error ? erro.message : String(erro) });
    }
  });

  app.post("/assistente/tarefas/:id/cancelar", async (requisicao, resposta) => {
    const id = idSeguro((requisicao.params as { id?: unknown }).id);
    const atual = filaAssistente.achar(id);
    if (!atual) return resposta.code(404).send({ erro: "Tarefa não encontrada." });
    if (atual.sessaoId) gerenciador.parar(atual.sessaoId);
    try {
      const tarefa = filaAssistente.cancelar(id);
      registrarEfeitoAssistente({ tipo: "tarefa:cancelada", tarefaId: id, loteId: tarefa.loteId, workspaceId: tarefa.workspaceId });
      return { tarefa };
    } catch (erro) {
      return resposta.code(409).send({ erro: erro instanceof Error ? erro.message : String(erro) });
    }
  });

  app.post("/assistente/lotes/:id/cancelar", async (requisicao, resposta) => {
    const id = idSeguro((requisicao.params as { id?: unknown }).id);
    const tarefas = filaAssistente.listar().filter((tarefa) => tarefa.loteId === id && !["feita", "falhou", "cancelada"].includes(tarefa.estado));
    for (const tarefa of tarefas) {
      if (tarefa.sessaoId) gerenciador.parar(tarefa.sessaoId);
      try {
        const cancelada = filaAssistente.cancelar(tarefa.id);
        registrarEfeitoAssistente({ tipo: "tarefa:cancelada", tarefaId: cancelada.id, loteId: id, workspaceId: cancelada.workspaceId });
      } catch {
        // Uma tarefa que terminou entre a leitura e o clique é reconciliada na
        // próxima leitura, sem cancelar o restante do lote.
      }
    }
    return { tarefas: filaAssistente.listar().filter((tarefa) => tarefa.loteId === id) };
  });

  app.get("/assistente/rastro", async (requisicao) => {
    const query = (requisicao.query ?? {}) as { limite?: string; cursor?: string };
    const pagina = rastroAssistente.listar({
      limite: query.limite ? Number(query.limite) : undefined,
      cursor: query.cursor,
    });
    return {
      entradas: pagina.itens,
      proximoCursor: pagina.proximoCursor ?? null,
    };
  });
};
