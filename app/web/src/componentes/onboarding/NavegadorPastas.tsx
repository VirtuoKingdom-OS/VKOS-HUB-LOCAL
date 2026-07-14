import { useCallback, useEffect, useState } from "react";
import * as api from "../../api/cliente";
import { mensagemDeErro } from "../../util/erros";
import type { PastaListada } from "../../tipos/dominio";
import {
  IconeAlerta,
  IconePasta,
  IconeSubir,
} from "../comum/Icones";

// Navegador de pastas do filesystem. Destaca pastas com ehVkos.
// Ao escolher uma pasta VKOS, chama aoEscolher com o caminho.
// aoEscolherAtual (opcional) liga um botao "usar esta pasta" na barra de
// caminho, pra escolher a pasta atual mesmo que ela nao seja um VKOS (usado
// como pasta destino ao criar um cliente novo). O onboarding nao passa esse
// prop, entao o comportamento dele fica igual.
export function NavegadorPastas({
  aoEscolher,
  ocupado,
  aoEscolherAtual,
  rotuloAtual = "Usar esta pasta",
}: {
  aoEscolher: (caminho: string) => void;
  ocupado: boolean;
  aoEscolherAtual?: (caminho: string) => void;
  rotuloAtual?: string;
}) {
  const [caminhoAtual, setCaminhoAtual] = useState<string>("");
  const [pai, setPai] = useState<string | null>(null);
  const [pastas, setPastas] = useState<PastaListada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const navegar = useCallback(async (caminho?: string) => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await api.listarPastas(caminho);
      setCaminhoAtual(resposta.caminho);
      setPai(resposta.pai);
      setPastas(resposta.pastas);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void navegar();
  }, [navegar]);

  return (
    <div className="navegador">
      <div className="caminho-atual">
        <button
          className="botao-fantasma"
          style={{ padding: 6 }}
          disabled={!pai || carregando}
          onClick={() => pai && void navegar(pai)}
          title="Subir um nivel"
        >
          <IconeSubir className="" />
        </button>
        <span className="cam">{caminhoAtual || "Escolhendo o ponto de partida"}</span>
        {aoEscolherAtual && (
          <button
            className="usar-pasta-atual"
            disabled={!caminhoAtual || carregando || ocupado}
            onClick={() => caminhoAtual && aoEscolherAtual(caminhoAtual)}
          >
            {rotuloAtual}
          </button>
        )}
      </div>

      <div className="lista-pastas">
        {carregando ? (
          <div className="vazio-nav">Carregando pastas.</div>
        ) : pastas.length === 0 ? (
          <div className="vazio-nav">Nenhuma pasta aqui dentro.</div>
        ) : (
          pastas.map((pasta) => (
            <div
              key={pasta.caminho}
              className={`linha-pasta${pasta.ehVkos ? " eh-vkos" : ""}`}
              onClick={() => !ocupado && void navegar(pasta.caminho)}
            >
              <IconePasta className="icone-pasta" />
              <span className="nome-pasta">{pasta.nome}</span>
              {pasta.ehVkos && (
                <button
                  className="selo-vkos"
                  disabled={ocupado}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    aoEscolher(pasta.caminho);
                  }}
                >
                  É um VKOS, usar
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {erro && (
        <div className="erro-linha" style={{ margin: 12 }}>
          <IconeAlerta className="" />
          {erro}
        </div>
      )}
    </div>
  );
}
