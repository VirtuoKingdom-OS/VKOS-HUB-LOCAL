import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { usarEstado } from "../../estado/contexto";
import { IconeCerebro } from "../comum/Icones";

// Dados que o no do Cerebro carrega.
export interface DadosCerebro extends Record<string, unknown> {
  // Abre o popover de fluxos. O popover se ancora sozinho lendo o no do DOM.
  aoClicar: () => void;
}

// No central. Pulsa com glow. Clicar abre o popover de fluxos ancorado.
// Ver o conteudo do Cerebro fica no menu de botao direito.
function NoCerebroInterno({ data }: NodeProps) {
  const dados = data as unknown as DadosCerebro;
  const { estadoVkos } = usarEstado();

  const preenchido = estadoVkos?.cerebroPreenchido ?? false;
  const total = estadoVkos?.totalSkills ?? 0;

  return (
    <div className="no-cerebro">
      <div
        className="miolo"
        onClick={() => dados.aoClicar()}
        role="button"
        tabIndex={0}
      >
        <IconeCerebro className="icone-cerebro" />
        <div className="titulo">Cérebro</div>
        <div className="sub">
          {preenchido ? "Identidade carregada" : "Ainda em branco"}
        </div>
        <div className="meta">
          {total} comandos. Clique para criar.
        </div>
        {!preenchido && (
          <div className="aviso">Clique pra começar a entrevista.</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const NoCerebro = memo(NoCerebroInterno);
