import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import type { TurnoSessao } from "../../tipos/dominio";
import { IconeCerebro, IconeRaio, IconeSeta, IconeX } from "../comum/Icones";
import { Markdown } from "../comum/Markdown";
import "../../estilos/cerimonia.css";

// Titulo fixo da sessao da cerimonia: e por ele que a gente reencontra uma
// entrevista em andamento ao reabrir a tela (a sessao vive no backend).
const TITULO_CERIMONIA = "Cerimônia do Cérebro";

interface Props {
  aoFechar: () => void;
  // Chamado no fim feliz: fecha a cerimonia e abre o popover de fluxos.
  aoCriarFluxo: () => void;
}

// A cerimonia de abertura de um cliente novo: a entrevista guiada que preenche
// o Cerebro. Por baixo e uma sessao claude -p rodando a skill /instalar do
// VKOS (que ja sabe conduzir uma pergunta por vez e nunca inventar dado); por
// cima e uma conversa em tela cheia, acolhedora, sem cara de formulario.
// Fechar no meio nao perde nada: a sessao segue no backend e reabrir retoma.
export function CerimoniaCerebro({ aoFechar, aoCriarFluxo }: Props) {
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
  const sessao = useMemo(() => {
    const minhas = sessoes.filter((s) => s.titulo === TITULO_CERIMONIA);
    return minhas.length > 0 ? minhas[minhas.length - 1] : undefined;
  }, [sessoes]);

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
      if (document.querySelectorAll(".overlay-tela-cheia, .cerimonia-fundo").length <= 1) {
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

  const comecar = useCallback(async () => {
    setComecando(true);
    setErro(null);
    try {
      await criarSessao({
        titulo: TITULO_CERIMONIA,
        prompt: "/instalar",
        skill: "instalar",
      });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setComecando(false);
    }
  }, [criarSessao]);

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
  const celebrar = cerebroPronto && conversaComecou && !rodando;

  return createPortal(
    <div className="cerimonia-fundo">
      <div className="cerimonia-painel">
        <header className="cerimonia-topo">
          <span className="cerimonia-titulo">
            <IconeCerebro className="cerimonia-icone" />
            Cerimônia do Cérebro
          </span>
          <button
            className="cerimonia-fechar"
            onClick={aoFechar}
            title={conversaComecou ? "Fechar (a entrevista continua salva)" : "Fechar"}
          >
            <IconeX className="" />
          </button>
        </header>

        {!conversaComecou ? (
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
              className="botao botao-principal cerimonia-comecar"
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
            <button className="botao botao-principal cerimonia-comecar" onClick={aoCriarFluxo}>
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
            <div className="cerimonia-envio">
              <input
                ref={refCampo}
                value={mensagem}
                placeholder={rodando ? "Espere a pergunta..." : "Responda aqui"}
                disabled={rodando || enviando}
                onChange={(e) => setMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void enviar();
                }}
              />
              <button
                className="botao botao-principal cerimonia-enviar"
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
