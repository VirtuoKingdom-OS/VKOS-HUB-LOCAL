// A tela do dia. Responde uma pergunta so: o que eu faco agora.
//
// Saiu de dentro do TelaCrm, onde era JSX gigante numa linha so. Tres coisas
// mudaram junto com a mudanca de lugar:
// - toda linha tem acao inline (concluir, registrar contato, adiar). Antes cada
//   item era so um botao que abria a ficha, entao a tela informava e nao
//   deixava agir;
// - o contador diz o total de verdade, e o corte de 10 vem com "ver todos";
// - o funil separa aberto, ganho e perdido, em vez de somar os tres.
//
// Redesign v2 (2026-07-30): cada bloco virou .secao, e nao cartao. As linhas
// viraram .lista mais .item-lista, com as acoes VISIVEIS. O funil perdeu o
// menta: a barra de cada estagio usa --linha-forte, porque ela e dado, nao
// estado vivo.

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

  // O estado vazio ENSINA: o que e um contato aqui e qual e o proximo passo. A
  // acao dele e neutra de proposito, porque a mesma acao ja e a principal do
  // cabecalho, a 60px daqui, e duas tintas escuras na mesma tela competem.
  if (estado.contatos.length === 0) {
    return (
      <div className="tela-corpo">
        <div className="vazio">
          <h2>Seu CRM está pronto para o primeiro contato.</h2>
          <p>
            Crie uma ficha. Depois você liga negócios, interações, tarefas e próximos passos a ela.
          </p>
          <button className="botao botao-neutro" onClick={acoes.aoCriarContato} type="button">
            <IconeMais className="" /> Criar primeiro contato
          </button>
        </div>
      </div>
    );
  }

  const comItens = blocos.filter((bloco) => bloco.total > 0);

  return (
    <div className="tela-corpo crm-hoje">
      {comItens.length === 0 && (
        <section className="secao">
          <div className="secao-topo">
            <h2>Nada pendente para hoje.</h2>
          </div>
          <p className="crm-vazio-inline">
            Quando um follow-up, uma tarefa ou um orçamento vencer, ele aparece aqui.
          </p>
        </section>
      )}

      {comItens.map((bloco) => (
        <BlocoDoDia key={bloco.chave} bloco={bloco} acoes={acoes} />
      ))}

      <section className="secao crm-funil">
        <div className="secao-topo">
          <h2>Funil</h2>
          <p>
            {funil.negociosAbertos} {funil.negociosAbertos === 1 ? "negócio" : "negócios"} no funil
          </p>
        </div>

        <div className="crm-placar">
          <div className="crm-placar-item">
            <span className="crm-numero">{formatarReais(funil.emAberto)}</span>
            <span className="crm-numero-rotulo">em aberto</span>
          </div>
          <div className="crm-placar-item">
            <span className="crm-numero">{formatarReais(funil.ganhoNoMes)}</span>
            <span className="crm-numero-rotulo">
              ganho no mês ({funil.negociosGanhosNoMes})
            </span>
          </div>
          <div className="crm-placar-item">
            <span className="crm-numero">{formatarReais(funil.perdidoNoMes)}</span>
            <span className="crm-numero-rotulo">
              perdido no mês ({funil.negociosPerdidosNoMes})
            </span>
          </div>
        </div>

        <ul className="lista crm-funil-lista">
          {colunas.map((coluna) => {
            const total = contatosDaColuna(coluna.id).length;
            return (
              <li key={coluna.id}>
                <button className="item-lista crm-funil-linha" onClick={acoes.aoAbrirQuadro} type="button">
                  <span className="item-lista-texto">
                    <span className="item-lista-titulo">{coluna.nome}</span>
                    <span className="item-lista-meta">
                      {total} {total === 1 ? "contato" : "contatos"}
                    </span>
                  </span>
                  <span className="crm-barra" aria-hidden="true">
                    <span style={{ width: `${Math.max(4, (total / maximo) * 100)}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function BlocoDoDia({ bloco, acoes }: { bloco: BlocoDia; acoes: AcoesDoDia }) {
  const [expandido, setExpandido] = useState(false);
  const itens = expandido ? bloco.todos : bloco.itens;
  const escondidos = bloco.total - bloco.itens.length;

  return (
    <section className="secao">
      <div className="secao-topo">
        <h2>{bloco.titulo}</h2>
        <span className="contagem">{bloco.total}</span>
        <p>{bloco.descricao}</p>
      </div>
      <ul className="lista crm-lista-dia">
        {itens.map((item) => (
          <ItemDoDia key={item.id} item={item} acoes={acoes} />
        ))}
      </ul>
      {escondidos > 0 && (
        <button
          className="botao botao-p botao-fantasma crm-ver-todos"
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
    <li className="item-lista crm-item-dia">
      {item.tarefaId ? (
        <label className="crm-item-check">
          <input
            className="caixa"
            type="checkbox"
            checked={false}
            disabled={ocupado}
            onChange={() => void correr(() => acoes.aoConcluirTarefa(item.tarefaId as string))}
          />
          <span className="so-leitor">Concluir {item.titulo}</span>
        </label>
      ) : (
        <span className="crm-item-marca" aria-hidden="true" />
      )}

      <span className="item-lista-texto">
        <span className="item-lista-titulo">{item.titulo}</span>
        <span className="item-lista-meta">{item.subtitulo}</span>
      </span>

      {item.quando && (
        <time
          className={`crm-item-quando${item.atrasado ? " atrasado" : ""}`}
          dateTime={item.quando}
          title={item.atrasado ? "Atrasado" : undefined}
        >
          {formatarDataHoraCurta(item.quando)}
        </time>
      )}

      <span className="item-lista-acoes">
        {!item.tarefaId && (
          <button
            className="botao botao-p botao-neutro"
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
          className="botao botao-p botao-fantasma"
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
        className="botao botao-p botao-neutro"
        onClick={() => setAberto((atual) => !atual)}
        disabled={ocupado}
        aria-expanded={aberto}
        aria-haspopup="menu"
        type="button"
      >
        Adiar
      </button>
      {aberto && (
        <span className="popover crm-adiar-menu" role="menu" aria-label={`Adiar ${item.titulo}`}>
          {PRESETS_SNOOZE.map((preset) => (
            <button
              key={preset.chave}
              className="menu-item"
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
