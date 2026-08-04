// Icones inline, minimalistas, herdam a cor por currentColor.
// Sem dependencia externa, sem CDN.
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

export function IconeCerebro({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M12 4.5a3 3 0 0 0-3 3 2.6 2.6 0 0 0-2 4.2A2.7 2.7 0 0 0 8 16.5a2.7 2.7 0 0 0 4 1.2 2.7 2.7 0 0 0 4-1.2 2.7 2.7 0 0 0 1-4.8 2.6 2.6 0 0 0-2-4.2 3 3 0 0 0-3-3Z" />
      <path d="M12 4.5v13.5M9 9.5h1.5M13.5 12H15M9 14h1.5" />
    </svg>
  );
}

export function IconeCarrossel({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="7" y="5" width="10" height="14" rx="2" />
      <path d="M4 8v8M20 8v8" />
    </svg>
  );
}

export function IconePost({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

export function IconeStories({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="8" y="4" width="8" height="16" rx="2" />
      <path d="M5 7v10M19 7v10" />
    </svg>
  );
}

export function IconeSite({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M7 7h.01M10 7h.01" />
    </svg>
  );
}

// Megafone: o anuncio pago. Traco unico, mesma familia dos outros.
export function IconeAnuncio({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M4 10v4a1 1 0 0 0 1 1h3l6 4V5L8 9H5a1 1 0 0 0-1 1Z" />
      <path d="M18 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}

export function IconePasta({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h3.8a1.5 1.5 0 0 1 1.2.6l.9 1.2h7.1A1.5 1.5 0 0 1 20 8.3v9.2A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" />
    </svg>
  );
}

export function IconeGaleria({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.4" />
      <path d="m5 16 4-4 4 4 3-3 3 3" />
    </svg>
  );
}

export function IconeCheck({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconeX({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconeParar({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function IconeRaio({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" />
    </svg>
  );
}

export function IconeAlerta({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M12 4 3 19h18L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function IconeSeta({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconeChevron({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function IconeSubir({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function IconeClipe({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M20 11.5 12 19.5a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-8 8a1.5 1.5 0 0 1-2.2-2.2l7.3-7.3" />
    </svg>
  );
}

export function IconeArquivo({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M13 4H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V9.5Z" />
      <path d="M13 4v5.5h5.5" />
    </svg>
  );
}

export function IconeLapis({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2Z" />
      <path d="M14.5 8.5 16 10" />
    </svg>
  );
}

export function IconeDuplicar({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </svg>
  );
}

export function IconeLixeira({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19L18 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconeMais({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconeAlvo({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export function IconeOlho({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

// Olho riscado: ocultar sem apagar.
export function IconeOlhoRiscado({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M4 5l16 14" />
      <path d="M9.5 9.6a2.6 2.6 0 0 0 3.5 3.8" />
      <path d="M6.6 6.9C4.2 8.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9 9 0 0 0 3.3-.6" />
      <path d="M17.6 16.1C20 14.6 21.5 12 21.5 12s-3.5-6.5-9.5-6.5a9.2 9.2 0 0 0-1.7.16" />
    </svg>
  );
}

// Mapa por id de fluxo, usado na barra de lancadores.
// Seta que volta sobre si: o gesto de desfazer.
export function IconeDesfazer({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M4 8h9a5 5 0 0 1 0 10h-4" />
      <path d="M8 4 4 8l4 4" />
    </svg>
  );
}

// O espelho do desfazer: mesma seta, para o outro lado.
export function IconeRefazer({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <path d="M20 8h-9a5 5 0 0 0 0 10h4" />
      <path d="m16 4 4 4-4 4" />
    </svg>
  );
}

// Teclado: abre a folha de atalhos.
export function IconeTeclado({ className, style }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6.5 9.5h.01M10 9.5h.01M13.5 9.5h.01M17 9.5h.01M8 14.5h8" />
    </svg>
  );
}

export function IconeFluxo({ id, className }: { id: string; className?: string }) {
  if (id === "carrossel") return <IconeCarrossel className={className} />;
  if (id === "post") return <IconePost className={className} />;
  if (id === "stories") return <IconeStories className={className} />;
  if (id === "site") return <IconeSite className={className} />;
  if (id === "anuncio") return <IconeAnuncio className={className} />;
  return <IconeRaio className={className} />;
}
