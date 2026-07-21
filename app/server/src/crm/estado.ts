// Estado do CRM v3, escopado por workspace. Agora o CONTATO e o cartao do funil:
// cada contato tem um estagio (colunaId) e caminha pelo quadro sozinho. Negocio
// virou valor/oportunidade opcional preso a um contato, sem estagio proprio. O
// caminho e resolvido por chamada porque o workspace ativo pode mudar em runtime.

import { existsSync, readFileSync, renameSync } from "node:fs";
import { basename, join } from "node:path";

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

// Retrato do lead de origem (mineracao no Google Maps). So leitura: preserva o
// que a lista de busca mostrava, pra ficha nao nascer pobre depois de importar.
export interface DadosLead {
  placeId?: string;
  categoria?: string;
  endereco?: string;
  site?: string;
  nota?: number;
  totalAvaliacoes?: number;
  termoBusca?: string;
  localizacao?: string;
  capturadoEm?: string;
}

export interface Contato {
  id: string;
  nome: string;
  // Estagio do contato no funil. Todo contato mora numa coluna desde que nasce.
  colunaId: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  tags: string[];
  interacoes: Interacao[];
  tarefas: Tarefa[];
  proximoContato?: string;
  // Retrato do lead que originou a ficha, quando veio da mineracao.
  lead?: DadosLead;
  criadoEm: string;
  atualizadoEm: string;
}

// Valor/oportunidade preso a um contato. Nao tem estagio: quem caminha no funil
// e o contato. Um contato pode ter zero, um ou varios negocios (soma de valor).
export interface Negocio {
  id: string;
  titulo: string;
  contatoId: string;
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
  versao: 3;
  colunas: Coluna[];
  contatos: Contato[];
  negocios: Negocio[];
}

export interface ResultadoNormalizacaoCrm {
  estado: EstadoCrm;
  precisaSalvar: boolean;
}

const COLUNAS_PADRAO = [
  "Não iniciados",
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

function saneiaLead(v: unknown): DadosLead | undefined {
  if (!v || typeof v !== "object") return undefined;
  const l = v as Record<string, unknown>;
  const txt = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : undefined);
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
  const saida: DadosLead = {};
  if (txt(l.placeId)) saida.placeId = txt(l.placeId);
  if (txt(l.categoria)) saida.categoria = txt(l.categoria);
  if (txt(l.endereco)) saida.endereco = txt(l.endereco);
  if (txt(l.site)) saida.site = txt(l.site);
  if (num(l.nota) !== undefined) saida.nota = num(l.nota);
  if (num(l.totalAvaliacoes) !== undefined) saida.totalAvaliacoes = num(l.totalAvaliacoes);
  if (txt(l.termoBusca)) saida.termoBusca = txt(l.termoBusca);
  if (txt(l.localizacao)) saida.localizacao = txt(l.localizacao);
  if (txt(l.capturadoEm)) saida.capturadoEm = txt(l.capturadoEm);
  return Object.keys(saida).length > 0 ? saida : undefined;
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
  const lead = saneiaLead(origem.lead);
  if (lead) destino.lead = lead;
}

// Fallback em vez de descarte: id ausente ganha um id novo, nome ausente vira
// "Sem nome", colunaId ausente ou invalido cai na primeira coluna do funil (e
// marca pra salvar). So um valor que nao e nem objeto se perde de fato.
function saneiaContato(
  v: unknown,
  colunasValidas: Set<string>,
  primeira: string,
  marcar: () => void,
): Contato | null {
  if (!v || typeof v !== "object") return null;
  const contato = v as Record<string, unknown>;
  const id =
    typeof contato.id === "string" && contato.id ? contato.id : gerarId("c");
  const nome =
    typeof contato.nome === "string" && contato.nome.trim() ? contato.nome : "Sem nome";
  const agora = new Date().toISOString();
  let colunaId: string;
  if (typeof contato.colunaId === "string" && colunasValidas.has(contato.colunaId)) {
    colunaId = contato.colunaId;
  } else {
    colunaId = primeira;
    marcar();
  }
  const saida: Contato = {
    id,
    nome,
    colunaId,
    tags: Array.isArray(contato.tags)
      ? contato.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    interacoes: Array.isArray(contato.interacoes)
      ? contato.interacoes
          .map((item, indice) => saneiaInteracao(item, id, indice))
          .filter((item): item is Interacao => item !== null)
      : [],
    tarefas: Array.isArray(contato.tarefas)
      ? contato.tarefas
          .map((item, indice) => saneiaTarefa(item, id, indice))
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
    typeof negocio.contatoId !== "string"
  ) {
    return null;
  }
  const agora = new Date().toISOString();
  const saida: Negocio = {
    id: negocio.id,
    titulo: negocio.titulo,
    contatoId: negocio.contatoId,
    criadoEm: dataValida(negocio.criadoEm, agora),
    atualizadoEm: dataValida(negocio.atualizadoEm, agora),
  };
  const valor = numeroPreservado(negocio.valorEstimado);
  if (valor !== undefined) saida.valorEstimado = valor;
  return saida;
}

// Migra um contato do CRM v1 (quando o contato ja carregava colunaId e valor).
// O contato herda o estagio; o valor, se houver, vira um negocio sem estagio.
function migrarContatoV1(
  v: unknown,
  primeira: string,
  colunasValidas: Set<string>,
): { contato: Contato; negocio: Negocio | null } | null {
  if (!v || typeof v !== "object") return null;
  const antigo = v as Record<string, unknown>;
  const id = typeof antigo.id === "string" && antigo.id ? antigo.id : gerarId("c");
  const nome =
    typeof antigo.nome === "string" && antigo.nome.trim() ? antigo.nome : "Sem nome";
  const colunaId =
    typeof antigo.colunaId === "string" && colunasValidas.has(antigo.colunaId)
      ? antigo.colunaId
      : primeira;
  const agora = new Date().toISOString();
  const criadoEm = dataValida(antigo.criadoEm, agora);
  const atualizadoEm = dataValida(antigo.atualizadoEm, criadoEm);
  const contato: Contato = {
    id,
    nome,
    colunaId,
    tags: Array.isArray(antigo.tags)
      ? antigo.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    interacoes: Array.isArray(antigo.notas)
      ? antigo.notas.flatMap((nota, notaIndice) => {
          if (!nota || typeof nota !== "object") return [];
          const n = nota as Record<string, unknown>;
          if (typeof n.texto !== "string") return [];
          return [{
            id: `i-${id}-nota-${notaIndice}`,
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

  const valor = numeroPreservado(antigo.valorEstimado);
  const negocio: Negocio | null = valor !== undefined
    ? {
        id: `n-${id}`,
        titulo: nome,
        contatoId: id,
        valorEstimado: valor,
        criadoEm,
        atualizadoEm,
      }
    : null;
  return { contato, negocio };
}

// Estagio implicito de cada contato na migracao v2 para v3: o contato herda a
// coluna do seu negocio mais recente (a v2 punha o estagio no negocio). Contato
// sem negocio cai na primeira coluna.
function estagiosDosNegociosV2(
  negocios: unknown,
  colunasValidas: Set<string>,
): Map<string, string> {
  const mapa = new Map<string, { colunaId: string; quando: number }>();
  if (!Array.isArray(negocios)) return new Map();
  for (const bruto of negocios) {
    if (!bruto || typeof bruto !== "object") continue;
    const n = bruto as Record<string, unknown>;
    if (typeof n.contatoId !== "string" || typeof n.colunaId !== "string") continue;
    if (!colunasValidas.has(n.colunaId)) continue;
    const instante = typeof n.atualizadoEm === "string" ? Date.parse(n.atualizadoEm) : NaN;
    const quando = Number.isNaN(instante) ? 0 : instante;
    const anterior = mapa.get(n.contatoId);
    if (!anterior || quando >= anterior.quando) {
      mapa.set(n.contatoId, { colunaId: n.colunaId, quando });
    }
  }
  return new Map([...mapa].map(([id, { colunaId }]) => [id, colunaId]));
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
  const colunasValidas = new Set(colunas.map((coluna) => coluna.id));
  const primeira = ordenarColunas(colunas)[0].id;

  // v3: contato ja tem estagio, negocio ja e so valor.
  if (dados.versao === 3) {
    const contatos = Array.isArray(dados.contatos)
      ? dados.contatos
          .map((c) => saneiaContato(c, colunasValidas, primeira, () => { precisaSalvar = true; }))
          .filter((c): c is Contato => c !== null)
      : [];
    const contatosValidos = new Set(contatos.map((c) => c.id));
    const negociosSaneados = Array.isArray(dados.negocios)
      ? dados.negocios.map(saneiaNegocio).filter((n): n is Negocio => n !== null)
      : [];
    const negocios = negociosSaneados.filter((n) => contatosValidos.has(n.contatoId));
    if (negocios.length !== negociosSaneados.length) precisaSalvar = true;
    return {
      estado: { versao: 3, colunas: ordenarColunas(colunas), contatos, negocios },
      precisaSalvar,
    };
  }

  // v2: o estagio vivia no negocio. Cada contato herda o estagio do seu negocio
  // mais recente; os negocios perdem o estagio e viram so valor.
  if (dados.versao === 2) {
    precisaSalvar = true;
    const estagios = estagiosDosNegociosV2(dados.negocios, colunasValidas);
    const contatos = Array.isArray(dados.contatos)
      ? dados.contatos
          .map((c) => {
            const raw = c && typeof c === "object" ? (c as Record<string, unknown>) : {};
            const id = typeof raw.id === "string" ? raw.id : "";
            const colunaId =
              typeof raw.colunaId === "string" && colunasValidas.has(raw.colunaId)
                ? raw.colunaId
                : estagios.get(id);
            return saneiaContato({ ...raw, colunaId }, colunasValidas, primeira, () => {});
          })
          .filter((c): c is Contato => c !== null)
      : [];
    const contatosValidos = new Set(contatos.map((c) => c.id));
    const negocios = Array.isArray(dados.negocios)
      ? dados.negocios
          .map(saneiaNegocio)
          .filter((n): n is Negocio => n !== null)
          .filter((n) => contatosValidos.has(n.contatoId))
      : [];
    return {
      estado: { versao: 3, colunas: ordenarColunas(colunas), contatos, negocios },
      precisaSalvar,
    };
  }

  // v1: contato carregava colunaId e valor. Migra pro modelo novo.
  precisaSalvar = true;
  const migrados = Array.isArray(dados.contatos)
    ? dados.contatos
        .map((contato) => migrarContatoV1(contato, primeira, colunasValidas))
        .filter((item): item is { contato: Contato; negocio: Negocio | null } => item !== null)
    : [];
  const negocios = migrados
    .map((item) => item.negocio)
    .filter((n): n is Negocio => n !== null);
  return {
    estado: {
      versao: 3,
      colunas: ordenarColunas(colunas),
      contatos: migrados.map((item) => item.contato),
      negocios,
    },
    precisaSalvar: true,
  };
}

// Move o arquivo corrompido pra quarentena com timestamp e devolve o novo
// caminho. Renomeia, nunca sobrescreve: os dados originais ficam preservados.
function quarentenar(caminho: string): string {
  const destino = `${caminho}.corrompido-${Date.now()}`;
  renameSync(caminho, destino);
  return destino;
}

// Le e normaliza. Arquivo ausente devolve null (o chamador semeia o inicial).
// Arquivo que EXISTE mas nao parseia, ou que parseia num formato que nao e um
// estado de CRM, vai pra quarentena e lanca um ErroCrm legivel: o original nunca
// e sobrescrito nem descartado.
function lerArquivo(caminho: string): ResultadoNormalizacaoCrm | null {
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
  const resultado = normalizarEstadoCrm(bruto);
  if (!resultado) {
    const destino = quarentenar(caminho);
    throw new ErroCrm(
      `O arquivo do CRM esta num formato invalido e nao pode ser lido. O original foi preservado em "${basename(destino)}". Restaure um backup valido pra recuperar os contatos.`,
      409,
    );
  }
  return resultado;
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
    return { versao: 3, colunas: colunasPadrao(), contatos: [], negocios: [] };
  }
  const existente = lerEstadoCrmDeArquivo(caminho);
  if (existente) return existente;
  const inicial: EstadoCrm = {
    versao: 3,
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

function colunaValidaOuPrimeira(estado: EstadoCrm, v: unknown): string {
  if (typeof v === "string" && estado.colunas.some((coluna) => coluna.id === v)) {
    return v;
  }
  return primeiraColuna(estado).id;
}

export function criarContato(corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const agora = new Date().toISOString();
  const contato: Contato = {
    id: gerarId("c"),
    nome: textoObrigatorio(corpo.nome, "Nome"),
    colunaId: colunaValidaOuPrimeira(estado, corpo.colunaId),
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
  const lead = saneiaLead(corpo.lead);
  if (lead) contato.lead = lead;
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

// A ordem do array de contatos e a ordem visual do quadro, entao soltar um
// cartao numa posicao precisa reposicionar o item de verdade. Insere no bloco
// da coluna de destino, mantendo os blocos contiguos. Generica sobre qualquer
// item com id e colunaId (contato hoje; negocio era assim na v2).
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

// Move um CONTATO de estagio (e, quando pedido, reposiciona na coluna). Emite o
// mesmo evento crm:contato-movido de antes, agora disparado pela ficha e nao
// pelo negocio, o que mantem as automacoes de mudanca de estagio funcionando.
export function moverContato(id: string, corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  const colunaId = textoObrigatorio(corpo.colunaId, "Coluna");
  const colunaPara = acharColuna(estado, colunaId);
  const colunaDe = contato.colunaId;
  const nomeColunaDe = estado.colunas.find((coluna) => coluna.id === colunaDe)?.nome ?? "";
  contato.colunaId = colunaId;
  contato.atualizadoEm = new Date().toISOString();
  if (typeof corpo.indice === "number" && Number.isFinite(corpo.indice)) {
    estado.contatos = posicionarNoFunil(estado.contatos, contato, corpo.indice);
  }
  salvar(estado);
  // So avisa o barramento quando a coluna mudou de verdade. Reordenar dentro da
  // mesma coluna nao pode disparar automacao de mudanca de estagio.
  if (colunaDe !== colunaId) {
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

// Negocio e valor/oportunidade preso a um contato. Nao tem estagio: quem caminha
// no funil e o contato.
export function criarNegocio(corpo: Record<string, unknown>): Negocio {
  const estado = lerEstadoMutavel();
  const contatoId = textoObrigatorio(corpo.contatoId, "Contato");
  const contato = acharContato(estado, contatoId);
  const agora = new Date().toISOString();
  const negocio: Negocio = {
    id: gerarId("n"),
    titulo: textoObrigatorio(corpo.titulo, "Titulo do negocio"),
    contatoId,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const valor = normalizaValor(corpo.valorEstimado);
  if (valor !== undefined) negocio.valorEstimado = valor;
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
  if ("valorEstimado" in corpo) {
    const valor = normalizaValor(corpo.valorEstimado);
    if (valor === undefined) delete negocio.valorEstimado;
    else negocio.valorEstimado = valor;
  }
  negocio.atualizadoEm = new Date().toISOString();
  salvar(estado);
  const contato = acharContato(estado, negocio.contatoId);
  emitirCrm("crm:negocio-atualizado", { contato, negocio });
  return negocio;
}

export function removerNegocio(id: string): void {
  const estado = lerEstadoMutavel();
  const negocio = acharNegocio(estado, id);
  const contato = estado.contatos.find((item) => item.id === negocio.contatoId);
  estado.negocios = estado.negocios.filter((item) => item.id !== id);
  salvar(estado);
  emitirCrm("crm:negocio-excluido", contato ? { contato, negocio } : { negocio });
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
  // Os contatos daquela coluna caem na primeira que sobrar, pra nenhum sumir do
  // quadro.
  for (const contato of estado.contatos) {
    if (contato.colunaId === id) {
      contato.colunaId = destino;
      contato.atualizadoEm = new Date().toISOString();
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
