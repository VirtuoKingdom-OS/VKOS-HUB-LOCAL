import type { PointerEvent as ReactPointerEvent } from "react";
import type { Contato } from "../../api/crm";
import { formatarDataHoraCurta, formatarReais, iniciais } from "./formatos";

// Reloginho inline, minimalista, no padrao dos icones do app: herda a cor por
// currentColor e o tamanho pequeno pra linha discreta do cartao.
function IconeRelogio() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={13}
      height={13}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

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

      {contato.proximoContato && (
        <span
          className="crm-cartao-notas"
          title="Proximo contato"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <IconeRelogio />
          {formatarDataHoraCurta(contato.proximoContato)}
        </span>
      )}

      {contato.notas.length > 0 && (
        <span className="crm-cartao-notas">
          {contato.notas.length} {contato.notas.length === 1 ? "nota" : "notas"}
        </span>
      )}
    </article>
  );
}
