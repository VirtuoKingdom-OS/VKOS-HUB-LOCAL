import { useMemo, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import type { Peca, TipoPeca } from "../../tipos/dominio";
import { baseNome } from "./fluxos";
import { CartaoPeca } from "../pecas/CartaoPeca";
import { Lightbox } from "../pecas/Lightbox";
import { IconeGaleria } from "../comum/Icones";
import "../../estilos/dashboard.css";
import { navegarParaCaminho } from "../layout/rotas";

interface EstadoVisor {
  peca: Peca;
  indice: number;
}

// Tipos de imagem que a galeria unificada reune, na ordem canonica.
const TIPOS_GALERIA: TipoPeca[] = ["carrossel", "post", "stories"];

type Filtro = "todos" | TipoPeca;

// Rotulo curto de cada chip de filtro.
const ROTULO_CHIP: Record<Filtro, string> = {
  todos: "Todos",
  carrossel: "Carrosséis",
  post: "Posts",
  stories: "Stories",
  site: "Site",
  texto: "Textos",
  outro: "Outros",
};

// Navega pro Studio de uma peca fonteHtml (pasta URL-encoded no hash).
function irParaStudio(pasta: string) {
  navegarParaCaminho("/studio/" + encodeURIComponent(pasta));
}

// Painel de criacoes visuais (carrossel, post, stories), a antiga TelaGalerias
// virou o miolo da sub-aba Criacoes da tela Arquivos. Reaproveita CartaoPeca e
// Lightbox com chips de filtro por tipo; editar peca fonteHtml leva ao Studio.
export function PainelCriacoes() {
  const { pecas } = usarEstado();
  const [visor, setVisor] = useState<EstadoVisor | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  // Todas as pecas de imagem, na ordem que chegam do estado.
  const itensImagem = useMemo(
    () => pecas.filter((p) => TIPOS_GALERIA.includes(p.tipo)),
    [pecas]
  );

  // Tipos que tem ao menos uma peca, na ordem canonica: define quais chips
  // aparecem (chip so existe se o tipo tem peca).
  const tiposPresentes = useMemo(
    () => TIPOS_GALERIA.filter((t) => itensImagem.some((p) => p.tipo === t)),
    [itensImagem]
  );

  // Se o filtro ativo perdeu suas pecas (tudo excluido), cai em "todos".
  const filtroValido =
    filtro === "todos" || tiposPresentes.includes(filtro) ? filtro : "todos";

  const itens = useMemo(
    () =>
      filtroValido === "todos"
        ? itensImagem
        : itensImagem.filter((p) => p.tipo === filtroValido),
    [itensImagem, filtroValido]
  );

  const contagem = itens.length;
  const rotuloContagem =
    contagem === 1 ? "1 peça" : `${contagem} peças`;

  // Carrossel/stories rendem uma tira maior por card, como na tela de fluxo.
  const empilhado =
    filtroValido === "carrossel" || filtroValido === "stories";

  // So no filtro "Todos" o card fica condensado (rodada 14): nos filtros por
  // tipo o card ja empilha e usa a tira grande, como nas telas de fluxo.
  const condensado = filtroValido === "todos";

  return (
    <div className="painel-criacoes">
      <div className="galerias-topo-linha painel-criacoes-topo">
        <p className="subtitulo">{rotuloContagem}</p>
        {tiposPresentes.length > 0 && (
          <div className="galerias-chips" role="tablist" aria-label="Filtrar por tipo">
            <button
              className={`chip-filtro${filtroValido === "todos" ? " ativo" : ""}`}
              onClick={() => setFiltro("todos")}
              role="tab"
              aria-selected={filtroValido === "todos"}
            >
              {ROTULO_CHIP.todos}
            </button>
            {tiposPresentes.map((t) => (
              <button
                key={t}
                className={`chip-filtro${filtroValido === t ? " ativo" : ""}`}
                onClick={() => setFiltro(t)}
                role="tab"
                aria-selected={filtroValido === t}
              >
                {ROTULO_CHIP[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      {contagem === 0 ? (
        <div className="fluxo-vazio">
          <IconeGaleria className="icone-vazio" style={{ width: 40, height: 40 }} />
          <h2>Nenhuma peça de imagem ainda</h2>
          <p>
            Crie um carrossel pelo Dashboard e ele aparece aqui, pronto pra ver,
            baixar e editar.
          </p>
        </div>
      ) : (
        <div className={`tela-fluxo-corpo${empilhado ? " empilhado" : ""}`}>
          {itens.map((peca) => (
            <CartaoPeca
              key={peca.pasta}
              peca={peca}
              aoAmpliar={(peca, indice) => setVisor({ peca, indice })}
              aoEditar={(pasta) => irParaStudio(pasta)}
              condensado={condensado}
            />
          ))}
        </div>
      )}

      {visor && (
        <Lightbox
          urls={visor.peca.previews}
          indiceInicial={visor.indice}
          nomeBase={
            visor.peca.tipo === "carrossel" || visor.peca.tipo === "stories"
              ? baseNome(visor.peca.tema)
              : undefined
          }
          pecaHtml={visor.peca.fonteHtml ? { pasta: visor.peca.pasta } : undefined}
          aoEditar={
            visor.peca.fonteHtml
              ? () => {
                  irParaStudio(visor.peca.pasta);
                  setVisor(null);
                }
              : undefined
          }
          aoFechar={() => setVisor(null)}
        />
      )}
    </div>
  );
}
