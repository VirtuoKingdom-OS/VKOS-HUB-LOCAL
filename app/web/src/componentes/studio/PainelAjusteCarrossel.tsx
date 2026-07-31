import { useEffect, useRef } from "react";
import type { ModeloIA, OpcaoModeloIA } from "../../api/cliente";
import type { AnexoAjuste } from "../../tipos/dominio";
import { AnexosAjuste } from "../comum/AnexosAjuste";
import { IconeRaio, IconeX } from "../comum/Icones";

interface Props {
  pasta: string;
  pedido: string;
  anexos: AnexoAjuste[];
  modelo: ModeloIA;
  modelos: OpcaoModeloIA[];
  ajustando: boolean;
  concluido: boolean;
  erro: string | null;
  aoMudarPedido: (valor: string) => void;
  aoMudarAnexos: (anexos: AnexoAjuste[]) => void;
  aoMudarModelo: (valor: ModeloIA) => void;
  aoAjustar: () => void;
  aoFechar: () => void;
}

export function PainelAjusteCarrossel({
  pasta,
  pedido,
  anexos,
  modelo,
  modelos,
  ajustando,
  concluido,
  erro,
  aoMudarPedido,
  aoMudarAnexos,
  aoMudarModelo,
  aoAjustar,
  aoFechar,
}: Props) {
  // Ao abrir o painel, o modelo inicia no economico do provedor ativo (campo
  // `economico` vem do backend). Ajuste pontual raramente precisa de modelo
  // grande; a escolha manual continua livre depois.
  const inicializouRef = useRef(false);
  const economico = modelos.find((item) => item.economico)?.alias;
  useEffect(() => {
    if (inicializouRef.current || !economico) return;
    inicializouRef.current = true;
    if (modelo !== economico) aoMudarModelo(economico);
  }, [economico, modelo, aoMudarModelo]);

  return (
    <aside className="ed-lateral studio-ajuste" aria-label="Ajustar com IA">
      <header className="ed-lateral-topo">
        <h2>
          <IconeRaio className="studio-ajuste-icone" />
          Ajustar com IA
        </h2>
        {/* Sem disabled, nunca. Fechar o painel so tira ele da tela: a IA
            continua trabalhando e o estado volta quando o painel reabre. Com
            disabled aqui, uma sessao que nao terminava prendia o usuario. */}
        <button
          className="botao botao-p botao-icone botao-fantasma"
          onClick={aoFechar}
          title="Fechar"
          aria-label="Fechar"
        >
          <IconeX className="" />
        </button>
      </header>

      <div className="ed-lateral-corpo">
        <div className="grupo-campo">
          <label className="rotulo" htmlFor="studio-pedido-ia">
            O que você quer mudar?
          </label>
          <textarea
            className="campo studio-ajuste-campo"
            id="studio-pedido-ia"
            value={pedido}
            onChange={(e) => aoMudarPedido(e.target.value)}
            placeholder="Ex: deixe a página 3 mais limpa, aumente o contraste do título e preserve o restante."
            disabled={ajustando}
            rows={6}
          />
        </div>

        <AnexosAjuste
          pasta={pasta}
          anexos={anexos}
          aoMudar={aoMudarAnexos}
          desabilitado={ajustando}
        />

        {/* Escolha única entre opções curtas: é o trabalho do segmentado. Em
            pílula de menta, o modelo escolhido virava mais uma voz colorida ao
            lado de um carrossel que já é colorido. */}
        <div className="grupo-campo">
          <span className="rotulo" id="studio-rotulo-modelo">
            Modelo
          </span>
          <div className="segmentado" role="group" aria-labelledby="studio-rotulo-modelo">
            {modelos.map((item) => (
              <button
                key={item.alias}
                className="segmento"
                aria-pressed={modelo === item.alias}
                onClick={() => aoMudarModelo(item.alias)}
                disabled={ajustando}
                title={item.observacaoCusto}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
          <span className="dica">
            Comece pelo econômico. Se o resultado não convencer, repita o pedido
            num modelo maior.
          </span>
        </div>

        {/* O sinal de que a IA está trabalhando é o giro mais a frase. Ele não
            é barra de progresso porque não há progresso pra medir, e porque o
            giro das primitivas já tem o substituto de movimento reduzido
            declarado na camada onde ele consegue valer. */}
        {ajustando && (
          <p className="ed-trabalhando" role="status">
            <span className="girinho" />
            A IA está ajustando somente este carrossel.
          </p>
        )}
        {concluido && !ajustando && (
          <p className="ed-ok" role="status">
            Pronto. O carrossel foi atualizado.
          </p>
        )}
        {erro && !ajustando && (
          <p className="ed-erro" role="alert">
            {erro}
          </p>
        )}

        <button
          className="botao botao-principal ed-enviar"
          onClick={aoAjustar}
          disabled={ajustando || pedido.trim() === "" || !modelo}
          aria-busy={ajustando}
        >
          {ajustando ? "Ajustando" : "Ajustar"}
        </button>
      </div>
    </aside>
  );
}
