import type { PointerEvent as ReactPointerEvent } from "react";
import type { Contato } from "../../api/crm";
import { formatarReais, iniciais } from "./formatos";

// Cartao de um contato no kanban. Arrastavel entre colunas: o gesto e detectado
// pela TelaCrm (arrasto move, clique parado abre o detalhe), aqui so avisamos
// onde o ponteiro desceu. Sem forma pesada: nome, empresa, valor e tags.
export function CartaoContato({
  contato,
  arrastando,
  selecionado,
  aoDescer,
}: {
  contato: Contato;
  arrastando: boolean;
  selecionado: boolean;
  aoDescer: (contato: Contato, e: ReactPointerEvent) => void;
}) {
  return (
    <article
      className={`crm-cartao${arrastando ? " arrastando" : ""}${selecionado ? " selecionado" : ""}`}
      data-cartao={contato.id}
      onPointerDown={(e) => aoDescer(contato, e)}
    >
      <div className="crm-cartao-topo">
        <span className="crm-avatar" aria-hidden="true">
          {iniciais(contato.nome)}
        </span>
        <div className="crm-cartao-id">
          <span className="crm-cartao-nome">{contato.nome}</span>
          {contato.empresa && <span className="crm-cartao-empresa">{contato.empresa}</span>}
        </div>
      </div>

      {(contato.valorEstimado !== undefined || contato.tags.length > 0) && (
        <div className="crm-cartao-meta">
          {contato.valorEstimado !== undefined && (
            <span className="crm-valor">{formatarReais(contato.valorEstimado)}</span>
          )}
          {contato.tags.slice(0, 3).map((t) => (
            <span className="crm-tag" key={t}>
              {t}
            </span>
          ))}
          {contato.tags.length > 3 && (
            <span className="crm-tag crm-tag-mais">+{contato.tags.length - 3}</span>
          )}
        </div>
      )}

      {contato.notas.length > 0 && (
        <span className="crm-cartao-notas">
          {contato.notas.length} {contato.notas.length === 1 ? "nota" : "notas"}
        </span>
      )}
    </article>
  );
}
