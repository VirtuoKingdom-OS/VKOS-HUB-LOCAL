import type { TipoContexto } from "../../tipos/dominio";
import type { ItemFonte } from "../layout/Sidebar";
import { IconeChevron } from "../comum/Icones";
import { IconeImagens, IconeLinks, IconeTextos } from "./icones";
import { ROTULO_FONTE } from "./fontes";
import "./telas.css";

interface Props {
  itens: ItemFonte[];
  aoNavegar: (tela: string) => void;
}

// O hub das fontes de dados: tres alvos de navegacao, cada um com a contagem
// do que tem dentro. Lista densa, e nao cartao: nao ha imagem pra mostrar aqui,
// so nome e numero.
export function TelaFontes({ itens, aoNavegar }: Props) {
  const total = itens.reduce((soma, item) => soma + item.total, 0);

  return (
    <section className="tela tela-fontes">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1>Fontes de dados</h1>
          <p>
            {total === 1 ? "1 fonte disponível" : `${total} fontes disponíveis`}
          </p>
        </div>
      </header>

      <div className="tela-corpo">
        <div className="tela-corpo-estreito">
          <ul className="lista">
            {itens.map((item) => (
              <li key={item.tipo}>
                <button
                  type="button"
                  className="item-lista"
                  onClick={() => aoNavegar(`fonte:${item.tipo}`)}
                >
                  {icone(item.tipo)}
                  <span className="item-lista-texto">
                    <span className="item-lista-titulo">
                      {ROTULO_FONTE[item.tipo]}
                    </span>
                    <span className="item-lista-meta">
                      {item.total === 1 ? "1 fonte" : `${item.total} fontes`}
                    </span>
                  </span>
                  <span className="item-lista-acoes" aria-hidden="true">
                    <IconeChevron
                      className="fontes-seta"
                      style={{ transform: "rotate(180deg)" }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function icone(tipo: TipoContexto) {
  if (tipo === "imagens") return <IconeImagens className="" />;
  if (tipo === "links") return <IconeLinks className="" />;
  return <IconeTextos className="" />;
}
