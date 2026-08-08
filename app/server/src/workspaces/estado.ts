// Estado dos workspaces: o registro de clientes do prestador de servico.
// Cada workspace e uma pasta VKOS completa. O estado do app passa a ser
// escopado por workspace em app/dados/workspaces/<id>/. Este modulo e a fonte
// unica do registro (app/dados/workspaces.json) e dos caminhos de dados por id.
//
// Modulo folha: so depende de node fs/path, nunca de outro modulo do servidor.
// Assim ninguem cria ciclo importando daqui.

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";

import { doDisco, paraDisco } from "../util/caminhoPortavel.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { quarentenarComErro } from "../util/quarentena.js";

// Este modulo mora em src/workspaces (dev) ou dist/workspaces (build). Subir tres
// niveis chega na pasta app nos dois casos.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");

// Raiz dos dados, lida a CADA chamada e nunca fixada na carga do modulo.
//
// VKOS_DADOS_TESTE desvia a raiz pro teste nao gravar no registro real. Isso
// nao e conveniencia, e conserto: ate 2026-07-27 estas tres constantes eram
// calculadas uma vez, entao o teste de rota registrava cliente no
// app/dados/workspaces.json de verdade. Ele salvava o registro antes e
// restaurava no fim, mas o runner roda os arquivos em paralelo, e duas
// restauracoes concorrentes se atropelam. O resultado apareceu na conferencia
// visual: cinco clientes fantasma no Dashboard, apontando pra pasta temporaria
// que ja tinha sumido.
//
// O CRM ja resolvia assim (ver crm/estado.ts). Aqui a raiz e o registro em si.
function raizDados(): string {
  return process.env.VKOS_DADOS_TESTE?.trim() || join(pastaApp, "dados");
}

function caminhoRegistroAtual(): string {
  return join(raizDados(), "workspaces.json");
}

// Um cliente do prestador. A pasta e uma instalacao VKOS completa.
export interface Workspace {
  id: string;
  nome: string;
  pasta: string;
  criadoEm: string;
  ultimoUso: string;
  // O workspace administrativo: o projeto do proprio dono do Hub, e o lugar de
  // testar sem sujar projeto de cliente. Ele NAO e especial em nada do que faz:
  // tem a mesma pasta VKOS, as mesmas telas e o mesmo comportamento. A unica
  // diferenca e que as telas do proprio negocio, como o Instagram, aparecem so
  // nele enquanto a conexao for uma conta so, do CORE.
  //
  // So um por vez, e a invariante e garantida na leitura e na marcacao.
  // Ausente e o normal: a maioria dos workspaces nunca tem esta chave.
  admin?: boolean;
  // A cor da capa do cartao na tela de Workspaces. Ela e IDENTIDADE do projeto,
  // e nao estado do app: e por isso que ela e a mesma nos dois temas, como a
  // marca de um cliente seria.
  //
  // Guarda o NOME da cor, nunca o valor. Assim o Hub pode recalibrar um tom sem
  // reescrever o registro de todo mundo, e um registro editado na mao nao
  // consegue injetar cor arbitraria numa tela.
  //
  // Ausente e o normal, e quer dizer carvao, que e o padrao da casa.
  cor?: CorDeCapa;
  // A PALETA PADRAO DAS PECAS DESTE PROJETO, por id.
  //
  // Entrou em 2026-08-06 com o Criador de Paletas apontando pro carrossel. O
  // problema que ele resolve foi medido: as quatro pecas reais da Mae Pixel
  // sairam com DOIS roxos diferentes, porque cada geracao reinventava a marca
  // dela lendo o Cerebro. Com o padrao no projeto, toda peca nasce com a mesma
  // paleta sem ninguem escolher nada, e escolher outra na criacao continua
  // possivel.
  //
  // GUARDA O ID, E NAO AS CORES, ao contrario do rascunho da criacao. Aqui a
  // pergunta e "qual paleta este cliente usa", e a resposta tem que acompanhar
  // a edicao da paleta. La a pergunta e "com que cores esta peca foi feita", e
  // a resposta e do momento em que ela foi feita.
  //
  // Ausente e o normal: o wizard entao nao pre-seleciona nada e a IA escolhe a
  // paleta lendo o Cerebro, que e o comportamento de sempre.
  paletaPadrao?: string;
}

// AS CORES DE CAPA, e sao estas e mais nenhuma.
//
// POR QUE UMA LISTA FECHADA, e nao um seletor de cor livre: a capa carrega o
// nome do workspace em --sobre-painel e o ponto de sessao viva em
// --menta-painel, que sao claros nos DOIS temas. Com cor livre, a primeira cor
// clara que alguem escolhesse apagaria o nome do proprio projeto, e nenhuma
// trava pegaria isso, porque a trava de contraste mede token contra token e uma
// cor escolhida em tempo de execucao nao e token.
//
// As sete sao escuras de proposito e foram MEDIDAS: no pior caso o nome fica em
// 11,5:1 e o ponto vivo em 7,9:1 contra a capa. A trava de contraste do web
// confere isso, par por par, a cada rodada.
export const CORES_DE_CAPA = [
  "carvao",
  "ardosia",
  "oceano",
  "musgo",
  "vinho",
  "indigo",
  "ferrugem",
  "ameixa",
] as const;

export type CorDeCapa = (typeof CORES_DE_CAPA)[number];

export function ehCorDeCapa(v: unknown): v is CorDeCapa {
  return typeof v === "string" && (CORES_DE_CAPA as readonly string[]).includes(v);
}

// O registro inteiro, do jeito que a rota GET /api/workspaces devolve.
export interface RegistroWorkspaces {
  workspaces: Workspace[];
  ativo: string | null;
}

// Cache em memoria do registro. Toda mutacao passa por salvarRegistro, entao o
// cache fica sempre coerente com o disco.
let cache: RegistroWorkspaces | null = null;
// De qual raiz o cache veio. Trocou a raiz, o cache nao vale mais.
let raizDoCache: string | null = null;

function garantirPastaDados(): void {
  const raiz = raizDados();
  if (!existsSync(raiz)) {
    mkdirSync(raiz, { recursive: true });
  }
}

// Valida a forma minima de um workspace vindo do disco.
function ehWorkspace(v: unknown): v is Workspace {
  if (!v || typeof v !== "object") return false;
  const w = v as Record<string, unknown>;
  return typeof w.id === "string" && typeof w.pasta === "string" && typeof w.nome === "string";
}

// Diz se o arquivo do registro ja existe em disco. A migracao usa isso pra
// decidir se ainda precisa rodar (idempotencia).
export function registroExiste(): boolean {
  return existsSync(caminhoRegistroAtual());
}

// Le o registro de um caminho. Arquivo ausente devolve null (primeira execucao,
// quem chamou comeca vazio em silencio). Arquivo que EXISTE mas nao parseia, ou
// que parseia numa forma que nao e um registro, vai pra quarentena e lanca.
//
// Falha fechado de proposito. Este arquivo e a lista de clientes do prestador:
// comecar vazio nao e comeco, e perda total. E qualquer gravacao seguinte
// (ativar cliente, criar sessao, renomear) persistiria esse vazio por cima do
// original. Melhor a tela nao abrir e o usuario restaurar um backup.
//
// Exportada pra provar o comportamento com fixture temporaria, sem apontar
// teste pro registro real do app.
export function lerRegistroDeArquivo(caminho: string): RegistroWorkspaces | null {
  if (!existsSync(caminho)) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    throw quarentenarComErro(caminho, "O registro de workspaces");
  }
  const dados = bruto as { workspaces?: unknown; ativo?: unknown } | null;
  if (!dados || typeof dados !== "object" || !Array.isArray(dados.workspaces)) {
    throw quarentenarComErro(caminho, "O registro de workspaces");
  }
  return {
    workspaces: umAdminSo(
      dados.workspaces
        .filter(ehWorkspace)
        .map(absolutizarPasta)
        .map(normalizarAdmin)
        .map(normalizarCor)
        .map(normalizarPaletaPadrao),
    ),
    ativo: typeof dados.ativo === "string" ? dados.ativo : null,
  };
}

// A pasta gravada relativa volta absoluta aqui, na porta de entrada do
// registro. Dali pra frente o resto do servidor continua vendo caminho
// absoluto, como sempre viu. Ver util/caminhoPortavel.ts.
function absolutizarPasta(w: Workspace): Workspace {
  return { ...w, pasta: doDisco(w.pasta) };
}

// A cor so vale quando e um nome da lista fechada. Qualquer outra coisa que
// apareca no disco (um hex, um nome antigo, um numero) some em vez de virar
// carvao explicito: ausente ja quer dizer carvao, e guardar o padrao no arquivo
// so faria o registro crescer sem dizer nada.
//
// Isto e a mesma postura defensiva do normalizarAdmin, e pelo mesmo motivo: o
// registro pode ter sido editado na mao ou vir de uma copia antiga.
function normalizarCor(w: Workspace): Workspace {
  const { cor, ...resto } = w as Workspace & { cor?: unknown };
  return ehCorDeCapa(cor) && cor !== "carvao" ? { ...resto, cor } : resto;
}

// A paleta padrao so vale quando e uma string nao vazia. Mesma postura do
// normalizarCor: string vazia, numero ou objeto que aparecam no disco somem em
// vez de virar um terceiro estado que ninguem le.
//
// `estiloPadrao` e o nome que a chave tinha ate a renomeacao de 2026-08-06. Ele
// e aceito na LEITURA e convertido aqui, pra registro gravado antes da
// renomeacao nao perder o padrao do projeto. A chave velha nunca e regravada.
function normalizarPaletaPadrao(w: Workspace): Workspace {
  const { paletaPadrao, estiloPadrao, ...resto } = w as Workspace & {
    paletaPadrao?: unknown;
    estiloPadrao?: unknown;
  };
  const bruto = typeof paletaPadrao === "string" ? paletaPadrao : estiloPadrao;
  return typeof bruto === "string" && bruto.trim().length > 0
    ? { ...resto, paletaPadrao: bruto.trim() }
    : resto;
}

// A chave admin so vale quando e exatamente true. Qualquer outra coisa que
// apareca no disco (a string "true", 1, null) NAO promove um workspace a
// administrativo, e a chave some em vez de virar false: ausente e o normal.
function normalizarAdmin(w: Workspace): Workspace {
  const { admin, ...resto } = w as Workspace & { admin?: unknown };
  return admin === true ? { ...resto, admin: true } : resto;
}

// A invariante de um admin so, garantida tambem na LEITURA e nao apenas na
// marcacao: o arquivo pode ter sido editado na mao, ou ter vindo de uma copia
// datada de antes de uma troca. Sobra o primeiro, que e o mais antigo na ordem
// do registro, e o resto vira workspace comum.
function umAdminSo(lista: Workspace[]): Workspace[] {
  let achou = false;
  return lista.map((w) => {
    if (w.admin !== true) return w;
    if (achou) {
      const { admin: _ignorado, ...resto } = w;
      return resto;
    }
    achou = true;
    return w;
  });
}

// Le o registro do disco uma vez. Arquivo ausente vira registro vazio.
// Corrompido lanca: ver lerRegistroDeArquivo.
export function lerRegistro(): RegistroWorkspaces {
  if (cache && raizDoCache === raizDados()) return cache;
  cache = lerRegistroDeArquivo(caminhoRegistroAtual()) ?? { workspaces: [], ativo: null };
  raizDoCache = raizDados();
  return cache;
}

// Guarda uma copia datada quando o registro PERDE workspace.
//
// O registro nunca teve backup, e ele e a unica memoria de quais projetos
// existem. As pastas de trabalho sobrevivem a qualquer coisa, mas sem este
// arquivo o Hub esquece ONDE elas estao, e o dono abre a barra vazia.
//
// Em 2026-08-01 isso aconteceu de verdade: tres projetos sumiram de uma vez e
// so voltaram porque o conteudo antigo do arquivo ainda estava numa conversa.
// O modo de falha ja tinha aparecido em 2026-07-27, do outro lado (clientes
// fantasma, ver o comentario de raizDados), e as pastas de estado orfas
// daquele dia continuam em app/dados/workspaces/.
//
// Perder um workspace de cada vez e gesto normal: o dono clica em remover.
// Cair de tres para zero nao e. A copia so nasce quando a conta diminui, entao
// ativar workspace e renomear, que gravam a mesma quantidade, nao sujam nada.
export function guardarCopiaSeEncolheu(
  caminho: string,
  novo: RegistroWorkspaces,
  agora = new Date(),
): string | null {
  let anterior: RegistroWorkspaces | null = null;
  try {
    anterior = lerRegistroDeArquivo(caminho);
  } catch {
    // Registro ilegivel ja tem quarentena propria na leitura. Gravar por cima de
    // lixo e o certo, e travar a gravacao aqui deixaria o Hub sem escrever nunca.
    return null;
  }
  if (!anterior || novo.workspaces.length >= anterior.workspaces.length) return null;

  const carimbo = agora.toISOString().replace(/[:.]/g, "-");
  const destino = `${caminho}.perdeu-${carimbo}`;
  try {
    copyFileSync(caminho, destino);
    console.warn(
      `[workspaces] o registro caiu de ${anterior.workspaces.length} para ${novo.workspaces.length}. Copia guardada em ${destino}`,
    );
    return destino;
  } catch (erro) {
    console.error("[workspaces] nao deu pra guardar a copia do registro:", erro);
    return null;
  }
}

// Grava o registro em memoria e no disco.
//
// Na memoria a pasta e absoluta; no disco ela vai relativa quando esta dentro
// do Hub, pra a pasta inteira poder mudar de lugar sem quebrar o registro.
export function salvarRegistro(reg: RegistroWorkspaces): void {
  cache = reg;
  garantirPastaDados();
  guardarCopiaSeEncolheu(caminhoRegistroAtual(), reg);
  gravarJsonAtomico(caminhoRegistroAtual(), {
    workspaces: reg.workspaces.map((w) => ({ ...w, pasta: paraDisco(w.pasta) })),
    ativo: reg.ativo,
  });
  raizDoCache = raizDados();
}

// Id do workspace ativo, ou null. So devolve id que aponta pra um workspace real.
export function idWorkspaceAtivo(): string | null {
  const reg = lerRegistro();
  if (reg.ativo && reg.workspaces.some((w) => w.id === reg.ativo)) {
    return reg.ativo;
  }
  return null;
}

// Raiz dos dados do hub: app/dados/. E o escopo CORE, do dono do Hub, onde mora
// o que nao pertence a cliente nenhum (o CRM, por exemplo).
export function pastaDadosHub(): string {
  return raizDados();
}

// Pasta que guarda os dados de todos os clientes: app/dados/workspaces/.
export function pastaWorkspacesHub(): string {
  return join(raizDados(), "workspaces");
}

// Pasta de dados escopada de um workspace: app/dados/workspaces/<id>/.
export function pastaDadosWorkspace(id: string): string {
  return join(raizDados(), "workspaces", id);
}

// Garante a pasta de dados de um workspace e devolve o caminho.
export function garantirPastaDadosWorkspace(id: string): string {
  const p = pastaDadosWorkspace(id);
  if (!existsSync(p)) {
    mkdirSync(p, { recursive: true });
  }
  return p;
}

// Pasta das transcricoes de um workspace.
export function pastaTranscricoesWorkspace(id: string): string {
  return join(pastaDadosWorkspace(id), "transcricoes");
}

// Todos os ids do registro. Usado no boot das sessoes e no total geral de custos.
export function listarIdsWorkspaces(): string[] {
  return lerRegistro().workspaces.map((w) => w.id);
}

export function workspacePorId(id: string): Workspace | null {
  return lerRegistro().workspaces.find((w) => w.id === id) ?? null;
}

// Normaliza uma pasta pra forma canonica de exibicao: absoluta, barras normais,
// sem barra no fim.
export function normalizarPasta(p: string): string {
  return resolve(p).replace(/\\/g, "/").replace(/\/+$/, "");
}

// Chave de comparacao de pastas: a forma canonica, minuscula no Windows (o
// filesystem la nao diferencia maiuscula).
export function chavePasta(p: string): string {
  const canonica = normalizarPasta(p);
  return process.platform === "win32" ? canonica.toLowerCase() : canonica;
}

// Acha um workspace ja registrado pra uma pasta, comparando de forma robusta.
export function workspacePorPasta(p: string): Workspace | null {
  const chave = chavePasta(p);
  return lerRegistro().workspaces.find((w) => chavePasta(w.pasta) === chave) ?? null;
}

// Ultimo segmento de um caminho, pra virar nome padrao do workspace.
export function ultimoSegmento(pasta: string): string {
  const partes = normalizarPasta(pasta).split("/").filter(Boolean);
  return partes[partes.length - 1] ?? "workspace";
}

// Gera um id de workspace curto e unico: w-<base36>.
export function gerarIdWorkspace(): string {
  const reg = lerRegistro();
  let id = "";
  do {
    id = `w-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  } while (reg.workspaces.some((w) => w.id === id));
  return id;
}

// Adiciona um workspace novo ao registro (sem ativar) e devolve ele.
export function adicionarWorkspace(pasta: string, nome?: string): Workspace {
  const reg = lerRegistro();
  const agora = new Date().toISOString();
  const ws: Workspace = {
    id: gerarIdWorkspace(),
    nome: (nome && nome.trim()) || ultimoSegmento(pasta),
    pasta: normalizarPasta(pasta),
    criadoEm: agora,
    ultimoUso: agora,
  };
  reg.workspaces.push(ws);
  salvarRegistro(reg);
  return ws;
}

// Marca um workspace como ativo e carimba o ultimoUso.
export function marcarAtivo(id: string): void {
  const reg = lerRegistro();
  const ws = reg.workspaces.find((w) => w.id === id);
  if (!ws) return;
  ws.ultimoUso = new Date().toISOString();
  reg.ativo = id;
  salvarRegistro(reg);
}

// Renomeia um workspace. Devolve o workspace atualizado, ou null se nao existe.
export function renomearWorkspace(id: string, nome: string): Workspace | null {
  const reg = lerRegistro();
  const ws = reg.workspaces.find((w) => w.id === id);
  if (!ws) return null;
  ws.nome = nome;
  salvarRegistro(reg);
  return ws;
}

// Troca a cor da capa de um workspace. Passar "carvao" (ou null) volta pro
// padrao da casa e APAGA a chave, em vez de gravar o padrao: ausente ja quer
// dizer carvao. Devolve o workspace atualizado, ou null se o id nao existe.
export function definirCorWorkspace(id: string, cor: CorDeCapa | null): Workspace | null {
  const reg = lerRegistro();
  const ws = reg.workspaces.find((w) => w.id === id);
  if (!ws) return null;
  if (!cor || cor === "carvao") {
    delete ws.cor;
  } else {
    ws.cor = cor;
  }
  salvarRegistro(reg);
  return ws;
}

// Troca a paleta padrao das pecas de um projeto. null APAGA a chave, e nao
// grava vazio: ausente ja quer dizer "sem padrao", e uma string vazia no disco
// seria um terceiro estado que ninguem le.
//
// Ela NAO confere se a paleta existe, e isso e decisao. Paleta apagada depois
// de virar padrao deixaria o registro travado num id morto se a gravacao
// recusasse; do jeito que esta, quem le trata id que nao existe como sem
// padrao, que e o que a rota do wizard faz.
export function definirPaletaPadrao(id: string, paleta: string | null): Workspace | null {
  const reg = lerRegistro();
  const ws = reg.workspaces.find((w) => w.id === id);
  if (!ws) return null;
  if (!paleta) {
    delete ws.paletaPadrao;
  } else {
    ws.paletaPadrao = paleta;
  }
  salvarRegistro(reg);
  return ws;
}

// O workspace administrativo, ou null se ainda nao ha um.
export function workspaceAdmin(): Workspace | null {
  return lerRegistro().workspaces.find((w) => w.admin === true) ?? null;
}

export function ehWorkspaceAdmin(id: string | null): boolean {
  if (!id) return false;
  return workspaceAdmin()?.id === id;
}

// Marca um workspace como administrativo e DESMARCA qualquer outro.
//
// Passar null desmarca todos, que e o que a tela usa pra tirar o papel sem
// precisar dar ele pra outro. Devolve o que ficou marcado, ou null.
export function marcarWorkspaceAdmin(id: string | null): Workspace | null {
  const reg = lerRegistro();
  if (id && !reg.workspaces.some((w) => w.id === id)) return null;

  let marcado: Workspace | null = null;
  for (const w of reg.workspaces) {
    if (w.id === id) {
      w.admin = true;
      marcado = w;
    } else {
      // Apaga a chave em vez de gravar false: ausente e o normal, e um registro
      // cheio de "admin": false so faz o arquivo crescer sem dizer nada.
      delete w.admin;
    }
  }
  salvarRegistro(reg);
  return marcado;
}

// Apaga a pasta de dados do hub de um workspace (app/dados/workspaces/<id>/):
// conexoes.json com segredos, transcricoes, e o crm.json.migrado-para-core-*
// que a fusao deixou pra tras (o CRM vivo mora em app/dados/crm/ e nao e tocado
// aqui). A pasta VKOS do cliente (workspace.pasta) NUNCA e tocada aqui: e o
// conteudo dele. Tolerante: pasta ausente nao e erro.
export function apagarPastaDadosWorkspace(id: string): void {
  const pasta = pastaDadosWorkspace(id);
  if (existsSync(pasta)) {
    rmSync(pasta, { recursive: true, force: true });
  }
}

// Remove um workspace SO do registro. Nunca apaga a pasta VKOS nem a pasta de
// dados em disco. Devolve true se removeu, false se o id nao existia.
export function removerWorkspaceRegistro(id: string): boolean {
  const reg = lerRegistro();
  const antes = reg.workspaces.length;
  reg.workspaces = reg.workspaces.filter((w) => w.id !== id);
  if (reg.workspaces.length === antes) return false;
  if (reg.ativo === id) reg.ativo = null;
  salvarRegistro(reg);
  return true;
}
