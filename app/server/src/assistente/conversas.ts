import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { pastaDadosHub } from "../workspaces/estado.js";

export interface ConversaAssistente {
  id: string;
  sessaoId: string | null;
  titulo: string;
  criadaEm: string;
  ultimoUso: string;
  previa: string;
  // Por que a última leitura do lote.json desta conversa falhou, em português.
  // Ausente ou null quer dizer que não falhou.
  //
  // ISTO EXISTE PORQUE O ERRO JÁ FOI MUDO UMA VEZ. Em 2026-08-04 o assistente
  // gravou um lote.json fora do contrato, o schema recusou, e as três chamadas
  // que sincronizam engoliram a exceção num catch vazio. O dono leu "criei o
  // lote.json" na conversa e viu a fila vazia do lado, sem uma linha dizendo
  // por quê. Falha silenciosa numa tela que promete execução é pior que falha
  // barulhenta: ela parece que funcionou.
  erroLote?: string | null;
}

interface IndiceAssistente {
  versao: 1;
  conversas: ConversaAssistente[];
}

export function pastaAssistente(): string {
  return join(pastaDadosHub(), "assistente");
}

export function caminhoIndiceAssistente(): string {
  return join(pastaAssistente(), "indice.json");
}

function lerIndice(): IndiceAssistente {
  const caminho = caminhoIndiceAssistente();
  if (!existsSync(caminho)) return { versao: 1, conversas: [] };
  try {
    const valor = JSON.parse(readFileSync(caminho, "utf8")) as Partial<IndiceAssistente>;
    if (!Array.isArray(valor.conversas)) return { versao: 1, conversas: [] };
    return { versao: 1, conversas: valor.conversas.filter((item) => item && typeof item.id === "string") };
  } catch {
    return { versao: 1, conversas: [] };
  }
}

function salvarIndice(indice: IndiceAssistente): void {
  mkdirSync(pastaAssistente(), { recursive: true });
  gravarJsonAtomico(caminhoIndiceAssistente(), indice);
}

function idNovo(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listarConversasAssistente(): ConversaAssistente[] {
  return lerIndice().conversas
    .slice()
    .sort((a, b) => b.ultimoUso.localeCompare(a.ultimoUso))
    .map((conversa) => ({ ...conversa }));
}

export function acharConversaAssistente(id: string): ConversaAssistente | undefined {
  return lerIndice().conversas.find((conversa) => conversa.id === id);
}

export function criarConversaAssistente(titulo = "Nova conversa"): ConversaAssistente {
  const agora = new Date().toISOString();
  const conversa: ConversaAssistente = {
    id: idNovo(),
    sessaoId: null,
    titulo: titulo.trim().slice(0, 120) || "Nova conversa",
    criadaEm: agora,
    ultimoUso: agora,
    previa: "",
  };
  const indice = lerIndice();
  indice.conversas.push(conversa);
  salvarIndice(indice);
  return conversa;
}

export function atualizarConversaAssistente(
  id: string,
  campos: Partial<Pick<ConversaAssistente, "sessaoId" | "titulo" | "previa">>,
): ConversaAssistente | undefined {
  const indice = lerIndice();
  const conversa = indice.conversas.find((item) => item.id === id);
  if (!conversa) return undefined;
  Object.assign(conversa, campos, { ultimoUso: new Date().toISOString() });
  salvarIndice(indice);
  return { ...conversa };
}

// Guarda (ou limpa) o motivo da última recusa de lote.
//
// Separado de atualizarConversaAssistente por dois motivos, e os dois doem se
// forem ignorados: ele NÃO mexe em ultimoUso, senão toda leitura da tela
// reordenaria a lista de conversas; e ele só grava quando o valor MUDA, senão
// cada consulta reescreveria o índice no disco.
export function registrarErroDeLote(id: string, erro: string | null): void {
  const indice = lerIndice();
  const conversa = indice.conversas.find((item) => item.id === id);
  if (!conversa) return;
  const atual = conversa.erroLote ?? null;
  if (atual === erro) return;
  if (erro === null) delete conversa.erroLote;
  else conversa.erroLote = erro;
  salvarIndice(indice);
}

export function apagarConversaAssistente(id: string): boolean {
  const indice = lerIndice();
  const antes = indice.conversas.length;
  indice.conversas = indice.conversas.filter((conversa) => conversa.id !== id);
  if (indice.conversas.length === antes) return false;
  salvarIndice(indice);
  return true;
}
