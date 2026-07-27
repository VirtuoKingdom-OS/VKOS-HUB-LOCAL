// Logica do resumo do CORE, sem nenhum acesso a disco.
//
// Fica separada da rota de proposito: a decisao ("este projeto esta ativo?",
// "quanto foi gasto em cada dia?") e o que precisa de teste, e ela nao pode
// depender de ter workspace real em disco pra rodar.

import type { LancamentoCusto } from "../sessoes/custos.js";
import type { DiaDeGasto, EstadoAtividade } from "./modelo.js";

// Quantos dias sem sessao ainda contam como projeto ativo. Uma semana e o
// periodo que o dono usa pra dizer "estou mexendo nisso".
export const JANELA_ATIVIDADE_DIAS = 7;

// Tamanho da serie de gasto. Duas semanas mostram a semana corrente contra a
// anterior, que e a unica comparacao que muda o que se faz agora.
export const DIAS_DA_SERIE = 14;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Data local no formato AAAA-MM-DD. O dono raciocina no fuso da maquina dele,
// entao um turno das 22h nao pode cair no dia seguinte porque o UTC virou.
export function diaLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Agrega os lancamentos por dia local, do mais antigo pro mais novo.
//
// Dia sem gasto entra com zero. Sem isso a serie vira uma sequencia de dias
// desiguais e o desenho mente sobre o ritmo: cinco barras coladas pareceriam
// cinco dias seguidos mesmo com um mes de silencio no meio.
export function agregarPorDia(
  lancamentos: readonly LancamentoCusto[],
  agora: Date,
  dias: number = DIAS_DA_SERIE,
): DiaDeGasto[] {
  const serie: DiaDeGasto[] = [];
  const indice = new Map<string, DiaDeGasto>();
  for (let i = dias - 1; i >= 0; i--) {
    const data = new Date(agora.getTime() - i * MS_POR_DIA);
    const item: DiaDeGasto = { dia: diaLocal(data), usd: 0, turnos: 0, turnosSemCusto: 0 };
    serie.push(item);
    indice.set(item.dia, item);
  }

  for (const lancamento of lancamentos) {
    const quando = new Date(lancamento.em);
    if (Number.isNaN(quando.getTime())) continue;
    const item = indice.get(diaLocal(quando));
    if (!item) continue;
    item.turnos += 1;
    // Turno com erro nao soma custo (regra M10) e nao conta como sem preco: ali
    // o Hub sabe que nao deve somar, nao falta informacao.
    if (lancamento.custoConhecido) item.usd += lancamento.custoUsd;
    else if (!lancamento.ehErro) item.turnosSemCusto += 1;
  }

  return serie;
}

// Data do lancamento mais recente, ou null quando nunca rodou nada.
export function ultimoTurno(lancamentos: readonly LancamentoCusto[]): string | null {
  let melhor: number | null = null;
  let texto: string | null = null;
  for (const lancamento of lancamentos) {
    const t = new Date(lancamento.em).getTime();
    if (Number.isNaN(t)) continue;
    if (melhor === null || t > melhor) {
      melhor = t;
      texto = lancamento.em;
    }
  }
  return texto;
}

// Diz o que e um projeto ativo.
//
// A pergunta que a tela responde e "o que esta acontecendo no meu negocio
// agora". Sessao de IA em voo e a resposta direta e nao admite duvida. Fora
// dela, o sinal disponivel e o rastro: o ultimo turno gravado no custos.jsonl
// e o ultimo uso registrado no registro de workspaces. Os dois entram porque
// abrir um cliente pra olhar arquivo tambem e trabalho, mesmo sem gastar IA.
export function classificarAtividade(
  entrada: {
    sessoesRodando: number;
    ultimoTurnoEm: string | null;
    ultimoUso: string;
  },
  agora: Date,
  janelaDias: number = JANELA_ATIVIDADE_DIAS,
): EstadoAtividade {
  if (entrada.sessoesRodando > 0) return "rodando";
  const limite = agora.getTime() - janelaDias * MS_POR_DIA;
  for (const iso of [entrada.ultimoTurnoEm, entrada.ultimoUso]) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t) && t >= limite) return "recente";
  }
  return "parado";
}

// Ordena a lista do CORE: quem esta rodando primeiro, depois o recente, depois
// o parado; dentro de cada grupo, o de uso mais novo na frente. A tela nao tem
// que fazer o dono procurar o que esta acontecendo agora.
export function ordenarPorAtividade<
  T extends { atividade: EstadoAtividade; ultimoUso: string; ultimoTurnoEm: string | null },
>(itens: readonly T[]): T[] {
  const peso: Record<EstadoAtividade, number> = { rodando: 0, recente: 1, parado: 2 };
  const quando = (item: T): number => {
    const candidatos = [item.ultimoTurnoEm, item.ultimoUso]
      .map((iso) => (iso ? new Date(iso).getTime() : Number.NaN))
      .filter((t) => !Number.isNaN(t));
    return candidatos.length > 0 ? Math.max(...candidatos) : 0;
  };
  return [...itens].sort((a, b) => {
    const diferenca = peso[a.atividade] - peso[b.atividade];
    if (diferenca !== 0) return diferenca;
    return quando(b) - quando(a);
  });
}
