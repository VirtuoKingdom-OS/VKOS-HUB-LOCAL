// Icones proprios do shell (sidebar de fontes, downloads e previews de link).
// Inline, minimalistas, herdam a cor por currentColor. Sem dependencia externa.
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

// Fonte de texto: folha com linhas.
export function IconeTextos({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M13 4H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V9.5Z" />
      <path d="M13 4v5.5h5.5M8 13h7M8 16.5h5" />
    </svg>
  );
}

// Fonte de imagens: quadro com montanha.
export function IconeImagens({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.4" />
      <path d="m5 16 4-4 4 4 3-3 3 3" />
    </svg>
  );
}

// Fonte de links: dois elos de corrente.
export function IconeLinks({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// Um unico link, pra prévia dos links no card.
export function IconeLink({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// Download: seta pra baixo sobre a bandeja.
export function IconeBaixar({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M12 4v10M8 10l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}
