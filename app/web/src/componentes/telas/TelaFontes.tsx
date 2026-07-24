import type { TipoContexto } from "../../tipos/dominio";
import type { ItemFonte } from "../layout/Sidebar";
import { IconeImagens, IconeLinks, IconeTextos } from "./icones";
import { ROTULO_FONTE } from "./fontes";

interface Props {
  itens: ItemFonte[];
  aoNavegar: (tela: string) => void;
}

// Painel de fontes de dados, a antiga TelaFontes virou o miolo da sub-aba
// Fontes de dados da tela Arquivos.
export function PainelFontes({ itens, aoNavegar }: Props) {
  const total = itens.reduce((soma, item) => soma + item.total, 0);

  return (
    <div className="painel-fontes">
      <p className="subtitulo painel-fontes-topo">
        {total === 1 ? "1 fonte disponível" : `${total} fontes disponíveis`}
      </p>

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
    </div>
  );
}

function icone(tipo: TipoContexto) {
  if (tipo === "imagens") return <IconeImagens className="" />;
  if (tipo === "links") return <IconeLinks className="" />;
  return <IconeTextos className="" />;
}
