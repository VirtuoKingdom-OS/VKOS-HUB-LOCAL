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
    <aside className="studio-ajuste">
      <header className="studio-ajuste-topo">
        <div>
          <IconeRaio className="" />
          <h2>Ajustar com IA</h2>
        </div>
        <button onClick={aoFechar} title="Fechar" disabled={ajustando}>
          <IconeX className="" />
        </button>
      </header>

      <div className="studio-ajuste-corpo">
        <label htmlFor="studio-pedido-ia">O que você quer mudar?</label>
        <textarea
          id="studio-pedido-ia"
          value={pedido}
          onChange={(e) => aoMudarPedido(e.target.value)}
          placeholder="Ex: deixe a página 3 mais limpa, aumente o contraste do título e preserve o restante."
          disabled={ajustando}
          rows={6}
        />

        <AnexosAjuste
          pasta={pasta}
          anexos={anexos}
          aoMudar={aoMudarAnexos}
          desabilitado={ajustando}
        />

        <span className="studio-ajuste-rotulo">Modelo</span>
        <div className="studio-ajuste-modelos">
          {modelos.map((item) => (
            <button
              key={item.alias}
              className={modelo === item.alias ? "ativo" : ""}
              onClick={() => aoMudarModelo(item.alias)}
              disabled={ajustando}
              title={item.observacaoCusto}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
        <p className="studio-ajuste-nota">
          Comece pelo econômico. Se o resultado não convencer, repita o pedido num
          modelo maior.
        </p>

        {ajustando && <div className="studio-ajuste-progresso"><span /></div>}
        {ajustando && <p className="studio-ajuste-nota">A IA está ajustando somente este carrossel.</p>}
        {concluido && !ajustando && <p className="studio-ajuste-ok">Pronto. O carrossel foi atualizado.</p>}
        {erro && !ajustando && <p className="studio-ajuste-erro">{erro}</p>}

        <button
          className="botao botao-principal studio-ajuste-enviar"
          onClick={aoAjustar}
          disabled={ajustando || pedido.trim() === "" || !modelo}
        >
          {ajustando ? "Ajustando..." : "Ajustar"}
        </button>
      </div>
    </aside>
  );
}
