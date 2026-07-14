// Icones proprios do cockpit, inline. Ficam aqui pra nao tocar em
// componentes/comum/ (fora da propriedade da rodada 5). Herdam a cor por
// currentColor, sem dependencia externa.
import type { CSSProperties } from "react";

interface PropsIcone {
  className?: string;
  style?: CSSProperties;
}

const base = {
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Recarregar: seta circular.
export function IconeRecarregar({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M20 11a8 8 0 1 0-.9 4.5" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}
