// Rotas REST das conversas. Montado sob /api pelo index.ts.
//
// O caminho fica embaixo de /crm de proposito: conversa e dado do CRM, mora na
// pasta do CRM e nao existe sem contato. O modulo e proprio, a URL e da familia
// certa.
//
// Mesmo formato de erro do crm/rotas.ts: { erro: mensagem }, 400 payload
// invalido, 404 id que nao existe, 409 indice corrompido, 201 na criacao.

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { avisarMensagens, deveAvisar, escopoDaRotaMensagens } from "./aovivo.js";
import { listarCanais } from "./canais/index.js";
import {
  ErroMensagens,
  abrirConversa,
  atualizarConversa,
  criarConversa,
  linhaDoTempoDoContato,
  listarConversas,
  marcarComoLida,
  registrarMensagem,
} from "./estado.js";

function responderErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroMensagens) {
    return resposta.status(erro.status).send({ erro: erro.message });
  }
  throw erro;
}

function corpoDe(req: FastifyRequest): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

function idDe(req: FastifyRequest): string {
  return (req.params as { id: string }).id;
}

function consultaDe(req: FastifyRequest): Record<string, unknown> {
  return (req.query ?? {}) as Record<string, unknown>;
}

export const rotasMensagens: FastifyPluginAsync = async (app) => {
  // Toda gravacao bem sucedida avisa as abas. Fica num hook e nao em cada rota
  // pelo mesmo motivo do CRM: a rota que esquecesse de avisar viraria uma tela
  // desatualizada em silencio, o bug mais caro de achar. Um aviso a mais custa
  // um fetch; um aviso a menos custa a conversa parecer parada.
  app.addHook("onResponse", async (req, resposta) => {
    if (!deveAvisar(req.method, resposta.statusCode)) return;
    avisarMensagens({
      escopo: escopoDaRotaMensagens(req.routeOptions.url ?? req.url),
      conversaId: (req.params as { id?: string } | undefined)?.id,
      origem: req.headers["x-vkos-aba"],
    });
  });

  // O que cada canal consegue fazer. A tela le daqui em vez de perguntar "e
  // manual?": quando o WhatsApp entrar, o relogio da janela de 24 horas e o
  // seletor de template aparecem sozinhos.
  app.get("/crm/mensagens/canais", async () => ({
    canais: listarCanais().map((canal) => ({
      id: canal.id,
      rotulo: canal.rotulo,
      capacidades: canal.capacidades,
    })),
  }));

  // Coluna da esquerda: as conversas, mais recentes primeiro. Filtra por
  // contato ou por status. Nao devolve mensagem nenhuma, so previa.
  app.get("/crm/mensagens/conversas", async (req, resposta) => {
    try {
      const consulta = consultaDe(req);
      return {
        conversas: listarConversas({
          contatoId: consulta.contatoId,
          status: consulta.status,
        }),
      };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Abre uma conversa a partir de um contato. Contato e obrigatorio: conversa
  // solta nao existe. Conversa que ja existia volta com 200 em vez de virar uma
  // segunda caixa de entrada do mesmo cliente.
  app.post("/crm/mensagens/conversas", async (req, resposta) => {
    try {
      const { conversa, criada } = criarConversa(corpoDe(req));
      return resposta.status(criada ? 201 : 200).send(conversa);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Abre a thread paginada. A conversa cresce sem teto, entao a resposta e
  // sempre uma pagina: por padrao a mais nova, e "antesDe" caminha pra tras.
  app.get("/crm/mensagens/conversas/:id", async (req, resposta) => {
    try {
      const consulta = consultaDe(req);
      return abrirConversa(idDe(req), {
        limite: consulta.limite,
        antesDe: consulta.antesDe,
      });
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Registra uma mensagem na conversa. No canal manual, e o usuario contando o
  // que foi dito por fora, com data retroativa em "enviadaEm".
  app.post("/crm/mensagens/conversas/:id/mensagens", async (req, resposta) => {
    try {
      const { mensagem, criada } = registrarMensagem(idDe(req), corpoDe(req));
      return resposta.status(criada ? 201 : 200).send(mensagem);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Zera as nao lidas e move o cursor de leitura. Nao reescreve mensagem.
  app.post("/crm/mensagens/conversas/:id/lida", async (req, resposta) => {
    try {
      return marcarComoLida(idDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Muda status (aberta, aguardando, resolvida, adiada) e o negocio ligado.
  // Adiar exige a data pra retomar.
  app.patch("/crm/mensagens/conversas/:id", async (req, resposta) => {
    try {
      return atualizarConversa(idDe(req), corpoDe(req));
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // A linha do tempo unificada da ficha: interacoes e mensagens intercaladas,
  // mais novas primeiro. E view, nao copia.
  app.get("/crm/contatos/:id/linha-do-tempo", async (req, resposta) => {
    try {
      return {
        itens: linhaDoTempoDoContato(idDe(req), { limite: consultaDe(req).limite }),
      };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });
};
