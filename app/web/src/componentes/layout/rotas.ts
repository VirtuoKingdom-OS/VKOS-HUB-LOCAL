import type { TipoGeracao } from "../../estado/geracao";

// Duas camadas de navegacao desde 2026-07-27 (ver decisoes/2026-07-27-hub-core.md).
//
// CORE, o nivel do dono: nao muda quando se troca de workspace.
export const TELAS_CORE = ["dashboard", "workspaces", "conexoes", "crm", "mapa"] as const;

// WORKSPACE, o nivel do projeto aberto: tudo aqui fala do workspace ativo.
export const TELAS_WORKSPACE = ["inicio", "cockpit", "galerias", "fontes"] as const;

export const TELAS_FIXAS = new Set<string>([...TELAS_CORE, ...TELAS_WORKSPACE]);

// Em qual nivel uma tela mora. A Sidebar usa isto pra desenhar as duas secoes,
// e o teste trava a divisao.
export function nivelDaTela(tela: string): "core" | "workspace" {
  return (TELAS_CORE as readonly string[]).includes(tela) ? "core" : "workspace";
}

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
  if (TELAS_FIXAS.has(caminho)) return caminho;
  return "dashboard";
}

export function tipoCriacaoDaTela(tela: string): TipoGeracao | null {
  if (!tela.startsWith("criar:")) return null;
  const tipo = tela.slice("criar:".length);
  return tipoCriacaoValido(tipo) ? tipo : null;
}

// Cancelar uma criacao volta pro trabalho do workspace, nunca pro CORE: quem
// estava criando peca estava dentro de um projeto.
export function retornoSeguroDaCriacao(valor: unknown): string {
  if (typeof valor !== "string" || valor.length === 0 || valor.startsWith("criar:")) {
    return "inicio";
  }
  return hashParaTela(telaParaHash(valor)) === valor ? valor : "inicio";
}

export function destinoAposCriacao(tipo: TipoGeracao, pasta: string): string {
  const segmento = encodeURIComponent(pasta);
  return tipo === "site" ? `site:${segmento}` : `studio:${segmento}`;
}
