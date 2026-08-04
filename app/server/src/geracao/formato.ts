// FORMATO E DIMENSÃO DE UMA GERAÇÃO VISUAL, e as instruções que elas viram.
//
// Isto morava em `web/src/config/fluxos.ts` e subiu pro servidor em 2026-08-04,
// junto com os três prompts de geração. O motivo está no cabeçalho de
// promptCarrossel.ts: a fila do Assistente monta prompt sem navegador aberto, e
// prompt de servidor que reimplementa o do navegador diverge no primeiro dia.
//
// `web/src/config/fluxos.ts` reexporta daqui. A tela continua importando do
// mesmo lugar de sempre.

export type IdFormato = "multiplas" | "unica";
export type IdProporcao = "1x1" | "4x5" | "9x16";

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

// Monta as instrucoes extras que acompanham o /carrossel conforme o formato e
// a proporcao escolhidos. E linguagem natural pro fluxo real da skill: o
// tamanho final da pagina vem da dimensao do proprio elemento .slide (nao da
// viewport), entao ajustar essa dimensao no HTML muda o tamanho da peca. A
// entrega agora e so o carrossel.html: o app renderiza o PNG sob demanda
// quando o usuario baixa, entao a skill nao roda mais o Passo 5 aqui.
//
// A LINHA DE ENTREGA NAO E DETALHE, e ela ja custou caro. Sem ela a skill roda
// o Passo 5 e salva PNG em instagram/. Peca com PNG e classificada como legado
// (ver classificarPeca), legado nao tem fonteHtml, e sem fonteHtml o Studio
// recusa abrir. Foi assim que os dois carrosseis do Assistente nasceram sem
// edicao em 2026-08-04: o prompt do servidor era uma reescrita que tinha
// perdido esta linha.
export function instrucoesImagem(
  formato: IdFormato,
  proporcao: IdProporcao,
  // Nao ha mais PNG pra mover entre subpastas (a peca e classificada pela
  // presenca do carrossel.html), entao o parametro fica sem uso aqui. Mantido
  // na assinatura so pra nao quebrar o chamador (NoSessao.tsx passa 3 args).
  subpasta: string,
): string {
  const prop = PROPORCOES.find((p) => p.id === proporcao) ?? PROPORCOES[0];
  const linhas: string[] = ["Instrucoes de formato e dimensao desta geracao:"];

  if (formato === "unica") {
    linhas.push(
      "- Formato: gere exatamente 1 pagina (uma imagem so), nao um carrossel de varias paginas. O HTML deve ter um unico elemento .slide.",
    );
  } else {
    linhas.push(
      "- Formato: carrossel de varias paginas, como de costume (capa, desenvolvimento e CTA).",
    );
  }

  if (proporcao !== PROPORCAO_NATIVA) {
    linhas.push(
      `- Proporcao: ${prop.rotulo}. Antes de renderizar, ajuste no HTML a dimensao de cada elemento .slide pra ${prop.larguraPx}x${prop.alturaPx} px (a width e a height do .slide) e reposicione o conteudo pra caber bem nessa altura, sem cortar texto nem deixar vao grande. O render tira o print do proprio .slide, entao e a dimensao dele que define o tamanho final da imagem.`,
    );
  } else {
    linhas.push(
      `- Proporcao: ${prop.rotulo} (${prop.larguraPx}x${prop.alturaPx}), o padrao do template. Nao precisa mexer nas dimensoes.`,
    );
  }

  linhas.push(
    "- Entrega: NAO execute o Passo 5 da skill (renderizar). NAO gere nenhum PNG, NAO rode npm install nem playwright install pra isso. A entrega e so o conteudo/<AAAA-MM-DD>-<tema-curto>/carrossel.html completo e pronto (e a pasta img/ dentro dela, se usar imagem). O app renderiza o PNG sob demanda quando o usuario baixa a peca, entao o render aqui nao serve pra nada.",
  );

  linhas.push(
    "- Modo direto: o Cerebro do negocio e todas as informacoes desta geracao ja foram dados. Nao faca nenhuma pergunta, nao ofereca opcoes nem menus, nao sugira /legenda nem outro comando no meio, nao peca confirmacao de estilo. Qualquer lacuna (angulo, numero de paginas, estilo quando nao veio) voce decide sozinho com base no Cerebro e segue ate o fim. Se o modelo escolhido pede imagem de capa e nao ha imagem disponivel, siga sem imagem: a capa funciona sem ela. A resposta final e curta, uma ou duas frases confirmando o caminho da pasta gerada, sem relatorio longo.",
  );

  return linhas.join("\n");
}
