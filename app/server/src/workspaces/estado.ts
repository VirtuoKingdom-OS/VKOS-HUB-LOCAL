// Estado dos workspaces: o registro de clientes do prestador de servico.
// Cada workspace e uma pasta VKOS completa. O estado do app passa a ser
// escopado por workspace em app/dados/workspaces/<id>/. Este modulo e a fonte
// unica do registro (app/dados/workspaces.json) e dos caminhos de dados por id.
//
// Modulo folha: so depende de node fs/path, nunca de outro modulo do servidor.
// Assim ninguem cria ciclo importando daqui.

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";

import { gravarJsonAtomico } from "../util/gravarJson.js";

// Este modulo mora em src/workspaces (dev) ou dist/workspaces (build). Subir tres
// niveis chega na pasta app nos dois casos.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");
const pastaDados = join(pastaApp, "dados");
const caminhoRegistro = join(pastaDados, "workspaces.json");
const pastaWorkspaces = join(pastaDados, "workspaces");

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

function garantirPastaDados(): void {
  if (!existsSync(pastaDados)) {
    mkdirSync(pastaDados, { recursive: true });
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
  return existsSync(caminhoRegistro);
}

// Le o registro do disco uma vez. Arquivo ausente ou corrompido vira registro
// vazio, sem quebrar o boot.
export function lerRegistro(): RegistroWorkspaces {
  if (cache) return cache;
  try {
    if (existsSync(caminhoRegistro)) {
      const dados = JSON.parse(readFileSync(caminhoRegistro, "utf8"));
      if (dados && Array.isArray(dados.workspaces)) {
        cache = {
          workspaces: dados.workspaces.filter(ehWorkspace),
          ativo: typeof dados.ativo === "string" ? dados.ativo : null,
        };
        return cache;
      }
    }
  } catch {
    // registro ilegivel: comeca vazio.
  }
  cache = { workspaces: [], ativo: null };
  return cache;
}

// Grava o registro em memoria e no disco.
export function salvarRegistro(reg: RegistroWorkspaces): void {
  cache = reg;
  garantirPastaDados();
  gravarJsonAtomico(caminhoRegistro, reg);
}

// Id do workspace ativo, ou null. So devolve id que aponta pra um workspace real.
export function idWorkspaceAtivo(): string | null {
  const reg = lerRegistro();
  if (reg.ativo && reg.workspaces.some((w) => w.id === reg.ativo)) {
    return reg.ativo;
  }
  return null;
}

// Pasta de dados escopada de um workspace: app/dados/workspaces/<id>/.
export function pastaDadosWorkspace(id: string): string {
  return join(pastaWorkspaces, id);
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
// conexoes.json com segredos, crm.json com PII, transcricoes. A pasta
// VKOS do cliente (workspace.pasta) NUNCA e tocada aqui: e o conteudo dele.
// Tolerante: pasta ausente nao e erro.
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
