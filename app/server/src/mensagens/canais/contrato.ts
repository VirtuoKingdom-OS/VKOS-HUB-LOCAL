// Contrato interno dos canais de mensagem.
//
// Espelha provedores/contrato.ts, que ja provou no repositorio que da pra
// trocar o motor sem tocar no nucleo. O nucleo (estado.ts) cuida de conversa,
// indice, thread, idempotencia e ordem. O canal cuida do que e especifico dele:
// como uma mensagem nasce, como ela sai, como ela chega e quando a janela de
// resposta livre esta aberta.
//
// So o canal "manual" esta implementado. O contrato ja acomoda, SEM implementar
// nada agora: envio assincrono com status mudando por callback, template quando
// a janela de 24 horas fecha, e recebimento por webhook. A regra do produto e
// que biblioteca nao oficial de WhatsApp esta proibida no caminho padrao (ver
// docs/decisoes/2026-07-27-whatsapp-api-oficial-e-coexistence.md).
//
// METODO OPCIONAL AUSENTE SIGNIFICA "ESTE CANAL NAO FAZ ISSO". Quem chama
// confere antes; ninguem finge que fez.

import type {
  AnexoMensagem,
  AutorMensagem,
  Conversa,
  DirecaoMensagem,
  IdCanal,
  Mensagem,
  OrigemMensagem,
  StatusMensagem,
  TipoMensagem,
} from "../modelo.js";

// O que o canal consegue fazer. A tela le isto pra decidir o que mostrar, em
// vez de perguntar "o canal e manual?" espalhado por dez lugares.
export interface CapacidadesCanal {
  // Entrega de verdade ao destinatario. O manual e false: o Hub so registra o
  // que ja aconteceu por fora.
  envioReal: boolean;
  // Existe janela de resposta livre que fecha sozinha (as 24 horas do
  // WhatsApp). Com true, a thread mostra o relogio e troca o composer por
  // seletor de template quando fecha.
  janela24h: boolean;
  // Aceita mensagem de tipo "template".
  templates: boolean;
  // Mensagem recebida chega por webhook do provedor.
  recebePorWebhook: boolean;
  // Aceita anexo com arquivo local.
  anexos: boolean;
}

// Pedido ja normalizado pelo nucleo: tipos conferidos, datas em ISO, textos
// aparados. O canal recebe isto pronto e so decide o que e dele.
export interface PedidoMensagem {
  conversaId: string;
  direcao: DirecaoMensagem;
  texto: string;
  tipo: TipoMensagem;
  privada: boolean;
  autorTipo?: AutorMensagem;
  origem?: OrigemMensagem;
  // Quando aconteceu no mundo real. Ausente vale "agora".
  enviadaEm?: string;
  idExterno?: string;
  chaveIdempotencia: string;
  respondeA?: string;
  anexos: AnexoMensagem[];
  payloadBruto?: unknown;
  // Instante da gravacao, injetado pelo nucleo pra criadaEm e enviadaEm
  // padrao cairem no mesmo carimbo.
  agora: string;
}

// Uma mensagem recebida, ja traduzida do payload do provedor. Ainda nao tem
// conversa: o nucleo resolve (ou cria) contato e conversa pelo identificador.
export interface RecebimentoCanal {
  identificadorExterno: string;
  // Nome que o provedor informou, quando informou. Serve pro contato novo nao
  // nascer so com um numero de telefone como nome.
  nomeSugerido?: string;
  pedido: Omit<PedidoMensagem, "conversaId" | "agora">;
}

export interface ResultadoDespacho {
  // Id do provedor (wamid). Volta pra gravar em idExterno.
  idExterno?: string;
  // Status depois do aceite do provedor. Tipicamente "na-fila".
  status: StatusMensagem;
  erroCodigo?: string;
  erroTexto?: string;
}

// Mudanca de status vinda do provedor por callback.
export interface AtualizacaoStatus {
  idExterno: string;
  status: StatusMensagem;
  em: string;
  erroCodigo?: string;
  erroTexto?: string;
}

export interface CanalMensagens {
  id: IdCanal;
  rotulo: string;
  capacidades: CapacidadesCanal;

  // Monta a mensagem completa a partir do pedido. Puro: nao grava, nao envia,
  // nao acessa rede.
  //
  // GARANTE: mensagem valida, com id local proprio (nunca do provedor),
  // chaveIdempotencia preenchida e status inicial coerente com o canal.
  // NAO GARANTE: que a mensagem foi enviada, entregue ou lida por alguem. O
  // status inicial e uma afirmacao sobre o canal, nao sobre o destinatario.
  //
  // Lanca ErroMensagens quando o pedido pede algo que este canal nao expressa
  // (por exemplo template num canal sem templates).
  montarMensagem(pedido: PedidoMensagem): Mensagem;

  // Entrega ao provedor de verdade. AUSENTE no canal manual: ele nao envia
  // nada, so registra o que ja aconteceu.
  //
  // GARANTE apenas que o provedor aceitou o pedido, e devolve o idExterno e o
  // status desse aceite.
  // NAO GARANTE entrega nem leitura: os dois chegam depois, e assincronos, por
  // interpretarStatus. Quem chama grava o retorno e espera o callback, nunca
  // trata "aceito" como "entregue".
  despachar?(mensagem: Mensagem): Promise<ResultadoDespacho>;

  // Traduz o payload cru de um webhook em mensagens recebidas. Puro, sem
  // efeito colateral: quem grava e o nucleo.
  //
  // GARANTE: uma lista, possivelmente vazia, so com o que este canal entende.
  // NAO GARANTE unicidade entre chamadas: o provedor reenvia webhook, entao o
  // nucleo deduplica por idExterno na hora de gravar.
  interpretarRecebimento?(payload: unknown): RecebimentoCanal[];

  // Traduz a confirmacao de status do provedor. Mesma regra: puro, e o nucleo
  // grava a versao nova da mensagem como linha nova com o mesmo id.
  interpretarStatus?(payload: unknown): AtualizacaoStatus[];

  // A janela de resposta livre esta aberta? So faz sentido com
  // capacidades.janela24h. AUSENTE significa "sem janela": pode responder
  // sempre.
  //
  // A conta sai de conversa.ultimaEntradaEm, que e a unica fonte da janela.
  janelaAberta?(conversa: Conversa, agora?: Date): boolean;
}
