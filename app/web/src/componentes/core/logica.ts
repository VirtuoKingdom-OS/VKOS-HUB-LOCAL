// Decisao das telas do CORE, sem React e sem DOM.
//
// O runner de teste deste projeto nao tem DOM, entao tudo que decide alguma
// coisa mora aqui e e testado de verdade. O componente so desenha o que estas
// funcoes devolvem. Mesmo desenho de componentes/crm/logica.ts.

import type { DiaDeGasto, EstadoAtividade, GastoDoCore } from "../../tipos/core";

// Formata um valor em dolar dizendo o que ele e.
//
// Duas marcas, e as duas importam:
// "~" porque com assinatura nenhum dolar e cobranca real: o valor sai de uma
// tabela de precos embutida.
// "≥" porque quando existe turno que gastou sem preco conhecido, o numero e um
// PISO. Mostrar cara de exatidao ali foi o problema que a Fase 3 corrigiu.
export function formatarUsd(
  valor: number,
  marcas: { estimado?: boolean; piso?: boolean } = {},
): string {
  const numero = Number.isFinite(valor) ? valor : 0;
  const prefixo = `${marcas.piso ? "≥ " : ""}${marcas.estimado ? "~" : ""}`;
  return `${prefixo}$${numero.toFixed(2)}`;
}

// A frase que explica por que o total e um piso. Devolve null quando o numero
// e o melhor que da pra saber e nao precisa de ressalva.
export function fraseDoPiso(gasto: {
  piso: boolean;
  turnosSemCusto: number;
  workspacesSemHistorico: number;
}): string | null {
  if (!gasto.piso) return null;
  const partes: string[] = [];
  if (gasto.turnosSemCusto > 0) {
    partes.push(
      gasto.turnosSemCusto === 1
        ? "1 turno gastou sem preço conhecido"
        : `${gasto.turnosSemCusto} turnos gastaram sem preço conhecido`,
    );
  }
  if (gasto.workspacesSemHistorico > 0) {
    partes.push(
      gasto.workspacesSemHistorico === 1
        ? "1 workspace foi removido sem histórico legível"
        : `${gasto.workspacesSemHistorico} workspaces foram removidos sem histórico legível`,
    );
  }
  if (partes.length === 0) {
    // Piso sem motivo nomeado ainda e piso. Nunca fingir exatidao.
    return "Falta informação de algum turno, então o valor real é maior.";
  }
  return `${partes.join(" e ")}. O valor real é maior.`;
}

// A frase da procedencia do total. O gasto de cliente removido continua contado,
// e a tela precisa dizer isso, senao o numero parece nao bater com a lista.
export function fraseDosRemovidos(gasto: {
  usdDeRemovidos: number;
  workspacesRemovidos: number;
  estimado: boolean;
}): string | null {
  if (gasto.workspacesRemovidos <= 0) return null;
  const quantos =
    gasto.workspacesRemovidos === 1
      ? "1 workspace já removido"
      : `${gasto.workspacesRemovidos} workspaces já removidos`;
  return `Inclui ${formatarUsd(gasto.usdDeRemovidos, { estimado: gasto.estimado })} de ${quantos}.`;
}

export interface LeituraDaSerie {
  // Maior gasto de um dia da serie. Zero quando nao houve gasto nenhum.
  maximo: number;
  total: number;
  // Soma da metade mais nova contra a metade mais velha da serie.
  recente: number;
  anterior: number;
  // Direcao da comparacao. "sem-base" quando a metade velha e zero: dividir por
  // zero daria um numero grande e sem sentido.
  direcao: "subiu" | "caiu" | "igual" | "sem-base";
  // Variacao em porcentagem, so quando ha base pra comparar.
  variacao: number | null;
  // Nenhum turno na serie inteira.
  vazia: boolean;
}

// Le a serie diaria. O que decide alguma coisa aqui e a comparacao entre a
// semana corrente e a anterior: e ela que responde "estou gastando mais do que
// o normal?". Um desenho de barras sem essa leitura seria enfeite.
export function lerSerie(porDia: readonly DiaDeGasto[]): LeituraDaSerie {
  const maximo = porDia.reduce((maior, dia) => Math.max(maior, dia.usd), 0);
  const total = porDia.reduce((soma, dia) => soma + dia.usd, 0);
  const meio = Math.floor(porDia.length / 2);
  const anterior = porDia.slice(0, meio).reduce((soma, dia) => soma + dia.usd, 0);
  const recente = porDia.slice(meio).reduce((soma, dia) => soma + dia.usd, 0);
  const turnos = porDia.reduce((soma, dia) => soma + dia.turnos, 0);

  if (anterior <= 0) {
    return {
      maximo,
      total,
      recente,
      anterior,
      direcao: "sem-base",
      variacao: null,
      vazia: turnos === 0,
    };
  }
  const variacao = ((recente - anterior) / anterior) * 100;
  const direcao = Math.abs(variacao) < 5 ? "igual" : variacao > 0 ? "subiu" : "caiu";
  return { maximo, total, recente, anterior, direcao, variacao, vazia: turnos === 0 };
}

// Altura da barra de um dia, de 0 a 100. Sem gasto no periodo inteiro, tudo
// fica em zero: barra cheia num periodo vazio seria mentira visual.
export function alturaDaBarra(dia: DiaDeGasto, maximo: number): number {
  if (maximo <= 0 || dia.usd <= 0) return 0;
  // Piso de 4% pra um dia com gasto minusculo nao desaparecer e parecer vazio.
  return Math.max(4, Math.round((dia.usd / maximo) * 100));
}

// A frase da comparacao entre as duas metades da serie.
export function fraseDaTendencia(leitura: LeituraDaSerie, dias: number): string {
  const metade = Math.floor(dias / 2);
  if (leitura.vazia) return `Nenhum turno de IA nos últimos ${dias} dias.`;
  if (leitura.direcao === "sem-base") {
    return `${formatarUsd(leitura.recente, { estimado: true })} nos últimos ${metade} dias, sem gasto nos ${metade} anteriores.`;
  }
  const variacao = Math.round(Math.abs(leitura.variacao ?? 0));
  const base = `${formatarUsd(leitura.recente, { estimado: true })} nos últimos ${metade} dias, contra ${formatarUsd(leitura.anterior, { estimado: true })} nos ${metade} anteriores`;
  if (leitura.direcao === "igual") return `${base}. Mesmo ritmo.`;
  return `${base}. ${leitura.direcao === "subiu" ? "Subiu" : "Caiu"} ${variacao}%.`;
}

// Rotulo curto do estado de um workspace.
export const ROTULO_ATIVIDADE: Record<EstadoAtividade, string> = {
  rodando: "Rodando agora",
  recente: "Ativo",
  parado: "Parado",
};

// A fraseDosProjetos saiu em 2026-07-27, a pedido do Jesse. Ela explicava o
// criterio de "projeto ativo" embaixo do numero, e o Dashboard ficou apertado
// demais pra caber explicacao de rotulo. O criterio continua declarado na dica
// do bloco e na tela de Workspaces.

// Tempo decorrido em linguagem curta. Data ausente ou invalida devolve null,
// nunca "há 56 anos" por causa de um zero.
export function tempoRelativo(iso: string | null | undefined, agora: Date = new Date()): string | null {
  if (!iso) return null;
  const quando = new Date(iso).getTime();
  if (Number.isNaN(quando)) return null;
  const minutos = Math.floor((agora.getTime() - quando) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? "há 1 hora" : `há ${horas} horas`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return dias === 1 ? "ontem" : `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? "há 1 ano" : `há ${anos} anos`;
}

// Onde um workspace novo vai nascer, do jeito que o usuario le.
//
// Desde 2026-07-27 quem monta o caminho de verdade e o servidor, em
// <raiz do projeto>/workspaces/<slug do nome>. O frontend nao compoe caminho
// nem escolhe pasta: ele so ANUNCIA o destino, em relativo, pra pessoa nao
// ficar no escuro sobre onde o dado dela vai parar. A regra do slug e a mesma
// de server/src/workspaces/pastas.ts, de proposito, senao o anuncio mentiria.
//
// Nome vazio devolve so "workspaces/": antes de digitar nao ha o que prever, e
// mostrar o fallback "workspace" ali pareceria um nome ja decidido.
export function pastaPrevista(nome: string): string {
  const limpo = (nome ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!nome.trim()) return "workspaces/";
  return `workspaces/${limpo || "workspace"}`;
}

// Encurta um caminho longo pros ultimos dois segmentos, legivel.
export function encurtarCaminho(caminho: string): string {
  const partes = caminho.split(/[\\/]/).filter(Boolean);
  if (partes.length <= 2) return partes.join(" / ");
  return `... / ${partes.slice(-2).join(" / ")}`;
}

// Frase completa do total do CORE, pro title do bloco de gasto.
export function dicaDoGasto(gasto: GastoDoCore): string {
  const partes = [
    `Total de todos os workspaces, inclusive os já removidos: ${formatarUsd(gasto.totalUsd, {
      estimado: gasto.estimado,
      piso: gasto.piso,
    })}`,
  ];
  const piso = fraseDoPiso(gasto);
  if (piso) partes.push(piso);
  const removidos = fraseDosRemovidos(gasto);
  if (removidos) partes.push(removidos);
  return partes.join(" ");
}
