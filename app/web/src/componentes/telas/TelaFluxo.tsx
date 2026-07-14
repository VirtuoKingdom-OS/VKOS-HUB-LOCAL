import { useMemo, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import type { TipoPeca } from "../../tipos/dominio";
import { baseNome, ROTULO_TIPO } from "./fluxos";
import { CartaoPeca } from "../pecas/CartaoPeca";
import { Lightbox } from "../pecas/Lightbox";
import { IconeGaleria } from "../comum/Icones";

interface Props {
  tipo: TipoPeca;
}

interface EstadoVisor {
  urls: string[];
  indice: number;
  nomeBase?: string;
}

// Tela de um fluxo: os pedidos daquele tipo, um card cada, com previews.
export function TelaFluxo({ tipo }: Props) {
  const { pecas } = usarEstado();
  const [visor, setVisor] = useState<EstadoVisor | null>(null);

  const itens = useMemo(
    () => pecas.filter((p) => p.tipo === tipo),
    [pecas, tipo]
  );

  // Fluxos de imagem empilham um card por linha, com a tira maior.
  const empilhado = tipo === "carrossel" || tipo === "stories";

  const contagem = itens.length;
  const rotuloContagem =
    contagem === 1 ? "1 pedido" : `${contagem} pedidos`;

  return (
    <section className="tela-fluxo">
      <header className="tela-fluxo-topo">
        <h1>{ROTULO_TIPO[tipo]}</h1>
        <p className="subtitulo">{rotuloContagem}</p>
      </header>

      {contagem === 0 ? (
        <div className="fluxo-vazio">
          <IconeGaleria className="icone-vazio" style={{ width: 40, height: 40 }} />
          <h2>Nada gerado aqui ainda</h2>
          <p>
            Quando você disparar esse fluxo no Cockpit, as gerações aparecem
            aqui prontas pra ver e usar.
          </p>
        </div>
      ) : (
        <div className={`tela-fluxo-corpo${empilhado ? " empilhado" : ""}`}>
          {itens.map((peca) => (
            <CartaoPeca
              key={peca.pasta}
              peca={peca}
              aoAmpliar={(urls, indice) =>
                setVisor({
                  urls,
                  indice,
                  nomeBase: empilhado ? baseNome(peca.tema) : undefined,
                })
              }
            />
          ))}
        </div>
      )}

      {visor && (
        <Lightbox
          urls={visor.urls}
          indiceInicial={visor.indice}
          nomeBase={visor.nomeBase}
          aoFechar={() => setVisor(null)}
        />
      )}
    </section>
  );
}
