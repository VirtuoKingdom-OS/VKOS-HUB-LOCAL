import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { urlArquivoContexto } from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import { IconeGaleria, IconeX } from "../comum/Icones";
import { ehImagem } from "../telas/fontes";

export interface ArquivoGaleriaFonte {
  contextoId: string;
  nome: string;
}

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  aoEscolher: (arquivo: ArquivoGaleriaFonte) => void | Promise<void>;
}

export function GaleriaFontes({ aberta, aoFechar, aoEscolher }: Props) {
  const { contextos } = usarEstado();
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const grupos = useMemo(
    () =>
      contextos
        .map((contexto) => ({
          id: contexto.id,
          nome: contexto.nome,
          arquivos: contexto.arquivos.filter((arquivo) =>
            ehImagem(arquivo.nome, arquivo.tipo),
          ),
        }))
        .filter((contexto) => contexto.arquivos.length > 0),
    [contextos],
  );

  useEffect(() => {
    if (!aberta) return;
    setErro(null);
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !carregando) aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberta, carregando, aoFechar]);

  if (!aberta) return null;

  const escolher = async (arquivo: ArquivoGaleriaFonte) => {
    const chave = `${arquivo.contextoId}/${arquivo.nome}`;
    setCarregando(chave);
    setErro(null);
    try {
      await aoEscolher(arquivo);
      aoFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(null);
    }
  };

  return createPortal(
    <div
      className="galeria-fontes-camada"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !carregando) aoFechar();
      }}
    >
      <section className="galeria-fontes-modal" role="dialog" aria-modal="true" aria-label="Imagens das fontes de dados">
        <header className="galeria-fontes-topo">
          <div>
            <span className="galeria-fontes-marca">
              <IconeGaleria className="" />
            </span>
            <div>
              <h2>Fontes de dados</h2>
              <p>Escolha uma imagem para usar nesta criação.</p>
            </div>
          </div>
          <button type="button" onClick={aoFechar} disabled={!!carregando} aria-label="Fechar galeria">
            <IconeX className="" />
          </button>
        </header>

        <div className="galeria-fontes-corpo">
          {grupos.length === 0 ? (
            <div className="galeria-fontes-vazia">
              <IconeGaleria className="" />
              <p>Nenhuma imagem nas fontes de dados ainda.</p>
            </div>
          ) : (
            grupos.map((grupo) => (
              <section className="galeria-fontes-grupo" key={grupo.id}>
                <h3>{grupo.nome}</h3>
                <div className="galeria-fontes-grade">
                  {grupo.arquivos.map((arquivo) => {
                    const chave = `${grupo.id}/${arquivo.nome}`;
                    return (
                      <button
                        type="button"
                        key={arquivo.nome}
                        disabled={!!carregando}
                        onClick={() => void escolher({ contextoId: grupo.id, nome: arquivo.nome })}
                        title={arquivo.nome}
                      >
                        <img
                          src={urlArquivoContexto(grupo.id, arquivo.nome)}
                          alt=""
                          loading="lazy"
                        />
                        <span>{carregando === chave ? "Copiando..." : arquivo.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
          {erro && <p className="galeria-fontes-erro">{erro}</p>}
        </div>
      </section>
    </div>,
    document.body,
  );
}
