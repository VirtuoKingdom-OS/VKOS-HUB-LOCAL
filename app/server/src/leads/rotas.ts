import type { FastifyPluginAsync, FastifyReply } from "fastify";

import {
  criarContato,
  lerEstado,
  type Contato,
} from "../crm/estado.js";
import { chaveTelefone } from "../util/telefone.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import {
  buscarLeads,
  ErroLeads,
  LIMITE_RESULTADOS,
  type LeadEncontrado,
} from "./apify.js";
import {
  alterarStatusLead,
  ErroEstadoLeads,
  excluirLead,
  lerEstadoLeads,
  persistirBusca,
  type LeadMinerado,
  type StatusLead,
} from "./estado.js";

export interface LeadMineradoComDuplicata extends LeadMinerado {
  jaExisteNoCrm: boolean;
}

export interface ListasLeads {
  minerados: LeadMineradoComDuplicata[];
  arquivados: LeadMineradoComDuplicata[];
}

export interface ResultadoImportacao {
  importados: number;
  duplicados: number;
  contatos: Contato[];
}

function responderErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroLeads) {
    return resposta.status(erro.statusHttp).send({ erro: erro.message });
  }
  if (erro instanceof ErroEstadoLeads) {
    return resposta.status(erro.statusHttp).send({ erro: erro.message });
  }
  throw erro;
}

// Contato que a deduplicação precisa enxergar. O telefone comparado é o E.164
// já persistido; quando ele não existe, normaliza o digitado na hora.
type ContatoParaDedupe = Pick<
  Contato,
  "telefone" | "telefoneNormalizado" | "chaveExterna"
>;

// Rótulo humano que aparece na ficha do lead importado. A chave técnica NÃO
// mora mais aqui: ela vive em chaveExterna, que o usuário não edita.
const ROTULO_ORIGEM_LEAD = "Google Maps";

function chaveExternaDoLead(placeId: string): string {
  return `google-maps:${placeId}`;
}

function telefonesDosContatos(contatos: ContatoParaDedupe[]): Set<string> {
  return new Set(
    contatos
      .map((contato) => contato.telefoneNormalizado ?? chaveTelefone(contato.telefone))
      .filter(Boolean),
  );
}

function chavesExternasDosContatos(contatos: ContatoParaDedupe[]): Set<string> {
  return new Set(
    contatos
      .map((contato) => contato.chaveExterna)
      .filter((chave): chave is string => Boolean(chave)),
  );
}

export function marcarLeadsJaExistentes<T extends LeadEncontrado>(
  leads: T[],
  contatos: ContatoParaDedupe[],
): Array<T & { jaExisteNoCrm: boolean }> {
  const telefones = telefonesDosContatos(contatos);
  const chaves = chavesExternasDosContatos(contatos);
  return leads.map((lead) => {
    const telefone = chaveTelefone(lead.telefone);
    const porTelefone = Boolean(telefone && telefones.has(telefone));
    const porChave = chaves.has(chaveExternaDoLead(lead.placeId));
    return { ...lead, jaExisteNoCrm: porTelefone || porChave };
  });
}

// Leads importaveis: o LeadEncontrado da Apify mais os campos que a mineracao
// acrescenta (termo, localizacao, data). Tudo isso vira o retrato do lead na
// ficha, pra o contato importado guardar o mesmo que a lista de busca mostrava.
type LeadImportavel = LeadEncontrado & {
  termoBusca?: string;
  localizacao?: string;
  capturadoEm?: string;
};

// Monta o retrato do lead (so os campos presentes) pra gravar em contato.lead.
function retratoDoLead(lead: LeadImportavel): Record<string, unknown> {
  return {
    ...(lead.placeId ? { placeId: lead.placeId } : {}),
    ...(lead.categoria ? { categoria: lead.categoria } : {}),
    ...(lead.endereco ? { endereco: lead.endereco } : {}),
    ...(lead.site ? { site: lead.site } : {}),
    ...(lead.nota !== undefined ? { nota: lead.nota } : {}),
    ...(lead.totalAvaliacoes !== undefined ? { totalAvaliacoes: lead.totalAvaliacoes } : {}),
    ...(lead.termoBusca ? { termoBusca: lead.termoBusca } : {}),
    ...(lead.localizacao ? { localizacao: lead.localizacao } : {}),
    ...(lead.capturadoEm ? { capturadoEm: lead.capturadoEm } : {}),
  };
}

export function importarLeadsNoCrm(
  leads: LeadImportavel[],
  contatosExistentes: ContatoParaDedupe[],
  criar: (corpo: Record<string, unknown>) => Contato = criarContato,
): ResultadoImportacao {
  const telefones = telefonesDosContatos(contatosExistentes);
  const chaves = chavesExternasDosContatos(contatosExistentes);
  const contatos: Contato[] = [];
  let duplicados = 0;

  for (const lead of leads) {
    const telefone = chaveTelefone(lead.telefone);
    const chaveExterna = chaveExternaDoLead(lead.placeId);
    if ((telefone && telefones.has(telefone)) || chaves.has(chaveExterna)) {
      duplicados++;
      continue;
    }

    const contato = criar({
      nome: lead.nome,
      // O nome do lugar é a organização: vira uma Organizacao no CRM.
      empresa: lead.nome,
      ...(lead.telefone ? { telefone: lead.telefone } : {}),
      ...(lead.email ? { email: lead.email } : {}),
      origem: ROTULO_ORIGEM_LEAD,
      chaveExterna,
      tags: ["google-maps"],
      lead: retratoDoLead(lead),
    });
    contatos.push(contato);
    if (telefone) telefones.add(telefone);
    chaves.add(chaveExterna);
  }

  return { importados: contatos.length, duplicados, contatos };
}

function workspaceAtivoOuErro(): string {
  const workspaceId = idWorkspaceAtivo();
  if (!workspaceId) throw new ErroLeads("Nenhum cliente ativo.", 400);
  return workspaceId;
}

function montarListas(workspaceId: string): ListasLeads {
  const estado = lerEstadoLeads(workspaceId);
  const contatos = lerEstado().contatos;
  const marcados = marcarLeadsJaExistentes(estado.leads, contatos)
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  return {
    minerados: marcados.filter((lead) => lead.status === "minerado"),
    arquivados: marcados.filter((lead) => lead.status === "arquivado"),
  };
}

// A mineração acumula várias buscas, então o teto de importação não é o teto
// de UMA busca na Apify: importar é gravação local, sem custo por item.
const LIMITE_IMPORTACAO = 500;

function lerIds(v: unknown): string[] {
  if (!Array.isArray(v)) throw new ErroLeads("Ids precisa ser uma lista.", 400);
  const ids = [...new Set(v.filter((id): id is string => typeof id === "string"))];
  if (!ids.length) throw new ErroLeads("Selecione pelo menos um lead.", 400);
  if (ids.length > LIMITE_IMPORTACAO) {
    throw new ErroLeads(`Selecione no máximo ${LIMITE_IMPORTACAO} leads por vez.`, 400);
  }
  return ids;
}

export const rotasLeads: FastifyPluginAsync = async (app) => {
  app.get("/leads", async (_requisicao, resposta) => {
    try {
      return montarListas(workspaceAtivoOuErro());
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.post("/leads/buscar", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as Record<string, unknown>;
    const termo = typeof corpo.termo === "string" ? corpo.termo.trim() : "";
    if (!termo) {
      return resposta.status(400).send({ erro: "Informe o que você procura." });
    }
    const localizacao = typeof corpo.localizacao === "string"
      ? corpo.localizacao.trim() || undefined
      : undefined;
    const limiteBruto = typeof corpo.limite === "number" ? corpo.limite : 20;
    const limite = Math.min(LIMITE_RESULTADOS, Math.max(1, Math.trunc(limiteBruto)));
    const buscarEmails = corpo.buscarEmails !== false;

    try {
      const workspaceId = workspaceAtivoOuErro();
      const encontrados = await buscarLeads(workspaceId, termo, {
        localizacao,
        limite,
        buscarEmails,
      });
      const resumo = persistirBusca(
        workspaceId,
        encontrados,
        termo,
        localizacao,
      );
      return { ...montarListas(workspaceId), resumo };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.patch("/leads/:id", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const corpo = (requisicao.body ?? {}) as Record<string, unknown>;
    const status = corpo.status as StatusLead;
    if (status !== "minerado" && status !== "arquivado") {
      return resposta.status(400).send({ erro: "Status de lead inválido." });
    }
    try {
      const workspaceId = workspaceAtivoOuErro();
      alterarStatusLead(workspaceId, id, status);
      return montarListas(workspaceId);
    } catch (erro) {
      if (erro instanceof Error && /não encontrado/i.test(erro.message)) {
        return resposta.status(404).send({ erro: erro.message });
      }
      return responderErro(erro, resposta);
    }
  });

  app.delete("/leads/:id", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    try {
      const workspaceId = workspaceAtivoOuErro();
      if (!excluirLead(workspaceId, id)) {
        return resposta.status(404).send({ erro: "Lead não encontrado." });
      }
      return montarListas(workspaceId);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.post("/leads/importar", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as Record<string, unknown>;
    try {
      const workspaceId = workspaceAtivoOuErro();
      const ids = lerIds(corpo.ids);
      const porId = new Map(
        lerEstadoLeads(workspaceId).leads.map((lead) => [lead.id, lead]),
      );
      const leads = ids
        .map((id) => porId.get(id))
        .filter((lead): lead is LeadMinerado => Boolean(lead));
      if (leads.length !== ids.length) {
        throw new ErroLeads("Um dos leads selecionados não existe mais.", 404);
      }
      const resultado = importarLeadsNoCrm(leads, lerEstado().contatos);
      return { ...resultado, listas: montarListas(workspaceId) };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });
};
