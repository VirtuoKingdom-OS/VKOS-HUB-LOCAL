// Canal manual: o dono registra o que foi dito por fora, com data retroativa.
//
// E a implementacao completa da v1 e o unico canal registrado. O valor dele nao
// depende de integracao nenhuma: um prestador que registra a conversa no lugar
// certo ja ganha, porque o historico fica junto do funil, a conversa se liga ao
// negocio e a linha do tempo do cliente para de morar na cabeca dele.
//
// Ele tambem e a prova da modelagem. Se o modelo estiver errado, o erro aparece
// com dez conversas de teste, nao com o historico real do negocio dentro.
//
// O que este canal NAO faz, e nao finge fazer: nao envia, nao recebe webhook,
// nao tem janela de 24 horas e nao tem template. Os metodos correspondentes do
// contrato ficam AUSENTES, nao vazios: ausente e uma resposta clara, metodo
// vazio e uma mentira silenciosa.

import {
  ErroMensagens,
  novoIdMensagem,
  type AutorMensagem,
  type Mensagem,
  type StatusMensagem,
} from "../modelo.js";
import type { CanalMensagens, PedidoMensagem } from "./contrato.js";

// Quem falou, quando o pedido nao disse. Entrada e o contato, saida e o dono.
function autorPadrao(pedido: PedidoMensagem): AutorMensagem {
  return pedido.direcao === "entrada" ? "contato" : "usuario";
}

// Status de quem registra o passado.
//
// Nota privada fica em "rascunho": ela nunca sai pro contato, entao nao existe
// envio nenhum pra afirmar. Entrada nasce "entregue": ela chegou, e nao tem
// ciclo de envio. Saida nasce "enviada": o usuario esta contando que mandou. O
// Hub nao inventa "entregue" nem "lida" pro que saiu, porque nao tem como saber.
function statusInicial(pedido: PedidoMensagem): StatusMensagem {
  if (pedido.privada) return "rascunho";
  return pedido.direcao === "entrada" ? "entregue" : "enviada";
}

export const canalManual: CanalMensagens = {
  id: "manual",
  rotulo: "Registro manual",
  capacidades: {
    envioReal: false,
    janela24h: false,
    templates: false,
    recebePorWebhook: false,
    anexos: true,
  },

  montarMensagem(pedido: PedidoMensagem): Mensagem {
    if (pedido.tipo === "template") {
      throw new ErroMensagens(
        "O registro manual nao tem templates. Template so existe em canal com envio real.",
        400,
      );
    }
    const enviadaEm = pedido.enviadaEm ?? pedido.agora;
    const mensagem: Mensagem = {
      // Id local, gerado aqui. Nunca vem de fora, em canal nenhum.
      id: novoIdMensagem(),
      conversaId: pedido.conversaId,
      direcao: pedido.direcao,
      canal: "manual",
      // Toda linha deste canal e memoria do usuario, nunca verdade do
      // provedor. Por isso a origem e fixa, mesmo se o pedido disser outra
      // coisa: sem isso o historico perderia a distincao que o campo existe
      // pra guardar.
      origem: "manual",
      tipo: pedido.tipo,
      texto: pedido.texto,
      privada: pedido.privada,
      status: statusInicial(pedido),
      chaveIdempotencia: pedido.chaveIdempotencia,
      autorTipo: pedido.autorTipo ?? autorPadrao(pedido),
      enviadaEm,
      criadaEm: pedido.agora,
      anexos: pedido.anexos,
    };
    // Entrada registrada a mao chegou quando o usuario disse que chegou. Saida
    // fica sem entregueEm: ninguem confirmou entrega nenhuma.
    if (pedido.direcao === "entrada" && !pedido.privada) mensagem.entregueEm = enviadaEm;
    if (pedido.idExterno) mensagem.idExterno = pedido.idExterno;
    if (pedido.respondeA) mensagem.respondeA = pedido.respondeA;
    if (pedido.payloadBruto !== undefined) mensagem.payloadBruto = pedido.payloadBruto;
    return mensagem;
  },

  // despachar: ausente. Este canal nao envia.
  // interpretarRecebimento: ausente. Este canal nao recebe webhook.
  // interpretarStatus: ausente. Nao ha provedor pra confirmar status.
  // janelaAberta: ausente. Sem janela, pode registrar sempre.
};
