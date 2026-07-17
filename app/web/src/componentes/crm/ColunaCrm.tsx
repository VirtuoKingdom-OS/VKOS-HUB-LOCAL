import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Coluna, Contato, Negocio } from "../../api/crm";
import { CartaoContato } from "./CartaoContato";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { formatarReais } from "./formatos";
import { IconeLixeira } from "../comum/Icones";

export function ColunaCrm({
  coluna,
  negocios,
  contatos,
  total,
  selecionadoId,
  arrastandoId,
  alvoIndice,
  podeExcluir,
  aoDescerCartao,
  aoRenomear,
  aoExcluir,
}: {
  coluna: Coluna;
  negocios: Negocio[];
  contatos: Map<string, Contato>;
  total: number;
  selecionadoId: string | null;
  arrastandoId: string | null;
  alvoIndice: number | null;
  podeExcluir: boolean;
  aoDescerCartao: (negocio: Negocio, e: ReactPointerEvent) => void;
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
  negocios.forEach((negocio, indice) => {
    if (alvoIndice === indice) itens.push(<div className="crm-placeholder" key="placeholder" />);
    itens.push(
      <CartaoContato
        key={negocio.id}
        negocio={negocio}
        contato={contatos.get(negocio.contatoId)}
        arrastando={arrastandoId === negocio.id}
        selecionado={selecionadoId === negocio.id}
        aoDescer={aoDescerCartao}
      />,
    );
  });
  if (alvoIndice === negocios.length) itens.push(<div className="crm-placeholder" key="placeholder" />);

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
          <span className="crm-coluna-contagem">{negocios.length}</span>
        </div>
        <div className="crm-coluna-rodape">
          <span className="crm-coluna-total">{formatarReais(total)}</span>
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
        {negocios.length === 0 && alvoIndice === null && (
          <p className="crm-coluna-vazia">Sem negocios aqui ainda.</p>
        )}
      </div>
    </section>
  );
}
