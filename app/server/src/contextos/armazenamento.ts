// Armazenamento dos nos de contexto.
// Conteudo mora na pasta do VKOS em materiais/cockpit/<slug>/: texto em notas.md,
// anexos como arquivos soltos. O indice (id, nome, slug, datas) fica em
// app/dados/workspaces/<id>/contextos.json, escopado por workspace. A lista de
// arquivos e sempre lida do disco, o disco e a fonte da verdade. O caminho do
// indice e resolvido POR CHAMADA: o workspace troca em runtime.

import { join, resolve, relative, isAbsolute, extname } from "node:path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";

import type { Contexto, ArquivoContexto, TipoContexto } from "../tipos.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { obterPastaVkos } from "../vkos/estado.js";
import {
  garantirPastaDadosWorkspace,
  idWorkspaceAtivo,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

// Caminho do indice do workspace ativo, ou null sem workspace ativo.
function caminhoIndiceAtivo(): string | null {
  const id = idWorkspaceAtivo();
  return id ? join(pastaDadosWorkspace(id), "contextos.json") : null;
}

// Nome do arquivo de texto do no. Nunca aparece na lista de anexos.
const ARQUIVO_NOTAS = "notas.md";
// Caminho relativo dentro da pasta do VKOS onde os nos vivem.
const RAIZ_COCKPIT = join("materiais", "cockpit");

// Entrada persistida no indice. So o essencial, o resto vem do disco.
// O tipo e imutavel depois de criado, como o slug.
interface EntradaIndice {
  id: string;
  nome: string;
  slug: string;
  tipo: TipoContexto;
  criadaEm: string;
  atualizadaEm: string;
}

// Extensoes que marcam um no como do tipo "imagens" na inferencia do disco.
const EXTENSOES_IMAGEM = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
]);

// Valida o tipo vindo da requisicao. Ausente vira "texto". Invalido da 400.
function validarTipo(bruto: unknown): TipoContexto {
  if (bruto === undefined || bruto === null || bruto === "") return "texto";
  if (bruto === "texto" || bruto === "imagens" || bruto === "links") return bruto;
  throw new ErroContexto(
    400,
    `Tipo de contexto invalido: "${String(bruto)}". Use "texto", "imagens" ou "links".`,
  );
}

// Infere o tipo de um no olhando o disco, nesta ordem: se a pasta tem alguma
// imagem, e "imagens"; senao, se o notas.md tem alguma linha com "http", e
// "links"; caso contrario (ou se nao da pra ler), "texto". Tolerante a notas.md
// ausente ou ilegivel.
function inferirTipoDoDisco(slug: string): TipoContexto {
  const pasta = obterPastaVkos();
  if (!pasta) return "texto";
  const alvo = join(pasta, RAIZ_COCKPIT, slug);
  let nomes: string[];
  try {
    nomes = readdirSync(alvo);
  } catch {
    return "texto";
  }
  for (const nome of nomes) {
    if (EXTENSOES_IMAGEM.has(extname(nome).toLowerCase())) return "imagens";
  }
  // Sem imagem: procura link no notas.md. Qualquer linha com "http" conta.
  try {
    const notas = readFileSync(join(alvo, ARQUIVO_NOTAS), "utf8");
    if (notas.split(/\r?\n/).some((linha) => linha.includes("http"))) {
      return "links";
    }
  } catch {
    // notas.md ausente ou ilegivel: segue como texto.
  }
  return "texto";
}

// Erro de negocio com status HTTP, pra virar resposta clara nas rotas.
export class ErroContexto extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// Cache do indice por workspace. Nunca cachear um caminho de modulo: o workspace
// troca em runtime, entao o cache e chaveado pelo id ativo.
const cachePorWorkspace = new Map<string, EntradaIndice[]>();

// Le o indice do workspace ativo do disco uma vez e guarda em memoria. Sem
// workspace ativo, devolve lista vazia.
function carregarIndice(): EntradaIndice[] {
  const id = idWorkspaceAtivo();
  if (!id) return [];
  const cacheado = cachePorWorkspace.get(id);
  if (cacheado) return cacheado;

  const carregado: EntradaIndice[] = [];
  // Marca se alguma entrada antiga (sem tipo) foi normalizada, pra persistir.
  let normalizou = false;
  const caminho = join(pastaDadosWorkspace(id), "contextos.json");
  try {
    if (existsSync(caminho)) {
      const bruto = readFileSync(caminho, "utf8");
      const dados = JSON.parse(bruto);
      if (Array.isArray(dados)) {
        for (const e of dados) {
          if (!e || typeof e.id !== "string" || typeof e.slug !== "string") continue;
          if (e.tipo === "texto" || e.tipo === "imagens" || e.tipo === "links") {
            carregado.push(e as EntradaIndice);
          } else {
            // Indice antigo sem tipo: infere do disco e marca pra persistir.
            carregado.push({ ...e, tipo: inferirTipoDoDisco(e.slug) });
            normalizou = true;
          }
        }
      }
    }
  } catch {
    // Indice corrompido: comeca limpo, sem quebrar.
    cachePorWorkspace.set(id, []);
    return cachePorWorkspace.get(id) as EntradaIndice[];
  }
  cachePorWorkspace.set(id, carregado);
  if (normalizou) salvarIndice();
  return carregado;
}

function salvarIndice(): void {
  const id = idWorkspaceAtivo();
  const caminho = caminhoIndiceAtivo();
  if (!id || !caminho) return;
  garantirPastaDadosWorkspace(id);
  gravarJsonAtomico(caminho, cachePorWorkspace.get(id) ?? []);
}

// Descarta o cache do indice de um workspace. Chamado na troca de workspace ativo
// e na remocao do registro, pra o proximo acesso reler do disco (fonte da verdade).
export function invalidarCacheContextos(id: string): void {
  cachePorWorkspace.delete(id);
}

// Exige que exista uma pasta de VKOS escolhida. Erro 400 claro se nao.
function exigirPastaVkos(): string {
  const pasta = obterPastaVkos();
  if (!pasta) {
    throw new ErroContexto(400, "Nenhuma pasta de VKOS escolhida ainda.");
  }
  return pasta;
}

// Caminho absoluto da pasta de um no dentro do VKOS.
function pastaDoNo(slug: string): string {
  return join(exigirPastaVkos(), RAIZ_COCKPIT, slug);
}

// Caminho relativo (pra exibir no Contexto), sempre com barra normal.
function pastaRelativa(slug: string): string {
  return `materiais/cockpit/${slug}`;
}

function gerarId(): string {
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `c-${Date.now().toString(36)}-${aleatorio}`;
}

// Gera um slug a partir do nome: minusculo, sem acento, palavras por hifen.
function slugBase(nome: string): string {
  const semAcento = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const limpo = semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpo || "contexto";
}

// Slug unico: se ja existe, adiciona sufixo numerico. Imutavel depois de criado.
function slugUnico(nome: string): string {
  const indice = carregarIndice();
  const base = slugBase(nome);
  const usados = new Set(indice.map((e) => e.slug));
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// Sanitiza o nome de um arquivo: sem caminho, sem .., sem byte nulo, sem
// caractere proibido no Windows. Retorna "" se nao sobrar nada valido.
export function sanitizarNomeArquivo(bruto: string): string {
  if (!bruto) return "";
  // Fica so com a ultima parte, cortando qualquer barra ou contrabarra.
  const partes = bruto.split(/[\\/]/);
  let nome = partes[partes.length - 1] ?? "";
  // Remove byte nulo e caracteres de controle.
  // eslint-disable-next-line no-control-regex
  nome = nome.replace(/[\u0000-\u001f]/g, "");
  // Remove caracteres proibidos no Windows.
  nome = nome.replace(/[<>:"|?*]/g, "");
  // Tira espacos e pontos das pontas (Windows nao aceita no fim).
  nome = nome.replace(/^[.\s]+|[.\s]+$/g, "");
  // Sobrou so pontos ou vazio? Invalido.
  if (!nome || nome === "." || nome === "..") return "";
  return nome;
}

const TIPOS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".csv": "text/csv; charset=utf-8",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

export function contentType(nome: string): string {
  const ext = extname(nome).toLowerCase();
  return TIPOS[ext] ?? "application/octet-stream";
}

// Le os anexos do disco (tudo menos o notas.md), com tamanho e content-type.
function lerArquivos(slug: string): ArquivoContexto[] {
  const pasta = pastaDoNo(slug);
  let nomes: string[];
  try {
    nomes = readdirSync(pasta);
  } catch {
    return [];
  }
  const lista: ArquivoContexto[] = [];
  for (const nome of nomes) {
    if (nome === ARQUIVO_NOTAS) continue;
    let estat;
    try {
      estat = statSync(join(pasta, nome));
    } catch {
      continue;
    }
    if (!estat.isFile()) continue;
    lista.push({ nome, tamanho: estat.size, tipo: contentType(nome) });
  }
  lista.sort((a, b) => a.nome.localeCompare(b.nome));
  return lista;
}

// Le o texto do notas.md do no, ou string vazia se nao existe.
function lerTexto(slug: string): string {
  const alvo = join(pastaDoNo(slug), ARQUIVO_NOTAS);
  try {
    return readFileSync(alvo, "utf8");
  } catch {
    return "";
  }
}

// Monta o Contexto completo a partir da entrada do indice e do disco.
function montarContexto(entrada: EntradaIndice): Contexto {
  return {
    id: entrada.id,
    nome: entrada.nome,
    slug: entrada.slug,
    tipo: entrada.tipo,
    texto: lerTexto(entrada.slug),
    arquivos: lerArquivos(entrada.slug),
    pastaRelativa: pastaRelativa(entrada.slug),
    criadaEm: entrada.criadaEm,
    atualizadaEm: entrada.atualizadaEm,
  };
}

function acharEntrada(id: string): EntradaIndice {
  const indice = carregarIndice();
  const entrada = indice.find((e) => e.id === id);
  if (!entrada) {
    throw new ErroContexto(404, "Contexto nao encontrado.");
  }
  return entrada;
}

// Nome de exibicao a partir do slug: hifens viram espacos, primeira maiuscula.
function nomeAPartirDoSlug(slug: string): string {
  const texto = slug.replace(/-+/g, " ").trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : slug;
}

// Adota pastas orfas em materiais/cockpit/ que nao estao no indice (criadas na
// mao ou por outra ferramenta). O disco e a fonte da verdade: se a pasta existe,
// ela vira um contexto com nome derivado do slug.
function adotarPastasOrfas(): void {
  const pasta = obterPastaVkos();
  if (!pasta) return;
  const raiz = join(pasta, RAIZ_COCKPIT);
  let nomes: string[];
  try {
    nomes = readdirSync(raiz);
  } catch {
    return;
  }
  const indice = carregarIndice();
  const conhecidos = new Set(indice.map((e) => e.slug));
  let mudou = false;
  for (const nome of nomes) {
    if (conhecidos.has(nome)) continue;
    let estat;
    try {
      estat = statSync(join(raiz, nome));
    } catch {
      continue;
    }
    if (!estat.isDirectory()) continue;
    const agora = new Date().toISOString();
    indice.push({
      id: gerarId(),
      nome: nomeAPartirDoSlug(nome),
      slug: nome,
      tipo: inferirTipoDoDisco(nome),
      criadaEm: agora,
      atualizadaEm: agora,
    });
    mudou = true;
  }
  if (mudou) salvarIndice();
}

// ---- API do modulo ----

export function listarContextos(): Contexto[] {
  // Sem pasta VKOS escolhida nao ha contexto pra mostrar.
  if (!obterPastaVkos()) return [];
  adotarPastasOrfas();
  const indice = carregarIndice();
  return indice.map(montarContexto);
}

export function criarContexto(nomeBruto: string, tipoBruto?: unknown): Contexto {
  exigirPastaVkos();
  const nome = (nomeBruto ?? "").trim();
  if (!nome) {
    throw new ErroContexto(400, "Informe um nome para o contexto.");
  }
  // Valida o tipo antes de mexer no disco. Ausente vira "texto", invalido da 400.
  const tipo = validarTipo(tipoBruto);
  const indice = carregarIndice();
  const slug = slugUnico(nome);
  const agora = new Date().toISOString();
  const entrada: EntradaIndice = {
    id: gerarId(),
    nome,
    slug,
    tipo,
    criadaEm: agora,
    atualizadaEm: agora,
  };
  // Cria a pasta do no dentro do VKOS.
  mkdirSync(pastaDoNo(slug), { recursive: true });
  indice.push(entrada);
  salvarIndice();
  return montarContexto(entrada);
}

// Renomeia (so o nome de exibicao) e grava o texto do notas.md. O slug nao muda.
export function atualizarContexto(
  id: string,
  dados: { nome?: string; texto?: string },
): Contexto {
  exigirPastaVkos();
  const entrada = acharEntrada(id);
  let mudou = false;

  if (typeof dados.nome === "string") {
    const nome = dados.nome.trim();
    if (nome && nome !== entrada.nome) {
      entrada.nome = nome;
      mudou = true;
    }
  }

  if (typeof dados.texto === "string") {
    mkdirSync(pastaDoNo(entrada.slug), { recursive: true });
    writeFileSync(join(pastaDoNo(entrada.slug), ARQUIVO_NOTAS), dados.texto, "utf8");
    mudou = true;
  }

  if (mudou) {
    entrada.atualizadaEm = new Date().toISOString();
    salvarIndice();
  }
  return montarContexto(entrada);
}

// Remove a pasta inteira do no e a entrada do indice.
export function removerContexto(id: string): void {
  exigirPastaVkos();
  const entrada = acharEntrada(id);
  try {
    rmSync(pastaDoNo(entrada.slug), { recursive: true, force: true });
  } catch {
    // Pasta ja sumiu ou nao deu pra apagar: segue removendo do indice.
  }
  const wsId = idWorkspaceAtivo();
  const indice = carregarIndice();
  const filtrado = indice.filter((e) => e.id !== id);
  if (wsId) cachePorWorkspace.set(wsId, filtrado);
  salvarIndice();
}

// Resolve com seguranca o caminho de um anexo dentro da pasta do no.
// Garante que o alvo nao escapa da pasta e que nao e o notas.md interno.
export function caminhoAnexoSeguro(id: string, nomeBruto: string): string {
  const entrada = acharEntrada(id);
  const nome = sanitizarNomeArquivo(nomeBruto);
  if (!nome || nome === ARQUIVO_NOTAS) {
    throw new ErroContexto(404, "Arquivo nao encontrado.");
  }
  const base = resolve(pastaDoNo(entrada.slug));
  const alvo = resolve(base, nome);
  const rel = relative(base, alvo);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new ErroContexto(403, "Acesso fora da pasta do contexto.");
  }
  return alvo;
}

// Escolhe um nome livre na pasta do no. Se ja existe, adiciona sufixo numerico
// antes da extensao. Retorna { nome, caminho } pronto pra gravar.
export function reservarNomeAnexo(id: string, nomeBruto: string): { nome: string; caminho: string } {
  const entrada = acharEntrada(id);
  const pasta = pastaDoNo(entrada.slug);
  mkdirSync(pasta, { recursive: true });

  let nome = sanitizarNomeArquivo(nomeBruto);
  if (!nome || nome === ARQUIVO_NOTAS) {
    nome = nome === ARQUIVO_NOTAS ? "anexo-notas.md" : "arquivo";
  }

  const ext = extname(nome);
  const semExt = ext ? nome.slice(0, -ext.length) : nome;
  let escolhido = nome;
  let n = 2;
  while (existsSync(join(pasta, escolhido))) {
    escolhido = `${semExt}-${n}${ext}`;
    n += 1;
  }
  return { nome: escolhido, caminho: join(pasta, escolhido) };
}

// Recarrega o Contexto por id (usado depois de mexer no disco).
export function obterContexto(id: string): Contexto {
  return montarContexto(acharEntrada(id));
}

// Marca o no como atualizado agora (depois de upload ou remocao de anexo).
export function carimbarAtualizacao(id: string): void {
  const entrada = acharEntrada(id);
  entrada.atualizadaEm = new Date().toISOString();
  salvarIndice();
}
