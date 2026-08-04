// Estado dos workspaces: o registro de clientes do prestador de servico.
// Cada workspace e uma pasta VKOS completa. O estado do app passa a ser
// escopado por workspace em app/dados/workspaces/<id>/. Este modulo e a fonte
// unica do registro (app/dados/workspaces.json) e dos caminhos de dados por id.
//
// Modulo folha: so depende de node fs/path, nunca de outro modulo do servidor.
// Assim ninguem cria ciclo importando daqui.

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { quarentenarComErro } from "../util/quarentena.js";

// Este modulo mora em src/workspaces (dev) ou dist/workspaces (build). Subir tres
// niveis chega na pasta app nos dois casos.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");

// Raiz dos dados, lida a CADA chamada e nunca fixada na carga do modulo.
//
// VKOS_DADOS_TESTE desvia a raiz pro teste nao gravar no registro real. Isso
// nao e conveniencia, e conserto: ate 2026-07-27 estas tres constantes eram
// calculadas uma vez, entao o teste de rota registrava cliente no
// app/dados/workspaces.json de verdade. Ele salvava o registro antes e
// restaurava no fim, mas o runner roda os arquivos em paralelo, e duas
// restauracoes concorrentes se atropelam. O resultado apareceu na conferencia
// visual: cinco clientes fantasma no Dashboard, apontando pra pasta temporaria
// que ja tinha sumido.
//
// O CRM ja resolvia assim (ver crm/estado.ts). Aqui a raiz e o registro em si.
function raizDados(): string {
  return process.env.VKOS_DADOS_TESTE?.trim() || join(pastaApp, "dados");
}

function caminhoRegistroAtual(): string {
  return join(raizDados(), "workspaces.json");
}

// Um cliente do prestador. A pasta e uma instalacao VKOS completa.
export interface Workspace {
  id: string;
  nome: string;
  pasta: string;
  criadoEm: string;
  ultimoUso: string;
}

// O registro inteiro, do jeito que a rota GET /api/workspaces devolve.
export interface RegistroWorkspaces {
  workspaces: Workspace[];
  ativo: string | null;
}

// Cache em memoria do registro. Toda mutacao passa por salvarRegistro, entao o
// cache fica sempre coerente com o disco.
let cache: RegistroWorkspaces | null = null;
// De qual raiz o cache veio. Trocou a raiz, o cache nao vale mais.
let raizDoCache: string | null = null;

function garantirPastaDados(): void {
  const raiz = raizDados();
  if (!existsSync(raiz)) {
    mkdirSync(raiz, { recursive: true });
  }
}

// Valida a forma minima de um workspace vindo do disco.
function ehWorkspace(v: unknown): v is Workspace {
  if (!v || typeof v !== "object") return false;
  const w = v as Record<string, unknown>;
  return typeof w.id === "string" && typeof w.pasta === "string" && typeof w.nome === "string";
}

// Diz se o arquivo do registro ja existe em disco. A migracao usa isso pra
// decidir se ainda precisa rodar (idempotencia).
export function registroExiste(): boolean {
  return existsSync(caminhoRegistroAtual());
}

// Le o registro de um caminho. Arquivo ausente devolve null (primeira execucao,
// quem chamou comeca vazio em silencio). Arquivo que EXISTE mas nao parseia, ou
// que parseia numa forma que nao e um registro, vai pra quarentena e lanca.
//
// Falha fechado de proposito. Este arquivo e a lista de clientes do prestador:
// comecar vazio nao e comeco, e perda total. E qualquer gravacao seguinte
// (ativar cliente, criar sessao, renomear) persistiria esse vazio por cima do
// original. Melhor a tela nao abrir e o usuario restaurar um backup.
//
// Exportada pra provar o comportamento com fixture temporaria, sem apontar
// teste pro registro real do app.
export function lerRegistroDeArquivo(caminho: string): RegistroWorkspaces | null {
  if (!existsSync(caminho)) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    throw quarentenarComErro(caminho, "O registro de workspaces");
  }
  const dados = bruto as { workspaces?: unknown; ativo?: unknown } | null;
  if (!dados || typeof dados !== "object" || !Array.isArray(dados.workspaces)) {
    throw quarentenarComErro(caminho, "O registro de workspaces");
  }
  return {
    workspaces: dados.workspaces.filter(ehWorkspace),
    ativo: typeof dados.ativo === "string" ? dados.ativo : null,
  };
}

// Le o registro do disco uma vez. Arquivo ausente vira registro vazio.
// Corrompido lanca: ver lerRegistroDeArquivo.
export function lerRegistro(): RegistroWorkspaces {
  if (cache && raizDoCache === raizDados()) return cache;
  cache = lerRegistroDeArquivo(caminhoRegistroAtual()) ?? { workspaces: [], ativo: null };
  raizDoCache = raizDados();
  return cache;
}

// Guarda uma copia datada quando o registro PERDE workspace.
//
// O registro nunca teve backup, e ele e a unica memoria de quais projetos
// existem. As pastas de trabalho sobrevivem a qualquer coisa, mas sem este
// arquivo o Hub esquece ONDE elas estao, e o dono abre a barra vazia.
//
// Em 2026-08-01 isso aconteceu de verdade: tres projetos sumiram de uma vez e
// so voltaram porque o conteudo antigo do arquivo ainda estava numa conversa.
// O modo de falha ja tinha aparecido em 2026-07-27, do outro lado (clientes
// fantasma, ver o comentario de raizDados), e as pastas de estado orfas
// daquele dia continuam em app/dados/workspaces/.
//
// Perder um workspace de cada vez e gesto normal: o dono clica em remover.
// Cair de tres para zero nao e. A copia so nasce quando a conta diminui, entao
// ativar workspace e renomear, que gravam a mesma quantidade, nao sujam nada.
export function guardarCopiaSeEncolheu(
  caminho: string,
  novo: RegistroWorkspaces,
  agora = new Date(),
): string | null {
  let anterior: RegistroWorkspaces | null = null;
  try {
    anterior = lerRegistroDeArquivo(caminho);
  } catch {
    // Registro ilegivel ja tem quarentena propria na leitura. Gravar por cima de
    // lixo e o certo, e travar a gravacao aqui deixaria o Hub sem escrever nunca.
    return null;
  }
  if (!anterior || novo.workspaces.length >= anterior.workspaces.length) return null;

  const carimbo = agora.toISOString().replace(/[:.]/g, "-");
  const destino = `${caminho}.perdeu-${carimbo}`;
  try {
    copyFileSync(caminho, destino);
    console.warn(
      `[workspaces] o registro caiu de ${anterior.workspaces.length} para ${novo.workspaces.length}. Copia guardada em ${destino}`,
    );
    return destino;
  } catch (erro) {
    console.error("[workspaces] nao deu pra guardar a copia do registro:", erro);
    return null;
  }
}

// Grava o registro em memoria e no disco.
export function salvarRegistro(reg: RegistroWorkspaces): void {
  cache = reg;
  garantirPastaDados();
  guardarCopiaSeEncolheu(caminhoRegistroAtual(), reg);
  gravarJsonAtomico(caminhoRegistroAtual(), reg);
  raizDoCache = raizDados();
}

// Id do workspace ativo, ou null. So devolve id que aponta pra um workspace real.
export function idWorkspaceAtivo(): string | null {
  const reg = lerRegistro();
  if (reg.ativo && reg.workspaces.some((w) => w.id === reg.ativo)) {
    return reg.ativo;
  }
  return null;
}

// Raiz dos dados do hub: app/dados/. E o escopo CORE, do dono do Hub, onde mora
// o que nao pertence a cliente nenhum (o CRM, por exemplo).
export function pastaDadosHub(): string {
  return raizDados();
}

// Pasta que guarda os dados de todos os clientes: app/dados/workspaces/.
export function pastaWorkspacesHub(): string {
  return join(raizDados(), "workspaces");
}

// Pasta de dados escopada de um workspace: app/dados/workspaces/<id>/.
export function pastaDadosWorkspace(id: string): string {
  return join(raizDados(), "workspaces", id);
}

// Garante a pasta de dados de um workspace e devolve o caminho.
export function garantirPastaDadosWorkspace(id: string): string {
  const p = pastaDadosWorkspace(id);
  if (!existsSync(p)) {
    mkdirSync(p, { recursive: true });
  }
  return p;
}

// Pasta das transcricoes de um workspace.
export function pastaTranscricoesWorkspace(id: string): string {
  return join(pastaDadosWorkspace(id), "transcricoes");
}

// Todos os ids do registro. Usado no boot das sessoes e no total geral de custos.
export function listarIdsWorkspaces(): string[] {
  return lerRegistro().workspaces.map((w) => w.id);
}

export function workspacePorId(id: string): Workspace | null {
  return lerRegistro().workspaces.find((w) => w.id === id) ?? null;
}

// Normaliza uma pasta pra forma canonica de exibicao: absoluta, barras normais,
// sem barra no fim.
export function normalizarPasta(p: string): string {
  return resolve(p).replace(/\\/g, "/").replace(/\/+$/, "");
}

// Chave de comparacao de pastas: a forma canonica, minuscula no Windows (o
// filesystem la nao diferencia maiuscula).
export function chavePasta(p: string): string {
  const canonica = normalizarPasta(p);
  return process.platform === "win32" ? canonica.toLowerCase() : canonica;
}

// Acha um workspace ja registrado pra uma pasta, comparando de forma robusta.
export function workspacePorPasta(p: string): Workspace | null {
  const chave = chavePasta(p);
  return lerRegistro().workspaces.find((w) => chavePasta(w.pasta) === chave) ?? null;
}

// Ultimo segmento de um caminho, pra virar nome padrao do workspace.
export function ultimoSegmento(pasta: string): string {
  const partes = normalizarPasta(pasta).split("/").filter(Boolean);
  return partes[partes.length - 1] ?? "workspace";
}

// Gera um id de workspace curto e unico: w-<base36>.
export function gerarIdWorkspace(): string {
  const reg = lerRegistro();
  let id = "";
  do {
    id = `w-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  } while (reg.workspaces.some((w) => w.id === id));
  return id;
}

// Adiciona um workspace novo ao registro (sem ativar) e devolve ele.
export function adicionarWorkspace(pasta: string, nome?: string): Workspace {
  const reg = lerRegistro();
  const agora = new Date().toISOString();
  const ws: Workspace = {
    id: gerarIdWorkspace(),
    nome: (nome && nome.trim()) || ultimoSegmento(pasta),
    pasta: normalizarPasta(pasta),
    criadoEm: agora,
    ultimoUso: agora,
  };
  reg.workspaces.push(ws);
  salvarRegistro(reg);
  return ws;
}

// Marca um workspace como ativo e carimba o ultimoUso.
export function marcarAtivo(id: string): void {
  const reg = lerRegistro();
  const ws = reg.workspaces.find((w) => w.id === id);
  if (!ws) return;
  ws.ultimoUso = new Date().toISOString();
  reg.ativo = id;
  salvarRegistro(reg);
}

// Renomeia um workspace. Devolve o workspace atualizado, ou null se nao existe.
export function renomearWorkspace(id: string, nome: string): Workspace | null {
  const reg = lerRegistro();
  const ws = reg.workspaces.find((w) => w.id === id);
  if (!ws) return null;
  ws.nome = nome;
  salvarRegistro(reg);
  return ws;
}

// Apaga a pasta de dados do hub de um workspace (app/dados/workspaces/<id>/):
// conexoes.json com segredos, transcricoes, e o crm.json.migrado-para-core-*
// que a fusao deixou pra tras (o CRM vivo mora em app/dados/crm/ e nao e tocado
// aqui). A pasta VKOS do cliente (workspace.pasta) NUNCA e tocada aqui: e o
// conteudo dele. Tolerante: pasta ausente nao e erro.
export function apagarPastaDadosWorkspace(id: string): void {
  const pasta = pastaDadosWorkspace(id);
  if (existsSync(pasta)) {
    rmSync(pasta, { recursive: true, force: true });
  }
}

// Remove um workspace SO do registro. Nunca apaga a pasta VKOS nem a pasta de
// dados em disco. Devolve true se removeu, false se o id nao existia.
export function removerWorkspaceRegistro(id: string): boolean {
  const reg = lerRegistro();
  const antes = reg.workspaces.length;
  reg.workspaces = reg.workspaces.filter((w) => w.id !== id);
  if (reg.workspaces.length === antes) return false;
  if (reg.ativo === id) reg.ativo = null;
  salvarRegistro(reg);
  return true;
}
