import { lerPecas } from "../vkos/pecas.js";

export function dataHoje(dia = new Date()): string {
  const ano = dia.getFullYear();
  const mes = String(dia.getMonth() + 1).padStart(2, "0");
  const diaDoMes = String(dia.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${diaDoMes}`;
}

export function gerarSlug(tema: string): string {
  const limpo = tema
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let cortado = limpo.slice(0, 40).replace(/-+$/g, "");
  if (limpo.length > 40 && limpo[40] !== "-") {
    const ultimoHifen = cortado.lastIndexOf("-");
    if (ultimoHifen > 0) cortado = cortado.slice(0, ultimoHifen);
  }
  return cortado || "carrossel";
}

export function pastaUnica(
  pastaVkos: string,
  tema: string,
  dia = new Date(),
): string {
  const base = `${dataHoje(dia)}-${gerarSlug(tema)}`;
  const usadas = new Set(lerPecas(pastaVkos).map((peca) => peca.pasta));
  if (!usadas.has(base)) return base;
  let numero = 2;
  while (usadas.has(`${base}-${numero}`)) numero += 1;
  return `${base}-${numero}`;
}
