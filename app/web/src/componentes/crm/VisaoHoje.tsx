// A tela do dia. Responde uma pergunta so: o que eu faco agora.
//
// Saiu de dentro do TelaCrm, onde era JSX gigante numa linha so. Tres coisas
// mudaram junto com a mudanca de lugar:
// - toda linha tem acao inline (concluir, registrar contato, adiar). Antes cada
//   item era so um botao que abria a ficha, entao a tela informava e nao
//   deixava agir;
// - o contador diz o total de verdade, e o corte de 10 vem com "ver todos";
// - o funil separa aberto, ganho e perdido, em vez de somar os tres.

import { useEffect, useRef, useState } from "react";

import type { Coluna, EstadoCrm } from "../../api/crm";
import {
  PRESETS_SNOOZE,
  dataDoSnooze,
  montarBlocosDoDia,
  resumirFunil,
  type BlocoDia,
  type ItemDia,
} from "./logica";
import { formatarDataHoraCurta, formatarReais } from "./formatos";
import { IconeMais } from "../comum/Icones";

export interface AcoesDoDia {
  aoAbrirContato: (id: string) => void;
  aoAbrirQuadro: () => void;
  aoCriarContato: () => void;
  aoConcluirTarefa: (tarefaId: string) => Promise<void>;
  // Registrar contato resolve o follow-up do item. E o conserto do "Atrasado
  // pra sempre": antes nada limpava a data.
  aoRegistrarContato: (item: ItemDia) => Promise<void>;
  aoAdiar: (item: ItemDia, quando: string) => Promise<void>;
}

export function VisaoHoje({
  estado,
  colunas,
  ultimaInteracaoPorContato,
  acoes,
}: {
  estado: EstadoCrm;
  colunas: Coluna[];
  ultimaInteracaoPorContato: Map<string, string>;
  acoes: AcoesDoDia;
}) {
  const agora = new Date();
  const blocos = montarBlocosDoDia({
    agora,
    colunas,
    contatos: estado.contatos,
    negocios: estado.negocios,
    orcamentos: estado.orcamentos,
    tarefas: estado.tarefas,
    organizacoes: estado.organizacoes,
    ultimaInteracaoPorContato,
  });
  const funil = resumirFunil(estado.negocios, agora);
  const contatosDaColuna = (colunaId: string) =>
    estado.contatos.filter((contato) => contato.colunaId === colunaId);
  const maximo = Math.max(1, ...colunas.map((coluna) => contatosDaColuna(coluna.id).length));

  if (estado.contatos.length === 0) {
    return (
      <div className="crm-hero crm-hero-hoje">
        <p className="crm-hero-titulo">Seu CRM está pronto para o primeiro contato.</p>
        <p className="crm-hero-texto">
          Crie uma ficha. Depois você liga negócios, interações, tarefas e próximos passos a ela.
        </p>
        <button className="botao botao-principal" onClick={acoes.aoCriarContato} type="button">
          <IconeMais className="" /> Criar primeiro contato
        </button>
      </div>
    );
  }

  const comItens = blocos.filter((bloco) => bloco.total > 0);

  return (
    <div className="crm-hoje">
      {comItens.length === 0 && (
        <section className="crm-hoje-bloco crm-hoje-limpo">
          <p className="crm-hoje-limpo-titulo">Nada pendente para hoje.</p>
          <p className="crm-vazio-inline">
            Quando um follow-up, uma tarefa ou um orçamento vencer, ele aparece aqui.
          </p>
        </section>
      )}

      {comItens.map((bloco) => (
        <BlocoDoDia key={bloco.chave} bloco={bloco} acoes={acoes} />
      ))}

      <section className="crm-hoje-bloco crm-hoje-funil">
        <div className="crm-hoje-topo">
          <div>
            <strong>{formatarReais(funil.emAberto)}</strong>
            <h2>Em aberto</h2>
          </div>
          <span>
            {funil.negociosAbertos} {funil.negociosAbertos === 1 ? "negócio" : "negócios"} no funil
          </span>
        </div>
        <div className="crm-funil-placar">
          <span className="crm-placar-ganho">
            <b>{formatarReais(funil.ganhoNoMes)}</b>
            <small>ganho no mês ({funil.negociosGanhosNoMes})</small>
          </span>
          <span className="crm-placar-perdido">
            <b>{formatarReais(funil.perdidoNoMes)}</b>
            <small>perdido no mês ({funil.negociosPerdidosNoMes})</small>
          </span>
        </div>
        <button className="crm-funil-lista" onClick={acoes.aoAbrirQuadro} type="button">
          {colunas.map((coluna) => {
            const total = contatosDaColuna(coluna.id).length;
            return (
              <span className="crm-funil-linha" key={coluna.id}>
                <span>
                  <b>{coluna.nome}</b>
                  <small>{total} {total === 1 ? "contato" : "contatos"}</small>
                </span>
                <i style={{ width: `${Math.max(4, (total / maximo) * 100)}%` }} />
              </span>
            );
          })}
        </button>
      </section>
    </div>
  );
}

function BlocoDoDia({ bloco, acoes }: { bloco: BlocoDia; acoes: AcoesDoDia }) {
  const [expandido, setExpandido] = useState(false);
  const itens = expandido ? bloco.todos : bloco.itens;
  const escondidos = bloco.total - bloco.itens.length;

  return (
    <section className={`crm-hoje-bloco crm-bloco-${bloco.chave}`}>
      <div className="crm-hoje-topo">
        <div>
          <strong>{bloco.total}</strong>
          <h2>{bloco.titulo}</h2>
        </div>
        <span>{bloco.descricao}</span>
      </div>
      <ul className="crm-hoje-lista">
        {itens.map((item) => (
          <ItemDoDia key={item.id} item={item} acoes={acoes} />
        ))}
      </ul>
      {escondidos > 0 && (
        <button
          className="crm-ver-todos"
          onClick={() => setExpandido((atual) => !atual)}
          type="button"
          aria-expanded={expandido}
        >
          {expandido ? "Ver só os primeiros" : `Ver todos os ${bloco.total}`}
        </button>
      )}
    </section>
  );
}

function ItemDoDia({ item, acoes }: { item: ItemDia; acoes: AcoesDoDia }) {
  const [ocupado, setOcupado] = useState(false);

  async function correr(acao: () => Promise<void>) {
    if (ocupado) return;
    setOcupado(true);
    try {
      await acao();
    } catch {
      // A faixa de erro da tela explica o problema.
    } finally {
      setOcupado(false);
    }
  }

  return (
    <li className={`crm-item-dia${item.atrasado ? " atrasado" : ""}`}>
      {item.tarefaId ? (
        <label className="crm-item-dia-check">
          <input
            type="checkbox"
            checked={false}
            disabled={ocupado}
            onChange={() => void correr(() => acoes.aoConcluirTarefa(item.tarefaId as string))}
          />
          <span className="crm-so-leitor">Concluir {item.titulo}</span>
        </label>
      ) : (
        <span className="crm-item-dia-marca" aria-hidden="true" />
      )}

      <span className="crm-item-dia-texto">
        <b>{item.titulo}</b>
        <small>{item.subtitulo}</small>
      </span>

      {item.quando && <time dateTime={item.quando}>{formatarDataHoraCurta(item.quando)}</time>}

      <span className="crm-item-dia-acoes">
        {!item.tarefaId && (
          <button
            className="crm-acao-inline"
            onClick={() => void correr(() => acoes.aoRegistrarContato(item))}
            disabled={ocupado}
            type="button"
            title="Registra uma interação e resolve o follow-up"
          >
            Registrei contato
          </button>
        )}
        <BotaoAdiar
          item={item}
          ocupado={ocupado}
          aoAdiar={(quando) => void correr(() => acoes.aoAdiar(item, quando))}
        />
        <button
          className="crm-acao-inline crm-acao-secundaria"
          onClick={() => acoes.aoAbrirContato(item.contatoId)}
          disabled={!item.contatoId}
          type="button"
        >
          Abrir ficha
        </button>
      </span>
    </li>
  );
}

// Adiar com preset de um clique. Snooze grava data nova, nunca esconde o item:
// ele volta sozinho no dia escolhido.
function BotaoAdiar({
  item,
  ocupado,
  aoAdiar,
}: {
  item: ItemDia;
  ocupado: boolean;
  aoAdiar: (quando: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    const aoClicarFora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto]);

  return (
    <span className="crm-adiar" ref={caixa}>
      <button
        className="crm-acao-inline"
        onClick={() => setAberto((atual) => !atual)}
        disabled={ocupado}
        aria-expanded={aberto}
        aria-haspopup="menu"
        type="button"
      >
        Adiar
      </button>
      {aberto && (
        <span className="crm-adiar-menu" role="menu" aria-label={`Adiar ${item.titulo}`}>
          {PRESETS_SNOOZE.map((preset) => (
            <button
              key={preset.chave}
              className="crm-adiar-opcao"
              onClick={() => {
                setAberto(false);
                aoAdiar(dataDoSnooze(new Date(), preset));
              }}
              role="menuitem"
              type="button"
            >
              {preset.rotulo}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
