import type { TipoGeracao } from "../../estado/geracao";

export const TELAS_FIXAS = new Set([
  "dashboard",
  "cerebro",
  "arquivos",
  "crm",
  "calendario",
  "meta",
  "conexoes",
  "automacoes",
  "mapa",
  "admin",
]);

export const EVENTO_NAVEGACAO = "vkos:navegacao";

// Pedido de abrir o wizard de criacao vindo de fora do Shell (ex: o cockpit
// vazio, que nao navega sozinho). O detail carrega o tipo da peca. O Shell
// escuta e chama abrirCriacao, respeitando a base do workspace.
export const EVENTO_ABRIR_CRIACAO = "vkos:abrir-criacao";

const TIPOS_CRIACAO = new Set<TipoGeracao>([
  "carrossel",
  "post",
  "story",
  "site",
]);

function tipoCriacaoValido(valor: string): valor is TipoGeracao {
  return TIPOS_CRIACAO.has(valor as TipoGeracao);
}

export function telaParaCaminho(tela: string): string {
  // A sub-aba de fontes da tela Arquivos tem caminho proprio. Os ids antigos
  // (galerias, fontes) continuam aceitos e caem na tela Arquivos.
  if (tela === "arquivos:fontes" || tela === "fontes") return "/arquivos/fontes";
  if (tela === "galerias") return "/arquivos";
  if (tela.startsWith("fluxo:")) return `/fluxo/${tela.slice("fluxo:".length)}`;
  if (tela.startsWith("fonte:")) return `/fonte/${tela.slice("fonte:".length)}`;
  if (tela.startsWith("studio:")) return `/studio/${tela.slice("studio:".length)}`;
  if (tela.startsWith("site:")) return `/site/${tela.slice("site:".length)}`;
  if (tela.startsWith("criar:")) {
    const tipo = tela.slice("criar:".length);
    if (tipoCriacaoValido(tipo)) return `/criar/${tipo}`;
  }
  if (tela === "cockpit") return "/cockpit";
  if (TELAS_FIXAS.has(tela)) return `/${tela}`;
  return "/dashboard";
}

export function caminhoParaTela(valor: string): string {
  const caminho = valor
    .split(/[?#]/, 1)[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  // Arquivos: a sub-aba de fontes e um caminho proprio, e os caminhos antigos
  // /galerias e /fontes redirecionam pra tela nova (link salvo nao quebra).
  if (caminho === "arquivos/fontes" || caminho === "fontes") return "arquivos:fontes";
  if (caminho === "galerias") return "arquivos";
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

export function caminhoDoHashLegado(hash: string): string | null {
  return hash.startsWith("#/") ? hash.slice(1) : null;
}

// Prefixo de workspace do operador: quando o Jesse entra num workspace pelo
// CORE, a experiencia de workspace vive sob /w/<id>/... O cliente nao usa
// prefixo (tem um workspace so). Estes helpers deixam o Shell funcionar igual
// nos dois casos, so mudando a base do caminho.
export function basePrefixoWorkspace(id: string): string {
  return `/w/${encodeURIComponent(id)}`;
}

export function idDoCaminhoWorkspace(pathname: string): string | null {
  const casou = pathname.match(/^\/w\/([^/]+)/);
  return casou ? decodeURIComponent(casou[1]) : null;
}

export function comBase(base: string, caminho: string): string {
  if (!base) return caminho;
  // /dashboard vira a raiz do workspace (/w/<id>); o resto concatena.
  return caminho === "/dashboard" ? base : `${base}${caminho}`;
}

export function semBase(base: string, pathname: string): string {
  if (!base) return pathname;
  if (pathname === base) return "/dashboard";
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}

export function navegarParaCaminho(caminho: string, substituir = false): void {
  const operacao = substituir ? "replaceState" : "pushState";
  history[operacao](null, "", caminho);
  window.dispatchEvent(new Event(EVENTO_NAVEGACAO));
}

export function navegarParaTela(tela: string, substituir = false): void {
  navegarParaCaminho(telaParaCaminho(tela), substituir);
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
  return caminhoParaTela(telaParaCaminho(valor)) === valor ? valor : "dashboard";
}

export function destinoAposCriacao(tipo: TipoGeracao, pasta: string): string {
  const segmento = encodeURIComponent(pasta);
  return tipo === "site" ? `site:${segmento}` : `studio:${segmento}`;
}
