// Cliente REST tipado, conforme o CONTRATO.md.
// Todas as chamadas passam pelo proxy do Vite (mesma origem).

import type {
  Ambiente,
  Contexto,
  EstadoVkos,
  ModeloCarrossel,
  Peca,
  ProvedorIA,
  RespostaCerebro,
  RespostaPastas,
  RespostaWorkspaces,
  Sessao,
  SkillVkos,
  TipoContexto,
  TurnoSessao,
  Workspace,
} from "../tipos/dominio";

// Alias de modelo entregue pelo provedor ativo. A lista valida vem da API.
export type ModeloIA = string;

export interface EscopoPecaSessao {
  pasta: string;
  tipo: "carrossel" | "site";
  // Obrigatorio para site. Carrossel usa sempre carrossel.html no servidor.
  arquivo?: string;
  // Injeta o contrato visual e autoriza revisar todas as paginas da peca.
  revisaoDesign?: boolean;
}

export interface OpcaoModeloIA {
  alias: string;
  rotulo: string;
  observacaoCusto: string;
  // Marcado pelo backend no modelo economico do provedor. O frontend nao tem
  // tabela propria: quem manda e este campo.
  economico?: boolean;
}

export interface ProvedorComModelos {
  id: ProvedorIA;
  modelos: OpcaoModeloIA[];
}

export interface RespostaProvedores {
  ativo: ProvedorIA;
  provedores: ProvedorComModelos[];
}

// Custos acumulados de todas as sessoes (mesmo as ja apagadas).
export interface Custos {
  totalUsd: number;
  totalSessoes: number;
  // tokensEntrada segue como TOTAL de entrada (nova + cache) por compatibilidade.
  tokensEntrada: number;
  tokensSaida: number;
  // Quebra honesta da entrada acumulada (rodada 6). Opcionais: backend antigo
  // pode nao mandar.
  tokensEntradaNova?: number;
  tokensCacheEscrita?: number;
  tokensCacheLeitura?: number;
  // Total somado de todos os clientes (workspaces). O totalUsd acima e so do
  // cliente ativo. Opcional: backend antigo pode nao mandar.
  totalGeralUsd?: number;
  // Um total e estimado quando inclui ao menos uma sessao Codex.
  estimado?: boolean;
  totalGeralEstimado?: boolean;
}

// Config global. modeloPadrao e o alias legado do modelo Claude.
export interface ConfigApp {
  modeloPadrao: ModeloIA;
  provedorPadrao?: ProvedorIA;
  modeloPadraoClaude?: ModeloIA;
  modeloPadraoCodex?: string;
  // Modo enxuto: sessoes novas recebem a regra de economia. Opcional: backend
  // antigo pode nao mandar.
  modoEnxuto?: boolean;
}

export interface SessaoWeb {
  usuario: { id: string; email: string; papel: "operador" | "cliente" };
  workspaceId: string | null;
  features: string[];
  modo: "core" | "hub";
  totpAtivo?: boolean;
}

export interface EstadoAutenticacao {
  precisaBootstrap: boolean;
  modo: "core" | "hub";
  obrigatoria: boolean;
  totpAtivo?: boolean;
}

// Erro de rede: servidor fora do ar ou inalcancavel.
export class ErroRede extends Error {
  constructor(mensagem = "Servidor fora do ar.") {
    super(mensagem);
    this.name = "ErroRede";
  }
}

// Erro de resposta do servidor (status fora do 2xx).
export class ErroApi extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

async function pedir<T>(url: string, opcoes?: RequestInit): Promise<T> {
  let resposta: Response;
  // Content-Type json so quando ha corpo: o Fastify responde 400 pra uma
  // requisicao (ex: DELETE) com content-type json e corpo vazio.
  const cabecalhos = opcoes?.body
    ? { "Content-Type": "application/json", ...(opcoes.headers ?? {}) }
    : opcoes?.headers;
  try {
    resposta = await fetch(url, {
      ...opcoes,
      headers: cabecalhos,
    });
  } catch {
    throw new ErroRede();
  }

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string; mensagem?: string };
      if (corpo?.erro) mensagem = corpo.erro;
      else if (corpo?.mensagem) mensagem = corpo.mensagem;
    } catch {
      // corpo sem json, mantem a mensagem padrao
    }
    throw new ErroApi(mensagem, resposta.status);
  }

  if (resposta.status === 204) {
    return undefined as T;
  }
  return (await resposta.json()) as T;
}

function corpoJson(dados: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(dados) };
}

export function obterEstadoAutenticacao(): Promise<EstadoAutenticacao> {
  return pedir<EstadoAutenticacao>("/api/auth/estado");
}

export function obterSessaoWeb(): Promise<SessaoWeb> {
  return pedir<SessaoWeb>("/api/auth/me");
}

export function entrar(dados: { email: string; senha: string; codigoTotp?: string }): Promise<SessaoWeb> {
  return pedir<SessaoWeb>("/api/auth/login", corpoJson(dados));
}

export function sair(): Promise<{ ok: true }> {
  return pedir<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function criarOperador(dados: { email: string; senha: string; segredo: string }): Promise<SessaoWeb> {
  return pedir("/api/auth/bootstrap", corpoJson(dados));
}

export function aceitarConvite(dados: { token: string; senha: string }): Promise<{ ok: true }> {
  return pedir("/api/auth/aceitar-convite", corpoJson(dados));
}

export interface FeaturePlataforma {
  id: string;
  nome: string;
  descricao: string;
  usaIa: boolean;
  disponivelParaCliente: boolean;
  dependeDe: string[];
}

export interface ModeloWorkspace {
  id: string;
  nome: string;
  descricao: string;
  features_json: Array<{ id: string; config?: object }>;
  motor_padrao: "claude_team" | "gemini" | "nenhum";
}

export interface WorkspacePlataforma {
  id: string;
  nome: string;
  slug: string;
  motor: "claude_team" | "gemini" | "nenhum";
  status: "ativo" | "suspenso";
  consumo_mes: number;
  features_ativas: string[];
  orcamento_mensal: number;
  acao_ao_estourar: "avisar" | "cortar";
  motor_estado: "nao_testado" | "operante" | "manutencao";
  motor_testado_em: string | null;
  motor_erro_codigo: string | null;
  claude_credencial_configurada: boolean;
  claude_credencial_status: "ausente" | "nao_testada" | "valida" | "invalida";
  claude_credencial_testada_em: string | null;
  logo: string | null;
  membros_resumo: Array<{ email: string; papel: "dono" | "membro" }>;
}

export interface EstadoMotoresAdmin {
  gemini: {
    disponivel: boolean;
    localizacao: string;
    modelos: object;
  };
  claudeTeam: { disponivel: boolean; modelos: object };
}

export interface EstadoClaudeCore {
  instalado: boolean;
  versao: string | null;
  logado: boolean | null;
  conta: string | null;
  loginVps: string;
}

export interface ConviteWorkspaceAdmin {
  id: string;
  email: string;
  papel: "dono" | "membro";
  expira_em: string;
  usado_em: string | null;
  criado_em: string;
  estado: "pendente" | "usado" | "expirado";
}

export interface MembroWorkspaceAdmin {
  usuario_id: string;
  email: string;
  status: "ativo" | "bloqueado";
  papel: "dono" | "membro";
  ultimo_acesso: string | null;
}

export type TipoModeloBanco =
  | "capa"
  | "desenvolvimento"
  | "cta"
  | "completo";

export interface ModeloBancoVisual {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoModeloBanco;
  pedeImagem: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

// Um original da semente visto pelo painel: metadados vigentes (sobrescrita
// quando existe) mais as marcas de estado.
export interface OriginalBancoVisual {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoModeloBanco;
  pedeImagem: boolean;
  temSobrescrita: boolean;
  atualizado: boolean;
}

export type OrigemHtmlBanco =
  | { modo: "colar"; html: string }
  | { modo: "peca"; workspaceId: string; pasta: string };

export interface EntradaModeloBanco {
  nome: string;
  descricao: string;
  tipo: TipoModeloBanco;
  pedeImagem: boolean;
  origemHtml?: OrigemHtmlBanco;
}

export function obterFeaturesAtivas(): Promise<{ features: string[]; workspaceId: string | null }> {
  return pedir("/api/features-ativas");
}

export function listarFeaturesAdmin(): Promise<{ features: FeaturePlataforma[] }> {
  return pedir("/api/admin/features");
}

export function listarModelosAdmin(): Promise<{ modelos: ModeloWorkspace[] }> {
  return pedir("/api/admin/modelos");
}

export function criarModeloAdmin(dados: { nome: string; descricao: string; motorPadrao: string; features: string[]; semente: string | null }): Promise<{ modelo: ModeloWorkspace }> {
  return pedir("/api/admin/modelos", corpoJson(dados));
}

export function listarWorkspacesAdmin(): Promise<{ workspaces: WorkspacePlataforma[] }> {
  return pedir("/api/admin/workspaces");
}

export function obterEstadoMotoresAdmin(): Promise<EstadoMotoresAdmin> {
  return pedir("/api/admin/motores");
}

export function criarWorkspaceAdmin(dados: { nome: string; modeloId: string }): Promise<{ workspace: WorkspacePlataforma }> {
  return pedir("/api/admin/workspaces", corpoJson(dados));
}

export function alterarFeatureAdmin(workspaceId: string, featureId: string, ativa: boolean): Promise<{ ok: true }> {
  return pedir(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/features/${encodeURIComponent(featureId)}`, { method: "PUT", body: JSON.stringify({ ativa }) });
}

export function alterarWorkspaceAdmin(workspaceId: string, dados: object): Promise<{ workspace: WorkspacePlataforma }> {
  return pedir(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}`, { method: "PATCH", body: JSON.stringify(dados) });
}

export function criarConviteAdmin(workspaceId: string, email: string): Promise<{ convite: { email: string; expiraEm: string; url: string } }> {
  return pedir(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/convites`, corpoJson({ email }));
}

export function listarConvitesAdmin(workspaceId: string): Promise<{ convites: ConviteWorkspaceAdmin[] }> {
  return pedir(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/convites`);
}

export function revogarConviteAdmin(workspaceId: string, conviteId: string): Promise<{ ok: true }> {
  return pedir(
    `/api/admin/workspaces/${encodeURIComponent(workspaceId)}/convites/${encodeURIComponent(conviteId)}`,
    { method: "DELETE" },
  );
}

export function listarMembrosAdmin(workspaceId: string): Promise<{ membros: MembroWorkspaceAdmin[] }> {
  return pedir(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/membros`);
}

export function removerMembroAdmin(workspaceId: string, usuarioId: string): Promise<{ ok: true }> {
  return pedir(
    `/api/admin/workspaces/${encodeURIComponent(workspaceId)}/membros/${encodeURIComponent(usuarioId)}`,
    { method: "DELETE" },
  );
}

export function derrubarSessoesAdmin(workspaceId: string): Promise<{ ok: true; total: number }> {
  return pedir(
    `/api/admin/workspaces/${encodeURIComponent(workspaceId)}/derrubar-sessoes`,
    { method: "POST" },
  );
}

export function listarBancoModelos(): Promise<{
  originais: OriginalBancoVisual[];
  proprios: ModeloBancoVisual[];
}> {
  return pedir("/api/admin/banco-modelos");
}

export function restaurarBancoModelo(
  id: string,
): Promise<{ modelo: ModeloBancoVisual }> {
  return pedir(`/api/admin/banco-modelos/${encodeURIComponent(id)}/restaurar`, {
    method: "POST",
  });
}

export function abrirStudioBancoModelo(
  id: string,
  workspaceId: string,
): Promise<{ pasta: string }> {
  return pedir(
    `/api/admin/banco-modelos/${encodeURIComponent(id)}/abrir-studio`,
    corpoJson({ workspaceId }),
  );
}

export function criarBancoModelo(
  dados: EntradaModeloBanco & { origemHtml: OrigemHtmlBanco },
): Promise<{ modelo: ModeloBancoVisual; avisos: string[] }> {
  return pedir("/api/admin/banco-modelos", corpoJson(dados));
}

export function atualizarBancoModelo(
  id: string,
  dados: EntradaModeloBanco,
): Promise<{ modelo: ModeloBancoVisual; avisos: string[] }> {
  return pedir(`/api/admin/banco-modelos/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function excluirBancoModelo(id: string): Promise<{ ok: true }> {
  return pedir(`/api/admin/banco-modelos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function definirCredencialAdmin(workspaceId: string, tipo: "apify" | "claude_team", valor: string, consentimento = false): Promise<{ ok: true; mascara: string }> {
  return pedir(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/credencial`, {
    method: "PUT",
    body: JSON.stringify({ tipo, valor, consentimento }),
  });
}

export function testarMotorAdmin(
  workspaceId: string,
  motor: "gemini" | "claude_team",
): Promise<{ ok: true; modelo: string; custoEstimado: number; resposta: string }> {
  return pedir(
    `/api/admin/workspaces/${encodeURIComponent(workspaceId)}/testar-motor`,
    corpoJson({ motor }),
  );
}

export interface EventoAuditoria {
  id: string;
  usuario_id: string | null;
  workspace_id: string | null;
  acao: string;
  alvo: string | null;
  detalhes_json: unknown;
  ip: string | null;
  criado_em: string;
}

export function listarAuditoriaAdmin(workspaceId?: string): Promise<{ eventos: EventoAuditoria[] }> {
  return pedir(`/api/admin/auditoria${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`);
}

export function abrirWorkspaceAdmin(workspaceId: string): Promise<{ ok: true }> {
  return pedir(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/abrir`, { method: "POST" });
}

export function obterClaudeCoreAdmin(atualizar = false): Promise<EstadoClaudeCore> {
  return pedir(`/api/admin/meu-claude${atualizar ? "?atualizar=1" : ""}`);
}

export function testarClaudeCoreAdmin(): Promise<{ ok: true; resposta: string }> {
  return pedir("/api/admin/meu-claude/testar", { method: "POST" });
}

export function iniciarTotp(): Promise<{ segredoTotp: string; uriTotp: string }> {
  return pedir("/api/auth/totp/iniciar", { method: "POST" });
}

export function confirmarTotp(segredoTotp: string, codigoTotp: string): Promise<{ ok: true; totpAtivo: true }> {
  return pedir("/api/auth/totp/confirmar", corpoJson({ segredoTotp, codigoTotp }));
}

export function desativarTotp(): Promise<{ ok: true; totpAtivo: false }> {
  return pedir("/api/auth/totp", { method: "DELETE" });
}

// Ambiente e onboarding.
export function obterAmbiente(atualizar = false): Promise<Ambiente> {
  return pedir<Ambiente>(`/api/ambiente${atualizar ? "?atualizar=1" : ""}`);
}

// Abre o seletor de pasta NATIVO do Windows (o do Explorer) na maquina do
// usuario e espera a escolha. Devolve null se ele cancelar. A chamada fica
// pendente enquanto o dialogo estiver aberto, entao sem timeout curto aqui.
export async function escolherPastaNativa(
  titulo?: string
): Promise<string | null> {
  const corpo = await pedir<{ caminho: string | null }>(
    "/api/ambiente/escolher-pasta",
    corpoJson({ titulo })
  );
  return corpo.caminho;
}

export function listarPastas(caminho?: string): Promise<RespostaPastas> {
  const busca = caminho ? `?caminho=${encodeURIComponent(caminho)}` : "";
  return pedir<RespostaPastas>(`/api/ambiente/pastas${busca}`);
}

// Ponte VKOS.
export function obterVkos(): Promise<EstadoVkos> {
  return pedir<EstadoVkos>("/api/vkos");
}

export function definirVkos(caminho: string): Promise<EstadoVkos> {
  return pedir<EstadoVkos>("/api/vkos", corpoJson({ caminho }));
}

export function obterCerebro(): Promise<RespostaCerebro> {
  return pedir<RespostaCerebro>("/api/vkos/cerebro");
}

// Grava o documento inteiro do Cerebro. Gravacao atomica no servidor, com
// backup automatico. Depois de salvar, o servidor avisa por WebSocket
// ({ tipo: "cerebro:atualizado" }) pra outras sessoes recarregarem.
export function salvarCerebro(texto: string): Promise<RespostaCerebro> {
  return pedir<RespostaCerebro>("/api/vkos/cerebro", {
    method: "PUT",
    body: JSON.stringify({ texto }),
  });
}

// O Cerebro dividido em secoes editaveis, a vista de cards da tela Cerebro.
export interface SecaoCerebro {
  indice: number;
  titulo: string;
  corpo: string;
  preenchida: boolean;
}

export interface CerebroEmSecoes {
  preambulo: string;
  secoes: SecaoCerebro[];
  epilogo: string;
  atualizadoEm: string;
  preenchido: boolean;
}

export function obterCerebroSecoes(): Promise<CerebroEmSecoes> {
  return pedir<CerebroEmSecoes>("/api/vkos/cerebro/secoes");
}

// Grava o corpo de UMA secao. Corpo vazio volta a secao pro estado em branco.
export function salvarCerebroSecao(
  indice: number,
  corpo: string,
): Promise<CerebroEmSecoes> {
  return pedir<CerebroEmSecoes>(`/api/vkos/cerebro/secoes/${indice}`, {
    method: "PUT",
    body: JSON.stringify({ corpo }),
  });
}

export function listarSkills(): Promise<{ skills: SkillVkos[] }> {
  return pedir<{ skills: SkillVkos[] }>("/api/vkos/skills");
}

export function listarPecas(): Promise<{ pecas: Peca[] }> {
  return pedir<{ pecas: Peca[] }>("/api/vkos/pecas");
}

// Sessoes (orquestrador).
export function listarSessoes(): Promise<{ sessoes: Sessao[] }> {
  return pedir<{ sessoes: Sessao[] }>("/api/sessoes");
}

export function criarSessao(dados: {
  titulo?: string;
  prompt: string;
  skill?: string;
  modelo?: ModeloIA;
  permissao?: "padrao" | "total";
  escopoPeca?: EscopoPecaSessao;
  // Geracao guiada de site: subpasta alvo em conteudo/. Liga o laco de
  // conformidade a peca certa depois que a sessao conclui.
  pastaAlvo?: string;
  // Geracao visual sem Cerebro: escolha explicita do usuario. Libera a guarda
  // de Cerebro no backend quando o negocio ainda nao tem Cerebro.
  semCerebro?: boolean;
  modelosUsados?: string[];
}): Promise<{ sessao: Sessao }> {
  return pedir<{ sessao: Sessao }>("/api/sessoes", corpoJson(dados));
}

// Transcricao da conversa de uma sessao (turnos usuario e assistente).
export function obterTranscricao(id: string): Promise<{ turnos: TurnoSessao[] }> {
  return pedir<{ turnos: TurnoSessao[] }>(
    `/api/sessoes/${encodeURIComponent(id)}/transcricao`
  );
}

// Custos acumulados de todas as sessoes.
export function obterCustos(): Promise<Custos> {
  return pedir<Custos>("/api/custos");
}

// ===== Workspaces (clientes) =====
// A resposta das acoes de workspace (criar, adicionar, ativar, renomear) agora
// e { workspace, workspaces, ativo } (workspace = o alvo da acao). Toleramos
// tambem o backend antigo, que devolvia o proprio Workspace cru.
export interface RespostaAcaoWorkspace {
  // O workspace alvo da acao, ou null se o backend nao mandou (fallback: quem
  // chama recarrega a lista inteira).
  workspace: Workspace | null;
  // A lista completa e o ativo, quando o backend novo os manda de brinde.
  workspaces?: Workspace[];
  ativo?: string | null;
  // Avisos opcionais (ex: rodar npm install) ao criar um cliente novo.
  avisos: string[];
}

// Avisos opcionais retornados ao criar um cliente novo (ex: rodar npm install).
function lerAvisos(corpo: unknown): string[] {
  if (corpo && typeof corpo === "object" && "avisos" in corpo) {
    const avisos = (corpo as { avisos?: unknown }).avisos;
    if (Array.isArray(avisos)) {
      return avisos.filter((a): a is string => typeof a === "string");
    }
  }
  return [];
}

// Le a resposta de uma acao de workspace nas duas formas: nova ({ workspace,
// workspaces, ativo }) ou antiga (o Workspace cru).
function lerRespostaAcao(corpo: unknown): RespostaAcaoWorkspace {
  const avisos = lerAvisos(corpo);
  if (corpo && typeof corpo === "object" && "workspace" in corpo) {
    const obj = corpo as {
      workspace?: Workspace | null;
      workspaces?: unknown;
      ativo?: unknown;
    };
    return {
      workspace: obj.workspace ?? null,
      workspaces: Array.isArray(obj.workspaces)
        ? (obj.workspaces as Workspace[])
        : undefined,
      ativo:
        typeof obj.ativo === "string"
          ? obj.ativo
          : obj.ativo === null
          ? null
          : undefined,
      avisos,
    };
  }
  // Backend antigo: o corpo e o proprio Workspace.
  return { workspace: (corpo as Workspace) ?? null, avisos };
}

export function listarWorkspaces(): Promise<RespostaWorkspaces> {
  return pedir<RespostaWorkspaces>("/api/workspaces");
}

// Registra uma pasta VKOS existente e ja a ativa. Erros 400 { erro }.
export async function adicionarWorkspace(
  pasta: string,
  nome?: string
): Promise<RespostaAcaoWorkspace> {
  const corpo = await pedir<unknown>(
    "/api/workspaces",
    corpoJson({ pasta, ...(nome ? { nome } : {}) })
  );
  return lerRespostaAcao(corpo);
}

// Ativa um workspace ja registrado. O servidor transmite workspace:ativado no WS.
export async function ativarWorkspace(id: string): Promise<RespostaAcaoWorkspace> {
  const corpo = await pedir<unknown>(
    `/api/workspaces/${encodeURIComponent(id)}/ativar`,
    { method: "POST" }
  );
  return lerRespostaAcao(corpo);
}

export async function renomearWorkspace(
  id: string,
  nome: string
): Promise<RespostaAcaoWorkspace> {
  const corpo = await pedir<unknown>(`/api/workspaces/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ nome }),
  });
  return lerRespostaAcao(corpo);
}

// Remove do registro (nao apaga a pasta). 400 se for o ativo.
export function removerWorkspace(id: string): Promise<void> {
  return pedir<void>(`/api/workspaces/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Cria um cliente novo clonando a estrutura do ativo (Cerebro em branco) e ja o
// ativa. Devolve o registro e avisos opcionais (ex: rodar npm install).
export async function criarWorkspaceNovo(
  nome: string,
  pastaDestino: string
): Promise<RespostaAcaoWorkspace> {
  const corpo = await pedir<unknown>(
    "/api/workspaces/novo",
    corpoJson({ nome, pastaDestino })
  );
  return lerRespostaAcao(corpo);
}

// Config do app.
export function obterConfig(): Promise<ConfigApp> {
  return pedir<ConfigApp>("/api/config");
}

// Provedor ativo e modelos disponiveis. O frontend nunca inventa aliases.
export function obterProvedores(): Promise<RespostaProvedores> {
  return pedir<RespostaProvedores>("/api/provedores");
}

export function atualizarConfig(dados: {
  modeloPadrao?: ModeloIA;
  provedorPadrao?: ProvedorIA;
  modeloPadraoClaude?: ModeloIA;
  modeloPadraoCodex?: string;
  modoEnxuto?: boolean;
}): Promise<ConfigApp> {
  return pedir<ConfigApp>("/api/config", {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export interface RegistroPublicacaoGithub {
  repo: string;
  url: string;
  branch: string;
  em: string;
}

export interface RegistroPublicacaoNetlify {
  siteId: string;
  url: string;
  em: string;
  pendente?: boolean;
}

// Modo de publicacao: astro converte o multipagina marcado em projeto Astro;
// html sobe a pasta crua. Contrato da peca 4 da rodada Sites Astro e Design.
export type ModoPublicacao = "astro" | "html";

export interface RespostaPublicacao {
  github: { conectado: boolean };
  netlify: { conectado: boolean };
  registro: {
    github?: RegistroPublicacaoGithub;
    netlify?: RegistroPublicacaoNetlify;
  };
  auditoria: {
    valido: boolean;
    paginas: string[];
    erros: string[];
    avisos: string[];
  };
  // Como esta peca sera publicada se nada mudar. Opcional: servidores antigos
  // ainda nao enviam o campo.
  modoPrevisto?: ModoPublicacao;
}

// A resposta dos POSTs ganha modo e avisos (peca 4). O registro continua na raiz.
export type RespostaPublicarGithub = RegistroPublicacaoGithub & {
  modo?: ModoPublicacao;
  avisos?: string[];
};
export type RespostaPublicarNetlify = RegistroPublicacaoNetlify & {
  modo?: ModoPublicacao;
  avisos?: string[];
};

export function obterPublicacao(pasta: string): Promise<RespostaPublicacao> {
  return pedir<RespostaPublicacao>(`/api/publicacao/${encodeURIComponent(pasta)}`);
}

export function publicarGithub(pasta: string): Promise<RespostaPublicarGithub> {
  return pedir<RespostaPublicarGithub>(
    `/api/publicacao/${encodeURIComponent(pasta)}/github`,
    { method: "POST" },
  );
}

export function publicarNetlify(pasta: string): Promise<RespostaPublicarNetlify> {
  return pedir<RespostaPublicarNetlify>(
    `/api/publicacao/${encodeURIComponent(pasta)}/netlify`,
    { method: "POST" },
  );
}

// Modelos de carrossel do VKOS (templates/carrossel/).
export function listarModelosCarrossel(): Promise<{ modelos: ModeloCarrossel[] }> {
  return pedir<{ modelos: ModeloCarrossel[] }>("/api/vkos/modelos-carrossel");
}

// Anexo inline do composer: sobe um arquivo (imagem, md, txt, pdf, csv, json,
// svg) codificado em base64 e recebe o caminho relativo a pasta do vkos, que
// entra no prompt como material anexado.
export interface RespostaAnexo {
  caminhoRelativo: string;
}

export function enviarAnexo(dados: {
  nome: string;
  conteudoBase64: string;
}): Promise<RespostaAnexo> {
  return pedir<RespostaAnexo>("/api/anexos", corpoJson(dados));
}

export function enviarAnexoPeca(
  pasta: string,
  dados: { nome: string; conteudoBase64: string },
): Promise<RespostaAnexo> {
  return pedir<RespostaAnexo>(
    `/api/vkos/pecas/${encodeURIComponent(pasta)}/anexo`,
    corpoJson(dados),
  );
}

export function enviarImagemPeca(
  pasta: string,
  dados: { nome: string; conteudoBase64: string },
): Promise<RespostaAnexo> {
  return pedir<RespostaAnexo>(
    `/api/vkos/pecas/${encodeURIComponent(pasta)}/imagem`,
    corpoJson(dados),
  );
}

export function enviarMensagem(id: string, texto: string): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(
    `/api/sessoes/${encodeURIComponent(id)}/mensagem`,
    corpoJson({ texto })
  );
}

export function pararSessao(id: string): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(`/api/sessoes/${encodeURIComponent(id)}/parar`, {
    method: "POST",
  });
}

export function excluirSessao(id: string): Promise<void> {
  return pedir<void>(`/api/sessoes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Apaga uma geracao inteira (a subpasta da peca em conteudo/). Irreversivel.
export function excluirPeca(pasta: string): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(`/api/vkos/pecas/${encodeURIComponent(pasta)}`, {
    method: "DELETE",
  });
}

// Nos de contexto.
// A resposta de criar, patch e anexar pode vir como { contexto } ou como o
// proprio Contexto cru, dependendo do backend. desembrulhar tolera os dois.
function desembrulharContexto(corpo: unknown): Contexto {
  if (corpo && typeof corpo === "object" && "contexto" in corpo) {
    return (corpo as { contexto: Contexto }).contexto;
  }
  return corpo as Contexto;
}

export function listarContextos(): Promise<{ contextos: Contexto[] }> {
  return pedir<{ contextos: Contexto[] }>("/api/contextos");
}

export async function criarContexto(
  nome: string,
  tipo: TipoContexto = "texto"
): Promise<Contexto> {
  const corpo = await pedir<unknown>("/api/contextos", corpoJson({ nome, tipo }));
  return desembrulharContexto(corpo);
}

export async function atualizarContexto(
  id: string,
  dados: { nome?: string; texto?: string }
): Promise<Contexto> {
  const corpo = await pedir<unknown>(`/api/contextos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
  return desembrulharContexto(corpo);
}

export function excluirContexto(id: string): Promise<void> {
  return pedir<void>(`/api/contextos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function anexarArquivos(
  id: string,
  arquivos: File[]
): Promise<Contexto> {
  const forma = new FormData();
  for (const arquivo of arquivos) {
    forma.append("arquivo", arquivo, arquivo.name);
  }
  let resposta: Response;
  try {
    // Sem Content-Type manual: o browser monta o boundary do multipart.
    resposta = await fetch(`/api/contextos/${encodeURIComponent(id)}/arquivos`, {
      method: "POST",
      body: forma,
    });
  } catch {
    throw new ErroRede();
  }
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string; mensagem?: string };
      if (corpo?.erro) mensagem = corpo.erro;
      else if (corpo?.mensagem) mensagem = corpo.mensagem;
    } catch {
      // corpo sem json
    }
    throw new ErroApi(mensagem, resposta.status);
  }
  const corpo = await resposta.json();
  return desembrulharContexto(corpo);
}

export function removerArquivo(id: string, nome: string): Promise<void> {
  return pedir<void>(
    `/api/contextos/${encodeURIComponent(id)}/arquivos/${encodeURIComponent(nome)}`,
    { method: "DELETE" }
  );
}

// URL de um anexo servido pelo backend, pra preview no no.
export function urlArquivoContexto(id: string, nome: string): string {
  return `/api/contextos/${encodeURIComponent(id)}/arquivos/${encodeURIComponent(nome)}`;
}

// Canvas persistido. O backend guarda o JSON cru, sem interpretar.
export function obterCanvas<T = unknown>(): Promise<T> {
  return pedir<T>("/api/canvas");
}

// Grava o canvas do workspace ativo. workspaceId e o cliente do MOMENTO em que
// o save foi agendado: o servidor rejeita com 409 se ja nao for o ativo (save
// obsoleto de outro cliente numa corrida de troca). Nesse caso descartamos em
// silencio, nunca vira erro pro usuario: e so um save que perdeu a corrida.
export async function salvarCanvas(
  dados: unknown,
  workspaceId?: string | null
): Promise<void> {
  const corpo =
    workspaceId != null
      ? { ...(dados as Record<string, unknown>), workspaceId }
      : dados;
  try {
    await pedir<void>("/api/canvas", {
      method: "PUT",
      body: JSON.stringify(corpo),
    });
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 409) return;
    throw erro;
  }
}

// Monta a URL de uma peca servida em /pecas/. Aceita caminho com barra ou contrabarra.
// Idempotente: se o backend ja mandou a url pronta (/pecas/... ou /pecas-html/...
// das paginas isoladas de peca fonteHtml), devolve como veio.
export function urlPeca(caminho: string): string {
  if (caminho.startsWith("/pecas/") || caminho.startsWith("/pecas-html/")) return caminho;
  const limpo = caminho.replace(/^[\\/]+/, "");
  const partes = limpo.split(/[\\/]/).map(encodeURIComponent);
  return `/pecas/${partes.join("/")}`;
}
