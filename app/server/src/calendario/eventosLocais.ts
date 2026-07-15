// Agenda local do workspace. O Calendario do hub e local-first: os eventos vivem
// no proprio workspace, em app/dados/workspaces/<id>/calendario.json, e funcionam
// sem Google. O Google Calendar vira uma sincronizacao OPCIONAL, ao lado da do
// CRM: quando ligada e conectada, cada evento local ganha uma copia no Google
// (o googleId fica guardado no proprio evento local), sem parar de ser local.
//
// Este modulo e o dono do calendario.json: le e grava a config inteira
// (sincronizarCrm, sincronizarGoogle, vinculos do CRM e os eventos locais) e faz
// o CRUD dos eventos, propagando pro Google quando o modo google esta ativo. A
// propagacao e tolerante: erro no Google vira log e segue, nunca derruba o local.
//
// Escrita atomica pelo util/gravarJson. Leitura tolerante: arquivo ausente ou
// no formato antigo vira config com defaults, sem quebrar.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { pastaDadosWorkspace } from "../workspaces/estado.js";
import { lerConexoes } from "../conexoes/estado.js";
import {
  atualizarEvento as atualizarEventoGoogle,
  criarEvento as criarEventoGoogle,
  excluirEvento as excluirEventoGoogle,
  type Evento,
} from "../google/calendar.js";

// A agenda do Google e sempre a principal da conta conectada.
const AGENDA = "primary";

// Um evento da agenda local. inicioIso e fimIso ficam sempre em ISO UTC. O
// googleId, quando presente, aponta pra copia deste evento no Google Calendar.
export interface EventoLocal {
  id: string;
  titulo: string;
  descricao?: string;
  inicioIso: string;
  fimIso: string;
  googleId?: string;
}

// A config inteira do Calendario de um workspace, gravada em calendario.json.
export interface ConfigCalendario {
  // Sincronizacao CRM > agenda: cartao com proximo contato vira evento local.
  sincronizarCrm: boolean;
  // Sincronizacao com o Google Calendar: espelha os eventos locais pro Google.
  sincronizarGoogle: boolean;
  // contatoId > id do evento LOCAL. So os criados pela sincronizacao do CRM.
  vinculos: Record<string, string>;
  eventosLocais: EventoLocal[];
}

// Dados pra criar ou atualizar um evento local. Mesmo shape que o cliente do
// Google consome, entao a propagacao passa direto.
export interface DadosEventoLocal {
  titulo: string;
  descricao?: string;
  inicioIso: string;
  fimIso: string;
}

function caminhoConfig(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), "calendario.json");
}

function configVazia(): ConfigCalendario {
  return { sincronizarCrm: false, sincronizarGoogle: false, vinculos: {}, eventosLocais: [] };
}

// Sanea um evento local vindo do disco. Descarta o que nao tem a forma minima.
function saneiaEvento(v: unknown): EventoLocal | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  if (
    typeof e.id !== "string" ||
    typeof e.titulo !== "string" ||
    typeof e.inicioIso !== "string" ||
    typeof e.fimIso !== "string"
  ) {
    return null;
  }
  const evento: EventoLocal = {
    id: e.id,
    titulo: e.titulo,
    inicioIso: e.inicioIso,
    fimIso: e.fimIso,
  };
  if (typeof e.descricao === "string") evento.descricao = e.descricao;
  if (typeof e.googleId === "string" && e.googleId) evento.googleId = e.googleId;
  return evento;
}

// Le a config do calendario do workspace. Tolerante: arquivo ausente ou ilegivel
// vira config com defaults. Migracao de leitura: vinculo do CRM so vale quando
// aponta pra um evento LOCAL existente. Vinculo no formato antigo (id do Google,
// de antes do local-first) nao tem evento local correspondente e e descartado.
export function lerConfigCalendario(workspaceId: string): ConfigCalendario {
  const caminho = caminhoConfig(workspaceId);
  if (!existsSync(caminho)) return configVazia();
  try {
    const cru = JSON.parse(readFileSync(caminho, "utf8")) as Partial<ConfigCalendario>;
    const eventosLocais = Array.isArray(cru.eventosLocais)
      ? cru.eventosLocais.map(saneiaEvento).filter((e): e is EventoLocal => e !== null)
      : [];
    const idsLocais = new Set(eventosLocais.map((e) => e.id));
    const vinculosBrutos =
      cru.vinculos && typeof cru.vinculos === "object"
        ? (cru.vinculos as Record<string, unknown>)
        : {};
    const vinculos: Record<string, string> = {};
    for (const [contatoId, eventoId] of Object.entries(vinculosBrutos)) {
      if (typeof eventoId === "string" && idsLocais.has(eventoId)) {
        vinculos[contatoId] = eventoId;
      }
    }
    return {
      sincronizarCrm: cru.sincronizarCrm === true,
      sincronizarGoogle: cru.sincronizarGoogle === true,
      vinculos,
      eventosLocais,
    };
  } catch {
    return configVazia();
  }
}

function salvarConfig(workspaceId: string, config: ConfigCalendario): void {
  gravarJsonAtomico(caminhoConfig(workspaceId), config);
}

// === Flags de sincronizacao ===

export function definirSincronizarCrm(workspaceId: string, ligado: boolean): void {
  const config = lerConfigCalendario(workspaceId);
  config.sincronizarCrm = ligado;
  salvarConfig(workspaceId, config);
}

export function definirSincronizarGoogle(workspaceId: string, ligado: boolean): void {
  const config = lerConfigCalendario(workspaceId);
  config.sincronizarGoogle = ligado;
  salvarConfig(workspaceId, config);
}

// === Estado do Google ===

// Conectado quando o refreshToken foi salvo pelo fluxo de conectar.
export function googleConectado(workspaceId: string): boolean {
  const servidor = lerConexoes(workspaceId).servidores["googlecalendar"];
  return !!servidor?.config.refreshToken;
}

// Modo google: sincronizarGoogle ligado E o Google conectado. Senao, modo local.
export function modoGoogle(workspaceId: string): boolean {
  return lerConfigCalendario(workspaceId).sincronizarGoogle && googleConectado(workspaceId);
}

// === Propagacao pro Google ===

type AcaoEspelho =
  | { tipo: "criar"; dados: DadosEventoLocal }
  | { tipo: "atualizar"; googleId: string; dados: Partial<DadosEventoLocal> }
  | { tipo: "remover"; googleId: string };

// Propaga uma acao do CRUD local pra copia no Google, mas SO quando o modo google
// esta ativo. Tolerante: qualquer erro no Google vira log e a operacao local
// segue. Devolve o googleId da copia nova no caso de criar, senao undefined.
async function propagar(workspaceId: string, acao: AcaoEspelho): Promise<string | undefined> {
  if (!modoGoogle(workspaceId)) return undefined;
  try {
    if (acao.tipo === "criar") {
      const g = await criarEventoGoogle(workspaceId, AGENDA, acao.dados);
      return g.id;
    }
    if (acao.tipo === "atualizar") {
      await atualizarEventoGoogle(workspaceId, AGENDA, acao.googleId, acao.dados);
      return undefined;
    }
    await excluirEventoGoogle(workspaceId, AGENDA, acao.googleId);
    return undefined;
  } catch (erro) {
    console.error(`[calendario] falha ao propagar ${acao.tipo} no Google:`, (erro as Error).message);
    return undefined;
  }
}

// === CRUD dos eventos locais ===

// Gera um id curto e unico o suficiente pro uso local, no padrao dos ids da casa.
function gerarId(): string {
  return `evl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// Lista os eventos locais que cruzam o intervalo [deIso, ateIso], ordenados por
// inicio. Mesmo criterio de sobreposicao da janela usada no Google.
export function listarEventosLocais(
  workspaceId: string,
  deIso: string,
  ateIso: string,
): EventoLocal[] {
  const config = lerConfigCalendario(workspaceId);
  return config.eventosLocais
    .filter((e) => e.inicioIso <= ateIso && e.fimIso >= deIso)
    .sort((a, b) => a.inicioIso.localeCompare(b.inicioIso));
}

// Cria um evento local. No modo google, espelha no Google antes e guarda o
// googleId. A re-leitura da config antes de gravar evita atropelar uma escrita
// concorrente durante o await da propagacao.
export async function criarEventoLocal(
  workspaceId: string,
  dados: DadosEventoLocal,
): Promise<EventoLocal> {
  const googleId = await propagar(workspaceId, { tipo: "criar", dados });
  const evento: EventoLocal = {
    id: gerarId(),
    titulo: dados.titulo,
    inicioIso: dados.inicioIso,
    fimIso: dados.fimIso,
  };
  if (dados.descricao !== undefined) evento.descricao = dados.descricao;
  if (googleId) evento.googleId = googleId;
  const config = lerConfigCalendario(workspaceId);
  config.eventosLocais.push(evento);
  salvarConfig(workspaceId, config);
  return evento;
}

// Atualiza um evento local (campos parciais). No modo google, propaga a mudanca
// pra copia. Devolve o evento atualizado, ou null se o id nao existe.
export async function atualizarEventoLocal(
  workspaceId: string,
  id: string,
  dados: Partial<DadosEventoLocal>,
): Promise<EventoLocal | null> {
  const antes = lerConfigCalendario(workspaceId);
  const existente = antes.eventosLocais.find((e) => e.id === id);
  if (!existente) return null;
  if (existente.googleId) {
    await propagar(workspaceId, { tipo: "atualizar", googleId: existente.googleId, dados });
  }
  const config = lerConfigCalendario(workspaceId);
  const evento = config.eventosLocais.find((e) => e.id === id);
  if (!evento) return null;
  if (dados.titulo !== undefined) evento.titulo = dados.titulo;
  if (dados.descricao !== undefined) evento.descricao = dados.descricao;
  if (dados.inicioIso !== undefined) evento.inicioIso = dados.inicioIso;
  if (dados.fimIso !== undefined) evento.fimIso = dados.fimIso;
  salvarConfig(workspaceId, config);
  return evento;
}

// Remove um evento local. No modo google, remove a copia junto. Devolve false se
// o id nao existe.
export async function removerEventoLocal(workspaceId: string, id: string): Promise<boolean> {
  const antes = lerConfigCalendario(workspaceId);
  const existente = antes.eventosLocais.find((e) => e.id === id);
  if (!existente) return false;
  if (existente.googleId) {
    await propagar(workspaceId, { tipo: "remover", googleId: existente.googleId });
  }
  const config = lerConfigCalendario(workspaceId);
  config.eventosLocais = config.eventosLocais.filter((e) => e.id !== id);
  salvarConfig(workspaceId, config);
  return true;
}

// === Vinculos do CRM (contatoId > id do evento LOCAL) ===

export function lerVinculo(workspaceId: string, contatoId: string): string | undefined {
  return lerConfigCalendario(workspaceId).vinculos[contatoId];
}

export function definirVinculo(workspaceId: string, contatoId: string, eventoId: string): void {
  const config = lerConfigCalendario(workspaceId);
  config.vinculos[contatoId] = eventoId;
  salvarConfig(workspaceId, config);
}

export function removerVinculo(workspaceId: string, contatoId: string): void {
  const config = lerConfigCalendario(workspaceId);
  if (!(contatoId in config.vinculos)) return;
  delete config.vinculos[contatoId];
  salvarConfig(workspaceId, config);
}

// === Espelhos locais de eventos criados direto no Google (modo google) ===

// Guarda um espelho local de um evento que a rota criou DIRETO no Google (modo
// google). Assim, desligar o Google depois nao some com o evento: ele reaparece
// na agenda local. O googleId liga o espelho ao evento do Google.
export function guardarEspelhoLocal(workspaceId: string, googleEvento: Evento): void {
  const espelho: EventoLocal = {
    id: gerarId(),
    titulo: googleEvento.titulo,
    inicioIso: googleEvento.inicioIso ?? "",
    fimIso: googleEvento.fimIso ?? "",
    googleId: googleEvento.id,
  };
  if (googleEvento.descricao !== undefined) espelho.descricao = googleEvento.descricao;
  const config = lerConfigCalendario(workspaceId);
  config.eventosLocais.push(espelho);
  salvarConfig(workspaceId, config);
}

// Atualiza o espelho local de um evento do Google, achado pelo googleId. Silencioso
// quando nao ha espelho (evento so no Google, sem copia local).
export function atualizarEspelhoPorGoogleId(
  workspaceId: string,
  googleId: string,
  dados: Partial<DadosEventoLocal>,
): void {
  const config = lerConfigCalendario(workspaceId);
  const espelho = config.eventosLocais.find((e) => e.googleId === googleId);
  if (!espelho) return;
  if (dados.titulo !== undefined) espelho.titulo = dados.titulo;
  if (dados.descricao !== undefined) espelho.descricao = dados.descricao;
  if (dados.inicioIso !== undefined) espelho.inicioIso = dados.inicioIso;
  if (dados.fimIso !== undefined) espelho.fimIso = dados.fimIso;
  salvarConfig(workspaceId, config);
}

// Remove o espelho local de um evento do Google, achado pelo googleId.
export function removerEspelhoPorGoogleId(workspaceId: string, googleId: string): void {
  const config = lerConfigCalendario(workspaceId);
  const antes = config.eventosLocais.length;
  config.eventosLocais = config.eventosLocais.filter((e) => e.googleId !== googleId);
  if (config.eventosLocais.length !== antes) salvarConfig(workspaceId, config);
}

// Envia pro Google todos os eventos locais que ainda nao tem copia (sem googleId)
// e guarda o googleId de cada um. Usado ao LIGAR a sincronizacao com o Google. A
// rota garante o Google conectado antes. Devolve o resumo pro usuario.
export async function enviarLocaisAoGoogle(
  workspaceId: string,
): Promise<{ enviados: number; erros: number }> {
  const pendentes = lerConfigCalendario(workspaceId).eventosLocais.filter((e) => !e.googleId);
  let enviados = 0;
  let erros = 0;
  for (const ev of pendentes) {
    try {
      const g = await criarEventoGoogle(workspaceId, AGENDA, {
        titulo: ev.titulo,
        descricao: ev.descricao,
        inicioIso: ev.inicioIso,
        fimIso: ev.fimIso,
      });
      const config = lerConfigCalendario(workspaceId);
      const alvo = config.eventosLocais.find((e) => e.id === ev.id);
      if (alvo) {
        alvo.googleId = g.id;
        salvarConfig(workspaceId, config);
      }
      enviados += 1;
    } catch (erro) {
      erros += 1;
      console.error(
        "[calendario] falha ao enviar evento local ao Google:",
        (erro as Error).message,
      );
    }
  }
  return { enviados, erros };
}
