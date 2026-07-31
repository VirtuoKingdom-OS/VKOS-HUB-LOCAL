import { useEffect, useState, type ReactElement } from "react";
import * as ide from "../../api/ide";
import type { NoIde } from "../../api/ide";
import { mensagemDeErro } from "../../util/erros";
import { MenuContexto, type ItemMenu } from "../comum/MenuContexto";
import {
  IconeAlerta,
  IconeArquivo,
  IconeLixeira,
  IconeMais,
  IconePasta,
} from "../comum/Icones";

interface Props {
  itens: NoIde[];
  arquivoAberto: string | null;
  aoAbrir: (caminho: string) => void;
  // Chamado depois de criar ou renomear: o pai recarrega a arvore.
  aoMudou: () => void;
  // Chamado depois de excluir um caminho: o pai fecha o editor se for o aberto.
  aoExcluir: (caminho: string) => void;
  // Chamado depois de renomear: o pai atualiza o caminho aberto se for o alvo.
  aoRenomear: (de: string, para: string) => void;
}

// Caret que gira: aponta pra direita fechado, pra baixo aberto.
function Caret({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ide-caret"
      style={{ transform: aberto ? "rotate(90deg)" : "none" }}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

// Caminho do pai (sem o ultimo segmento). "" quando ja e raiz.
function pai(caminho: string): string {
  const norm = caminho.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i === -1 ? "" : norm.slice(0, i);
}

// Junta pasta e nome com barra normal (o backend normaliza e sanitiza).
function juntar(pasta: string, nome: string): string {
  return pasta ? `${pasta}/${nome}` : nome;
}

// Arvore de arquivos da IDE. Expansao por pasta, clique abre arquivo, botao
// direito abre menu proprio (novo arquivo, nova pasta, renomear, excluir). A
// exclusao confirma em dois cliques com balao clicavel e desarme por tempo de
// 4s, nunca por saida do mouse (padrao do BotaoExcluirPeca).
export function ArvoreArquivos({
  itens,
  arquivoAberto,
  aoAbrir,
  aoMudou,
  aoExcluir,
  aoRenomear,
}: Props) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ x: number; y: number; no: NoIde | null } | null>(
    null
  );
  // Criacao inline: qual pasta recebe, e se e arquivo ou pasta.
  const [criando, setCriando] = useState<{
    pasta: string;
    tipo: "arquivo" | "pasta";
  } | null>(null);
  const [nomeNovo, setNomeNovo] = useState("");
  // Renomeacao inline: o caminho em edicao e o texto atual.
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nomeRen, setNomeRen] = useState("");
  // Exclusao armada: o caminho aguardando o segundo clique.
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Desarma a exclusao sozinha depois de 4s. Nunca por saida do mouse.
  useEffect(() => {
    if (!confirmando) return;
    const t = window.setTimeout(() => setConfirmando(null), 4000);
    return () => window.clearTimeout(t);
  }, [confirmando]);

  // Some com o erro depois de um tempo, pra nao ficar preso na tela.
  useEffect(() => {
    if (!erro) return;
    const t = window.setTimeout(() => setErro(null), 5000);
    return () => window.clearTimeout(t);
  }, [erro]);

  const alternar = (caminho: string) => {
    setExpandidos((antes) => {
      const copia = new Set(antes);
      if (copia.has(caminho)) copia.delete(caminho);
      else copia.add(caminho);
      return copia;
    });
  };

  const iniciarCriar = (pasta: string, tipo: "arquivo" | "pasta") => {
    if (pasta) {
      setExpandidos((antes) => new Set(antes).add(pasta));
    }
    setCriando({ pasta, tipo });
    setNomeNovo("");
  };

  const confirmarCriar = async () => {
    if (!criando) return;
    const nome = nomeNovo.trim();
    if (!nome) {
      setCriando(null);
      return;
    }
    const caminho = juntar(criando.pasta, nome);
    const tipo = criando.tipo;
    setCriando(null);
    try {
      if (tipo === "pasta") {
        await ide.criarPasta(caminho);
        aoMudou();
      } else {
        await ide.salvarArquivo(caminho, "");
        aoMudou();
        aoAbrir(caminho);
      }
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  const iniciarRenomear = (no: NoIde) => {
    setRenomeando(no.caminho);
    setNomeRen(no.nome);
  };

  const confirmarRenomear = async (no: NoIde) => {
    const nome = nomeRen.trim();
    setRenomeando(null);
    if (!nome || nome === no.nome) return;
    const destino = juntar(pai(no.caminho), nome);
    try {
      await ide.renomear(no.caminho, destino);
      aoRenomear(no.caminho, destino);
      aoMudou();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  const confirmarExcluir = async (caminho: string) => {
    try {
      await ide.excluir(caminho);
      setConfirmando(null);
      aoExcluir(caminho);
      aoMudou();
    } catch (e) {
      setConfirmando(null);
      setErro(mensagemDeErro(e));
    }
  };

  // Monta os itens do menu conforme o alvo. no = null abre no raiz.
  const itensMenu = (no: NoIde | null): ItemMenu[] => {
    const pastaAlvo = no ? (no.tipo === "pasta" ? no.caminho : pai(no.caminho)) : "";
    const acoes: ItemMenu[] = [
      {
        id: "novo-arquivo",
        rotulo: "Novo arquivo",
        icone: <IconeMais className="" />,
        aoClicar: () => iniciarCriar(pastaAlvo, "arquivo"),
      },
      {
        id: "nova-pasta",
        rotulo: "Nova pasta",
        icone: <IconePasta className="" />,
        aoClicar: () => iniciarCriar(pastaAlvo, "pasta"),
      },
    ];
    if (no) {
      acoes.push(
        { id: "sep", separador: true },
        {
          id: "renomear",
          rotulo: "Renomear",
          icone: <IconeArquivo className="" />,
          aoClicar: () => iniciarRenomear(no),
        },
        {
          id: "excluir",
          rotulo: "Excluir",
          icone: <IconeLixeira className="" />,
          destrutivo: true,
          aoClicar: () => setConfirmando(no.caminho),
        }
      );
    }
    return acoes;
  };

  // Campo de criacao inline, dentro da pasta pai.
  const linhaCriar = (pasta: string, profundidade: number) => {
    if (!criando || criando.pasta !== pasta) return null;
    return (
      <div
        className="ide-no ide-no-editando"
        style={{ paddingLeft: 8 + profundidade * 14 }}
      >
        <span className="ide-no-icone">
          {criando.tipo === "pasta" ? (
            <IconePasta className="" />
          ) : (
            <IconeArquivo className="" />
          )}
        </span>
        <input
          className="campo campo-p ide-no-input"
          autoFocus
          value={nomeNovo}
          placeholder={criando.tipo === "pasta" ? "nome da pasta" : "nome do arquivo"}
          onChange={(e) => setNomeNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void confirmarCriar();
            if (e.key === "Escape") setCriando(null);
          }}
          onBlur={() => void confirmarCriar()}
        />
      </div>
    );
  };

  const renderNo = (no: NoIde, profundidade: number): ReactElement => {
    const ehPasta = no.tipo === "pasta";
    const aberto = expandidos.has(no.caminho);
    const selecionado = arquivoAberto === no.caminho;
    const editando = renomeando === no.caminho;
    const armado = confirmando === no.caminho;

    return (
      <div key={no.caminho} className="ide-no-linha">
        <div
          className={`ide-no${selecionado ? " ativo" : ""}${armado ? " armado" : ""}`}
          role="button"
          tabIndex={editando ? -1 : 0}
          aria-expanded={ehPasta ? aberto : undefined}
          aria-current={selecionado ? "true" : undefined}
          style={{ paddingLeft: 8 + profundidade * 14 }}
          onClick={() => {
            if (editando) return;
            if (ehPasta) alternar(no.caminho);
            else aoAbrir(no.caminho);
          }}
          onKeyDown={(e) => {
            if (editando) return;
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            if (ehPasta) alternar(no.caminho);
            else aoAbrir(no.caminho);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenu({ x: e.clientX, y: e.clientY, no });
          }}
        >
          <span className="ide-no-cabo">
            {ehPasta ? <Caret aberto={aberto} /> : <span className="ide-caret-vazio" />}
          </span>
          <span className="ide-no-icone">
            {ehPasta ? <IconePasta className="" /> : <IconeArquivo className="" />}
          </span>
          {editando ? (
            <input
              className="campo campo-p ide-no-input"
              autoFocus
              value={nomeRen}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setNomeRen(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmarRenomear(no);
                if (e.key === "Escape") setRenomeando(null);
              }}
              onBlur={() => void confirmarRenomear(no)}
            />
          ) : (
            <span className="ide-no-nome">{no.nome}</span>
          )}

          {armado && (
            <button
              className="ide-balao-excluir"
              title="Clique de novo pra apagar de vez"
              onClick={(e) => {
                e.stopPropagation();
                void confirmarExcluir(no.caminho);
              }}
            >
              Confirmar exclusão?
            </button>
          )}
        </div>

        {ehPasta && aberto && (
          <div className="ide-filhos">
            {(no.filhos ?? []).map((filho) => renderNo(filho, profundidade + 1))}
            {linhaCriar(no.caminho, profundidade + 1)}
            {(no.filhos ?? []).length === 0 &&
              criando?.pasta !== no.caminho && (
                <div
                  className="ide-no-vazio"
                  style={{ paddingLeft: 8 + (profundidade + 1) * 14 }}
                >
                  vazia
                </div>
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="ide-arvore-corpo"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, no: null });
      }}
    >
      {erro && (
        <div className="faixa faixa-alerta ide-arvore-erro" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">{erro}</div>
        </div>
      )}
      {itens.map((no) => renderNo(no, 0))}
      {linhaCriar("", 0)}
      {itens.length === 0 && !criando && (
        <div className="ide-no-vazio" style={{ paddingLeft: 12 }}>
          Sem arquivos nesta pasta.
        </div>
      )}

      {menu && (
        <MenuContexto
          x={menu.x}
          y={menu.y}
          itens={itensMenu(menu.no)}
          aoFechar={() => setMenu(null)}
        />
      )}
    </div>
  );
}
