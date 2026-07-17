// Tipos compartilhados entre os modulos do servidor.
// Espelham o CONTRATO.md. Nao mudar sem anotar no resumo de integracao.

export type StatusSessao =
  | "fila"
  | "iniciando"
  | "rodando"
  | "concluida"
  | "erro"
  | "parada";

export type ProvedorIA = "claude" | "codex";

// Estado do laco de conformidade pos-geracao de site.
// conferindo: a auditoria completa esta rodando.
// corrigindo: a auditoria reprovou e a mesma sessao foi retomada pra corrigir.
// aprovada: a auditoria passou, o site esta pronto.
// pendencias: parou (2 voltas sem passar, ou nao deu pra verificar). Nao bloqueia
// abrir o site; a barreira de publicacao segue conferindo de novo no deploy.
export interface ConferenciaSite {
  estado: "conferindo" | "corrigindo" | "aprovada" | "pendencias";
  // Quantas voltas de correcao ja foram feitas (0 antes da primeira correcao).
  volta: number;
}

export interface Sessao {
  id: string;
  // Sessoes antigas sem este campo sao normalizadas como Claude na carga.
  provedor: ProvedorIA;
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
  // No Codex, o custo e calculado pelos tokens e pela tabela local de precos.
  estimado?: boolean;
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
  // Extensao rodada otimizacoes de IA: Modo enxuto travado na criacao.
  // Decidido uma vez (config ligada e skill fora da geracao guiada) e
  // repetido em toda retomada, pra sessao nao mudar de personalidade.
  modoEnxuto?: boolean;
  // Resumo agregado e sem telefone/email, capturado quando o pedido cita CRM.
  // Persiste para a mesma protecao e o mesmo contexto voltarem no resume.
  contextoCrm?: string;
  // Laco de conformidade de site: pasta alvo da peca (subpasta de conteudo/) que
  // a geracao guiada de site vai criar. So a skill "site" do wizard preenche.
  // E a chave que o laco usa pra auditar a peca certa depois que a sessao conclui.
  pastaAlvo?: string;
  // Estado do laco de conformidade, atualizado pelo gerenciador e emitido no WS.
  conferenciaSite?: ConferenciaSite;
}

// Um turno da conversa de uma sessao, persistido em app/dados/transcricoes/.
export interface TurnoSessao {
  papel: "usuario" | "assistente";
  texto: string;
  em: string;
  custoUsd?: number;
  estimado?: boolean;
  // Turno gerado pelo proprio Hub, nao pelo usuario (ex: a retomada automatica
  // do laco de conformidade de site). A transcricao mostra discreto como
  // "Correcao automatica do Hub" em vez do texto cru de maquina.
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
  // Diagnostico deterministico do site estatico. Presente somente em pecas do
  // tipo site e usado pelo preview, geracao e publicacao.
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
  // A M1 prepara o campo. A verificacao real de login entra na M2.
  logado: boolean | null;
  binario: string | null;
}

export interface Ambiente {
  plataforma: string;
  node: string;
  claude: DeteccaoMotorIA;
  codex: DeteccaoMotorIA;
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
