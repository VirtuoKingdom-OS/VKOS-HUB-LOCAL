// Estado do CRM v4, escopado por workspace.
//
// O CONTATO e o cartao do funil: cada contato tem um estagio (colunaId) e
// caminha pelo quadro sozinho. Negocio e valor/oportunidade preso a um contato,
// sem estagio proprio. O caminho e resolvido por chamada porque o workspace
// ativo pode mudar em runtime.
//
// O que fica no crm.json: coisa em pouca quantidade e que muda pouco (colunas,
// organizacoes, contatos, negocios, orcamentos, tarefas). Continua sendo lido e
// gravado inteiro, o que e aceitavel nessa escala.
//
// O que saiu pra append-only, ao lado do crm.json: interacoes.jsonl e
// estagios.jsonl (ver historico.ts). Antes, registrar uma interacao reescrevia
// a base de contatos inteira, e isso travava o event loop junto com as sessoes
// de IA e o WebSocket.

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { emitir } from "../eventos/barramento.js";
import { anexarJsonl } from "../util/jsonl.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { quarentenarOuFalhar } from "../util/quarentena.js";
import { normalizarTelefone } from "../util/telefone.js";
import {
  garantirPastaDadosWorkspace,
  idWorkspaceAtivo,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";
import {
  anexarEstagios,
  anexarEstagiosSemRepetir,
  anexarInteracoes,
  anexarInteracoesSemRepetir,
  lerEstagiosDaPasta,
  lerInteracoesDaPasta,
} from "./historico.js";
import { normalizarEstadoCrm } from "./migracao.js";
import {
  ErroCrm,
  STATUS_NEGOCIO,
  STATUS_ORCAMENTO,
  TIPOS_COLUNA,
  TIPOS_INTERACAO,
  chaveOrganizacao,
  colunasPadrao,
  gerarId,
  ordenarColunas,
  type Coluna,
  type Contato,
  type DadosLead,
  type EstadoCrm,
  type Interacao,
  type Negocio,
  type Orcamento,
  type Organizacao,
  type ParticipanteNegocio,
  type RegistroEstagio,
  type StatusNegocio,
  type StatusOrcamento,
  type Tarefa,
  type TipoColuna,
  type TipoInteracao,
} from "./modelo.js";

export { ErroCrm, VERSAO_CRM_ATUAL } from "./modelo.js";
export type {
  Coluna,
  Contato,
  DadosLead,
  EstadoCrm,
  Interacao,
  Negocio,
  Orcamento,
  Organizacao,
  ParticipanteNegocio,
  RegistroEstagio,
  StatusNegocio,
  StatusOrcamento,
  Tarefa,
  TipoColuna,
  TipoInteracao,
} from "./modelo.js";
export { normalizarEstadoCrm } from "./migracao.js";
export type { ResultadoNormalizacaoCrm } from "./migracao.js";

const NOME_ARQUIVO = "crm.json";
// Rastro do que a migracao recuperou em vez de descartar. Fica ao lado do
// crm.json pra o usuario ter onde olhar quando algo aparecer fora do lugar.
const NOME_RECUPERACOES = "recuperacoes.jsonl";

function pastaAtiva(): string | null {
  const id = idWorkspaceAtivo();
  return id ? pastaDadosWorkspace(id) : null;
}

function caminhoAtivo(): string | null {
  const pasta = pastaAtiva();
  return pasta ? join(pasta, NOME_ARQUIVO) : null;
}

function estadoInicial(): EstadoCrm {
  return {
    versao: 4,
    colunas: colunasPadrao(),
    organizacoes: [],
    contatos: [],
    negocios: [],
    orcamentos: [],
    tarefas: [],
  };
}

// Move o arquivo corrompido pra quarentena e devolve o novo caminho. A regra
// mora no util compartilhado: uma implementacao so, um comportamento so.
function quarentenar(caminho: string): string {
  return quarentenarOuFalhar(caminho, "O arquivo do CRM");
}

// Le e normaliza. Arquivo ausente devolve null (o chamador semeia o inicial).
// Arquivo que EXISTE mas nao parseia, ou que parseia num formato que nao e um
// estado de CRM, vai pra quarentena e lanca um ErroCrm legivel: o original nunca
// e sobrescrito nem descartado.
//
// Exportada pra provar o comportamento com fixture temporaria, sem apontar
// teste pro CRM real.
export function lerEstadoCrmDeArquivo(
  caminho: string,
  workspaceOrigemId = "",
): EstadoCrm | null {
  if (!existsSync(caminho)) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    const destino = quarentenar(caminho);
    throw new ErroCrm(
      `O arquivo do CRM esta corrompido e nao pode ser lido. O original foi preservado em "${basename(destino)}". Restaure um backup valido pra recuperar os contatos.`,
      409,
    );
  }
  const resultado = normalizarEstadoCrm(bruto, workspaceOrigemId);
  if (!resultado) {
    const destino = quarentenar(caminho);
    throw new ErroCrm(
      `O arquivo do CRM esta num formato invalido e nao pode ser lido. O original foi preservado em "${basename(destino)}". Restaure um backup valido pra recuperar os contatos.`,
      409,
    );
  }
  if (!resultado.precisaSalvar) return resultado.estado;

  // Historico primeiro, crm.json depois. Se o processo cair no meio, a proxima
  // leitura repete a migracao e o "sem repetir" evita linha duplicada. A ordem
  // inversa perderia o historico de vez, porque o crm.json ja nao teria mais as
  // interacoes de dentro dos contatos.
  const pasta = dirname(caminho);
  anexarInteracoesSemRepetir(pasta, resultado.interacoesExtraidas);
  anexarEstagiosSemRepetir(pasta, resultado.estagiosExtraidos);
  if (resultado.recuperados.length > 0) {
    const em = new Date().toISOString();
    anexarJsonl(
      join(pasta, NOME_RECUPERACOES),
      resultado.recuperados.map((mensagem) => ({ em, mensagem })),
    );
  }
  gravarJsonAtomico(caminho, resultado.estado);
  return resultado.estado;
}

function salvar(estado: EstadoCrm): void {
  const id = idWorkspaceAtivo();
  if (!id) {
    throw new ErroCrm("Nenhum cliente ativo. Abra um workspace pra usar o CRM.", 409);
  }
  garantirPastaDadosWorkspace(id);
  gravarJsonAtomico(join(pastaDadosWorkspace(id), NOME_ARQUIVO), estado);
}

function emitirCrm(tipo: string, dados: Record<string, unknown>): void {
  const id = idWorkspaceAtivo();
  if (!id) return;
  emitir({ tipo, workspaceId: id, em: new Date().toISOString(), dados });
}

export function lerEstado(): EstadoCrm {
  const caminho = caminhoAtivo();
  if (!caminho) return estadoInicial();
  const existente = lerEstadoCrmDeArquivo(caminho, idWorkspaceAtivo() ?? "");
  if (existente) return existente;
  const inicial = estadoInicial();
  salvar(inicial);
  return inicial;
}

function lerEstadoMutavel(): EstadoCrm {
  if (!idWorkspaceAtivo()) {
    throw new ErroCrm("Nenhum cliente ativo. Abra um workspace pra usar o CRM.", 409);
  }
  return lerEstado();
}

// Pasta do historico do workspace ativo, ja criada. Interacao e estagio sao
// dado do usuario: falha de escrita sobe, nunca vira log silencioso.
function pastaHistoricoMutavel(): string {
  const id = idWorkspaceAtivo();
  if (!id) {
    throw new ErroCrm("Nenhum cliente ativo. Abra um workspace pra usar o CRM.", 409);
  }
  return garantirPastaDadosWorkspace(id);
}

// ------------------------------------------------------------ historico

// Interacoes do workspace ativo, das mais novas pras mais antigas. Filtra por
// contato quando pedido.
export function lerInteracoes(contatoId?: string): Interacao[] {
  const pasta = pastaAtiva();
  if (!pasta) return [];
  const todas = lerInteracoesDaPasta(pasta);
  const filtradas = contatoId
    ? todas.filter((item) => item.contatoId === contatoId)
    : todas;
  return [...filtradas].sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
}

// Historico de estagio, do mais antigo pro mais novo (a ordem em que aconteceu).
export function lerEstagios(contatoId?: string): RegistroEstagio[] {
  const pasta = pastaAtiva();
  if (!pasta) return [];
  const todos = lerEstagiosDaPasta(pasta);
  return contatoId ? todos.filter((item) => item.contatoId === contatoId) : todos;
}

// ------------------------------------------------------------ validacao

function textoObrigatorio(valor: unknown, rotulo: string, limite = 200): string {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new ErroCrm(`${rotulo} e obrigatorio.`, 400);
  }
  return valor.trim().slice(0, limite);
}

function textoOpcional(valor: unknown, limite = 200): string | undefined {
  if (typeof valor !== "string") return undefined;
  return valor.trim().slice(0, limite) || undefined;
}

function normalizaValor(valor: unknown, rotulo = "Valor"): number | undefined {
  if (valor === undefined || valor === null || valor === "") return undefined;
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (typeof numero !== "number" || !Number.isFinite(numero) || numero < 0) {
    throw new ErroCrm(`${rotulo} precisa ser um numero positivo.`, 400);
  }
  return numero;
}

function normalizaInteiro(
  valor: unknown,
  rotulo: string,
  minimo: number,
  maximo: number,
): number | undefined {
  if (valor === undefined || valor === null || valor === "") return undefined;
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (typeof numero !== "number" || !Number.isFinite(numero)) {
    throw new ErroCrm(`${rotulo} precisa ser um numero.`, 400);
  }
  const inteiro = Math.trunc(numero);
  if (inteiro < minimo || inteiro > maximo) {
    throw new ErroCrm(`${rotulo} precisa ficar entre ${minimo} e ${maximo}.`, 400);
  }
  return inteiro;
}

function normalizaDataOpcional(valor: unknown, rotulo: string): string | null {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string" || Number.isNaN(Date.parse(valor))) {
    throw new ErroCrm(`${rotulo} precisa ser uma data valida.`, 400);
  }
  return new Date(Date.parse(valor)).toISOString();
}

function normalizaBooleano(valor: unknown, rotulo: string): boolean {
  if (typeof valor !== "boolean") {
    throw new ErroCrm(`${rotulo} precisa ser verdadeiro ou falso.`, 400);
  }
  return valor;
}

function normalizaTags(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const item of valor) {
    if (typeof item !== "string") continue;
    const tag = item.trim().slice(0, 40);
    const chave = tag.toLowerCase();
    if (!tag || vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push(tag);
  }
  return saida;
}

function normalizaParticipantes(
  estado: EstadoCrm,
  valor: unknown,
): ParticipanteNegocio[] | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (!Array.isArray(valor)) {
    throw new ErroCrm("Participantes precisa ser uma lista.", 400);
  }
  const saida: ParticipanteNegocio[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const bruto = item as Record<string, unknown>;
    const contatoId = textoObrigatorio(bruto.contatoId, "Contato do participante");
    acharContato(estado, contatoId);
    saida.push({ contatoId, papel: textoOpcional(bruto.papel, 40) ?? "participa" });
  }
  return saida;
}

// -------------------------------------------------------------- buscas

function acharContato(estado: EstadoCrm, id: string): Contato {
  const contato = estado.contatos.find((item) => item.id === id);
  if (!contato) throw new ErroCrm("Contato nao encontrado.", 404);
  return contato;
}

function acharNegocio(estado: EstadoCrm, id: string): Negocio {
  const negocio = estado.negocios.find((item) => item.id === id);
  if (!negocio) throw new ErroCrm("Negocio nao encontrado.", 404);
  return negocio;
}

function acharColuna(estado: EstadoCrm, id: string): Coluna {
  const coluna = estado.colunas.find((item) => item.id === id);
  if (!coluna) throw new ErroCrm("Coluna nao encontrada.", 404);
  return coluna;
}

function acharOrganizacao(estado: EstadoCrm, id: string): Organizacao {
  const organizacao = estado.organizacoes.find((item) => item.id === id);
  if (!organizacao) throw new ErroCrm("Organizacao nao encontrada.", 404);
  return organizacao;
}

function acharOrcamento(estado: EstadoCrm, id: string): Orcamento {
  const orcamento = estado.orcamentos.find((item) => item.id === id);
  if (!orcamento) throw new ErroCrm("Orcamento nao encontrado.", 404);
  return orcamento;
}

function acharTarefa(estado: EstadoCrm, id: string): Tarefa {
  const tarefa = estado.tarefas.find((item) => item.id === id);
  if (!tarefa) throw new ErroCrm("Tarefa nao encontrada.", 404);
  return tarefa;
}

function primeiraColuna(estado: EstadoCrm): Coluna {
  return ordenarColunas(estado.colunas)[0];
}

function colunaValidaOuPrimeira(estado: EstadoCrm, valor: unknown): string {
  if (typeof valor === "string" && estado.colunas.some((coluna) => coluna.id === valor)) {
    return valor;
  }
  return primeiraColuna(estado).id;
}

// -------------------------------------------------------- organizacoes

// Resolve a organizacao de um contato a partir do corpo da requisicao. Aceita
// organizacaoId direto ou o nome da empresa: nome que ainda nao existe vira uma
// Organizacao nova, em vez de morrer como string solta no contato.
function resolverOrganizacao(
  estado: EstadoCrm,
  corpo: Record<string, unknown>,
): string | undefined {
  if ("organizacaoId" in corpo) {
    const id = textoOpcional(corpo.organizacaoId);
    if (!id) return undefined;
    acharOrganizacao(estado, id);
    return id;
  }
  const nome = textoOpcional(corpo.empresa);
  if (!nome) return undefined;
  const chave = chaveOrganizacao(nome);
  const existente = estado.organizacoes.find(
    (item) => chaveOrganizacao(item.nome) === chave,
  );
  if (existente) return existente.id;
  const agora = new Date().toISOString();
  const organizacao: Organizacao = {
    id: gerarId("o"),
    nome,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  estado.organizacoes.push(organizacao);
  return organizacao.id;
}

export function criarOrganizacao(corpo: Record<string, unknown>): Organizacao {
  const estado = lerEstadoMutavel();
  const nome = textoObrigatorio(corpo.nome, "Nome da organizacao");
  const chave = chaveOrganizacao(nome);
  const existente = estado.organizacoes.find(
    (item) => chaveOrganizacao(item.nome) === chave,
  );
  if (existente) throw new ErroCrm("Ja existe uma organizacao com esse nome.", 409);
  const agora = new Date().toISOString();
  const organizacao: Organizacao = {
    id: gerarId("o"),
    nome,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const documento = textoOpcional(corpo.documento, 40);
  if (documento) organizacao.documento = documento;
  const site = textoOpcional(corpo.site, 300);
  if (site) organizacao.site = site;
  estado.organizacoes.push(organizacao);
  salvar(estado);
  emitirCrm("crm:organizacao-criada", { organizacao });
  return organizacao;
}

export function atualizarOrganizacao(
  id: string,
  corpo: Record<string, unknown>,
): Organizacao {
  const estado = lerEstadoMutavel();
  const organizacao = acharOrganizacao(estado, id);
  if ("nome" in corpo) organizacao.nome = textoObrigatorio(corpo.nome, "Nome da organizacao");
  if ("documento" in corpo) {
    const documento = textoOpcional(corpo.documento, 40);
    if (documento) organizacao.documento = documento;
    else delete organizacao.documento;
  }
  if ("site" in corpo) {
    const site = textoOpcional(corpo.site, 300);
    if (site) organizacao.site = site;
    else delete organizacao.site;
  }
  organizacao.atualizadoEm = new Date().toISOString();
  salvar(estado);
  emitirCrm("crm:organizacao-atualizada", { organizacao });
  return organizacao;
}

// Exclui a organizacao. Os contatos dela NAO somem: perdem so o vinculo.
export function removerOrganizacao(id: string): void {
  const estado = lerEstadoMutavel();
  const organizacao = acharOrganizacao(estado, id);
  const agora = new Date().toISOString();
  for (const contato of estado.contatos) {
    if (contato.organizacaoId === id) {
      delete contato.organizacaoId;
      contato.atualizadoEm = agora;
    }
  }
  estado.organizacoes = estado.organizacoes.filter((item) => item.id !== id);
  salvar(estado);
  emitirCrm("crm:organizacao-excluida", { organizacao });
}

// ------------------------------------------------------------- contatos

function definirTelefone(contato: Contato, valor: string | undefined): void {
  if (!valor) {
    delete contato.telefone;
    delete contato.telefoneNormalizado;
    return;
  }
  contato.telefone = valor;
  const normalizado = normalizarTelefone(valor);
  // Numero que nao da pra normalizar com confianca fica so no campo digitado.
  // Melhor sem chave de deduplicacao do que com uma chave errada.
  if (normalizado) contato.telefoneNormalizado = normalizado;
  else delete contato.telefoneNormalizado;
}

function saneiaDadosLead(valor: unknown): DadosLead | undefined {
  if (!valor || typeof valor !== "object") return undefined;
  const bruto = valor as Record<string, unknown>;
  const saida: DadosLead = {};
  for (const campo of [
    "placeId",
    "categoria",
    "endereco",
    "site",
    "termoBusca",
    "localizacao",
    "capturadoEm",
  ] as const) {
    const texto = textoOpcional(bruto[campo], 300);
    if (texto) saida[campo] = texto;
  }
  for (const campo of ["nota", "totalAvaliacoes"] as const) {
    const numero = bruto[campo];
    if (typeof numero === "number" && Number.isFinite(numero)) saida[campo] = numero;
  }
  return Object.keys(saida).length > 0 ? saida : undefined;
}

// Grava a entrada do contato numa coluna. Toda mudanca de estagio vira linha,
// inclusive a primeira, no nascimento da ficha.
function registrarEstagio(contato: Contato, coluna: Coluna, quando: string): void {
  anexarEstagios(pastaHistoricoMutavel(), [{
    id: gerarId("e"),
    contatoId: contato.id,
    colunaId: coluna.id,
    colunaNome: coluna.nome,
    entrouEm: quando,
  }]);
}

export function criarContato(corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const agora = new Date().toISOString();
  const contato: Contato = {
    id: gerarId("c"),
    nome: textoObrigatorio(corpo.nome, "Nome"),
    colunaId: colunaValidaOuPrimeira(estado, corpo.colunaId),
    tags: normalizaTags(corpo.tags),
    workspaceOrigemId: idWorkspaceAtivo() ?? "",
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const organizacaoId = resolverOrganizacao(estado, corpo);
  if (organizacaoId) contato.organizacaoId = organizacaoId;
  definirTelefone(contato, textoOpcional(corpo.telefone, 40));
  const email = textoOpcional(corpo.email);
  if (email) contato.email = email;
  const origem = textoOpcional(corpo.origem);
  if (origem) contato.origem = origem;
  const chaveExterna = textoOpcional(corpo.chaveExterna, 300);
  if (chaveExterna) contato.chaveExterna = chaveExterna;
  if ("proximoContato" in corpo) {
    const data = normalizaDataOpcional(corpo.proximoContato, "Proximo contato");
    if (data) contato.proximoContato = data;
  }
  const cadencia = normalizaInteiro(corpo.cadenciaDias, "Cadencia", 1, 3650);
  if (cadencia !== undefined) contato.cadenciaDias = cadencia;
  if (corpo.arquivado === true) contato.arquivado = true;
  const lead = saneiaDadosLead(corpo.lead);
  if (lead) contato.lead = lead;
  estado.contatos.push(contato);
  salvar(estado);
  registrarEstagio(contato, acharColuna(estado, contato.colunaId), agora);
  emitirCrm("crm:contato-criado", { contato });
  return contato;
}

export function atualizarContato(id: string, corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  if ("nome" in corpo) contato.nome = textoObrigatorio(corpo.nome, "Nome");
  if ("organizacaoId" in corpo || "empresa" in corpo) {
    const organizacaoId = resolverOrganizacao(estado, corpo);
    if (organizacaoId) contato.organizacaoId = organizacaoId;
    else delete contato.organizacaoId;
  }
  if ("telefone" in corpo) definirTelefone(contato, textoOpcional(corpo.telefone, 40));
  for (const campo of ["email", "origem"] as const) {
    if (!(campo in corpo)) continue;
    const valor = textoOpcional(corpo[campo]);
    if (valor) contato[campo] = valor;
    else delete contato[campo];
  }
  if ("chaveExterna" in corpo) {
    const chave = textoOpcional(corpo.chaveExterna, 300);
    if (chave) contato.chaveExterna = chave;
    else delete contato.chaveExterna;
  }
  if ("tags" in corpo) contato.tags = normalizaTags(corpo.tags);
  if ("proximoContato" in corpo) {
    const data = normalizaDataOpcional(corpo.proximoContato, "Proximo contato");
    if (data) contato.proximoContato = data;
    else delete contato.proximoContato;
  }
  if ("cadenciaDias" in corpo) {
    const cadencia = normalizaInteiro(corpo.cadenciaDias, "Cadencia", 1, 3650);
    if (cadencia !== undefined) contato.cadenciaDias = cadencia;
    else delete contato.cadenciaDias;
  }
  if ("arquivado" in corpo) {
    if (normalizaBooleano(corpo.arquivado, "Arquivado")) contato.arquivado = true;
    else delete contato.arquivado;
  }
  contato.atualizadoEm = new Date().toISOString();
  salvar(estado);
  emitirCrm("crm:contato-atualizado", { contato });
  return contato;
}

// A ordem do array de contatos e a ordem visual do quadro, entao soltar um
// cartao numa posicao precisa reposicionar o item de verdade. Insere no bloco
// da coluna de destino, mantendo os blocos contiguos. Generica sobre qualquer
// item com id e colunaId.
export function posicionarNoFunil<T extends { id: string; colunaId: string }>(
  itens: T[],
  item: T,
  indice: number,
): T[] {
  const outros = itens.filter((i) => i.id !== item.id);
  const daColuna = outros
    .map((i, global) => ({ i, global }))
    .filter(({ i }) => i.colunaId === item.colunaId);
  const alvo = Math.max(0, Math.min(Math.trunc(indice), daColuna.length));
  const onde = alvo >= daColuna.length
    ? (daColuna.length ? daColuna[daColuna.length - 1].global + 1 : outros.length)
    : daColuna[alvo].global;
  outros.splice(onde, 0, item);
  return outros;
}

// Move um CONTATO de estagio (e, quando pedido, reposiciona na coluna).
export function moverContato(id: string, corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  const colunaId = textoObrigatorio(corpo.colunaId, "Coluna");
  const colunaPara = acharColuna(estado, colunaId);
  const colunaDe = contato.colunaId;
  const nomeColunaDe = estado.colunas.find((coluna) => coluna.id === colunaDe)?.nome ?? "";
  const agora = new Date().toISOString();
  contato.colunaId = colunaId;
  contato.atualizadoEm = agora;
  if (typeof corpo.indice === "number" && Number.isFinite(corpo.indice)) {
    estado.contatos = posicionarNoFunil(estado.contatos, contato, corpo.indice);
  }
  salvar(estado);
  // So registra e avisa quando a coluna mudou de verdade. Reordenar dentro da
  // mesma coluna nao e transicao de estagio e nao pode disparar automacao.
  if (colunaDe !== colunaId) {
    registrarEstagio(contato, colunaPara, agora);
    emitirCrm("crm:contato-movido", {
      contato,
      colunaDe,
      colunaPara: colunaId,
      nomeColunaDe,
      nomeColunaPara: colunaPara.nome,
    });
  }
  return contato;
}

// Exclui o contato e o que so existia por causa dele: negocios, orcamentos
// desses negocios e tarefas ligadas a ele. As linhas ja gravadas no
// interacoes.jsonl e no estagios.jsonl ficam: append-only nao reescreve o
// passado, e historico de quem passou pelo funil tem valor proprio.
export function removerContato(id: string): void {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  const negociosDele = new Set(
    estado.negocios.filter((item) => item.contatoId === id).map((item) => item.id),
  );
  estado.contatos = estado.contatos.filter((item) => item.id !== id);
  estado.negocios = estado.negocios.filter((item) => item.contatoId !== id);
  estado.orcamentos = estado.orcamentos.filter(
    (item) => !negociosDele.has(item.negocioId),
  );
  estado.tarefas = estado.tarefas.filter((item) => item.contatoId !== id);
  for (const negocio of estado.negocios) {
    if (!negocio.participantes) continue;
    const restantes = negocio.participantes.filter((p) => p.contatoId !== id);
    if (restantes.length > 0) negocio.participantes = restantes;
    else delete negocio.participantes;
  }
  salvar(estado);
  emitirCrm("crm:contato-excluido", { contato });
}

// ----------------------------------------------------------- interacoes

function tipoInteracao(valor: unknown): TipoInteracao {
  if (typeof valor !== "string" || !TIPOS_INTERACAO.has(valor as TipoInteracao)) {
    throw new ErroCrm("Tipo de interacao invalido.", 400);
  }
  return valor as TipoInteracao;
}

// Registra uma interacao na linha do tempo do contato. A linha vai pro
// interacoes.jsonl; no crm.json so o carimbo do contato muda.
export function registrarInteracao(
  id: string,
  corpo: Record<string, unknown>,
): Interacao {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  const agora = new Date().toISOString();
  const interacao: Interacao = {
    id: gerarId("i"),
    contatoId: contato.id,
    // "em" e quando aconteceu no mundo real, separado de criadaEm: registro
    // retroativo ("liguei ontem") depende dessa separacao.
    em: normalizaDataOpcional(corpo.em, "Data da interacao") ?? agora,
    tipo: tipoInteracao(corpo.tipo),
    texto: textoObrigatorio(corpo.texto, "Interacao", 2000),
    criadaEm: agora,
  };
  anexarInteracoes(pastaHistoricoMutavel(), [interacao]);
  contato.atualizadoEm = agora;
  salvar(estado);
  emitirCrm("crm:interacao-registrada", { contato, interacao });
  return interacao;
}

// Alias de transicao: conserva a resposta antiga, que era o contato inteiro.
export function adicionarNota(id: string, corpo: Record<string, unknown>): Contato {
  registrarInteracao(id, { ...corpo, tipo: "nota" });
  return acharContato(lerEstado(), id);
}

// -------------------------------------------------------------- tarefas

export function criarTarefa(corpo: Record<string, unknown>): Tarefa {
  const estado = lerEstadoMutavel();
  const tarefa: Tarefa = {
    id: gerarId("t"),
    texto: textoObrigatorio(corpo.texto, "Tarefa", 500),
    feita: false,
    criadaEm: new Date().toISOString(),
  };
  const contatoId = textoOpcional(corpo.contatoId);
  if (contatoId) {
    acharContato(estado, contatoId);
    tarefa.contatoId = contatoId;
  }
  const negocioId = textoOpcional(corpo.negocioId);
  if (negocioId) {
    acharNegocio(estado, negocioId);
    tarefa.negocioId = negocioId;
  }
  if ("prazo" in corpo) {
    const prazo = normalizaDataOpcional(corpo.prazo, "Prazo");
    if (prazo) tarefa.prazo = prazo;
  }
  estado.tarefas.push(tarefa);
  salvar(estado);
  emitirCrm("crm:tarefa-criada", { tarefa });
  return tarefa;
}

export function atualizarTarefa(id: string, corpo: Record<string, unknown>): Tarefa {
  const estado = lerEstadoMutavel();
  const tarefa = acharTarefa(estado, id);
  if ("texto" in corpo) tarefa.texto = textoObrigatorio(corpo.texto, "Tarefa", 500);
  if ("prazo" in corpo) {
    const prazo = normalizaDataOpcional(corpo.prazo, "Prazo");
    if (prazo) tarefa.prazo = prazo;
    else delete tarefa.prazo;
  }
  if ("feita" in corpo) tarefa.feita = normalizaBooleano(corpo.feita, "Feita");
  if ("contatoId" in corpo) {
    const contatoId = textoOpcional(corpo.contatoId);
    if (contatoId) {
      acharContato(estado, contatoId);
      tarefa.contatoId = contatoId;
    } else delete tarefa.contatoId;
  }
  if ("negocioId" in corpo) {
    const negocioId = textoOpcional(corpo.negocioId);
    if (negocioId) {
      acharNegocio(estado, negocioId);
      tarefa.negocioId = negocioId;
    } else delete tarefa.negocioId;
  }
  salvar(estado);
  emitirCrm("crm:tarefa-atualizada", { tarefa });
  return tarefa;
}

export function removerTarefa(id: string): void {
  const estado = lerEstadoMutavel();
  const tarefa = acharTarefa(estado, id);
  estado.tarefas = estado.tarefas.filter((item) => item.id !== id);
  salvar(estado);
  emitirCrm("crm:tarefa-excluida", { tarefa });
}

// ------------------------------------------------------------- negocios

function statusNegocio(valor: unknown): StatusNegocio {
  if (typeof valor !== "string" || !STATUS_NEGOCIO.has(valor as StatusNegocio)) {
    throw new ErroCrm("Status de negocio invalido.", 400);
  }
  return valor as StatusNegocio;
}

// Aplica os campos opcionais que negocio e orcamento tem em comum na forma:
// presente e vazio apaga, presente e valido grava, ausente nao mexe.
function aplicarCamposNegocio(
  estado: EstadoCrm,
  negocio: Negocio,
  corpo: Record<string, unknown>,
): void {
  const numeros = [
    ["valorEstimado", "Valor estimado"],
    ["valorFechado", "Valor fechado"],
    ["valorMensal", "Valor mensal"],
  ] as const;
  for (const [campo, rotulo] of numeros) {
    if (!(campo in corpo)) continue;
    const valor = normalizaValor(corpo[campo], rotulo);
    if (valor !== undefined) negocio[campo] = valor;
    else delete negocio[campo];
  }
  const datas = [
    ["fechadoEm", "Data de fechamento"],
    ["proximaAcaoEm", "Proxima acao"],
  ] as const;
  for (const [campo, rotulo] of datas) {
    if (!(campo in corpo)) continue;
    const data = normalizaDataOpcional(corpo[campo], rotulo);
    if (data) negocio[campo] = data;
    else delete negocio[campo];
  }
  const textos = [
    ["proximaAcaoTexto", 300],
    ["escopo", 4000],
  ] as const;
  for (const [campo, limite] of textos) {
    if (!(campo in corpo)) continue;
    const texto = textoOpcional(corpo[campo], limite);
    if (texto) negocio[campo] = texto;
    else delete negocio[campo];
  }
  if ("recorrente" in corpo) {
    if (normalizaBooleano(corpo.recorrente, "Recorrente")) negocio.recorrente = true;
    else delete negocio.recorrente;
  }
  if ("diaDoCiclo" in corpo) {
    const dia = normalizaInteiro(corpo.diaDoCiclo, "Dia do ciclo", 1, 31);
    if (dia !== undefined) negocio.diaDoCiclo = dia;
    else delete negocio.diaDoCiclo;
  }
  if ("participantes" in corpo) {
    const participantes = normalizaParticipantes(estado, corpo.participantes);
    if (participantes && participantes.length > 0) negocio.participantes = participantes;
    else delete negocio.participantes;
  }
}

export function criarNegocio(corpo: Record<string, unknown>): Negocio {
  const estado = lerEstadoMutavel();
  const contatoId = textoObrigatorio(corpo.contatoId, "Contato");
  const contato = acharContato(estado, contatoId);
  const agora = new Date().toISOString();
  const negocio: Negocio = {
    id: gerarId("n"),
    titulo: textoObrigatorio(corpo.titulo, "Titulo do negocio"),
    contatoId,
    status: "status" in corpo ? statusNegocio(corpo.status) : "aberto",
    criadoEm: agora,
    atualizadoEm: agora,
  };
  aplicarCamposNegocio(estado, negocio, corpo);
  estado.negocios.push(negocio);
  salvar(estado);
  emitirCrm("crm:negocio-criado", { contato, negocio });
  return negocio;
}

export function atualizarNegocio(id: string, corpo: Record<string, unknown>): Negocio {
  const estado = lerEstadoMutavel();
  const negocio = acharNegocio(estado, id);
  if ("titulo" in corpo) negocio.titulo = textoObrigatorio(corpo.titulo, "Titulo do negocio");
  if ("contatoId" in corpo) {
    const contatoId = textoObrigatorio(corpo.contatoId, "Contato");
    acharContato(estado, contatoId);
    negocio.contatoId = contatoId;
  }
  if ("status" in corpo) negocio.status = statusNegocio(corpo.status);
  aplicarCamposNegocio(estado, negocio, corpo);
  negocio.atualizadoEm = new Date().toISOString();
  salvar(estado);
  const contato = acharContato(estado, negocio.contatoId);
  emitirCrm("crm:negocio-atualizado", { contato, negocio });
  return negocio;
}

// Exclui o negocio e os orcamentos dele. Tarefa ligada ao negocio sobrevive e
// so perde o vinculo: o texto dela e trabalho do usuario.
export function removerNegocio(id: string): void {
  const estado = lerEstadoMutavel();
  const negocio = acharNegocio(estado, id);
  const contato = estado.contatos.find((item) => item.id === negocio.contatoId);
  estado.negocios = estado.negocios.filter((item) => item.id !== id);
  estado.orcamentos = estado.orcamentos.filter((item) => item.negocioId !== id);
  for (const tarefa of estado.tarefas) {
    if (tarefa.negocioId === id) delete tarefa.negocioId;
  }
  salvar(estado);
  emitirCrm("crm:negocio-excluido", contato ? { contato, negocio } : { negocio });
}

// ----------------------------------------------------------- orcamentos

function statusOrcamento(valor: unknown): StatusOrcamento {
  if (typeof valor !== "string" || !STATUS_ORCAMENTO.has(valor as StatusOrcamento)) {
    throw new ErroCrm("Status de orcamento invalido.", 400);
  }
  return valor as StatusOrcamento;
}

function aplicarCamposOrcamento(
  orcamento: Orcamento,
  corpo: Record<string, unknown>,
): void {
  const datas = [
    ["enviadoEm", "Data de envio"],
    ["validoAte", "Validade"],
  ] as const;
  for (const [campo, rotulo] of datas) {
    if (!(campo in corpo)) continue;
    const data = normalizaDataOpcional(corpo[campo], rotulo);
    if (data) orcamento[campo] = data;
    else delete orcamento[campo];
  }
  for (const campo of ["arquivo", "link"] as const) {
    if (!(campo in corpo)) continue;
    const texto = textoOpcional(corpo[campo], 500);
    if (texto) orcamento[campo] = texto;
    else delete orcamento[campo];
  }
}

export function criarOrcamento(corpo: Record<string, unknown>): Orcamento {
  const estado = lerEstadoMutavel();
  const negocioId = textoObrigatorio(corpo.negocioId, "Negocio");
  const negocio = acharNegocio(estado, negocioId);
  const valor = normalizaValor(corpo.valor, "Valor do orcamento");
  if (valor === undefined) throw new ErroCrm("Valor do orcamento e obrigatorio.", 400);
  const agora = new Date().toISOString();
  const orcamento: Orcamento = {
    id: gerarId("q"),
    negocioId,
    valor,
    status: "status" in corpo ? statusOrcamento(corpo.status) : "rascunho",
    criadoEm: agora,
    atualizadoEm: agora,
  };
  aplicarCamposOrcamento(orcamento, corpo);
  estado.orcamentos.push(orcamento);
  salvar(estado);
  emitirCrm("crm:orcamento-criado", { negocio, orcamento });
  return orcamento;
}

export function atualizarOrcamento(
  id: string,
  corpo: Record<string, unknown>,
): Orcamento {
  const estado = lerEstadoMutavel();
  const orcamento = acharOrcamento(estado, id);
  if ("negocioId" in corpo) {
    const negocioId = textoObrigatorio(corpo.negocioId, "Negocio");
    acharNegocio(estado, negocioId);
    orcamento.negocioId = negocioId;
  }
  if ("valor" in corpo) {
    const valor = normalizaValor(corpo.valor, "Valor do orcamento");
    if (valor === undefined) throw new ErroCrm("Valor do orcamento e obrigatorio.", 400);
    orcamento.valor = valor;
  }
  if ("status" in corpo) orcamento.status = statusOrcamento(corpo.status);
  aplicarCamposOrcamento(orcamento, corpo);
  orcamento.atualizadoEm = new Date().toISOString();
  salvar(estado);
  const negocio = acharNegocio(estado, orcamento.negocioId);
  emitirCrm("crm:orcamento-atualizado", { negocio, orcamento });
  return orcamento;
}

export function removerOrcamento(id: string): void {
  const estado = lerEstadoMutavel();
  const orcamento = acharOrcamento(estado, id);
  estado.orcamentos = estado.orcamentos.filter((item) => item.id !== id);
  salvar(estado);
  emitirCrm("crm:orcamento-excluido", { orcamento });
}

// --------------------------------------------------------------- colunas

function tipoColuna(valor: unknown): TipoColuna {
  if (typeof valor !== "string" || !TIPOS_COLUNA.has(valor as TipoColuna)) {
    throw new ErroCrm("Tipo de coluna invalido.", 400);
  }
  return valor as TipoColuna;
}

export function criarColuna(corpo: Record<string, unknown>): Coluna {
  const estado = lerEstadoMutavel();
  const ordem =
    estado.colunas.reduce((maior, coluna) => Math.max(maior, coluna.ordem), -1) + 1;
  const coluna: Coluna = {
    id: gerarId("k"),
    nome: textoObrigatorio(corpo.nome, "Nome da coluna", 60),
    ordem,
    tipo: "tipo" in corpo ? tipoColuna(corpo.tipo) : "aberto",
  };
  const dias = normalizaInteiro(corpo.diasParaEsfriar, "Dias para esfriar", 1, 3650);
  if (dias !== undefined) coluna.diasParaEsfriar = dias;
  estado.colunas.push(coluna);
  salvar(estado);
  return coluna;
}

// Atualiza nome, tipo e o limite de esfriamento de uma coluna.
export function atualizarColuna(id: string, corpo: Record<string, unknown>): Coluna {
  const estado = lerEstadoMutavel();
  const coluna = acharColuna(estado, id);
  if ("nome" in corpo) coluna.nome = textoObrigatorio(corpo.nome, "Nome da coluna", 60);
  if ("tipo" in corpo) coluna.tipo = tipoColuna(corpo.tipo);
  if ("diasParaEsfriar" in corpo) {
    const dias = normalizaInteiro(corpo.diasParaEsfriar, "Dias para esfriar", 1, 3650);
    if (dias !== undefined) coluna.diasParaEsfriar = dias;
    else delete coluna.diasParaEsfriar;
  }
  salvar(estado);
  return coluna;
}

export function removerColuna(id: string): void {
  const estado = lerEstadoMutavel();
  acharColuna(estado, id);
  if (estado.colunas.length <= 1) {
    throw new ErroCrm("O funil precisa de pelo menos uma coluna.", 400);
  }
  const restantes = ordenarColunas(estado.colunas.filter((coluna) => coluna.id !== id));
  const destino = restantes[0];
  const agora = new Date().toISOString();
  const movidos: Contato[] = [];
  // Os contatos daquela coluna caem na primeira que sobrar, pra nenhum sumir do
  // quadro.
  for (const contato of estado.contatos) {
    if (contato.colunaId !== id) continue;
    contato.colunaId = destino.id;
    contato.atualizadoEm = agora;
    movidos.push(contato);
  }
  estado.colunas = restantes;
  salvar(estado);
  if (movidos.length > 0) {
    anexarEstagios(
      pastaHistoricoMutavel(),
      movidos.map((contato) => ({
        id: gerarId("e"),
        contatoId: contato.id,
        colunaId: destino.id,
        colunaNome: destino.nome,
        entrouEm: agora,
      })),
    );
  }
}

export function reordenarColunas(corpo: Record<string, unknown>): Coluna[] {
  const estado = lerEstadoMutavel();
  if (!Array.isArray(corpo.ordem) || corpo.ordem.some((item) => typeof item !== "string")) {
    throw new ErroCrm("Envie a ordem como uma lista de ids.", 400);
  }
  const ordem = corpo.ordem as string[];
  const posicoes = new Map<string, number>();
  ordem.forEach((id, indice) => posicoes.set(id, indice));
  let proxima = ordem.length;
  for (const coluna of estado.colunas) {
    coluna.ordem = posicoes.get(coluna.id) ?? proxima++;
  }
  estado.colunas = ordenarColunas(estado.colunas);
  salvar(estado);
  return estado.colunas;
}
