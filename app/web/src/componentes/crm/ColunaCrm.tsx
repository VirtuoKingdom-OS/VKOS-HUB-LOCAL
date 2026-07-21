import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Coluna, Contato } from "../../api/crm";
import { CartaoContato } from "./CartaoContato";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { formatarReais } from "./formatos";
import { IconeChevron, IconeLixeira } from "../comum/Icones";

export function ColunaCrm({
  coluna,
  contatos,
  valorDe,
  total,
  selecionadoId,
  arrastandoId,
  alvoIndice,
  podeExcluir,
  indice,
  totalColunas,
  aoMoverColuna,
  aoDescerCartao,
  aoRenomear,
  aoExcluir,
}: {
  coluna: Coluna;
  contatos: Contato[];
  valorDe: (contatoId: string) => number;
  total: number;
  selecionadoId: string | null;
  arrastandoId: string | null;
  alvoIndice: number | null;
  podeExcluir: boolean;
  indice: number;
  totalColunas: number;
  aoMoverColuna: (id: string, direcao: -1 | 1) => void;
  aoDescerCartao: (contato: Contato, e: ReactPointerEvent) => void;
  aoRenomear: (id: string, nome: string) => void | Promise<void>;
  aoExcluir: (id: string) => void | Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(coluna.nome);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) {
      campo.current?.focus();
      campo.current?.select();
    }
  }, [editando]);

  async function confirmar() {
    const limpo = rascunho.trim();
    setEditando(false);
    if (limpo && limpo !== coluna.nome) await aoRenomear(coluna.id, limpo);
  }

  const itens: React.ReactNode[] = [];
  contatos.forEach((contato, i) => {
    if (alvoIndice === i) itens.push(<div className="crm-placeholder" key="placeholder" />);
    itens.push(
      <CartaoContato
        key={contato.id}
        contato={contato}
        valorTotal={valorDe(contato.id)}
        arrastando={arrastandoId === contato.id}
        selecionado={selecionadoId === contato.id}
        aoDescer={aoDescerCartao}
      />,
    );
  });
  if (alvoIndice === contatos.length) itens.push(<div className="crm-placeholder" key="placeholder" />);

  return (
    <section className="crm-coluna" data-coluna={coluna.id}>
      <header className="crm-coluna-topo">
        <div className="crm-coluna-titulo">
          {editando ? (
            <input
              ref={campo}
              className="crm-coluna-input"
              value={rascunho}
              maxLength={60}
              onChange={(e) => setRascunho(e.target.value)}
              onBlur={() => void confirmar()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmar();
                if (e.key === "Escape") setEditando(false);
              }}
            />
          ) : (
            <button
              className="crm-coluna-nome"
              onClick={() => {
                setRascunho(coluna.nome);
                setEditando(true);
              }}
              title="Clique pra renomear"
              type="button"
            >
              {coluna.nome}
            </button>
          )}
          <span className="crm-coluna-contagem">{contatos.length}</span>
        </div>
        <div className="crm-coluna-rodape">
          <span className="crm-coluna-total">{formatarReais(total)}</span>
          <span className="crm-coluna-mover">
            <button className="crm-acao-icone" disabled={indice === 0} onClick={() => aoMoverColuna(coluna.id, -1)} title="Mover coluna pra esquerda" aria-label={`Mover ${coluna.nome} pra esquerda`} type="button">
              <IconeChevron className="" />
            </button>
            <button className="crm-acao-icone" disabled={indice === totalColunas - 1} onClick={() => aoMoverColuna(coluna.id, 1)} title="Mover coluna pra direita" aria-label={`Mover ${coluna.nome} pra direita`} type="button">
              <IconeChevron className="crm-chevron-direita" />
            </button>
          </span>
          {podeExcluir && (
            <BotaoConfirmar
              className="crm-excluir-coluna"
              titulo="Excluir esta coluna"
              aviso="Excluir coluna?"
              aoConfirmar={() => aoExcluir(coluna.id)}
            >
              <IconeLixeira className="" />
            </BotaoConfirmar>
          )}
        </div>
      </header>
      <div className="crm-coluna-corpo" data-coluna-drop={coluna.id}>
        {itens}
        {contatos.length === 0 && alvoIndice === null && (
          <p className="crm-coluna-vazia">Nenhum contato neste estágio.</p>
        )}
      </div>
    </section>
  );
}
