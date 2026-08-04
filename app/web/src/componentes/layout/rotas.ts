import type { TipoGeracao } from "../../estado/geracao";

// Duas camadas de navegacao desde 2026-07-27 (ver docs/decisoes/2026-07-27-hub-core.md).
//
// CORE, o nivel do dono: nao muda quando se troca de workspace. A ordem aqui e
// a dos tres grupos da barra: Core, Gestao e Sistema.
export const TELAS_CORE = [
  "dashboard",
  "assistente",
  "clientes",
  "workspaces",
  "crm",
  "financas",
  "conexoes",
  "mapa",
] as const;

// WORKSPACE, o nivel do projeto aberto: tudo aqui fala do workspace ativo.
export const TELAS_WORKSPACE = ["inicio", "cockpit", "galerias", "fontes"] as const;

export const TELAS_FIXAS = new Set<string>([...TELAS_CORE, ...TELAS_WORKSPACE]);

// Em qual nivel uma tela mora. A Sidebar usa isto pra decidir qual dos dois
// modos desenhar, e o teste trava a divisao.
export function nivelDaTela(tela: string): "core" | "workspace" {
  return (TELAS_CORE as readonly string[]).includes(tela) ? "core" : "workspace";
}

const TIPOS_CRIACAO = new Set<TipoGeracao>([
  "carrossel",
  "post",
  "story",
  "site",
  "anuncio",
]);

function tipoCriacaoValido(valor: string): valor is TipoGeracao {
  return TIPOS_CRIACAO.has(valor as TipoGeracao);
}

// O endereco de uma tela: um caminho de verdade, /crm e nao /#/crm.
//
// Ate 2026-07-27 o Hub roteava por hash. O motivo era comodidade: hash nao
// precisa de nada do servidor, entao F5 funciona sem configurar rota. O preco
// era o endereco, que saia sempre como <endereco>/#/<rota> e nao parece um app.
// Agora o servidor devolve o index.html pra qualquer caminho que nao seja da
// API nem arquivo (ver setNotFoundHandler em server/src/index.ts), e o Vite ja
// faz isso sozinho no modo dev. Ver docs/decisoes/2026-07-27-rotas-sem-hash.md.
export function telaParaCaminho(tela: string): string {
  if (tela.startsWith("fluxo:")) return `/fluxo/${tela.slice("fluxo:".length)}`;
  if (tela.startsWith("fonte:")) return `/fonte/${tela.slice("fonte:".length)}`;
  if (tela.startsWith("studio:")) return `/studio/${tela.slice("studio:".length)}`;
  if (tela.startsWith("site:")) return `/site/${tela.slice("site:".length)}`;
  if (tela.startsWith("anuncio:")) return `/anuncio/${tela.slice("anuncio:".length)}`;
  if (tela.startsWith("criar:")) {
    const tipo = tela.slice("criar:".length);
    if (tipoCriacaoValido(tipo)) return `/criar/${tipo}`;
  }
  if (TELAS_FIXAS.has(tela)) return `/${tela}`;
  return "/dashboard";
}

// Le a tela de um caminho. Aceita tambem o formato antigo com hash, pra
// favorito velho e atalho salvo nao morrerem: "/#/crm" e "#/crm" dao "crm".
export function caminhoParaTela(caminho: string): string {
  const rota = normalizarRota(caminho);
  if (rota.startsWith("fluxo/")) return `fluxo:${rota.slice("fluxo/".length)}`;
  if (rota.startsWith("fonte/")) return `fonte:${rota.slice("fonte/".length)}`;
  if (rota.startsWith("studio/")) return `studio:${rota.slice("studio/".length)}`;
  if (rota.startsWith("site/")) return `site:${rota.slice("site/".length)}`;
  if (rota.startsWith("anuncio/")) return `anuncio:${rota.slice("anuncio/".length)}`;
  if (rota.startsWith("criar/")) {
    const tipo = rota.slice("criar/".length);
    if (tipoCriacaoValido(tipo)) return `criar:${tipo}`;
  }
  if (TELAS_FIXAS.has(rota)) return rota;
  return "dashboard";
}

// Tira a barra da frente, o hash antigo e a query. Sobra so a rota.
// "/#/crm", "#/crm", "/crm", "crm" e "/crm?x=1" todos viram "crm".
function normalizarRota(bruto: string): string {
  let rota = bruto.trim();
  const corte = rota.search(/[?]/);
  if (corte >= 0) rota = rota.slice(0, corte);
  // O hash antigo carregava a rota inteira: o que vale e o que vem depois dele.
  const hash = rota.indexOf("#");
  if (hash >= 0) rota = rota.slice(hash + 1);
  return rota.replace(/^\/+/, "").replace(/\/+$/, "");
}

// O setup nao e uma tela do Hub: ele substitui o Hub inteiro enquanto nao ha
// motor de IA escolhido. Por isso mora fora de TELAS_FIXAS, mas precisa de um
// caminho igual ao das outras.
export const CAMINHO_SETUP = "/setup";

// A rota crua da janela, sem hash, sem query e com uma barra na frente.
// Serve pra quem decide fora do Shell, como o App com o setup.
export function rotaAtual(): string {
  const { pathname, hash } = window.location;
  return `/${normalizarRota(hash ? hash : pathname)}`;
}

// A tela atual da janela, ja tolerando o formato antigo com hash.
export function telaDoEndereco(): string {
  const { pathname, hash } = window.location;
  return caminhoParaTela(hash ? hash : pathname);
}

// A janela ainda esta num endereco com hash? Quem abriu por favorito velho cai
// aqui, e o Shell reescreve pro caminho limpo uma vez so.
export function enderecoUsaHashAntigo(): boolean {
  return window.location.hash.startsWith("#/");
}

// Navega por codigo de fora do Shell (um botao dentro de uma tela, por
// exemplo). Empurra o caminho e avisa a aplicacao, porque pushState nao
// dispara evento nenhum sozinho: sem este aviso a barra de endereco mudava e a
// tela ficava parada. Era de graca no tempo do hash, que disparava hashchange.
export const EVENTO_ROTA = "vkos:rota";

export function irParaCaminho(caminho: string): void {
  if (window.location.pathname !== caminho || window.location.hash) {
    history.pushState(null, "", caminho);
  }
  window.dispatchEvent(new CustomEvent(EVENTO_ROTA));
}

export function irParaTela(tela: string): void {
  irParaCaminho(telaParaCaminho(tela));
}

// Atalho pros tres destinos de peca, que aparecem em oito telas diferentes.
export function irParaPeca(tipo: "studio" | "site" | "anuncio", pasta: string): void {
  irParaTela(`${tipo}:${encodeURIComponent(pasta)}`);
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
  return caminhoParaTela(telaParaCaminho(valor)) === valor ? valor : "inicio";
}

export function destinoAposCriacao(tipo: TipoGeracao, pasta: string): string {
  const segmento = encodeURIComponent(pasta);
  if (tipo === "anuncio") return `anuncio:${segmento}`;
  return tipo === "site" ? `site:${segmento}` : `studio:${segmento}`;
}
