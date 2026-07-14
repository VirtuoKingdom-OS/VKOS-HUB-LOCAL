import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { urlArquivoContexto } from "../../api/cliente";
import { mensagemDeErro } from "../../util/erros";
import type { ArquivoContexto, Contexto } from "../../tipos/dominio";
import { IconeMais, IconeX } from "./Icones";
import { LightboxCanvas } from "../cockpit/LightboxCanvas";
import { parseLinks, rotuloLink, serializarLinks } from "../cockpit/links";

interface Props {
  contexto: Contexto | null;
  aberto: boolean;
  aoFechar: () => void;
}

function ehImagem(arquivo: ArquivoContexto): boolean {
  return arquivo.tipo.startsWith("image/");
}

// Editor de tela cheia compartilhado. Cobre os tres tipos de contexto:
// texto (editor grande), imagens (grade ampliada) e links (lista ampliada).
// Modal via portal: excecao consciente ao nao usar fixed no canvas. O cockpit
// e o shell usam este mesmo componente.
export function EditorContexto({ contexto, aberto, aoFechar }: Props) {
  const { atualizarContexto, anexarArquivos, removerArquivo } = usarEstado();

  const [texto, setTexto] = useState(contexto?.texto ?? "");
  const [nomeRascunho, setNomeRascunho] = useState(contexto?.nome ?? "");
  const [salvando, setSalvando] = useState(false);
  const [salvouAgora, setSalvouAgora] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [urlNova, setUrlNova] = useState("");
  const [descNova, setDescNova] = useState("");

  const focado = useRef(false);
  const timerSalvar = useRef<number | undefined>(undefined);
  const timerSalvou = useRef<number | undefined>(undefined);
  const refInput = useRef<HTMLInputElement>(null);

  const idContexto = contexto?.id ?? "";
  const tipo = contexto?.tipo ?? "texto";

  // Reflete o texto vindo do servidor quando o usuario nao esta digitando.
  useEffect(() => {
    if (!focado.current && contexto && contexto.texto !== texto) {
      setTexto(contexto.texto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexto?.texto]);

  // Ao abrir, sincroniza o titulo em edicao.
  useEffect(() => {
    if (aberto && contexto) setNomeRascunho(contexto.nome);
  }, [aberto, contexto]);

  const marcarSalvo = useCallback(() => {
    setSalvando(false);
    setSalvouAgora(true);
    if (timerSalvou.current) window.clearTimeout(timerSalvou.current);
    timerSalvou.current = window.setTimeout(() => setSalvouAgora(false), 2000);
  }, []);

  const fechar = useCallback(() => {
    if (timerSalvar.current) window.clearTimeout(timerSalvar.current);
    aoFechar();
  }, [aoFechar]);

  // Esc fecha o editor.
  useEffect(() => {
    if (!aberto) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fechar();
      }
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [aberto, fechar]);

  useEffect(() => {
    return () => {
      if (timerSalvar.current) window.clearTimeout(timerSalvar.current);
      if (timerSalvou.current) window.clearTimeout(timerSalvou.current);
    };
  }, []);

  if (!aberto || !contexto) return null;

  const ehImagens = tipo === "imagens";
  const ehLinks = tipo === "links";
  const imagens = contexto.arquivos.filter(ehImagem);
  const links = parseLinks(contexto.texto);

  // Autosave do texto com debounce de 1s (tipo texto).
  const aoMudarTexto = (valor: string) => {
    setTexto(valor);
    setSalvando(true);
    setSalvouAgora(false);
    if (timerSalvar.current) window.clearTimeout(timerSalvar.current);
    timerSalvar.current = window.setTimeout(async () => {
      try {
        await atualizarContexto(idContexto, { texto: valor });
        marcarSalvo();
      } catch (e) {
        setSalvando(false);
        setErroLocal(mensagemDeErro(e));
      }
    }, 1000);
  };

  const salvarNome = async () => {
    const limpo = nomeRascunho.trim();
    if (!limpo || limpo === contexto.nome) {
      setNomeRascunho(contexto.nome);
      return;
    }
    try {
      await atualizarContexto(idContexto, { nome: limpo });
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
      setNomeRascunho(contexto.nome);
    }
  };

  const enviar = async (arquivos: File[]) => {
    const validos = arquivos.filter((a) => a.type.startsWith("image/"));
    if (validos.length === 0) return;
    setEnviandoAnexo(true);
    setErroLocal(null);
    try {
      await anexarArquivos(idContexto, validos);
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const adicionarLink = async () => {
    const url = urlNova.trim();
    if (!url) return;
    const normal = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const novos = [...links, { url: normal, descricao: descNova.trim() }];
    setUrlNova("");
    setDescNova("");
    setSalvando(true);
    try {
      await atualizarContexto(idContexto, { texto: serializarLinks(novos) });
      marcarSalvo();
    } catch (e) {
      setSalvando(false);
      setErroLocal(mensagemDeErro(e));
    }
  };

  const removerLink = async (indice: number) => {
    const novos = links.filter((_, i) => i !== indice);
    setSalvando(true);
    try {
      await atualizarContexto(idContexto, { texto: serializarLinks(novos) });
      marcarSalvo();
    } catch (e) {
      setSalvando(false);
      setErroLocal(mensagemDeErro(e));
    }
  };

  const propsSoltar = ehImagens
    ? {
        onPaste: (e: ClipboardEvent) => {
          const arquivos = Array.from(e.clipboardData.files ?? []);
          if (arquivos.length > 0) {
            e.preventDefault();
            void enviar(arquivos);
          }
        },
        onDragOver: (e: DragEvent) => {
          e.preventDefault();
          if (!arrastando) setArrastando(true);
        },
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setArrastando(false);
          }
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          setArrastando(false);
          void enviar(Array.from(e.dataTransfer.files ?? []));
        },
      }
    : {};

  const indicadorSalvo = salvando ? (
    <span className="marca-salvando">Salvando</span>
  ) : salvouAgora ? (
    <span className="marca-salvo">Salvo</span>
  ) : (
    <span className="marca-vazia" />
  );

  const urlsImagens = imagens.map((a) => urlArquivoContexto(contexto.id, a.nome));

  return createPortal(
    <div className="overlay-tela-cheia" onMouseDown={fechar}>
      <div
        className={`modal-contexto tipo-${tipo}`}
        onMouseDown={(e) => e.stopPropagation()}
        {...propsSoltar}
      >
        <div className="topo-modal">
          <input
            className="titulo-modal"
            value={nomeRascunho}
            onChange={(e) => setNomeRascunho(e.target.value)}
            onBlur={() => void salvarNome()}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder="Sem título"
          />
          <div className="acoes-modal">
            {indicadorSalvo}
            <button className="fechar" onClick={fechar} title="Fechar (Esc)">
              <IconeX className="" />
            </button>
          </div>
        </div>

        <div className="corpo-modal">
          {ehImagens && (
            <>
              <div className="grade-imagens grande nowheel">
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
              <input
                ref={refInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  void enviar(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </>
          )}

          {ehLinks && (
            <div className="editor-links">
              <div className="lista-links grande nowheel">
                {links.length === 0 && (
                  <p className="dica-imagens">Nenhum link ainda. Adicione abaixo.</p>
                )}
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
                      {link.descricao && (
                        <span className="desc-link">{link.descricao}</span>
                      )}
                    </a>
                    <button
                      className="remover-link nodrag"
                      title="Remover link"
                      onClick={() => void removerLink(i)}
                    >
                      <IconeX className="" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="add-link">
                <input
                  className="url-nova"
                  placeholder="Cole a url (obrigatório)"
                  value={urlNova}
                  onChange={(e) => setUrlNova(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void adicionarLink();
                  }}
                />
                <input
                  className="desc-nova"
                  placeholder="Descrição (opcional)"
                  value={descNova}
                  onChange={(e) => setDescNova(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void adicionarLink();
                  }}
                />
                <button
                  className="botao botao-principal"
                  onClick={() => void adicionarLink()}
                  disabled={!urlNova.trim()}
                >
                  <IconeMais className="" />
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {!ehImagens && !ehLinks && (
            <textarea
              className="campo-notas-grande"
              autoFocus
              placeholder="Escreva à vontade. Salva sozinho."
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

        {arrastando && ehImagens && (
          <div className="capa-soltar">Solte as imagens</div>
        )}
      </div>

      {ampliada !== null && urlsImagens.length > 0 && (
        <LightboxCanvas
          urls={urlsImagens}
          indiceInicial={ampliada}
          aoFechar={() => setAmpliada(null)}
        />
      )}
    </div>,
    document.body
  );
}
