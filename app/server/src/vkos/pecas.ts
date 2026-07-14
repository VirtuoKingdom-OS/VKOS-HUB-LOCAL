// Escaneia as pecas geradas pelo VKOS em conteudo/*/ e monta a lista pro cockpit.
// Tambem observa a pasta conteudo e avisa o frontend quando algo muda.

import { existsSync, readdirSync, watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { join } from "node:path";
import type { Peca, TipoPeca } from "../tipos.js";
import { obterPastaVkos } from "./estado.js";
import { transmitir } from "../ws.js";

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

  const { tipo, internosPreview } = classificarPeca(internos);

  // previews: urls /pecas/<caminho relativo a conteudo>, prontas pro frontend.
  const previews = internosPreview.map((interno) => urlPeca(`${nomePasta}/${interno}`));

  return { pasta: nomePasta, data, tema, tipo, arquivos, previews };
}

// Dada a lista de caminhos internos (relativos a subpasta), decide o tipo da peca
// e a lista de arquivos de preview em ordem natural. Fonte unica dessa regra.
export function classificarPeca(internos: string[]): {
  tipo: TipoPeca;
  internosPreview: string[];
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

// Extrai data e tema do padrao AAAA-MM-DD-tema. Tolera pastas fora do padrao:
// nesse caso data fica vazia e o tema vira o nome da pasta inteiro.
function extrairDataTema(nomePasta: string): { data: string; tema: string } {
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

// Reinstala o observador na pasta conteudo do VKOS atual. Chamar no boot e
// sempre que a pasta VKOS mudar. Debounce de 1s pra nao inundar de eventos.
export function reinstalarObservador(): void {
  pararObservador();

  const pastaVkos = obterPastaVkos();
  if (!pastaVkos) return;

  const pastaConteudo = join(pastaVkos, "conteudo");
  if (!existsSync(pastaConteudo)) return;

  try {
    observador = watch(pastaConteudo, { recursive: true }, () => {
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        temporizador = null;
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
