import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconeSeta, IconeX } from "../comum/Icones";

interface Props {
  urls: string[];
  indiceInicial?: number;
  aoFechar: () => void;
}

// Visor de imagem ampliada, navegavel. Portal pra document.body: e um modal de
// tela cheia consciente, a excecao a regra de nao usar fixed no cockpit.
// Fecha no clique fora, no x ou no Esc. Setas do teclado trocam a imagem.
export function LightboxCanvas({ urls, indiceInicial = 0, aoFechar }: Props) {
  const [indice, setIndice] = useState(indiceInicial);
  const total = urls.length;

  const anterior = useCallback(
    () => setIndice((i) => (i - 1 + total) % total),
    [total]
  );
  const proximo = useCallback(() => setIndice((i) => (i + 1) % total), [total]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar();
      } else if (e.key === "ArrowLeft") anterior();
      else if (e.key === "ArrowRight") proximo();
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [aoFechar, anterior, proximo]);

  if (total === 0) return null;

  return createPortal(
    <div className="lightbox" onClick={aoFechar}>
      <button className="fechar" onClick={aoFechar} title="Fechar (Esc)">
        <IconeX className="" />
      </button>

      {total > 1 && (
        <button
          className="lightbox-nav esq"
          onClick={(e) => {
            e.stopPropagation();
            anterior();
          }}
          title="Anterior"
        >
          <IconeSeta className="" style={{ transform: "rotate(180deg)" }} />
        </button>
      )}

      <img
        src={urls[indice]}
        alt="Imagem ampliada"
        onClick={(e) => e.stopPropagation()}
      />

      {total > 1 && (
        <button
          className="lightbox-nav dir"
          onClick={(e) => {
            e.stopPropagation();
            proximo();
          }}
          title="Próxima"
        >
          <IconeSeta className="" />
        </button>
      )}

      {total > 1 && (
        <div className="lightbox-contador" onClick={(e) => e.stopPropagation()}>
          {indice + 1} / {total}
        </div>
      )}
    </div>,
    document.body
  );
}
