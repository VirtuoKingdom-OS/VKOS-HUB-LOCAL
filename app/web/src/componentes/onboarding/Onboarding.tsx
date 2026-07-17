import { useState } from "react";

import { usarEstado } from "../../estado/contexto";
import { IconeAlerta } from "../comum/Icones";
import { Marca } from "../comum/Telas";

// Estado de recuperacao. No pacote final o servidor conecta o VKOS interno no
// boot, entao o cliente nunca precisa procurar ou escolher uma pasta.
export function Onboarding() {
  const { recarregarInicial } = usarEstado();
  const [tentando, setTentando] = useState(false);

  const tentarDeNovo = async () => {
    setTentando(true);
    try {
      await recarregarInicial();
    } finally {
      setTentando(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="cartao-onboarding">
        <div className="cabecalho">
          <Marca />
        </div>
        <div className="miolo">
          <span className="selo pendente">
            <IconeAlerta className="" />
          </span>
          <h1>O VKOS interno não foi encontrado</h1>
          <p className="legenda">
            O Hub trabalha com o VKOS que veio na mesma pasta. Rode novamente
            o arquivo Instalar VKOS Hub.cmd para reparar o pacote.
          </p>
          <div className="acoes">
            <button
              type="button"
              className="botao botao-principal"
              onClick={() => void tentarDeNovo()}
              disabled={tentando}
            >
              {tentando ? "Verificando" : "Verificar novamente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
