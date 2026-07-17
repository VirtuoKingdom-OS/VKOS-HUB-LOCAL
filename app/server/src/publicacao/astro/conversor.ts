// Conversor deterministico de peca HTML multipagina para projeto Astro.
// A peca HTML e a fonte da verdade. Este modulo le a arvore ja auditada,
// extrai o layout compartilhado (head, nav, footer) e escreve um projeto
// Astro completo dentro de .astro-build/, sem nunca tocar nos arquivos da peca.
// Qualquer inconsistencia vira ConversaoInviavel e o chamador cai pro modo HTML.

import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { NodeType, parse, type HTMLElement, type TextNode } from "node-html-parser";

import {
  auditarSiteEstatico,
  listarArquivosSite,
} from "../../vkos/siteEstatico.js";

// A versao do Astro pinada nesta rodada. O motor compartilhado usa a MESMA
// versao (publicacao/astro/motor.ts). Trocar aqui exige trocar la tambem.
export const VERSAO_ASTRO = "5.18.2";

// Nome da pasta interna onde o projeto Astro e escrito. Ja consta em
// PASTAS_INTERNAS de siteEstatico.ts, entao auditoria e coleta a ignoram.
export const PASTA_BUILD = ".astro-build";

// Falha de negocio da conversao. O chamador transforma em fallback HTML puro
// com aviso. A mensagem e legivel pro dono do negocio, nao tecnica.
export class ConversaoInviavel extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ConversaoInviavel";
  }
}

export interface ProjetoAstro {
  // Pasta absoluta do projeto Astro (a .astro-build/ dentro da peca).
  pastaProjeto: string;
  // Caminhos .html que o build deve emitir em dist/, iguais as paginas da peca.
  paginas: string[];
  // URL publica usada no sitemap, quando conhecida.
  urlPublica?: string;
  // true quando o sitemap.xml foi gerado (so com URL publica conhecida).
  temSitemap: boolean;
  // Avisos nao fatais (ex: sitemap pulado por falta de URL).
  avisos: string[];
}

interface OpcoesConversao {
  // URL publica do site ja publicado ou informada. Sem ela, sem sitemap.
  urlPublica?: string;
}

function normalizarEspacos(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

// Detecta href/src externo, ancora, dado embutido: nao mexer.
function externaOuEspecial(url: string): boolean {
  return (
    !url ||
    url.startsWith("#") ||
    url.startsWith("/") ||
    url.startsWith("//") ||
    /^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(url)
  );
}

// O head compartilhado sai do index.html (raiz), entao os caminhos relativos
// dele ja sao relativos a raiz. No layout Astro o mesmo head serve paginas de
// qualquer profundidade, por isso o caminho vira publico (raiz-absoluto).
function paraCaminhoPublico(url: string): string {
  if (externaOuEspecial(url)) return url;
  const limpo = url.replace(/^\.\//, "");
  return `/${limpo}`;
}

// Reescreve href de <link> e src de <script> locais no head compartilhado para
// caminho publico. E o unico ponto de reescrita de link, e so no layout.
function reescreverAssetsDoHead(el: HTMLElement): void {
  const tag = el.tagName?.toUpperCase();
  if (tag === "LINK") {
    const href = el.getAttribute("href");
    if (href) el.setAttribute("href", paraCaminhoPublico(href));
  } else if (tag === "SCRIPT") {
    const src = el.getAttribute("src");
    if (src) el.setAttribute("src", paraCaminhoPublico(src));
  }
}

// O Astro tenta bundlar todo <script> por padrao, e um src local (script.js do
// public/) quebra o build ("failed to resolve import"). A diretiva is:inline faz
// o Astro emitir o script verbatim e resolver do public/ em runtime.
function marcarScriptsInline(html: string): string {
  return html.replace(/<script(?=[\s>])/gi, "<script is:inline");
}

// A nav gerada marca a pagina ativa com aria-current="page". No layout unico nao
// existe pagina ativa, e a comparacao de identidade entre paginas nao pode
// tropecar nesse atributo. Remove aria-current de qualquer forma de valor.
function removerAriaCurrent(html: string): string {
  return html.replace(/\s*aria-current\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

// Descreve um elemento pra mensagem legivel: tag mais id ou primeira classe.
function descreverElemento(el: HTMLElement): string {
  const tag = (el.rawTagName || "elemento").toLowerCase();
  const id = el.getAttribute("id");
  if (id) return `<${tag} id="${id}">`;
  const classe = el.getAttribute("class")?.trim().split(/\s+/)[0];
  if (classe) return `<${tag} class="${classe}">`;
  return `<${tag}>`;
}

// Garante que nada do corpo se perde na conversao. O projeto Astro remonta a
// pagina como nav + [data-vk-pagina] + footer + scripts diretos, entao todo no
// com conteudo do body precisa estar coberto por um desses. Sobrou conteudo fora
// (section solta, banner, modal fora do main, segundo main), a peca perderia
// esse pedaco no site: ConversaoInviavel e o deploy mantem o HTML fiel.
function validarCoberturaDoCorpo(
  corpo: HTMLElement,
  caminho: string,
  navEl: HTMLElement,
  footerEl: HTMLElement,
  mainEl: HTMLElement,
): void {
  for (const no of corpo.childNodes) {
    if (no.nodeType === NodeType.COMMENT_NODE) continue;
    if (no.nodeType === NodeType.TEXT_NODE) {
      if ((no as TextNode).isWhitespace) continue;
      const trecho = normalizarEspacos(no.text).slice(0, 40);
      throw new ConversaoInviavel(
        `A pagina ${caminho} tem texto solto no corpo, fora dos marcadores: "${trecho}". Ele nao entraria no site multipagina, entao a publicacao mantem o HTML fiel.`,
      );
    }
    const el = no as HTMLElement;
    if (el === navEl || el === footerEl || el === mainEl) continue;
    if (el.tagName?.toUpperCase() === "SCRIPT") continue;
    throw new ConversaoInviavel(
      `A pagina ${caminho} tem conteudo fora dos marcadores: ${descreverElemento(el)}. Ele nao entraria no site multipagina, entao a publicacao mantem o HTML fiel.`,
    );
  }
}

interface PaginaLida {
  caminho: string;
  raiz: HTMLElement;
  nav: string;
  footer: string;
  main: string;
  titulo: string;
  descricao: string;
  scriptsCorpo: string;
}

function lerPagina(pastaPeca: string, caminho: string): PaginaLida {
  let html: string;
  try {
    html = readFileSync(join(pastaPeca, caminho), "utf8");
  } catch {
    throw new ConversaoInviavel(`Nao foi possivel ler a pagina ${caminho}.`);
  }
  const raiz = parse(html, { comment: true });

  const navEl = raiz.querySelector("[data-vk-nav]");
  const footerEl = raiz.querySelector("[data-vk-footer]");
  const mainEl = raiz.querySelector("[data-vk-pagina]");
  if (!navEl) {
    throw new ConversaoInviavel(
      `A pagina ${caminho} nao tem o marcador data-vk-nav da navegacao.`,
    );
  }
  if (!footerEl) {
    throw new ConversaoInviavel(
      `A pagina ${caminho} nao tem o marcador data-vk-footer do rodape.`,
    );
  }
  if (!mainEl) {
    throw new ConversaoInviavel(
      `A pagina ${caminho} nao tem o marcador data-vk-pagina do conteudo.`,
    );
  }

  const titulo = raiz.querySelector("title")?.text.trim() ?? "";
  const descricao =
    raiz.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";

  const corpo = raiz.querySelector("body");
  if (corpo) {
    validarCoberturaDoCorpo(corpo, caminho, navEl, footerEl, mainEl);
  }
  const scriptsCorpo = corpo
    ? corpo.childNodes
        .filter((no) => (no as HTMLElement).tagName?.toUpperCase() === "SCRIPT")
        .map((no) => {
          const el = no as HTMLElement;
          const src = el.getAttribute("src");
          if (src) el.setAttribute("src", paraCaminhoPublico(src));
          return el.toString();
        })
        .join("\n")
    : "";

  return {
    caminho,
    raiz,
    nav: navEl.toString(),
    footer: footerEl.toString(),
    main: mainEl.toString(),
    titulo,
    descricao,
    scriptsCorpo,
  };
}

// Elementos do head que o layout unico compartilha entre todas as paginas. O
// title e a meta description saem de fora porque viram props por pagina. Cada
// elemento restante entra normalizado, pra comparar identidade sem tropecar em
// espaco ou quebra de linha.
function elementosCompartilhaveisDoHead(raiz: HTMLElement, caminho: string): string[] {
  const headEl = raiz.querySelector("head");
  if (!headEl) {
    throw new ConversaoInviavel(`A pagina ${caminho} nao tem <head>.`);
  }
  const linhas: string[] = [];
  for (const no of headEl.childNodes) {
    if (no.nodeType !== NodeType.ELEMENT_NODE) continue;
    const el = no as HTMLElement;
    const tag = el.tagName?.toUpperCase();
    if (tag === "TITLE") continue;
    if (tag === "META" && el.getAttribute("name")?.toLowerCase() === "description") {
      continue;
    }
    linhas.push(normalizarEspacos(el.toString()));
  }
  return linhas;
}

// O Base.astro nasce do head do index. Se outra pagina tiver um link, fonte ou
// meta que o index nao tem (ou faltar um que o index tem), esse head divergente
// se perderia no layout unico. Valida identidade dos heads compartilhaveis (fora
// title e description); divergiu, ConversaoInviavel citando a pagina e o elemento.
function validarHeadsCompartilhados(paginas: PaginaLida[]): void {
  const refLinhas = elementosCompartilhaveisDoHead(paginas[0].raiz, paginas[0].caminho);
  const refSet = new Set(refLinhas);
  for (const pagina of paginas.slice(1)) {
    const linhas = elementosCompartilhaveisDoHead(pagina.raiz, pagina.caminho);
    const set = new Set(linhas);
    const extra = linhas.find((linha) => !refSet.has(linha));
    if (extra) {
      throw new ConversaoInviavel(
        `O <head> da pagina ${pagina.caminho} tem um elemento que o head compartilhado (index) nao traz: ${extra.slice(0, 80)}. O layout Astro usa um head unico, entao esse elemento se perderia.`,
      );
    }
    const faltando = refLinhas.find((linha) => !set.has(linha));
    if (faltando) {
      throw new ConversaoInviavel(
        `O <head> da pagina ${pagina.caminho} nao tem um elemento do head compartilhado (index): ${faltando.slice(0, 80)}. Fora do title e da descricao, o head precisa ser identico em todas as paginas.`,
      );
    }
  }
}

function validarPartesCompartilhadas(paginas: PaginaLida[]): void {
  const referencia = paginas[0];
  const navRef = normalizarEspacos(removerAriaCurrent(referencia.nav));
  const footerRef = normalizarEspacos(referencia.footer);

  for (const pagina of paginas.slice(1)) {
    if (normalizarEspacos(removerAriaCurrent(pagina.nav)) !== navRef) {
      throw new ConversaoInviavel(
        `A navegacao difere entre paginas (${pagina.caminho}). Ela precisa ser identica em todas.`,
      );
    }
    if (normalizarEspacos(pagina.footer) !== footerRef) {
      throw new ConversaoInviavel(
        `O rodape difere entre paginas (${pagina.caminho}). Ele precisa ser identico em todas.`,
      );
    }
  }
  validarHeadsCompartilhados(paginas);
}

// Monta o head do Base.astro a partir do head do index.html: mantem tudo menos
// o title e a meta description (que viram props por pagina), com os assets
// locais apontando pro caminho publico.
function montarHeadCompartilhado(indexRaiz: HTMLElement): string {
  const headEl = indexRaiz.querySelector("head");
  if (!headEl) {
    throw new ConversaoInviavel("O index.html nao tem <head>.");
  }
  const partes: string[] = [];
  for (const no of headEl.childNodes) {
    const el = no as HTMLElement;
    const tag = el.tagName?.toUpperCase();
    if (tag === "TITLE") continue;
    if (tag === "META" && el.getAttribute("name")?.toLowerCase() === "description") {
      continue;
    }
    if (tag === "LINK" || tag === "SCRIPT") {
      reescreverAssetsDoHead(el);
    }
    partes.push(el.toString());
  }
  return partes
    .map((linha) => marcarScriptsInline(linha.trim()))
    .filter((linha) => linha.length > 0)
    .map((linha) => `    ${linha}`)
    .join("\n");
}

function langDoDocumento(indexRaiz: HTMLElement): string {
  const lang = indexRaiz.querySelector("html")?.getAttribute("lang")?.trim();
  return lang || "pt-BR";
}

// index.html vira src/pages/index.astro, sobre.html vira src/pages/sobre.astro,
// servicos/index.html vira src/pages/servicos/index.astro. Com build.format
// preserve, cada uma emite exatamente o mesmo caminho .html de origem, entao os
// links internos existentes seguem validos sem nenhuma reescrita.
function caminhoAstroDaPagina(caminhoHtml: string): string {
  return caminhoHtml.replace(/\.html?$/i, ".astro");
}

function escaparAstroExpr(valor: string): string {
  return valor.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function nomeProjeto(pastaPeca: string): string {
  const base = pastaPeca.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "site";
  const limpo = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `vkos-site-${limpo || "peca"}`.slice(0, 214);
}

function montarBaseAstro(
  headCompartilhado: string,
  nav: string,
  footer: string,
  lang: string,
): string {
  return `---
export interface Props {
  titulo: string;
  descricao?: string;
}
const { titulo, descricao } = Astro.props;
---
<!DOCTYPE html>
<html lang="${lang}">
  <head>
${headCompartilhado}
    <title>{titulo}</title>
    {descricao && <meta name="description" content={descricao} />}
  </head>
  <body>
    ${nav.trim()}
    <slot />
    ${footer.trim()}
  </body>
</html>
`;
}

function montarPaginaAstro(pagina: PaginaLida): string {
  const titulo = escaparAstroExpr(pagina.titulo);
  const descricao = escaparAstroExpr(pagina.descricao);
  const propDescricao = pagina.descricao ? `\ndescricao={\`${descricao}\`}` : "";
  const scripts = pagina.scriptsCorpo.trim()
    ? `\n${marcarScriptsInline(pagina.scriptsCorpo.trim())}`
    : "";
  // O corpo sai por <Fragment set:html={`...`}>: chaves literais { } no texto
  // viram caractere de string, nunca expressao Astro (que quebraria o build).
  // escaparAstroExpr blinda so o que fecha a template string (crase, ${ e barra).
  // O que o preview mostrou e exatamente o que o build emite.
  const corpoHtml = escaparAstroExpr(pagina.main.trim());
  return `---
import Base from ${importarLayout(pagina.caminho)};
---
<Base titulo={\`${titulo}\`}${propDescricao}>
<Fragment set:html={\`${corpoHtml}\`} />${scripts}
</Base>
`;
}

// O import do layout usa caminho relativo. A pagina mora em src/pages/... e o
// layout em src/layouts/, entao sobe uma vez pra sair de pages/ mais a
// profundidade da propria pagina.
function importarLayout(caminhoHtml: string): string {
  const profundidade = caminhoHtml.replace(/\\/g, "/").split("/").length - 1;
  const subida = "../".repeat(profundidade + 1);
  return `"${subida}layouts/Base.astro"`;
}

function montarAstroConfig(urlPublica?: string): string {
  const site = urlPublica ? `\n  site: ${JSON.stringify(urlPublica)},` : "";
  return `import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",${site}
  build: { format: "preserve" },
});
`;
}

function montarPackageJson(nome: string): string {
  const pkg = {
    name: nome,
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "astro dev",
      build: "astro build",
      preview: "astro preview",
    },
    dependencies: {
      astro: VERSAO_ASTRO,
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function montarNetlifyToml(): string {
  return `[build]
  command = "npm install && npm run build"
  publish = "dist"
`;
}

function montarRobots(urlPublica?: string): string {
  const linhas = ["User-agent: *", "Allow: /"];
  if (urlPublica) {
    linhas.push(`Sitemap: ${urlPublica.replace(/\/$/, "")}/sitemap.xml`);
  }
  return `${linhas.join("\n")}\n`;
}

function urlDaPagina(base: string, caminhoHtml: string): string {
  const raiz = base.replace(/\/$/, "");
  if (caminhoHtml.toLowerCase() === "index.html") return `${raiz}/`;
  const rel = caminhoHtml.replace(/\\/g, "/").replace(/\/index\.html?$/i, "/");
  return `${raiz}/${rel}`;
}

function montarSitemap(urlPublica: string, paginas: string[]): string {
  const urls = paginas
    .map((pagina) => `  <url><loc>${urlDaPagina(urlPublica, pagina)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function escreverArquivo(pasta: string, relativo: string, conteudo: string): void {
  const alvo = join(pasta, relativo);
  mkdirSync(dirname(alvo), { recursive: true });
  writeFileSync(alvo, conteudo, "utf8");
}

// Remove a arvore de build Astro com seguranca. O build cria um junction
// node_modules apontando pro motor compartilhado real; um processo morto no meio
// pode deixar esse junction pra tras. Antes de qualquer rm recursivo, desfaz
// primeiro o junction: rmSync sobre a propria ligacao faz lstat, ve o reparse
// point e desfaz so o link, nunca o alvo. Assim o rm da arvore jamais cruza o
// reparse point pra dentro do motor real, mesmo em runtime que siga junction.
export function limparBuildAstro(pastaProjeto: string): void {
  try {
    rmSync(join(pastaProjeto, "node_modules"), { recursive: true, force: true });
  } catch {
    // A ligacao pode nao existir: segue pro rm da arvore.
  }
  rmSync(pastaProjeto, { recursive: true, force: true });
}

export async function converterParaAstro(
  pastaPeca: string,
  opcoes: OpcoesConversao = {},
): Promise<ProjetoAstro> {
  const auditoria = auditarSiteEstatico(pastaPeca);
  if (!auditoria.valido) {
    throw new ConversaoInviavel(
      `O site nao passou na auditoria estrutural. ${auditoria.erros.join(" ")}`,
    );
  }
  if (auditoria.paginas.length <= 1) {
    throw new ConversaoInviavel(
      "A conversao Astro so vale para site multipagina (duas ou mais paginas).",
    );
  }

  const paginas = auditoria.paginas.map((caminho) => lerPagina(pastaPeca, caminho));
  const referencia = paginas[0];
  // aria-current pode mudar por pagina; todo o restante do layout precisa ser
  // realmente compartilhado para existir em um unico Base.astro.
  validarPartesCompartilhadas(paginas);

  const avisos: string[] = [];
  const urlPublica = opcoes.urlPublica?.trim() || undefined;
  if (!urlPublica) {
    avisos.push(
      "Sem URL publica conhecida: sitemap.xml nao gerado nesta conversao.",
    );
  }

  const pastaProjeto = join(pastaPeca, PASTA_BUILD);
  limparBuildAstro(pastaProjeto);
  mkdirSync(pastaProjeto, { recursive: true });

  const headCompartilhado = montarHeadCompartilhado(referencia.raiz);
  const lang = langDoDocumento(referencia.raiz);
  const baseAstro = montarBaseAstro(
    headCompartilhado,
    removerAriaCurrent(referencia.nav),
    referencia.footer,
    lang,
  );
  escreverArquivo(pastaProjeto, join("src", "layouts", "Base.astro"), baseAstro);

  for (const pagina of paginas) {
    const destino = join("src", "pages", caminhoAstroDaPagina(pagina.caminho));
    escreverArquivo(pastaProjeto, destino, montarPaginaAstro(pagina));
  }

  // public/: todos os arquivos nao-HTML da peca, subpastas preservadas. A lista
  // ja exclui os internos do Hub (inclusive .astro-build).
  const assets = listarArquivosSite(pastaPeca).filter(
    (caminho) => !/\.html?$/i.test(caminho),
  );
  const pastaPublic = join(pastaProjeto, "public");
  mkdirSync(pastaPublic, { recursive: true });
  for (const asset of assets) {
    const origem = join(pastaPeca, asset);
    const destino = join(pastaPublic, asset);
    mkdirSync(dirname(destino), { recursive: true });
    cpSync(origem, destino);
  }

  writeFileSync(join(pastaPublic, "robots.txt"), montarRobots(urlPublica), "utf8");

  let temSitemap = false;
  if (urlPublica) {
    writeFileSync(
      join(pastaPublic, "sitemap.xml"),
      montarSitemap(urlPublica, auditoria.paginas),
      "utf8",
    );
    temSitemap = true;
  }

  writeFileSync(
    join(pastaProjeto, "astro.config.mjs"),
    montarAstroConfig(urlPublica),
    "utf8",
  );
  writeFileSync(
    join(pastaProjeto, "package.json"),
    montarPackageJson(nomeProjeto(pastaPeca)),
    "utf8",
  );
  writeFileSync(join(pastaProjeto, "netlify.toml"), montarNetlifyToml(), "utf8");

  return {
    pastaProjeto,
    paginas: [...auditoria.paginas],
    urlPublica,
    temSitemap,
    avisos,
  };
}

// Previsao sem escrita: alem dos marcadores, confere o mesmo contrato de nav e
// rodape usado pela conversao. Scripts de pagina ficam na pagina Astro. Assim a UI nao promete Astro quando o
// deploy ja sabe que cairia imediatamente no fallback HTML.
export function inspecionarMarcadores(pastaPeca: string): boolean {
  const auditoria = auditarSiteEstatico(pastaPeca);
  if (!auditoria.valido || auditoria.paginas.length <= 1) return false;
  try {
    const paginas = auditoria.paginas.map((caminho) => lerPagina(pastaPeca, caminho));
    validarPartesCompartilhadas(paginas);
    return true;
  } catch {
    return false;
  }
}
