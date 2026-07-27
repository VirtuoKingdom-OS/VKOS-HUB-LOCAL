// Regras puras do CRM: o que a tela do dia mostra, o que esfria, o que a busca
// encontra e pra quando o snooze empurra.
//
// Fica fora do componente de proposito. Toda essa logica tinha nascido dentro
// do JSX da VisaoHoje, onde o contador podia mentir (a lista era cortada antes
// de o total ser lido) e nada disso dava pra testar.

import type {
  Coluna,
  Contato,
  Negocio,
  Orcamento,
  Organizacao,
  Tarefa,
} from "../../api/crm";

const MS_DIA = 24 * 60 * 60 * 1000;

// Teto de itens exibidos por bloco. O total real continua sendo contado antes
// do corte: quem tem 87 esquecidos precisa ver 87, nao 10.
export const TETO_POR_BLOCO = 10;

// Dia no fuso local, no formato AAAA-MM-DD. Comparar dia com dia evita o erro
// classico de "vence hoje as 09h" aparecer como atrasado as 10h.
export function diaLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function diaDoIso(iso: string): string | null {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : diaLocal(data);
}

function instante(iso: string | undefined): number {
  if (!iso) return Number.NaN;
  return Date.parse(iso);
}

// ------------------------------------------------------------------ busca

// So os digitos de um texto. Serve pra achar "31999998888" quando o telefone
// esta gravado como "(31) 99999-8888".
export function soDigitos(texto: string): string {
  return texto.replace(/\D+/g, "");
}

function contem(alvo: string | undefined, termo: string): boolean {
  return !!alvo && alvo.toLocaleLowerCase("pt-BR").includes(termo);
}

// Busca de contato. Cobre nome, organizacao, telefone (digitado e normalizado),
// email, origem, tags e a categoria do lead. O caso que motivou isto: chegou um
// numero desconhecido e a busca por nome nao respondia quem era.
export function contatoCombina(
  contato: Contato,
  termo: string,
  nomeOrganizacao?: string,
): boolean {
  const limpo = termo.trim();
  if (!limpo) return true;
  const t = limpo.toLocaleLowerCase("pt-BR");
  if (
    contem(contato.nome, t) ||
    contem(nomeOrganizacao, t) ||
    contem(contato.email, t) ||
    contem(contato.origem, t) ||
    contem(contato.lead?.categoria, t) ||
    contato.tags.some((tag) => contem(tag, t))
  ) {
    return true;
  }
  const digitos = soDigitos(limpo);
  if (digitos.length < 3) return false;
  return (
    soDigitos(contato.telefone ?? "").includes(digitos) ||
    soDigitos(contato.telefoneNormalizado ?? "").includes(digitos)
  );
}

// ----------------------------------------------------------------- snooze

export interface PresetSnooze {
  chave: string;
  rotulo: string;
  dias?: number;
  meses?: number;
}

// Presets de um clique. Sem eles a tela do dia acumula lixo e morre em tres
// semanas: quem nao consegue adiar acaba ignorando a lista inteira.
export const PRESETS_SNOOZE: readonly PresetSnooze[] = [
  { chave: "amanha", rotulo: "Amanhã", dias: 1 },
  { chave: "tres-dias", rotulo: "+3 dias", dias: 3 },
  { chave: "semana", rotulo: "Semana que vem", dias: 7 },
  { chave: "mes", rotulo: "+1 mês", meses: 1 },
];

function ultimoDiaDoMes(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
}

// Nova data do item adiado. Snooze GRAVA data, nunca esconde: o item some da
// lista de hoje porque venceu pra frente, e volta sozinho no dia certo.
export function dataDoSnooze(base: Date, preset: PresetSnooze): string {
  const data = new Date(base.getTime());
  if (preset.meses) {
    const dia = data.getDate();
    // Zera o dia antes de somar o mes, senao 31 de janeiro vira 3 de marco.
    data.setDate(1);
    data.setMonth(data.getMonth() + preset.meses);
    data.setDate(Math.min(dia, ultimoDiaDoMes(data)));
  }
  if (preset.dias) data.setDate(data.getDate() + preset.dias);
  return data.toISOString();
}

// -------------------------------------------------------------- follow-up

// Pra quando o follow-up vai depois de registrar uma interacao. Este e o
// conserto do buraco que fazia o nome ficar "Atrasado" pra sempre: nada limpava
// o proximoContato. Com cadencia, o follow-up ja renasce na data seguinte; sem
// cadencia, ele simplesmente fecha.
export function proximoContatoAposInteracao(contato: Contato, agora: Date): string | null {
  if (!contato.cadenciaDias) return null;
  const data = new Date(agora.getTime());
  data.setDate(data.getDate() + contato.cadenciaDias);
  return data.toISOString();
}

// So vale gastar uma requisicao quando existe follow-up marcado ou cadencia.
export function precisaResolverFollowUp(contato: Contato): boolean {
  return !!contato.proximoContato || !!contato.cadenciaDias;
}

// ------------------------------------------------------- apodrecimento

// Tem compromisso marcado pra frente? Entao nao esta esquecido, esta agendado.
export function temAcaoFutura(
  proximoContato: string | undefined,
  negocios: Negocio[],
  agora: Date,
): boolean {
  const limite = agora.getTime();
  if (instante(proximoContato) > limite) return true;
  return negocios.some(
    (negocio) => negocio.status === "aberto" && instante(negocio.proximaAcaoEm) > limite,
  );
}

// Apodrecimento por estagio, com o limite de dias que a coluna define.
//
// REGRA QUE VALE OURO: negocio com proxima acao marcada no futuro NAO esfria.
// O Pipedrive erra isso e enche a tela de alerta de gente que ja tem reuniao
// marcada, ate o usuario parar de olhar a tela.
export function estaEsfriando(entrada: {
  coluna: Coluna | undefined;
  ultimaInteracaoEm: string | undefined;
  proximoContato: string | undefined;
  negocios: Negocio[];
  agora: Date;
}): boolean {
  const { coluna, ultimaInteracaoEm, proximoContato, negocios, agora } = entrada;
  // Ganho e perdido nao esfriam: o ciclo deles acabou.
  if (!coluna || coluna.tipo !== "aberto") return false;
  const dias = coluna.diasParaEsfriar;
  if (!dias || dias <= 0) return false;
  if (temAcaoFutura(proximoContato, negocios, agora)) return false;
  const ultima = instante(ultimaInteracaoEm);
  if (Number.isNaN(ultima)) return false;
  return agora.getTime() - ultima > dias * MS_DIA;
}

// ------------------------------------------------------------------ funil

export interface ResumoFunil {
  // O numero principal: o que ainda da pra ganhar.
  emAberto: number;
  negociosAbertos: number;
  ganhoNoMes: number;
  negociosGanhosNoMes: number;
  perdidoNoMes: number;
  negociosPerdidosNoMes: number;
}

function noMesDe(iso: string | undefined, agora: Date): boolean {
  if (!iso) return false;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return false;
  return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth();
}

// Separa aberto, ganho e perdido. Somar os tres no mesmo numero era o que fazia
// o funil mentir: fechar um negocio nao mudava nada no painel.
export function resumirFunil(negocios: Negocio[], agora: Date): ResumoFunil {
  const resumo: ResumoFunil = {
    emAberto: 0,
    negociosAbertos: 0,
    ganhoNoMes: 0,
    negociosGanhosNoMes: 0,
    perdidoNoMes: 0,
    negociosPerdidosNoMes: 0,
  };
  for (const negocio of negocios) {
    if (negocio.status === "aberto") {
      resumo.emAberto += negocio.valorEstimado ?? 0;
      resumo.negociosAbertos += 1;
      continue;
    }
    // Fechado sem data de fechamento cai no mes pela data de atualizacao, que e
    // quando o status mudou.
    const quando = negocio.fechadoEm ?? negocio.atualizadoEm;
    if (!noMesDe(quando, agora)) continue;
    const valor = negocio.valorFechado ?? negocio.valorEstimado ?? 0;
    if (negocio.status === "ganho") {
      resumo.ganhoNoMes += valor;
      resumo.negociosGanhosNoMes += 1;
    } else {
      resumo.perdidoNoMes += valor;
      resumo.negociosPerdidosNoMes += 1;
    }
  }
  return resumo;
}

// Valor que um negocio representa hoje. Perdido vale zero: continuar somando
// era parte do funil que mentia.
export function valorDoNegocio(negocio: Negocio): number {
  if (negocio.status === "perdido") return 0;
  if (negocio.status === "ganho") return negocio.valorFechado ?? negocio.valorEstimado ?? 0;
  return negocio.valorEstimado ?? 0;
}

// ------------------------------------------------------- blocos do dia

export type TipoItemDia =
  | "followup"
  | "tarefa"
  | "esfriando"
  | "sem-proxima-acao"
  | "orcamento";

export interface ItemDia {
  id: string;
  tipo: TipoItemDia;
  // Chave de unicidade entre blocos: item nenhum aparece duas vezes na tela.
  chave: string;
  contatoId: string;
  titulo: string;
  subtitulo: string;
  // A data que manda no item. Vazia quando o item nao tem data.
  quando?: string;
  atrasado: boolean;
  tarefaId?: string;
  negocioId?: string;
  orcamentoId?: string;
}

export interface BlocoDia {
  chave: string;
  titulo: string;
  descricao: string;
  // Ja cortado no teto, pro bloco nao virar uma lista infinita.
  itens: ItemDia[];
  // A lista inteira, pro "ver todos" nao precisar recalcular nada.
  todos: ItemDia[];
  // Quantos existem de verdade, antes do corte.
  total: number;
}

export interface EntradaDoDia {
  agora: Date;
  colunas: Coluna[];
  contatos: Contato[];
  negocios: Negocio[];
  orcamentos: Orcamento[];
  tarefas: Tarefa[];
  organizacoes: Organizacao[];
  // Ultima interacao por contato. Quem chama preenche com o que souber e cai
  // pro criadoEm do contato quando nao souber.
  ultimaInteracaoPorContato: Map<string, string>;
}

// Dias que faltam pro orcamento vencer. Negativo quer dizer vencido.
function diasAte(iso: string, agora: Date): number {
  return Math.ceil((Date.parse(iso) - agora.getTime()) / MS_DIA);
}

export function montarBlocosDoDia(entrada: EntradaDoDia): BlocoDia[] {
  const { agora, contatos, negocios, orcamentos, tarefas, colunas, organizacoes } = entrada;
  const hoje = diaLocal(agora);
  const porId = new Map(contatos.map((contato) => [contato.id, contato]));
  const colunaPorId = new Map(colunas.map((coluna) => [coluna.id, coluna]));
  const organizacaoPorId = new Map(organizacoes.map((item) => [item.id, item.nome]));
  const negociosPorContato = new Map<string, Negocio[]>();
  for (const negocio of negocios) {
    const lista = negociosPorContato.get(negocio.contatoId);
    if (lista) lista.push(negocio);
    else negociosPorContato.set(negocio.contatoId, [negocio]);
  }
  const negocioPorId = new Map(negocios.map((negocio) => [negocio.id, negocio]));

  const legenda = (contato: Contato): string => {
    const organizacao = contato.organizacaoId
      ? organizacaoPorId.get(contato.organizacaoId)
      : undefined;
    return organizacao ?? colunaPorId.get(contato.colunaId)?.nome ?? "";
  };

  const atrasados: ItemDia[] = [];
  const paraHoje: ItemDia[] = [];

  // Follow-up de contato, por data.
  for (const contato of contatos) {
    if (contato.arquivado || !contato.proximoContato) continue;
    const dia = diaDoIso(contato.proximoContato);
    if (!dia || dia > hoje) continue;
    const item: ItemDia = {
      id: `followup:${contato.id}`,
      tipo: "followup",
      chave: `contato:${contato.id}`,
      contatoId: contato.id,
      titulo: contato.nome,
      subtitulo: legenda(contato),
      quando: contato.proximoContato,
      atrasado: dia < hoje,
    };
    (item.atrasado ? atrasados : paraHoje).push(item);
  }

  // Proxima acao de negocio aberto, com data ate hoje.
  for (const negocio of negocios) {
    if (negocio.status !== "aberto" || !negocio.proximaAcaoEm) continue;
    const dia = diaDoIso(negocio.proximaAcaoEm);
    if (!dia || dia > hoje) continue;
    const contato = porId.get(negocio.contatoId);
    if (!contato || contato.arquivado) continue;
    const item: ItemDia = {
      id: `negocio:${negocio.id}`,
      tipo: "followup",
      chave: `contato:${contato.id}`,
      contatoId: contato.id,
      titulo: negocio.proximaAcaoTexto || negocio.titulo,
      subtitulo: contato.nome,
      quando: negocio.proximaAcaoEm,
      atrasado: dia < hoje,
      negocioId: negocio.id,
    };
    (item.atrasado ? atrasados : paraHoje).push(item);
  }

  // Tarefas com prazo ate hoje.
  const tarefasAbertas = tarefas.filter((tarefa) => !tarefa.feita);
  const tarefasSemPrazoOuFuturas: ItemDia[] = [];
  for (const tarefa of tarefasAbertas) {
    const contato = tarefa.contatoId ? porId.get(tarefa.contatoId) : undefined;
    const doNegocio = tarefa.negocioId ? negocioPorId.get(tarefa.negocioId) : undefined;
    const dono = contato ?? (doNegocio ? porId.get(doNegocio.contatoId) : undefined);
    const item: ItemDia = {
      id: `tarefa:${tarefa.id}`,
      tipo: "tarefa",
      chave: `tarefa:${tarefa.id}`,
      contatoId: dono?.id ?? "",
      titulo: tarefa.texto,
      subtitulo: dono?.nome ?? "Sem contato",
      atrasado: false,
      tarefaId: tarefa.id,
    };
    if (tarefa.prazo) item.quando = tarefa.prazo;
    const dia = tarefa.prazo ? diaDoIso(tarefa.prazo) : null;
    if (!dia || dia > hoje) {
      tarefasSemPrazoOuFuturas.push(item);
      continue;
    }
    item.atrasado = dia < hoje;
    (item.atrasado ? atrasados : paraHoje).push(item);
  }

  // Esfriando por estagio.
  const esfriando: ItemDia[] = [];
  for (const contato of contatos) {
    if (contato.arquivado) continue;
    const ultima =
      entrada.ultimaInteracaoPorContato.get(contato.id) ?? contato.criadoEm;
    const esfriou = estaEsfriando({
      coluna: colunaPorId.get(contato.colunaId),
      ultimaInteracaoEm: ultima,
      proximoContato: contato.proximoContato,
      negocios: negociosPorContato.get(contato.id) ?? [],
      agora,
    });
    if (!esfriou) continue;
    esfriando.push({
      id: `esfriando:${contato.id}`,
      tipo: "esfriando",
      chave: `contato:${contato.id}`,
      contatoId: contato.id,
      titulo: contato.nome,
      subtitulo: legenda(contato),
      quando: ultima,
      atrasado: true,
    });
  }

  // Negocio aberto sem proxima acao marcada.
  const semProximaAcao: ItemDia[] = [];
  for (const negocio of negocios) {
    if (negocio.status !== "aberto" || negocio.proximaAcaoEm) continue;
    const contato = porId.get(negocio.contatoId);
    if (!contato || contato.arquivado) continue;
    if (contato.proximoContato) continue;
    semProximaAcao.push({
      id: `sem-acao:${negocio.id}`,
      tipo: "sem-proxima-acao",
      chave: `contato:${contato.id}`,
      contatoId: contato.id,
      titulo: negocio.titulo,
      subtitulo: contato.nome,
      atrasado: false,
      negocioId: negocio.id,
    });
  }

  // Orcamento enviado e parado, ou com validade vencendo.
  const orcamentosParados: ItemDia[] = [];
  for (const orcamento of orcamentos) {
    if (orcamento.status !== "enviado") continue;
    const negocio = negocioPorId.get(orcamento.negocioId);
    const contato = negocio ? porId.get(negocio.contatoId) : undefined;
    if (!contato || contato.arquivado) continue;
    const faltam = orcamento.validoAte ? diasAte(orcamento.validoAte, agora) : null;
    if (faltam !== null && faltam > 7) continue;
    orcamentosParados.push({
      id: `orcamento:${orcamento.id}`,
      tipo: "orcamento",
      chave: `orcamento:${orcamento.id}`,
      contatoId: contato.id,
      titulo: negocio?.titulo ?? "Orçamento",
      subtitulo: contato.nome,
      ...(orcamento.validoAte ? { quando: orcamento.validoAte } : {}),
      atrasado: faltam !== null && faltam < 0,
      negocioId: orcamento.negocioId,
      orcamentoId: orcamento.id,
    });
  }

  const porData = (a: ItemDia, b: ItemDia): number => {
    const ta = a.quando ? Date.parse(a.quando) : Number.POSITIVE_INFINITY;
    const tb = b.quando ? Date.parse(b.quando) : Number.POSITIVE_INFINITY;
    return ta - tb;
  };
  atrasados.sort(porData);
  paraHoje.sort(porData);
  esfriando.sort(porData);
  orcamentosParados.sort(porData);
  tarefasSemPrazoOuFuturas.sort(porData);

  const brutos: { chave: string; titulo: string; descricao: string; itens: ItemDia[] }[] = [
    { chave: "atrasado", titulo: "Atrasado", descricao: "passou da data", itens: atrasados },
    { chave: "hoje", titulo: "Hoje", descricao: "vence hoje", itens: paraHoje },
    { chave: "esfriando", titulo: "Esfriando", descricao: "sem contato ha tempo demais", itens: esfriando },
    { chave: "sem-proxima-acao", titulo: "Sem próxima ação", descricao: "negócio aberto sem data marcada", itens: semProximaAcao },
    { chave: "orcamento", titulo: "Orçamento parado", descricao: "enviado sem resposta", itens: orcamentosParados },
    { chave: "tarefas", titulo: "Outras tarefas", descricao: "sem prazo ou pra frente", itens: tarefasSemPrazoOuFuturas },
  ];

  // Dedupe por chave, na ordem de prioridade: o item aparece no bloco mais
  // urgente em que se encaixa, e some dos de baixo.
  const vistas = new Set<string>();
  return brutos.map((bloco) => {
    const unicos = bloco.itens.filter((item) => {
      if (vistas.has(item.chave)) return false;
      vistas.add(item.chave);
      return true;
    });
    return {
      chave: bloco.chave,
      titulo: bloco.titulo,
      descricao: bloco.descricao,
      // O total conta antes do corte. Era exatamente isto que a tela errava.
      total: unicos.length,
      todos: unicos,
      itens: unicos.slice(0, TETO_POR_BLOCO),
    };
  });
}
