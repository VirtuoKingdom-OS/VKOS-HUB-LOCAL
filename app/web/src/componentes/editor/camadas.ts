// A REGRA DE EMPILHAMENTO, sem DOM.
//
// Ela existe separada por dois motivos. O primeiro e que da pra testar: e
// aritmetica de ordem, e aritmetica de ordem errada foi exatamente o defeito
// que trouxe esta rodada. O segundo e que ela declara, num lugar so, a decisao
// que o editor tomou: no carrossel, empilhamento e z-index, NUNCA ordem no
// DOM.
//
// Por que isso importa. O painel antigo reordenava trocando os nos de lugar no
// DOM. Pra irmao fora do fluxo (absolute), trocar no DOM so muda quem pinta por
// cima, e funcionava. Pra irmao DE FLUXO (os textos dentro de um .wrap que e
// flex column), trocar no DOM reordena a coluna: o texto anda na pagina. O
// usuario pedia camada e recebia mudanca de posicao.

// Duas ordens diferentes aparecem aqui, e confundir as duas e o erro classico:
//
// - ORDEM VISUAL: do mais alto pro mais baixo no empilhamento. E a ordem que o
//   painel mostra, porque e assim que se le uma pilha de camadas.
// - Z-INDEX: numero maior pinta por cima. Ou seja, a ordem visual e
//   DECRESCENTE em z.

export interface AtribuicaoZ {
  id: string;
  z: number;
}

// Onde uma camada vai parar. O painel fala nesta lingua, e cada motor traduz:
// o do carrossel vira z-index (e reparenta quando o pai muda), o do site vira
// ordem no DOM, que la e o certo.
export interface DestinoCamada {
  // Conteiner de destino. Null e a raiz da pagina (o slide, ou a secao).
  paiId: string | null;
  // Posicao DENTRO do pai, contada de cima: 0 e o mais alto do grupo.
  indice: number;
}

// O minimo que o calculo de destino precisa saber de cada linha da lista.
//
// `nivel` e so o recuo do desenho. Quem manda de verdade e `paiId`, que e null
// na raiz: a lista tem PROFUNDIDADE QUALQUER desde 2026-07-31, e amarrar a
// regra ao numero do nivel foi justamente o que cegou bloco dentro de bloco.
export interface LinhaCamada {
  id: string;
  nivel: number;
  paiId: string | null;
}

// Os pontos de soltar de uma lista de camadas, um por FRESTA: a fresta k fica
// antes da linha k, e a ultima fica depois de tudo.
//
// A lista e plana mas a arvore nao e, entao a fresta sozinha nao diz o pai:
// quem diz e a linha que vem DEPOIS dela. Soltar logo acima de um filho e
// soltar dentro do conteiner dele, em qualquer profundidade.
export function calcularDestinos(linhas: LinhaCamada[]): DestinoCamada[] {
  const destinos: DestinoCamada[] = [];
  for (let k = 0; k < linhas.length; k++) {
    const paiId = linhas[k].paiId;
    let indice = 0;
    for (let j = 0; j < k; j++) {
      if (linhas[j].paiId === paiId) indice++;
    }
    destinos.push({ paiId, indice });
  }
  // A ultima fresta e sempre o fim da raiz: e o gesto de "tirar de dentro",
  // e ele precisa existir por mais fundo que o elemento esteja.
  destinos.push({
    paiId: null,
    indice: linhas.filter((l) => l.paiId === null).length,
  });
  return destinos;
}

// Move um item de uma posicao pra outra, preservando o resto da ordem.
// Devolve uma lista nova; nao mexe na de entrada.
export function moverNaOrdem<T>(lista: T[], de: number, para: number): T[] {
  if (de < 0 || de >= lista.length) return lista.slice();
  const destino = Math.max(0, Math.min(lista.length - 1, para));
  const copia = lista.slice();
  const [item] = copia.splice(de, 1);
  copia.splice(destino, 0, item);
  return copia;
}

// O z-index de uma posicao na ordem visual. O topo leva o maior numero.
//
// A escala e contigua e comeca em zero de proposito. Zero e o piso: z-index
// negativo em filho o pinta ATRAS do fundo do proprio pai, e num conteiner com
// fundo e blur, como o .wrap dos carrosseis, isso faz o texto sumir. Um bug
// que se descobre depois de salvo.
export function zDaPosicao(indice: number, total: number): number {
  return Math.max(0, total - 1 - indice);
}

// Dada a ordem visual atual dos irmaos e um movimento, devolve o z-index de
// cada um. A escala e reescrita inteira, e nao permutada entre os envolvidos:
// permutar so funciona quando os valores do template ja sao todos distintos, e
// no caso real eles nao sao (dentro do .wrap todo mundo e "auto", que le 0).
//
// Reescrever a escala inteira e seguro porque quem chama isola o pai antes: o
// z dos filhos passa a competir so entre eles. Sem esse isolamento, numero
// novo poderia atravessar elemento de fora do grupo.
export function reordenarEmpilhamento(
  idsDoTopoPraBaixo: string[],
  id: string,
  indiceDestino: number,
): AtribuicaoZ[] {
  const de = idsDoTopoPraBaixo.indexOf(id);
  if (de < 0) return [];
  const nova = moverNaOrdem(idsDoTopoPraBaixo, de, indiceDestino);
  return nova.map((idItem, i) => ({
    id: idItem,
    z: zDaPosicao(i, nova.length),
  }));
}

// A ordem visual mudou de fato? Serve pra nao gastar um passo de desfazer, nem
// sujar o HTML com z-index inline, num arrasto que terminou no mesmo lugar.
export function mudouAOrdem(
  idsDoTopoPraBaixo: string[],
  id: string,
  indiceDestino: number,
): boolean {
  const de = idsDoTopoPraBaixo.indexOf(id);
  if (de < 0) return false;
  const destino = Math.max(0, Math.min(idsDoTopoPraBaixo.length - 1, indiceDestino));
  return de !== destino;
}
