// Constantes e resumos humanos da tela de Automacoes. Ficam num modulo proprio
// porque a lista de regras e o assistente de criacao usam os mesmos rotulos.

import type { Coluna } from "../../api/crm";
import type { Regra } from "../../api/automacoes";

// Eventos de gatilho disponiveis, com nome humano. A lista e extensivel: novos
// eventos do barramento entram aqui e aparecem no assistente sem mais nada.
// "precisaColuna" liga o seletor da coluna de destino no passo do gatilho.
export interface EventoGatilho {
  id: string;
  nome: string;
  precisaColuna: boolean;
}

export const EVENTOS_GATILHO: EventoGatilho[] = [
  { id: "crm:contato-criado", nome: "Cartão criado no CRM", precisaColuna: false },
  { id: "crm:contato-movido", nome: "Cartão movido de coluna", precisaColuna: true },
];

export function eventoPorId(id: string): EventoGatilho | undefined {
  return EVENTOS_GATILHO.find((e) => e.id === id);
}

// Variaveis que dao pra usar nos templates de titulo e descricao. Viram chips
// clicaveis que inserem o {{placeholder}} no campo. O rotulo explica cada uma.
export interface VariavelTemplate {
  chave: string;
  rotulo: string;
}

export const VARIAVEIS_TEMPLATE: VariavelTemplate[] = [
  { chave: "nome", rotulo: "Nome do contato" },
  { chave: "empresa", rotulo: "Empresa" },
  { chave: "coluna", rotulo: "Coluna atual" },
  { chave: "valorEstimado", rotulo: "Valor estimado" },
  { chave: "proximoContato", rotulo: "Próximo contato" },
];

// Resumo humano do gatilho de uma regra, pra linha da lista. Usa o nome da
// coluna quando o filtro aponta uma; cai no id se a coluna nao existir mais.
export function resumoGatilho(regra: Regra, colunas: Coluna[]): string {
  const evento = eventoPorId(regra.gatilho.evento);
  const nomeEvento = evento?.nome ?? regra.gatilho.evento;
  const colunaId = regra.gatilho.filtro?.colunaPara;
  if (evento?.precisaColuna && colunaId) {
    const coluna = colunas.find((c) => c.id === colunaId);
    return `Quando um cartão entra em "${coluna?.nome ?? colunaId}"`;
  }
  if (regra.gatilho.evento === "crm:contato-criado") {
    return "Quando um cartão é criado no CRM";
  }
  return nomeEvento;
}

// Resumo humano da acao de uma regra, pra linha da lista.
export function resumoAcao(regra: Regra): string {
  const titulo = regra.acao.parametros.titulo || "compromisso";
  const dur = regra.acao.parametros.duracaoMin || "60";
  return `Cria "${titulo}" na agenda, ${dur} min`;
}
