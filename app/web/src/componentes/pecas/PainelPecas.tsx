import { useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { urlPeca } from "../../api/cliente";
import type { Peca, TipoPeca } from "../../tipos/dominio";
import { IconeChevron, IconeGaleria, IconeX } from "../comum/Icones";

const ROTULO_TIPO: Record<TipoPeca, string> = {
  carrossel: "Carrossel",
  post: "Post",
  stories: "Stories",
  site: "Site",
  anuncio: "Anúncios",
  texto: "Texto",
  outro: "Outros",
};

const ORDEM_TIPOS: TipoPeca[] = [
  "carrossel",
  "post",
  "stories",
  "site",
  "anuncio",
  "texto",
  "outro",
];

// Painel lateral direito, recolhivel, com a galeria de pecas geradas.
export function PainelPecas() {
  const { pecas } = usarEstado();
  const [aberto, setAberto] = useState(true);
  const [ampliada, setAmpliada] = useState<Miniatura | null>(null);

  const grupos = useMemo(() => {
    const mapa = new Map<TipoPeca, Peca[]>();
    for (const peca of pecas) {
      const lista = mapa.get(peca.tipo) ?? [];
      lista.push(peca);
      mapa.set(peca.tipo, lista);
    }
    return ORDEM_TIPOS.filter((t) => mapa.has(t)).map((t) => ({
      tipo: t,
      itens: mapa.get(t) ?? [],
    }));
  }, [pecas]);

  return (
    <>
      <button
        className={`aba-pecas${aberto ? "" : " fechado"}`}
        onClick={() => setAberto((v) => !v)}
        title={aberto ? "Recolher peças" : "Ver peças"}
      >
        <IconeGaleria className="" />
        Peças
      </button>

      <aside className={`painel-pecas${aberto ? "" : " recolhido"}`}>
        <div className="topo">
          <h2>Peças geradas</h2>
          <button
            className="fechar"
            onClick={() => setAberto(false)}
            title="Recolher"
          >
            <IconeChevron className="" style={{ transform: "rotate(180deg)" }} />
          </button>
        </div>

        <div className="lista">
          {grupos.length === 0 ? (
            <div className="vazio-pecas">
              Nada por aqui ainda. Dispare um fluxo e as peças aparecem aqui
              assim que ficarem prontas.
            </div>
          ) : (
            grupos.map((grupo) => (
              <div className="grupo-pecas" key={grupo.tipo}>
                <div className="titulo-grupo">
                  <span className="rotulo-grupo">{ROTULO_TIPO[grupo.tipo]}</span>
                  <span className="contagem">{grupo.itens.length}</span>
                </div>
                <div className="grade-pecas">
                  {grupo.itens.flatMap((peca) =>
                    montarMiniaturas(peca).map((mini) => (
                      <div
                        className="mini-peca"
                        key={mini.chave}
                        onClick={() => mini.url && setAmpliada(mini)}
                        title={peca.tema}
                      >
                        {mini.url ? (
                          mini.html ? (
                            <MiniaturaPaginaPainel url={mini.url} titulo={peca.tema} />
                          ) : (
                            <img src={mini.url} alt={peca.tema} loading="lazy" />
                          )
                        ) : (
                          <div className="sem-preview">{peca.tema}</div>
                        )}
                        <div className="legenda-peca">{peca.tema}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {ampliada && (
        <div className="lightbox" onClick={() => setAmpliada(null)}>
          <button className="fechar" onClick={() => setAmpliada(null)} title="Fechar">
            <IconeX className="" />
          </button>
          {ampliada.html ? (
            <PaginaAmpliadaPainel url={ampliada.url!} />
          ) : (
            <img
              src={ampliada.url!}
              alt="Peça ampliada"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}

// Miniatura viva de uma pagina de carrossel fonteHtml, escalada pra caber no
// slot 4:5 do grid. Mesmo principio do MiniaturaSite: mede o documento pelo
// contentDocument e aplica transform:scale(), sem interacao (pointer-events
// none no css).
function MiniaturaPaginaPainel({ url, titulo }: { url: string; titulo: string }) {
  const refCaixa = useRef<HTMLDivElement>(null);
  const refIframe = useRef<HTMLIFrameElement>(null);
  const [dimsPagina, setDimsPagina] = useState<{ largura: number; altura: number } | null>(
    null
  );
  const [fator, setFator] = useState(0);

  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa || !dimsPagina) return;
    const medir = () => {
      const f = caixa.clientWidth / dimsPagina.largura;
      setFator(f > 0 ? f : 0);
    };
    const ro = new ResizeObserver(medir);
    ro.observe(caixa);
    medir();
    return () => ro.disconnect();
  }, [dimsPagina]);

  function aoCarregar() {
    const doc = refIframe.current?.contentDocument;
    if (!doc?.body) return;
    setDimsPagina({ largura: doc.body.scrollWidth, altura: doc.body.scrollHeight });
  }

  return (
    <div className="mini-peca-html" ref={refCaixa}>
      <iframe
        ref={refIframe}
        className="mini-peca-html-frame"
        src={url}
        title={titulo}
        loading="lazy"
        tabIndex={-1}
        aria-hidden="true"
        onLoad={aoCarregar}
        style={
          dimsPagina && fator > 0
            ? {
                width: `${dimsPagina.largura}px`,
                height: `${dimsPagina.altura}px`,
                transform: `scale(${fator})`,
              }
            : { opacity: 0 }
        }
      />
    </div>
  );
}

// Pagina HTML ampliada no lightbox simples do painel. Escala pra caber na
// tela igual a uma imagem faria, recalculando em resize.
function PaginaAmpliadaPainel({ url }: { url: string }) {
  const refIframe = useRef<HTMLIFrameElement>(null);
  const [dimsPagina, setDimsPagina] = useState<{ largura: number; altura: number } | null>(
    null
  );
  const [fator, setFator] = useState(1);

  function aoCarregar() {
    const doc = refIframe.current?.contentDocument;
    if (!doc?.body) return;
    setDimsPagina({ largura: doc.body.scrollWidth, altura: doc.body.scrollHeight });
  }

  useEffect(() => {
    if (!dimsPagina) return;
    const recalcular = () => {
      const f = Math.min(
        (window.innerWidth * 0.86) / dimsPagina.largura,
        (window.innerHeight * 0.86) / dimsPagina.altura,
        1
      );
      setFator(f > 0 ? f : 1);
    };
    recalcular();
    window.addEventListener("resize", recalcular);
    return () => window.removeEventListener("resize", recalcular);
  }, [dimsPagina]);

  return (
    <div
      className="pagina-ampliada-painel"
      onClick={(e) => e.stopPropagation()}
      style={
        dimsPagina
          ? { width: `${dimsPagina.largura * fator}px`, height: `${dimsPagina.altura * fator}px` }
          : undefined
      }
    >
      <iframe
        ref={refIframe}
        className="pagina-ampliada-painel-frame"
        src={url}
        title="Página ampliada"
        onLoad={aoCarregar}
        style={
          dimsPagina
            ? {
                width: `${dimsPagina.largura}px`,
                height: `${dimsPagina.altura}px`,
                transform: `scale(${fator})`,
              }
            : undefined
        }
      />
    </div>
  );
}

interface Miniatura {
  chave: string;
  url: string | null;
  // Peca fonteHtml: a url e uma pagina isolada, nao uma imagem.
  html?: boolean;
}

// Uma peca pode ter varios previews. Se nao tiver, mostra um card de texto.
function montarMiniaturas(peca: Peca): Miniatura[] {
  if (peca.previews.length > 0) {
    return peca.previews.map((p, i) => ({
      chave: `${peca.pasta}-${i}`,
      url: urlPeca(p),
      html: peca.fonteHtml,
    }));
  }
  return [{ chave: peca.pasta, url: null }];
}
