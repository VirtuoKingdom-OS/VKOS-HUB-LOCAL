// Montagem do prompt de geracao de imagem, sem React e sem DOM.
//
// O runner de teste deste projeto nao tem DOM, entao tudo que decide alguma
// coisa mora aqui e e testado de verdade. O hook so entrega os dados e dispara
// a sessao. Mesmo desenho de componentes/core/logica.ts.
//
// O prompt e escrito sem acento de proposito: ele viaja pela linha de comando
// do provedor. A descricao do usuario passa como veio, porque e o pedido dele.

export interface PedidoImagem {
  // Subpasta da peca, ex "2026-07-14-tema-curto".
  pasta: string;
  // Caminho relativo dentro da peca, ex "img/vkos-ia-abc.png".
  caminhoRelativo: string;
  // Texto extraido do elemento no DOM. Apoio, nunca ordem.
  contexto: string;
  // O que o usuario escreveu no campo. Opcional: vazio mantem o fluxo rapido.
  descricao?: string;
}

// Um texto de DOM chega com quebra de linha e espaco duplo aos montes. Uma
// linha so, e com teto: prompt gigante custa token e afoga a instrucao.
const LIMITE_CONTEXTO = 2400;
const LIMITE_DESCRICAO = 1200;

export function normalizarTexto(valor: string, limite: number): string {
  return valor.replace(/\s+/g, " ").trim().slice(0, limite);
}

export function montarPromptImagem(pedido: PedidoImagem): string {
  const contexto = normalizarTexto(pedido.contexto ?? "", LIMITE_CONTEXTO);
  const descricao = normalizarTexto(pedido.descricao ?? "", LIMITE_DESCRICAO);

  const linhas = [
    "Use explicitamente $imagegen para gerar uma unica imagem original.",
    `Salve o bitmap final EXATAMENTE em conteudo/${pedido.pasta}/${pedido.caminhoRelativo}.`,
    "Nao edite HTML, CSS, markdown nem qualquer outro arquivo. Nao crie variantes.",
  ];

  if (descricao) {
    linhas.push(
      `O usuario descreveu a imagem que quer: ${descricao}`,
      "Esse pedido do usuario MANDA. O contexto visual abaixo e so apoio de " +
        "estilo e de assunto: onde ele discordar do pedido, siga o pedido.",
      "A imagem precisa seguir o Cerebro do negocio, sem texto ou logotipo inventado.",
    );
  } else {
    linhas.push(
      "A imagem precisa seguir o Cerebro do negocio e representar o contexto do elemento, sem texto ou logotipo inventado.",
    );
  }

  linhas.push(
    `Contexto visual: ${contexto || "imagem de apoio coerente com a peca"}.`,
    "Ao terminar, responda apenas com o caminho salvo.",
  );

  return linhas.join("\n");
}
