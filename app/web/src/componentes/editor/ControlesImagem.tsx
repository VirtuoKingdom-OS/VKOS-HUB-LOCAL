import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconeGaleria, IconeLixeira, IconeRaio, IconeSubir, IconeX } from "../comum/Icones";

// Mesma razao da GaleriaFontes: os controles de imagem sao usados de dentro da
// Criacao tambem, entao a folha deles entra pelo proprio componente.
import "./editor.css";

// Fecha um popover pelas duas portas que ele sempre teve que ter: Escape e
// clique fora. Sem isso, um menu aberto sobre um item desabilitado virava um
// beco sem saida, que foi o segundo defeito do "Gerar outra com IA".
function usarFecharPopover(
  aberto: boolean,
  fechar: () => void,
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      evento.stopPropagation();
      fechar();
    };
    const aoApontar = (evento: MouseEvent) => {
      if (ref.current && !ref.current.contains(evento.target as Node)) fechar();
    };
    window.addEventListener("keydown", aoTeclar, true);
    window.addEventListener("mousedown", aoApontar);
    return () => {
      window.removeEventListener("keydown", aoTeclar, true);
      window.removeEventListener("mousedown", aoApontar);
    };
  }, [aberto, fechar]);
  return ref;
}

interface Props {
  srcPreview?: string;
  enviando: boolean;
  gerando: boolean;
  iaDisponivel: boolean;
  erro?: string | null;
  aoArquivo: (file: File) => void;
  aoAbrirGaleria?: () => void;
  // A descricao vem do campo livre e pode ser vazia: vazia, a IA usa so o
  // contexto do elemento, que e o fluxo rapido de sempre.
  aoGerar: (descricao: string) => void;
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
  const [pedindoDescricao, setPedindoDescricao] = useState(false);
  const refArquivo = useRef<HTMLInputElement>(null);
  const refMenu = usarFecharPopover(menuAberto, () => setMenuAberto(false));
  const ocupado = enviando || gerando;

  // Ocupado fecha o menu, mas nunca prende a janela de descricao: quem abriu
  // ainda tem que conseguir sair dela.
  useEffect(() => {
    if (ocupado) setMenuAberto(false);
  }, [ocupado]);

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) aoArquivo(file);
  }

  return (
    <div className="editor-imagem-controles">
      {srcPreview && <img className="editor-imagem-preview" src={srcPreview} alt="" />}

      <div className="editor-imagem-acoes">
        <div className="editor-imagem-troca" ref={refMenu}>
          <button
            className="botao botao-neutro editor-imagem-principal"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            disabled={ocupado}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuAberto}
          >
            {gerando ? "Gerando imagem..." : enviando ? "Enviando..." : "Trocar imagem"}
          </button>

          {menuAberto && !ocupado && (
            <div
              className="popover menu editor-imagem-menu"
              role="menu"
              aria-label="Trocar imagem"
            >
              <button
                type="button"
                role="menuitem"
                className="menu-item"
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
                  role="menuitem"
                  className="menu-item"
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
                role="menuitem"
                className="menu-item"
                disabled={!iaDisponivel}
                onClick={() => {
                  setMenuAberto(false);
                  setPedindoDescricao(true);
                }}
              >
                <IconeRaio className="" />
                <span>
                  Gerar outra com IA
                  <small>
                    {iaDisponivel ? "Você descreve o que quer" : "Conecte o Codex"}
                  </small>
                </span>
              </button>
            </div>
          )}
        </div>

        <button
          className="botao botao-perigo"
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

      <JanelaDescricaoImagem
        aberta={pedindoDescricao}
        aoFechar={() => setPedindoDescricao(false)}
        aoGerar={(descricao) => {
          setPedindoDescricao(false);
          aoGerar(descricao);
        }}
      />
    </div>
  );
}

// Janela de descricao da imagem. Ela existe porque "Gerar outra com IA"
// disparava direto e o usuario nao tinha onde dizer o que queria: sobrava o
// texto raspado do elemento, que e apoio, nao pedido.
//
// Fecha por tres portas, e nenhuma delas some enquanto a IA trabalha: Escape,
// clique no fundo e o X do canto.
interface PropsDescricao {
  aberta: boolean;
  aoFechar: () => void;
  aoGerar: (descricao: string) => void;
}

function JanelaDescricaoImagem({ aberta, aoFechar, aoGerar }: PropsDescricao) {
  const [descricao, setDescricao] = useState("");
  const refCampo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!aberta) return;
    setDescricao("");
    refCampo.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      evento.stopPropagation();
      aoFechar();
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [aberta, aoFechar]);

  if (!aberta) return null;

  return createPortal(
    <div
      /* "descricao-imagem-camada" nao veste nada: e o marcador que o Escape
         do Studio procura. Ver TelaStudio.tsx. */
      className="veu-modal descricao-imagem-camada"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="descricao-imagem-titulo"
      >
        <header className="modal-topo">
          <h2 id="descricao-imagem-titulo">Gerar outra com IA</h2>
          <button
            type="button"
            className="botao botao-p botao-icone botao-fantasma"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <IconeX className="" />
          </button>
        </header>

        <div className="modal-corpo">
          <div className="grupo-campo">
            <label className="rotulo" htmlFor="descricao-imagem-campo">
              Descrição da imagem (opcional)
            </label>
            <textarea
              className="campo descricao-imagem-campo"
              id="descricao-imagem-campo"
              ref={refCampo}
              rows={5}
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) {
                  evento.preventDefault();
                  aoGerar(descricao.trim());
                }
              }}
              placeholder="Ex: uma xícara de café coado sobre madeira clara, luz da manhã, sem texto."
              aria-describedby="descricao-imagem-nota"
            />
            {/* A dica não repete o rótulo. Antes, "deixe em branco" aparecia
                três vezes na mesma janela: no subtítulo, no rótulo e aqui. */}
            <p className="dica" id="descricao-imagem-nota">
              A imagem entra no lugar da que está selecionada. Em branco, a IA
              usa o contexto do elemento; com descrição, o que você escrever
              manda. Ctrl+Enter gera.
            </p>
          </div>
        </div>

        <footer className="modal-rodape">
          <button type="button" className="botao botao-neutro" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao-principal"
            onClick={() => aoGerar(descricao.trim())}
          >
            Gerar imagem
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

// Botao "Adicionar imagem" com as mesmas duas origens do ControlesImagem
// (computador e fontes de dados), sem o gerar com IA e sem excluir: insere uma
// imagem NOVA como elemento livre, nao troca uma existente. Reusa as classes
// do menu pra manter o mesmo sistema visual nos 3 temas.
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
  const refMenu = usarFecharPopover(menuAberto, () => setMenuAberto(false));

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) aoArquivo(file);
  }

  return (
    <div className="editor-imagem-controles">
      <div className="editor-imagem-troca" ref={refMenu}>
        <button
          className="botao botao-neutro editor-imagem-principal"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          disabled={enviando}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuAberto}
        >
          {enviando ? "Enviando..." : "Adicionar imagem"}
        </button>

        {menuAberto && !enviando && (
          <div
            className="popover menu editor-imagem-menu"
            role="menu"
            aria-label="Adicionar imagem"
          >
            <button
              type="button"
              role="menuitem"
              className="menu-item"
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
                role="menuitem"
                className="menu-item"
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
