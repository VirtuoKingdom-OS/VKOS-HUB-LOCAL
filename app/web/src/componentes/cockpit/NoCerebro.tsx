import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { usarEstado } from "../../estado/contexto";
import { IconeCerebro } from "../comum/Icones";

// Dados que o no do Cerebro carrega.
export interface DadosCerebro extends Record<string, unknown> {
  // Abre o popover de fluxos. O popover se ancora sozinho lendo o no do DOM.
  aoClicar: () => void;
}

// No central. Clicar abre o popover de fluxos ancorado.
// Ver o conteudo do Cerebro fica no menu de botao direito.
//
// O no tinha QUATRO linhas de texto empilhadas, e duas delas mandavam clicar:
// "N comandos. Clique para criar." e, logo abaixo, "Clique pra começar a
// entrevista." em amarelo. A mesma ordem dita duas vezes, uma delas com a cor
// que o app reserva pra ressalva de verdade. E a primeira continuava mandando
// criar mesmo com o Cerebro ja pronto.
//
// Agora sao tres faixas na gramatica do cartao de workspace: o nome manda, o
// estado e o segundo, e o contexto vira uma sublinha fraca so. Nenhum fato
// saiu: o total de comandos continua la, e o convite tambem, dentro da frase.
function NoCerebroInterno({ data }: NodeProps) {
  const dados = data as unknown as DadosCerebro;
  const { estadoVkos } = usarEstado();

  const preenchido = estadoVkos?.cerebroPreenchido ?? false;
  const total = estadoVkos?.totalSkills ?? 0;
  const contexto = preenchido
    ? `${total} comandos`
    : `${total} comandos, clique pra começar a entrevista`;

  return (
    <div className="no-cerebro">
      {/* Botao de verdade, nao div com role: assim Enter e espaco abrem o no
          de graca, e o anel de foco de teclado aparece sem CSS proprio. */}
      <button type="button" className="miolo" onClick={() => dados.aoClicar()}>
        <IconeCerebro className="icone-cerebro" />
        <span className="titulo">Cérebro</span>
        {/* O estado do Cerebro e um selo, na gramatica das primitivas. Em
            branco e uma pendencia (aviso), nao um erro. */}
        <span className={`selo${preenchido ? "" : " selo-aviso"}`}>
          {preenchido ? "Identidade carregada" : "Ainda em branco"}
        </span>
        <span className="meta">{contexto}</span>
      </button>
      {/* Ancora, nao alca: a aresta Cerebro -> sessao e automatica, toda sessao
          ja nasce com a dela. Deixar arrastavel so criava um gesto que o
          onConnect descartava calado. */}
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

export const NoCerebro = memo(NoCerebroInterno);
