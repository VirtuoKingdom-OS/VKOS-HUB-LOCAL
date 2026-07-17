// Tipos do dominio, espelhando app/server/src/tipos.ts (o CONTRATO.md).
// Manter em sincronia com o backend.

export type StatusSessao =
  | "fila"
  | "iniciando"
  | "rodando"
  | "concluida"
  | "erro"
  | "parada";

export type ProvedorIA = "claude" | "codex";

export interface Sessao {
  id: string;
  provedor: ProvedorIA;
  titulo: string;
  prompt: string;
  skill?: string;
  status: StatusSessao;
  criadaEm: string;
  atualizadaEm: string;
  sessionIdClaude?: string;
  custoUsd?: number;
  estimado?: boolean;
  pastaTrabalho: string;
  resultado?: string;
  erro?: string;
  // Extensao rodada 5: modelo e tokens.
  modelo?: string;
  // tokensEntrada segue como TOTAL (nova + escritas + leituras de cache) por
  // compatibilidade com sessoes antigas.
  tokensEntrada?: number;
  tokensSaida?: number;
  // Extensao rodada 6: quebra honesta da entrada. Entrada realmente nova,
  // escrita de cache e leitura de cache (esta custa cerca de 10x menos).
  tokensEntradaNova?: number;
  tokensCacheEscrita?: number;
  tokensCacheLeitura?: number;
  // Laco de conformidade de site (pos-geracao). Presente so na geracao guiada de
  // site. Enquanto conferindo/corrigindo, a peca ainda nao entra em "pronta".
  conferenciaSite?: ConferenciaSite;
}

// Estado do laco de conformidade pos-geracao de site. Espelha o backend.
export interface ConferenciaSite {
  estado: "conferindo" | "corrigindo" | "aprovada" | "pendencias";
  volta: number;
}

// Um turno da conversa de uma sessao, persistido pelo backend.
export interface TurnoSessao {
  papel: "usuario" | "assistente";
  texto: string;
  em: string;
  custoUsd?: number;
  estimado?: boolean;
  // Turno gerado pelo proprio Hub (retomada automatica do laco de conformidade),
  // exibido discreto como "Correcao automatica do Hub".
  interno?: boolean;
}

// Modelo de carrossel do VKOS (templates/carrossel/).
export interface ModeloCarrossel {
  id: string;
  nome: string;
  descricao: string;
  arquivo: string;
  pedeImagem: boolean;
}

export type TipoPeca = "carrossel" | "post" | "stories" | "site" | "texto" | "outro";

export interface Peca {
  pasta: string;
  data: string;
  tema: string;
  tipo: TipoPeca;
  arquivos: string[];
  previews: string[];
  // Peca HTML-first: tem carrossel.html na raiz da subpasta e sem PNG legado.
  fonteHtml?: boolean;
  // Total de paginas (.slide) do carrossel.html. Presente quando fonteHtml.
  paginas?: number;
  // Data e hora de criacao da subpasta (ISO). Birthtime, com fallback pra mtime
  // quando o sistema de arquivos nao guarda birthtime confiavel.
  criadoEm?: string;
  // Diagnostico do site estatico calculado pelo servidor.
  site?: {
    valido: boolean;
    erros: string[];
    avisos: string[];
  };
}

export interface SkillVkos {
  nome: string;
  descricao: string;
}

export interface EstadoVkos {
  pasta: string | null;
  valida: boolean;
  cerebroPreenchido: boolean;
  totalSkills: number;
}

export interface DeteccaoMotorIA {
  instalado: boolean;
  versao: string | null;
  logado: boolean | null;
  binario: string | null;
}

export interface Ambiente {
  plataforma: string;
  node: string;
  claude: DeteccaoMotorIA;
  codex: DeteccaoMotorIA;
}

// Nos de contexto: anexos e notas que alimentam as sessoes.
export interface ArquivoContexto {
  nome: string;
  tamanho: number;
  tipo: string;
}

export interface AnexoAjuste {
  nome: string;
  caminhoRelativo: string;
}

// Tipo do no de contexto. Imutavel depois de criado.
// texto: bloco de notas. imagens: grade de referencias visuais.
// links: lista de urls de referencia com descricao.
export type TipoContexto = "texto" | "imagens" | "links";

export interface Contexto {
  id: string;
  nome: string;
  slug: string;
  tipo: TipoContexto;
  texto: string;
  arquivos: ArquivoContexto[];
  pastaRelativa: string;
  criadaEm: string;
  atualizadaEm: string;
}

// Workspace de cliente: uma pasta VKOS completa com seu proprio Cerebro. O app
// troca entre eles; todo o estado visivel (canvas, pecas, contextos, sessoes,
// custos) e do workspace ativo.
export interface Workspace {
  id: string;
  nome: string;
  pasta: string;
  criadoEm: string;
  ultimoUso: string;
}

// Resposta de GET /api/workspaces: a lista e qual esta ativo.
export interface RespostaWorkspaces {
  workspaces: Workspace[];
  ativo: string | null;
}

// Navegacao de pastas no onboarding.
export interface PastaListada {
  nome: string;
  caminho: string;
  ehVkos: boolean;
}

export interface RespostaPastas {
  caminho: string;
  pai: string | null;
  pastas: PastaListada[];
}

export interface RespostaCerebro {
  caminho: string;
  texto: string;
  // Alias legado de "texto", mantido pelo backend por compatibilidade.
  conteudo: string;
  atualizadoEm: string;
  preenchido: boolean;
}

// Evento cru do stream-json do claude. Repassado pelo backend.
// So tipamos os campos que o frontend le. O resto fica solto.
export interface EventoClaude {
  type?: string;
  subtype?: string;
  session_id?: string;
  result?: string;
  total_cost_usd?: number;
  message?: {
    content?: Array<{ type?: string; text?: string }>;
  };
  event?: {
    type?: string;
    delta?: { type?: string; text?: string };
  };
  [chave: string]: unknown;
}

// Mensagens que o servidor manda pelo WebSocket.
// Eventos de sessao carregam workspaceId: o frontend ignora os de um workspace
// que exista e nao seja o ativo (a sessao do outro cliente segue rodando, so
// nao aparece). workspace:ativado avisa que outra aba trocou de cliente.
export type MensagemWs =
  | { tipo: "sessao:evento"; id: string; evento: EventoClaude; workspaceId?: string }
  | {
      tipo: "sessao:status";
      id: string;
      status: StatusSessao;
      detalhe?: string;
      workspaceId?: string;
    }
  | {
      tipo: "sessao:conferencia";
      id: string;
      conferencia: ConferenciaSite;
      workspaceId?: string;
    }
  | { tipo: "pecas:atualizadas" }
  | { tipo: "workspace:ativado"; id: string };
