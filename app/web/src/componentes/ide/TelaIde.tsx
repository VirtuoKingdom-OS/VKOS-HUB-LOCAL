import { useCallback, useEffect, useState } from "react";
import * as ide from "../../api/ide";
import type { RespostaArvore } from "../../api/ide";
import { mensagemDeErro } from "../../util/erros";
import { IconeChevron } from "../comum/Icones";
import { ArvoreArquivos } from "./ArvoreArquivos";
import { EditorArquivo } from "./EditorArquivo";
import { ChatIde } from "./ChatIde";
import "../../estilos/ide.css";

// Ícone de recarregar: uma seta circular. Gira enquanto recarrega.
function IconeRecarregar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" />
      <path d="M4 20v-4h4" />
    </svg>
  );
}

// Tela cheia da VKOS-IDE: arvore de arquivos, editor e chat com o Claude, tudo
// escopado na pasta do cliente ativo. Integrada ao Shell pela integracao final
// (rota #/ide). Mesmo padrao das telas de fluxo (position absolute na moldura).
export function TelaIde() {
  const [arvore, setArvore] = useState<RespostaArvore | null>(null);
  const [carregandoArvore, setCarregandoArvore] = useState(true);
  const [erroArvore, setErroArvore] = useState<string | null>(null);

  const [arquivoAberto, setArquivoAberto] = useState<string | null>(null);
  const [conteudoOriginal, setConteudoOriginal] = useState("");
  const [conteudoEditado, setConteudoEditado] = useState("");
  const [carregandoArquivo, setCarregandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroEditor, setErroEditor] = useState<string | null>(null);

  const [chatRecolhido, setChatRecolhido] = useState(false);

  const sujo = arquivoAberto !== null && conteudoEditado !== conteudoOriginal;

  const recarregarArvore = useCallback(async () => {
    setCarregandoArvore(true);
    setErroArvore(null);
    try {
      const dados = await ide.obterArvore();
      setArvore(dados);
    } catch (e) {
      setErroArvore(mensagemDeErro(e));
    } finally {
      setCarregandoArvore(false);
    }
  }, []);

  useEffect(() => {
    void recarregarArvore();
  }, [recarregarArvore]);

  const abrirArquivo = useCallback(
    async (caminho: string) => {
      if (caminho === arquivoAberto) return;
      // Aviso ao trocar de arquivo com mudanca pendente.
      if (
        sujo &&
        !window.confirm(
          `O arquivo ${arquivoAberto} tem alterações não salvas. Descartar e abrir o outro?`
        )
      ) {
        return;
      }
      setArquivoAberto(caminho);
      setCarregandoArquivo(true);
      setErroEditor(null);
      try {
        const dados = await ide.lerArquivo(caminho);
        setConteudoOriginal(dados.conteudo);
        setConteudoEditado(dados.conteudo);
      } catch (e) {
        setErroEditor(mensagemDeErro(e));
        setConteudoOriginal("");
        setConteudoEditado("");
      } finally {
        setCarregandoArquivo(false);
      }
    },
    [arquivoAberto, sujo]
  );

  const salvar = useCallback(async () => {
    if (arquivoAberto === null || salvando) return;
    setSalvando(true);
    setErroEditor(null);
    try {
      await ide.salvarArquivo(arquivoAberto, conteudoEditado);
      setConteudoOriginal(conteudoEditado);
    } catch (e) {
      setErroEditor(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }, [arquivoAberto, conteudoEditado, salvando]);

  // Um caminho excluido: fecha o editor se era o arquivo aberto (ou se ele
  // estava dentro da pasta apagada).
  const aoExcluir = useCallback(
    (caminho: string) => {
      if (
        arquivoAberto === caminho ||
        (arquivoAberto !== null &&
          arquivoAberto.replace(/\\/g, "/").startsWith(`${caminho}/`))
      ) {
        setArquivoAberto(null);
        setConteudoOriginal("");
        setConteudoEditado("");
      }
    },
    [arquivoAberto]
  );

  // Um caminho renomeado: se o arquivo aberto era o alvo (ou estava dentro da
  // pasta renomeada), atualiza o caminho aberto sem perder o conteudo.
  const aoRenomear = useCallback(
    (de: string, para: string) => {
      if (arquivoAberto === null) return;
      const aberto = arquivoAberto.replace(/\\/g, "/");
      if (aberto === de) {
        setArquivoAberto(para);
      } else if (aberto.startsWith(`${de}/`)) {
        setArquivoAberto(`${para}${aberto.slice(de.length)}`);
      }
    },
    [arquivoAberto]
  );

  return (
    <section className="tela-ide">
      <div className="ide-coluna-arvore">
        <header className="ide-arvore-topo">
          <span className="ide-arvore-base" title={arvore?.base}>
            {arvore?.base ?? "Arquivos"}
          </span>
          <button
            className="ide-botao-recarregar"
            title="Recarregar a árvore"
            onClick={() => void recarregarArvore()}
            disabled={carregandoArvore}
          >
            <IconeRecarregar className={carregandoArvore ? "girando" : ""} />
          </button>
        </header>
        {erroArvore ? (
          <div className="ide-arvore-erro">{erroArvore}</div>
        ) : (
          <ArvoreArquivos
            itens={arvore?.itens ?? []}
            arquivoAberto={arquivoAberto}
            aoAbrir={(c) => void abrirArquivo(c)}
            aoMudou={() => void recarregarArvore()}
            aoExcluir={aoExcluir}
            aoRenomear={aoRenomear}
          />
        )}
      </div>

      <div className="ide-coluna-editor">
        <EditorArquivo
          caminho={arquivoAberto}
          valor={conteudoEditado}
          aoMudar={setConteudoEditado}
          aoSalvar={() => void salvar()}
          sujo={sujo}
          salvando={salvando}
          carregando={carregandoArquivo}
          erro={erroEditor}
        />
      </div>

      <div className={`ide-coluna-chat${chatRecolhido ? " recolhida" : ""}`}>
        <button
          className="ide-chat-toggle"
          title={chatRecolhido ? "Abrir a conversa" : "Recolher a conversa"}
          onClick={() => setChatRecolhido((v) => !v)}
        >
          <IconeChevron
            className=""
            style={{ transform: chatRecolhido ? "rotate(180deg)" : "none" }}
          />
        </button>
        {chatRecolhido ? (
          <span className="ide-chat-rotulo-vert">Conversa</span>
        ) : (
          <ChatIde />
        )}
      </div>
    </section>
  );
}
