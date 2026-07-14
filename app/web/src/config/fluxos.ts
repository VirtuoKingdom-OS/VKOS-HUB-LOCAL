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
export type IdFormato = "multiplas" | "unica";

// Proporcao da imagem final. O render tira o print do proprio elemento .slide,
// entao a dimensao dele e que manda: da pra pedir qualquer uma via instrucao.
export type IdProporcao = "1x1" | "4x5" | "9x16";

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
}

export interface OpcaoFormato {
  id: IdFormato;
  rotulo: string;
  descricao: string;
}

export const FORMATOS: OpcaoFormato[] = [
  {
    id: "multiplas",
    rotulo: "Carrossel",
    descricao: "Varias paginas pra deslizar",
  },
  {
    id: "unica",
    rotulo: "Pagina unica",
    descricao: "Uma imagem so",
  },
];

export interface OpcaoProporcao {
  id: IdProporcao;
  rotulo: string;
  descricao: string;
  larguraPx: number;
  alturaPx: number;
}

export const PROPORCOES: OpcaoProporcao[] = [
  {
    id: "4x5",
    rotulo: "Retrato 4:5",
    descricao: "1080 x 1350, o padrao do feed",
    larguraPx: 1080,
    alturaPx: 1350,
  },
  {
    id: "1x1",
    rotulo: "Quadrado 1:1",
    descricao: "1080 x 1080",
    larguraPx: 1080,
    alturaPx: 1080,
  },
  {
    id: "9x16",
    rotulo: "Stories 9:16",
    descricao: "1080 x 1920, tela cheia",
    larguraPx: 1080,
    alturaPx: 1920,
  },
];

// Proporcao nativa do template de carrossel. So instrui a mexer nas dimensoes
// quando o usuario pede uma diferente dessa.
const PROPORCAO_NATIVA: IdProporcao = "4x5";

// Monta as instrucoes extras que acompanham o /carrossel conforme o formato, a
// proporcao e a subpasta escolhidos. E linguagem natural pro fluxo real da
// skill: o render mede o proprio elemento .slide (nao a viewport), entao ajustar
// a dimensao do .slide muda o tamanho do PNG; e o render sempre salva em
// instagram/, entao pra classificar como post ou stories a saida precisa ser
// movida depois.
export function instrucoesImagem(
  formato: IdFormato,
  proporcao: IdProporcao,
  subpasta: string
): string {
  const prop = PROPORCOES.find((p) => p.id === proporcao) ?? PROPORCOES[0];
  const linhas: string[] = ["Instrucoes de formato e dimensao desta geracao:"];

  if (formato === "unica") {
    linhas.push(
      "- Formato: gere exatamente 1 pagina (uma imagem so), nao um carrossel de varias paginas. O HTML deve ter um unico elemento .slide."
    );
  } else {
    linhas.push(
      "- Formato: carrossel de varias paginas, como de costume (capa, desenvolvimento e CTA)."
    );
  }

  if (proporcao !== PROPORCAO_NATIVA) {
    linhas.push(
      `- Proporcao: ${prop.rotulo}. Antes de renderizar, ajuste no HTML a dimensao de cada elemento .slide pra ${prop.larguraPx}x${prop.alturaPx} px (a width e a height do .slide) e reposicione o conteudo pra caber bem nessa altura, sem cortar texto nem deixar vao grande. O render tira o print do proprio .slide, entao e a dimensao dele que define o tamanho final da imagem.`
    );
  } else {
    linhas.push(
      `- Proporcao: ${prop.rotulo} (${prop.larguraPx}x${prop.alturaPx}), o padrao do template. Nao precisa mexer nas dimensoes.`
    );
  }

  if (subpasta !== "instagram") {
    linhas.push(
      `- Saida: depois de rodar o render (que salva em instagram/), MOVA as imagens pra subpasta ${subpasta}/ dentro da pasta do conteudo, deixando instagram/ vazia. O app classifica o tipo da peca pela subpasta, e uma imagem esquecida em instagram/ faria a peca ser lida errado.`
    );
  }

  return linhas.join("\n");
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
];

// Fluxos que aparecem nos menus de criacao (popover e botao direito).
export const FLUXOS_VISIVEIS: Fluxo[] = FLUXOS.filter((f) => !f.oculto);

export function acharFluxo(id: string): Fluxo | undefined {
  return FLUXOS.find((f) => f.id === id);
}
