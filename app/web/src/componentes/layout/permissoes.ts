const TELAS_EXCLUSIVAS_CORE = new Set(["admin", "mapa", "conexoes", "automacoes"]);

export const FEATURES_COM_TELA = new Set([
  "cockpit",
  "criador-visual",
  "site-guiado",
  "crm",
  "calendario",
  "meta",
  "ide",
]);

export function featureDaTela(tela: string): string | null {
  if (tela === "cockpit") return "cockpit";
  if (tela === "cerebro") return "cockpit";
  if (tela === "crm") return "crm";
  if (tela === "calendario") return "calendario";
  if (tela === "meta") return "meta";
  if (tela === "ide") return "ide";
  if (tela === "fontes" || tela.startsWith("fonte:")) return "cockpit";
  if (
    tela === "galerias" ||
    tela.startsWith("studio:") ||
    tela.startsWith("criar:carrossel") ||
    tela.startsWith("criar:post") ||
    tela.startsWith("criar:story")
  ) return "criador-visual";
  if (
    tela.startsWith("site:") ||
    tela === "fluxo:site" ||
    tela === "criar:site"
  ) return "site-guiado";
  return null;
}

export function temTelaDisponivel(features: ReadonlySet<string>): boolean {
  return [...FEATURES_COM_TELA].some((id) => features.has(id));
}

export function telaPermitida(
  tela: string,
  features: ReadonlySet<string>,
  ehOperador: boolean,
): boolean {
  if (ehOperador) return true;
  if (TELAS_EXCLUSIVAS_CORE.has(tela)) return false;
  // Arquivos une dois mundos: Criacoes (criador-visual) e Fontes (cockpit).
  // A tela abre com qualquer um dos dois; a sub-aba de fontes exige o cockpit.
  if (tela === "arquivos") {
    return features.has("criador-visual") || features.has("cockpit");
  }
  if (tela === "arquivos:fontes") return features.has("cockpit");
  if (tela === "dashboard") {
    return features.has("criador-visual")
      || features.has("site-guiado")
      || features.has("ide")
      || !temTelaDisponivel(features);
  }
  const feature = featureDaTela(tela);
  return feature === null || features.has(feature);
}

export function primeiraTelaDisponivel(features: ReadonlySet<string>): string {
  if (features.has("criador-visual") || features.has("site-guiado")) return "dashboard";
  if (features.has("cockpit")) return "cockpit";
  if (features.has("crm")) return "crm";
  if (features.has("calendario")) return "calendario";
  if (features.has("meta")) return "meta";
  if (features.has("ide")) return "dashboard";
  return "dashboard";
}
