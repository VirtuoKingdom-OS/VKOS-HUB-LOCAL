// Decisoes puras do gesto de edicao direta: onde a guia de alinhamento aparece,
// quanto o elemento gruda, e quando dois toques seguidos contam como um unico
// passo de desfazer. Nada aqui toca o DOM: entra numero, sai numero. E o que
// permite testar no runner sem navegador (tsx --test), no padrao de crm/logica.ts.

// Caixa em coordenadas do palco (px do slide), cantos em esquerda/topo.
export interface Caixa {
  esquerda: number;
  topo: number;
  largura: number;
  altura: number;
}

// Uma guia desenhada durante o arrasto. "posicao" e a coordenada da linha no
// eixo dela (x pra vertical, y pra horizontal). "de"/"ate" sao a extensao do
// segmento no OUTRO eixo: a linha cobre o movel e o vizinho com quem ele
// alinhou, como no Canva, em vez de atravessar a pagina inteira.
export interface Guia {
  eixo: "v" | "h";
  posicao: number;
  de: number;
  ate: number;
  // "centro" alinhou pelo meio, "borda" por um lado. So muda a leitura visual.
  tipo: "centro" | "borda";
}

export interface ResultadoAlinhamento {
  // Correcao a somar na posicao proposta pra grudar. Zero quando nao gruda.
  dx: number;
  dy: number;
  guias: Guia[];
}

// Ancoras de um eixo: os tres pontos que valem alinhamento (dois lados e o meio).
function ancorasX(c: Caixa): number[] {
  return [c.esquerda, c.esquerda + c.largura / 2, c.esquerda + c.largura];
}
function ancorasY(c: Caixa): number[] {
  return [c.topo, c.topo + c.altura / 2, c.topo + c.altura];
}

// O indice 1 e sempre o centro: e o que distingue guia de centro de guia de borda.
const CENTRO = 1;

interface Candidato {
  desloc: number;
  posicao: number;
  tipo: "centro" | "borda";
  alvo: Caixa;
}

// Melhor encaixe de um eixo: percorre as tres ancoras do movel contra as tres
// de cada referencia e fica com a de MENOR deslocamento dentro do limiar. No
// empate exato de distancia vence o alinhamento de centro, que e o que o olho
// espera; depois vence a referencia que apareceu primeiro na lista (o palco
// entra antes dos vizinhos, entao a pagina ganha do irmao).
function melhorEncaixe(
  ancorasMovel: number[],
  referencias: { caixa: Caixa; ancoras: number[] }[],
  limiar: number,
): Candidato | null {
  let melhor: Candidato | null = null;
  for (const ref of referencias) {
    for (let i = 0; i < ancorasMovel.length; i++) {
      for (let j = 0; j < ref.ancoras.length; j++) {
        const desloc = ref.ancoras[j] - ancorasMovel[i];
        if (Math.abs(desloc) > limiar) continue;
        const tipo: "centro" | "borda" = i === CENTRO && j === CENTRO ? "centro" : "borda";
        if (melhor === null) {
          melhor = { desloc, posicao: ref.ancoras[j], tipo, alvo: ref.caixa };
          continue;
        }
        const dist = Math.abs(desloc);
        const distMelhor = Math.abs(melhor.desloc);
        if (dist < distMelhor) {
          melhor = { desloc, posicao: ref.ancoras[j], tipo, alvo: ref.caixa };
        } else if (dist === distMelhor && tipo === "centro" && melhor.tipo !== "centro") {
          melhor = { desloc, posicao: ref.ancoras[j], tipo, alvo: ref.caixa };
        }
      }
    }
  }
  return melhor;
}

// Extensao do segmento da guia: do comeco do primeiro ao fim do ultimo, no eixo
// perpendicular, com uma folga pequena pra linha aparecer fora das duas caixas.
function extensao(a: number, tamA: number, b: number, tamB: number, folga: number): {
  de: number;
  ate: number;
} {
  return {
    de: Math.min(a, b) - folga,
    ate: Math.max(a + tamA, b + tamB) + folga,
  };
}

// Calcula o alinhamento de um elemento arrastado contra o palco e os vizinhos.
// Todas as caixas no MESMO sistema de coordenadas (px do slide). O limiar ja
// deve vir convertido pra esse sistema por quem chama (px de tela / escala).
// Um eixo gruda no maximo uma vez: e o encaixe mais proximo, nunca a soma.
export function calcularAlinhamento(
  movel: Caixa,
  vizinhos: Caixa[],
  palco: Caixa,
  limiar: number,
  folgaGuia = 8,
): ResultadoAlinhamento {
  if (limiar <= 0) return { dx: 0, dy: 0, guias: [] };
  // O palco entra primeiro: alinhar com a pagina vale mais que com um irmao.
  const refs = [palco, ...vizinhos];
  const refsX = refs.map((c) => ({ caixa: c, ancoras: ancorasX(c) }));
  const refsY = refs.map((c) => ({ caixa: c, ancoras: ancorasY(c) }));

  const emX = melhorEncaixe(ancorasX(movel), refsX, limiar);
  const emY = melhorEncaixe(ancorasY(movel), refsY, limiar);

  const guias: Guia[] = [];
  if (emX) {
    const ext = extensao(movel.topo, movel.altura, emX.alvo.topo, emX.alvo.altura, folgaGuia);
    guias.push({ eixo: "v", posicao: emX.posicao, de: ext.de, ate: ext.ate, tipo: emX.tipo });
  }
  if (emY) {
    const ext = extensao(
      movel.esquerda,
      movel.largura,
      emY.alvo.esquerda,
      emY.alvo.largura,
      folgaGuia,
    );
    guias.push({ eixo: "h", posicao: emY.posicao, de: ext.de, ate: ext.ate, tipo: emY.tipo });
  }
  return { dx: emX?.desloc ?? 0, dy: emY?.desloc ?? 0, guias };
}

// ===== Agrupamento de passos no desfazer.
// Vinte toques de seta nao podem valer vinte passos: a pilha tem tamanho fixo e
// o usuario perderia toda a historia anterior movendo um titulo 20px. Um toque
// continua o gesto anterior quando e a MESMA acao, no MESMO elemento, e chegou
// dentro da janela de tempo. Qualquer troca quebra o agrupamento.
export interface PassoGesto {
  // Identifica a natureza da acao ("seta", "texto:a12", "cor"...).
  acao: string;
  // Identifica o alvo (o data-vk do elemento). Vazio conta como alvo distinto.
  alvo: string;
  // Instante em milissegundos.
  momento: number;
}

// 500 ms e o numero de consenso das bibliotecas de historico: newGroupDelay do
// prosemirror-history e do @codemirror/commands, captureTimeout do Yjs.
export const JANELA_GESTO_MS = 500;

export function deveAgruparPasso(
  anterior: PassoGesto | null,
  atual: PassoGesto,
  janelaMs = JANELA_GESTO_MS,
): boolean {
  if (!anterior) return false;
  if (anterior.acao !== atual.acao) return false;
  if (!anterior.alvo || anterior.alvo !== atual.alvo) return false;
  const espera = atual.momento - anterior.momento;
  if (espera < 0) return false;
  return espera <= janelaMs;
}
