import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { baseNome, formatarData, formatarTema } from "../telas/fluxos";
import { BotaoExcluirPeca, CartaoPeca } from "../pecas/CartaoPeca";
import { Lightbox } from "../pecas/Lightbox";
import { MiniaturaSite } from "./MiniaturaSite";
import { PreviewSite, paginaInicialSite } from "./PreviewSite";
import { IconeSeta, IconeX } from "../comum/Icones";
import type { Peca } from "../../tipos/dominio";
import { navegarParaCaminho } from "../layout/rotas";

interface Props {
  // Tipo cru da peca (carrossel, post, stories, site, texto, outro). String pra
  // aguentar tipos que o backend adicione (ex: "post") sem travar o front.
  tipo: string;
  aoFechar: () => void;
}

interface EstadoVisor {
  peca: Peca;
  indice: number;
}

// Rotulo no plural por tipo. Fallback pro proprio tipo capitalizado.
const ROTULO: Record<string, string> = {
  carrossel: "Carrosséis",
  post: "Posts",
  stories: "Stories",
  site: "Sites",
  texto: "Posts e textos",
  outro: "Outros",
};

function rotuloTipo(tipo: string): string {
  return ROTULO[tipo] ?? tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

// Galeria de um contexto de geracao em modal centralizado. Portal pra document
// .body: escapa do transform do React Flow, mesmo padrao do EditorContexto.
// Reusa CartaoPeca e Lightbox pra ficar igual as telas de fluxo da sidebar.
export function GaleriaContainer({ tipo, aoFechar }: Props) {
  const { pecas } = usarEstado();
  const [visor, setVisor] = useState<EstadoVisor | null>(null);
  // Peca de site aberta no painel de preview (null = fechado).
  const [preview, setPreview] = useState<string | null>(null);

  // Vive: filtra a lista global. Peca nova do tipo aparece sem recarregar.
  const itens = useMemo(() => pecas.filter((p) => p.tipo === tipo), [pecas, tipo]);

  // Fluxos de imagem empilham um card por linha, com a tira maior.
  const empilhado = tipo === "carrossel" || tipo === "stories";
  const ehSite = tipo === "site";

  // Enquanto a galeria (um overlay em tela cheia com blur) esta aberta, pausa
  // as animacoes continuas do canvas atras dela (pulso do Cerebro, arestas
  // vivas). Sem isso, cada frame do fundo obriga o backdrop-filter a recompor
  // o desfoque da tela inteira, e a galeria fica travada o tempo todo. O canvas
  // esta coberto, entao pausar e invisivel.
  useEffect(() => {
    document.body.classList.add("overlay-aberto");
    return () => {
      // So limpa se nenhum outro overlay ainda estiver aberto (o preview de site
      // e o lightbox tambem marcam). Contamos pela presenca de overlays vivos.
      if (document.querySelectorAll(".overlay-tela-cheia").length <= 1) {
        document.body.classList.remove("overlay-aberto");
      }
    };
  }, []);

  // Esc fecha a galeria, mas so quando nenhum overlay filho esta aberto (cada
  // um tem o seu proprio Esc). Captura na fase de captura pra chegar antes do
  // canvas.
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !visor && !preview) {
        e.stopPropagation();
        aoFechar();
      }
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [aoFechar, visor, preview]);

  const contagem = itens.length;
  const rotuloContagem = contagem === 1 ? "1 geração" : `${contagem} gerações`;

  return createPortal(
    <div className="overlay-tela-cheia" onMouseDown={aoFechar}>
      <div className="modal-galeria" onMouseDown={(e) => e.stopPropagation()}>
        <div className="topo-modal">
          <div className="titulo-galeria">
            <h2>{rotuloTipo(tipo)}</h2>
            <span className="subtitulo-galeria">{rotuloContagem}</span>
          </div>
          <button className="fechar" onClick={aoFechar} title="Fechar (Esc)">
            <IconeX className="" />
          </button>
        </div>

        <div className="corpo-galeria nowheel">
          {contagem === 0 ? (
            <div className="galeria-vazia">Nenhuma geração deste tipo ainda.</div>
          ) : ehSite ? (
            // Sites: grade de cartoes com miniatura viva. Clicar a miniatura
            // abre o preview no painel lateral; a nova aba fica no botao do lado.
            <div className="grade-sites">
              {itens.map((peca) => {
                const tema = formatarTema(peca.tema);
                const data = formatarData(peca.data);
                const pagina = paginaInicialSite(peca);
                return (
                  <article key={peca.pasta} className="cartao-site">
                    <button
                      className="cartao-site-capa"
                      onClick={() => setPreview(peca.pasta)}
                      title={`Pré-visualizar ${tema}`}
                    >
                      {pagina ? (
                        <MiniaturaSite url={pagina} titulo={tema} />
                      ) : (
                        <span className="cartao-site-vazio">Sem página</span>
                      )}
                    </button>
                    <div className="cartao-site-rodape">
                      <div className="cartao-site-info">
                        <h3 title={tema}>{tema}</h3>
                        {data && <span className="cartao-site-data">{data}</span>}
                      </div>
                      <div className="cartao-site-acoes">
                        <button
                          className="botao botao-neutro"
                          onClick={() => setPreview(peca.pasta)}
                        >
                          Pré-visualizar
                        </button>
                        {pagina && (
                          <a
                            className="botao botao-neutro cartao-site-nova-aba"
                            href={pagina}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir em nova aba"
                          >
                            <IconeSeta className="" />
                          </a>
                        )}
                        <BotaoExcluirPeca pasta={peca.pasta} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={`tela-fluxo-corpo${empilhado ? " empilhado" : ""}`}>
              {itens.map((peca) => (
                <CartaoPeca
                  key={peca.pasta}
                  peca={peca}
                  aoAmpliar={(peca, indice) => setVisor({ peca, indice })}
                  aoEditar={(pasta) => {
                    aoFechar();
                    navegarParaCaminho("/studio/" + encodeURIComponent(pasta));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {visor && (
        <Lightbox
          urls={visor.peca.previews}
          indiceInicial={visor.indice}
          nomeBase={empilhado ? baseNome(visor.peca.tema) : undefined}
          pecaHtml={visor.peca.fonteHtml ? { pasta: visor.peca.pasta } : undefined}
          aoEditar={
            visor.peca.fonteHtml
              ? () => {
                  const pasta = visor.peca.pasta;
                  setVisor(null);
                  aoFechar();
                  navegarParaCaminho("/studio/" + encodeURIComponent(pasta));
                }
              : undefined
          }
          aoFechar={() => setVisor(null)}
        />
      )}

      {preview && (
        <PreviewSite pasta={preview} aoFechar={() => setPreview(null)} />
      )}
    </div>,
    document.body
  );
}
