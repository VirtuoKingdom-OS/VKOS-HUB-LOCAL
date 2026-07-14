import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as api from "../../api/cliente";
import { ErroApi } from "../../api/cliente";
import { mensagemDeErro } from "../../util/erros";
import { renderizarMarkdownLeve } from "../../util/markdownLeve";
import { IconeCerebro, IconeLapis, IconeX } from "../comum/Icones";
import "../../estilos/cerebro.css";

type Modo = "leitura" | "edicao";

// Painel do Cerebro do negocio. Modo leitura: renderiza o markdown completo
// (sem lib externa) num painel lateral. Modo edicao: modal central grande,
// no mesmo espirito visual do EditorContexto (portal, blur no fundo, Esc
// fecha, indicador Salvando/Salvo). Autosave com debounce de 1.5s + salva no
// fechar se estiver sujo, sem nunca descartar o texto do usuario em silencio.
export function PainelCerebro({ aoFechar }: { aoFechar: () => void }) {
  const [modo, setModo] = useState<Modo>("leitura");
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

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const resposta = await api.obterCerebro();
        if (!vivo) return;
        const conteudo = resposta.texto ?? resposta.conteudo ?? "";
        setTexto(conteudo);
        setAtualizadoEm(resposta.atualizadoEm ?? null);
        ultimoSalvo.current = conteudo;
        setExiste(true);
      } catch (e) {
        if (!vivo) return;
        if (e instanceof ErroApi && e.status === 404) {
          setExiste(false);
        } else {
          setErroCarga(mensagemDeErro(e));
        }
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

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
            {existe && !carregando && !erroCarga && (
              <button className="botao-editar-cerebro" onClick={entrarEmEdicao}>
                <IconeLapis className="" style={{ width: 14, height: 14 }} />
                Editar
              </button>
            )}
            <button className="fechar" onClick={() => void fecharPainel()} title="Fechar">
              <IconeX className="" />
            </button>
          </div>
        </div>
        <div className="conteudo">
          {carregando && <p style={{ color: "var(--texto-suave)" }}>Carregando o Cérebro.</p>}
          {erroCarga && <div className="erro-linha">{erroCarga}</div>}
          {!carregando && !erroCarga && !existe && (
            <div className="vazio-cerebro">
              <IconeCerebro className="" style={{ width: 32, height: 32, opacity: 0.6 }} />
              <p>
                O Cérebro deste negócio ainda não existe. Crie agora para dar
                identidade a todas as sessões de IA.
              </p>
              <button className="botao-editar-cerebro" onClick={entrarEmEdicao}>
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
