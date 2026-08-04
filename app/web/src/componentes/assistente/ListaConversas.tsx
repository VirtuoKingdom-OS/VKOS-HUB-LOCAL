import { Botao } from "../comum/Botao";
import { IconeLixeira, IconeMais } from "../comum/Icones";
import type { ConversaAssistente } from "../../api/assistente";

interface Props {
  conversas: ConversaAssistente[];
  selecionada: string | null;
  aoSelecionar: (id: string) => void;
  aoNova: () => void;
  aoApagar: (id: string) => void;
}

export function ListaConversas({
  conversas,
  selecionada,
  aoSelecionar,
  aoNova,
  aoApagar,
}: Props) {
  return (
    <section className="assistente-coluna assistente-lista-conversas" aria-label="Conversas">
      <div className="assistente-coluna-topo">
        <div>
          <span className="assistente-kicker">Histórico</span>
          <h2>Conversas</h2>
        </div>
        <Botao
          variante="neutro"
          tamanho="p"
          soIcone
          aria-label="Nova conversa"
          title="Nova conversa"
          onClick={aoNova}
        >
          <IconeMais />
        </Botao>
      </div>
      <div className="assistente-lista" role="list">
        {conversas.length === 0 ? (
          <p className="assistente-vazio">Nenhuma conversa ainda.</p>
        ) : (
          conversas.map((conversa) => (
            <div
              className={`assistente-conversa-item${selecionada === conversa.id ? " selecionada" : ""}`}
              key={conversa.id}
              role="listitem"
            >
              <button
                className="assistente-conversa-abertura"
                onClick={() => aoSelecionar(conversa.id)}
                aria-current={selecionada === conversa.id ? "page" : undefined}
              >
                <strong>{conversa.titulo}</strong>
                <span>{conversa.previa || "Conversa nova"}</span>
              </button>
              <Botao
                variante="fantasma"
                tamanho="p"
                soIcone
                className="assistente-apagar-conversa"
                aria-label={`Apagar ${conversa.titulo}`}
                title="Apagar conversa"
                onClick={() => aoApagar(conversa.id)}
              >
                <IconeLixeira />
              </Botao>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
