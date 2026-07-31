import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { urlArquivoContexto } from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import { IconeGaleria, IconeX } from "../comum/Icones";
import { ehImagem } from "../telas/fontes";

// A folha entra por aqui porque a galeria tambem abre de dentro das telas de
// Criacao, que nao carregam o editor. Ate 2026-07-27 o estilo dela morava no
// global.css e vinha de graca, o que escondia essa dependencia.
import "./editor.css";

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
      /* "galeria-fontes-camada" nao veste nada: e o que o Escape do Studio
         procura pra saber que esta janela esta aberta na frente do canvas e
         nao limpar a selecao junto. Ver TelaStudio.tsx. */
      className="veu-modal galeria-fontes-camada"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !carregando) aoFechar();
      }}
    >
      <section className="modal modal-g" role="dialog" aria-modal="true" aria-label="Imagens das fontes de dados">
        <header className="modal-topo">
          <h2>Fontes de dados</h2>
          <button
            type="button"
            className="botao botao-p botao-icone botao-fantasma"
            onClick={aoFechar}
            disabled={!!carregando}
            aria-label="Fechar galeria"
          >
            <IconeX className="" />
          </button>
        </header>

        <div className="modal-corpo galeria-fontes-corpo">
          {grupos.length === 0 ? (
            /* Estado vazio ENSINA: o que é aquilo e qual é a próxima ação. */
            <div className="vazio">
              <IconeGaleria className="" />
              <h2>Nenhuma imagem guardada ainda</h2>
              <p>
                As imagens que você enviar nas fontes de dados do workspace
                aparecem aqui, prontas para reusar em qualquer criação.
              </p>
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
          {erro && (
            <p className="faixa faixa-alerta" role="alert">
              {erro}
            </p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
