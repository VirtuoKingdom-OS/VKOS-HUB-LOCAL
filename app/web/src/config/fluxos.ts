// Os fluxos (lancadores) da barra do cockpit e os prompts que disparam.
// Espelha a tabela de fluxos do CONTRATO.md.
//
// Carrossel, Post e Stories rodam TODOS o mesmo motor: a skill /carrossel. O
// que muda entre eles e so o FORMATO (varias paginas ou pagina unica), a
// PROPORCAO (1:1, 4:5, 9:16) e a subpasta de saida. O composer controla isso.

export interface Subopcao {
  id: string;
  rotulo: string;
  // Monta o prompt a partir do que o usuario digitou.
  montarPrompt: (argumento: string) => string;
  skill: string;
  precisaArgumento: boolean;
  dicaArgumento: string;
}

// Formato da geracao: carrossel de varias paginas ou uma imagem so.
// FORMATO, PROPORCAO E AS INSTRUCOES DE GERACAO MORAM NO SERVIDOR.
//
// Subiram em 2026-08-04, junto com os tres prompts de geracao, porque a fila do
// Assistente monta prompt sem navegador aberto. Ver server/src/geracao/formato.ts.
// A tela continua importando daqui, e existe UMA implementacao.
import {
  FORMATOS,
  PROPORCOES,
  instrucoesImagem,
  type IdFormato,
  type IdProporcao,
  type OpcaoFormato,
  type OpcaoProporcao,
} from "../../../server/src/geracao/formato";

export { FORMATOS, PROPORCOES, instrucoesImagem };
export type { IdFormato, IdProporcao, OpcaoFormato, OpcaoProporcao };

// Preset de imagem de um fluxo. Quando um fluxo tem isso, ele abre o composer
// de imagem unificado (motor /carrossel).
export interface PresetImagem {
  formato: IdFormato;
  proporcao: IdProporcao;
  // Subpasta de saida dentro de conteudo/<data-tema>/. O app classifica o tipo
  // da peca pela subpasta: instagram/ = carrossel, post/ = post,
  // instagram-stories/ = stories.
  subpasta: string;
}

export interface Fluxo {
  id: string;
  rotulo: string;
  descricao: string;
  icone: string;
  subopcoes: Subopcao[];
  // Presente = fluxo de imagem (roda /carrossel, mostra formato e proporcao).
  imagem?: PresetImagem;
  // Oculto: fora dos menus de criacao (enxugamento de 2026-07-13), mas sessoes
  // e pecas antigas do tipo continuam renderizando normalmente.
  oculto?: boolean;
  // Abre o assistente de criacao daquele tipo em vez de criar no de conversa.
  // O nome do fluxo que o assistente conduz; sem ele o clique nao abre nada
  // outra coisa, em silencio.
  abreAssistente?: string;
}

export const FLUXOS: Fluxo[] = [
  {
    id: "carrossel",
    rotulo: "Carrossel",
    descricao: "Varias paginas pra deslizar",
    icone: "carrossel",
    imagem: { formato: "multiplas", proporcao: "4x5", subpasta: "instagram" },
    subopcoes: [
      {
        id: "carrossel",
        rotulo: "Carrossel",
        montarPrompt: (a) => `/carrossel ${a}`,
        skill: "carrossel",
        precisaArgumento: true,
        dicaArgumento: "Tema do carrossel",
      },
    ],
  },
  {
    id: "post",
    rotulo: "Post",
    descricao: "Uma imagem so pro feed",
    icone: "post",
    oculto: true,
    imagem: { formato: "unica", proporcao: "4x5", subpasta: "post" },
    subopcoes: [
      {
        id: "post",
        rotulo: "Post",
        montarPrompt: (a) => `/carrossel ${a}`,
        skill: "carrossel",
        precisaArgumento: true,
        dicaArgumento: "Tema do post",
      },
    ],
  },
  {
    id: "stories",
    rotulo: "Stories",
    descricao: "Uma imagem vertical 9:16",
    icone: "stories",
    oculto: true,
    imagem: { formato: "unica", proporcao: "9x16", subpasta: "instagram-stories" },
    subopcoes: [
      {
        id: "stories",
        rotulo: "Stories",
        montarPrompt: (a) => `/carrossel ${a}`,
        skill: "carrossel",
        precisaArgumento: true,
        dicaArgumento: "Tema dos stories",
      },
    ],
  },
  {
    id: "site",
    rotulo: "Site e páginas",
    descricao: "Site, página de captura ou blog",
    icone: "site",
    subopcoes: [
      {
        id: "site",
        rotulo: "Site",
        montarPrompt: () => "/site",
        skill: "site",
        precisaArgumento: false,
        dicaArgumento: "",
      },
      {
        id: "landing",
        rotulo: "Página de captura",
        montarPrompt: (a) => `/landing ${a}`,
        skill: "landing",
        precisaArgumento: true,
        dicaArgumento: "Oferta da página",
      },
      {
        id: "blog",
        rotulo: "Artigo de blog",
        montarPrompt: (a) => `/blog ${a}`,
        skill: "blog",
        precisaArgumento: true,
        dicaArgumento: "Tema do artigo",
      },
    ],
  },
  {
    id: "anuncio",
    rotulo: "Anúncio",
    descricao: "Campanha de Google Ads pronta pra colar",
    icone: "anuncio",
    // A campanha so nasce completa pelo assistente, que colhe orcamento e
    // destino do clique e manda a pasta alvo. Ver o comentario em Fluxo.
    abreAssistente: "anuncio",
    subopcoes: [
      {
        id: "anuncio",
        rotulo: "Anúncio",
        montarPrompt: (a) => `/anuncio ${a}`,
        skill: "anuncio",
        precisaArgumento: true,
        dicaArgumento: "Oferta a anunciar",
      },
    ],
  },
];

// Fluxos que aparecem nos menus de criacao (popover e botao direito).
export const FLUXOS_VISIVEIS: Fluxo[] = FLUXOS.filter((f) => !f.oculto);

export function acharFluxo(id: string): Fluxo | undefined {
  return FLUXOS.find((f) => f.id === id);
}
