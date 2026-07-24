// Roteamento do CORE (ShellGestao), separado num modulo puro pra ser testavel
// sem arrastar React nem CSS. As areas Clientes e Planos de cliente viraram a
// area unica Workspace; os caminhos antigos redirecionam pra ela.

export type Area = "painel" | "workspace" | "estudio" | "banco-visual" | "ide" | "sistema";
export type AreaSistema = "meu-claude" | "conexoes" | "seguranca" | "mapa" | "auditoria";

export const AREAS: { id: Area; nome: string }[] = [
  { id: "painel", nome: "Painel" },
  { id: "workspace", nome: "Workspace" },
  { id: "estudio", nome: "Estúdio" },
  { id: "banco-visual", nome: "Banco visual" },
  { id: "ide", nome: "VKOS-IDE" },
  { id: "sistema", nome: "Sistema" },
];

const SUBS_SISTEMA: AreaSistema[] = ["meu-claude", "conexoes", "seguranca", "mapa", "auditoria"];

export function lerArea(pathname: string): { area: Area; sub: AreaSistema } {
  const limpo = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const partes = limpo.split("/");
  const raiz = partes[0] || "painel";
  // Caminhos antigos: Clientes e Planos viraram a area unica Workspace.
  if (raiz === "clientes" || raiz === "modelos") {
    return { area: "workspace", sub: "meu-claude" };
  }
  if (raiz === "sistema") {
    const sub = partes[1] as AreaSistema;
    return { area: "sistema", sub: SUBS_SISTEMA.includes(sub) ? sub : "meu-claude" };
  }
  const area = AREAS.find((a) => a.id === raiz)?.id ?? "painel";
  return { area, sub: "meu-claude" };
}

export function caminhoDaArea(area: Area, sub?: AreaSistema): string {
  if (area === "painel") return "/";
  if (area === "sistema") return `/sistema/${sub ?? "meu-claude"}`;
  return `/${area}`;
}
