import type { PointerEvent as ReactPointerEvent } from "react";
import type { Contato } from "../../api/crm";
import { formatarReais, iniciais } from "./formatos";

// O contato E o cartao do funil. Mostra a pessoa, a soma de valor dos negocios
// presos a ela e um resumo curto (empresa ou categoria do lead) mais as tags.
export function CartaoContato({
  contato,
  valorTotal,
  arrastando,
  selecionado,
  aoDescer,
}: {
  contato: Contato;
  valorTotal: number;
  arrastando: boolean;
  selecionado: boolean;
  aoDescer: (contato: Contato, e: ReactPointerEvent) => void;
}) {
  const empresa = contato.empresa && contato.empresa !== contato.nome ? contato.empresa : "";
  const subtitulo = empresa || contato.lead?.categoria || "";
  return (
    <article
      className={`crm-cartao${arrastando ? " arrastando" : ""}${selecionado ? " selecionado" : ""}`}
      data-cartao={contato.id}
      onPointerDown={(e) => aoDescer(contato, e)}
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
