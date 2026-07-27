// Ponte de tipos das conversas entre o web e o servidor.
//
// Mesmo motivo do tipos/crm.ts, e o mesmo desenho. A tela do chat nao declara a
// propria copia de Mensagem nem de Conversa: se o servidor mudar um campo, o
// "npm run checar -w web" quebra na hora em vez de a tela quebrar em runtime.
//
// A importacao e SO DE TIPO, entao o esbuild do Vite apaga o arquivo inteiro do
// bundle e nenhum modulo de Node entra no navegador. Este arquivo e o tipos/crm.ts
// sao os unicos pontos do web que atravessam a fronteira.
//
// O que NAO vem daqui: o corpo das requisicoes que a tela envia. Isso mora em
// api/mensagens.ts, pelo mesmo motivo dos Dados* do CRM: nao e entidade, e o
// formato do que a tela manda.

// Trava de versao do indice de conversas, so no nivel de tipo. O web foi escrito
// contra a v1 do indice. Subiu pra v2 no servidor, esta linha para de compilar e
// alguem e obrigado a olhar a tela antes de o usuario descobrir sozinho.
type Confere<Esperado, Real extends Esperado> = Real;
export type VersaoMensagensDoWeb = Confere<
  1,
  typeof import("../../../server/src/mensagens/modelo").VERSAO_MENSAGENS_ATUAL
>;

export type {
  AnexoMensagem,
  AutorMensagem,
  Conversa,
  DirecaoMensagem,
  IdCanal,
  IndiceMensagens,
  Mensagem,
  OrigemMensagem,
  StatusConversa,
  StatusMensagem,
  TipoMensagem,
} from "../../../server/src/mensagens/modelo";

// Envelopes de resposta. Continuam vindo do servidor porque a tela le campo por
// campo deles (temMais, cursorAnterior, linhasInvalidas): uma copia local
// envelheceria em silencio igual as entidades envelheceram antes.
export type {
  ItemLinhaDoTempo,
  PaginaConversa,
} from "../../../server/src/mensagens/estado";

// O que cada canal consegue fazer. A TELA LE DAQUI, nunca do nome do canal:
// e o que faz o relogio da janela de 24 horas e o seletor de template
// aparecerem sozinhos quando o WhatsApp entrar, sem um "if (canal ===
// 'whatsapp')" espalhado por dez arquivos.
export type { CapacidadesCanal } from "../../../server/src/mensagens/canais/contrato";

export type {
  AvisoMensagens,
  EscopoMensagens,
} from "../../../server/src/mensagens/aovivo";
