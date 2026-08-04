import type { EntradaRastroAssistente } from "../../api/assistente";

interface Props {
  entradas: EntradaRastroAssistente[];
}

function hora(iso?: string): string {
  const data = new Date(iso ?? "");
  if (Number.isNaN(data.valueOf())) return "";
  return data.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function PainelRastro({ entradas }: Props) {
  return (
    <section className="assistente-coluna assistente-painel-rastro" aria-label="Rastro do assistente">
      <div className="assistente-coluna-topo">
        <div>
          <span className="assistente-kicker">Servidor</span>
          <h2>Rastro</h2>
        </div>
        <span className="ponto-vivo" aria-label="Atualização automática" />
      </div>
      <div className="assistente-rastro-lista">
        {entradas.length === 0 ? (
          <p className="assistente-vazio">Os efeitos do Hub aparecerão aqui.</p>
        ) : (
          entradas.map((entrada) => (
            <div className="assistente-rastro-item" key={entrada.id}>
              <span className="assistente-rastro-hora">{hora(entrada.em)}</span>
              <div>
                <strong>{entrada.tipo}</strong>
                <span>
                  {entrada.workspaceNome ?? entrada.sessaoId ?? entrada.tarefaId ?? "Hub"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
