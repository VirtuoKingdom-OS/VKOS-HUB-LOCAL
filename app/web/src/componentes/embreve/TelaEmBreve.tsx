import type { ReactElement } from "react";
import "../../estilos/dashboard.css";

type TipoEmBreve = "whatsapp" | "instagram";

// Conteudo de cada aba "em breve": icone, titulo e a frase do que vem. Os
// textos vem do contrato da rodada. Nada de formulario.
const CONTEUDO: Record<
  TipoEmBreve,
  { titulo: string; frase: string; Icone: () => ReactElement }
> = {
  whatsapp: {
    titulo: "WhatsApp",
    frase:
      "Caixa de mensagens do WhatsApp dentro do hub, com automações supervisionadas.",
    Icone: IconeWhatsappGrande,
  },
  instagram: {
    titulo: "Instagram",
    frase:
      "Publicar e agendar as peças da galeria direto no Instagram, com as DMs na mesma caixa.",
    Icone: IconeInstagramGrande,
  },
};

// Placeholder on-brand de uma aba que ainda vai chegar. Sem formulario, so a
// promessa do que vem e a nota da fase do roadmap.
export function TelaEmBreve({ tipo }: { tipo: TipoEmBreve }) {
  const { titulo, frase, Icone } = CONTEUDO[tipo];
  return (
    <section className="tela-em-breve">
      <div className="em-breve-caixa">
        <div className="em-breve-icone">
          <Icone />
        </div>
        <span className="em-breve-selo">Em breve</span>
        <h1>{titulo}</h1>
        <p>{frase}</p>
        <span className="em-breve-nota">Faz parte da Fase 7 do roadmap.</span>
      </div>
    </section>
  );
}

// Icones grandes e suaves, no mesmo tracado dos da sidebar (stroke 1.8).
function IconeWhatsappGrande() {
  return (
    <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5 5.3 16A7.5 7.5 0 1 1 8 18.7L4 19.5Z" />
      <path d="M9 10.2c.3 1.6 2.2 3.5 3.8 3.8.5.1.9-.1 1.1-.5l.3-.6-1.7-1-.7.7c-.7-.3-1.4-1-1.7-1.7l.7-.7-1-1.7-.6.3c-.4.2-.6.6-.5 1.1Z" />
    </svg>
  );
}

function IconeInstagramGrande() {
  return (
    <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
