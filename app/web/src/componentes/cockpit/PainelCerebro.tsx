import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as api from "../../api/cliente";
import { ErroApi } from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import { renderizarMarkdownLeve } from "../../util/markdownLeve";
import { Conversa } from "../comum/Conversa";
import { IconeAlerta, IconeCerebro, IconeLapis, IconeRaio, IconeX } from "../comum/Icones";
import {
  sessaoEstaRodando,
  usarConversaSessao,
} from "../comum/usarConversaSessao";
import {
  TITULO_CERIMONIA,
  acharSessaoDoCerebro,
  promptDeConversaComCerebro,
  sessaoDoCerebroMorreu,
} from "./cerebroConversa";
import "./cerebro.css";

type Modo = "leitura" | "edicao";
type Guia = "ler" | "chat";

// Painel do Cerebro do negocio. Modo leitura: renderiza o markdown completo
// (sem lib externa) num painel lateral. Modo edicao: modal central grande,
// no mesmo espirito visual do EditorContexto (portal, blur no fundo, Esc
// fecha, indicador Salvando/Salvo). Autosave com debounce de 1.5s + salva no
// fechar se estiver sujo, sem nunca descartar o texto do usuario em silencio.
export function PainelCerebro({ aoFechar }: { aoFechar: () => void }) {
  const [modo, setModo] = useState<Modo>("leitura");
  const [guia, setGuia] = useState<Guia>("ler");
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [existe, setExiste] = useState(true);

  const [texto, setTexto] = useState<string>("");
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [salvouAgora, setSalvouAgora] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const ultimoSalvo = useRef("");
  const timerSalvar = useRef<number | undefined>(undefined);
  const timerSalvou = useRef<number | undefined>(undefined);

  // A sessao da conversa do Cerebro, a mesma que a cerimonia usa. Ela mora
  // aqui em cima, e nao dentro do chat, porque a LEITURA tambem depende dela:
  // quando a IA termina um turno, o arquivo na tela ficou velho.
  const { sessoes } = usarEstado();
  const sessaoCerebro = useMemo(() => acharSessaoDoCerebro(sessoes), [sessoes]);
  const conversaRodando = sessaoEstaRodando(sessaoCerebro?.status);

  const carregarCerebro = useCallback(async (): Promise<void> => {
    try {
      const resposta = await api.obterCerebro();
      const conteudo = resposta.texto ?? resposta.conteudo ?? "";
      setTexto(conteudo);
      setAtualizadoEm(resposta.atualizadoEm ?? null);
      ultimoSalvo.current = conteudo;
      setExiste(true);
      setErroCarga(null);
    } catch (e) {
      if (e instanceof ErroApi && e.status === 404) {
        setExiste(false);
      } else {
        setErroCarga(mensagemDeErro(e));
      }
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    void carregarCerebro().finally(() => {
      if (vivo) setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [carregarCerebro]);

  // Turno da conversa terminou: reler o arquivo. Sem isto, pedir uma mudanca
  // pelo Chat e voltar pra aba Ler mostraria o texto de antes da mudanca, que
  // e a pior forma de errar num documento de identidade: silenciosa.
  //
  // Nao recarrega durante a EDICAO: la o dono e a fonte da verdade, e trocar o
  // texto embaixo do cursor perderia o que ele esta escrevendo.
  const rodavaAntes = useRef(false);
  useEffect(() => {
    const terminou = rodavaAntes.current && !conversaRodando;
    rodavaAntes.current = conversaRodando;
    if (terminou && modo !== "edicao") void carregarCerebro();
  }, [conversaRodando, modo, carregarCerebro]);

  useEffect(() => {
    return () => {
      if (timerSalvar.current) window.clearTimeout(timerSalvar.current);
      if (timerSalvou.current) window.clearTimeout(timerSalvou.current);
    };
  }, []);

  const marcarSalvo = useCallback(() => {
    setSalvando(false);
    setSalvouAgora(true);
    if (timerSalvou.current) window.clearTimeout(timerSalvou.current);
    timerSalvou.current = window.setTimeout(() => setSalvouAgora(false), 2000);
  }, []);

  // Devolve true se salvou com sucesso. Em caso de erro, mantem o texto na
  // tela e o aviso visivel: nunca descarta o que o usuario escreveu.
  const salvarAgora = useCallback(async (valor: string): Promise<boolean> => {
    setSalvando(true);
    setErroSalvar(null);
    try {
      const resposta = await api.salvarCerebro(valor);
      const conteudo = resposta.texto ?? resposta.conteudo ?? valor;
      ultimoSalvo.current = conteudo;
      setTexto(conteudo);
      setAtualizadoEm(resposta.atualizadoEm ?? null);
      setExiste(true);
      marcarSalvo();
      return true;
    } catch (e) {
      setSalvando(false);
      setErroSalvar(mensagemDeErro(e));
      return false;
    }
  }, [marcarSalvo]);

  const aoMudarRascunho = (valor: string) => {
    setRascunho(valor);
    setSalvouAgora(false);
    if (timerSalvar.current) window.clearTimeout(timerSalvar.current);
    timerSalvar.current = window.setTimeout(() => {
      void salvarAgora(valor);
    }, 1500);
  };

  const entrarEmEdicao = () => {
    setRascunho(texto);
    setErroSalvar(null);
    setModo("edicao");
  };

  // Sai da edicao (volta pra leitura ou fecha o painel). Se o rascunho estiver
  // sujo, salva antes de sair; se o salvamento falhar, permanece na edicao
  // com o aviso de erro visivel em vez de perder o texto.
  const flushAoSair = useCallback(async (): Promise<boolean> => {
    if (timerSalvar.current) {
      window.clearTimeout(timerSalvar.current);
      timerSalvar.current = undefined;
    }
    if (modo !== "edicao") return true;
    if (rascunho === ultimoSalvo.current) return true;
    return salvarAgora(rascunho);
  }, [modo, rascunho, salvarAgora]);

  const voltarParaLeitura = useCallback(async () => {
    const ok = await flushAoSair();
    if (ok) setModo("leitura");
  }, [flushAoSair]);

  const fecharPainel = useCallback(async () => {
    const ok = await flushAoSair();
    if (ok) aoFechar();
  }, [flushAoSair, aoFechar]);

  // Esc (e o clique fora) fecham so a camada de cima: em edicao, volta pra
  // leitura (salvando antes se sujo); em leitura, fecha o painel inteiro.
  const fecharCamadaAtual = useCallback(async () => {
    if (modo === "edicao") await voltarParaLeitura();
    else await fecharPainel();
  }, [modo, voltarParaLeitura, fecharPainel]);

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        void fecharCamadaAtual();
      }
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [fecharCamadaAtual]);

  const indicador = salvando ? (
    <span className="marca-salvando">Salvando...</span>
  ) : erroSalvar ? (
    <span className="marca-erro-cerebro">Erro ao salvar: {erroSalvar}</span>
  ) : salvouAgora ? (
    <span className="marca-salvo">Salvo</span>
  ) : (
    <span className="marca-vazia" />
  );

  if (modo === "edicao") {
    return createPortal(
      <div className="overlay-cerebro" onMouseDown={() => void voltarParaLeitura()}>
        <div className="modal-cerebro" onMouseDown={(e) => e.stopPropagation()}>
          <div className="topo-modal-cerebro">
            <h2 className="titulo-modal-cerebro">
              <IconeCerebro className="" style={{ width: 18, height: 18 }} />
              Editando o Cérebro
            </h2>
            <div className="acoes-modal">
              {indicador}
              <button
                className="fechar"
                onClick={() => void voltarParaLeitura()}
                title="Voltar pra leitura"
              >
                <IconeX className="" />
              </button>
            </div>
          </div>
          <div className="corpo-modal-cerebro">
            <textarea
              className="campo-cerebro-editar"
              autoFocus
              spellCheck={false}
              placeholder="Escreva o Cérebro do negócio em markdown."
              value={rascunho}
              onChange={(e) => aoMudarRascunho(e.target.value)}
            />
          </div>
          <div className="rodape-cerebro">
            Editando o Cérebro do negócio. Todas as sessões novas passam a usar o
            que você salvar.
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="overlay" onClick={() => void fecharPainel()}>
      <div className="painel-cerebro" onClick={(e) => e.stopPropagation()}>
        <div className="topo">
          <h2>
            <IconeCerebro className="" style={{ width: 20, height: 20 }} />
            Cérebro do negócio
          </h2>
          <div className="acoes-cerebro">
            {guia === "ler" && existe && !carregando && !erroCarga && (
              <button className="botao botao-neutro botao-p" onClick={entrarEmEdicao}>
                <IconeLapis className="" style={{ width: 14, height: 14 }} />
                Editar
              </button>
            )}
            <button className="fechar" onClick={() => void fecharPainel()} title="Fechar">
              <IconeX className="" />
            </button>
          </div>
        </div>

        {/* Ler e conversar sao dois jeitos de olhar o MESMO documento, entao
            eles sao guias do painel, e nao duas portas separadas no canvas. */}
        <div className="abas abas-cerebro" role="tablist" aria-label="Cérebro">
          <button
            className="aba"
            role="tab"
            aria-selected={guia === "ler"}
            onClick={() => setGuia("ler")}
          >
            Ler
          </button>
          <button
            className="aba"
            role="tab"
            aria-selected={guia === "chat"}
            onClick={() => setGuia("chat")}
          >
            Chat
            {/* O ponto vivo diz que a IA esta trabalhando neste documento
                agora, e ele e a unica coisa menta da barra. */}
            {conversaRodando && <span className="ponto-vivo" />}
          </button>
        </div>

        {guia === "chat" && (
          <ChatDoCerebro sessaoCerebro={sessaoCerebro} rodandoAgora={conversaRodando} />
        )}

        <div className="conteudo" hidden={guia !== "ler"}>
          {/* Area de conteudo carregando usa ESQUELETO, nunca giro: o giro no
              meio da tela nao diz nada sobre o que esta chegando. */}
          {carregando && (
            <div aria-label="Carregando o Cérebro" aria-busy="true">
              <div className="esqueleto esqueleto-linha" />
              <div className="esqueleto esqueleto-linha" />
              <div className="esqueleto esqueleto-linha" />
            </div>
          )}
          {erroCarga && <div className="erro-linha">{erroCarga}</div>}
          {!carregando && !erroCarga && !existe && (
            <div className="vazio-cerebro">
              <IconeCerebro className="" />
              <h2>O Cérebro ainda não existe</h2>
              <p>
                Ele é a identidade do negócio: quem atende, o que vende e com
                que voz. Toda sessão de IA lê esse documento antes de gerar.
              </p>
              <button className="botao botao-principal" onClick={entrarEmEdicao}>
                <IconeLapis className="" style={{ width: 14, height: 14 }} />
                Criar Cérebro
              </button>
            </div>
          )}
          {!carregando && !erroCarga && existe && (
            <>
              {atualizadoEm && (
                <div className="meta-cerebro">
                  Atualizado em {new Date(atualizadoEm).toLocaleString("pt-BR")}
                </div>
              )}
              <div className="leitura-cerebro">{renderizarMarkdownLeve(texto)}</div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// A CONVERSA COM O CÉREBRO, dentro do painel.
//
// É a MESMA sessão da cerimônia, reencontrada pelo título. Não é um chat novo
// ao lado do documento: a entrevista que montou a identidade sabe o que já foi
// perguntado, o que o dono respondeu e o que ele recusou. Um chat novo saberia
// nada disso, e a primeira coisa que ele faria era perguntar de novo.
//
// QUANDO A SESSÃO MORREU, ISSO É DITO NA CARA, como no chat da campanha. Fingir
// que continua uma conversa que acabou faria o dono escrever "muda o que a
// gente combinou" para uma IA que nunca combinou nada.
function ChatDoCerebro({
  sessaoCerebro,
  rodandoAgora,
}: {
  sessaoCerebro: ReturnType<typeof acharSessaoDoCerebro>;
  rodandoAgora: boolean;
}) {
  const { criarSessao } = usarEstado();
  const [resgatando, setResgatando] = useState(false);

  const morreu = sessaoDoCerebroMorreu(sessaoCerebro, rodandoAgora);
  const nuncaTeve = !sessaoCerebro;
  const precisaDeOutra = morreu;

  const abrirOutra = useCallback(
    async (texto: string) => {
      await criarSessao({
        titulo: TITULO_CERIMONIA,
        prompt: promptDeConversaComCerebro(texto),
      });
      setResgatando(false);
    },
    [criarSessao],
  );

  const conversa = usarConversaSessao(precisaDeOutra ? null : sessaoCerebro?.id ?? null, {
    aoAbrirSessao: abrirOutra,
  });

  const mostrarFaixa = precisaDeOutra && !resgatando;

  return (
    <div className="chat-cerebro">
      <Conversa
        turnos={conversa.turnos}
        pendentes={conversa.pendentes}
        respostaViva={conversa.respostaViva}
        ferramentas={conversa.ferramentasVivas}
        rodando={conversa.rodando}
        enviando={conversa.enviando}
        erro={conversa.erro}
        aoEnviar={(texto) => void conversa.enviar(texto)}
        rotuloCampo="O que mudar no Cérebro"
        campoDesligado={mostrarFaixa}
        dicaCampoDesligado="Comece outra conversa para escrever aqui."
        avisoNoRodape={
          mostrarFaixa ? (
            <div
              className={`faixa chat-cerebro-faixa${nuncaTeve ? "" : " faixa-alerta"}`}
              role="status"
            >
              {!nuncaTeve && <IconeAlerta className="" />}
              <div className="faixa-texto">
                {nuncaTeve
                  ? "Este Cérebro ainda não tem conversa. Uma conversa nova começa lendo o documento que já existe e mexe só no que você pedir."
                  : "A conversa que montou este Cérebro não existe mais, então não dá pra continuar de onde ela parou. Uma conversa nova começa lendo o documento que já existe."}
              </div>
              <div className="faixa-acoes">
                <button
                  className="botao botao-p botao-neutro"
                  onClick={() => setResgatando(true)}
                >
                  Começar outra conversa
                </button>
              </div>
            </div>
          ) : null
        }
        vazio={
          <div className="vazio chat-cerebro-vazio">
            <IconeRaio className="" />
            <h2>Peça uma mudança</h2>
            {!precisaDeOutra && (
              <p>
                Esta é a mesma conversa que montou o Cérebro. Peça o que quiser,
                tipo "a voz está formal demais, deixa mais direta", e o documento
                muda.
              </p>
            )}
          </div>
        }
      />
    </div>
  );
}
