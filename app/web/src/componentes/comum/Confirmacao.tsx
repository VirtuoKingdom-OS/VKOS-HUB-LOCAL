import { useEffect } from "react";
import { IconeAlerta } from "./Icones";

export interface DadosConfirmacao {
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  aoConfirmar: () => void;
}

// Confirmacao estilizada no padrao VK. Substitui o window.confirm nativo.
// Fecha com Esc ou clique no fundo. Botao de confirmar em tom de alerta.
export function Confirmacao({
  dados,
  aoFechar,
}: {
  dados: DadosConfirmacao;
  aoFechar: () => void;
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const confirmar = () => {
    dados.aoConfirmar();
    aoFechar();
  };

  return (
    <div className="overlay" onClick={aoFechar}>
      <div className="cartao-confirmacao" onClick={(e) => e.stopPropagation()}>
        <div className="selo-alerta">
          <IconeAlerta className="" />
        </div>
        <h2>{dados.titulo}</h2>
        <p>{dados.mensagem}</p>
        <div className="acoes-confirmacao">
          <button className="botao botao-neutro" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="botao botao-perigo-solido" onClick={confirmar}>
            {dados.rotuloConfirmar ?? "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
