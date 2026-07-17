import type { TipoGeracao } from "../../estado/geracao";

export const TELAS_FIXAS = new Set([
  "dashboard",
  "galerias",
  "fontes",
  "crm",
  "calendario",
  "conexoes",
  "automacoes",
  "mapa",
]);

const TIPOS_CRIACAO = new Set<TipoGeracao>([
  "carrossel",
  "post",
  "story",
  "site",
]);

function tipoCriacaoValido(valor: string): valor is TipoGeracao {
  return TIPOS_CRIACAO.has(valor as TipoGeracao);
}

export function telaParaHash(tela: string): string {
  if (tela.startsWith("fluxo:")) return `#/fluxo/${tela.slice("fluxo:".length)}`;
  if (tela.startsWith("fonte:")) return `#/fonte/${tela.slice("fonte:".length)}`;
  if (tela.startsWith("studio:")) return `#/studio/${tela.slice("studio:".length)}`;
  if (tela.startsWith("site:")) return `#/site/${tela.slice("site:".length)}`;
  if (tela.startsWith("criar:")) {
    const tipo = tela.slice("criar:".length);
    if (tipoCriacaoValido(tipo)) return `#/criar/${tipo}`;
  }
  if (tela === "cockpit") return "#/cockpit";
  if (TELAS_FIXAS.has(tela)) return `#/${tela}`;
  return "#/dashboard";
}

export function hashParaTela(hash: string): string {
  const caminho = hash.replace(/^#\/?/, "");
  if (caminho.startsWith("fluxo/")) return `fluxo:${caminho.slice("fluxo/".length)}`;
  if (caminho.startsWith("fonte/")) return `fonte:${caminho.slice("fonte/".length)}`;
  if (caminho.startsWith("studio/")) return `studio:${caminho.slice("studio/".length)}`;
  if (caminho.startsWith("site/")) return `site:${caminho.slice("site/".length)}`;
  if (caminho.startsWith("criar/")) {
    const tipo = caminho.slice("criar/".length);
    if (tipoCriacaoValido(tipo)) return `criar:${tipo}`;
  }
  if (caminho === "cockpit") return "cockpit";
  if (TELAS_FIXAS.has(caminho)) return caminho;
  return "dashboard";
}

export function tipoCriacaoDaTela(tela: string): TipoGeracao | null {
  if (!tela.startsWith("criar:")) return null;
  const tipo = tela.slice("criar:".length);
  return tipoCriacaoValido(tipo) ? tipo : null;
}

export function retornoSeguroDaCriacao(valor: unknown): string {
  if (typeof valor !== "string" || valor.length === 0 || valor.startsWith("criar:")) {
    return "dashboard";
  }
  return hashParaTela(telaParaHash(valor)) === valor ? valor : "dashboard";
}

export function destinoAposCriacao(tipo: TipoGeracao, pasta: string): string {
  const segmento = encodeURIComponent(pasta);
  return tipo === "site" ? `site:${segmento}` : `studio:${segmento}`;
}
