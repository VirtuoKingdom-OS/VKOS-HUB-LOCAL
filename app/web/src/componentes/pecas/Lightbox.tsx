import { useCallback, useEffect, useRef, useState } from "react";
import { IconeLapis, IconeSeta, IconeX } from "../comum/Icones";
import { IconeBaixar } from "../telas/icones";
import { nomeDownload } from "../telas/fluxos";

interface Props {
  urls: string[];
  indiceInicial: number;
  aoFechar: () => void;
  // Base do nome pra download. So peças de imagem legadas passam isto.
  nomeBase?: string;
  // Peça fonteHtml: urls sao paginas HTML isoladas, nao imagens. Presente
  // habilita o modo iframe, o baixar PNG sob demanda e o zip.
  pecaHtml?: { pasta: string };
  // Abre o editor visual do carrossel. So faz sentido junto de pecaHtml.
  aoEditar?: () => void;
}

// Rota do PNG de uma pagina, renderizado sob demanda no servidor.
function urlPngPagina(pasta: string, indice: number): string {
  return `/api/vkos/pecas/${encodeURIComponent(pasta)}/png/${indice + 1}`;
}

// Rota do zip com todas as paginas do carrossel.
function urlPngZip(pasta: string): string {
  return `/api/vkos/pecas/${encodeURIComponent(pasta)}/png-zip`;
}

// Visor ampliado. Navega entre as imagens ou paginas do mesmo pedido.
// Fecha no clique fora, no x ou no Esc. Setas do teclado trocam a pagina.
export function Lightbox({
  urls,
  indiceInicial,
  aoFechar,
  nomeBase,
  pecaHtml,
  aoEditar,
}: Props) {
  const [indice, setIndice] = useState(indiceInicial);
  const total = urls.length;

  // Tamanho real do slide (medido no iframe) e o fator de escala pra caber na
  // tela como uma imagem faria (max-width/max-height ~86vw/86vh).
  const refIframe = useRef<HTMLIFrameElement>(null);
  const [dimsPagina, setDimsPagina] = useState<{ largura: number; altura: number } | null>(
    null
  );
  const [fator, setFator] = useState(1);

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

  // Troca de pagina: esquece a medida anterior ate o novo iframe carregar,
  // senao a pagina de destino aparece um instante com a escala da anterior.
  useEffect(() => {
    setDimsPagina(null);
  }, [indice]);

  // Le o tamanho real do slide (contentDocument e acessivel, mesma origem) e
  // recalcula o fator sempre que a janela muda de tamanho.
  const aoCarregarPagina = useCallback(() => {
    const doc = refIframe.current?.contentDocument;
    if (!doc?.body) return;
    setDimsPagina({ largura: doc.body.scrollWidth, altura: doc.body.scrollHeight });
  }, []);

  useEffect(() => {
    if (!dimsPagina) return;
    const recalcular = () => {
      const larguraDisp = window.innerWidth * 0.86;
      const alturaDisp = window.innerHeight * 0.86;
      const f = Math.min(
        larguraDisp / dimsPagina.largura,
        alturaDisp / dimsPagina.altura,
        1
      );
      setFator(f > 0 ? f : 1);
    };
    recalcular();
    window.addEventListener("resize", recalcular);
    return () => window.removeEventListener("resize", recalcular);
  }, [dimsPagina]);

  return (
    // stopPropagation no mousedown: a galeria atras fecha no mousedown do
    // overlay, e sem isso o clique nas setas atravessava e fechava tudo.
    <div
      className="visor"
      onClick={aoFechar}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button className="visor-fechar" onClick={aoFechar} title="Fechar">
        <IconeX className="" />
      </button>

      {nomeBase && !pecaHtml && (
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

      {pecaHtml && (
        <div className="visor-acoes-html" onClick={(e) => e.stopPropagation()}>
          {/* Sem atributo download: o servidor manda o Content-Disposition
              com o nome certo, deixa ele decidir. */}
          <a
            className="visor-baixar"
            href={urlPngPagina(pecaHtml.pasta, indice)}
            title="Baixar o PNG desta página"
          >
            <IconeBaixar className="" />
            <span>Baixar PNG</span>
          </a>
          <a
            className="visor-baixar"
            href={urlPngZip(pecaHtml.pasta)}
            title="Baixar todas as páginas em um zip"
          >
            <IconeBaixar className="" />
            <span>Baixar todas (ZIP)</span>
          </a>
          {aoEditar && (
            <button
              className="visor-baixar"
              onClick={aoEditar}
              title="Abrir no Studio"
            >
              <IconeLapis className="" />
              <span>Editar no Studio</span>
            </button>
          )}
        </div>
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

      {pecaHtml ? (
        <div
          className={`visor-pagina-html${dimsPagina ? "" : " carregando"}`}
          onClick={(e) => e.stopPropagation()}
          style={
            dimsPagina
              ? {
                  width: `${dimsPagina.largura * fator}px`,
                  height: `${dimsPagina.altura * fator}px`,
                }
              : undefined
          }
        >
          <iframe
            ref={refIframe}
            className="visor-pagina-html-frame"
            src={urls[indice]}
            title="Página do carrossel"
            onLoad={aoCarregarPagina}
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
      ) : (
        <img
          src={urls[indice]}
          alt="Peça ampliada"
          onClick={(e) => e.stopPropagation()}
        />
      )}

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
