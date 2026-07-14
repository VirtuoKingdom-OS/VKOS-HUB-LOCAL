import { useCallback, useEffect, useState } from "react";
import { IconeSeta, IconeX } from "../comum/Icones";
import { IconeBaixar } from "../telas/icones";
import { nomeDownload } from "../telas/fluxos";

interface Props {
  urls: string[];
  indiceInicial: number;
  aoFechar: () => void;
  // Base do nome pra download. So peças de imagem passam isto.
  nomeBase?: string;
}

// Visor de imagem ampliada. Navega entre as imagens do mesmo pedido.
// Fecha no clique fora, no x ou no Esc. Setas do teclado trocam a imagem.
export function Lightbox({ urls, indiceInicial, aoFechar, nomeBase }: Props) {
  const [indice, setIndice] = useState(indiceInicial);
  const total = urls.length;

  const anterior = useCallback(
    () => setIndice((i) => (i - 1 + total) % total),
    [total]
  );
  const proximo = useCallback(() => setIndice((i) => (i + 1) % total), [total]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
      else if (evento.key === "ArrowLeft") anterior();
      else if (evento.key === "ArrowRight") proximo();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar, anterior, proximo]);

  return (
    <div className="visor" onClick={aoFechar}>
      <button className="visor-fechar" onClick={aoFechar} title="Fechar">
        <IconeX className="" />
      </button>

      {nomeBase && (
        <a
          className="visor-baixar"
          href={urls[indice]}
          download={nomeDownload(nomeBase, indice, urls[indice])}
          onClick={(e) => e.stopPropagation()}
          title="Baixar esta imagem"
        >
          <IconeBaixar className="" />
          <span>Baixar imagem</span>
        </a>
      )}

      {total > 1 && (
        <button
          className="visor-nav esq"
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
        alt="Peça ampliada"
        onClick={(e) => e.stopPropagation()}
      />

      {total > 1 && (
        <button
          className="visor-nav dir"
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
        <div className="visor-contador" onClick={(e) => e.stopPropagation()}>
          {indice + 1} / {total}
        </div>
      )}
    </div>
  );
}
