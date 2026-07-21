// Rotas REST do CRM. Montado sob /api pelo index.ts, com prefixo /crm.
// O funil de contatos e escopado no workspace ativo (ver estado.ts). Todos os
// erros de dominio saem no formato { erro: mensagem } com o status certo.

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import {
  ErroCrm,
  adicionarNota,
  atualizarNegocio,
  atualizarTarefa,
  atualizarContato,
  criarColuna,
  criarContato,
  criarNegocio,
  criarTarefa,
  lerEstado,
  moverContato,
  registrarInteracao,
  removerColuna,
  removerContato,
  removerNegocio,
  removerTarefa,
  renomearColuna,
  reordenarColunas,
} from "./estado.js";

// Traduz um ErroCrm em resposta HTTP. Erro inesperado sobe pro handler global.
function responderErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroCrm) {
    return resposta.status(erro.status).send({ erro: erro.message });
  }
  throw erro;
}

// Corpo de request como objeto simples, nunca null.
function corpoDe(req: FastifyRequest): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

export const rotasCrm: FastifyPluginAsync = async (app) => {
  // Estado inteiro do funil do workspace ativo.
  app.get("/crm", async (_req, resposta) => {
    try {
      return lerEstado();
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Cria uma ficha de contato. Negocios sao criados separadamente.
  app.post("/crm/contatos", async (req, resposta) => {
    try {
      return resposta.status(201).send(criarContato(corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Atualiza campos de um contato.
  app.patch("/crm/contatos/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      return atualizarContato(id, corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Remove um contato.
  app.delete("/crm/contatos/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      removerContato(id);
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Move um contato de estagio no funil (e reposiciona na coluna). O contato e
  // o cartao do quadro; isto e o que dispara crm:contato-movido.
  app.patch("/crm/contatos/:id/mover", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      return moverContato(id, corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Registra uma interacao na linha do tempo do contato.
  app.post("/crm/contatos/:id/interacoes", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      return resposta.status(201).send(registrarInteracao(id, corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Alias temporario do CRM v1. Conserva a resposta antiga: contato atualizado.
  app.post("/crm/contatos/:id/notas", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      return resposta.status(201).send(adicionarNota(id, corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Cria uma tarefa simples vinculada ao contato.
  app.post("/crm/contatos/:id/tarefas", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      return resposta.status(201).send(criarTarefa(id, corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.patch("/crm/tarefas/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      return atualizarTarefa(id, corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.delete("/crm/tarefas/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      removerTarefa(id);
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Negocios sao os cartoes movidos no quadro e sempre apontam pra um contato.
  app.post("/crm/negocios", async (req, resposta) => {
    try {
      return resposta.status(201).send(criarNegocio(corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.patch("/crm/negocios/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      return atualizarNegocio(id, corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.delete("/crm/negocios/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      removerNegocio(id);
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Cria uma coluna nova no fim do funil.
  app.post("/crm/colunas", async (req, resposta) => {
    try {
      return resposta.status(201).send(criarColuna(corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Reordena as colunas. Rota estatica, registrada antes de /colunas/:id: o
  // roteador do Fastify prioriza o caminho fixo, entao "reordenar" nunca cai
  // no handler parametrico.
  app.patch("/crm/colunas/reordenar", async (req, resposta) => {
    try {
      return { colunas: reordenarColunas(corpoDe(req)) };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Renomeia uma coluna.
  app.patch("/crm/colunas/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      return renomearColuna(id, corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Exclui uma coluna. Os contatos dela vao pra primeira coluna que sobrar.
  app.delete("/crm/colunas/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      removerColuna(id);
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });
};
