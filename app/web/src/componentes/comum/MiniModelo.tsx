import { useEffect, useRef, useState } from "react";

import { IconeCarrossel } from "./Icones";

export function MiniModelo({ id, slide = 1 }: { id: string; slide?: number }) {
  const refCaixa = useRef<HTMLDivElement>(null);
  const refIframe = useRef<HTMLIFrameElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [dims, setDims] = useState<{ largura: number; altura: number } | null>(null);
  const [fator, setFator] = useState(0);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setVisivel(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(caixa);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa || !dims) return;
    const medir = () => {
      const proximo = caixa.clientWidth / dims.largura;
      setFator(proximo > 0 ? proximo : 0);
    };
    const observador = new ResizeObserver(medir);
    observador.observe(caixa);
    medir();
    return () => observador.disconnect();
  }, [dims]);

  function aoCarregar() {
    const documento = refIframe.current?.contentDocument;
    if (!documento?.body || !documento.querySelector(".slide")) {
      setFalhou(true);
      return;
    }
    setFalhou(false);
    setDims({
      largura: documento.body.scrollWidth,
      altura: documento.body.scrollHeight,
    });
  }

  return (
    <span className="criacao-modelo-thumb" ref={refCaixa}>
      {falhou || !visivel ? (
        <span className="criacao-modelo-fallback">
          <IconeCarrossel className="" />
        </span>
      ) : (
        <iframe
          ref={refIframe}
          className="criacao-modelo-frame"
          src={`/modelos-html/${encodeURIComponent(id)}/preview?slide=${slide}`}
          title=""
          tabIndex={-1}
          aria-hidden="true"
          scrolling="no"
          onLoad={aoCarregar}
          onError={() => setFalhou(true)}
          style={
            dims && fator > 0
              ? {
                  width: `${dims.largura}px`,
                  height: `${dims.altura}px`,
                  transform: `scale(${fator})`,
                }
              : { opacity: 0 }
          }
        />
      )}
    </span>
  );
}
