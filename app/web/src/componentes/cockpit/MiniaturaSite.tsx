import { memo, useEffect, useRef, useState } from "react";

// Largura real que o iframe renderiza antes de escalar. A pagina se comporta
// como num desktop estreito e depois encolhe pro slot com transform: scale().
const LARGURA_LOGICA = 1280;

interface Props {
  // Pagina do site a renderizar (url ja pronta, /pecas/...).
  url: string;
  titulo: string;
}

// Miniatura viva de um site: um iframe da propria pagina, escalado com
// transform: scale() pra caber no slot. Sem interacao (pointer-events none no
// css), carrega tarde (loading lazy) e so monta quando entra na viewport
// (IntersectionObserver), pra segurar a performance quando ha muitos sites.
function MiniaturaSiteInterna({ url, titulo }: Props) {
  const refCaixa = useRef<HTMLDivElement>(null);
  const [fator, setFator] = useState(0);
  const [alturaLogica, setAlturaLogica] = useState(0);
  const [visivel, setVisivel] = useState(false);

  // Mede o slot. O fator leva a largura logica ate a largura real do slot; a
  // altura logica preenche a altura real no mesmo fator, mostrando o topo da
  // pagina sem distorcer.
  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa) return;
    const medir = () => {
      const larg = caixa.clientWidth;
      const alt = caixa.clientHeight;
      if (larg <= 0) return;
      const f = larg / LARGURA_LOGICA;
      setFator(f);
      setAlturaLogica(f > 0 ? Math.ceil(alt / f) : 0);
    };
    const ro = new ResizeObserver(medir);
    ro.observe(caixa);
    medir();
    return () => ro.disconnect();
  }, []);

  // So monta o iframe quando o slot chega perto da tela.
  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setVisivel(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "240px" }
    );
    io.observe(caixa);
    return () => io.disconnect();
  }, []);

  const pronto = visivel && fator > 0 && alturaLogica > 0;

  return (
    <div className="mini-site" ref={refCaixa}>
      {pronto ? (
        <iframe
          className="mini-site-frame"
          src={url}
          title={titulo}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          tabIndex={-1}
          aria-hidden="true"
          style={{
            width: `${LARGURA_LOGICA}px`,
            height: `${alturaLogica}px`,
            transform: `scale(${fator})`,
          }}
        />
      ) : (
        <span className="mini-site-espera" />
      )}
    </div>
  );
}

// Memoizada: o iframe vivo so re-renderiza se a url mudar, nao a cada render
// do contêiner em volta.
export const MiniaturaSite = memo(MiniaturaSiteInterna);
