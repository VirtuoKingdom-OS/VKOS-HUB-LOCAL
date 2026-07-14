// Metadados e formatadores das telas de fonte (as fontes de dados por tipo).
// Deriva rotulos e ordem a partir do tipo de contexto do estado global.

import type { TipoContexto } from "../../tipos/dominio";

// Ordem canonica dos tipos na navegacao e nas telas de fonte.
export const ORDEM_TIPOS_FONTE: TipoContexto[] = ["texto", "imagens", "links"];

// Rotulo de cada tipo, no plural, pra sidebar e cabecalho da tela.
export const ROTULO_FONTE: Record<TipoContexto, string> = {
  texto: "Textos",
  imagens: "Imagens",
  links: "Links",
};

// Rotulo curto pra frases como "Nova fonte de <isto>".
export const ROTULO_FONTE_ARTIGO: Record<TipoContexto, string> = {
  texto: "texto",
  imagens: "imagens",
  links: "links",
};

// Extensoes que contam como imagem pra prévia de uma fonte de imagens.
const EXT_IMAGEM = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

// Diz se um anexo (pelo nome ou mime) é imagem.
export function ehImagem(nome: string, mime?: string): boolean {
  if (mime && mime.startsWith("image/")) return true;
  return EXT_IMAGEM.test(nome);
}

// Formata um ISO pro padrao brasileiro DD/MM/AAAA às HH:MM. Vazio se invalido.
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} às ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

// Um link parseado do notas.md de uma fonte de links.
export interface LinkFonte {
  url: string;
  descricao: string;
}

// Parser tolerante: qualquer linha com http conta. Formato esperado:
// "- <url> <descrição opcional>". Devolve a url e o resto como descrição.
export function parsearLinks(texto: string): LinkFonte[] {
  const linhas = texto.split(/\r?\n/);
  const links: LinkFonte[] = [];
  for (const linha of linhas) {
    const m = linha.match(/https?:\/\/\S+/);
    if (!m) continue;
    const url = m[0];
    const descricao = linha
      .replace(/^[-*\s]+/, "")
      .replace(url, "")
      .trim();
    links.push({ url, descricao });
  }
  return links;
}

// Titulo curto e legivel de uma url: host sem www mais o caminho, se houver.
export function tituloLink(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const caminho = u.pathname && u.pathname !== "/" ? u.pathname : "";
    return `${host}${caminho}`;
  } catch {
    return url;
  }
}

// Primeiras linhas nao vazias de um texto, pra prévia do card.
export function primeirasLinhas(texto: string, limite = 4): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, limite);
}
