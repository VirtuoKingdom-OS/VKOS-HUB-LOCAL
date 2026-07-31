// Rotas do painel de leads do formulario do site.
//
// Decisao de 2026-07-29: o CRM manda no funil, o Supabase e caixa de entrada.
// Quem sabe se um lead ja virou contato e o crm.json local, pela chaveExterna.
// O status la do outro lado e cortesia pra quem abrir o Supabase direto.
// Ver docs/decisoes/2026-07-29-leads-do-formulario-do-site.md.

import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { avisarCrm } from "../crm/aovivo.js";
import { criarContato, lerEstado, type Contato } from "../crm/estado.js";
import { chaveTelefone } from "../util/telefone.js";
import {
  ErroFormulario,
  listarLeads,
  marcarComoContatado,
  type LeadFormulario,
} from "./supabase.js";

export interface LeadComDuplicata extends LeadFormulario {
  // Ja tem contato no CRM com esta chave externa ou este telefone.
  jaExisteNoCrm: boolean;
}

export interface ListaFormulario {
  novos: LeadComDuplicata[];
  noFunil: LeadComDuplicata[];
  temMais: boolean;
}

export interface ResultadoImportacao {
  importados: number;
  duplicados: number;
  contatos: Contato[];
  // Ids no Supabase dos que entraram agora. Devolvidos explicitamente pra nao
  // ter que reextrair da chaveExterna por fatia de texto.
  idsImportados: string[];
}

// Rotulo humano da ficha. A chave tecnica mora em chaveExterna, que o usuario
// nao edita: e a mesma separacao que a mineracao do Google Maps faz.
const ROTULO_ORIGEM = "Formulário do site";
const PREFIXO_CHAVE = "formulario-site";
const LIMITE_IMPORTACAO = 200;

type ContatoParaDedupe = Pick<
  Contato,
  "telefone" | "telefoneNormalizado" | "chaveExterna"
>;

export function chaveExternaDoLead(id: string): string {
  return `${PREFIXO_CHAVE}:${id}`;
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

export function marcarJaExistentes(
  leads: LeadFormulario[],
  contatos: ContatoParaDedupe[],
): LeadComDuplicata[] {
  const telefones = telefonesDosContatos(contatos);
  const chaves = chavesExternasDosContatos(contatos);
  return leads.map((lead) => {
    const telefone = chaveTelefone(lead.whatsapp);
    const porTelefone = Boolean(telefone && telefones.has(telefone));
    return {
      ...lead,
      jaExisteNoCrm: porTelefone || chaves.has(chaveExternaDoLead(lead.id)),
    };
  });
}

// Retrato pra ficha do contato. So os campos presentes, no molde do
// retratoDoLead da mineracao.
function retratoDoFormulario(lead: LeadFormulario): Record<string, unknown> {
  return {
    leadId: lead.id,
    recebidoEm: lead.criadoEm,
    ...(lead.negocio ? { negocio: lead.negocio } : {}),
    ...(lead.faturamento ? { faturamento: lead.faturamento } : {}),
    ...(lead.papelMarketing ? { papelMarketing: lead.papelMarketing } : {}),
    ...(lead.dores.length > 0 ? { dores: lead.dores } : {}),
    ...(lead.gatilho ? { gatilho: lead.gatilho } : {}),
    ...(lead.tentativas ? { tentativas: lead.tentativas } : {}),
    ...(lead.decisao ? { decisao: lead.decisao } : {}),
    ...(lead.investimento ? { investimento: lead.investimento } : {}),
    ...(lead.horario ? { horario: lead.horario } : {}),
    temperatura: lead.temperatura,
    ...(lead.origem ? { origem: lead.origem } : {}),
    ...(lead.referrer ? { referrer: lead.referrer } : {}),
  };
}

export function importarNoCrm(
  leads: LeadFormulario[],
  contatosExistentes: ContatoParaDedupe[],
  criar: (corpo: Record<string, unknown>) => Contato = criarContato,
): ResultadoImportacao {
  const telefones = telefonesDosContatos(contatosExistentes);
  const chaves = chavesExternasDosContatos(contatosExistentes);
  const contatos: Contato[] = [];
  const idsImportados: string[] = [];
  let duplicados = 0;

  for (const lead of leads) {
    const telefone = chaveTelefone(lead.whatsapp);
    const chaveExterna = chaveExternaDoLead(lead.id);
    if ((telefone && telefones.has(telefone)) || chaves.has(chaveExterna)) {
      duplicados++;
      continue;
    }

    const contato = criar({
      nome: lead.nome,
      // "negocio" e a frase que descreve o negocio, nao a razao social. Virar
      // Organizacao deixaria o CRM cheio de organizacao com nome de frase.
      ...(lead.whatsapp ? { telefone: lead.whatsapp } : {}),
      origem: ROTULO_ORIGEM,
      chaveExterna,
      // A temperatura vira tag pra o funil poder filtrar por ela sem abrir a
      // ficha. Ela nunca muda depois: sai das respostas, que sao historico.
      tags: [PREFIXO_CHAVE, `lead-${lead.temperatura}`],
      formulario: retratoDoFormulario(lead),
    });
    contatos.push(contato);
    idsImportados.push(lead.id);
    if (telefone) telefones.add(telefone);
    chaves.add(chaveExterna);
  }

  return { importados: contatos.length, duplicados, contatos, idsImportados };
}

function responderErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroFormulario) {
    return resposta.status(erro.statusHttp).send({ erro: erro.message });
  }
  throw erro;
}

function lerIds(valor: unknown): string[] {
  if (!Array.isArray(valor)) {
    throw new ErroFormulario("Ids precisa ser uma lista.", 400);
  }
  const ids = [...new Set(valor.filter((id): id is string => typeof id === "string"))];
  if (!ids.length) throw new ErroFormulario("Selecione pelo menos um lead.", 400);
  if (ids.length > LIMITE_IMPORTACAO) {
    throw new ErroFormulario(
      `Selecione no máximo ${LIMITE_IMPORTACAO} leads por vez.`,
      400,
    );
  }
  return ids;
}

// Parte a lista pelo que o CRM local sabe, nao pelo status do Supabase. Se a
// escrita de cortesia la falhar, o lead nao volta pra "Novos" por causa disso.
function montarListas(leitura: {
  leads: LeadFormulario[];
  temMais: boolean;
}): ListaFormulario {
  const marcados = marcarJaExistentes(leitura.leads, lerEstado().contatos);
  return {
    novos: marcados.filter((lead) => !lead.jaExisteNoCrm),
    noFunil: marcados.filter((lead) => lead.jaExisteNoCrm),
    temMais: leitura.temMais,
  };
}

export const rotasFormulario: FastifyPluginAsync = async (app) => {
  app.get("/formulario/leads", async (_requisicao, resposta) => {
    try {
      return montarListas(await listarLeads());
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  app.post("/formulario/importar", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as Record<string, unknown>;
    try {
      const ids = lerIds(corpo.ids);
      const leitura = await listarLeads();
      const porId = new Map(leitura.leads.map((lead) => [lead.id, lead]));
      const leads = ids
        .map((id) => porId.get(id))
        .filter((lead): lead is LeadFormulario => Boolean(lead));
      if (leads.length !== ids.length) {
        throw new ErroFormulario("Um dos leads selecionados não existe mais.", 404);
      }

      const resultado = importarNoCrm(leads, lerEstado().contatos);

      // Importar cria contato por fora das rotas do CRM, entao o hook de aviso
      // de la nao alcanca esta rota. Sem esta linha, a aba com o CRM aberto so
      // veria os contatos novos depois de um F5.
      if (resultado.importados > 0) {
        avisarCrm({ escopo: "funil", origem: requisicao.headers["x-vkos-aba"] });
      }

      // Cortesia, e por isso nunca derruba a importacao: o contato ja esta
      // gravado no disco, e a chaveExterna ja impede importar de novo.
      let avisoStatus: string | undefined;
      if (resultado.idsImportados.length > 0) {
        try {
          await marcarComoContatado(resultado.idsImportados);
        } catch {
          avisoStatus =
            "Os contatos entraram no funil, mas não deu pra marcar como contatado no Supabase.";
        }
      }

      // Reusa a leitura que ja foi feita. O que decide a divisao das listas e o
      // crm.json, que montarListas le fresco, entao reler o Supabase aqui so
      // gastaria uma ida na rede pra chegar no mesmo lugar.
      return {
        ...resultado,
        ...(avisoStatus ? { avisoStatus } : {}),
        listas: montarListas(leitura),
      };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });
};
