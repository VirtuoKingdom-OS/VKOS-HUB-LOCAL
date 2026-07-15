// Barramento de eventos interno do hub. Fundacao pra integracoes: o hub anuncia
// o que acontece nele (cartao do CRM criado, movido, peca criada, sessao
// concluida) e quem quiser age. Emissor tipado em memoria, sem dependencia nova.
//
// Regras de robustez: assinante que lanca erro nao derruba os outros nem o
// emissor (try/catch por assinante, log honesto). Cada evento tambem vira uma
// linha no log de auditoria do workspace, com rotacao preguicosa.
//
// Modulo folha: so depende de node fs/path e do resolvedor de workspace. Nunca
// importa CRM, sessoes nem pecas, pra ninguem criar ciclo plugando aqui.

import { join } from "node:path";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

import { gravarTextoAtomico } from "../util/gravarJson.js";
import {
  garantirPastaDadosWorkspace,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

// Evento de dominio: o que aconteceu, em qual workspace, quando e o payload.
// O tipo e uma string "modulo:acao" (ex: "crm:contato-movido"). O dados carrega
// o payload especifico do tipo, combinado com cada emissor.
export interface EventoDominio {
  tipo: string;
  workspaceId: string;
  em: string;
  dados: Record<string, unknown>;
}

// Assinante de eventos. Recebe o evento inteiro. Pode ser sincrono ou async: o
// retorno (inclusive Promise rejeitada) e capturado pra nao derrubar o emissor.
export type Assinante = (evento: EventoDominio) => void | Promise<void>;

// Assinantes por tipo. A chave "*" recebe todos os eventos, qualquer tipo.
const assinantes = new Map<string, Set<Assinante>>();

// Nome do arquivo de auditoria por workspace.
const NOME_LOG = "eventos.jsonl";

// Rotacao: acima deste teto de linhas, mantem so as ULTIMAS deste tanto. A
// checagem e preguicosa, so a cada N emissoes, pra nao ler o arquivo toda vez.
const TETO_LINHAS = 2000;
const MANTER_LINHAS = 1000;
const CHECAR_A_CADA = 50;

// Contador de emissoes por workspace, pra disparar a checagem de rotacao so de
// vez em quando (a cada CHECAR_A_CADA emissoes daquele workspace).
const emissoesPorWorkspace = new Map<string, number>();

// Assina um tipo de evento (ou "*" pra todos). Devolve uma funcao pra cancelar.
export function assinar(tipo: string, fn: Assinante): () => void {
  let conjunto = assinantes.get(tipo);
  if (!conjunto) {
    conjunto = new Set();
    assinantes.set(tipo, conjunto);
  }
  conjunto.add(fn);
  return () => {
    conjunto?.delete(fn);
  };
}

// Emite um evento: persiste no log e entrega pros assinantes de forma tolerante.
// Ordem: primeiro o log de auditoria, depois os assinantes do tipo, depois os
// de "*". Um assinante que lanca nao afeta os outros nem o emissor.
export function emitir(evento: EventoDominio): void {
  registrarNoLog(evento);
  entregar(assinantes.get(evento.tipo), evento);
  entregar(assinantes.get("*"), evento);
}

// Entrega o evento pra um conjunto de assinantes, isolando o erro de cada um.
function entregar(conjunto: Set<Assinante> | undefined, evento: EventoDominio): void {
  if (!conjunto) return;
  // Copia o conjunto: um assinante pode cancelar durante a entrega sem baguncar.
  for (const fn of [...conjunto]) {
    try {
      const r = fn(evento);
      // Assinante async: captura a rejeicao pra Promise solta nao derrubar nada.
      if (r && typeof (r as Promise<void>).catch === "function") {
        (r as Promise<void>).catch((erro) => {
          console.error(`[eventos] assinante de "${evento.tipo}" falhou (async):`, erro);
        });
      }
    } catch (erro) {
      console.error(`[eventos] assinante de "${evento.tipo}" falhou:`, erro);
    }
  }
}

// Anexa uma linha JSON ao log de auditoria do workspace do evento. Falha de
// escrita nunca derruba a emissao: log honesto no console e segue.
function registrarNoLog(evento: EventoDominio): void {
  const id = evento.workspaceId;
  if (!id) return;
  try {
    const pasta = garantirPastaDadosWorkspace(id);
    const caminho = join(pasta, NOME_LOG);
    appendFileSync(caminho, JSON.stringify(evento) + "\n", "utf8");
    talvezRotacionar(id, caminho);
  } catch (erro) {
    console.error(`[eventos] falha ao gravar ${NOME_LOG} do workspace ${id}:`, erro);
  }
}

// Rotacao preguicosa: so checa o tamanho a cada CHECAR_A_CADA emissoes daquele
// workspace. Acima do teto, reescreve o arquivo com as ultimas MANTER_LINHAS.
function talvezRotacionar(id: string, caminho: string): void {
  const n = (emissoesPorWorkspace.get(id) ?? 0) + 1;
  emissoesPorWorkspace.set(id, n);
  if (n % CHECAR_A_CADA !== 0) return;
  try {
    const bruto = readFileSync(caminho, "utf8");
    const linhas = bruto.split("\n").filter((l) => l.length > 0);
    if (linhas.length <= TETO_LINHAS) return;
    const mantidas = linhas.slice(linhas.length - MANTER_LINHAS);
    gravarTextoAtomico(caminho, mantidas.join("\n") + "\n");
  } catch (erro) {
    console.error(`[eventos] falha ao rotacionar ${NOME_LOG} do workspace ${id}:`, erro);
  }
}

// Le as ultimas linhas do log de um workspace, da mais nova pra mais antiga.
// Usado pelo modo ensaio das automacoes (ultimo evento compativel). Arquivo
// ausente ou ilegivel devolve lista vazia, sem quebrar.
export function lerEventosRecentes(workspaceId: string, limite = 200): EventoDominio[] {
  try {
    const caminho = join(pastaDadosWorkspace(workspaceId), NOME_LOG);
    if (!existsSync(caminho)) return [];
    const linhas = readFileSync(caminho, "utf8").split("\n").filter((l) => l.length > 0);
    const recentes = linhas.slice(Math.max(0, linhas.length - limite)).reverse();
    const eventos: EventoDominio[] = [];
    for (const l of recentes) {
      try {
        const e = JSON.parse(l) as EventoDominio;
        if (e && typeof e.tipo === "string") eventos.push(e);
      } catch {
        // linha corrompida: ignora.
      }
    }
    return eventos;
  } catch {
    return [];
  }
}
