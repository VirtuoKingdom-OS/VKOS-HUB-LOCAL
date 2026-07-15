// Executor de automacoes: assina o barramento de eventos no boot e, pra cada
// evento que chega, avalia as regras ATIVAS do workspace do evento (gatilho +
// filtro), renderiza os templates e executa a acao. Automacao deterministica
// nunca gasta sessao de IA: chamada direta na API do Google Calendar.
//
// Sem proximoContato no cartao: nao chama o Google, registra "pendente". Erro
// do Calendar (sem conexao, token expirado, etc): registra "erro" com a
// mensagem honesta, nunca derruba o executor nem os outros assinantes.

import { assinar, lerEventosRecentes, type EventoDominio } from "../eventos/barramento.js";
import { ErroCalendar, FUSO_PADRAO, criarEvento } from "../google/calendar.js";
import { listarRegras, registrarExecucao, type Regra } from "./estado.js";

const DURACAO_PADRAO_MIN = 60;

let iniciado = false;

// Liga o executor: assina "*" no barramento. Idempotente, seguro de chamar
// mais de uma vez (o boot so chama uma, mas nao ha risco de assinar 2x).
export function iniciarExecutor(): void {
  if (iniciado) return;
  iniciado = true;
  assinar("*", (evento) => {
    void processarEvento(evento);
  });
}

async function processarEvento(evento: EventoDominio): Promise<void> {
  let regras: Regra[];
  try {
    regras = listarRegras(evento.workspaceId).filter((r) => r.ativa);
  } catch (erro) {
    console.error(`[automacoes] falha ao carregar regras do workspace ${evento.workspaceId}:`, erro);
    return;
  }
  for (const regra of regras) {
    if (!regraCompativel(regra, evento)) continue;
    try {
      await executarRegra(regra, evento);
    } catch (erro) {
      // Defesa extra: executarRegra ja trata os erros esperados (Calendar,
      // pendencia), mas um erro inesperado aqui tambem nao pode derrubar o
      // processamento das outras regras nem do assinante seguinte.
      console.error(`[automacoes] regra ${regra.id} falhou de forma inesperada:`, erro);
    }
  }
}

// Compara o gatilho de uma regra com um evento: tipo igual e, se houver
// filtro, igualdade rasa campo a campo contra evento.dados (ex:
// { colunaPara: "<id>" } compara com dados.colunaPara).
export function regraCompativel(regra: Regra, evento: EventoDominio): boolean {
  if (regra.gatilho.evento !== evento.tipo) return false;
  const filtro = regra.gatilho.filtro;
  if (!filtro) return true;
  for (const [campo, valor] of Object.entries(filtro)) {
    if (String(evento.dados[campo] ?? "") !== valor) return false;
  }
  return true;
}

// Variaveis disponiveis pro template, extraidas do contato do evento e dos
// nomes de coluna (movido usa nomeColunaPara, sem isso cai pra nomeColunaDe).
// Variavel ausente vira string vazia, nunca "undefined" no texto.
export function variaveisDoEvento(evento: EventoDominio): Record<string, string> {
  const contato = (evento.dados.contato ?? {}) as Record<string, unknown>;
  const coluna =
    typeof evento.dados.nomeColunaPara === "string"
      ? evento.dados.nomeColunaPara
      : typeof evento.dados.nomeColunaDe === "string"
        ? evento.dados.nomeColunaDe
        : "";
  return {
    nome: typeof contato.nome === "string" ? contato.nome : "",
    empresa: typeof contato.empresa === "string" ? contato.empresa : "",
    coluna,
    valorEstimado: typeof contato.valorEstimado === "number" ? String(contato.valorEstimado) : "",
    proximoContato: typeof contato.proximoContato === "string" ? contato.proximoContato : "",
  };
}

// Troca {{variavel}} pelo valor do mapa. Chave ausente vira "".
export function renderizarTemplate(template: string, variaveis: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, chave: string) => variaveis[chave] ?? "");
}

// O que uma regra faria contra um evento: titulo, descricao e, quando ha
// proximoContato valido, as datas de inicio e fim. aviso quando nao da pra
// datar o evento (usado tanto pelo executor real quanto pelo modo ensaio).
export interface RegraRenderizada {
  titulo: string;
  descricao: string;
  inicioIso?: string;
  fimIso?: string;
  aviso?: string;
}

export function renderizarRegra(regra: Regra, evento: EventoDominio): RegraRenderizada {
  const variaveis = variaveisDoEvento(evento);
  const titulo = renderizarTemplate(regra.acao.parametros.titulo, variaveis);
  const descricao = renderizarTemplate(regra.acao.parametros.descricao ?? "", variaveis);

  if (!variaveis.proximoContato) {
    return { titulo, descricao, aviso: "Cartao sem proximo contato." };
  }
  const inicioMs = Date.parse(variaveis.proximoContato);
  if (Number.isNaN(inicioMs)) {
    return { titulo, descricao, aviso: "Proximo contato do cartao nao e uma data valida." };
  }
  const duracaoMin = Number(regra.acao.parametros.duracaoMin) || DURACAO_PADRAO_MIN;
  const inicioIso = new Date(inicioMs).toISOString();
  const fimIso = new Date(inicioMs + duracaoMin * 60_000).toISOString();
  return { titulo, descricao, inicioIso, fimIso };
}

async function executarRegra(regra: Regra, evento: EventoDominio): Promise<void> {
  const render = renderizarRegra(regra, evento);

  if (!render.inicioIso || !render.fimIso) {
    registrarExecucao(evento.workspaceId, {
      em: new Date().toISOString(),
      regraId: regra.id,
      regraNome: regra.nome,
      evento: evento.tipo,
      status: "pendente",
      detalhe: render.aviso ?? "Cartao sem proximo contato.",
    });
    return;
  }

  const agenda = regra.acao.parametros.agenda?.trim() || "primary";
  try {
    const criado = await criarEvento(evento.workspaceId, agenda, {
      titulo: render.titulo,
      descricao: render.descricao,
      inicioIso: render.inicioIso,
      fimIso: render.fimIso,
      timeZone: FUSO_PADRAO,
    });
    registrarExecucao(evento.workspaceId, {
      em: new Date().toISOString(),
      regraId: regra.id,
      regraNome: regra.nome,
      evento: evento.tipo,
      status: "sucesso",
      detalhe: criado.link ?? "Evento criado na agenda.",
    });
  } catch (erro) {
    const mensagem =
      erro instanceof ErroCalendar ? erro.message : "Erro inesperado ao criar o evento na agenda.";
    registrarExecucao(evento.workspaceId, {
      em: new Date().toISOString(),
      regraId: regra.id,
      regraNome: regra.nome,
      evento: evento.tipo,
      status: "erro",
      detalhe: mensagem,
    });
    if (!(erro instanceof ErroCalendar)) {
      console.error(`[automacoes] regra ${regra.id} falhou ao criar evento:`, erro);
    }
  }
}

// Acha o ultimo evento recente do workspace compativel com o gatilho da
// regra (tipo + filtro). Usado pelo modo ensaio quando a rota nao recebe um
// evento sintetico no corpo. null quando nao ha nenhum compativel no log.
export function ultimoEventoCompativel(workspaceId: string, regra: Regra): EventoDominio | null {
  const recentes = lerEventosRecentes(workspaceId, 200);
  for (const evento of recentes) {
    if (regraCompativel(regra, evento)) return evento;
  }
  return null;
}
