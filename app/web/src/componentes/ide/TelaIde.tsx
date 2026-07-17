import { useCallback, useEffect, useState } from "react";
import * as ide from "../../api/ide";
import type { RespostaArvore } from "../../api/ide";
import { mensagemDeErro } from "../../util/erros";
import { IconeChevron, IconeX } from "../comum/Icones";
import { ArvoreArquivos } from "./ArvoreArquivos";
import { EditorArquivo } from "./EditorArquivo";
import { ChatIde } from "./ChatIde";
import { usarJanelaIde } from "./usarJanelaIde";
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

type AbaCompacta = "arquivos" | "editor" | "conversa";

// Painel da VKOS-IDE: arvore de arquivos, editor e chat, tudo escopado na pasta
// do cliente ativo. Em telas compactas uma navegacao local exibe uma coluna por
// vez, sem empurrar o restante do painel para fora da viewport.
export function TelaIde({ aoFechar }: { aoFechar?: () => void }) {
  const janela = usarJanelaIde();
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
  const [abaCompacta, setAbaCompacta] = useState<AbaCompacta>("conversa");

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
      setAbaCompacta("editor");
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
    <section
      ref={janela.painelRef}
      style={janela.estilo}
      className={`tela-ide${janela.media ? " ide-media" : ""}${
        janela.compacta ? " ide-compacta" : ""
      }${janela.estreita ? " ide-estreita" : ""}${
        janela.minimizada ? " minimizada" : ""
      }${janela.arrastando ? " arrastando" : ""}`}
    >
      <header
        className="ide-barra"
        onPointerDown={janela.aoPointerDown}
        onPointerMove={janela.aoPointerMove}
        onPointerUp={janela.aoPointerUp}
        onPointerCancel={janela.aoPointerCancel}
        onDoubleClick={janela.recentralizar}
      >
        <strong>VKOS-IDE</strong>
        <div className="ide-barra-acoes">
          <button
            type="button"
            className="ide-barra-botao ide-minimizar"
            onClick={janela.alternarMinimizacao}
            title={janela.minimizada ? "Restaurar a IDE" : "Minimizar para o chat"}
            aria-label={janela.minimizada ? "Restaurar a IDE" : "Minimizar para o chat"}
          >
            {janela.minimizada ? (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="3" y="3" width="10" height="10" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 11.5h10" />
              </svg>
            )}
          </button>
          {aoFechar && (
            <button
              type="button"
              className="ide-barra-botao"
              onClick={aoFechar}
              title="Fechar a IDE"
              aria-label="Fechar a IDE"
            >
              <IconeX className="" />
            </button>
          )}
        </div>
      </header>
      <div className="ide-corpo">
        <nav className="ide-mobile-topo" aria-label="Áreas da IDE">
          {([
            ["arquivos", "Arquivos"],
            ["editor", "Editor"],
            ["conversa", "Conversa"],
          ] as Array<[AbaCompacta, string]>).map(([id, rotulo]) => (
            <button
              type="button"
              key={id}
              className={abaCompacta === id ? "ativo" : ""}
              aria-pressed={abaCompacta === id}
              onClick={() => {
                setAbaCompacta(id);
                if (id === "conversa") setChatRecolhido(false);
              }}
            >
              {rotulo}
            </button>
          ))}
        </nav>
        <div
          className={`ide-coluna-arvore${
            abaCompacta === "arquivos" ? " compacta-ativa" : ""
          }`}
        >
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

        <div
          className={`ide-coluna-editor${
            abaCompacta === "editor" ? " compacta-ativa" : ""
          }`}
        >
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

        <div
          className={`ide-coluna-chat${chatRecolhido ? " recolhida" : ""}${
            abaCompacta === "conversa" ? " compacta-ativa" : ""
          }`}
        >
          {!janela.minimizada && (
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
          )}
          {chatRecolhido && !janela.minimizada ? (
            <span className="ide-chat-rotulo-vert">Conversa</span>
          ) : (
            <ChatIde />
          )}
        </div>
      </div>
    </section>
  );
}
