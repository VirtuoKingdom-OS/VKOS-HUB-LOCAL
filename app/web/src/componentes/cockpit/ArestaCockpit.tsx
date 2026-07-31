import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useStore,
  type EdgeProps,
} from "@xyflow/react";
import { IconeX } from "../comum/Icones";
import { usarCanvas } from "./canvasContexto";

// A aresta do cockpit. Ela substitui a aresta padrao do React Flow (o
// edgeTypes do Cockpit troca a chave "default"), entao TODA aresta do canvas
// passa por aqui sem que nenhuma fabrica de aresta precise declarar tipo, e o
// formato do canvas.json fica igual.
//
// Ela existe por um motivo so: desconectar era um gesto escondido. A unica
// saida era acertar o botao direito em cima de um traco de 2px e achar
// "Desconectar" no menu. Quem nao sabia que o menu existia nao tinha como
// descobrir. Agora a linha tem uma faixa de acerto larga, e passar o mouse
// nela revela um corte no meio do caminho. O menu de botao direito continua
// valendo: ele e o caminho do teclado e do toque longo.
function ArestaCockpitInterna({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const { desconectarAresta } = usarCanvas();
  // O corte aparece no hover da linha OU do proprio botao. Clicar na aresta
  // tambem prende ele (selected), que e o unico caminho no toque, onde nao
  // existe hover.
  const [sobre, setSobre] = useState(false);

  // O zoom do canvas, pra desfazer a escala no botao. O rotulo de aresta mora
  // DENTRO do viewport transformado, entao ele encolhia junto: medido, a 70%
  // o alvo de 24px virava 17px e a 30% viraria 7px, muito abaixo do piso de 24
  // do criterio 2.5.8. O seletor devolve so o terceiro item do transform, e nao
  // o vetor inteiro, pra arrastar o canvas nao re-renderizar aresta nenhuma:
  // pan mexe em transform[0] e [1], e zoom e gesto raro perto de pan.
  const zoom = useStore((estado) => estado.transform[2]);

  const [caminho, meioX, meioY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const aberto = sobre || Boolean(selected);

  return (
    <>
      {/* interactionWidth 0: a faixa de acerto e a nossa, logo abaixo. Duas
          faixas empilhadas roubariam o evento uma da outra. */}
      <BaseEdge
        id={id}
        path={caminho}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={0}
      />

      {/* A faixa de acerto. Invisivel e larga, com non-scaling-stroke pra ela
          medir sempre o mesmo em pixel de TELA: sem isso o alvo encolhia junto
          com o zoom e afastado virava um fio. Ela mora dentro do <g> da aresta,
          entao clique e botao direito continuam subindo pro React Flow. */}
      <path
        className="aresta-alvo"
        d={caminho}
        onMouseEnter={() => setSobre(true)}
        onMouseLeave={() => setSobre(false)}
      />

      <EdgeLabelRenderer>
        {/* Dois elementos de proposito. A ancora POSICIONA (e desfaz o zoom);
            o botao dentro dela so cresce ao aparecer. Empilhar as duas coisas
            num transform so nao funciona: o "scale" de aparecer entraria na
            mesma matriz do posicionamento e o botao entraria em cena vindo de
            fora da tela, alem de a animacao disputar com o pan e o zoom. */}
        <div
          className="ancora-corte"
          style={{
            transform: `translate(${meioX}px, ${meioY}px) scale(${1 / zoom}) translate(-50%, -50%)`,
          }}
        >
          <button
            type="button"
            className={`cortar-aresta${aberto ? " aberto" : ""}`}
            onMouseEnter={() => setSobre(true)}
            onMouseLeave={() => setSobre(false)}
            onClick={(evento) => {
              evento.stopPropagation();
              desconectarAresta(id);
            }}
            title="Desconectar"
            aria-label="Desconectar"
          >
            <IconeX className="" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// Memoizado pelo mesmo motivo dos nos: arrastar um no do canvas nao precisa
// re-renderizar as arestas que nao mexeram.
export const ArestaCockpit = memo(ArestaCockpitInterna);
