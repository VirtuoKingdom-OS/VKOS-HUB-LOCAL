// Tipos compartilhados entre os modulos do servidor.
// Espelham o CONTRATO.md. Nao mudar sem anotar no resumo de integracao.

export type StatusSessao =
  | "fila"
  | "iniciando"
  | "rodando"
  | "concluida"
  | "erro"
  | "parada";

export interface Sessao {
  id: string;
  titulo: string;
  prompt: string;
  skill?: string;
  // Workspace dono da sessao. O gerenciador e unico na memoria com todas as
  // sessoes, mas cada uma pertence ao seu workspace (persistencia, custos,
  // transcricao e filtro de exibicao seguem por ele).
  workspaceId?: string;
  status: StatusSessao;
  criadaEm: string;
  atualizadaEm: string;
  sessionIdClaude?: string;
  custoUsd?: number;
  pastaTrabalho: string;
  resultado?: string;
  erro?: string;
  // Extensao rodada 5: modelo e tokens.
  modelo?: string;
  // tokensEntrada continua sendo o total: entrada nova + cache escrita + cache leitura.
  tokensEntrada?: number;
  tokensSaida?: number;
  // Extensao rodada 6: painel honesto. Split da entrada por natureza.
  // Entrada nova real (input_tokens), o que de fato assusta quando some tudo.
  tokensEntradaNova?: number;
  // Cache de escrita (cache_creation_input_tokens).
  tokensCacheEscrita?: number;
  // Cache de leitura (cache_read_input_tokens).
  tokensCacheLeitura?: number;
  // Extensao rodada 10: modo de permissao do spawn.
  // padrao = --permission-mode acceptEdits (comportamento atual).
  // total = --permission-mode bypassPermissions (poder total, sem confirmacao).
  // Persiste na sessao e vale nas continuacoes (resume).
  permissao?: "padrao" | "total";
}

// Um turno da conversa de uma sessao, persistido em app/dados/transcricoes/.
export interface TurnoSessao {
  papel: "usuario" | "assistente";
  texto: string;
  em: string;
  custoUsd?: number;
}

// Modelo de carrossel do VKOS (templates/carrossel/).
export interface ModeloCarrossel {
  id: string;
  nome: string;
  descricao: string;
  arquivo: string;
  pedeImagem: boolean;
}

export type TipoPeca = "carrossel" | "stories" | "post" | "site" | "texto" | "outro";

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

export interface Ambiente {
  plataforma: string;
  node: string;
  claude: {
    instalado: boolean;
    versao: string | null;
  };
}

// Extensao 2026-07-11: nos de contexto (anexos que alimentam as sessoes).

export interface ArquivoContexto {
  nome: string;
  tamanho: number;
  tipo: string;
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
