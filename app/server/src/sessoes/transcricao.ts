// Transcricao das sessoes: os turnos da conversa gravados em
// app/dados/workspaces/<id>/transcricoes/<idSessao>.json (um TurnoSessao[] por
// sessao). Prompt inicial e cada mensagem viram turno "usuario"; cada result vira
// turno "assistente" com o custoUsd daquele trecho. O caminho e resolvido POR
// CHAMADA a partir do workspace da sessao: o workspace troca em runtime.

import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import type { TurnoSessao } from "../tipos.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { quarentenarOuFalhar } from "../util/quarentena.js";
import { pastaDadosHub, pastaTranscricoesWorkspace } from "../workspaces/estado.js";

function pastaTranscricoes(workspaceId: string): string {
  return workspaceId
    ? pastaTranscricoesWorkspace(workspaceId)
    : path.join(pastaDadosHub(), "assistente", "transcricoes");
}

function garantirPasta(workspaceId: string): string {
  const pasta = pastaTranscricoes(workspaceId);
  if (!existsSync(pasta)) {
    mkdirSync(pasta, { recursive: true });
  }
  return pasta;
}

export function caminhoTranscricaoSessao(workspaceId: string, id: string): string {
  return path.join(pastaTranscricoes(workspaceId), `${id}.json`);
}

// Le os turnos de um caminho. Arquivo ausente vira lista vazia, em silencio
// (sessao que ainda nao falou nada). Arquivo que EXISTE mas nao parseia, ou que
// parseia sem ser lista, vai pra quarentena e a sessao recomeca do zero.
//
// Quarentena e segue com vazio: a transcricao e um log de exibicao, a sessao
// precisa continuar gravando os turnos novos mesmo com o arquivo velho ilegivel.
// O que nao pode e o anexarTurno ler vazio e regravar a conversa inteira com um
// turno so. Por isso, se a quarentena falhar, isso aqui lanca: o anexarTurno
// engole o erro e nao grava nada por cima do original.
//
// Exportada pra provar o comportamento com fixture temporaria.
export function lerTranscricaoDeArquivo(caminho: string): TurnoSessao[] {
  if (!existsSync(caminho)) return [];
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    quarentenarOuFalhar(caminho, "A transcricao da sessao");
    return [];
  }
  if (!Array.isArray(bruto)) {
    quarentenarOuFalhar(caminho, "A transcricao da sessao");
    return [];
  }
  return bruto as TurnoSessao[];
}

// Le os turnos de uma sessao. Sem workspace, retorna lista vazia.
export function lerTranscricao(workspaceId: string, id: string): TurnoSessao[] {
  return lerTranscricaoDeArquivo(caminhoTranscricaoSessao(workspaceId, id));
}

// Anexa um turno ao arquivo da sessao, criando a pasta se preciso.
export function anexarTurno(workspaceId: string, id: string, turno: TurnoSessao): void {
  try {
    garantirPasta(workspaceId);
    const turnos = lerTranscricao(workspaceId, id);
    turnos.push(turno);
    gravarJsonAtomico(caminhoTranscricaoSessao(workspaceId, id), turnos);
  } catch {
    // Falha ao gravar a transcricao nao pode derrubar o gerenciador. A leitura
    // vem antes da gravacao de proposito: se ela lancar (corrompido e sem
    // quarentena), o gravarJsonAtomico nem chega a rodar e o original fica onde
    // esta, inteiro.
  }
}

// Apaga a transcricao de uma sessao (usado no DELETE da sessao).
export function apagarTranscricao(workspaceId: string, id: string): void {
  try {
    const caminho = caminhoTranscricaoSessao(workspaceId, id);
    if (existsSync(caminho)) {
      rmSync(caminho);
    }
  } catch {
    // Sem drama se ja nao existe.
  }
}
