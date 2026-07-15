// Rotas REST das automacoes. Montado sob /api pelo index.ts, com prefixo
// /automacoes. As regras sao escopadas no workspace ativo (ver estado.ts).
// Todos os erros de dominio saem no formato { erro: mensagem } com o status
// certo, mesmo padrao das outras rotas do server.

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import {
  ErroAutomacao,
  atualizarRegra,
  criarRegra,
  lerHistorico,
  listarRegras,
  obterRegra,
  removerRegra,
} from "./estado.js";
import { renderizarRegra, renderizarTemplate, ultimoEventoCompativel } from "./executor.js";
import type { EventoDominio } from "../eventos/barramento.js";
import { lerConexoes } from "../conexoes/estado.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";

// Traduz um ErroAutomacao em resposta HTTP. Erro inesperado sobe pro handler global.
function responderErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroAutomacao) {
    return resposta.status(erro.status).send({ erro: erro.message });
  }
  throw erro;
}

// Corpo de request como objeto simples, nunca null.
function corpoDe(req: FastifyRequest): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

// Id do workspace ativo, ou lanca 409 no mesmo padrao do CRM: sem cliente
// ativo nao ha automacoes.json pra ler nem gravar.
function workspaceAtivoOuErro(): string {
  const id = idWorkspaceAtivo();
  if (!id) {
    throw new ErroAutomacao("Nenhum cliente ativo. Abra um workspace pra usar automacoes.", 409);
  }
  return id;
}

// A conexao do Google Calendar esta pronta quando o refreshToken foi salvo
// pelo fluxo de conectar (oauth.ts do dono A). So leitura, nunca decide nada.
function conectadoGoogle(workspaceId: string): boolean {
  const servidor = lerConexoes(workspaceId).servidores["googlecalendar"];
  return !!servidor?.config.refreshToken;
}

// Sanea um evento sintetico vindo do corpo do ensaio. O workspace nunca vem
// do corpo: e sempre o ativo, pra nao vazar automacao entre workspaces.
function saneiaEventoSintetico(v: unknown, workspaceId: string): EventoDominio | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  if (typeof e.tipo !== "string" || !e.tipo.trim()) return null;
  return {
    tipo: e.tipo.trim(),
    workspaceId,
    em: typeof e.em === "string" ? e.em : new Date().toISOString(),
    dados: e.dados && typeof e.dados === "object" ? (e.dados as Record<string, unknown>) : {},
  };
}

export const rotasAutomacoes: FastifyPluginAsync = async (app) => {
  // Regras do workspace ativo, mais o status da conexao com o Google.
  app.get("/automacoes", async (_req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      return { regras: listarRegras(workspaceId), conectadoGoogle: conectadoGoogle(workspaceId) };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Cria uma regra nova.
  app.post("/automacoes", async (req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      return resposta.status(201).send(criarRegra(workspaceId, corpoDe(req)));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Atualiza campos de uma regra (nome, ativa, gatilho, acao).
  app.patch("/automacoes/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      const workspaceId = workspaceAtivoOuErro();
      return atualizarRegra(workspaceId, id, corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Exclui uma regra.
  app.delete("/automacoes/:id", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      const workspaceId = workspaceAtivoOuErro();
      removerRegra(workspaceId, id);
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Modo ensaio: renderiza o que a regra faria, sem chamar o Google. Sem
  // evento no corpo, usa o ultimo evento recente compativel com o gatilho.
  app.post("/automacoes/:id/ensaiar", async (req, resposta) => {
    const { id } = req.params as { id: string };
    try {
      const workspaceId = workspaceAtivoOuErro();
      const regra = obterRegra(workspaceId, id);
      const corpo = corpoDe(req);
      const eventoDoCorpo = saneiaEventoSintetico(corpo.evento, workspaceId);
      const evento = eventoDoCorpo ?? ultimoEventoCompativel(workspaceId, regra);

      if (!evento) {
        return {
          titulo: renderizarTemplate(regra.acao.parametros.titulo, {}),
          descricao: renderizarTemplate(regra.acao.parametros.descricao ?? "", {}),
          aviso: "Nenhum evento recente compativel com o gatilho desta regra.",
        };
      }
      return renderizarRegra(regra, evento);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Ultimas execucoes do historico, da mais nova pra mais antiga.
  app.get("/automacoes/historico", async (req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      const query = req.query as { limite?: string };
      const bruto = query.limite ? Number(query.limite) : 50;
      const limite = Number.isFinite(bruto) ? Math.max(1, Math.min(500, bruto)) : 50;
      return { execucoes: lerHistorico(workspaceId, limite) };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });
};
