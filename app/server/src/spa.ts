const PREFIXOS_NAO_SPA = [
  "/api",
  "/assets",
  "/pecas",
  "/pecas-html",
  "/pecas-edicao",
  "/modelos-html",
  "/ws",
];

function pertenceAoPrefixo(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

export function deveEntregarSpa(
  metodo: string,
  url: string,
  temFrontend: boolean,
): boolean {
  if (!temFrontend || metodo.toUpperCase() !== "GET") return false;
  const caminho = url.split(/[?#]/, 1)[0] || "/";
  if (PREFIXOS_NAO_SPA.some((prefixo) => pertenceAoPrefixo(caminho, prefixo))) {
    return false;
  }
  const ultimoSegmento = caminho.split("/").at(-1) ?? "";
  return !ultimoSegmento.includes(".");
}
