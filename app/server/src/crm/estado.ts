// Estado do CRM v2, escopado por workspace. Contatos guardam o relacionamento;
// negocios guardam o valor e o estagio no funil. O caminho e resolvido por
// chamada porque o workspace ativo pode mudar em runtime.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { emitir } from "../eventos/barramento.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  garantirPastaDadosWorkspace,
  idWorkspaceAtivo,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

export class ErroCrm extends Error {
  status: number;

  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroCrm";
    this.status = status;
  }
}

export type TipoInteracao = "nota" | "ligacao" | "mensagem" | "reuniao" | "outro";

export interface Interacao {
  id: string;
  em: string;
  tipo: TipoInteracao;
  texto: string;
}

export interface Tarefa {
  id: string;
  texto: string;
  prazo?: string;
  feita: boolean;
  criadaEm: string;
}

export interface Contato {
  id: string;
  nome: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  tags: string[];
  interacoes: Interacao[];
  tarefas: Tarefa[];
  proximoContato?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Negocio {
  id: string;
  titulo: string;
  contatoId: string;
  colunaId: string;
  valorEstimado?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Coluna {
  id: string;
  nome: string;
  ordem: number;
}

export interface EstadoCrm {
  versao: 2;
  colunas: Coluna[];
  contatos: Contato[];
  negocios: Negocio[];
}

export interface ResultadoNormalizacaoCrm {
  estado: EstadoCrm;
  precisaSalvar: boolean;
}

const COLUNAS_PADRAO = [
  "Novo contato",
  "Conversando",
  "Proposta enviada",
  "Fechado",
  "Perdido",
];

const TIPOS_INTERACAO = new Set<TipoInteracao>([
  "nota",
  "ligacao",
  "mensagem",
  "reuniao",
  "outro",
]);

function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function colunasPadrao(): Coluna[] {
  return COLUNAS_PADRAO.map((nome, ordem) => ({ id: gerarId("k"), nome, ordem }));
}

function caminhoAtivo(): string | null {
  const id = idWorkspaceAtivo();
  return id ? join(pastaDadosWorkspace(id), "crm.json") : null;
}

function dataValida(v: unknown, fallback: string): string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : fallback;
}

function textoPreservado(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function numeroPreservado(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

function ordenarColunas(colunas: Coluna[]): Coluna[] {
  return [...colunas].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
}

function saneiaColuna(v: unknown, indice: number): Coluna | null {
  if (!v || typeof v !== "object") return null;
  const coluna = v as Record<string, unknown>;
  if (typeof coluna.id !== "string" || typeof coluna.nome !== "string") return null;
  return {
    id: coluna.id,
    nome: coluna.nome,
    ordem: typeof coluna.ordem === "number" && Number.isFinite(coluna.ordem)
      ? coluna.ordem
      : indice,
  };
}

function saneiaInteracao(v: unknown, contatoId: string, indice: number): Interacao | null {
  if (!v || typeof v !== "object") return null;
  const interacao = v as Record<string, unknown>;
  if (typeof interacao.texto !== "string") return null;
  const tipo = TIPOS_INTERACAO.has(interacao.tipo as TipoInteracao)
    ? interacao.tipo as TipoInteracao
    : "outro";
  return {
    id: typeof interacao.id === "string" ? interacao.id : `i-${contatoId}-${indice}`,
    em: dataValida(interacao.em, new Date().toISOString()),
    tipo,
    texto: interacao.texto,
  };
}

function saneiaTarefa(v: unknown, contatoId: string, indice: number): Tarefa | null {
  if (!v || typeof v !== "object") return null;
  const tarefa = v as Record<string, unknown>;
  if (typeof tarefa.texto !== "string") return null;
  const criadaEm = dataValida(tarefa.criadaEm, new Date().toISOString());
  const saida: Tarefa = {
    id: typeof tarefa.id === "string" ? tarefa.id : `t-${contatoId}-${indice}`,
    texto: tarefa.texto,
    feita: tarefa.feita === true,
    criadaEm,
  };
  if (typeof tarefa.prazo === "string" && !Number.isNaN(Date.parse(tarefa.prazo))) {
    saida.prazo = tarefa.prazo;
  }
  return saida;
}

function copiarCamposContato(
  destino: Contato,
  origem: Record<string, unknown>,
): void {
  const campos = ["empresa", "telefone", "email", "origem"] as const;
  for (const campo of campos) {
    const valor = textoPreservado(origem[campo]);
    if (valor !== undefined) destino[campo] = valor;
  }
  if (
    typeof origem.proximoContato === "string" &&
    !Number.isNaN(Date.parse(origem.proximoContato))
  ) {
    destino.proximoContato = origem.proximoContato;
  }
}

function saneiaContatoV2(v: unknown): Contato | null {
  if (!v || typeof v !== "object") return null;
  const contato = v as Record<string, unknown>;
  if (typeof contato.id !== "string" || typeof contato.nome !== "string") return null;
  const agora = new Date().toISOString();
  const saida: Contato = {
    id: contato.id,
    nome: contato.nome,
    tags: Array.isArray(contato.tags)
      ? contato.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    interacoes: Array.isArray(contato.interacoes)
      ? contato.interacoes
          .map((item, indice) => saneiaInteracao(item, contato.id as string, indice))
          .filter((item): item is Interacao => item !== null)
      : [],
    tarefas: Array.isArray(contato.tarefas)
      ? contato.tarefas
          .map((item, indice) => saneiaTarefa(item, contato.id as string, indice))
          .filter((item): item is Tarefa => item !== null)
      : [],
    criadoEm: dataValida(contato.criadoEm, agora),
    atualizadoEm: dataValida(contato.atualizadoEm, agora),
  };
  copiarCamposContato(saida, contato);
  return saida;
}

function saneiaNegocio(v: unknown): Negocio | null {
  if (!v || typeof v !== "object") return null;
  const negocio = v as Record<string, unknown>;
  if (
    typeof negocio.id !== "string" ||
    typeof negocio.titulo !== "string" ||
    typeof negocio.contatoId !== "string" ||
    typeof negocio.colunaId !== "string"
  ) {
    return null;
  }
  const agora = new Date().toISOString();
  const saida: Negocio = {
    id: negocio.id,
    titulo: negocio.titulo,
    contatoId: negocio.contatoId,
    colunaId: negocio.colunaId,
    criadoEm: dataValida(negocio.criadoEm, agora),
    atualizadoEm: dataValida(negocio.atualizadoEm, agora),
  };
  const valor = numeroPreservado(negocio.valorEstimado);
  if (valor !== undefined) saida.valorEstimado = valor;
  return saida;
}

function migrarContatoV1(v: unknown, indice: number): { contato: Contato; negocio: Negocio } | null {
  if (!v || typeof v !== "object") return null;
  const antigo = v as Record<string, unknown>;
  if (
    typeof antigo.id !== "string" ||
    typeof antigo.nome !== "string" ||
    typeof antigo.colunaId !== "string"
  ) {
    return null;
  }
  const agora = new Date().toISOString();
  const criadoEm = dataValida(antigo.criadoEm, agora);
  const atualizadoEm = dataValida(antigo.atualizadoEm, criadoEm);
  const contato: Contato = {
    id: antigo.id,
    nome: antigo.nome,
    tags: Array.isArray(antigo.tags)
      ? antigo.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    interacoes: Array.isArray(antigo.notas)
      ? antigo.notas.flatMap((nota, notaIndice) => {
          if (!nota || typeof nota !== "object") return [];
          const n = nota as Record<string, unknown>;
          if (typeof n.texto !== "string") return [];
          return [{
            id: `i-${antigo.id}-nota-${notaIndice}`,
            em: dataValida(n.em, atualizadoEm),
            tipo: "nota" as const,
            texto: n.texto,
          }];
        })
      : [],
    tarefas: [],
    criadoEm,
    atualizadoEm,
  };
  copiarCamposContato(contato, antigo);

  const negocio: Negocio = {
    id: `n-${antigo.id || indice}`,
    titulo: antigo.nome,
    contatoId: antigo.id,
    colunaId: antigo.colunaId,
    criadoEm,
    atualizadoEm,
  };
  const valor = numeroPreservado(antigo.valorEstimado);
  if (valor !== undefined) negocio.valorEstimado = valor;
  return { contato, negocio };
}

// Funcao pura exportada para testar a migracao sem tocar nos dados reais.
export function normalizarEstadoCrm(bruto: unknown): ResultadoNormalizacaoCrm | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dados = bruto as Record<string, unknown>;
  let colunas = Array.isArray(dados.colunas)
    ? dados.colunas
        .map(saneiaColuna)
        .filter((coluna): coluna is Coluna => coluna !== null)
    : [];
  let precisaSalvar = false;
  if (colunas.length === 0) {
    colunas = colunasPadrao();
    precisaSalvar = true;
  }

  if (dados.versao === 2) {
    const contatos = Array.isArray(dados.contatos)
      ? dados.contatos.map(saneiaContatoV2).filter((c): c is Contato => c !== null)
      : [];
    const negociosSaneados = Array.isArray(dados.negocios)
      ? dados.negocios.map(saneiaNegocio).filter((n): n is Negocio => n !== null)
      : [];
    const contatosValidos = new Set(contatos.map((contato) => contato.id));
    const colunasValidas = new Set(colunas.map((coluna) => coluna.id));
    const negocios = negociosSaneados
      .filter((negocio) => contatosValidos.has(negocio.contatoId))
      .map((negocio) => {
        if (colunasValidas.has(negocio.colunaId)) return negocio;
        precisaSalvar = true;
        return { ...negocio, colunaId: colunas[0].id };
      });
    if (negocios.length !== negociosSaneados.length) precisaSalvar = true;
    return {
      estado: { versao: 2, colunas: ordenarColunas(colunas), contatos, negocios },
      precisaSalvar,
    };
  }

  const migrados = Array.isArray(dados.contatos)
    ? dados.contatos
        .map(migrarContatoV1)
        .filter((item): item is { contato: Contato; negocio: Negocio } => item !== null)
    : [];
  return {
    estado: {
      versao: 2,
      colunas: ordenarColunas(colunas),
      contatos: migrados.map((item) => item.contato),
      negocios: migrados.map((item) => item.negocio),
    },
    precisaSalvar: true,
  };
}

function lerArquivo(caminho: string): ResultadoNormalizacaoCrm | null {
  if (!existsSync(caminho)) return null;
  try {
    return normalizarEstadoCrm(JSON.parse(readFileSync(caminho, "utf8")));
  } catch {
    return null;
  }
}

// Le e, quando necessario, persiste a migracao no mesmo arquivo. Exportada para
// provar o comportamento com fixture temporaria sem apontar testes ao CRM real.
export function lerEstadoCrmDeArquivo(caminho: string): EstadoCrm | null {
  const resultado = lerArquivo(caminho);
  if (!resultado) return null;
  if (resultado.precisaSalvar) gravarJsonAtomico(caminho, resultado.estado);
  return resultado.estado;
}

function salvar(estado: EstadoCrm): void {
  const id = idWorkspaceAtivo();
  if (!id) {
    throw new ErroCrm("Nenhum cliente ativo. Abra um workspace pra usar o CRM.", 409);
  }
  garantirPastaDadosWorkspace(id);
  gravarJsonAtomico(join(pastaDadosWorkspace(id), "crm.json"), estado);
}

function emitirCrm(tipo: string, dados: Record<string, unknown>): void {
  const id = idWorkspaceAtivo();
  if (!id) return;
  emitir({ tipo, workspaceId: id, em: new Date().toISOString(), dados });
}

export function lerEstado(): EstadoCrm {
  const caminho = caminhoAtivo();
  if (!caminho) {
    return { versao: 2, colunas: colunasPadrao(), contatos: [], negocios: [] };
  }
  const existente = lerEstadoCrmDeArquivo(caminho);
  if (existente) return existente;
  const inicial: EstadoCrm = {
    versao: 2,
    colunas: colunasPadrao(),
    contatos: [],
    negocios: [],
  };
  salvar(inicial);
  return inicial;
}

function lerEstadoMutavel(): EstadoCrm {
  if (!idWorkspaceAtivo()) {
    throw new ErroCrm("Nenhum cliente ativo. Abra um workspace pra usar o CRM.", 409);
  }
  return lerEstado();
}

function primeiraColuna(estado: EstadoCrm): Coluna {
  return ordenarColunas(estado.colunas)[0];
}

function textoObrigatorio(v: unknown, rotulo: string, limite = 200): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new ErroCrm(`${rotulo} e obrigatorio.`, 400);
  }
  return v.trim().slice(0, limite);
}

function textoOpcional(v: unknown, limite = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.trim().slice(0, limite) || undefined;
}

function normalizaValor(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const numero = typeof v === "string" ? Number(v) : v;
  if (typeof numero !== "number" || !Number.isFinite(numero) || numero < 0) {
    throw new ErroCrm("Valor estimado precisa ser um numero positivo.", 400);
  }
  return numero;
}

function normalizaDataOpcional(v: unknown, rotulo: string): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || Number.isNaN(Date.parse(v))) {
    throw new ErroCrm(`${rotulo} precisa ser uma data valida.`, 400);
  }
  return new Date(Date.parse(v)).toISOString();
}

function normalizaTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const valor of v) {
    if (typeof valor !== "string") continue;
    const tag = valor.trim().slice(0, 40);
    const chave = tag.toLowerCase();
    if (!tag || vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push(tag);
  }
  return saida;
}

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

function definirOpcional(
  contato: Contato,
  campo: "empresa" | "telefone" | "email" | "origem",
  valor: string | undefined,
): void {
  if (valor === undefined) delete contato[campo];
  else contato[campo] = valor;
}

export function criarContato(corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const agora = new Date().toISOString();
  const contato: Contato = {
    id: gerarId("c"),
    nome: textoObrigatorio(corpo.nome, "Nome"),
    tags: normalizaTags(corpo.tags),
    interacoes: [],
    tarefas: [],
    criadoEm: agora,
    atualizadoEm: agora,
  };
  for (const campo of ["empresa", "telefone", "email", "origem"] as const) {
    definirOpcional(contato, campo, textoOpcional(corpo[campo]));
  }
  if ("proximoContato" in corpo) {
    const data = normalizaDataOpcional(corpo.proximoContato, "Proximo contato");
    if (data) contato.proximoContato = data;
  }
  estado.contatos.push(contato);
  salvar(estado);
  emitirCrm("crm:contato-criado", { contato });
  return contato;
}

export function atualizarContato(id: string, corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  if ("nome" in corpo) contato.nome = textoObrigatorio(corpo.nome, "Nome");
  for (const campo of ["empresa", "telefone", "email", "origem"] as const) {
    if (campo in corpo) definirOpcional(contato, campo, textoOpcional(corpo[campo]));
  }
  if ("tags" in corpo) contato.tags = normalizaTags(corpo.tags);
  if ("proximoContato" in corpo) {
    const data = normalizaDataOpcional(corpo.proximoContato, "Proximo contato");
    if (data === null) delete contato.proximoContato;
    else contato.proximoContato = data;
  }
  contato.atualizadoEm = new Date().toISOString();
  salvar(estado);
  emitirCrm("crm:contato-atualizado", { contato });
  return contato;
}

export function removerContato(id: string): void {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  estado.contatos = estado.contatos.filter((item) => item.id !== id);
  estado.negocios = estado.negocios.filter((item) => item.contatoId !== id);
  salvar(estado);
  emitirCrm("crm:contato-excluido", { contato });
}

function tipoInteracao(v: unknown): TipoInteracao {
  if (typeof v !== "string" || !TIPOS_INTERACAO.has(v as TipoInteracao)) {
    throw new ErroCrm("Tipo de interacao invalido.", 400);
  }
  return v as TipoInteracao;
}

export function registrarInteracao(
  id: string,
  corpo: Record<string, unknown>,
): Interacao {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  const interacao: Interacao = {
    id: gerarId("i"),
    em: new Date().toISOString(),
    tipo: tipoInteracao(corpo.tipo),
    texto: textoObrigatorio(corpo.texto, "Interacao", 2000),
  };
  contato.interacoes.unshift(interacao);
  contato.atualizadoEm = interacao.em;
  salvar(estado);
  emitirCrm("crm:interacao-registrada", { contato, interacao });
  return interacao;
}

// Alias de transicao: conserva a resposta antiga, que era o contato inteiro.
export function adicionarNota(id: string, corpo: Record<string, unknown>): Contato {
  registrarInteracao(id, { ...corpo, tipo: "nota" });
  return acharContato(lerEstado(), id);
}

export function criarTarefa(id: string, corpo: Record<string, unknown>): Tarefa {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  const tarefa: Tarefa = {
    id: gerarId("t"),
    texto: textoObrigatorio(corpo.texto, "Tarefa", 500),
    feita: false,
    criadaEm: new Date().toISOString(),
  };
  if ("prazo" in corpo) {
    const prazo = normalizaDataOpcional(corpo.prazo, "Prazo");
    if (prazo) tarefa.prazo = prazo;
  }
  contato.tarefas.push(tarefa);
  contato.atualizadoEm = tarefa.criadaEm;
  salvar(estado);
  return tarefa;
}

function acharTarefa(estado: EstadoCrm, id: string): { contato: Contato; tarefa: Tarefa } {
  for (const contato of estado.contatos) {
    const tarefa = contato.tarefas.find((item) => item.id === id);
    if (tarefa) return { contato, tarefa };
  }
  throw new ErroCrm("Tarefa nao encontrada.", 404);
}

export function atualizarTarefa(id: string, corpo: Record<string, unknown>): Tarefa {
  const estado = lerEstadoMutavel();
  const { contato, tarefa } = acharTarefa(estado, id);
  if ("texto" in corpo) tarefa.texto = textoObrigatorio(corpo.texto, "Tarefa", 500);
  if ("prazo" in corpo) {
    const prazo = normalizaDataOpcional(corpo.prazo, "Prazo");
    if (prazo === null) delete tarefa.prazo;
    else tarefa.prazo = prazo;
  }
  if ("feita" in corpo) {
    if (typeof corpo.feita !== "boolean") {
      throw new ErroCrm("Feita precisa ser verdadeiro ou falso.", 400);
    }
    tarefa.feita = corpo.feita;
  }
  contato.atualizadoEm = new Date().toISOString();
  salvar(estado);
  return tarefa;
}

export function removerTarefa(id: string): void {
  const estado = lerEstadoMutavel();
  const { contato } = acharTarefa(estado, id);
  contato.tarefas = contato.tarefas.filter((item) => item.id !== id);
  contato.atualizadoEm = new Date().toISOString();
  salvar(estado);
}

export function criarNegocio(corpo: Record<string, unknown>): Negocio {
  const estado = lerEstadoMutavel();
  const contatoId = textoObrigatorio(corpo.contatoId, "Contato");
  acharContato(estado, contatoId);
  const colunaId = corpo.colunaId === undefined || corpo.colunaId === null || corpo.colunaId === ""
    ? primeiraColuna(estado).id
    : textoObrigatorio(corpo.colunaId, "Coluna");
  acharColuna(estado, colunaId);
  const agora = new Date().toISOString();
  const negocio: Negocio = {
    id: gerarId("n"),
    titulo: textoObrigatorio(corpo.titulo, "Titulo do negocio"),
    contatoId,
    colunaId,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const valor = normalizaValor(corpo.valorEstimado);
  if (valor !== undefined) negocio.valorEstimado = valor;
  estado.negocios.push(negocio);
  salvar(estado);
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
  if ("colunaId" in corpo) {
    const colunaId = textoObrigatorio(corpo.colunaId, "Coluna");
    acharColuna(estado, colunaId);
    negocio.colunaId = colunaId;
  }
  if ("valorEstimado" in corpo) {
    const valor = normalizaValor(corpo.valorEstimado);
    if (valor === undefined) delete negocio.valorEstimado;
    else negocio.valorEstimado = valor;
  }
  negocio.atualizadoEm = new Date().toISOString();
  salvar(estado);
  return negocio;
}

export function removerNegocio(id: string): void {
  const estado = lerEstadoMutavel();
  acharNegocio(estado, id);
  estado.negocios = estado.negocios.filter((item) => item.id !== id);
  salvar(estado);
}

export function moverNegocio(id: string, corpo: Record<string, unknown>): Negocio {
  const estado = lerEstadoMutavel();
  const negocio = acharNegocio(estado, id);
  const contato = acharContato(estado, negocio.contatoId);
  const colunaId = textoObrigatorio(corpo.colunaId, "Coluna");
  const colunaPara = acharColuna(estado, colunaId);
  const colunaDe = negocio.colunaId;
  const nomeColunaDe = estado.colunas.find((coluna) => coluna.id === colunaDe)?.nome ?? "";
  negocio.colunaId = colunaId;
  negocio.atualizadoEm = new Date().toISOString();
  salvar(estado);
  emitirCrm("crm:contato-movido", {
    contato,
    negocio,
    colunaDe,
    colunaPara: colunaId,
    nomeColunaDe,
    nomeColunaPara: colunaPara.nome,
  });
  return negocio;
}

export function criarColuna(corpo: Record<string, unknown>): Coluna {
  const estado = lerEstadoMutavel();
  const ordem = estado.colunas.reduce((maior, coluna) => Math.max(maior, coluna.ordem), -1) + 1;
  const coluna: Coluna = {
    id: gerarId("k"),
    nome: textoObrigatorio(corpo.nome, "Nome da coluna", 60),
    ordem,
  };
  estado.colunas.push(coluna);
  salvar(estado);
  return coluna;
}

export function renomearColuna(id: string, corpo: Record<string, unknown>): Coluna {
  const estado = lerEstadoMutavel();
  const coluna = acharColuna(estado, id);
  coluna.nome = textoObrigatorio(corpo.nome, "Nome da coluna", 60);
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
  const destino = restantes[0].id;
  for (const negocio of estado.negocios) {
    if (negocio.colunaId === id) {
      negocio.colunaId = destino;
      negocio.atualizadoEm = new Date().toISOString();
    }
  }
  estado.colunas = restantes;
  salvar(estado);
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
    coluna.ordem = posicoes.has(coluna.id) ? posicoes.get(coluna.id) as number : proxima++;
  }
  estado.colunas = ordenarColunas(estado.colunas);
  salvar(estado);
  return estado.colunas;
}
