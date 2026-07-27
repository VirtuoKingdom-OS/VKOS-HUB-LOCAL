import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { Contato } from "../../api/crm";
import { formatarReais, iniciais } from "./formatos";

// O contato E o cartao do funil. Mostra a pessoa, a soma de valor dos negocios
// presos a ela e um resumo curto (organizacao ou categoria do lead) mais as tags.
//
// O cartao era um <article> com onPointerDown e mais nada: sem foco, sem papel,
// sem teclado. Nao dava pra abrir nem mover um cartao sem mouse. Agora ele e um
// botao de verdade: Enter e Espaco abrem a ficha, as setas movem no quadro.
export function CartaoContato({
  contato,
  valorTotal,
  resumo,
  arrastando,
  selecionado,
  aoDescer,
  aoAbrir,
  aoMoverPorTeclado,
}: {
  contato: Contato;
  valorTotal: number;
  resumo: string;
  arrastando: boolean;
  selecionado: boolean;
  aoDescer: (contato: Contato, e: ReactPointerEvent) => void;
  aoAbrir: (contato: Contato) => void;
  aoMoverPorTeclado: (contato: Contato, eixo: "coluna" | "posicao", passo: -1 | 1) => void;
}) {
  const empresa = resumo && resumo !== contato.nome ? resumo : "";
  const subtitulo = empresa || contato.lead?.categoria || "";

  function aoTeclar(e: ReactKeyboardEvent<HTMLElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      aoAbrir(contato);
      return;
    }
    const movimentos: Record<string, ["coluna" | "posicao", -1 | 1]> = {
      ArrowLeft: ["coluna", -1],
      ArrowRight: ["coluna", 1],
      ArrowUp: ["posicao", -1],
      ArrowDown: ["posicao", 1],
    };
    const movimento = movimentos[e.key];
    if (!movimento) return;
    e.preventDefault();
    aoMoverPorTeclado(contato, movimento[0], movimento[1]);
  }

  return (
    <article
      className={`crm-cartao${arrastando ? " arrastando" : ""}${selecionado ? " selecionado" : ""}`}
      data-cartao={contato.id}
      role="button"
      tabIndex={0}
      aria-label={`${contato.nome}. Enter abre a ficha, as setas movem o cartão no quadro.`}
      onPointerDown={(e) => aoDescer(contato, e)}
      onKeyDown={aoTeclar}
    >
      <div className="crm-cartao-topo">
        <span className="crm-avatar" aria-hidden="true">{iniciais(contato.nome)}</span>
        <div className="crm-cartao-id">
          <span className="crm-cartao-nome">{contato.nome}</span>
          {subtitulo && <span className="crm-cartao-empresa">{subtitulo}</span>}
        </div>
      </div>

      {valorTotal > 0 && (
        <div className="crm-cartao-meta">
          <span className="crm-valor">{formatarReais(valorTotal)}</span>
        </div>
      )}

      {contato.tags.length > 0 && (
        <div className="crm-cartao-tags">
          {contato.tags.slice(0, 3).map((tag) => (
            <span className="crm-tag" key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}
