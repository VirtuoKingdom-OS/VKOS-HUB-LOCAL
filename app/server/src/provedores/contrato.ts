// Contrato interno dos provedores de IA.
// O dialeto de eventos segue o subconjunto do stream-json do Claude que o hub
// consome. Provedores novos traduzem sua saida para este formato.

export type IdProvedor = "claude" | "codex";

export interface DeteccaoProvedor {
  instalado: boolean;
  versao: string | null;
  logado: boolean | null;
  binario: string | null;
}

export interface OpcaoModelo {
  alias: string;
  rotulo: string;
  observacaoCusto: string;
  // Marca o modelo economico do provedor: o pre-selecionado em tarefas simples
  // (Ajustar com IA) e o alvo do modo montagem do carrossel. Um por provedor.
  economico?: boolean;
}

export type EventoSessao = Record<string, unknown>;

export interface ConfigMcpProvedor {
  caminho: string;
  servidores: string[];
}

// Uso de tokens de uma conversa, normalizado. Serve de linha de base pro
// provedor que reporta o uso ACUMULADO da conversa em vez do uso do turno.
export interface UsoAcumuladoSessao {
  entradaTotal: number;
  entradaCache: number;
  saida: number;
  raciocinio: number;
}

export interface OpcoesSessaoProvedor {
  pastaTrabalho: string;
  prompt: string;
  modelo: string;
  permissao: "padrao" | "total";
  retomada?: string;
  mcp?: ConfigMcpProvedor | null;
  // Instrucoes extras da sessao (ex: contexto agregado do CRM). Entregues pelo
  // stdin, junto do prompt, nunca por argumento de linha de comando.
  // No Claude vira --append-system-prompt; no Codex prefixa o prompt do stdin.
  instrucoesExtras?: string;
  // Uso acumulado da conversa ate o turno ANTERIOR. Tres valores, tres sentidos:
  //   ausente  = sessao nova, ou provedor que ja reporta por turno (Claude).
  //   objeto   = linha de base: o provedor acumulativo subtrai e emite o turno.
  //   null     = retomada cuja linha de base o Hub nao tem (sessao de antes
  //              desta versao). O provedor acumulativo NAO pode chutar: declara
  //              o turno sem custo conhecido (custo_conhecido: false).
  // Medido em 2026-07-27: o Claude reporta total_cost_usd e usage do TURNO, o
  // Codex reporta o acumulado da thread. Ver decisoes/2026-07-27-custo-por-turno-e-total-que-nao-mente.md.
  usoAnterior?: UsoAcumuladoSessao | null;
}

export interface FechamentoProcessoSessao {
  codigo: number | null;
  stderr: string;
}

export type RemoverOuvinte = () => void;

export interface ProcessoSessao {
  aoEvento(ouvinte: (evento: EventoSessao) => void): RemoverOuvinte;
  aoErro(ouvinte: (erro: Error) => void): RemoverOuvinte;
  aoFechar(ouvinte: (fechamento: FechamentoProcessoSessao) => void): RemoverOuvinte;
  parar(): void;
}

export interface ProvedorIA {
  id: IdProvedor;
  detectar(): Promise<DeteccaoProvedor>;
  modelos(): OpcaoModelo[];
  iniciarSessao(opcoes: OpcoesSessaoProvedor): ProcessoSessao;
}
