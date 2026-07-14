import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { IconeArquivo, IconeCheck } from "../comum/Icones";

interface Props {
  caminho: string | null;
  valor: string;
  aoMudar: (valor: string) => void;
  aoSalvar: () => void;
  sujo: boolean;
  salvando: boolean;
  carregando: boolean;
  erro: string | null;
}

// Editor de texto simples: textarea mono com coluna de numeros de linha
// sincronizada no scroll. Ctrl+S salva. Indicador de sujo e salvo no topo.
// Sem dependencia de editor pesado nesta fase (contrato da rodada 10).
export function EditorArquivo({
  caminho,
  valor,
  aoMudar,
  aoSalvar,
  sujo,
  salvando,
  carregando,
  erro,
}: Props) {
  const refArea = useRef<HTMLTextAreaElement>(null);
  const refGutter = useRef<HTMLDivElement>(null);

  // Numeros de linha: um por quebra. Recalcula so quando o texto muda.
  const linhas = useMemo(() => {
    const total = valor.length === 0 ? 1 : valor.split("\n").length;
    const arr: number[] = [];
    for (let i = 1; i <= total; i++) arr.push(i);
    return arr;
  }, [valor]);

  // Sincroniza a rolagem da coluna de numeros com a do texto.
  const aoRolar = () => {
    if (refGutter.current && refArea.current) {
      refGutter.current.scrollTop = refArea.current.scrollTop;
    }
  };

  // Ctrl+S salva sem deixar o navegador abrir o dialogo de salvar pagina.
  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (sujo && !salvando) aoSalvar();
    }
  };

  // Reseta a rolagem ao trocar de arquivo.
  useEffect(() => {
    if (refArea.current) refArea.current.scrollTop = 0;
    if (refGutter.current) refGutter.current.scrollTop = 0;
  }, [caminho]);

  if (!caminho) {
    return (
      <div className="ide-editor-vazio">
        <IconeArquivo className="" style={{ width: 34, height: 34, opacity: 0.5 }} />
        <p>Escolha um arquivo na árvore pra abrir aqui.</p>
      </div>
    );
  }

  return (
    <div className="ide-editor">
      <header className="ide-editor-topo">
        <span className="ide-editor-caminho" title={caminho}>
          {caminho}
        </span>
        <span className="ide-editor-estado">
          {salvando ? (
            <span className="ide-estado-salvando">Salvando...</span>
          ) : sujo ? (
            <span className="ide-estado-sujo">
              <span className="ide-ponto-sujo" />
              Não salvo
            </span>
          ) : (
            <span className="ide-estado-salvo">
              <IconeCheck className="" />
              Salvo
            </span>
          )}
        </span>
      </header>

      {erro && <div className="ide-editor-erro">{erro}</div>}

      {carregando ? (
        <div className="ide-editor-carregando">
          <span className="giro" />
        </div>
      ) : (
        <div className="ide-editor-area">
          <div className="ide-gutter" ref={refGutter} aria-hidden="true">
            {linhas.map((n) => (
              <div key={n} className="ide-gutter-linha">
                {n}
              </div>
            ))}
          </div>
          <textarea
            ref={refArea}
            className="ide-textarea"
            value={valor}
            spellCheck={false}
            wrap="off"
            onChange={(e) => aoMudar(e.target.value)}
            onScroll={aoRolar}
            onKeyDown={aoTeclar}
          />
        </div>
      )}
    </div>
  );
}
