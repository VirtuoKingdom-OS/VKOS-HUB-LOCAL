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
