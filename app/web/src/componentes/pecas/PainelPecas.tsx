import { useMemo, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { urlPeca } from "../../api/cliente";
import type { Peca, TipoPeca } from "../../tipos/dominio";
import { IconeChevron, IconeGaleria, IconeX } from "../comum/Icones";

const ROTULO_TIPO: Record<TipoPeca, string> = {
  carrossel: "Carrossel",
  post: "Post",
  stories: "Stories",
  site: "Site",
  texto: "Texto",
  outro: "Outros",
};

const ORDEM_TIPOS: TipoPeca[] = ["carrossel", "post", "stories", "site", "texto", "outro"];

// Painel lateral direito, recolhivel, com a galeria de pecas geradas.
export function PainelPecas() {
  const { pecas } = usarEstado();
  const [aberto, setAberto] = useState(true);
  const [ampliada, setAmpliada] = useState<string | null>(null);

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
                  <span className="rotulo-secao">{ROTULO_TIPO[grupo.tipo]}</span>
                  <span className="badge status-fila">{grupo.itens.length}</span>
                </div>
                <div className="grade-pecas">
                  {grupo.itens.flatMap((peca) =>
                    montarMiniaturas(peca).map((mini) => (
                      <div
                        className="mini-peca"
                        key={mini.chave}
                        onClick={() => mini.url && setAmpliada(mini.url)}
                        title={peca.tema}
                      >
                        {mini.url ? (
                          <img src={mini.url} alt={peca.tema} loading="lazy" />
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
          <img src={ampliada} alt="Peça ampliada" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

interface Miniatura {
  chave: string;
  url: string | null;
}

// Uma peca pode ter varios previews. Se nao tiver, mostra um card de texto.
function montarMiniaturas(peca: Peca): Miniatura[] {
  if (peca.previews.length > 0) {
    return peca.previews.map((p, i) => ({
      chave: `${peca.pasta}-${i}`,
      url: urlPeca(p),
    }));
  }
  return [{ chave: peca.pasta, url: null }];
}
