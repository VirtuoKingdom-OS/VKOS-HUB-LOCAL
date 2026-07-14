import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { usarEstado } from "../../estado/contexto";
import { urlArquivoContexto } from "../../api/cliente";
import { mensagemDeErro } from "../../util/erros";
import type { ArquivoContexto } from "../../tipos/dominio";
import { IconeMais, IconeX } from "../comum/Icones";
import { EditorContexto } from "../comum/EditorContexto";
import { LightboxCanvas } from "./LightboxCanvas";
import { parseLinks, rotuloLink, serializarLinks } from "./links";

// Dados que o no de contexto carrega. Leve e serializavel.
export interface DadosContexto extends Record<string, unknown> {
  idContexto: string;
  // Ligado pelo menu Renomear pra abrir o campo de edicao do titulo.
  editando?: boolean;
  // Ligado pelo menu Tela cheia pra abrir o editor grande.
  expandido?: boolean;
}

function ehImagem(arquivo: ArquivoContexto): boolean {
  return arquivo.tipo.startsWith("image/");
}

// Icone de expandir pra tela cheia. Inline pra manter o no independente.
function IconeExpandir({ tamanho = 16 }: { tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" />
    </svg>
  );
}

// Icones da marca de cada tipo, inline pelo mesmo motivo.
function IconeNotas() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}
function IconeImagens() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.4" />
      <path d="m5 16 4-4 4 4 3-3 3 3" />
    </svg>
  );
}
function IconeLinks() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a4 4 0 0 0 5.7.3l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
      <path d="M14 11a4 4 0 0 0-5.7-.3L5.7 13.3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
    </svg>
  );
}

// No de contexto: um insumo, extensao do Cerebro. Tres tipos: texto (bloco de
// notas), imagens (grade de referencias) e links (lista de urls de referencia).
// Redimensionavel e com visualizacao em tela cheia pelo editor compartilhado.
function NoContextoInterno({ id, data }: NodeProps) {
  const dados = data as unknown as DadosContexto;
  const { setNodes } = useReactFlow();
  const {
    contextos,
    atualizarContexto,
    anexarArquivos,
    removerArquivo,
  } = usarEstado();

  const contexto = contextos.find((c) => c.id === dados.idContexto);
  const tipo = contexto?.tipo ?? "texto";
  const ehImagens = tipo === "imagens";
  const ehLinks = tipo === "links";

  const [texto, setTexto] = useState(contexto?.texto ?? "");
  const [nomeRascunho, setNomeRascunho] = useState(contexto?.nome ?? "");
  const [salvando, setSalvando] = useState(false);
  const [salvouAgora, setSalvouAgora] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [urlNova, setUrlNova] = useState("");
  const [descNova, setDescNova] = useState("");

  const focado = useRef(false);
  const timerSalvar = useRef<number | undefined>(undefined);
  const timerSalvou = useRef<number | undefined>(undefined);
  const refInput = useRef<HTMLInputElement>(null);

  const telaCheia = Boolean(dados.expandido);

  // Reflete no campo o texto vindo do servidor quando o usuario nao esta
  // digitando, pra nao roubar o cursor.
  useEffect(() => {
    if (!focado.current && contexto && contexto.texto !== texto) {
      setTexto(contexto.texto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexto?.texto]);

  const marcarSalvo = useCallback(() => {
    setSalvando(false);
    setSalvouAgora(true);
    if (timerSalvou.current) window.clearTimeout(timerSalvou.current);
    timerSalvou.current = window.setTimeout(() => setSalvouAgora(false), 2000);
  }, []);

  // Autosave do texto com debounce de 1s.
  const aoMudarTexto = (valor: string) => {
    setTexto(valor);
    setSalvando(true);
    setSalvouAgora(false);
    if (timerSalvar.current) window.clearTimeout(timerSalvar.current);
    timerSalvar.current = window.setTimeout(async () => {
      try {
        await atualizarContexto(dados.idContexto, { texto: valor });
        marcarSalvo();
      } catch (e) {
        setSalvando(false);
        setErroLocal(mensagemDeErro(e));
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerSalvar.current) window.clearTimeout(timerSalvar.current);
      if (timerSalvou.current) window.clearTimeout(timerSalvou.current);
    };
  }, []);

  const definirDado = useCallback(
    (parcial: Partial<DadosContexto>) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...parcial } } : n
        )
      );
    },
    [id, setNodes]
  );

  const salvarNome = async () => {
    const limpo = nomeRascunho.trim();
    definirDado({ editando: false });
    if (!limpo || !contexto || limpo === contexto.nome) {
      setNomeRascunho(contexto?.nome ?? "");
      return;
    }
    try {
      await atualizarContexto(dados.idContexto, { nome: limpo });
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
      setNomeRascunho(contexto.nome);
    }
  };

  const enviar = async (arquivos: File[]) => {
    // No tipo imagens a UI so aceita imagem.
    const validos = ehImagens
      ? arquivos.filter((a) => a.type.startsWith("image/"))
      : arquivos;
    if (validos.length === 0) return;
    setEnviandoAnexo(true);
    setErroLocal(null);
    try {
      await anexarArquivos(dados.idContexto, validos);
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const aoSoltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    void enviar(Array.from(e.dataTransfer.files ?? []));
  };

  const aoColar = (e: ClipboardEvent) => {
    const arquivos = Array.from(e.clipboardData.files ?? []);
    if (arquivos.length > 0) {
      // Colar imagem vira anexo, nao entra no texto.
      e.preventDefault();
      void enviar(arquivos);
    }
  };

  // Salva a lista de links serializada no texto do contexto.
  const salvarLinks = async (novos: { url: string; descricao: string }[]) => {
    setSalvando(true);
    setSalvouAgora(false);
    try {
      await atualizarContexto(dados.idContexto, { texto: serializarLinks(novos) });
      marcarSalvo();
    } catch (e) {
      setSalvando(false);
      setErroLocal(mensagemDeErro(e));
    }
  };

  const adicionarLink = (links: { url: string; descricao: string }[]) => {
    const url = urlNova.trim();
    if (!url) return;
    const normal = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    setUrlNova("");
    setDescNova("");
    void salvarLinks([...links, { url: normal, descricao: descNova.trim() }]);
  };

  const removerLink = (links: { url: string; descricao: string }[], indice: number) => {
    void salvarLinks(links.filter((_, i) => i !== indice));
  };

  const abrirTelaCheia = () => {
    setNomeRascunho(contexto?.nome ?? "");
    definirDado({ expandido: true });
  };
  const fecharTelaCheia = useCallback(() => {
    definirDado({ expandido: false });
  }, [definirDado]);

  if (!contexto) {
    return (
      <div className="no-contexto carregando">
        <Handle type="source" position={Position.Right} />
        <div className="corpo-contexto">Carregando contexto.</div>
      </div>
    );
  }

  const editando = Boolean(dados.editando);
  const imagens = contexto.arquivos.filter(ehImagem);
  const urlsImagens = imagens.map((a) => urlArquivoContexto(contexto.id, a.nome));
  const links = ehLinks ? parseLinks(contexto.texto) : [];

  const indicadorSalvo = salvando ? (
    <span className="marca-salvando">Salvando</span>
  ) : salvouAgora ? (
    <span className="marca-salvo">Salvo</span>
  ) : (
    <span className="marca-vazia" />
  );

  const campoInvisivel = (
    <input
      ref={refInput}
      type="file"
      accept={ehImagens ? "image/*" : undefined}
      multiple
      hidden
      onChange={(e) => {
        void enviar(Array.from(e.target.files ?? []));
        e.target.value = "";
      }}
    />
  );

  // Grade de imagens do no.
  const renderGrade = (): ReactNode => (
    <div className="grade-imagens nowheel">
      {imagens.map((arquivo, i) => {
        const url = urlArquivoContexto(contexto.id, arquivo.nome);
        return (
          <div className="mini-imagem" key={arquivo.nome} title={arquivo.nome}>
            <img
              src={url}
              alt={arquivo.nome}
              loading="lazy"
              onClick={() => setAmpliada(i)}
            />
            <button
              className="remover-imagem nodrag"
              title="Remover imagem"
              onClick={() => void removerArquivo(contexto.id, arquivo.nome)}
            >
              <IconeX className="" />
            </button>
          </div>
        );
      })}
      <button
        className="add-imagem nodrag"
        onClick={() => refInput.current?.click()}
        disabled={enviandoAnexo}
        title="Adicionar imagens"
      >
        <IconeMais className="" />
        <span>{enviandoAnexo ? "Enviando" : "Adicionar"}</span>
      </button>
    </div>
  );

  // Lista de links do no.
  const renderLinks = (): ReactNode => (
    <div className="corpo-links">
      <div className="lista-links nowheel">
        {links.map((link, i) => (
          <div className="linha-link" key={`${link.url}-${i}`}>
            <a
              className="corpo-link"
              href={link.url}
              target="_blank"
              rel="noreferrer"
              title={link.url}
            >
              <span className="rotulo-link">{rotuloLink(link.url)}</span>
              {link.descricao && <span className="desc-link">{link.descricao}</span>}
            </a>
            <button
              className="remover-link nodrag"
              title="Remover link"
              onClick={() => removerLink(links, i)}
            >
              <IconeX className="" />
            </button>
          </div>
        ))}
      </div>
      <div className="add-link">
        <input
          className="nodrag url-nova"
          placeholder="Cole a url"
          value={urlNova}
          onChange={(e) => setUrlNova(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") adicionarLink(links);
          }}
        />
        <input
          className="nodrag desc-nova"
          placeholder="Descrição (opcional)"
          value={descNova}
          onChange={(e) => setDescNova(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") adicionarLink(links);
          }}
        />
        <button
          className="add-link-botao nodrag"
          onClick={() => adicionarLink(links)}
          disabled={!urlNova.trim()}
          title="Adicionar link"
        >
          <IconeMais className="" />
        </button>
      </div>
    </div>
  );

  // So o tipo imagens aceita soltar, colar e arrastar arquivo.
  const propsSoltar = ehImagens
    ? {
        onPaste: aoColar,
        onDragOver: (e: DragEvent) => {
          e.preventDefault();
          if (!arrastando) setArrastando(true);
        },
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setArrastando(false);
          }
        },
        onDrop: aoSoltar,
      }
    : {};

  const marcaClasse = ehImagens ? "img" : ehLinks ? "lnk" : "txt";
  const marcaIcone = ehImagens ? (
    <IconeImagens />
  ) : ehLinks ? (
    <IconeLinks />
  ) : (
    <IconeNotas />
  );

  return (
    <>
      <NodeResizer
        color="var(--menta)"
        isVisible
        minWidth={260}
        minHeight={180}
        handleClassName="alca-resize"
        lineClassName="linha-resize"
      />

      <div
        className={`no-contexto tipo-${contexto.tipo}${
          arrastando ? " arrastando" : ""
        }`}
        {...propsSoltar}
      >
        <Handle type="source" position={Position.Right} />

        <div className="cabeca-contexto">
          <span className={`marca-contexto ${marcaClasse}`}>{marcaIcone}</span>
          {editando ? (
            <input
              className="nodrag campo-nome"
              autoFocus
              value={nomeRascunho}
              onChange={(e) => setNomeRascunho(e.target.value)}
              onBlur={() => void salvarNome()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void salvarNome();
                if (e.key === "Escape") {
                  setNomeRascunho(contexto.nome);
                  definirDado({ editando: false });
                }
              }}
            />
          ) : (
            <span
              className="titulo-contexto"
              title="Duplo clique para renomear"
              onDoubleClick={() => {
                setNomeRascunho(contexto.nome);
                definirDado({ editando: true });
              }}
            >
              {contexto.nome}
            </span>
          )}
          {!ehImagens && indicadorSalvo}
          <button
            className="botao-expandir nodrag"
            title="Abrir em tela cheia"
            onClick={abrirTelaCheia}
          >
            <IconeExpandir />
          </button>
        </div>

        <div className="corpo-contexto">
          {ehImagens ? (
            imagens.length === 0 ? (
              <div className="grade-vazia">
                {renderGrade()}
                <p className="dica-imagens">
                  Solte, cole ou escolha imagens de referência.
                </p>
              </div>
            ) : (
              renderGrade()
            )
          ) : ehLinks ? (
            renderLinks()
          ) : (
            <textarea
              className="nodrag nowheel campo-notas"
              placeholder="Escreva notas ou cole texto aqui."
              value={texto}
              onChange={(e) => aoMudarTexto(e.target.value)}
              onFocus={() => {
                focado.current = true;
              }}
              onBlur={() => {
                focado.current = false;
              }}
            />
          )}

          {erroLocal && <div className="erro-local">{erroLocal}</div>}
        </div>

        {ehImagens && campoInvisivel}

        {arrastando && <div className="capa-soltar">Solte as imagens</div>}
      </div>

      <EditorContexto
        contexto={contexto}
        aberto={telaCheia}
        aoFechar={fecharTelaCheia}
      />

      {ampliada !== null && urlsImagens.length > 0 && (
        <LightboxCanvas
          urls={urlsImagens}
          indiceInicial={ampliada}
          aoFechar={() => setAmpliada(null)}
        />
      )}
    </>
  );
}

export const NoContexto = memo(NoContextoInterno);
