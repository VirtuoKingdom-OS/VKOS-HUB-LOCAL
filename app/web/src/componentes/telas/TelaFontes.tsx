import type { TipoContexto } from "../../tipos/dominio";
import type { ItemFonte } from "../layout/Sidebar";
import { IconeImagens, IconeLinks, IconeTextos } from "./icones";
import { ROTULO_FONTE } from "./fontes";

interface Props {
  itens: ItemFonte[];
  aoNavegar: (tela: string) => void;
}

export function TelaFontes({ itens, aoNavegar }: Props) {
  const total = itens.reduce((soma, item) => soma + item.total, 0);

  return (
    <section className="tela-fluxo tela-fontes">
      <header className="tela-fluxo-topo">
        <div>
          <h1>Fontes de dados</h1>
          <p className="subtitulo">
            {total === 1 ? "1 fonte disponível" : `${total} fontes disponíveis`}
          </p>
        </div>
      </header>

      <div className="fontes-hub-grade">
        {itens.map((item, indice) => (
          <button
            key={item.tipo}
            className="fontes-hub-card"
            style={{ animationDelay: `${indice * 45}ms` }}
            onClick={() => aoNavegar(`fonte:${item.tipo}`)}
          >
            <span className="fontes-hub-icone">{icone(item.tipo)}</span>
            <span className="fontes-hub-texto">
              <strong>{ROTULO_FONTE[item.tipo]}</strong>
              <span>{item.total === 1 ? "1 fonte" : `${item.total} fontes`}</span>
            </span>
            <span className="fontes-hub-seta" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function icone(tipo: TipoContexto) {
  if (tipo === "imagens") return <IconeImagens className="" />;
  if (tipo === "links") return <IconeLinks className="" />;
  return <IconeTextos className="" />;
}
