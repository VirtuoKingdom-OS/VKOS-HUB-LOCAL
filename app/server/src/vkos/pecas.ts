// Escaneia as pecas geradas pelo VKOS em conteudo/*/ e monta a lista pro cockpit.
// Tambem observa a pasta conteudo e avisa o frontend quando algo muda.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { join } from "node:path";
import type { Peca, TipoPeca } from "../tipos.js";
import { obterPastaVkos } from "./estado.js";
import { transmitir } from "../ws.js";
import { emitir } from "../eventos/barramento.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import { auditarSiteEstatico } from "./siteEstatico.js";

// Le todas as pecas da pasta do VKOS, mais recente primeiro.
export function lerPecas(pastaVkos: string): Peca[] {
  const pastaConteudo = join(pastaVkos, "conteudo");
  if (!existsSync(pastaConteudo)) return [];

  let entradas;
  try {
    entradas = readdirSync(pastaConteudo, { withFileTypes: true });
  } catch {
    return [];
  }

  const pecas: Peca[] = [];
  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;
    pecas.push(montarPeca(pastaConteudo, entrada.name));
  }

  // Mais recente primeiro. Pastas sem data (fora do padrao) vao pro fim.
  pecas.sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    return a.pasta.localeCompare(b.pasta, "pt-BR");
  });
  return pecas;
}

// Monta uma peca a partir de uma subpasta de conteudo.
function montarPeca(pastaConteudo: string, nomePasta: string): Peca {
  const { data, tema } = extrairDataTema(nomePasta);

  // arquivos: caminhos relativos a conteudo (comecam com o nome da subpasta).
  const arquivos: string[] = [];
  listarArquivos(join(pastaConteudo, nomePasta), nomePasta, arquivos);

  // internos: caminhos relativos a propria subpasta, pra classificar o tipo.
  const internos = arquivos.map((a) => a.slice(nomePasta.length + 1));

  const { tipo, internosPreview, fonteHtml, paginas } = classificarPeca(
    internos,
    join(pastaConteudo, nomePasta),
  );

  let previews: string[];
  let auditoriaSite: ReturnType<typeof auditarSiteEstatico> | undefined;
  if (fonteHtml && paginas) {
    // Peca HTML-first: previews sao as URLs das paginas isoladas, em ordem.
    // O nome da pasta vai URL-encoded num unico segmento.
    const pastaEnc = encodeURIComponent(nomePasta);
    previews = [];
    for (let n = 1; n <= paginas; n++) {
      previews.push(`/pecas-html/${pastaEnc}/pagina/${n}`);
    }
  } else if (tipo === "site") {
    auditoriaSite = auditarSiteEstatico(join(pastaConteudo, nomePasta));
    previews = auditoriaSite.paginas.map((interno) =>
      urlPeca(`${nomePasta}/${interno}`),
    );
  } else {
    // previews: urls /pecas/<caminho relativo a conteudo>, prontas pro frontend.
    previews = internosPreview.map((interno) => urlPeca(`${nomePasta}/${interno}`));
  }

  const peca: Peca = { pasta: nomePasta, data, tema, tipo, arquivos, previews };
  if (fonteHtml) {
    peca.fonteHtml = true;
    peca.paginas = paginas;
  }
  if (auditoriaSite) {
    peca.site = {
      valido: auditoriaSite.valido,
      erros: auditoriaSite.erros,
      avisos: auditoriaSite.avisos,
    };
  }
  const criadoEm = lerCriadoEm(join(pastaConteudo, nomePasta));
  if (criadoEm) {
    peca.criadoEm = criadoEm;
  }
  return peca;
}

// Data de criacao da subpasta, em ISO. Usa birthtime; alguns sistemas de
// arquivos (ext4 sem tune, certos ambientes) nao guardam birthtime confiavel
// e devolvem epoch (1970) ou igual ao mtime: nesses casos cai pro mtime, que
// sempre existe. Falha silenciosa vira undefined (peca sem criadoEm).
function lerCriadoEm(pastaAbsoluta: string): string | undefined {
  try {
    const info = statSync(pastaAbsoluta);
    const birthtimeValida = info.birthtimeMs > 0 && info.birthtimeMs !== info.mtimeMs ? info.birthtimeMs : 0;
    const ms = birthtimeValida || info.mtimeMs;
    if (!ms) return undefined;
    return new Date(ms).toISOString();
  } catch {
    return undefined;
  }
}

// Dada a lista de caminhos internos (relativos a subpasta), decide o tipo da peca
// e a lista de arquivos de preview em ordem natural. Fonte unica dessa regra.
export function classificarPeca(
  internos: string[],
  pastaAbsolutaPeca?: string,
): {
  tipo: TipoPeca;
  internosPreview: string[];
  fonteHtml?: boolean;
  paginas?: number;
} {
  const pngsInstagram = internos
    .filter((c) => ehImagem(c) && comecaCom(c, "instagram/"))
    .sort(compararNatural);
  // O render real do VKOS salva stories em instagram-stories/. Aceita tambem
  // stories/ por tolerancia a variacao.
  const pngsStories = internos
    .filter(
      (c) => ehImagem(c) && (comecaCom(c, "instagram-stories/") || comecaCom(c, "stories/")),
    )
    .sort(compararNatural);
  // O render salva post unico em post/ ou instagram-post/. Nenhum desses prefixos
  // colide com instagram/ ou instagram-stories/, entao os tipos atuais nao mudam.
  const pngsPost = internos
    .filter((c) => ehImagem(c) && (comecaCom(c, "post/") || comecaCom(c, "instagram-post/")))
    .sort(compararNatural);
  const htmls = internos.filter((c) => terminaCom(c, ".html")).sort(compararNatural);
  const mds = internos.filter((c) => terminaCom(c, ".md"));

  if (pngsInstagram.length > 0) {
    return { tipo: "carrossel", internosPreview: pngsInstagram };
  }
  if (pngsStories.length > 0) {
    return { tipo: "stories", internosPreview: pngsStories };
  }
  if (pngsPost.length > 0) {
    return { tipo: "post", internosPreview: pngsPost };
  }
  // NOVO: sem PNG legado, um carrossel.html na raiz da subpasta vira peca
  // HTML-first. O PNG so existe quando o usuario baixa (render sob demanda).
  const temCarrosselRaiz = internos.some((c) => c.toLowerCase() === "carrossel.html");
  if (temCarrosselRaiz && pastaAbsolutaPeca) {
    const paginas = contarPaginasCarrossel(join(pastaAbsolutaPeca, "carrossel.html"));
    if (paginas > 0) {
      return { tipo: "carrossel", internosPreview: [], fonteHtml: true, paginas };
    }
  }
  if (htmls.length > 0) {
    return { tipo: "site", internosPreview: htmls };
  }
  if (mds.length > 0) {
    return { tipo: "texto", internosPreview: [] };
  }
  return { tipo: "outro", internosPreview: [] };
}

// Reune as imagens de preview de uma subpasta de conteudo, em ordem natural.
// Devolve o tema da peca e os caminhos internos das imagens (relativos a subpasta).
// So conta imagem: site (html) e texto (md) voltam com a lista vazia.
export function listarImagensPreview(
  pastaVkos: string,
  nomePasta: string,
): { tema: string; internos: string[] } {
  const pastaConteudo = join(pastaVkos, "conteudo");
  const arquivos: string[] = [];
  listarArquivos(join(pastaConteudo, nomePasta), nomePasta, arquivos);
  const internos = arquivos.map((a) => a.slice(nomePasta.length + 1));

  const { internosPreview } = classificarPeca(internos);
  const { tema } = extrairDataTema(nomePasta);

  return { tema, internos: internosPreview.filter(ehImagem) };
}

// Le o carrossel.html e conta as paginas (.slide). Zero se o arquivo sumiu.
function contarPaginasCarrossel(caminhoHtml: string): number {
  let html: string;
  try {
    html = readFileSync(caminhoHtml, "utf8");
  } catch {
    return 0;
  }
  return contarSlides(html);
}

// Conta os elementos com a classe inteira "slide". Percorre cada atributo class
// (aspas simples ou duplas), quebra por espaco e so conta quando "slide" aparece
// como classe separada. Assim "slide-capa" ou "slide-numero" sozinhos nao contam,
// mas "slide" e "slide slide-capa" contam. Fonte unica dessa contagem.
export function contarSlides(html: string): number {
  let total = 0;
  const re = /class\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const valor = m[2] ?? m[3] ?? "";
    if (valor.split(/\s+/).includes("slide")) total++;
  }
  return total;
}

// Extrai data e tema do padrao AAAA-MM-DD-tema. Tolera pastas fora do padrao:
// nesse caso data fica vazia e o tema vira o nome da pasta inteiro.
export function extrairDataTema(nomePasta: string): { data: string; tema: string } {
  const m = nomePasta.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (m) {
    return { data: m[1], tema: m[2] };
  }
  return { data: "", tema: nomePasta };
}

// Lista arquivos recursivamente. Acumula caminhos relativos ao prefixo dado,
// sempre com barra normal, mesmo no Windows.
function listarArquivos(pastaAbsoluta: string, prefixo: string, acc: string[]): void {
  let entradas;
  try {
    entradas = readdirSync(pastaAbsoluta, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entradas) {
    const rel = `${prefixo}/${e.name}`;
    if (e.isDirectory()) {
      listarArquivos(join(pastaAbsoluta, e.name), rel, acc);
    } else if (e.isFile()) {
      acc.push(rel);
    }
  }
}

// Monta a url /pecas/... codificando cada segmento, sem tocar nas barras.
function urlPeca(caminhoRelativo: string): string {
  const segmentos = caminhoRelativo.split("/").map((s) => encodeURIComponent(s));
  return "/pecas/" + segmentos.join("/");
}

function ehImagem(caminho: string): boolean {
  return terminaCom(caminho, ".png");
}

function comecaCom(caminho: string, prefixo: string): boolean {
  return caminho.toLowerCase().startsWith(prefixo.toLowerCase());
}

function terminaCom(caminho: string, sufixo: string): boolean {
  return caminho.toLowerCase().endsWith(sufixo.toLowerCase());
}

// Ordena nomes com numero de forma natural: slide-2 antes de slide-10.
function compararNatural(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

// ----- Observador de conteudo -----

let observador: FSWatcher | null = null;
let temporizador: ReturnType<typeof setTimeout> | null = null;
// Conjunto de subpastas de conteudo ja conhecidas, pra detectar pasta NOVA e so
// entao emitir peca:criada. Semeado no boot do observador com o estado atual,
// pra nao disparar evento pras pecas que ja existiam.
let pastasConhecidas = new Set<string>();

// Lista os nomes das subpastas diretas de conteudo. Erro de leitura devolve o
// conjunto vazio, sem quebrar o observador.
function listarPastasConteudo(pastaConteudo: string): Set<string> {
  try {
    return new Set(
      readdirSync(pastaConteudo, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name),
    );
  } catch {
    return new Set();
  }
}

// Detecta pastas novas comparando o conjunto atual com o conhecido e emite
// peca:criada pra cada nova. Roda junto do debounce do watch, defensivo: nunca
// deixa um erro aqui derrubar o observador nem o broadcast do frontend.
function detectarPecasNovas(pastaConteudo: string): void {
  try {
    const atuais = listarPastasConteudo(pastaConteudo);
    const workspaceId = idWorkspaceAtivo();
    for (const nome of atuais) {
      if (pastasConhecidas.has(nome)) continue;
      if (workspaceId) {
        emitir({
          tipo: "peca:criada",
          workspaceId,
          em: new Date().toISOString(),
          dados: { pasta: nome },
        });
      }
    }
    pastasConhecidas = atuais;
  } catch {
    // Nunca propaga: a instrumentacao e best-effort.
  }
}

// Reinstala o observador na pasta conteudo do VKOS atual. Chamar no boot e
// sempre que a pasta VKOS mudar. Debounce de 1s pra nao inundar de eventos.
export function reinstalarObservador(): void {
  pararObservador();

  const pastaVkos = obterPastaVkos();
  if (!pastaVkos) return;

  const pastaConteudo = join(pastaVkos, "conteudo");
  // Cliente novo ainda nao tem conteudo/. Sem criar a pasta aqui, o watch nao
  // nascia e a primeira peca gerada so aparecia depois de trocar de cliente.
  if (!existsSync(pastaConteudo)) {
    try {
      mkdirSync(pastaConteudo, { recursive: true });
    } catch {
      return;
    }
  }

  // Semeia o conjunto conhecido com o estado atual: as pecas que ja existem nao
  // sao novidade, so as que aparecerem depois disparam peca:criada.
  pastasConhecidas = listarPastasConteudo(pastaConteudo);

  try {
    observador = watch(pastaConteudo, { recursive: true }, () => {
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        temporizador = null;
        detectarPecasNovas(pastaConteudo);
        transmitir({ tipo: "pecas:atualizadas" });
      }, 1000);
    });
    // Erro no observador nao pode derrubar o servidor.
    observador.on("error", () => {});
  } catch {
    // fs.watch recursivo pode falhar em alguns ambientes. No Windows funciona.
    observador = null;
  }
}

// Para o observador atual e limpa o debounce pendente.
export function pararObservador(): void {
  if (observador) {
    try {
      observador.close();
    } catch {
      // ignora
    }
    observador = null;
  }
  if (temporizador) {
    clearTimeout(temporizador);
    temporizador = null;
  }
}
