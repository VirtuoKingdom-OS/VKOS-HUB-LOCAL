import { Botao } from "../comum/Botao";
import { IconeCheck, IconeParar } from "../comum/Icones";
import type { TarefaAssistente } from "../../api/assistente";

interface Props {
  loteId: string;
  tarefas: TarefaAssistente[];
  aoAprovar: (loteId: string) => void;
  aoCancelar: (loteId: string) => void;
  ocupado?: boolean;
}

const ROTULOS: Record<TarefaAssistente["tipo"], string> = {
  carrossel: "Carrossel",
  site: "Site",
  anuncio: "Anúncio",
};

const ESTADOS: Record<TarefaAssistente["estado"], string> = {
  proposta: "Proposta",
  aprovada: "Aprovada",
  "na-fila": "Na fila",
  rodando: "Rodando",
  feita: "Concluída",
  falhou: "Falhou",
  cancelada: "Cancelada",
};

function resumoTarefa(tarefa: TarefaAssistente): string {
  const dados = tarefa.dados as Record<string, unknown>;
  const valor = dados.tema ?? dados.oferta ?? dados.objetivo;
  return typeof valor === "string" && valor.trim() ? valor : "Detalhes definidos pelo assistente";
}

export function CartaoLote({ loteId, tarefas, aoAprovar, aoCancelar, ocupado = false }: Props) {
  const podeAprovar = tarefas.some((tarefa) => tarefa.estado === "proposta");
  const podeCancelar = tarefas.some((tarefa) =>
    ["proposta", "aprovada", "na-fila", "rodando"].includes(tarefa.estado),
  );
  return (
    <article className="assistente-lote">
      <header className="assistente-lote-topo">
        <div>
          <span className="assistente-kicker">Lote</span>
          <strong>{loteId}</strong>
        </div>
        <span className="assistente-contagem">{tarefas.length} tarefa{tarefas.length === 1 ? "" : "s"}</span>
      </header>
      <div className="assistente-tarefas">
        {tarefas.map((tarefa) => (
          <div className="assistente-tarefa" key={tarefa.id}>
            <div>
              <strong>{ROTULOS[tarefa.tipo]}</strong>
              <span>{resumoTarefa(tarefa)}</span>
            </div>
            <span className={`assistente-estado estado-${tarefa.estado.replace("-", "-")}`}>
              {ESTADOS[tarefa.estado]}
            </span>
          </div>
        ))}
      </div>
      {(podeAprovar || podeCancelar) && (
        <footer className="assistente-lote-acoes">
          {podeAprovar && (
            <Botao
              variante="principal"
              tamanho="p"
              onClick={() => aoAprovar(loteId)}
              disabled={ocupado}
            >
              <IconeCheck />
              Aprovar lote
            </Botao>
          )}
          {podeCancelar && (
            <Botao
              variante="fantasma"
              tamanho="p"
              onClick={() => aoCancelar(loteId)}
              disabled={ocupado}
            >
              <IconeParar />
              Cancelar
            </Botao>
          )}
        </footer>
      )}
    </article>
  );
}
