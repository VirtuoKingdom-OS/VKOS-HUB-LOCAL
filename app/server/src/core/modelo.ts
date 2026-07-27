// Modelo do resumo do CORE, o nivel de cima do Hub.
//
// O CORE e onde o dono opera o negocio dele: o gasto com IA e os projetos
// ativos. O nivel do workspace continua existindo para o trabalho de cada
// projeto. Este arquivo e a UNICA definicao destes tipos: o web importa daqui
// pela ponte em web/src/tipos/core.ts, nunca redeclara.
//
// Modulo folha de proposito: nao importa nada. Assim o import de tipo do web
// nao arrasta arvore de dependencia de Node pro bundle do navegador.

// Trava de versao do contrato. Subiu aqui, o typecheck do web para de compilar
// e alguem e obrigado a olhar a tela antes do usuario descobrir sozinho.
export const VERSAO_RESUMO_CORE = 1;

// Como um workspace esta agora, na leitura do CORE.
//
// "rodando": tem sessao de IA em voo neste instante. E o sinal mais forte, e o
// unico que responde "o que esta acontecendo agora".
// "recente": nao tem sessao em voo, mas gastou um turno de IA ou foi aberto
// dentro da janela de atividade.
// "parado": nem uma coisa nem outra.
export type EstadoAtividade = "rodando" | "recente" | "parado";

// Um dia da serie de gasto. O dia e a data LOCAL, porque o dono raciocina no
// fuso dele, nao em UTC.
export interface DiaDeGasto {
  dia: string;
  usd: number;
  turnos: number;
  // Turnos daquele dia que gastaram sem preco conhecido. A barra do dia e um
  // piso quando isso e maior que zero.
  turnosSemCusto: number;
}

export interface WorkspaceNoCore {
  id: string;
  nome: string;
  pasta: string;
  // E o workspace aberto agora.
  ativo: boolean;
  atividade: EstadoAtividade;
  // Sessoes de IA em voo (fila, iniciando ou rodando).
  sessoesRodando: number;
  totalUsd: number;
  estimado: boolean;
  // O total deste workspace e um piso, nao o valor exato.
  piso: boolean;
  turnosSemCusto: number;
  totalSessoes: number;
  ultimoUso: string;
  // Data do ultimo turno registrado em custos.jsonl, ou null se nunca rodou.
  ultimoTurnoEm: string | null;
  // O custos.json deste workspace nao pode ser lido. O gasto dele nao entra em
  // lugar nenhum, e o total geral se declara piso por causa disso.
  gastoIlegivel: boolean;
}

export interface GastoDoCore {
  // Total geral: os clientes do registro MAIS o historico dos ja removidos.
  // Dinheiro gasto nao deixa de ter sido gasto porque a pasta sumiu.
  totalUsd: number;
  // Sempre verdadeiro quando ha gasto: com assinatura, nenhum dolar e cobranca
  // real. O valor sai de uma tabela de precos embutida.
  estimado: boolean;
  // O total e um PISO, nao o valor exato: ha turno que gastou sem preco
  // conhecido, ou cliente removido cujo historico nao deu pra ler.
  piso: boolean;
  turnosSemCusto: number;
  // Parte do total que veio de clientes ja removidos do registro.
  usdDeRemovidos: number;
  workspacesRemovidos: number;
  workspacesSemHistorico: number;
  // Serie diaria, do dia mais antigo pro mais novo. Um item por dia, inclusive
  // os dias sem gasto: sem eles a serie mente sobre o ritmo.
  porDia: DiaDeGasto[];
}

export interface ResumoCore {
  versao: number;
  gasto: GastoDoCore;
  workspaces: WorkspaceNoCore[];
  // Sessoes de IA em voo somando todos os workspaces.
  sessoesRodando: number;
  // Workspaces em "rodando" ou "recente".
  projetosAtivos: number;
  // Quantos dias contam como atividade recente.
  janelaAtividadeDias: number;
  // Quantos dias tem a serie de gasto.
  diasDaSerie: number;
}
