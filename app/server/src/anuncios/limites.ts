// Os limites do Google Ads e a conferencia deles. Puro: sem Zod, sem disco, sem
// rede. Recebe uma peca, devolve a lista de violacoes.
//
// Nada aqui reprova uma peca. O schema (modelo.ts) diz se aquilo E um anuncio; o
// que esta neste arquivo diz o que o dono precisa VER antes de colar no painel
// do Google.

import type { PecaAnuncio } from "./modelo.js";

// Uma violacao endereçavel pela tela.
//
// caminho: onde o campo mora na peca, no formato
//   campanha.grupos[1].anuncios[0].titulos[6]. A tela usa isso pra marcar o
//   campo exato, entao o formato e contrato.
// gravidade "erro": o texto passou do limite de caracteres. valor tem o texto,
//   tamanho tem quantos caracteres ele tem, limite tem o maximo do Google.
// gravidade "aviso": a QUANTIDADE de itens saiu da faixa. valor fica vazio,
//   tamanho tem quantos itens existem, limite tem a ponta da faixa que estourou.
export interface Violacao {
  caminho: string;
  campo: string;
  valor: string;
  limite: number;
  tamanho: number;
  gravidade: "erro" | "aviso";
}

interface RegraCampo {
  // Rotulo do campo, pra mensagem e pro agrupamento na tela.
  campo: string;
  maxCaracteres: number;
  minQuantidade: number;
  maxQuantidade?: number;
}

// Limites do Google Ads para campanhas de rede de busca, conferidos em JULHO DE
// 2026. O Google muda esses numeros sem avisar ninguem: quando um campo comecar
// a ser recusado no painel com a tela dizendo que esta tudo certo, o valor a
// conferir e este aqui, e a data acima diz quao velho ele esta.
export const LIMITES_GOOGLE = {
  titulos: { campo: "Título", maxCaracteres: 30, minQuantidade: 3, maxQuantidade: 15 },
  descricoes: { campo: "Descrição", maxCaracteres: 90, minQuantidade: 2, maxQuantidade: 4 },
  caminhos: { campo: "Caminho de exibição", maxCaracteres: 15, minQuantidade: 0, maxQuantidade: 2 },
  sitelinks: { campo: "Texto do sitelink", maxCaracteres: 25, minQuantidade: 4 },
  descricoesSitelink: {
    campo: "Descrição do sitelink",
    maxCaracteres: 35,
    minQuantidade: 2,
    maxQuantidade: 2,
  },
  frasesDestaque: { campo: "Frase de destaque", maxCaracteres: 25, minQuantidade: 4 },
  valoresSnippet: { campo: "Valor de snippet", maxCaracteres: 25, minQuantidade: 3 },
} as const satisfies Record<string, RegraCampo>;

// Conta por ponto de codigo visivel, nao pelo .length de UTF-16. Emoji e acento
// composto ocupam duas unidades no .length e contam UMA no painel do Google:
// contar errado aqui acusa violacao que nao existe.
export function contarCaracteres(texto: string): number {
  return Array.from(texto).length;
}

// Um texto contra o limite de caracteres.
function conferirTexto(
  saida: Violacao[],
  caminho: string,
  texto: string,
  regra: RegraCampo,
): void {
  const tamanho = contarCaracteres(texto);
  if (tamanho <= regra.maxCaracteres) return;
  saida.push({
    caminho,
    campo: regra.campo,
    valor: texto,
    limite: regra.maxCaracteres,
    tamanho,
    gravidade: "erro",
  });
}

// A quantidade de itens contra a faixa do Google. Faltar item e o caso comum e
// e so aviso: campanha com 2 titulos publica, so publica pior.
function conferirQuantidade(
  saida: Violacao[],
  caminho: string,
  quantidade: number,
  regra: RegraCampo,
): void {
  const passouDoTeto = regra.maxQuantidade !== undefined && quantidade > regra.maxQuantidade;
  if (quantidade >= regra.minQuantidade && !passouDoTeto) return;
  saida.push({
    caminho,
    campo: regra.campo,
    valor: "",
    limite: passouDoTeto ? (regra.maxQuantidade as number) : regra.minQuantidade,
    tamanho: quantidade,
    gravidade: "aviso",
  });
}

// Uma lista de textos: cada item contra o limite de caracteres, e a quantidade
// contra a faixa. O caminho da lista vem pronto do chamador.
function conferirLista(
  saida: Violacao[],
  caminhoLista: string,
  itens: string[],
  regra: RegraCampo,
): void {
  itens.forEach((texto, indice) => {
    conferirTexto(saida, `${caminhoLista}[${indice}]`, texto, regra);
  });
  conferirQuantidade(saida, caminhoLista, itens.length, regra);
}

// Percorre a peca inteira e devolve tudo que estoura limite ou sai da faixa de
// quantidade. Ordem de leitura da tela: os anuncios por grupo, depois os
// recursos.
export function conferirLimites(peca: PecaAnuncio): Violacao[] {
  const violacoes: Violacao[] = [];

  peca.campanha.grupos.forEach((grupo, indiceGrupo) => {
    grupo.anuncios.forEach((anuncio, indiceAnuncio) => {
      const base = `campanha.grupos[${indiceGrupo}].anuncios[${indiceAnuncio}]`;
      conferirLista(violacoes, `${base}.titulos`, anuncio.titulos, LIMITES_GOOGLE.titulos);
      conferirLista(violacoes, `${base}.descricoes`, anuncio.descricoes, LIMITES_GOOGLE.descricoes);
      conferirLista(violacoes, `${base}.caminhos`, anuncio.caminhos, LIMITES_GOOGLE.caminhos);
    });
  });

  peca.recursos.sitelinks.forEach((sitelink, indice) => {
    const base = `recursos.sitelinks[${indice}]`;
    conferirTexto(violacoes, `${base}.texto`, sitelink.texto, LIMITES_GOOGLE.sitelinks);
    conferirLista(
      violacoes,
      `${base}.descricoes`,
      sitelink.descricoes,
      LIMITES_GOOGLE.descricoesSitelink,
    );
  });
  // Quantos sitelinks a campanha tem. Vai no caminho da lista inteira porque nao
  // e problema de um sitelink, e de faltar sitelink.
  conferirQuantidade(
    violacoes,
    "recursos.sitelinks",
    peca.recursos.sitelinks.length,
    LIMITES_GOOGLE.sitelinks,
  );

  conferirLista(
    violacoes,
    "recursos.frasesDestaque",
    peca.recursos.frasesDestaque,
    LIMITES_GOOGLE.frasesDestaque,
  );

  peca.recursos.snippets.forEach((snippet, indice) => {
    conferirLista(
      violacoes,
      `recursos.snippets[${indice}].valores`,
      snippet.valores,
      LIMITES_GOOGLE.valoresSnippet,
    );
  });

  return violacoes;
}
