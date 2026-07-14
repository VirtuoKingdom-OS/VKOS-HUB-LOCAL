import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Coluna, Contato } from "../../api/crm";
import { CartaoContato } from "./CartaoContato";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { formatarReais } from "./formatos";
import { IconeLixeira } from "../comum/Icones";

// Uma coluna do kanban. Cabecalho com nome editavel inline, contagem, total de
// valor estimado e exclusao em dois cliques. Corpo com os cartoes e o
// placeholder da posicao de soltar durante o arrasto.
export function ColunaCrm({
  coluna,
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
  contatos: Contato[];
  total: number;
  selecionadoId: string | null;
  arrastandoId: string | null;
  alvoIndice: number | null;
  podeExcluir: boolean;
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

  function comecarEdicao() {
    setRascunho(coluna.nome);
    setEditando(true);
  }

  async function confirmar() {
    const limpo = rascunho.trim();
    setEditando(false);
    if (limpo && limpo !== coluna.nome) {
      await aoRenomear(coluna.id, limpo);
    }
  }

  // Monta a lista de cartoes intercalando o placeholder na posicao de soltar.
  const itens: React.ReactNode[] = [];
  contatos.forEach((contato, i) => {
    if (alvoIndice === i) {
      itens.push(<div className="crm-placeholder" key="placeholder" />);
    }
    itens.push(
      <CartaoContato
        key={contato.id}
        contato={contato}
        arrastando={arrastandoId === contato.id}
        selecionado={selecionadoId === contato.id}
        aoDescer={aoDescerCartao}
      />
    );
  });
  if (alvoIndice === contatos.length) {
    itens.push(<div className="crm-placeholder" key="placeholder" />);
  }

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
              onClick={comecarEdicao}
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
          <p className="crm-coluna-vazia">Sem contatos aqui ainda.</p>
        )}
      </div>
    </section>
  );
}
