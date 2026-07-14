// Transcricao das sessoes: os turnos da conversa gravados em
// app/dados/workspaces/<id>/transcricoes/<idSessao>.json (um TurnoSessao[] por
// sessao). Prompt inicial e cada mensagem viram turno "usuario"; cada result vira
// turno "assistente" com o custoUsd daquele trecho. O caminho e resolvido POR
// CHAMADA a partir do workspace da sessao: o workspace troca em runtime.

import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import type { TurnoSessao } from "../tipos.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { pastaTranscricoesWorkspace } from "../workspaces/estado.js";

function garantirPasta(workspaceId: string): string {
  const pasta = pastaTranscricoesWorkspace(workspaceId);
  if (!existsSync(pasta)) {
    mkdirSync(pasta, { recursive: true });
  }
  return pasta;
}

function arquivoDe(workspaceId: string, id: string): string {
  return path.join(pastaTranscricoesWorkspace(workspaceId), `${id}.json`);
}

// Le os turnos de uma sessao. Sem arquivo, retorna lista vazia.
export function lerTranscricao(workspaceId: string, id: string): TurnoSessao[] {
  try {
    if (!workspaceId) return [];
    const caminho = arquivoDe(workspaceId, id);
    if (!existsSync(caminho)) {
      return [];
    }
    const bruto = readFileSync(caminho, "utf8");
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? (dados as TurnoSessao[]) : [];
  } catch {
    return [];
  }
}

// Anexa um turno ao arquivo da sessao, criando a pasta se preciso.
export function anexarTurno(workspaceId: string, id: string, turno: TurnoSessao): void {
  try {
    if (!workspaceId) return;
    garantirPasta(workspaceId);
    const turnos = lerTranscricao(workspaceId, id);
    turnos.push(turno);
    gravarJsonAtomico(arquivoDe(workspaceId, id), turnos);
  } catch {
    // Falha ao gravar a transcricao nao pode derrubar o gerenciador.
  }
}

// Apaga a transcricao de uma sessao (usado no DELETE da sessao).
export function apagarTranscricao(workspaceId: string, id: string): void {
  try {
    if (!workspaceId) return;
    const caminho = arquivoDe(workspaceId, id);
    if (existsSync(caminho)) {
      rmSync(caminho);
    }
  } catch {
    // Sem drama se ja nao existe.
  }
}
