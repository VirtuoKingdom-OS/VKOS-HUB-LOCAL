import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { Botao } from "../comum/Botao";
import { IconeAlerta, IconeArquivo, IconeCheck } from "../comum/Icones";

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
// sincronizada no scroll. Ctrl+S salva, e o botao Salvar faz o mesmo pra quem
// nao sabe do atalho: quem usa o Hub nao e desenvolvedor.
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
      <div className="vazio">
        <IconeArquivo className="" />
        <h2>Nenhum arquivo aberto</h2>
        <p>
          Escolha um arquivo na árvore ao lado para ler e editar aqui. O que
          você salvar vale na hora, direto no disco.
        </p>
      </div>
    );
  }

  return (
    <div className="ide-editor">
      <header className="ide-editor-topo">
        <span className="ide-editor-caminho" title={caminho}>
          {caminho}
        </span>
        {sujo ? (
          <span className="selo selo-aviso">Não salvo</span>
        ) : (
          <span className="ide-editor-salvo">
            <IconeCheck className="" />
            Salvo
          </span>
        )}
        <Botao
          tamanho="p"
          onClick={aoSalvar}
          disabled={!sujo || salvando}
          aria-busy={salvando}
          title="Salvar o arquivo, ou Ctrl+S"
        >
          Salvar
        </Botao>
      </header>

      {erro && (
        <div className="faixa faixa-alerta ide-editor-erro" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">{erro}</div>
        </div>
      )}

      {carregando ? (
        <div className="ide-editor-carregando" aria-hidden="true">
          <div className="esqueleto esqueleto-linha" />
          <div className="esqueleto esqueleto-linha" />
          <div className="esqueleto esqueleto-linha" />
          <div className="esqueleto esqueleto-linha" />
          <div className="esqueleto esqueleto-linha" />
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
            aria-label={`Conteúdo de ${caminho}`}
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
