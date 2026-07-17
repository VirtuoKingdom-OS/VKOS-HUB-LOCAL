import type { PointerEvent as ReactPointerEvent } from "react";
import type { Contato, Negocio } from "../../api/crm";
import { formatarReais, iniciais } from "./formatos";

// O quadro move negocios. A pessoa aparece como contexto, sem voltar a fundir
// contato e oportunidade no mesmo objeto.
export function CartaoContato({
  negocio,
  contato,
  arrastando,
  selecionado,
  aoDescer,
}: {
  negocio: Negocio;
  contato?: Contato;
  arrastando: boolean;
  selecionado: boolean;
  aoDescer: (negocio: Negocio, e: ReactPointerEvent) => void;
}) {
  return (
    <article
      className={`crm-cartao${arrastando ? " arrastando" : ""}${selecionado ? " selecionado" : ""}`}
      data-cartao={negocio.id}
      onPointerDown={(e) => aoDescer(negocio, e)}
    >
      <div className="crm-cartao-topo">
        <span className="crm-avatar" aria-hidden="true">
          {iniciais(contato?.nome ?? negocio.titulo)}
        </span>
        <div className="crm-cartao-id">
          <span className="crm-cartao-nome">{negocio.titulo}</span>
          <span className="crm-cartao-empresa">{contato?.nome ?? "Contato indisponivel"}</span>
        </div>
      </div>

      {negocio.valorEstimado !== undefined && (
        <div className="crm-cartao-meta">
          <span className="crm-valor">{formatarReais(negocio.valorEstimado)}</span>
        </div>
      )}

      {contato?.empresa && <span className="crm-cartao-notas">{contato.empresa}</span>}
    </article>
  );
}
