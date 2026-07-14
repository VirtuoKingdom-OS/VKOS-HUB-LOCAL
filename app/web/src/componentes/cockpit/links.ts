// Serializacao dos links de referencia. O conteudo vive no texto do contexto
// (notas.md), uma linha por link no formato "- <url> <descricao opcional>".
// O parser e tolerante: qualquer linha que contenha http vira um link.

export interface LinkRef {
  url: string;
  descricao: string;
}

// Extrai a primeira url http(s) de uma linha e o que sobra vira descricao.
export function parseLinks(texto: string): LinkRef[] {
  const linhas = (texto ?? "").split(/\r?\n/);
  const links: LinkRef[] = [];
  for (const linha of linhas) {
    const achado = linha.match(/https?:\/\/[^\s]+/i);
    if (!achado) continue;
    const url = achado[0];
    // A descricao e o resto da linha, sem a url, sem o hifen de lista.
    const resto = linha
      .replace(url, " ")
      .replace(/^\s*[-*]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    links.push({ url, descricao: resto });
  }
  return links;
}

// Monta o texto do notas.md a partir da lista de links.
export function serializarLinks(links: LinkRef[]): string {
  return links
    .map((l) => `- ${l.url}${l.descricao ? " " + l.descricao : ""}`)
    .join("\n");
}

// Rotulo curto de um link: o dominio, sem www. Cai pra url crua se nao parsear.
export function rotuloLink(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0] || url;
  }
}
