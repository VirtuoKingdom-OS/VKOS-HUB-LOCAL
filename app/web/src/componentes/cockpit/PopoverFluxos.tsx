import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useViewport } from "@xyflow/react";
import { FLUXOS_VISIVEIS } from "../../config/fluxos";
import { IconeFluxo, IconeX } from "../comum/Icones";

// Posicao calculada do popover, relativa ao container do canvas.
interface PosPopover {
  esquerda: number;
  topo: number;
  // Distancia da seta ate a borda esquerda do popover.
  seta: number;
  // Abriu pra cima do no (nao coube embaixo).
  paraCima: boolean;
  // Ja mediu e posicionou. Antes disso fica invisivel pra nao piscar.
  pronto: boolean;
}

// Popover de fluxos, ancorado ao NO do Cerebro. Reprojeta a ancora a cada
// mudanca de viewport (pan e zoom), lendo o retangulo do no direto do DOM e
// convertendo pra coordenadas do container. Acompanha o no em tempo real.
// Fica absolute dentro do container do canvas, nunca fixed: nao vaza pra
// outras telas. Flip vertical quando nao cabe embaixo. Fecha no x, Esc ou
// clique fora.
export function PopoverFluxos({
  refArea,
  aoEscolher,
  aoFechar,
}: {
  refArea: RefObject<HTMLDivElement | null>;
  aoEscolher: (idFluxo: string) => void;
  aoFechar: () => void;
}) {
  const refPop = useRef<HTMLDivElement>(null);
  // useViewport dispara um render a cada pan e zoom: e o gatilho da reprojeta.
  const viewport = useViewport();
  const [tick, setTick] = useState(0);
  const [pos, setPos] = useState<PosPopover>({
    esquerda: 0,
    topo: 0,
    seta: 0,
    paraCima: false,
    pronto: false,
  });

  // Reprojeta a cada frame de viewport e a cada resize da area.
  useLayoutEffect(() => {
    const cont = refArea.current;
    const pop = refPop.current;
    if (!cont || !pop) return;
    const noEl = cont.querySelector(
      '.react-flow__node[data-id="cerebro"]'
    ) as HTMLElement | null;
    if (!noEl) {
      setPos((p) => ({ ...p, pronto: false }));
      return;
    }
    const rContainer = cont.getBoundingClientRect();
    const rNo = noEl.getBoundingClientRect();

    // Ancora: centro horizontal do no, borda de baixo e de cima, em
    // coordenadas do container.
    const centroX = rNo.left + rNo.width / 2 - rContainer.left;
    const baixoNo = rNo.bottom - rContainer.top;
    const cimaNo = rNo.top - rContainer.top;

    const larguraPop = pop.offsetWidth;
    const alturaPop = pop.offsetHeight;
    const margem = 14;
    const folga = 12;

    // Clamp horizontal: centraliza no no, sem sair do container.
    let esquerda = centroX - larguraPop / 2;
    if (esquerda + larguraPop > rContainer.width - folga) {
      esquerda = rContainer.width - larguraPop - folga;
    }
    if (esquerda < folga) esquerda = folga;

    // Flip vertical: tenta embaixo; se nao couber, abre pra cima.
    let paraCima = false;
    let topo = baixoNo + margem;
    if (topo + alturaPop > rContainer.height - folga) {
      const topoAcima = cimaNo - margem - alturaPop;
      if (topoAcima >= folga) {
        paraCima = true;
        topo = topoAcima;
      } else {
        // Nao cabe nem em cima nem embaixo: gruda no rodape com folga.
        topo = Math.max(folga, rContainer.height - alturaPop - folga);
      }
    }

    setPos({ esquerda, topo, seta: centroX - esquerda, paraCima, pronto: true });
  }, [refArea, viewport.x, viewport.y, viewport.zoom, tick]);

  // Reprojeta quando o container ou a janela muda de tamanho.
  useEffect(() => {
    const cont = refArea.current;
    if (!cont) return;
    const bump = () => setTick((t) => t + 1);
    const obs = new ResizeObserver(bump);
    obs.observe(cont);
    window.addEventListener("resize", bump);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", bump);
    };
  }, [refArea]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar();
      }
    };
    const aoClicarFora = (e: MouseEvent) => {
      if (refPop.current && !refPop.current.contains(e.target as Node)) {
        aoFechar();
      }
    };
    window.addEventListener("keydown", aoTeclar, true);
    // mousedown no proximo tick pra nao capturar o mesmo clique que abriu.
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", aoClicarFora);
    }, 0);
    return () => {
      window.removeEventListener("keydown", aoTeclar, true);
      window.clearTimeout(t);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aoFechar]);

  return (
    <div
      ref={refPop}
      className={`popover-fluxos${pos.paraCima ? " para-cima" : ""}`}
      style={{
        left: pos.esquerda,
        top: pos.topo,
        visibility: pos.pronto ? "visible" : "hidden",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="seta-popover" style={{ left: pos.seta }} />
      <button
        className="fechar-popover"
        onClick={aoFechar}
        title="Fechar"
        aria-label="Fechar"
      >
        <IconeX />
      </button>
      <div className="titulo-popover">O que você quer criar?</div>
      <div className="linha-fluxos">
        {FLUXOS_VISIVEIS.map((fluxo) => (
          <button
            key={fluxo.id}
            className="fluxo-botao"
            onClick={() => {
              aoEscolher(fluxo.id);
              aoFechar();
            }}
            title={fluxo.descricao}
          >
            <IconeFluxo id={fluxo.id} />
            <span className="nome">{fluxo.rotulo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
