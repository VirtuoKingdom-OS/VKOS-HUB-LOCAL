import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import type { TurnoSessao } from "../../tipos/dominio";
import { IconeCerebro, IconeRaio, IconeSeta, IconeX } from "../comum/Icones";
import { Markdown } from "../comum/Markdown";
import {
  promptComDocumento,
  promptDaCerimonia,
  type DocumentoCerebro,
} from "./cerebroDocumento";
import { TITULO_CERIMONIA, acharSessaoDoCerebro } from "./cerebroConversa";
import "./cerimonia.css";

export type { DocumentoCerebro };

interface Props {
  aoFechar: () => void;
  // Chamado no fim feliz: fecha a cerimonia e abre o popover de fluxos.
  aoCriarFluxo: () => void;
  // Quando vem preenchido, a cerimonia comeca sozinha lendo este documento em
  // vez de esperar o clique em "Começar a entrevista".
  documento?: DocumentoCerebro | null;
}

// A cerimonia de abertura de um cliente novo: a entrevista guiada que preenche
// o Cerebro. Por baixo e uma sessao claude -p rodando a skill /instalar do
// VKOS (que ja sabe conduzir uma pergunta por vez e nunca inventar dado); por
// cima e uma conversa em tela cheia, acolhedora, sem cara de formulario.
// Fechar no meio nao perde nada: a sessao segue no backend e reabrir retoma.
export function CerimoniaCerebro({ aoFechar, aoCriarFluxo, documento }: Props) {
  const {
    sessoes,
    streams,
    estadoVkos,
    criarSessao,
    enviarMensagem,
    obterTranscricao,
    recarregarTudo,
  } = usarEstado();

  // A sessao da cerimonia: a mais recente com o titulo fixo.
  const sessao = useMemo(() => acharSessaoDoCerebro(sessoes), [sessoes]);

  const rodando =
    sessao?.status === "iniciando" ||
    sessao?.status === "rodando" ||
    sessao?.status === "fila";
  const stream = sessao ? streams[sessao.id] : undefined;
  const cerebroPronto = estadoVkos?.cerebroPreenchido ?? false;

  const [turnos, setTurnos] = useState<TurnoSessao[]>([]);
  const [pendentes, setPendentes] = useState<TurnoSessao[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [comecando, setComecando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // QUEM ENCERRA A CERIMONIA E O DONO, e este estado e o registro disso.
  //
  // Antes, a tela de fim substituia a conversa sozinha assim que o Cerebro
  // ficava gravado: a IA escrevia o arquivo, o turno terminava, e a conversa
  // sumia com um "esta pronto" que ninguem pediu. No uso real isso apareceu
  // como a cerimonia fechando no meio de um assunto. Gravar o arquivo e um
  // fato do disco; declarar a identidade pronta e um julgamento, e o
  // julgamento e de quem e dono do negocio.
  const [concluida, setConcluida] = useState(false);
  // Segundo passo do botao de concluir: sem ele, um clique sem querer no
  // canto da tela encerraria a tarefa mais longa do produto.
  const [confirmandoFim, setConfirmandoFim] = useState(false);

  const refConversa = useRef<HTMLDivElement>(null);
  const refCampo = useRef<HTMLInputElement>(null);
  // Tamanho do stream que ja pertence a turnos finalizados; o que passa disso
  // e a resposta em andamento (mesmo padrao do no de sessao).
  const baseStream = useRef(0);
  const idCarregado = useRef<string | null>(null);
  const statusAnterior = useRef<string | undefined>(undefined);

  // Pausa as animacoes continuas do canvas enquanto a cerimonia cobre a tela.
  useEffect(() => {
    document.body.classList.add("overlay-aberto");
    return () => {
      if (document.querySelectorAll(".overlay-tela-cheia, .veu-modal").length <= 1) {
        document.body.classList.remove("overlay-aberto");
      }
    };
  }, []);

  // Carrega a transcricao ao reencontrar a sessao e recarrega quando um turno
  // termina (pra pegar a resposta final e limpar os otimistas).
  useEffect(() => {
    if (!sessao) return;
    const primeiraVez = idCarregado.current !== sessao.id;
    const terminouAgora =
      statusAnterior.current !== sessao.status && !rodando && statusAnterior.current;
    statusAnterior.current = sessao.status;
    if (!primeiraVez && !terminouAgora) return;
    idCarregado.current = sessao.id;
    let vivo = true;
    (async () => {
      try {
        const t = await obterTranscricao(sessao.id);
        if (!vivo) return;
        setTurnos(t);
        setPendentes([]);
        baseStream.current = streams[sessao.id]?.texto.length ?? 0;
      } catch {
        // sem transcricao ainda, segue com o stream
      }
      // Turno terminou: o /instalar pode ter acabado de gravar o Cerebro.
      // Recarrega o estado pra o cerebroPreenchido refletir na hora.
      if (terminouAgora) {
        try {
          await recarregarTudo();
        } catch {
          // best effort
        }
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao?.id, sessao?.status]);

  // Resposta ao vivo: o que veio no stream alem dos turnos ja finalizados.
  const respostaViva = stream ? stream.texto.slice(baseStream.current) : "";

  // Rola pro fim a cada novidade.
  useEffect(() => {
    const el = refConversa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turnos, pendentes, respostaViva]);

  const comecar = useCallback(
    async (doc?: DocumentoCerebro | null) => {
      setComecando(true);
      setErro(null);
      try {
        await criarSessao({
          titulo: TITULO_CERIMONIA,
          prompt: doc ? promptComDocumento(doc.caminho) : promptDaCerimonia(),
          skill: "instalar",
        });
      } catch (e) {
        setErro(mensagemDeErro(e));
      } finally {
        setComecando(false);
      }
    },
    [criarSessao]
  );

  // Cerimonia semeada por documento: dispara sozinha, uma vez so. O guarda e
  // um ref e nao o estado da sessao de proposito, porque entre o clique e a
  // sessao aparecer na lista existe uma janela de ida e volta ao servidor, e
  // sem ele o efeito abriria duas entrevistas na mesma gota.
  //
  // Nao dispara se ja existe uma entrevista em andamento: quem parou no meio
  // volta pra conversa dele, e nao pra uma segunda que apagaria o caminho
  // andado. Nesse caso o documento fica no anexo, disponivel pra pessoa citar.
  const disparouDocumento = useRef(false);
  useEffect(() => {
    if (!documento || disparouDocumento.current || sessao) return;
    disparouDocumento.current = true;
    void comecar(documento);
  }, [documento, sessao, comecar]);

  const enviar = useCallback(async () => {
    const texto = mensagem.trim();
    if (!texto || !sessao || rodando || enviando) return;
    setEnviando(true);
    setErro(null);
    setMensagem("");
    setPendentes((p) => [
      ...p,
      { papel: "usuario", texto, em: new Date().toISOString() },
    ]);
    try {
      await enviarMensagem(sessao.id, texto);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
      refCampo.current?.focus();
    }
  }, [mensagem, sessao, rodando, enviando, enviarMensagem]);

  // Esc fecha (a entrevista continua no backend; reabrir retoma).
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar();
      }
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [aoFechar]);

  const conversaComecou = Boolean(sessao);
  // A tela de fim so aparece por decisao do dono. O Cerebro estar gravado
  // habilita o botao, nunca a troca de tela.
  const celebrar = concluida;
  const podeConcluir = cerebroPronto && conversaComecou && !rodando && !concluida;

  return createPortal(
    // O veu e a "tela invisivel" atras: ele cobre o app inteiro e come o
    // clique, entao nao da pra acertar um botao do canvas por engano. Clicar
    // nele NAO fecha, de proposito: esta e a tarefa mais longa do produto, e
    // um clique fora do painel nao pode parecer que descartou a entrevista.
    <div className="veu-modal cerimonia-veu">
      <div className="modal modal-g cerimonia-painel">
        <header className="modal-topo cerimonia-topo">
          <IconeCerebro className="cerimonia-icone" />
          <h2>Cerimônia do Cérebro</h2>
          <button
            className="botao botao-p botao-fantasma botao-icone"
            onClick={aoFechar}
            aria-label="Fechar"
            title={conversaComecou ? "Fechar (a entrevista continua salva)" : "Fechar"}
          >
            <IconeX className="" />
          </button>
        </header>

        {!conversaComecou && documento ? (
          // A entrevista semeada por documento ja esta a caminho: nao ha botao
          // pra clicar. O que a tela deve nesse instante e dizer o que esta
          // acontecendo e com qual arquivo, senao ela e so uma espera muda.
          <div className="cerimonia-intro">
            <div className="cerimonia-selo">
              <IconeCerebro className="" />
            </div>
            <h2>Lendo o seu documento</h2>
            <p>
              O Hub está lendo <strong>{documento.nome}</strong> e montando o
              Cérebro com o que estiver escrito lá. Em seguida ele mostra o que
              conseguiu preencher e pergunta só o que ficou faltando.
            </p>
            {erro ? (
              <div className="cerimonia-erro">{erro}</div>
            ) : (
              <div className="cerimonia-digitando">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        ) : !conversaComecou ? (
          <div className="cerimonia-intro">
            <div className="cerimonia-selo">
              <IconeCerebro className="" />
            </div>
            <h2>Vamos montar o Cérebro deste negócio</h2>
            <p>
              É uma conversa, não um formulário: uma pergunta de cada vez, em
              linguagem simples, sobre o que o negócio vende, pra quem, e com que
              voz. No fim, o Cérebro fica pronto e todas as gerações passam a
              sair com a cara do negócio. Leva uns 10 minutos.
            </p>
            <button
              className="botao botao-principal botao-g cerimonia-comecar"
              onClick={() => void comecar()}
              disabled={comecando}
            >
              <IconeRaio className="" />
              {comecando ? "Preparando..." : "Começar a entrevista"}
            </button>
            <span className="cerimonia-dica">
              Pode parar no meio e voltar depois: nada se perde.
            </span>
          </div>
        ) : celebrar ? (
          <div className="cerimonia-intro">
            <div className="cerimonia-selo pronto">
              <IconeCerebro className="" />
            </div>
            <h2>O Cérebro está pronto</h2>
            <p>
              A identidade do negócio está gravada. A partir de agora, todo
              carrossel, site e página nasce lendo esse documento. Você pode
              revisar e ajustar o Cérebro quando quiser, pelo nó no canvas.
            </p>
            <button
              className="botao botao-principal botao-g cerimonia-comecar"
              onClick={aoCriarFluxo}
            >
              <IconeRaio className="" />
              Criar o primeiro fluxo
            </button>
            <button className="botao botao-fantasma" onClick={aoFechar}>
              Voltar pro cockpit
            </button>
          </div>
        ) : (
          <>
            <div className="cerimonia-conversa" ref={refConversa}>
              {turnos.map((t, i) => (
                <div key={i} className={`cerimonia-turno ${t.papel}`}>
                  {t.papel === "assistente" ? (
                    <Markdown texto={t.texto} />
                  ) : (
                    t.texto
                  )}
                </div>
              ))}
              {pendentes.map((t, i) => (
                <div key={`p${i}`} className="cerimonia-turno usuario pendente">
                  {t.texto}
                </div>
              ))}
              {respostaViva && (
                <div className="cerimonia-turno assistente">
                  <Markdown texto={respostaViva} />
                </div>
              )}
              {rodando && !respostaViva && (
                <div className="cerimonia-digitando">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
            {erro && <div className="cerimonia-erro">{erro}</div>}

            {/* A FAIXA DE CONCLUIR. Ela aparece quando o Cerebro ja tem
                conteudo gravado, e o que ela oferece e uma acao, nunca uma
                troca de tela: a conversa continua inteira embaixo dela.

                Faixa NEUTRA, e nao a verde de sucesso: ela fica na tela o
                resto da conversa inteira, e menta permanente vira decoracao.
                O menta desta tela e o selo do fim, que acontece uma vez. */}
            {podeConcluir && (
              <div className="faixa cerimonia-faixa-fim" role="status">
                <div className="faixa-texto">
                  {confirmandoFim
                    ? "Concluir agora? O Cérebro fica com o que está escrito nele. Dá pra continuar mudando depois, pelo Chat do Cérebro."
                    : "O Cérebro já tem conteúdo gravado. Continue ajustando pela conversa, e conclua quando estiver do seu jeito."}
                </div>
                <div className="faixa-acoes">
                  {confirmandoFim ? (
                    <>
                      <button
                        className="botao botao-p botao-fantasma"
                        onClick={() => setConfirmandoFim(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        className="botao botao-p botao-principal"
                        onClick={() => {
                          setConfirmandoFim(false);
                          setConcluida(true);
                        }}
                      >
                        Concluir o Cérebro
                      </button>
                    </>
                  ) : (
                    <button
                      className="botao botao-p botao-neutro"
                      onClick={() => setConfirmandoFim(true)}
                    >
                      Concluir o Cérebro
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="modal-rodape cerimonia-envio">
              <input
                ref={refCampo}
                className="campo"
                aria-label="Sua resposta"
                value={mensagem}
                placeholder={rodando ? "Espere a pergunta..." : "Responda aqui"}
                disabled={rodando || enviando}
                onChange={(e) => setMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void enviar();
                }}
              />
              <button
                className="botao botao-principal botao-icone cerimonia-enviar"
                aria-label="Enviar resposta"
                onClick={() => void enviar()}
                disabled={rodando || enviando || !mensagem.trim()}
                title="Enviar"
              >
                <IconeSeta className="" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
