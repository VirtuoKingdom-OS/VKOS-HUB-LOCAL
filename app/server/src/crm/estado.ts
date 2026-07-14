// Estado do CRM, escopado por workspace. O funil de contatos do prestador de
// servico vive em app/dados/workspaces/<id>/crm.json. O caminho e resolvido POR
// CHAMADA: o workspace ativo troca em runtime, nunca cacheamos o caminho.
//
// Modulo folha do CRM: so depende de node fs/path, do resolvedor de workspace e
// da escrita atomica. As rotas chamam estas funcoes e traduzem ErroCrm em HTTP.

import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  garantirPastaDadosWorkspace,
  idWorkspaceAtivo,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

// Erro de dominio do CRM: carrega o status HTTP que a rota deve responder.
export class ErroCrm extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroCrm";
    this.status = status;
  }
}

// Uma nota tem a hora que foi escrita e o texto. Guardadas com a mais nova no
// topo do array (indice 0), pra a tela nao precisar reordenar.
export interface Nota {
  em: string;
  texto: string;
}

// Um contato do funil. Campos de contato sao opcionais, so o nome e obrigatorio.
export interface Contato {
  id: string;
  nome: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  valorEstimado?: number;
  colunaId: string;
  tags: string[];
  notas: Nota[];
  criadoEm: string;
  atualizadoEm: string;
}

// Uma coluna do kanban. ordem define a posicao horizontal.
export interface Coluna {
  id: string;
  nome: string;
  ordem: number;
}

// O estado inteiro que a rota GET devolve e que grava em crm.json.
export interface EstadoCrm {
  colunas: Coluna[];
  contatos: Contato[];
}

// Nomes das colunas padrao na primeira leitura de um workspace sem arquivo.
const COLUNAS_PADRAO = [
  "Novo contato",
  "Conversando",
  "Proposta enviada",
  "Fechado",
  "Perdido",
];

// Gera um id curto e unico o suficiente pro uso local: prefixo + tempo + aleatorio.
function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// Monta as colunas padrao com ids frescos e ordem sequencial.
function colunasPadrao(): Coluna[] {
  return COLUNAS_PADRAO.map((nome, i) => ({ id: gerarId("k"), nome, ordem: i }));
}

// Caminho do crm.json do workspace ativo. Sem workspace ativo, devolve null: a
// leitura ainda funciona (colunas padrao efemeras), mas gravar nao tem onde ir.
function caminhoAtivo(): string | null {
  const id = idWorkspaceAtivo();
  return id ? join(pastaDadosWorkspace(id), "crm.json") : null;
}

// Sanea uma nota vinda do disco. Descarta o que nao tem forma de nota.
function saneiaNota(v: unknown): Nota | null {
  if (!v || typeof v !== "object") return null;
  const n = v as Record<string, unknown>;
  if (typeof n.texto !== "string") return null;
  return { em: typeof n.em === "string" ? n.em : new Date().toISOString(), texto: n.texto };
}

// Sanea um contato vindo do disco: garante os campos obrigatorios e os tipos dos
// opcionais. Um contato sem nome ou sem colunaId e descartado.
function saneiaContato(v: unknown): Contato | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  if (typeof c.id !== "string" || typeof c.nome !== "string" || typeof c.colunaId !== "string") {
    return null;
  }
  const agora = new Date().toISOString();
  const contato: Contato = {
    id: c.id,
    nome: c.nome,
    colunaId: c.colunaId,
    tags: Array.isArray(c.tags) ? c.tags.filter((t): t is string => typeof t === "string") : [],
    notas: Array.isArray(c.notas) ? c.notas.map(saneiaNota).filter((n): n is Nota => n !== null) : [],
    criadoEm: typeof c.criadoEm === "string" ? c.criadoEm : agora,
    atualizadoEm: typeof c.atualizadoEm === "string" ? c.atualizadoEm : agora,
  };
  if (typeof c.empresa === "string") contato.empresa = c.empresa;
  if (typeof c.telefone === "string") contato.telefone = c.telefone;
  if (typeof c.email === "string") contato.email = c.email;
  if (typeof c.origem === "string") contato.origem = c.origem;
  if (typeof c.valorEstimado === "number" && Number.isFinite(c.valorEstimado)) {
    contato.valorEstimado = c.valorEstimado;
  }
  return contato;
}

// Sanea uma coluna vinda do disco.
function saneiaColuna(v: unknown, indice: number): Coluna | null {
  if (!v || typeof v !== "object") return null;
  const k = v as Record<string, unknown>;
  if (typeof k.id !== "string" || typeof k.nome !== "string") return null;
  return { id: k.id, nome: k.nome, ordem: typeof k.ordem === "number" ? k.ordem : indice };
}

// Le e sanea o arquivo de um caminho. Arquivo ausente devolve null (o chamador
// decide criar os padroes). Arquivo ilegivel tambem vira null, sem quebrar.
function lerArquivo(caminho: string): EstadoCrm | null {
  if (!existsSync(caminho)) return null;
  try {
    const dados = JSON.parse(readFileSync(caminho, "utf8"));
    if (!dados || typeof dados !== "object") return null;
    const colunas = Array.isArray(dados.colunas)
      ? dados.colunas.map(saneiaColuna).filter((c: Coluna | null): c is Coluna => c !== null)
      : [];
    const contatos = Array.isArray(dados.contatos)
      ? dados.contatos.map(saneiaContato).filter((c: Contato | null): c is Contato => c !== null)
      : [];
    // Um CRM sem nenhuma coluna e invalido: recompoe as padroes.
    if (colunas.length === 0) return { colunas: colunasPadrao(), contatos };
    return { colunas: ordenarColunas(colunas), contatos };
  } catch {
    return null;
  }
}

// Colunas sempre saem ordenadas por ordem, empate resolvido pelo nome.
function ordenarColunas(colunas: Coluna[]): Coluna[] {
  return [...colunas].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
}

// Grava o estado no crm.json do workspace ativo. Lanca se nao ha workspace.
function salvar(estado: EstadoCrm): void {
  const id = idWorkspaceAtivo();
  if (!id) {
    throw new ErroCrm("Nenhum cliente ativo. Abra um workspace pra usar o CRM.", 409);
  }
  garantirPastaDadosWorkspace(id);
  gravarJsonAtomico(join(pastaDadosWorkspace(id), "crm.json"), estado);
}

// Le o estado do workspace ativo. Sem arquivo, cria as colunas padrao e persiste
// (se ha workspace). Sem workspace ativo, devolve colunas padrao efemeras, pra a
// tela ter o que mostrar sem quebrar.
export function lerEstado(): EstadoCrm {
  const caminho = caminhoAtivo();
  if (!caminho) return { colunas: colunasPadrao(), contatos: [] };
  const existente = lerArquivo(caminho);
  if (existente) return existente;
  const inicial: EstadoCrm = { colunas: colunasPadrao(), contatos: [] };
  salvar(inicial);
  return inicial;
}

// Le o estado exigindo workspace ativo (pras mutacoes). Sem workspace, lanca 409.
function lerEstadoMutavel(): EstadoCrm {
  if (!idWorkspaceAtivo()) {
    throw new ErroCrm("Nenhum cliente ativo. Abra um workspace pra usar o CRM.", 409);
  }
  return lerEstado();
}

// A primeira coluna do funil: a de menor ordem. Sempre existe (garantido na leitura).
function primeiraColuna(estado: EstadoCrm): Coluna {
  return ordenarColunas(estado.colunas)[0];
}

// Valida e normaliza um texto obrigatorio (nome de contato, de coluna, nota).
function textoObrigatorio(v: unknown, rotulo: string, limite = 200): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new ErroCrm(`${rotulo} e obrigatorio.`, 400);
  }
  return v.trim().slice(0, limite);
}

// Normaliza um valor estimado opcional: numero finito e nao negativo, ou undefined.
function normalizaValor(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw new ErroCrm("Valor estimado precisa ser um numero positivo.", 400);
  }
  return n;
}

// Normaliza um texto opcional: string aparada, ou undefined se vazia.
function textoOpcional(v: unknown, limite = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const limpo = v.trim().slice(0, limite);
  return limpo || undefined;
}

// Normaliza uma lista de tags: strings aparadas, sem vazias nem repetidas.
function normalizaTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const t of v) {
    if (typeof t !== "string") continue;
    const limpo = t.trim().slice(0, 40);
    if (!limpo) continue;
    const chave = limpo.toLowerCase();
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push(limpo);
  }
  return saida;
}

// Acha um contato pelo id, ou lanca 404.
function acharContato(estado: EstadoCrm, id: string): Contato {
  const contato = estado.contatos.find((c) => c.id === id);
  if (!contato) throw new ErroCrm("Contato nao encontrado.", 404);
  return contato;
}

// Acha uma coluna pelo id, ou lanca 404.
function acharColuna(estado: EstadoCrm, id: string): Coluna {
  const coluna = estado.colunas.find((k) => k.id === id);
  if (!coluna) throw new ErroCrm("Coluna nao encontrada.", 404);
  return coluna;
}

// === Operacoes de contato ===

// Cria um contato. Sem colunaId valido, cai na primeira coluna. Devolve o criado.
export function criarContato(corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const nome = textoObrigatorio(corpo.nome, "Nome");
  let colunaId = typeof corpo.colunaId === "string" ? corpo.colunaId : "";
  if (!colunaId || !estado.colunas.some((k) => k.id === colunaId)) {
    colunaId = primeiraColuna(estado).id;
  }
  const agora = new Date().toISOString();
  const contato: Contato = {
    id: gerarId("c"),
    nome,
    colunaId,
    tags: normalizaTags(corpo.tags),
    notas: [],
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const empresa = textoOpcional(corpo.empresa);
  if (empresa) contato.empresa = empresa;
  const telefone = textoOpcional(corpo.telefone);
  if (telefone) contato.telefone = telefone;
  const email = textoOpcional(corpo.email);
  if (email) contato.email = email;
  const origem = textoOpcional(corpo.origem);
  if (origem) contato.origem = origem;
  const valor = normalizaValor(corpo.valorEstimado);
  if (valor !== undefined) contato.valorEstimado = valor;

  estado.contatos.push(contato);
  salvar(estado);
  return contato;
}

// Atualiza campos de um contato. So mexe no que veio no corpo. Devolve o atualizado.
export function atualizarContato(id: string, corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);

  if ("nome" in corpo) contato.nome = textoObrigatorio(corpo.nome, "Nome");
  if ("empresa" in corpo) definirOpcional(contato, "empresa", textoOpcional(corpo.empresa));
  if ("telefone" in corpo) definirOpcional(contato, "telefone", textoOpcional(corpo.telefone));
  if ("email" in corpo) definirOpcional(contato, "email", textoOpcional(corpo.email));
  if ("origem" in corpo) definirOpcional(contato, "origem", textoOpcional(corpo.origem));
  if ("valorEstimado" in corpo) {
    const valor = normalizaValor(corpo.valorEstimado);
    if (valor === undefined) delete contato.valorEstimado;
    else contato.valorEstimado = valor;
  }
  if ("tags" in corpo) contato.tags = normalizaTags(corpo.tags);

  contato.atualizadoEm = new Date().toISOString();
  salvar(estado);
  return contato;
}

// Ajuda: seta um campo opcional de texto, ou remove se vazio.
function definirOpcional(
  contato: Contato,
  campo: "empresa" | "telefone" | "email" | "origem",
  valor: string | undefined
): void {
  if (valor === undefined) delete contato[campo];
  else contato[campo] = valor;
}

// Remove um contato do funil.
export function removerContato(id: string): void {
  const estado = lerEstadoMutavel();
  acharContato(estado, id);
  estado.contatos = estado.contatos.filter((c) => c.id !== id);
  salvar(estado);
}

// Adiciona uma nota a um contato, com a mais nova no topo. Devolve o contato.
export function adicionarNota(id: string, corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  const texto = textoObrigatorio(corpo.texto, "Nota", 2000);
  contato.notas.unshift({ em: new Date().toISOString(), texto });
  contato.atualizadoEm = new Date().toISOString();
  salvar(estado);
  return contato;
}

// Move um contato pra outra coluna. Devolve o contato.
export function moverContato(id: string, corpo: Record<string, unknown>): Contato {
  const estado = lerEstadoMutavel();
  const contato = acharContato(estado, id);
  const colunaId = textoObrigatorio(corpo.colunaId, "Coluna");
  acharColuna(estado, colunaId);
  contato.colunaId = colunaId;
  contato.atualizadoEm = new Date().toISOString();
  salvar(estado);
  return contato;
}

// === Operacoes de coluna ===

// Cria uma coluna nova no fim do funil. Devolve a criada.
export function criarColuna(corpo: Record<string, unknown>): Coluna {
  const estado = lerEstadoMutavel();
  const nome = textoObrigatorio(corpo.nome, "Nome da coluna", 60);
  const ordem = estado.colunas.reduce((max, k) => Math.max(max, k.ordem), -1) + 1;
  const coluna: Coluna = { id: gerarId("k"), nome, ordem };
  estado.colunas.push(coluna);
  salvar(estado);
  return coluna;
}

// Renomeia uma coluna. Devolve a atualizada.
export function renomearColuna(id: string, corpo: Record<string, unknown>): Coluna {
  const estado = lerEstadoMutavel();
  const coluna = acharColuna(estado, id);
  coluna.nome = textoObrigatorio(corpo.nome, "Nome da coluna", 60);
  salvar(estado);
  return coluna;
}

// Exclui uma coluna. Os contatos dela vao pra primeira coluna que sobrar. Recusa
// se for a ultima coluna (o funil nao pode ficar sem coluna nenhuma).
export function removerColuna(id: string): void {
  const estado = lerEstadoMutavel();
  acharColuna(estado, id);
  if (estado.colunas.length <= 1) {
    throw new ErroCrm("O funil precisa de pelo menos uma coluna.", 400);
  }
  const restantes = ordenarColunas(estado.colunas.filter((k) => k.id !== id));
  const destino = restantes[0].id;
  for (const c of estado.contatos) {
    if (c.colunaId === id) {
      c.colunaId = destino;
      c.atualizadoEm = new Date().toISOString();
    }
  }
  estado.colunas = restantes;
  salvar(estado);
}

// Reordena as colunas conforme a lista de ids. Ids ausentes na lista mantem a
// ordem relativa, jogados pro fim. Devolve as colunas ja ordenadas.
export function reordenarColunas(corpo: Record<string, unknown>): Coluna[] {
  const estado = lerEstadoMutavel();
  const ordem = corpo.ordem;
  if (!Array.isArray(ordem) || ordem.some((x) => typeof x !== "string")) {
    throw new ErroCrm("Envie a ordem como uma lista de ids.", 400);
  }
  const posicao = new Map<string, number>();
  (ordem as string[]).forEach((id, i) => posicao.set(id, i));
  let proxima = ordem.length;
  for (const k of estado.colunas) {
    k.ordem = posicao.has(k.id) ? (posicao.get(k.id) as number) : proxima++;
  }
  estado.colunas = ordenarColunas(estado.colunas);
  salvar(estado);
  return estado.colunas;
}
