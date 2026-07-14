import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

// Um item do menu de contexto. Pode ser acao, separador ou abrir um submenu.
export interface ItemMenu {
  id: string;
  rotulo?: string;
  icone?: ReactNode;
  aoClicar?: () => void;
  destrutivo?: boolean;
  separador?: boolean;
  desabilitado?: boolean;
  submenu?: ItemMenu[];
  // Confirmacao inline: o primeiro clique troca o rotulo por rotuloConfirmar
  // (ou "Confirmar?") sem fechar o menu. So o segundo clique executa a acao.
  confirmar?: boolean;
  rotuloConfirmar?: string;
}

interface Props {
  x: number;
  y: number;
  itens: ItemMenu[];
  aoFechar: () => void;
}

// Menu de contexto proprio no padrao VK. Dark, borda sutil, glow menta no
// hover, entrada animada. Fecha com Esc, clique fora ou depois de uma acao.
export function MenuContexto({ x, y, itens, aoFechar }: Props) {
  const refMenu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(null);
  // Item que pediu confirmacao inline e aguarda o segundo clique.
  const [confirmando, setConfirmando] = useState<string | null>(null);

  // Ajusta a posicao pra o menu nunca vazar pra fora da janela.
  useLayoutEffect(() => {
    const el = refMenu.current;
    if (!el) return;
    const larg = el.offsetWidth;
    const alt = el.offsetHeight;
    let novoX = x;
    let novoY = y;
    if (x + larg > window.innerWidth - 8) novoX = window.innerWidth - larg - 8;
    if (y + alt > window.innerHeight - 8) novoY = window.innerHeight - alt - 8;
    setPos({ x: Math.max(8, novoX), y: Math.max(8, novoY) });
  }, [x, y]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    const aoClicarFora = (e: MouseEvent) => {
      if (refMenu.current && !refMenu.current.contains(e.target as Node)) {
        aoFechar();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aoFechar]);

  const acionar = (item: ItemMenu) => {
    if (item.desabilitado || item.submenu) return;
    // Primeiro clique num item com confirmacao inline: arma o "Confirmar?".
    if (item.confirmar && confirmando !== item.id) {
      setConfirmando(item.id);
      return;
    }
    item.aoClicar?.();
    aoFechar();
  };

  return (
    <div
      ref={refMenu}
      className="menu-contexto"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {itens.map((item) => {
        if (item.separador) {
          return <div key={item.id} className="menu-separador" />;
        }
        const armado = confirmando === item.id;
        const classe = `menu-item${
          item.destrutivo || armado ? " destrutivo" : ""
        }${item.desabilitado ? " desabilitado" : ""}${
          item.submenu ? " tem-submenu" : ""
        }${armado ? " armado" : ""}`;
        return (
          <div
            key={item.id}
            className={classe}
            onClick={() => acionar(item)}
            onMouseEnter={() => {
              setSubmenuAberto(item.submenu ? item.id : null);
              // Desarmar a confirmacao ao sair pra outro item.
              if (confirmando && confirmando !== item.id) setConfirmando(null);
            }}
          >
            {item.icone && <span className="menu-icone">{item.icone}</span>}
            <span className="menu-rotulo">
              {armado ? item.rotuloConfirmar ?? "Confirmar?" : item.rotulo}
            </span>
            {item.submenu && <span className="menu-flecha">›</span>}

            {item.submenu && submenuAberto === item.id && (
              <Submenu itens={item.submenu} acionar={acionar} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Submenu flutuante. Mede a propria altura e largura pra nunca vazar pra fora
// do viewport: abre pra cima quando nao cabe embaixo e vira pro lado esquerdo
// do item quando nao cabe a direita.
function Submenu({
  itens,
  acionar,
}: {
  itens: ItemMenu[];
  acionar: (item: ItemMenu) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [estilo, setEstilo] = useState<CSSProperties>({
    top: -6,
    left: "100%",
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Retangulo com a posicao padrao (top:-6, left:100%) ja aplicada.
    const r = el.getBoundingClientRect();
    const margem = 8;
    const novo: CSSProperties = { top: -6, left: "100%" };

    // Flip horizontal: se estoura a direita, abre pra esquerda do item.
    if (r.right > window.innerWidth - margem) {
      novo.left = "auto";
      novo.right = "100%";
      novo.marginLeft = 0;
      novo.marginRight = 4;
    }

    // Clamp vertical: altura independe do flip horizontal, entao mede aqui.
    // Sobe o submenu quando o rodape passa da janela, sem deixar sair pelo topo.
    let top = -6;
    if (r.bottom > window.innerHeight - margem) {
      const desloca = window.innerHeight - margem - r.bottom; // negativo
      top = -6 + desloca;
      if (r.top + desloca < margem) {
        top = -6 + (margem - r.top);
      }
    }
    novo.top = top;

    setEstilo({ ...novo, visibility: "visible" });
  }, [itens]);

  return (
    <div ref={ref} className="menu-contexto submenu" style={estilo}>
      {itens.map((sub) =>
        sub.separador ? (
          <div key={sub.id} className="menu-separador" />
        ) : (
          <div
            key={sub.id}
            className={`menu-item${sub.desabilitado ? " desabilitado" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              acionar(sub);
            }}
          >
            {sub.icone && <span className="menu-icone">{sub.icone}</span>}
            <span className="menu-rotulo">{sub.rotulo}</span>
          </div>
        )
      )}
    </div>
  );
}
