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
  // Total somado de todos os clientes (workspaces) mais o historico dos clientes
  // ja removidos. O totalUsd acima e so do cliente ativo. Opcional: backend
  // antigo pode nao mandar.
  totalGeralUsd?: number;
  // Um total e estimado quando inclui ao menos uma sessao Codex.
  estimado?: boolean;
  totalGeralEstimado?: boolean;
  // Turnos que consumiram credito sem o Hub saber quanto (modelo fora da tabela
  // de precos, retomada sem linha de base, processo morto antes do result).
  turnosSemCusto?: number;
  // true quando o total e um PISO, nao o valor exato: ha turno sem custo
  // conhecido dentro dele. A tela precisa dizer isso, nunca fingir exatidao.
  piso?: boolean;
  totalGeralPiso?: boolean;
}

// Config global. modeloPadrao e o alias legado do modelo Claude.
export interface ConfigApp {
  modeloPadrao: ModeloIA;
  provedorPadrao?: ProvedorIA;
  modeloPadraoClaude?: ModeloIA;
  modeloPadraoCodex?: string;
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

// Ambiente e onboarding.
export function obterAmbiente(atualizar = false): Promise<Ambiente> {
  return pedir<Ambiente>(`/api/ambiente${atualizar ? "?atualizar=1" : ""}`);
}

export function abrirLoginMotor(provedor: ProvedorIA): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(
    "/api/ambiente/login",
    corpoJson({ provedor })
  );
}

export function criarAtalhoHub(): Promise<{ ok: true; caminho: string }> {
  return pedir<{ ok: true; caminho: string }>("/api/ambiente/atalho", {
    method: "POST",
  });
}

export type EventoTesteSetup =
  | { tipo: "inicio"; modelo: string }
  | { tipo: "texto"; texto: string }
  | {
      tipo: "resultado";
      texto: string;
      custoUsd: number;
      estimado: boolean;
    }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "fim"; sucesso: boolean; modelo?: string };

export type EventoInstalacaoMotor =
  | { tipo: "inicio"; provedor: ProvedorIA; pacote: string }
  | { tipo: "texto"; texto: string }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "fim"; sucesso: boolean };

async function lerFluxoNdjson<T>(
  url: string,
  dados: unknown,
  mensagemSemFluxo: string,
  aoEvento: (evento: T) => void,
): Promise<void> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new ErroRede();
  }

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo.erro) mensagem = corpo.erro;
    } catch {
      // Corpo sem JSON, mantém a mensagem curta.
    }
    throw new ErroApi(mensagem, resposta.status);
  }

  if (!resposta.body) throw new ErroRede(mensagemSemFluxo);

  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await leitor.read();
    buffer += decodificador.decode(value, { stream: !done });
    const linhas = buffer.split("\n");
    buffer = linhas.pop() ?? "";
    for (const linha of linhas) {
      if (!linha.trim()) continue;
      aoEvento(JSON.parse(linha) as T);
    }
    if (done) break;
  }
  if (buffer.trim()) aoEvento(JSON.parse(buffer) as T);
}

export function instalarMotorSetup(
  provedor: ProvedorIA,
  aoEvento: (evento: EventoInstalacaoMotor) => void,
): Promise<void> {
  return lerFluxoNdjson(
    "/api/ambiente/instalar",
    { provedor },
    "O servidor não abriu o fluxo da instalação.",
    aoEvento,
  );
}

// Le a resposta NDJSON do teste de motor conforme ela chega. Esse caminho nao
// cria uma Sessao do hub e funciona antes de existir workspace.
export async function testarMotorSetup(
  provedor: ProvedorIA,
  aoEvento: (evento: EventoTesteSetup) => void
): Promise<void> {
  return lerFluxoNdjson(
    "/api/ambiente/teste",
    { provedor },
    "O servidor não abriu o fluxo do teste.",
    aoEvento,
  );
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
  // "projeto" roda a sessao na raiz da instalacao em vez da pasta do workspace.
  // Quem usa e o chat da VKOS-IDE, pra falar dos mesmos arquivos que a arvore
  // dela mostra.
  escopo?: "projeto";
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
//
// So o nome vai no corpo. Sem pastaDestino, o servidor monta o destino sozinho
// em <raiz do projeto>/workspaces/<slug do nome>, que e o caminho normal desde
// 2026-07-27. A pessoa nao decide mais onde a pasta nasce.
export async function criarWorkspaceNovo(
  nome: string
): Promise<RespostaAcaoWorkspace> {
  const corpo = await pedir<unknown>("/api/workspaces/novo", corpoJson({ nome }));
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
}): Promise<ConfigApp> {
  return pedir<ConfigApp>("/api/config", {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

// ===== Exportação local do site. Substituiu a publicação integrada no GitHub
// e na Netlify em 2026-07-26. Dois gestos: abrir a pasta da peça no explorador
// do sistema e baixar o site pronto num ZIP.

// Modo do pacote: astro converte o multipagina marcado em projeto Astro e
// exporta o site compilado; html exporta a pasta crua.
export type ModoPublicacao = "astro" | "html";

export interface RegistroExportacao {
  em: string;
  modo: ModoPublicacao;
}

export interface RespostaPublicacao {
  registro: { exportacao?: RegistroExportacao };
  auditoria: {
    valido: boolean;
    paginas: string[];
    erros: string[];
    avisos: string[];
  };
  // Como esta peca sai se nada mudar. Opcional: servidores antigos ainda nao
  // enviam o campo.
  modoPrevisto?: ModoPublicacao;
  nomeArquivo?: string;
}

export function obterPublicacao(pasta: string): Promise<RespostaPublicacao> {
  return pedir<RespostaPublicacao>(`/api/publicacao/${encodeURIComponent(pasta)}`);
}

export function abrirPastaDaPeca(pasta: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(
    `/api/publicacao/${encodeURIComponent(pasta)}/abrir-pasta`,
    { method: "POST" },
  );
}

// Baixa o ZIP do site. A barreira de qualidade vive no servidor: reprovado, a
// resposta vem em JSON com as pendências e nada é baixado. O modo real do
// pacote volta no header, pra tela não prometer Astro quando saiu HTML puro.
export async function baixarSite(
  pasta: string,
): Promise<{ modo: ModoPublicacao; avisos: string[] }> {
  const resposta = await fetch(
    `/api/publicacao/${encodeURIComponent(pasta)}/exportar`,
    { method: "POST" },
  );
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo?.erro) mensagem = corpo.erro;
    } catch {
      // corpo sem json: mantem a mensagem padrao
    }
    throw new Error(mensagem);
  }

  const nome =
    resposta.headers
      .get("Content-Disposition")
      ?.match(/filename="?([^"]+)"?/)?.[1] ?? `${pasta}.zip`;
  const modo: ModoPublicacao =
    resposta.headers.get("X-VKOS-Modo-Exportacao") === "astro" ? "astro" : "html";
  // Motivo do fallback, quando houve. Sem isso o usuário via "saiu em HTML" e
  // nunca descobria que o Astro foi tentado e por que falhou.
  const bruto = resposta.headers.get("X-VKOS-Avisos-Exportacao");
  const avisos = bruto
    ? decodeURIComponent(bruto).split(" | ").filter(Boolean)
    : [];

  const blob = await resposta.blob();
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = nome;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  // Revogar no mesmo tick do click cancela o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return { modo, avisos };
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
