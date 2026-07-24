import { useCallback, useEffect, useRef, useState } from "react";

import {
  obterCerebro,
  obterCerebroSecoes,
  salvarCerebro,
  salvarCerebroSecao,
  type CerebroEmSecoes,
} from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import { Aviso, Botao } from "../comum/Sistema";
import { navegarParaTela } from "../layout/rotas";
import "../../estilos/tela-cerebro.css";

// A aba Cerebro do Negocio: um card editavel por secao do cerebro.md. Os cards
// sao uma VISTA do markdown; o arquivo continua a fonte da verdade e a
// entrevista guiada continua o caminho recomendado pra quem esta no zero.
export function TelaCerebro() {
  const { estadoVkos } = usarEstado();
  const [dados, setDados] = useState<CerebroEmSecoes | null>(null);
  const [semArquivo, setSemArquivo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mudouPorFora, setMudouPorFora] = useState(false);
  // Fallback do arquivo sem secoes: edita o texto inteiro num card unico.
  const [textoInteiro, setTextoInteiro] = useState<string | null>(null);
  const editandoRef = useRef<number | null>(null);
  editandoRef.current = editando;

  const carregar = useCallback(async () => {
    try {
      const resposta = await obterCerebroSecoes();
      setDados(resposta);
      setSemArquivo(false);
      if (resposta.secoes.length === 0) {
        const inteiro = await obterCerebro();
        setTextoInteiro(inteiro.texto ?? inteiro.conteudo ?? "");
      } else {
        setTextoInteiro(null);
      }
      setErro("");
    } catch (falha) {
      const mensagem = mensagemDeErro(falha);
      if (/cerebro\.md/i.test(mensagem)) {
        setSemArquivo(true);
        setErro("");
      } else {
        setErro(mensagem);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // O Cerebro mudou por fora (entrevista, sessao de IA, outra aba). Sem card em
  // edicao, recarrega na hora. Com edicao aberta, avisa em vez de destruir o
  // texto do usuario.
  useEffect(() => {
    const aoMudar = () => {
      if (editandoRef.current === null) void carregar();
      else setMudouPorFora(true);
    };
    window.addEventListener("vkos:cerebro-atualizado", aoMudar);
    return () => window.removeEventListener("vkos:cerebro-atualizado", aoMudar);
  }, [carregar]);

  function abrirEdicao(indice: number, corpoAtual: string) {
    if (editando !== null && sujo) {
      const trocar = window.confirm("Você tem uma edição não salva. Descartar?");
      if (!trocar) return;
    }
    setEditando(indice);
    setRascunho(corpoAtual === "✍️" ? "" : corpoAtual);
    setSujo(false);
    setMudouPorFora(false);
  }

  function cancelarEdicao() {
    if (sujo && !window.confirm("Descartar o que você escreveu?")) return;
    setEditando(null);
    setSujo(false);
    if (mudouPorFora) {
      setMudouPorFora(false);
      void carregar();
    }
  }

  async function salvarSecao(indice: number) {
    setSalvando(true);
    setErro("");
    try {
      const resposta = await salvarCerebroSecao(indice, rascunho);
      setDados(resposta);
      setEditando(null);
      setSujo(false);
      setMudouPorFora(false);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarInteiro() {
    setSalvando(true);
    setErro("");
    try {
      await salvarCerebro(rascunho);
      setEditando(null);
      setSujo(false);
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  }

  function aoTecla(evento: React.KeyboardEvent, salvar: () => void) {
    if ((evento.ctrlKey || evento.metaKey) && evento.key === "Enter") {
      evento.preventDefault();
      salvar();
    }
    if (evento.key === "Escape") {
      evento.preventDefault();
      cancelarEdicao();
    }
  }

  const irEntrevista = () => navegarParaTela("cockpit");

  const secoes = dados?.secoes ?? [];
  const preenchidas = secoes.filter((s) => s.preenchida).length;
  const cerebroEmBranco = estadoVkos ? !estadoVkos.cerebroPreenchido : false;

  return (
    <section className="tela-fluxo tela-cerebro">
      <header className="tela-fluxo-topo cerebro-topo">
        <div>
          <h1>Cérebro do Negócio</h1>
          <p className="subtitulo">
            A identidade que toda geração usa. Edite qualquer seção quando o negócio mudar.
          </p>
        </div>
        {secoes.length > 0 && (
          <div className="cerebro-progresso" role="status">
            <span>
              {preenchidas} de {secoes.length} seções preenchidas
            </span>
            <span className="cerebro-progresso-trilho" aria-hidden="true">
              <span
                className="cerebro-progresso-fatia"
                style={{ width: `${Math.round((preenchidas / secoes.length) * 100)}%` }}
              />
            </span>
          </div>
        )}
      </header>

      <div className="tela-fluxo-corpo cerebro-corpo">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {mudouPorFora && (
        <Aviso tipo="atencao">
          O Cérebro mudou por fora enquanto você edita. Salve o seu texto ou cancele pra ver a versão nova.
        </Aviso>
      )}

      {carregando ? (
        <div className="cerebro-tela-carregando">Abrindo o Cérebro...</div>
      ) : semArquivo ? (
        <div className="cerebro-tela-vazia">
          <h2>Este negócio ainda não tem Cérebro</h2>
          <p>
            O caminho mais fácil é a entrevista guiada: uns 10 minutos de conversa e o
            Cérebro nasce pronto.
          </p>
          <Botao variante="primario" type="button" onClick={irEntrevista}>
            Montar pelo assistente
          </Botao>
        </div>
      ) : secoes.length === 0 ? (
        <article className="cerebro-cartao">
          <header className="cerebro-cartao-topo">
            <h2>Conteúdo do Cérebro</h2>
          </header>
          {editando === 0 ? (
            <div className="cerebro-cartao-edicao">
              <textarea
                className="cerebro-cartao-textarea"
                value={rascunho}
                autoFocus
                rows={14}
                onChange={(e) => {
                  setRascunho(e.target.value);
                  setSujo(true);
                }}
                onKeyDown={(e) => aoTecla(e, () => void salvarInteiro())}
              />
              <div className="cerebro-cartao-acoes">
                <Botao variante="sutil" type="button" onClick={cancelarEdicao}>Cancelar</Botao>
                <Botao variante="primario" type="button" ocupado={salvando} onClick={() => void salvarInteiro()}>
                  Salvar
                </Botao>
              </div>
            </div>
          ) : (
            <>
              <p className="cerebro-cartao-corpo">{textoInteiro}</p>
              <div className="cerebro-cartao-acoes">
                <Botao
                  variante="sutil"
                  type="button"
                  onClick={() => abrirEdicao(0, textoInteiro ?? "")}
                >
                  Editar
                </Botao>
              </div>
            </>
          )}
        </article>
      ) : (
        <>
          {cerebroEmBranco && (
            <div className="cerebro-chamada">
              <div>
                <strong>Começando do zero?</strong>
                <span>
                  A entrevista guiada preenche tudo com você, numa conversa de uns 10 minutos.
                </span>
              </div>
              <Botao variante="primario" type="button" onClick={irEntrevista}>
                Montar pelo assistente
              </Botao>
            </div>
          )}
          <div className="cerebro-grade">
            {secoes.map((secao) => (
              <article
                className={`cerebro-cartao${secao.preenchida ? "" : " em-branco"}`}
                key={secao.indice}
              >
                <header className="cerebro-cartao-topo">
                  <h2>{secao.titulo}</h2>
                  {!secao.preenchida && <span className="cerebro-cartao-badge">Em branco</span>}
                </header>
                {editando === secao.indice ? (
                  <div className="cerebro-cartao-edicao">
                    <textarea
                      className="cerebro-cartao-textarea"
                      value={rascunho}
                      autoFocus
                      rows={5}
                      placeholder="Escreva com as suas palavras. Vazio volta a seção pro estado em branco."
                      onChange={(e) => {
                        setRascunho(e.target.value);
                        setSujo(true);
                      }}
                      onKeyDown={(e) => aoTecla(e, () => void salvarSecao(secao.indice))}
                    />
                    <div className="cerebro-cartao-acoes">
                      <span className="cerebro-cartao-dica">Ctrl+Enter salva</span>
                      <Botao variante="sutil" type="button" onClick={cancelarEdicao}>
                        Cancelar
                      </Botao>
                      <Botao
                        variante="primario"
                        type="button"
                        ocupado={salvando}
                        onClick={() => void salvarSecao(secao.indice)}
                      >
                        Salvar
                      </Botao>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="cerebro-cartao-corpo">{secao.corpo}</p>
                    <div className="cerebro-cartao-acoes">
                      <Botao
                        variante="sutil"
                        type="button"
                        onClick={() => abrirEdicao(secao.indice, secao.corpo)}
                      >
                        Editar
                      </Botao>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      </div>
    </section>
  );
}
