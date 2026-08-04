// Metadados e formatadores das telas de fluxo (a galeria por tipo de peca).
// Deriva rotulos e ordem a partir do tipo da peca do estado global.

import type { TipoPeca } from "../../tipos/dominio";

// Ordem canonica dos tipos na navegacao e nas telas.
export const ORDEM_TIPOS: TipoPeca[] = [
  "carrossel",
  "post",
  "stories",
  "site",
  "anuncio",
  "texto",
  "outro",
];

// Rotulo de cada tipo, no plural, pra sidebar e cabecalho da tela.
export const ROTULO_TIPO: Record<TipoPeca, string> = {
  carrossel: "Carrosséis",
  post: "Posts",
  stories: "Stories",
  site: "Site e páginas",
  anuncio: "Anúncios",
  texto: "Textos",
  outro: "Outros",
};

// Siglas curtas conhecidas que ficam em caixa alta no tema.
const SIGLAS = new Set(["ia", "vk", "ig"]);

// Formata o tema da pasta pra leitura: hifens viram espaco, primeira letra da
// frase maiuscula e siglas conhecidas (ia, vk, ig) em caixa alta.
// Ex: "ia-para-negocios" vira "IA para negocios"; "cuidado-com-a-pele" vira
// "Cuidado com a pele".
export function formatarTema(tema: string): string {
  const limpo = tema.replace(/[-_]+/g, " ").trim();
  if (!limpo) return "Sem título";
  const palavras = limpo.split(/\s+/).map((p) => {
    const min = p.toLowerCase();
    return min.length <= 2 && SIGLAS.has(min) ? min.toUpperCase() : p;
  });
  const frase = palavras.join(" ");
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

// Formata a data AAAA-MM-DD pro padrao brasileiro DD/MM/AAAA.
// Pasta fora do padrao (data vazia) devolve string vazia.
export function formatarData(data: string): string {
  const m = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// Formata a data e hora da geracao pro padrao brasileiro "dd/mm/aaaa, hh:mm",
// a partir do criadoEm ISO (rodada 14, interface 3). Sem criadoEm ou com valor
// invalido, cai na data sozinha (formatarData), o comportamento de antes.
export function formatarDataHora(data: string, criadoEm?: string): string {
  if (criadoEm) {
    const d = new Date(criadoEm);
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const aaaa = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${dd}/${mm}/${aaaa}, ${hh}:${min}`;
    }
  }
  return formatarData(data);
}

// Ultimo segmento de um caminho relativo, o nome do arquivo pra exibir.
export function nomeArquivo(caminho: string): string {
  const partes = caminho.split("/");
  return partes[partes.length - 1] || caminho;
}

// Rotulo de um link de pagina a partir da url da peca (site).
export function nomePagina(url: string): string {
  const bruto = url.split("/").pop() ?? url;
  try {
    return decodeURIComponent(bruto);
  } catch {
    return bruto;
  }
}

// Base do nome de download: tema só com letras e números, sem acento.
// Ex: "bolo-sem-susto" vira "bolosemsusto".
export function baseNome(tema: string): string {
  // NFD separa a letra do acento, o strip final tira o acento junto.
  const base = tema
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
  return base || "peca";
}

// Extensao de uma url de imagem, sem query. Padrao png.
function extensaoImagem(url: string): string {
  const semQuery = url.split(/[?#]/)[0];
  const m = semQuery.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "png";
}

// Nome de download de uma imagem pela posicao: <base><NN>.<ext>, NN de dois digitos.
export function nomeDownload(base: string, indice: number, url: string): string {
  const nn = String(indice + 1).padStart(2, "0");
  return `${base}${nn}.${extensaoImagem(url)}`;
}
