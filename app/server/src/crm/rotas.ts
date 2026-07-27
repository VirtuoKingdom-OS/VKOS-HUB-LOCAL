// Rotas REST do CRM v4. Montado sob /api pelo index.ts, com prefixo /crm.
// O funil e unico do Hub, no nivel CORE, e abre com ou sem cliente aberto (ver
// estado.ts). Todos os erros de dominio saem no formato { erro: mensagem } com o
// status certo: 400 payload invalido, 404 id que nao existe, 409 arquivo do CRM
// corrompido.

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { avisarCrm, deveAvisar, escopoDaRota } from "./aovivo.js";
import {
  ErroCrm,
  adicionarNota,
  atualizarColuna,
  atualizarContato,
  atualizarNegocio,
  atualizarOrcamento,
  atualizarOrganizacao,
  atualizarTarefa,
  criarColuna,
  criarContato,
  criarNegocio,
  criarOrcamento,
  criarOrganizacao,
  criarTarefa,
  lerEstado,
  lerEstagios,
  lerInteracoes,
  moverContato,
  registrarInteracao,
  removerColuna,
  removerContato,
  removerNegocio,
  removerOrcamento,
  removerOrganizacao,
  removerTarefa,
  reordenarColunas,
  ultimaInteracaoPorContato,
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

function idDe(req: FastifyRequest): string {
  return (req.params as { id: string }).id;
}

export const rotasCrm: FastifyPluginAsync = async (app) => {
  // Toda gravacao bem sucedida do CRM avisa as abas (regras e formato da
  // mensagem em aovivo.ts). Fica num hook e nao em cada rota de proposito: sao
  // mais de vinte mutacoes, e a que esquecesse de avisar viraria uma tela
  // desatualizada em silencio, o bug mais caro de achar.
  app.addHook("onResponse", async (req, resposta) => {
    if (!deveAvisar(req.method, resposta.statusCode)) return;
    avisarCrm({
      escopo: escopoDaRota(req.routeOptions.url ?? req.url),
      contatoId: (req.params as { id?: string } | undefined)?.id,
      origem: req.headers["x-vkos-aba"],
    });
  });

  // Estado inteiro do funil: colunas, organizacoes,
  // contatos, negocios, orcamentos e tarefas. Interacoes e historico de estagio
  // NAO vem aqui: eles moram em append-only e sao pedidos por contato.
  app.get("/crm", async (_req, resposta) => {
    try {
      return lerEstado();
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // ------------------------------------------------------------ contatos

  app.post("/crm/contatos", async (req, resposta) => {
    try {
      return resposta.status(201).send(criarContato(corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.patch("/crm/contatos/:id", async (req, resposta) => {
    try {
      return atualizarContato(idDe(req), corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.delete("/crm/contatos/:id", async (req, resposta) => {
    try {
      removerContato(idDe(req));
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Move um contato de estagio no funil (e reposiciona na coluna). O contato e
  // o cartao do quadro; isto e o que dispara crm:contato-movido e o que grava
  // uma linha no estagios.jsonl.
  app.patch("/crm/contatos/:id/mover", async (req, resposta) => {
    try {
      return moverContato(idDe(req), corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // ---------------------------------------------------------- interacoes

  // Data do ultimo toque de cada contato, em uma requisicao so. Fica antes da
  // rota com :id de proposito, pra "ultimas" nunca ser lido como id.
  app.get("/crm/interacoes/ultimas", async (_req, resposta) => {
    try {
      return { ultimas: ultimaInteracaoPorContato() };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.get("/crm/contatos/:id/interacoes", async (req, resposta) => {
    try {
      return { interacoes: lerInteracoes(idDe(req)) };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.post("/crm/contatos/:id/interacoes", async (req, resposta) => {
    try {
      return resposta.status(201).send(registrarInteracao(idDe(req), corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Historico de estagio do contato, do mais antigo pro mais novo.
  app.get("/crm/contatos/:id/estagios", async (req, resposta) => {
    try {
      return { estagios: lerEstagios(idDe(req)) };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Alias temporario do CRM v1. Conserva a resposta antiga: contato atualizado.
  app.post("/crm/contatos/:id/notas", async (req, resposta) => {
    try {
      return resposta.status(201).send(adicionarNota(idDe(req), corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // ------------------------------------------------------- organizacoes

  app.post("/crm/organizacoes", async (req, resposta) => {
    try {
      return resposta.status(201).send(criarOrganizacao(corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.patch("/crm/organizacoes/:id", async (req, resposta) => {
    try {
      return atualizarOrganizacao(idDe(req), corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Exclui a organizacao. Os contatos dela ficam, so perdem o vinculo.
  app.delete("/crm/organizacoes/:id", async (req, resposta) => {
    try {
      removerOrganizacao(idDe(req));
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // ------------------------------------------------------------- tarefas

  // Tarefa saiu de dentro do contato: agora ela pode nascer solta, presa a um
  // contato ou presa a um negocio.
  app.post("/crm/tarefas", async (req, resposta) => {
    try {
      return resposta.status(201).send(criarTarefa(corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Atalho compativel: cria a tarefa ja vinculada ao contato da URL.
  app.post("/crm/contatos/:id/tarefas", async (req, resposta) => {
    try {
      const corpo = { ...corpoDe(req), contatoId: idDe(req) };
      return resposta.status(201).send(criarTarefa(corpo));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.patch("/crm/tarefas/:id", async (req, resposta) => {
    try {
      return atualizarTarefa(idDe(req), corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.delete("/crm/tarefas/:id", async (req, resposta) => {
    try {
      removerTarefa(idDe(req));
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // ------------------------------------------------------------ negocios

  // Negocio e valor/oportunidade preso a um contato. Quem caminha no funil e o
  // contato, entao negocio nao tem coluna: tem status.
  app.post("/crm/negocios", async (req, resposta) => {
    try {
      return resposta.status(201).send(criarNegocio(corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.patch("/crm/negocios/:id", async (req, resposta) => {
    try {
      return atualizarNegocio(idDe(req), corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.delete("/crm/negocios/:id", async (req, resposta) => {
    try {
      removerNegocio(idDe(req));
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // ---------------------------------------------------------- orcamentos

  app.post("/crm/orcamentos", async (req, resposta) => {
    try {
      return resposta.status(201).send(criarOrcamento(corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.patch("/crm/orcamentos/:id", async (req, resposta) => {
    try {
      return atualizarOrcamento(idDe(req), corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.delete("/crm/orcamentos/:id", async (req, resposta) => {
    try {
      removerOrcamento(idDe(req));
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // ------------------------------------------------------------- colunas

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

  // Atualiza nome, tipo (aberto, ganho, perdido) e dias para esfriar.
  app.patch("/crm/colunas/:id", async (req, resposta) => {
    try {
      return atualizarColuna(idDe(req), corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Exclui uma coluna. Os contatos dela vao pra primeira coluna que sobrar.
  app.delete("/crm/colunas/:id", async (req, resposta) => {
    try {
      removerColuna(idDe(req));
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });
};
