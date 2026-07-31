// Edicao de negocio, orcamento e tags, em um lugar so.
//
// Saiu de dentro do PainelContato.tsx quando o painel de contexto do chat
// precisou das mesmas tres coisas. Uma segunda versao divergiria da primeira na
// primeira mudanca de campo, e o dono editaria um negocio diferente dependendo
// de qual painel abriu.
//
// Quem chama passa as acoes ja ligadas ao estado do CRM. Estes componentes nao
// fazem fetch: eles so sabem desenhar e avisar.

import { useState } from "react";
import type {
  Contato,
  DadosContato,
  DadosNegocio,
  DadosOrcamento,
  Negocio,
  Orcamento,
  StatusNegocio,
  StatusOrcamento,
} from "../../api/crm";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { formatarDataHora, formatarReais, isoParaDatetimeLocal } from "./formatos";
import { IconeCheck, IconeLixeira, IconeMais, IconeX } from "../comum/Icones";

export const STATUS_NEGOCIO: { valor: StatusNegocio; rotulo: string }[] = [
  { valor: "aberto", rotulo: "Em aberto" },
  { valor: "ganho", rotulo: "Ganho" },
  { valor: "perdido", rotulo: "Perdido" },
];

export const STATUS_ORCAMENTO: { valor: StatusOrcamento; rotulo: string }[] = [
  { valor: "rascunho", rotulo: "Rascunho" },
  { valor: "enviado", rotulo: "Enviado" },
  { valor: "aceito", rotulo: "Aceito" },
  { valor: "recusado", rotulo: "Recusado" },
  { valor: "expirado", rotulo: "Expirado" },
];

// Numero de campo de dinheiro. Devolve null pra vazio e pra qualquer coisa que
// nao seja numero valido, pra quem chama poder distinguir "apagou" de "digitou
// errado".
export function numeroOuNulo(texto: string): number | null {
  const limpo = texto.replace(",", ".").trim();
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export interface AcoesNegocio {
  aoAtualizar: (id: string, dados: DadosNegocio) => Promise<Negocio>;
  aoExcluir: (id: string) => Promise<void>;
  aoCriarOrcamento: (negocioId: string, valor: number, validoAte?: string) => Promise<Orcamento>;
  aoAtualizarOrcamento: (id: string, dados: DadosOrcamento) => Promise<Orcamento>;
  aoExcluirOrcamento: (id: string) => Promise<void>;
}

export function LinhaNegocio({
  negocio,
  orcamentos,
  destaque,
  acoes,
}: {
  negocio: Negocio;
  orcamentos: Orcamento[];
  destaque: boolean;
  acoes: AcoesNegocio;
}) {
  const { aoAtualizar, aoExcluir } = acoes;
  const [titulo, setTitulo] = useState(negocio.titulo);
  const [valor, setValor] = useState(negocio.valorEstimado === undefined ? "" : String(negocio.valorEstimado));
  const [proximaAcao, setProximaAcao] = useState(isoParaDatetimeLocal(negocio.proximaAcaoEm));
  const [proximaAcaoTexto, setProximaAcaoTexto] = useState(negocio.proximaAcaoTexto ?? "");

  function salvarTitulo() {
    const limpo = titulo.trim();
    if (!limpo) return setTitulo(negocio.titulo);
    if (limpo !== negocio.titulo) void aoAtualizar(negocio.id, { titulo: limpo }).catch(() => undefined);
  }

  function salvarValor() {
    const numero = numeroOuNulo(valor);
    if (valor.trim() && numero === null) {
      return setValor(negocio.valorEstimado === undefined ? "" : String(negocio.valorEstimado));
    }
    if (numero !== (negocio.valorEstimado ?? null)) {
      void aoAtualizar(negocio.id, { valorEstimado: numero }).catch(() => undefined);
    }
  }

  function salvarProximaAcao() {
    if (proximaAcao === isoParaDatetimeLocal(negocio.proximaAcaoEm)) return;
    void aoAtualizar(negocio.id, { proximaAcaoEm: proximaAcao || null }).catch(() => undefined);
  }

  function salvarProximaAcaoTexto() {
    const limpo = proximaAcaoTexto.trim();
    if (limpo === (negocio.proximaAcaoTexto ?? "")) return;
    void aoAtualizar(negocio.id, { proximaAcaoTexto: limpo || null }).catch(() => undefined);
  }

  // Marcar ganho fecha o negocio de verdade: status, data e valor fechado.
  // Deixar so o status faria o funil somar ganho sem saber por quanto.
  function marcarGanho() {
    const fechado = numeroOuNulo(valor) ?? negocio.valorEstimado ?? null;
    void aoAtualizar(negocio.id, {
      status: "ganho",
      fechadoEm: new Date().toISOString(),
      ...(fechado === null ? {} : { valorFechado: fechado }),
    }).catch(() => undefined);
  }

  return (
    <article className={`cartao crm-negocio${destaque ? " destaque" : ""} status-${negocio.status}`}>
      <div className="crm-negocio-linha">
        <input className="campo campo-p crm-negocio-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={salvarTitulo} aria-label="Título do negócio" maxLength={200} />
        <input className="campo campo-p crm-negocio-valor" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={salvarValor} inputMode="decimal" aria-label="Valor estimado do negócio" placeholder={formatarReais(0)} />
        <select
          className="campo campo-p crm-negocio-status"
          value={negocio.status}
          onChange={(e) => void aoAtualizar(negocio.id, { status: e.target.value as StatusNegocio }).catch(() => undefined)}
          aria-label="Status do negócio"
        >
          {STATUS_NEGOCIO.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
        </select>
        {negocio.status === "aberto" && (
          <button className="botao botao-p botao-neutro" onClick={marcarGanho} type="button" title="Fechar como ganho">
            <IconeCheck className="" /> Ganho
          </button>
        )}
        <BotaoConfirmar className="botao botao-p botao-icone botao-fantasma crm-excluir-negocio" titulo="Excluir negócio" aviso="Excluir negócio?" aoConfirmar={() => aoExcluir(negocio.id)}>
          <IconeLixeira className="" />
        </BotaoConfirmar>
      </div>
      <div className="crm-negocio-acao">
        <label className="grupo-campo">
          <span className="rotulo">Próxima ação</span>
          <input className="campo campo-p" type="datetime-local" value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} onBlur={salvarProximaAcao} />
        </label>
        <label className="grupo-campo">
          <span className="rotulo">O que fazer</span>
          <input className="campo campo-p" value={proximaAcaoTexto} onChange={(e) => setProximaAcaoTexto(e.target.value)} onBlur={salvarProximaAcaoTexto} placeholder="Ex: mandar a proposta" maxLength={300} />
        </label>
      </div>
      <Orcamentos
        negocioId={negocio.id}
        orcamentos={orcamentos}
        aoCriar={acoes.aoCriarOrcamento}
        aoAtualizar={acoes.aoAtualizarOrcamento}
        aoExcluir={acoes.aoExcluirOrcamento}
      />
    </article>
  );
}

// Interface minima de orcamento: criar, ver status e validade, e marcar aceito
// ou recusado. O momento mais caro do ciclo nao cabia num titulo e num valor.
export function Orcamentos({
  negocioId,
  orcamentos,
  aoCriar,
  aoAtualizar,
  aoExcluir,
}: {
  negocioId: string;
  orcamentos: Orcamento[];
  aoCriar: (negocioId: string, valor: number, validoAte?: string) => Promise<Orcamento>;
  aoAtualizar: (id: string, dados: DadosOrcamento) => Promise<Orcamento>;
  aoExcluir: (id: string) => Promise<void>;
}) {
  const [criando, setCriando] = useState(false);
  const [valor, setValor] = useState("");
  const [validoAte, setValidoAte] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function criar() {
    const numero = numeroOuNulo(valor);
    if (numero === null || salvando) return;
    setSalvando(true);
    try {
      await aoCriar(negocioId, numero, validoAte || undefined);
      setValor("");
      setValidoAte("");
      setCriando(false);
    } catch {
      // O painel que chama ja mostra o erro.
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="crm-orcamentos">
      <div className="crm-orcamentos-topo">
        <span className="rotulo">Orçamentos</span>
        <button className="botao botao-p botao-fantasma" onClick={() => setCriando((atual) => !atual)} aria-expanded={criando} type="button">
          {criando ? "Cancelar" : "Novo orçamento"}
        </button>
      </div>

      {criando && (
        <div className="crm-orcamento-novo">
          <label className="grupo-campo">
            <span className="rotulo">Valor (R$)</span>
            <input className="campo campo-p" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" autoFocus />
          </label>
          <label className="grupo-campo">
            <span className="rotulo">Válido até</span>
            <input className="campo campo-p" type="date" value={validoAte} onChange={(e) => setValidoAte(e.target.value)} />
          </label>
          <button className="botao botao-p botao-neutro" onClick={() => void criar()} disabled={numeroOuNulo(valor) === null || salvando} type="button" aria-busy={salvando || undefined}>
            Criar
          </button>
        </div>
      )}

      {orcamentos.length === 0 && !criando && <p className="crm-vazio-inline">Nenhum orçamento ainda.</p>}

      {orcamentos.length > 0 && (
        <ul className="lista crm-orcamentos-lista">
          {orcamentos.map((orcamento) => (
            <li className="item-lista" key={orcamento.id}>
              <span className="item-lista-texto">
                <span className="item-lista-titulo">{formatarReais(orcamento.valor)}</span>
                <span className="item-lista-meta">
                  {STATUS_ORCAMENTO.find((item) => item.valor === orcamento.status)?.rotulo}
                  {orcamento.validoAte ? ` até ${formatarDataHora(orcamento.validoAte)}` : ""}
                </span>
              </span>
              <span className="item-lista-acoes">
                <select
                  className="campo campo-p crm-orcamento-status"
                  value={orcamento.status}
                  onChange={(e) => void aoAtualizar(orcamento.id, { status: e.target.value as StatusOrcamento }).catch(() => undefined)}
                  aria-label={`Status do orçamento de ${formatarReais(orcamento.valor)}`}
                >
                  {STATUS_ORCAMENTO.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
                </select>
                <button className="botao botao-p botao-fantasma" onClick={() => void aoAtualizar(orcamento.id, { status: "aceito" }).catch(() => undefined)} type="button">Aceito</button>
                <button className="botao botao-p botao-fantasma" onClick={() => void aoAtualizar(orcamento.id, { status: "recusado" }).catch(() => undefined)} type="button">Recusado</button>
                <button className="botao botao-p botao-icone botao-fantasma" onClick={() => void aoExcluir(orcamento.id).catch(() => undefined)} aria-label={`Excluir orçamento de ${formatarReais(orcamento.valor)}`} type="button">
                  <IconeLixeira className="" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Tags do contato. Mesmo componente na ficha e no painel de contexto do chat.
export function EditorTags({
  contato,
  aoSalvar,
}: {
  contato: Contato;
  aoSalvar: (dados: DadosContato) => void;
}) {
  const [nova, setNova] = useState("");

  function adicionar() {
    const limpo = nova.trim();
    if (!limpo) return;
    setNova("");
    // Tag repetida nao vira gravacao: so limpa o campo.
    if (contato.tags.some((tag) => tag.toLowerCase() === limpo.toLowerCase())) return;
    aoSalvar({ tags: [...contato.tags, limpo] });
  }

  return (
    <div className="grupo-campo">
      <span className="rotulo">Tags</span>
      <div className="crm-tags-lista">
        {contato.tags.length === 0 && <span className="crm-vazio-inline">Nenhuma tag ainda.</span>}
        {contato.tags.map((tag) => (
          <span className="selo crm-tag-editavel" key={tag}>
            {tag}
            <button
              className="crm-tag-x"
              onClick={() => aoSalvar({ tags: contato.tags.filter((item) => item !== tag) })}
              aria-label={`Remover ${tag}`}
              type="button"
            >
              <IconeX className="" />
            </button>
          </span>
        ))}
      </div>
      <div className="crm-tag-nova">
        <input
          className="campo campo-p"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="Adicionar tag"
          maxLength={40}
        />
        <button className="botao botao-p botao-icone botao-neutro" onClick={adicionar} disabled={!nova.trim()} aria-label="Adicionar tag" type="button">
          <IconeMais className="" />
        </button>
      </div>
    </div>
  );
}
