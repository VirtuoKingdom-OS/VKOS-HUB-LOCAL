// Mensagens ao vivo. Mesmo padrao do crm/aovivo.ts: quem grava avisa, quem
// esta com a tela aberta refaz o fetch.
//
// O AVISO NAO CARREGA TEXTO DE MENSAGEM. Nunca. O socket e broadcast pra todas
// as abas e o conteudo da conversa e o dado mais sensivel do CRM: ele viaja
// pela rota REST, com id na mao, e nao por notificacao. Aqui vao id e escopo,
// nada mais.
//
// O escopo separa duas leituras, nao duas telas:
//   conversas  a coluna da esquerda mudou (nasceu conversa, mudou status)
//   thread     o conteudo de uma conversa mudou (mensagem nova, marcada lida)
//
// "thread" implica "conversas": mensagem nova muda previa, ordem e nao lidas na
// lista tambem. O caminho contrario nao vale, entao mudar status de conversa
// nao faz thread aberta nenhuma reler.

import { transmitir } from "../nucleo/ws.js";

// A regra de "isto mudou alguma coisa?" e a mesma do CRM, entao mora la e e
// reusada aqui. Duas copias divergiriam no primeiro metodo novo.
export { deveAvisar } from "../crm/aovivo.js";

export type EscopoMensagens = "conversas" | "thread";

export interface AvisoMensagens {
  tipo: "mensagens:atualizadas";
  escopo: EscopoMensagens;
  // Qual conversa mudou. So id, pra aba decidir se a thread aberta e essa.
  conversaId?: string;
  // Id da aba que gravou, quando ela se identificou no cabecalho x-vkos-aba.
  // Volta no aviso pra ela nao recarregar por causa do proprio eco: a resposta
  // do proprio POST ja trouxe a mensagem.
  origem?: string;
}

// So as rotas que mexem no conteudo da conversa sao "thread". O resto e lista.
export function escopoDaRotaMensagens(padrao: string): EscopoMensagens {
  return padrao.endsWith("/mensagens") || padrao.endsWith("/lida")
    ? "thread"
    : "conversas";
}

export function montarAvisoMensagens(entrada: {
  escopo: EscopoMensagens;
  conversaId?: unknown;
  origem?: unknown;
}): AvisoMensagens {
  const conversaId = entrada.conversaId;
  const origem = entrada.origem;
  return {
    tipo: "mensagens:atualizadas",
    escopo: entrada.escopo,
    ...(typeof conversaId === "string" && conversaId ? { conversaId } : {}),
    ...(typeof origem === "string" && origem ? { origem } : {}),
  };
}

export function avisarMensagens(entrada: {
  escopo: EscopoMensagens;
  conversaId?: unknown;
  origem?: unknown;
}): void {
  transmitir(montarAvisoMensagens(entrada));
}
