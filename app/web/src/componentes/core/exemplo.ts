// DADOS DE EXEMPLO DO DASHBOARD. NADA AQUI E REAL.
//
// Os paineis de Clientes, Financas e CRM existem hoje so pra o Jesse avaliar o
// visual e decidir se o resumo faz sentido antes de alguem ligar isso em dado
// de verdade. Enquanto for exemplo, cada painel carrega um selo dizendo isso na
// cara, e o Dashboard avisa uma vez no topo.
//
// COMO APAGAR: este arquivo inteiro sai, junto com os tres <PainelExemplo> na
// TelaCore e o bloco ".core-exemplo" no core.css. Nao ha mais nada preso nisto.
//
// A regra de nunca mostrar numero inventado como se fosse real continua valendo:
// o que muda aqui e que o numero se declara inventado. Ver
// docs/decisoes/2026-07-27-paineis-de-exemplo-no-dashboard.md.

export interface ClienteExemplo {
  nome: string;
  desde: string;
  estado: "ativo" | "proposta" | "pausado";
  mensalUsd: number;
}

export interface MovimentoExemplo {
  descricao: string;
  quando: string;
  valorUsd: number;
}

export interface EstagioExemplo {
  nome: string;
  total: number;
}

// Cinco clientes, como o Jesse pediu. Nomes genericos de propósito: nome que
// parece real vira captura de tela constrangedora.
export const CLIENTES_EXEMPLO: ClienteExemplo[] = [
  { nome: "Padaria do Bairro", desde: "há 8 meses", estado: "ativo", mensalUsd: 640 },
  { nome: "Studio Vitral", desde: "há 5 meses", estado: "ativo", mensalUsd: 480 },
  { nome: "Clínica Norte", desde: "há 2 meses", estado: "ativo", mensalUsd: 520 },
  { nome: "Oficina Rocha", desde: "há 3 semanas", estado: "proposta", mensalUsd: 0 },
  { nome: "Mercado Vila", desde: "há 1 ano", estado: "pausado", mensalUsd: 0 },
];

export const SALDO_EXEMPLO = 2300;

export const MOVIMENTOS_EXEMPLO: MovimentoExemplo[] = [
  { descricao: "Padaria do Bairro", quando: "há 2 dias", valorUsd: 640 },
  { descricao: "Assinatura de IA", quando: "há 4 dias", valorUsd: -120 },
  { descricao: "Studio Vitral", quando: "há 6 dias", valorUsd: 480 },
  { descricao: "Hospedagem", quando: "há 9 dias", valorUsd: -35 },
];

export const FUNIL_EXEMPLO: EstagioExemplo[] = [
  { nome: "Novo", total: 6 },
  { nome: "Contato", total: 4 },
  { nome: "Proposta", total: 3 },
  { nome: "Fechado", total: 2 },
];

export const CRM_EXEMPLO = {
  contatos: 15,
  tarefasHoje: 3,
  semResposta: 4,
};

// Entrada menos saida dos movimentos acima. Fica derivado pro painel nao poder
// mostrar um numero que nao bate com a lista logo abaixo dele.
export const ENTRADA_EXEMPLO = MOVIMENTOS_EXEMPLO.filter((m) => m.valorUsd > 0).reduce(
  (soma, m) => soma + m.valorUsd,
  0,
);
export const SAIDA_EXEMPLO = MOVIMENTOS_EXEMPLO.filter((m) => m.valorUsd < 0).reduce(
  (soma, m) => soma + Math.abs(m.valorUsd),
  0,
);

export const CLIENTES_ATIVOS_EXEMPLO = CLIENTES_EXEMPLO.filter(
  (c) => c.estado === "ativo",
).length;

export const RECEITA_MENSAL_EXEMPLO = CLIENTES_EXEMPLO.reduce(
  (soma, c) => soma + c.mensalUsd,
  0,
);
