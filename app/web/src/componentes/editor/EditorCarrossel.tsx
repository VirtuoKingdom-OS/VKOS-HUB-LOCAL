import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconeX,
  IconeChevron,
  IconeArquivo,
  IconeGaleria,
  IconeCheck,
} from "../comum/Icones";
import { usarMotorEdicao } from "./motor";
import "../../estilos/editor.css";

interface Props {
  // Subpasta da peca (um segmento), ex "2026-07-14-tema-curto".
  pasta: string;
  aoFechar: () => void;
}

const PESOS = ["300", "400", "500", "600", "700", "800"];

// Um valor de cor e hex simples (cabe no color picker) ou nao (rgba, gradiente).
function ehHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

// Envolve em aspas so quando o nome tem espaco.
function valorFonte(nome: string): string {
  return /\s/.test(nome) ? `'${nome}'` : nome;
}

// Nome amigavel da peca a partir da subpasta (tira o prefixo de data).
function nomeAmigavel(pasta: string): string {
  const base = pasta.split(/[\\/]/).pop() ?? pasta;
  const semData = base.replace(/^\d{4}-\d{2}-\d{2}-?/, "");
  const limpo = (semData || base).replace(/[-_]+/g, " ").trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

// Editor visual do carrossel, modo overlay: um slide por vez, escalado pra
// caber no palco. Toda a edicao vem do motor compartilhado (usarMotorEdicao).
// Este componente cuida so do que e do overlay: layout de um slide, escala,
// navegacao entre paginas, atalhos e o painel de propriedades.
export function EditorCarrossel({ pasta, aoFechar }: Props) {
  const [paginaAtual, setPaginaAtualState] = useState(0);
  const [dims, setDims] = useState({ w: 1080, h: 1350 });
  const [escala, setEscala] = useState(0.1);
  const [temFundo, setTemFundo] = useState(false);
  const [aplicarTodas, setAplicarTodas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ts] = useState(() => Date.now());

  const refIframe = useRef<HTMLIFrameElement>(null);
  const refCanvas = useRef<HTMLDivElement>(null);
  const refArquivo = useRef<HTMLInputElement>(null);
  const paginaRef = useRef(0);
  const escalaRef = useRef(0.1);
  // Espelha "nao salvo" num ref pra callback de atalho (Ctrl+S no iframe).
  const naoSalvoRef = useRef(false);
  escalaRef.current = escala;

  const getDoc = (): Document | null => refIframe.current?.contentDocument ?? null;

  // Layout de um slide por vez, injetado no doc a cada (re)carga do iframe.
  function injetarLayout(doc: Document) {
    let s = doc.getElementById("vkos-ed-layout") as HTMLStyleElement | null;
    if (!s) {
      s = doc.createElement("style");
      s.id = "vkos-ed-layout";
      doc.head.appendChild(s);
    }
    s.textContent =
      ".slide{display:none !important;}" +
      ".slide[data-ed-atual]{display:block !important;margin:0 !important;}";
  }

  // Marca o slide visivel pelo indice. Os outros somem pelo layout.
  function marcarPagina(doc: Document, i: number) {
    doc.querySelectorAll<HTMLElement>(".slide").forEach((s, k) => {
      if (k === i) s.setAttribute("data-ed-atual", "1");
      else s.removeAttribute("data-ed-atual");
    });
  }

  // Mede o slide atual e calcula a escala pra caber inteiro no palco.
  function medir() {
    const doc = getDoc();
    const box = refCanvas.current;
    if (!doc || !box) return;
    const slide =
      doc.querySelectorAll<HTMLElement>(".slide")[paginaRef.current] ||
      doc.querySelector<HTMLElement>(".slide");
    const w = slide?.offsetWidth || 1080;
    const h = slide?.offsetHeight || 1350;
    const pad = 56;
    const f = Math.min((box.clientWidth - pad) / w, (box.clientHeight - pad) / h, 1);
    setDims({ w, h });
    setEscala(f > 0 ? f : 0.1);
  }

  const motor = usarMotorEdicao(refIframe, {
    pasta,
    aoMudar: () => {},
    obterEscala: () => escalaRef.current,
    // Ctrl+S com o foco dentro do iframe: mesmo caminho de salvar do overlay.
    aoAtalhoSalvar: () => {
      if (naoSalvoRef.current && !salvando) void salvarWrap();
    },
    aoInstrumentar: (doc) => {
      injetarLayout(doc);
      const total = doc.querySelectorAll(".slide").length || 1;
      const inicial = Math.min(paginaRef.current, total - 1);
      paginaRef.current = inicial;
      setPaginaAtualState(inicial);
      marcarPagina(doc, inicial);
      setTemFundo(motor.paginaTemFundo(inicial));
      requestAnimationFrame(() => medir());
    },
  });
  naoSalvoRef.current = motor.naoSalvo;

  function setPagina(i: number) {
    paginaRef.current = i;
    setPaginaAtualState(i);
  }

  // Espelha a selecao num ref pro handler de teclado decidir seta = mover ou
  // seta = trocar pagina sem reanexar listener.
  const temSelecaoRef = useRef(false);
  temSelecaoRef.current = !!motor.selecao;

  // ===== Pausa o canvas animado atras do overlay (padrao do GaleriaContainer).
  useEffect(() => {
    document.body.classList.add("overlay-aberto");
    return () => {
      if (document.querySelectorAll(".overlay-tela-cheia").length <= 1) {
        document.body.classList.remove("overlay-aberto");
      }
    };
  }, []);

  // Troca de pagina: remarca, redetecta o fundo, limpa selecao e remede.
  useEffect(() => {
    if (!motor.pronto) return;
    const doc = getDoc();
    if (!doc) return;
    marcarPagina(doc, paginaAtual);
    setTemFundo(motor.paginaTemFundo(paginaAtual));
    motor.limparSelecao();
    medir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaAtual, motor.pronto]);

  // Remede quando o palco muda de tamanho.
  useEffect(() => {
    const box = refCanvas.current;
    if (!box) return;
    const ro = new ResizeObserver(() => medir());
    ro.observe(box);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor.pronto]);

  function tentarFechar() {
    if (motor.naoSalvo) setConfirmando(true);
    else aoFechar();
  }

  async function salvarWrap(): Promise<boolean> {
    if (salvando) return false;
    setSalvando(true);
    setErro(null);
    try {
      await motor.salvar();
      return true;
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function salvarESair() {
    const ok = await salvarWrap();
    if (ok) aoFechar();
  }

  async function aoEscolherImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await motor.trocarImagemFundo(paginaAtual, file);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar a imagem.");
    }
  }

  // Teclado do overlay: Esc fecha, Ctrl+S salva, Ctrl+Z desfaz. Setas trocam
  // pagina so quando nao ha selecao (com selecao, o motor move o elemento).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const digitando = alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName);
      if (e.key === "Escape") {
        e.stopPropagation();
        if (confirmando) setConfirmando(false);
        else tentarFechar();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (motor.naoSalvo && !salvando) void salvarWrap();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        motor.desfazer();
        return;
      }
      if (digitando || temSelecaoRef.current) return;
      if (e.key === "ArrowLeft" && paginaRef.current > 0) setPagina(paginaRef.current - 1);
      if (e.key === "ArrowRight" && paginaRef.current < motor.paginas - 1) {
        setPagina(paginaRef.current + 1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmando, motor.naoSalvo, salvando, motor.paginas]);

  const src = `/pecas/${encodeURIComponent(pasta)}/carrossel.html?vk=${ts}`;
  const nome = nomeAmigavel(pasta);
  const sel = motor.selecao;

  function baixar(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return createPortal(
    <div className="overlay-tela-cheia" onMouseDown={tentarFechar}>
      <div className="editor-shell" onMouseDown={(e) => e.stopPropagation()}>
        <header className="editor-topo">
          <div className="editor-titulo">
            <h2 title={nome}>{nome}</h2>
            {motor.naoSalvo && (
              <span className="editor-ponto-salvar" title="Alterações não salvas" />
            )}
          </div>
          <div className="editor-acoes">
            <button
              className="botao botao-fantasma"
              onClick={motor.desfazer}
              disabled={!motor.podeDesfazer}
              title="Desfazer (Ctrl+Z)"
            >
              Desfazer
            </button>
            <button
              className="botao botao-neutro"
              onClick={() => baixar(`/api/vkos/pecas/${encodeURIComponent(pasta)}/png/${paginaAtual + 1}`)}
              title="Baixar PNG desta página"
            >
              <IconeArquivo className="" />
              PNG da página
            </button>
            <button
              className="botao botao-neutro"
              onClick={() => baixar(`/api/vkos/pecas/${encodeURIComponent(pasta)}/png-zip`)}
              title="Baixar todas as páginas em ZIP"
            >
              <IconeGaleria className="" />
              Todas (ZIP)
            </button>
            <button
              className="botao botao-principal"
              onClick={() => void salvarWrap()}
              disabled={!motor.naoSalvo || salvando}
              title="Salvar (Ctrl+S)"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button className="editor-fechar" onClick={tentarFechar} title="Fechar (Esc)">
              <IconeX className="" />
            </button>
          </div>
        </header>

        {erro && <div className="editor-erro">{erro}</div>}

        <div className="editor-corpo">
          {motor.paginas > 1 && (
            <nav className="editor-rail" aria-label="Páginas">
              {Array.from({ length: motor.paginas }, (_, i) => (
                <button
                  key={i}
                  className={`editor-rail-item${i === paginaAtual ? " ativo" : ""}`}
                  onClick={() => setPagina(i)}
                  title={`Página ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </nav>
          )}

          <div className="editor-canvas" ref={refCanvas}>
            <div
              className="editor-palco"
              style={{ width: dims.w * escala, height: dims.h * escala }}
            >
              <iframe
                ref={refIframe}
                className="editor-frame"
                src={src}
                title={nome}
                style={{
                  width: `${dims.w}px`,
                  height: `${dims.h}px`,
                  transform: `scale(${escala})`,
                }}
              />
            </div>

            <div className="editor-navbar">
              <button
                className="editor-nav-btn"
                onClick={() => setPagina(Math.max(0, paginaAtual - 1))}
                disabled={paginaAtual === 0}
                title="Página anterior"
              >
                <IconeChevron className="" />
              </button>
              <span className="editor-nav-contador">
                {paginaAtual + 1} / {motor.paginas}
              </span>
              <button
                className="editor-nav-btn dir"
                onClick={() => setPagina(Math.min(motor.paginas - 1, paginaAtual + 1))}
                disabled={paginaAtual >= motor.paginas - 1}
                title="Próxima página"
              >
                <IconeChevron className="" />
              </button>
            </div>
          </div>

          <aside className="editor-painel nowheel">
            {/* Cores globais do tema (variaveis do :root). */}
            <section className="painel-secao">
              <div className="secao-titulo rotulo-secao">Cores do tema</div>
              {motor.vars.length === 0 ? (
                <p className="painel-vazio">Este modelo não expõe cores no :root.</p>
              ) : (
                <div className="lista-cores">
                  {motor.vars.map((v) => (
                    <div className="cor-item" key={v.nome}>
                      <span className="cor-nome" title={v.nome}>
                        {v.nome.replace(/^--/, "")}
                      </span>
                      {ehHex(v.valor) ? (
                        <label className="cor-swatch">
                          <input
                            type="color"
                            value={v.valor.length === 4
                              ? "#" + v.valor.slice(1).replace(/./g, (c) => c + c)
                              : v.valor}
                            onChange={(e) => motor.aplicarVar(v.nome, e.target.value)}
                          />
                          <span style={{ background: v.valor }} />
                        </label>
                      ) : (
                        <input
                          className="cor-texto"
                          value={v.valor}
                          onChange={(e) => motor.aplicarVar(v.nome, e.target.value)}
                          spellCheck={false}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Elemento selecionado. */}
            <section className="painel-secao">
              <div className="secao-titulo rotulo-secao">Elemento</div>
              {!sel ? (
                <p className="painel-vazio">
                  Clique num texto do slide para selecionar. Dê dois cliques para
                  editar. Arraste para mover, ou use as setas do teclado.
                </p>
              ) : (
                <div className="campos-elemento">
                  <div className="chip-alvo">
                    <code>{sel.tag}</code>
                    {sel.classes && <span>.{sel.classes.split(" ").join(".")}</span>}
                  </div>

                  <label className="campo">
                    <span>Texto</span>
                    <textarea
                      value={sel.texto}
                      disabled={!sel.editavelTexto}
                      onChange={(e) => motor.aplicarTexto(e.target.value)}
                      rows={2}
                    />
                    {!sel.editavelTexto ? (
                      <small className="campo-nota">
                        Dê dois cliques direto no texto, ou selecione um trecho menor.
                      </small>
                    ) : sel.temDestaqueInline ? (
                      <small className="campo-nota">
                        Partes coloridas: editar aqui remove o destaque. Prefira o
                        duplo clique no slide.
                      </small>
                    ) : null}
                  </label>

                  <label className="campo">
                    <span>Fonte</span>
                    <select
                      value={sel.fonte}
                      onChange={(e) =>
                        motor.comEstilo("font-family", valorFonte(e.target.value), aplicarTodas)
                      }
                    >
                      {motor.fontesOpc.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="campo-linha">
                    <label className="campo">
                      <span>Tamanho</span>
                      <input
                        type="number"
                        value={sel.tamanho}
                        onChange={(e) =>
                          motor.comEstilo("font-size", `${Number(e.target.value)}px`, aplicarTodas)
                        }
                      />
                    </label>
                    <label className="campo">
                      <span>Peso</span>
                      <select
                        value={sel.peso}
                        onChange={(e) => motor.comEstilo("font-weight", e.target.value, aplicarTodas)}
                      >
                        {PESOS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="campo campo-cor">
                      <span>Cor</span>
                      <label className="cor-swatch">
                        <input
                          type="color"
                          value={sel.cor}
                          onChange={(e) => motor.comEstilo("color", e.target.value, aplicarTodas)}
                        />
                        <span style={{ background: sel.cor }} />
                      </label>
                    </label>
                  </div>

                  {/* Posicao: reset aparece so quando o elemento foi movido. */}
                  {sel.posicaoAjustada && (
                    <div className="campo-posicao">
                      <span className="posicao-nota">Elemento movido</span>
                      <button className="botao botao-fantasma botao-reset-pos" onClick={motor.resetarPosicao}>
                        Posição original
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Toggle de aplicar em todas as paginas. */}
            <section className="painel-secao">
              <button
                className={`toggle-todas${aplicarTodas ? " ativo" : ""}`}
                onClick={() => setAplicarTodas((v) => !v)}
              >
                <span className="toggle-marca">{aplicarTodas && <IconeCheck className="" />}</span>
                <span className="toggle-texto">
                  Aplicar estilo em todas as páginas
                  <small>Mesma tag e classes, em todos os slides. Texto nunca replica.</small>
                </span>
              </button>
            </section>

            {/* Imagem de fundo do slide. */}
            <section className="painel-secao">
              <div className="secao-titulo rotulo-secao">Imagem de fundo</div>
              {temFundo ? (
                <button
                  className="botao botao-neutro botao-fundo"
                  onClick={() => refArquivo.current?.click()}
                >
                  Trocar imagem
                </button>
              ) : (
                <p className="painel-vazio">Este slide não tem imagem de fundo.</p>
              )}
              <input
                ref={refArquivo}
                type="file"
                accept="image/*"
                hidden
                onChange={aoEscolherImagem}
              />
            </section>
          </aside>
        </div>
      </div>

      {confirmando && (
        <div className="editor-confirm-scrim" onMouseDown={() => setConfirmando(false)}>
          <div className="editor-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Sair com alterações não salvas?</h3>
            <p>As mudanças que você fez neste carrossel serão perdidas.</p>
            <div className="editor-confirm-acoes">
              <button className="botao botao-fantasma" onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
              <button className="botao botao-perigo" onClick={aoFechar}>
                Sair sem salvar
              </button>
              <button className="botao botao-principal" onClick={() => void salvarESair()}>
                Salvar e sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
