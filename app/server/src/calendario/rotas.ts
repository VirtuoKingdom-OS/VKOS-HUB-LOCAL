// Rotas REST da tela Calendario. Montado sob /api pelo index.ts. O Calendario e
// local-first: por padrao trabalha com a agenda LOCAL do workspace (eventosLocais),
// que funciona sem Google. O Google Calendar e uma sincronizacao opcional: quando
// ligada e conectada, entra o "modo google", e a tela passa a operar direto na
// agenda principal do Google (mesmo shape de resposta). Erros no formato { erro }
// com status certo, mesmo padrao das outras rotas do server.

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import {
  ErroCalendar,
  atualizarEvento,
  criarEvento,
  excluirEvento,
  listarEventos,
  type DadosEvento,
  type Evento,
} from "../google/calendar.js";
import { ErroOAuth } from "../google/oauth.js";
import { lerConexoes } from "../conexoes/estado.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import {
  atualizarEspelhoPorGoogleId,
  atualizarEventoLocal,
  criarEventoLocal,
  definirSincronizarCrm,
  definirSincronizarGoogle,
  enviarLocaisAoGoogle,
  guardarEspelhoLocal,
  lerConfigCalendario,
  listarEventosLocais,
  modoGoogle,
  removerEspelhoPorGoogleId,
  removerEventoLocal,
  type EventoLocal,
} from "./eventosLocais.js";
import { sincronizarTudo } from "./sincronizacao.js";

// A agenda do Google e sempre a principal da conta conectada.
const AGENDA = "primary";

class ErroCalendario extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroCalendario";
    this.status = status;
  }
}

// Traduz os erros de dominio em resposta HTTP. Erro inesperado sobe pro
// handler global do Fastify.
function responderErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (
    erro instanceof ErroCalendario ||
    erro instanceof ErroCalendar ||
    erro instanceof ErroOAuth
  ) {
    return resposta.status(erro.status || 400).send({ erro: erro.message });
  }
  throw erro;
}

function workspaceAtivoOuErro(): string {
  const id = idWorkspaceAtivo();
  if (!id) {
    throw new ErroCalendario("Nenhum cliente ativo. Abra um workspace pra usar o calendario.", 409);
  }
  return id;
}

// Estado da conexao do Google do workspace: conectado quando o refreshToken foi
// salvo pelo fluxo de conectar. contaEmail e informativo, nunca segredo.
function estadoConexao(workspaceId: string): { conectado: boolean; contaEmail: string } {
  const servidor = lerConexoes(workspaceId).servidores["googlecalendar"];
  return {
    conectado: !!servidor?.config.refreshToken,
    contaEmail: servidor?.config.contaEmail ?? "",
  };
}

// Data ISO valida ou erro 400 com o nome do campo.
function isoOuErro(v: unknown, campo: string): string {
  if (typeof v !== "string" || !v.trim() || Number.isNaN(Date.parse(v))) {
    throw new ErroCalendario(`Campo ${campo} precisa ser uma data valida.`);
  }
  return new Date(v).toISOString();
}

function corpoDe(req: FastifyRequest): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

// Valida o corpo de criar/atualizar evento. No atualizar, os campos sao
// opcionais, mas quando vem, valem as mesmas regras.
function dadosEventoDe(corpo: Record<string, unknown>, parcial: boolean): Partial<DadosEvento> {
  const dados: Partial<DadosEvento> = {};
  if (!parcial || corpo.titulo !== undefined) {
    if (typeof corpo.titulo !== "string" || !corpo.titulo.trim()) {
      throw new ErroCalendario("Campo titulo e obrigatorio.");
    }
    dados.titulo = corpo.titulo.trim();
  }
  if (!parcial || corpo.inicioIso !== undefined) {
    dados.inicioIso = isoOuErro(corpo.inicioIso, "inicioIso");
  }
  if (!parcial || corpo.fimIso !== undefined) {
    dados.fimIso = isoOuErro(corpo.fimIso, "fimIso");
  }
  if (dados.inicioIso && dados.fimIso && dados.fimIso <= dados.inicioIso) {
    throw new ErroCalendario("O fim do evento precisa ser depois do inicio.");
  }
  if (corpo.descricao !== undefined) {
    if (typeof corpo.descricao !== "string") {
      throw new ErroCalendario("Campo descricao precisa ser texto.");
    }
    dados.descricao = corpo.descricao;
  }
  return dados;
}

// Traduz um evento local pro mesmo shape de resposta do evento do Google. Local
// nao tem link.
function eventoLocalParaResposta(e: EventoLocal): Evento {
  const evento: Evento = { id: e.id, titulo: e.titulo, inicioIso: e.inicioIso, fimIso: e.fimIso };
  if (e.descricao !== undefined) evento.descricao = e.descricao;
  return evento;
}

export const rotasCalendario: FastifyPluginAsync = async (app) => {
  // Estado do calendario, pro frontend decidir o que mostrar e como.
  app.get("/calendario", async (_req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      const config = lerConfigCalendario(workspaceId);
      return {
        ...estadoConexao(workspaceId),
        sincronizarCrm: config.sincronizarCrm,
        sincronizarGoogle: config.sincronizarGoogle,
      };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Liga ou desliga a sincronizacao CRM > agenda. Funciona no modo local tambem
  // (nao exige Google). Ao ligar, roda a sincronizacao inicial de todos os
  // cartoes com proximo contato e devolve o resumo.
  app.post("/calendario/sincronizar-crm", async (req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      const corpo = corpoDe(req);
      if (typeof corpo.ligado !== "boolean") {
        throw new ErroCalendario("Campo ligado precisa ser true ou false.");
      }
      definirSincronizarCrm(workspaceId, corpo.ligado);
      if (!corpo.ligado) {
        return { ligado: false };
      }
      const resumo = await sincronizarTudo(workspaceId);
      return { ligado: true, ...resumo };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Liga ou desliga a sincronizacao com o Google Calendar. Ligar exige o Google
  // conectado e envia pro Google todos os eventos locais que ainda nao tem copia.
  // Desligar so grava a flag: nada e apagado em lugar nenhum.
  app.post("/calendario/sincronizar-google", async (req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      const corpo = corpoDe(req);
      if (typeof corpo.ligado !== "boolean") {
        throw new ErroCalendario("Campo ligado precisa ser true ou false.");
      }
      if (!corpo.ligado) {
        definirSincronizarGoogle(workspaceId, false);
        return { ligado: false };
      }
      if (!estadoConexao(workspaceId).conectado) {
        throw new ErroCalendario(
          "Conecte o Google Calendar na tela Conexoes antes de ligar a sincronizacao.",
          409,
        );
      }
      definirSincronizarGoogle(workspaceId, true);
      const { enviados, erros } = await enviarLocaisAoGoogle(workspaceId);
      return { ligado: true, enviados, erros };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Eventos no intervalo pedido (query de e ate, ISO). No modo google, lista da
  // agenda principal do Google; senao, da agenda local. Mesmo shape.
  app.get("/calendario/eventos", async (req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      const q = req.query as { de?: string; ate?: string };
      const de = isoOuErro(q.de, "de");
      const ate = isoOuErro(q.ate, "ate");
      if (modoGoogle(workspaceId)) {
        const eventos = await listarEventos(workspaceId, AGENDA, de, ate);
        return { eventos };
      }
      const eventos = listarEventosLocais(workspaceId, de, ate).map(eventoLocalParaResposta);
      return { eventos };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Criar evento. No modo google, cria no Google e guarda um espelho local (com
  // googleId), pra desligar o Google depois nao sumir com o evento. Senao, cria
  // direto na agenda local.
  app.post("/calendario/eventos", async (req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      const dados = dadosEventoDe(corpoDe(req), false) as DadosEvento;
      if (modoGoogle(workspaceId)) {
        const evento = await criarEvento(workspaceId, AGENDA, dados);
        guardarEspelhoLocal(workspaceId, evento);
        return resposta.status(201).send({ evento });
      }
      const local = await criarEventoLocal(workspaceId, dados);
      return resposta.status(201).send({ evento: eventoLocalParaResposta(local) });
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Atualizar um evento (campos parciais). No modo google, o id e do Google:
  // aplica no Google e, se ha espelho local com esse googleId, atualiza junto.
  // Senao, o id e do evento local.
  app.patch("/calendario/eventos/:id", async (req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      const { id } = req.params as { id: string };
      if (!id.trim()) {
        throw new ErroCalendario("Evento invalido.");
      }
      const dados = dadosEventoDe(corpoDe(req), true);
      if (modoGoogle(workspaceId)) {
        const evento = await atualizarEvento(workspaceId, AGENDA, id, dados);
        atualizarEspelhoPorGoogleId(workspaceId, id, dados);
        return { evento };
      }
      const local = await atualizarEventoLocal(workspaceId, id, dados);
      if (!local) {
        throw new ErroCalendario("Evento nao encontrado.", 404);
      }
      return { evento: eventoLocalParaResposta(local) };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Excluir um evento. No modo google, o id e do Google: exclui no Google e, se
  // ha espelho local, remove junto. Senao, o id e do evento local.
  app.delete("/calendario/eventos/:id", async (req, resposta) => {
    try {
      const workspaceId = workspaceAtivoOuErro();
      const { id } = req.params as { id: string };
      if (!id.trim()) {
        throw new ErroCalendario("Evento invalido.");
      }
      if (modoGoogle(workspaceId)) {
        await excluirEvento(workspaceId, AGENDA, id);
        removerEspelhoPorGoogleId(workspaceId, id);
        return { ok: true };
      }
      const removido = await removerEventoLocal(workspaceId, id);
      if (!removido) {
        throw new ErroCalendario("Evento nao encontrado.", 404);
      }
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });
};
