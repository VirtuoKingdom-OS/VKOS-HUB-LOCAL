import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  posix,
  relative,
  resolve,
} from "node:path";

export interface AuditoriaSiteEstatico {
  valido: boolean;
  paginas: string[];
  erros: string[];
  avisos: string[];
}

const PASTAS_INTERNAS = new Set(["anexos", "node_modules", ".git", ".astro-build"]);
const ARQUIVOS_INTERNOS = [
  /\.md$/i,
  /\.bak$/i,
  /\.tmp$/i,
  /^\.pagina-/i,
  /^\.ds_store$/i,
  /^thumbs\.db$/i,
];

function listarArquivosProibidos(
  pasta: string,
  prefixo = "",
  saida: string[] = [],
): string[] {
  let entradas;
  try {
    entradas = readdirSync(pasta, { withFileTypes: true });
  } catch {
    return saida;
  }
  for (const entrada of entradas) {
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    const absoluto = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      if (!PASTAS_INTERNAS.has(entrada.name.toLowerCase())) {
        listarArquivosProibidos(absoluto, relativo, saida);
      }
    } else if (
      entrada.isFile() &&
      (/\.md$/i.test(entrada.name) || relativo.toLowerCase() === "carrossel.html")
    ) {
      saida.push(relativo);
    }
  }
  return saida;
}

function compararNatural(a: string, b: string): number {
  if (a.toLowerCase() === "index.html") return -1;
  if (b.toLowerCase() === "index.html") return 1;
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

export function arquivoInternoDoHub(caminho: string): boolean {
  const normalizado = caminho.replace(/\\/g, "/");
  const segmentos = normalizado.split("/");
  if (segmentos.some((segmento) => PASTAS_INTERNAS.has(segmento.toLowerCase()))) {
    return true;
  }
  const nome = segmentos[segmentos.length - 1] ?? "";
  return ARQUIVOS_INTERNOS.some((padrao) => padrao.test(nome));
}

export function listarArquivosSite(pastaRaiz: string): string[] {
  const saida: string[] = [];
  visitar(pastaRaiz, "", saida);
  return saida.sort(compararNatural);
}

function visitar(pasta: string, prefixo: string, saida: string[]): void {
  let entradas;
  try {
    entradas = readdirSync(pasta, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entrada of entradas) {
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    if (arquivoInternoDoHub(relativo)) continue;
    const absoluto = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      visitar(absoluto, relativo, saida);
    } else if (entrada.isFile()) {
      saida.push(relativo);
    }
  }
}

function referenciasHtml(texto: string): string[] {
  const refs: string[] = [];
  const atributos = /\b(?:src|href|poster|action)\s*=\s*(["'])(.*?)\1/gi;
  let achado: RegExpExecArray | null;
  while ((achado = atributos.exec(texto)) !== null) refs.push(achado[2]);

  const srcsets = /\bsrcset\s*=\s*(["'])(.*?)\1/gi;
  while ((achado = srcsets.exec(texto)) !== null) {
    for (const item of achado[2].split(",")) {
      const url = item.trim().split(/\s+/)[0];
      if (url) refs.push(url);
    }
  }
  refs.push(...referenciasCss(texto));
  return refs;
}

function referenciasCss(texto: string): string[] {
  const refs: string[] = [];
  const urls = /url\(\s*(?:(["'])(.*?)\1|([^)"']+))\s*\)/gi;
  let achado: RegExpExecArray | null;
  while ((achado = urls.exec(texto)) !== null) {
    refs.push((achado[2] ?? achado[3] ?? "").trim());
  }
  const imports = /@import\s+(?!url\()(["'])(.*?)\1/gi;
  while ((achado = imports.exec(texto)) !== null) refs.push(achado[2]);
  return refs;
}

function referenciasJs(texto: string): string[] {
  const refs: string[] = [];
  const imports =
    /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?(["'])(\.{1,2}\/[^"']+)\1|\bimport\s*\(\s*(["'])(\.{1,2}\/[^"']+)\3\s*\)/g;
  let achado: RegExpExecArray | null;
  while ((achado = imports.exec(texto)) !== null) {
    refs.push(achado[2] ?? achado[4]);
  }
  return refs;
}

function externaOuEspecial(url: string): boolean {
  return (
    !url ||
    url.startsWith("#") ||
    url.startsWith("//") ||
    /^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(url)
  );
}

function limparUrl(url: string): string {
  const semHash = url.split("#", 1)[0];
  return semHash.split("?", 1)[0].trim();
}

function destinoRelativo(origem: string, url: string): string | null {
  const limpo = limparUrl(url);
  if (!limpo) return null;
  let decodificado: string;
  try {
    decodificado = decodeURIComponent(limpo);
  } catch {
    return null;
  }
  const normalizado = decodificado.replace(/\\/g, "/");
  const base = posix.dirname(origem.replace(/\\/g, "/"));
  let destino = posix.normalize(posix.join(base, normalizado));
  if (normalizado.endsWith("/")) destino = posix.join(destino, "index.html");
  return destino.replace(/^\.\//, "");
}

function caminhoExisteComoArquivo(raiz: string, relativo: string): boolean {
  const alvo = resolve(raiz, relativo);
  const rel = relative(resolve(raiz), alvo);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return false;
  try {
    if (statSync(alvo).isFile()) return true;
    if (statSync(alvo).isDirectory()) {
      return statSync(join(alvo, "index.html")).isFile();
    }
  } catch {
    return false;
  }
  return false;
}

function adicionarUnico(lista: string[], mensagem: string): void {
  if (!lista.includes(mensagem)) lista.push(mensagem);
}

export function auditarSiteEstatico(pastaRaiz: string): AuditoriaSiteEstatico {
  const proibidos = listarArquivosProibidos(pastaRaiz);
  const arquivos = listarArquivosSite(pastaRaiz);
  const paginas = arquivos
    .filter((arquivo) => /\.html?$/i.test(arquivo))
    .sort(compararNatural);
  const erros: string[] = [];
  const avisos: string[] = [];

  for (const proibido of proibidos) {
    if (/\.md$/i.test(proibido)) {
      adicionarUnico(
        erros,
        `${proibido} é Markdown e não pode existir nem entrar no deploy de um site.`,
      );
    } else {
      adicionarUnico(
        erros,
        "carrossel.html não pode existir dentro de uma peça classificada como site.",
      );
    }
  }

  if (!paginas.some((pagina) => pagina.toLowerCase() === "index.html")) {
    erros.push("Falta o arquivo index.html na raiz do site.");
  }

  for (const origem of arquivos) {
    const ext = extname(origem).toLowerCase();
    if (![".html", ".htm", ".css", ".js", ".mjs"].includes(ext)) continue;
    let texto: string;
    try {
      texto = readFileSync(join(pastaRaiz, origem), "utf8");
    } catch {
      adicionarUnico(erros, `Não foi possível ler ${origem}.`);
      continue;
    }
    const referencias =
      ext === ".css"
        ? referenciasCss(texto)
        : ext === ".js" || ext === ".mjs"
          ? referenciasJs(texto)
          : referenciasHtml(texto);

    for (const referencia of referencias) {
      if (externaOuEspecial(referencia)) continue;
      if (referencia.startsWith("/")) {
        adicionarUnico(
          erros,
          `${origem} usa caminho absoluto "${referencia}". Use caminho relativo para funcionar no preview e no deploy.`,
        );
        continue;
      }
      const destino = destinoRelativo(origem, referencia);
      if (!destino) {
        adicionarUnico(avisos, `${origem} tem uma referência que não pôde ser conferida: ${referencia}.`);
        continue;
      }
      if (destino.startsWith("../") || destino === "..") {
        adicionarUnico(
          erros,
          `${origem} referencia arquivo fora da pasta do site: ${referencia}.`,
        );
        continue;
      }
      if (!caminhoExisteComoArquivo(pastaRaiz, destino)) {
        adicionarUnico(
          erros,
          `${origem} referencia um arquivo que não existe: ${referencia}.`,
        );
      }
    }
  }

  return { valido: erros.length === 0, paginas, erros, avisos };
}

export function resolverArquivoSite(
  pastaRaiz: string,
  caminhoBruto: unknown,
): string {
  if (typeof caminhoBruto !== "string" || !caminhoBruto) {
    throw new Error("Nome de página inválido.");
  }
  let caminho: string;
  try {
    caminho = decodeURIComponent(caminhoBruto).replace(/\\/g, "/");
  } catch {
    throw new Error("Nome de página inválido.");
  }
  if (
    !caminho ||
    caminho.includes("\0") ||
    caminho.startsWith("/") ||
    caminho.split("/").some((segmento) => !segmento || segmento === "." || segmento === "..")
  ) {
    throw new Error("Nome de página inválido.");
  }
  if (!/\.html?$/i.test(caminho)) {
    throw new Error("A página precisa terminar em .html.");
  }
  if (caminho.toLowerCase() === "carrossel.html") {
    throw new Error("carrossel.html é a classificação da peça, não uma página de site.");
  }
  const raiz = resolve(pastaRaiz);
  const alvo = resolve(raiz, caminho);
  const rel = relative(raiz, alvo);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Nome de página inválido.");
  }
  return alvo;
}

// O editor precisa ler o DOM na mesma origem, mas nao deve executar o JavaScript
// da pagina. Troca temporariamente o type e guarda a forma original em data-*.
// O motor do frontend restaura esses atributos somente na copia serializada.
export function neutralizarScriptsParaEdicao(html: string): string {
  return html.replace(/<script\b([^>]*)>/gi, (_tag, atributos: string) => {
    if (/\bdata-vkos-script-(?:type|sem-type)\b/i.test(atributos)) {
      return `<script${atributos}>`;
    }
    const tipo = atributos.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const valorTipo = tipo?.[1] ?? tipo?.[2] ?? tipo?.[3];
    const semTipo = tipo
      ? atributos.replace(tipo[0], "")
      : atributos;
    const memoria = valorTipo === undefined
      ? ' data-vkos-script-sem-type="1"'
      : ` data-vkos-script-type="${encodeURIComponent(valorTipo)}"`;
    return `<script${semTipo} type="application/x-vkos-disabled"${memoria}>`;
  });
}
