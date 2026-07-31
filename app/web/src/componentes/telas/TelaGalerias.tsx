import { useMemo, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import type { Peca, TipoPeca } from "../../tipos/dominio";
import { baseNome } from "./fluxos";
import { CartaoPeca } from "../pecas/CartaoPeca";
import { Lightbox } from "../pecas/Lightbox";
import { IconeGaleria } from "../comum/Icones";
import "../workspace/dashboard.css";
import { irParaPeca } from "../layout/rotas";
import "./telas.css";

interface EstadoVisor {
  peca: Peca;
  indice: number;
}

// Tipos de imagem que a galeria unificada reune, na ordem canonica.
const TIPOS_GALERIA: TipoPeca[] = ["carrossel", "post", "stories"];

type Filtro = "todos" | TipoPeca;

// Rotulo curto de cada filtro.
const ROTULO_FILTRO: Record<Filtro, string> = {
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
  irParaPeca("studio", pasta);
}

// Galeria unificada de todas as pecas de imagem (carrossel, post, stories).
// A moldura desta tela e acromatica de proposito: quem tem cor aqui e a peca
// do usuario. Editar peca fonteHtml leva ao Studio.
export function TelaGalerias() {
  const { pecas } = usarEstado();
  const [visor, setVisor] = useState<EstadoVisor | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  // Todas as pecas de imagem, na ordem que chegam do estado.
  const itensImagem = useMemo(
    () => pecas.filter((p) => TIPOS_GALERIA.includes(p.tipo)),
    [pecas]
  );

  // Tipos que tem ao menos uma peca, na ordem canonica: define quais filtros
  // aparecem (filtro so existe se o tipo tem peca).
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
  const rotuloContagem = contagem === 1 ? "1 peça" : `${contagem} peças`;

  // Carrossel e stories rendem uma tira maior por cartao.
  const empilhado = filtroValido === "carrossel" || filtroValido === "stories";

  // So no filtro "Todos" o cartao fica condensado: nos filtros por tipo ele ja
  // empilha e usa a tira grande.
  const condensado = filtroValido === "todos";

  const filtros: Filtro[] = ["todos", ...tiposPresentes];

  return (
    <section className="tela tela-galerias">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1>Galerias</h1>
          <p>{rotuloContagem}</p>
        </div>
      </header>

      {tiposPresentes.length > 0 && (
        <div className="telas-abas">
          <div className="abas" role="tablist" aria-label="Filtrar por tipo">
            {filtros.map((t) => (
              <button
                type="button"
                key={t}
                className="aba"
                role="tab"
                aria-selected={filtroValido === t}
                onClick={() => setFiltro(t)}
              >
                {ROTULO_FILTRO[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tela-corpo">
        {contagem === 0 ? (
          <div className="vazio">
            <IconeGaleria className="" />
            <h2>Nenhuma peça de imagem ainda</h2>
            <p>
              Crie um carrossel pelo Dashboard e ele aparece aqui, pronto para
              ver, baixar e editar.
            </p>
          </div>
        ) : (
          <div className={`telas-grade${empilhado ? " empilhada" : ""}`}>
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
      </div>

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
    </section>
  );
}
