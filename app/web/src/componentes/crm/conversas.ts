// Regras do chat do CRM, do lado da tela.
//
// Fica separado dos componentes pelo mesmo motivo do aovivo.ts: o teste do web
// roda em `tsx --test`, sem DOM, entao toda decisao que importa so pode ser
// provada se for funcao pura. O que precisa de prova aqui:
//
// - quando a recarga ao vivo entra e quando ela espera;
// - a conta da janela de 24 horas, a partir de ultimaEntradaEm;
// - o agrupamento da thread por dia;
// - rolar ou nao rolar quando chega mensagem;
// - o payload do composer, com retroativo e chave de idempotencia.
//
// Nada aqui toca fetch, DOM ou React.

import type {
  AnexoMensagem,
  AvisoMensagens,
  CapacidadesCanal,
  Conversa,
  DirecaoMensagem,
  Mensagem,
} from "../../tipos/mensagens";

// ------------------------------------------------------------------ ao vivo

export interface SituacaoDaAbaConversas {
  // O cursor esta num campo cujo valor VEM DO SERVIDOR: titulo do negocio,
  // valor, proxima acao, tag. Recarregar agora e o unico jeito de perder o que
  // a pessoa esta escrevendo.
  //
  // O COMPOSER NAO CONTA, de proposito. O texto dele e estado local da tela,
  // nao reflexo de um campo do servidor, entao reler a thread nao encosta nele.
  // Se o composer contasse, a conversa congelaria exatamente enquanto se
  // digita, que e o momento em que a resposta do outro lado costuma chegar.
  editandoCampoDeDados: boolean;
  // Uma gravacao desta aba ainda nao voltou. Ler no meio traz o estado de antes
  // dela.
  gravando: boolean;
}

export interface RecargaConversas {
  // Reler a coluna da esquerda.
  lista: boolean;
  // Conversas cuja thread mudou. Thread fechada nao precisa reler nada.
  threadDe: string[];
  // Reconexao: nao da pra saber quais mudaram enquanto o socket esteve fora.
  threadDeTodas: boolean;
}

export interface SincronizadorConversas {
  receber(aviso: AvisoMensagens): void;
  pendente(): boolean;
  // Devolve a recarga e zera a pendencia, ou null quando ainda nao da.
  // Devolver null NUNCA perde o que estava pendente.
  tomar(situacao: SituacaoDaAbaConversas): RecargaConversas | null;
}

function vazia(): RecargaConversas {
  return { lista: false, threadDe: [], threadDeTodas: false };
}

function temAlgo(recarga: RecargaConversas): boolean {
  return recarga.lista || recarga.threadDeTodas || recarga.threadDe.length > 0;
}

export function criarSincronizadorConversas(idDestaAba: string): SincronizadorConversas {
  let acumulada = vazia();

  return {
    receber(aviso: AvisoMensagens): void {
      // Aviso da propria aba nao vira pendencia: a resposta do proprio POST ja
      // trouxe a mensagem, entao recarregar por causa dele e trabalho jogado
      // fora a cada mensagem enviada.
      if (aviso.origem && aviso.origem === idDestaAba) return;

      // "thread" IMPLICA "conversas": mensagem nova muda previa, ordem e nao
      // lidas na lista tambem. O caminho contrario nao vale.
      acumulada.lista = true;
      if (aviso.escopo !== "thread") return;
      if (!aviso.conversaId) {
        acumulada.threadDeTodas = true;
        return;
      }
      if (!acumulada.threadDe.includes(aviso.conversaId)) {
        acumulada.threadDe.push(aviso.conversaId);
      }
    },

    pendente(): boolean {
      return temAlgo(acumulada);
    },

    tomar(situacao: SituacaoDaAbaConversas): RecargaConversas | null {
      if (!temAlgo(acumulada)) return null;
      if (situacao.editandoCampoDeDados || situacao.gravando) return null;
      const recarga = acumulada;
      acumulada = vazia();
      return recarga;
    },
  };
}

// A thread aberta precisa ser relida por causa desta recarga.
export function relerThread(recarga: RecargaConversas, abertaId: string | null): boolean {
  if (!abertaId) return false;
  return recarga.threadDeTodas || recarga.threadDe.includes(abertaId);
}

// ------------------------------------------------------- janela de 24 horas

export const JANELA_24H_MS = 24 * 60 * 60 * 1000;

export interface EstadoJanela {
  // A tela desenha o relogio? So quando o CANAL declara que tem janela. Nao
  // existe "if (canal === 'whatsapp')" em lugar nenhum: e a capacidade que
  // manda, entao o relogio nasce sozinho no dia que o canal real entrar.
  visivel: boolean;
  // Da pra escrever livremente agora.
  aberta: boolean;
  restanteMs: number;
  rotulo: string;
}

function rotuloDeDuracao(ms: number): string {
  const minutos = Math.max(0, Math.floor(ms / 60000));
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas > 0) return resto > 0 ? `${horas} h ${resto} min` : `${horas} h`;
  if (minutos > 1) return `${minutos} min`;
  return "menos de 1 min";
}

// A conta da janela sai de conversa.ultimaEntradaEm, que e a unica fonte dela:
// quando o CONTATO falou por ultimo. Nota privada e mensagem de saida nao
// contam, e o servidor ja garante isso ao mover o campo.
export function calcularJanela24h(
  conversa: Pick<Conversa, "ultimaEntradaEm">,
  capacidades: Pick<CapacidadesCanal, "janela24h"> | null | undefined,
  agora: Date,
): EstadoJanela {
  // Canal sem janela: pode responder sempre, e a tela nao mostra relogio
  // nenhum. E o caso do canal manual de hoje.
  if (!capacidades?.janela24h) {
    return { visivel: false, aberta: true, restanteMs: 0, rotulo: "" };
  }
  const entrada = conversa.ultimaEntradaEm ? Date.parse(conversa.ultimaEntradaEm) : NaN;
  if (Number.isNaN(entrada)) {
    return {
      visivel: true,
      aberta: false,
      restanteMs: 0,
      rotulo: "Sem janela: o contato ainda não escreveu",
    };
  }
  const restanteMs = entrada + JANELA_24H_MS - agora.getTime();
  if (restanteMs <= 0) {
    return { visivel: true, aberta: false, restanteMs: 0, rotulo: "Janela fechada" };
  }
  return {
    visivel: true,
    aberta: true,
    restanteMs,
    rotulo: `Janela aberta por ${rotuloDeDuracao(restanteMs)}`,
  };
}

// ------------------------------------------------------- agrupar por dia

export interface GrupoDeDia {
  // AAAA-MM-DD no fuso local. Serve de key do React e de comparacao.
  chave: string;
  rotulo: string;
  mensagens: Mensagem[];
}

function chaveDoDia(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function rotuloDoDia(chave: string, hoje: Date): string {
  const chaveHoje = chaveDoDia(hoje);
  if (chave === chaveHoje) return "Hoje";
  const ontem = new Date(hoje.getTime());
  ontem.setDate(ontem.getDate() - 1);
  if (chave === chaveDoDia(ontem)) return "Ontem";
  const [ano, mes, dia] = chave.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Quebra a thread em blocos de dia, pela data em que a mensagem aconteceu no
// mundo real (enviadaEm), nao pela ordem do arquivo. Um registro retroativo cai
// no dia dele, que e o ponto inteiro de o modelo separar enviadaEm de criadaEm.
//
// A ordem de entrada e preservada: quem chama ja recebe a thread ordenada.
export function agruparPorDia(mensagens: readonly Mensagem[], hoje: Date): GrupoDeDia[] {
  const grupos: GrupoDeDia[] = [];
  for (const mensagem of mensagens) {
    const data = new Date(mensagem.enviadaEm);
    // Data ilegivel nao derruba a thread: a mensagem cai no bloco anterior em
    // vez de sumir da tela.
    const chave = Number.isNaN(data.getTime())
      ? grupos[grupos.length - 1]?.chave ?? chaveDoDia(hoje)
      : chaveDoDia(data);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave) ultimo.mensagens.push(mensagem);
    else grupos.push({ chave, rotulo: rotuloDoDia(chave, hoje), mensagens: [mensagem] });
  }
  return grupos;
}

// --------------------------------------------------------------- rolagem

// Folga em pixels pra "esta no fim" continuar valendo. Sem ela, dois pixels de
// inercia de rolagem ja fariam a tela decidir que a pessoa subiu no historico.
export const FOLGA_DO_FIM = 80;

export interface Rolagem {
  topo: number;
  alturaVisivel: number;
  alturaTotal: number;
}

export function estaNoFim(rolagem: Rolagem, folga = FOLGA_DO_FIM): boolean {
  return rolagem.alturaTotal - rolagem.topo - rolagem.alturaVisivel <= folga;
}

export interface ChegadaNaThread {
  // A thread abriu agora. Ela sempre comeca embaixo.
  primeiraCarga: boolean;
  // A mensagem saiu deste composer.
  ehPropria: boolean;
  // A pessoa ja estava no fim antes da mensagem chegar.
  estavaNoFim: boolean;
  // Ela subiu pra ler historico antigo. Pular pro fim agora e roubar a leitura.
  lendoHistorico: boolean;
}

// Rolar ou nao rolar quando a thread muda.
//
// A regra que se quebra em todo chat mal feito: mensagem de outra pessoa NAO
// arrasta a tela de quem esta lendo o historico. So arrasta quem ja estava no
// fim, ou quem acabou de mandar (que quer ver o que mandou).
export function deveRolarParaOFim(chegada: ChegadaNaThread): boolean {
  if (chegada.primeiraCarga) return true;
  if (chegada.ehPropria) return true;
  if (chegada.lendoHistorico) return false;
  return chegada.estavaNoFim;
}

// ------------------------------------------------------ payload do composer

export interface RascunhoComposer {
  texto: string;
  direcao: DirecaoMensagem;
  // Valor cru de um input datetime-local ("AAAA-MM-DDTHH:mm"), no fuso local.
  // Vazio significa agora, e o servidor carimba.
  retroativoEm?: string;
  privada?: boolean;
  anexos?: AnexoMensagem[];
  // Nasce na tela, antes do envio. Sem ela, clique duplo e retentativa de rede
  // gravariam a mesma mensagem duas vezes.
  chaveIdempotencia: string;
}

export interface PayloadMensagem {
  direcao: DirecaoMensagem;
  texto: string;
  privada: boolean;
  chaveIdempotencia: string;
  enviadaEm?: string;
  anexos?: AnexoMensagem[];
}

// Monta o corpo do POST. Devolve null quando nao ha o que mandar: mensagem sem
// texto so passa com anexo, e o servidor recusaria de qualquer jeito. Decidir
// aqui deixa o botao saber que esta desabilitado sem duplicar a regra.
export function montarPayloadComposer(
  rascunho: RascunhoComposer,
  agora: Date,
): PayloadMensagem | null {
  const texto = rascunho.texto.trim();
  const anexos = rascunho.anexos ?? [];
  if (!texto && anexos.length === 0) return null;

  const payload: PayloadMensagem = {
    direcao: rascunho.direcao,
    texto,
    privada: rascunho.privada === true,
    chaveIdempotencia: rascunho.chaveIdempotencia,
  };
  if (anexos.length > 0) payload.anexos = anexos;

  const retroativo = rascunho.retroativoEm?.trim();
  if (retroativo) {
    const quando = new Date(retroativo);
    // Data ilegivel vira "agora" em silencio em vez de derrubar o envio: o
    // texto da pessoa vale mais que o carimbo que ela errou de digitar.
    if (!Number.isNaN(quando.getTime())) {
      // Data no futuro nao existe em registro retroativo: ela embaralharia a
      // ordem da thread e a conta da janela de 24 horas junto.
      const limite = quando.getTime() > agora.getTime() ? agora : quando;
      payload.enviadaEm = limite.toISOString();
    }
  }
  return payload;
}

// --------------------------------------------------------- montar a thread

export type EstadoEnvio = "pendente" | "falhou";

// Mensagem como a tela desenha: a do servidor, mais o estado do envio otimista
// enquanto ele nao resolveu. Sem "envio" quer dizer confirmada pelo servidor.
export interface MensagemNaTela extends Mensagem {
  envio?: EstadoEnvio;
}

export function ordenarThread(mensagens: readonly MensagemNaTela[]): MensagemNaTela[] {
  // A mesma ordem do servidor: o que aconteceu no mundo real, com empate no que
  // entrou no arquivo primeiro. Duas ordens diferentes fariam a mensagem pular
  // de lugar assim que o servidor respondesse.
  return [...mensagens].sort(
    (a, b) =>
      Date.parse(a.enviadaEm) - Date.parse(b.enviadaEm) ||
      Date.parse(a.criadaEm) - Date.parse(b.criadaEm),
  );
}

// Junta o que veio do servidor com o que ainda esta em voo.
//
// Duas regras, as duas vindas do desenho append-only do arquivo:
//
// 1. Colapsa por id, a ULTIMA versao vence. E o mesmo que o servidor faz ao ler
//    o .jsonl: a versao nova de uma mensagem entra como linha nova com o mesmo
//    id (ver docs/decisoes/2026-07-27-conversa-append-only-...md). A tela precisa da
//    mesma regra pra confirmacao de entrega nao virar mensagem duplicada.
// 2. Pendente cuja chaveIdempotencia ja apareceu no servidor some: ela foi
//    gravada, e manter as duas mostraria a mesma frase duas vezes.
export function mesclarThread(
  doServidor: readonly MensagemNaTela[],
  pendentes: readonly MensagemNaTela[],
): MensagemNaTela[] {
  const porId = new Map<string, MensagemNaTela>();
  for (const mensagem of doServidor) porId.set(mensagem.id, mensagem);

  const chavesGravadas = new Set(doServidor.map((item) => item.chaveIdempotencia));
  for (const pendente of pendentes) {
    if (chavesGravadas.has(pendente.chaveIdempotencia)) continue;
    porId.set(pendente.id, pendente);
  }
  return ordenarThread([...porId.values()]);
}

// Rolou pra cima: a pagina mais antiga entra na frente da que ja estava na tela.
export function juntarPaginaAnterior(
  anteriores: readonly MensagemNaTela[],
  atuais: readonly MensagemNaTela[],
): MensagemNaTela[] {
  return mesclarThread([...anteriores, ...atuais], []);
}
