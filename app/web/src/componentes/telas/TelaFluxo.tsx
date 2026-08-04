import { useMemo, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import type { Peca, TipoPeca } from "../../tipos/dominio";
import { baseNome, ROTULO_TIPO } from "./fluxos";
import { CartaoPeca } from "../pecas/CartaoPeca";
import { Lightbox } from "../pecas/Lightbox";
import { IconeGaleria } from "../comum/Icones";
import { irParaPeca } from "../layout/rotas";
import "./telas.css";

interface Props {
  tipo: TipoPeca;
}

interface EstadoVisor {
  peca: Peca;
  indice: number;
}

// Tela de um fluxo: os pedidos daquele tipo, um cartao cada, com previews.
export function TelaFluxo({ tipo }: Props) {
  const { pecas } = usarEstado();
  const [visor, setVisor] = useState<EstadoVisor | null>(null);

  const itens = useMemo(() => pecas.filter((p) => p.tipo === tipo), [pecas, tipo]);

  // Fluxos de imagem empilham um cartao por linha, com a tira maior.
  const empilhado = tipo === "carrossel" || tipo === "stories";

  const contagem = itens.length;
  const rotuloContagem = contagem === 1 ? "1 pedido" : `${contagem} pedidos`;

  return (
    <section className="tela tela-fluxo-tipo">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1>{ROTULO_TIPO[tipo]}</h1>
          <p>{rotuloContagem}</p>
        </div>
      </header>

      <div className="tela-corpo">
        {contagem === 0 ? (
          <div className="vazio">
            <IconeGaleria className="" />
            <h2>Nada gerado aqui ainda</h2>
            <p>
              Quando você disparar esse fluxo no Cockpit, as gerações aparecem
              aqui prontas para ver e usar.
            </p>
          </div>
        ) : (
          <div className={`telas-grade${empilhado ? " empilhada" : ""}`}>
            {itens.map((peca) => (
              <CartaoPeca
                key={peca.pasta}
                peca={peca}
                aoAmpliar={(peca, indice) => setVisor({ peca, indice })}
                aoEditar={(pasta) => {
                  irParaPeca("studio", pasta);
                }}
                aoAbrir={(pasta) => {
                  // Cada tipo tem a tela dele. Sem este desvio, a peça de
                  // anúncio abriria a tela do site e não acharia página nenhuma.
                  irParaPeca(peca.tipo === "anuncio" ? "anuncio" : "site", pasta);
                }}
              />
            ))}
          </div>
        )}
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
                  irParaPeca("studio", pasta);
                }
              : undefined
          }
          aoFechar={() => setVisor(null)}
        />
      )}
    </section>
  );
}
