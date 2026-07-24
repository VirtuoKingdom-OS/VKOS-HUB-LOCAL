import { useRef, useState } from "react";
import { IconeGaleria, IconeLixeira, IconeRaio, IconeSubir } from "../comum/Icones";

interface Props {
  srcPreview?: string;
  enviando: boolean;
  gerando: boolean;
  iaDisponivel: boolean;
  erro?: string | null;
  aoArquivo: (file: File) => void;
  aoAbrirGaleria?: () => void;
  aoGerar: () => void;
  aoExcluir: () => void;
}

export function ControlesImagem({
  srcPreview,
  enviando,
  gerando,
  iaDisponivel,
  erro,
  aoArquivo,
  aoAbrirGaleria,
  aoGerar,
  aoExcluir,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const refArquivo = useRef<HTMLInputElement>(null);
  const ocupado = enviando || gerando;

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) aoArquivo(file);
  }

  return (
    <div className="editor-imagem-controles">
      {srcPreview && <img className="editor-imagem-preview" src={srcPreview} alt="" />}

      <div className="editor-imagem-acoes">
        <div className="editor-imagem-troca">
          <button
            className="botao botao-neutro editor-imagem-principal"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            disabled={ocupado}
            type="button"
          >
            {gerando ? "Gerando imagem..." : enviando ? "Enviando..." : "Trocar imagem"}
          </button>

          {menuAberto && !ocupado && (
            <div className="editor-imagem-menu">
              <button
                type="button"
                onClick={() => {
                  setMenuAberto(false);
                  refArquivo.current?.click();
                }}
              >
                <IconeSubir className="" />
                <span>
                  Selecionar do computador
                  <small>JPG, PNG ou WebP</small>
                </span>
              </button>
              {aoAbrirGaleria && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuAberto(false);
                    aoAbrirGaleria();
                  }}
                >
                  <IconeGaleria className="" />
                  <span>
                    Escolher das fontes de dados
                    <small>Reutiliza uma imagem já guardada</small>
                  </span>
                </button>
              )}
              <button
                type="button"
                disabled={!iaDisponivel}
                onClick={() => {
                  setMenuAberto(false);
                  aoGerar();
                }}
              >
                <IconeRaio className="" />
                <span>
                  Gerar outra com IA
                  <small>{iaDisponivel ? "Usa o contexto desta página" : "Conecte o Codex"}</small>
                </span>
              </button>
            </div>
          )}
        </div>

        <button
          className="botao botao-perigo editor-imagem-excluir"
          onClick={aoExcluir}
          disabled={ocupado}
          type="button"
          title="Excluir imagem"
        >
          <IconeLixeira className="" />
          Excluir
        </button>
      </div>

      <input ref={refArquivo} type="file" accept="image/*" hidden onChange={escolherArquivo} />
      {erro && <small className="editor-imagem-erro">{erro}</small>}
    </div>
  );
}

// Botao "Adicionar imagem" com as mesmas duas origens do ControlesImagem
// (computador e fontes de dados), sem o gerar com IA e sem excluir: insere uma
// imagem NOVA como elemento livre, nao troca uma existente. Reusa as classes
// do menu pra manter o mesmo sistema visual nos 2 temas.
interface PropsAdicionar {
  enviando: boolean;
  erro?: string | null;
  aoArquivo: (file: File) => void;
  aoAbrirGaleria?: () => void;
}

export function MenuAdicionarImagem({
  enviando,
  erro,
  aoArquivo,
  aoAbrirGaleria,
}: PropsAdicionar) {
  const [menuAberto, setMenuAberto] = useState(false);
  const refArquivo = useRef<HTMLInputElement>(null);

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) aoArquivo(file);
  }

  return (
    <div className="editor-imagem-controles">
      <div className="editor-imagem-troca">
        <button
          className="botao botao-neutro editor-imagem-principal"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          disabled={enviando}
          type="button"
        >
          {enviando ? "Enviando..." : "Adicionar imagem"}
        </button>

        {menuAberto && !enviando && (
          <div className="editor-imagem-menu">
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false);
                refArquivo.current?.click();
              }}
            >
              <IconeSubir className="" />
              <span>
                Selecionar do computador
                <small>JPG, PNG ou WebP</small>
              </span>
            </button>
            {aoAbrirGaleria && (
              <button
                type="button"
                onClick={() => {
                  setMenuAberto(false);
                  aoAbrirGaleria();
                }}
              >
                <IconeGaleria className="" />
                <span>
                  Escolher das fontes de dados
                  <small>Reutiliza uma imagem já guardada</small>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <input ref={refArquivo} type="file" accept="image/*" hidden onChange={escolherArquivo} />
      {erro && <small className="editor-imagem-erro">{erro}</small>}
    </div>
  );
}
