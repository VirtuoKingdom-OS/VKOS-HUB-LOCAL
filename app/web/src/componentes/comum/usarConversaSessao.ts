// A CONVERSA COM UMA SESSÃO DE IA, num lugar só.
//
// POR QUE ISTO EXISTE. A mesma lógica de "somar a transcrição que veio por REST
// com a fatia do stream que está chegando ao vivo" existia em TRÊS cópias
// divergentes: ChatIde, CerimoniaCerebro e NoSessao. As três guardam uma marca
// de quanto do stream já pertence a turno finalizado, as três recarregam a
// transcrição quando o turno termina, e as três erram em pontos diferentes. A
// da cerimônia nem lê ferramentas; a do nó zera a marca em dois lugares.
//
// Este módulo é a quarta escrita, e a intenção é que ela seja a última. Nesta
// rodada só a tela do anúncio usa: trocar as três telas antigas junto com a
// estreia de um fluxo seria quebrar duas coisas ao mesmo tempo. A dívida está
// declarada no plano do fluxo de anúncios.
//
// A PARTE PURA MORA AQUI EM CIMA e é testada sozinha, sem React e sem DOM:
// montarConversa é uma função de dados para dados.

import { useCallback, useEffect, useRef, useState } from "react";

import { usarEstado, type EstadoStream } from "../../estado/contexto";
import type { TurnoSessao } from "../../tipos/dominio";
import { mensagemDeErro } from "../../util/erros";

// Uma ferramenta que a IA está usando agora. Mesmo formato do evento
// sessao:ferramenta que o contexto acumula.
export interface FerramentaViva {
  nome: string;
  alvo: string;
}

// Quanto do stream já pertence a turno finalizado. Tudo que passa disso é a
// resposta em andamento.
export interface MarcasDoStream {
  texto: number;
  ferramentas: number;
}

export interface ConversaMontada {
  // A transcrição do servidor, mais as falas otimistas que ainda não voltaram.
  turnos: TurnoSessao[];
  pendentes: TurnoSessao[];
  // O que a IA está escrevendo agora, além do que já virou turno.
  respostaViva: string;
  ferramentasVivas: FerramentaViva[];
}

export const MARCAS_ZERADAS: MarcasDoStream = { texto: 0, ferramentas: 0 };

// A soma da transcrição com a fatia do stream ao vivo.
//
// A REGRA QUE AS TRÊS CÓPIAS NÃO TÊM: marca maior que o stream significa que o
// stream RECOMEÇOU (sessão nova no mesmo lugar, ou stream limpo). Nesse caso a
// marca velha não vale mais e a fatia é o stream inteiro. Sem isto, slice com
// base maior que o tamanho devolve string vazia, e a tela fica muda enquanto a
// IA responde, sem erro nenhum aparecer.
export function montarConversa(entrada: {
  transcricao: TurnoSessao[];
  pendentes: TurnoSessao[];
  stream?: EstadoStream;
  marcas: MarcasDoStream;
}): ConversaMontada {
  const texto = entrada.stream?.texto ?? "";
  const ferramentas = entrada.stream?.ferramentas ?? [];

  const baseTexto = entrada.marcas.texto <= texto.length ? entrada.marcas.texto : 0;
  const baseFerramentas =
    entrada.marcas.ferramentas <= ferramentas.length ? entrada.marcas.ferramentas : 0;

  return {
    turnos: entrada.transcricao,
    pendentes: entrada.pendentes,
    respostaViva: texto.slice(baseTexto),
    ferramentasVivas: ferramentas.slice(baseFerramentas),
  };
}

// Os status em que a sessão ainda está trabalhando.
const STATUS_RODANDO = new Set(["fila", "iniciando", "rodando"]);

export function sessaoEstaRodando(status: string | undefined): boolean {
  return status !== undefined && STATUS_RODANDO.has(status);
}

export interface ConversaSessao extends ConversaMontada {
  rodando: boolean;
  enviando: boolean;
  erro: string | null;
  // Manda um texto. Com sessão, continua ela por --resume. Sem sessão, chama
  // aoAbrirSessao, que é quem sabe com que escopo a primeira sessão nasce.
  enviar: (texto: string) => Promise<void>;
  limparErro: () => void;
}

export interface OpcoesConversaSessao {
  // Como abrir a primeira sessão desta conversa. Sem isto, escrever com
  // sessaoId nulo não faz nada: o hook não inventa escopo.
  aoAbrirSessao?: (texto: string) => Promise<void>;
}

// Acompanha UMA sessão: carrega a transcrição, fatia o stream ao vivo e manda
// mensagem. sessaoId nulo é um estado normal, não erro: é a conversa que ainda
// não começou.
export function usarConversaSessao(
  sessaoId: string | null,
  opcoes: OpcoesConversaSessao = {},
): ConversaSessao {
  const { sessoes, sessoesCore, streams, enviarMensagem, obterTranscricao } = usarEstado();
  const { aoAbrirSessao } = opcoes;

  const sessao = sessaoId
    ? [...sessoes, ...sessoesCore].find((s) => s.id === sessaoId)
    : undefined;
  const status = sessao?.status;
  const rodando = sessaoEstaRodando(status);
  const stream = sessaoId ? streams[sessaoId] : undefined;

  const [transcricao, setTranscricao] = useState<TurnoSessao[]>([]);
  const [pendentes, setPendentes] = useState<TurnoSessao[]>([]);
  const [marcas, setMarcas] = useState<MarcasDoStream>(MARCAS_ZERADAS);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Marcas em ref TAMBÉM, pra o efeito ler o valor de agora sem se redisparar
  // quando ele muda. O estado existe pro render; o ref existe pro efeito.
  const idCarregado = useRef<string | null>(null);
  const statusAnterior = useRef<string | undefined>(undefined);

  // Carrega a transcrição ao trocar de sessão, e recarrega quando um turno
  // termina: é aí que a resposta final vira turno e os otimistas podem sair.
  useEffect(() => {
    if (!sessaoId) {
      idCarregado.current = null;
      statusAnterior.current = undefined;
      setTranscricao([]);
      setPendentes([]);
      setMarcas(MARCAS_ZERADAS);
      return;
    }

    const primeiraVez = idCarregado.current !== sessaoId;
    const terminouAgora =
      statusAnterior.current !== undefined &&
      statusAnterior.current !== status &&
      !sessaoEstaRodando(status);
    statusAnterior.current = status;
    if (!primeiraVez && !terminouAgora) return;
    idCarregado.current = sessaoId;

    let vivo = true;
    void (async () => {
      try {
        const turnos = await obterTranscricao(sessaoId);
        if (!vivo) return;
        setTranscricao(turnos);
        setPendentes([]);
        // O stream de agora já está inteiro dentro dos turnos que acabaram de
        // chegar. A marca é lida no momento da resposta, e não antes do await:
        // o stream pode ter crescido durante a ida ao servidor.
        setMarcas({
          texto: streams[sessaoId]?.texto.length ?? 0,
          ferramentas: streams[sessaoId]?.ferramentas?.length ?? 0,
        });
      } catch {
        // Sem transcrição ainda: o stream ao vivo já mostra o que está
        // acontecendo, e uma sessão recém-criada cai exatamente aqui.
      }
    })();
    return () => {
      vivo = false;
    };
    // streams fica de fora de propósito: ele muda a cada delta do stream, e
    // entrar aqui refaria a busca da transcrição dezenas de vezes por resposta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId, status, obterTranscricao]);

  const enviar = useCallback(
    async (texto: string) => {
      const limpo = texto.trim();
      if (!limpo || enviando || rodando) return;
      setEnviando(true);
      setErro(null);
      setPendentes((antes) => [
        ...antes,
        { papel: "usuario", texto: limpo, em: new Date().toISOString() },
      ]);
      try {
        if (sessaoId) {
          await enviarMensagem(sessaoId, limpo);
        } else if (aoAbrirSessao) {
          await aoAbrirSessao(limpo);
        }
      } catch (e) {
        // A fala otimista sai junto com o erro: deixar ela na tela ao lado de
        // "não consegui enviar" faria parecer que a mensagem foi.
        setPendentes((antes) => antes.slice(0, -1));
        setErro(mensagemDeErro(e));
      } finally {
        setEnviando(false);
      }
    },
    [sessaoId, enviando, rodando, enviarMensagem, aoAbrirSessao],
  );

  const limparErro = useCallback(() => setErro(null), []);

  return {
    ...montarConversa({ transcricao, pendentes, stream, marcas }),
    rodando,
    enviando,
    erro,
    enviar,
    limparErro,
  };
}
