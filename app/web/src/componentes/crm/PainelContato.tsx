import { useEffect, useState } from "react";
import type {
  Coluna,
  Contato,
  DadosContato,
  DadosNegocio,
  Interacao,
  Negocio,
  Tarefa,
  TipoInteracao,
} from "../../api/crm";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { formatarDataHora, formatarReais, isoParaDatetimeLocal } from "./formatos";
import { IconeLixeira, IconeMais, IconeX } from "../comum/Icones";

const CAMPOS: { chave: keyof DadosContato; rotulo: string; dica: string; tipo?: string }[] = [
  { chave: "empresa", rotulo: "Empresa", dica: "Nome da empresa" },
  { chave: "telefone", rotulo: "Telefone", dica: "(00) 00000-0000", tipo: "tel" },
  { chave: "email", rotulo: "Email", dica: "email@exemplo.com", tipo: "email" },
  { chave: "origem", rotulo: "Origem", dica: "Como chegou ate voce" },
];

const TIPOS: { valor: TipoInteracao; rotulo: string }[] = [
  { valor: "nota", rotulo: "Nota" },
  { valor: "ligacao", rotulo: "Ligacao" },
  { valor: "mensagem", rotulo: "Mensagem" },
  { valor: "reuniao", rotulo: "Reuniao" },
  { valor: "outro", rotulo: "Outro" },
];

export function PainelContato({
  contato,
  negocios,
  colunas,
  negocioDestaqueId,
  aoAtualizar,
  aoRegistrarInteracao,
  aoCriarTarefa,
  aoAtualizarTarefa,
  aoExcluirTarefa,
  aoAbrirNovoNegocio,
  aoAtualizarNegocio,
  aoExcluirNegocio,
  aoExcluir,
  aoFechar,
}: {
  contato: Contato;
  negocios: Negocio[];
  colunas: Coluna[];
  negocioDestaqueId: string | null;
  aoAtualizar: (id: string, dados: DadosContato) => Promise<Contato>;
  aoRegistrarInteracao: (id: string, tipo: TipoInteracao, texto: string) => Promise<Interacao>;
  aoCriarTarefa: (id: string, texto: string, prazo?: string) => Promise<Tarefa>;
  aoAtualizarTarefa: (id: string, dados: { feita?: boolean; prazo?: string | null }) => Promise<Tarefa>;
  aoExcluirTarefa: (contatoId: string, id: string) => Promise<void>;
  aoAbrirNovoNegocio: (contatoId: string) => void;
  aoAtualizarNegocio: (id: string, dados: DadosNegocio) => Promise<Negocio>;
  aoExcluirNegocio: (id: string) => Promise<void>;
  aoExcluir: (id: string) => Promise<void>;
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState(contato.nome);
  const [empresa, setEmpresa] = useState(contato.empresa ?? "");
  const [telefone, setTelefone] = useState(contato.telefone ?? "");
  const [email, setEmail] = useState(contato.email ?? "");
  const [origem, setOrigem] = useState(contato.origem ?? "");
  const [proximoContato, setProximoContato] = useState(isoParaDatetimeLocal(contato.proximoContato));
  const [novaTag, setNovaTag] = useState("");
  const [tipoInteracao, setTipoInteracao] = useState<TipoInteracao>("nota");
  const [textoInteracao, setTextoInteracao] = useState("");
  const [salvandoInteracao, setSalvandoInteracao] = useState(false);
  const [textoTarefa, setTextoTarefa] = useState("");
  const [prazoTarefa, setPrazoTarefa] = useState("");
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);

  const rascunhos: Record<string, [string, (v: string) => void]> = {
    empresa: [empresa, setEmpresa],
    telefone: [telefone, setTelefone],
    email: [email, setEmail],
    origem: [origem, setOrigem],
  };

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  function salvarTexto(chave: keyof DadosContato, atual: string) {
    const original = (contato[chave as keyof Contato] as string | undefined) ?? "";
    if (atual.trim() !== original) void aoAtualizar(contato.id, { [chave]: atual.trim() }).catch(() => undefined);
  }

  function salvarNome() {
    const limpo = nome.trim();
    if (!limpo) return setNome(contato.nome);
    if (limpo !== contato.nome) void aoAtualizar(contato.id, { nome: limpo }).catch(() => undefined);
  }

  function salvarProximoContato() {
    const original = isoParaDatetimeLocal(contato.proximoContato);
    if (proximoContato === original) return;
    void aoAtualizar(contato.id, { proximoContato: proximoContato || null }).catch(() => undefined);
  }

  function adicionarTag() {
    const limpo = novaTag.trim();
    if (!limpo) return;
    setNovaTag("");
    if (contato.tags.some((tag) => tag.toLowerCase() === limpo.toLowerCase())) return;
    void aoAtualizar(contato.id, { tags: [...contato.tags, limpo] }).catch(() => undefined);
  }

  async function enviarInteracao() {
    const limpo = textoInteracao.trim();
    if (!limpo || salvandoInteracao) return;
    setSalvandoInteracao(true);
    try {
      await aoRegistrarInteracao(contato.id, tipoInteracao, limpo);
      setTextoInteracao("");
    } catch {
      // A faixa de erro da tela ja explica o problema.
    } finally {
      setSalvandoInteracao(false);
    }
  }

  async function enviarTarefa() {
    const limpo = textoTarefa.trim();
    if (!limpo || salvandoTarefa) return;
    setSalvandoTarefa(true);
    try {
      await aoCriarTarefa(contato.id, limpo, prazoTarefa || undefined);
      setTextoTarefa("");
      setPrazoTarefa("");
    } catch {
      // A faixa de erro da tela ja explica o problema.
    } finally {
      setSalvandoTarefa(false);
    }
  }

  return (
    <aside className="crm-painel">
      <header className="crm-painel-topo">
        <div>
          <span className="crm-painel-sobre">Ficha completa</span>
          <h2>{contato.nome}</h2>
        </div>
        <button className="crm-painel-fechar" onClick={aoFechar} aria-label="Fechar" type="button">
          <IconeX className="" />
        </button>
      </header>

      <div className="crm-painel-corpo">
        <section className="crm-painel-secao">
          <h3>Contato</h3>
          <label className="crm-campo crm-campo-nome">
            <span className="crm-rotulo">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={salvarNome} maxLength={200} />
          </label>
          <div className="crm-campos-grade">
            {CAMPOS.map(({ chave, rotulo, dica, tipo }) => {
              const [valor, setValor] = rascunhos[chave];
              return (
                <label className="crm-campo" key={chave}>
                  <span className="crm-rotulo">{rotulo}</span>
                  <input
                    type={tipo ?? "text"}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    onBlur={() => salvarTexto(chave, valor)}
                    placeholder={dica}
                    maxLength={200}
                  />
                </label>
              );
            })}
          </div>
          <label className="crm-campo">
            <span className="crm-rotulo">Proximo contato</span>
            <input
              type="datetime-local"
              value={proximoContato}
              onChange={(e) => setProximoContato(e.target.value)}
              onBlur={salvarProximoContato}
            />
          </label>
          <div className="crm-campo">
            <span className="crm-rotulo">Tags</span>
            <div className="crm-tags-lista">
              {contato.tags.length === 0 && <span className="crm-vazio-inline">Nenhuma tag ainda.</span>}
              {contato.tags.map((tag) => (
                <span className="crm-tag crm-tag-editavel" key={tag}>
                  {tag}
                  <button
                    className="crm-tag-x"
                    onClick={() => void aoAtualizar(contato.id, { tags: contato.tags.filter((item) => item !== tag) }).catch(() => undefined)}
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
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarTag();
                  }
                }}
                placeholder="Adicionar tag"
                maxLength={40}
              />
              <button className="botao botao-neutro crm-add-tag" onClick={adicionarTag} disabled={!novaTag.trim()} type="button">
                <IconeMais className="" />
              </button>
            </div>
          </div>
        </section>

        <section className="crm-painel-secao">
          <div className="crm-secao-topo">
            <h3>Negocios</h3>
            <button className="botao botao-neutro crm-botao-compacto" onClick={() => aoAbrirNovoNegocio(contato.id)} type="button">
              <IconeMais className="" /> Novo negocio
            </button>
          </div>
          {negocios.length === 0 && <p className="crm-vazio-inline">Nenhum negocio para este contato.</p>}
          <div className="crm-negocios-lista">
            {negocios.map((negocio) => (
              <LinhaNegocio
                key={negocio.id}
                negocio={negocio}
                colunas={colunas}
                destaque={negocio.id === negocioDestaqueId}
                aoAtualizar={aoAtualizarNegocio}
                aoExcluir={aoExcluirNegocio}
              />
            ))}
          </div>
        </section>

        <section className="crm-painel-secao">
          <h3>Interacoes</h3>
          <div className="crm-interacao-nova">
            <select value={tipoInteracao} onChange={(e) => setTipoInteracao(e.target.value as TipoInteracao)} aria-label="Tipo da interacao">
              {TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
            </select>
            <textarea
              value={textoInteracao}
              onChange={(e) => setTextoInteracao(e.target.value)}
              placeholder="O que aconteceu neste contato?"
              rows={2}
              maxLength={2000}
            />
            <button className="botao botao-principal crm-botao-compacto" onClick={() => void enviarInteracao()} disabled={!textoInteracao.trim() || salvandoInteracao} type="button">
              {salvandoInteracao ? "Salvando..." : "Registrar interacao"}
            </button>
          </div>
          <ol className="crm-linha-tempo">
            {contato.interacoes.length === 0 && <li className="crm-vazio-inline">Nenhuma interacao ainda.</li>}
            {contato.interacoes.map((interacao) => (
              <li className="crm-interacao" key={interacao.id}>
                <span className="crm-interacao-tipo">{TIPOS.find((tipo) => tipo.valor === interacao.tipo)?.rotulo}</span>
                <time>{formatarDataHora(interacao.em)}</time>
                <p>{interacao.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="crm-painel-secao">
          <h3>Tarefas</h3>
          <div className="crm-tarefa-nova">
            <input value={textoTarefa} onChange={(e) => setTextoTarefa(e.target.value)} placeholder="Ex: enviar orcamento" maxLength={500} />
            <input type="datetime-local" value={prazoTarefa} onChange={(e) => setPrazoTarefa(e.target.value)} aria-label="Prazo da tarefa" />
            <button className="botao botao-neutro crm-botao-compacto" onClick={() => void enviarTarefa()} disabled={!textoTarefa.trim() || salvandoTarefa} type="button">
              <IconeMais className="" /> Adicionar tarefa
            </button>
          </div>
          <ul className="crm-tarefas-lista">
            {contato.tarefas.length === 0 && <li className="crm-vazio-inline">Nenhuma tarefa ainda.</li>}
            {contato.tarefas.map((tarefa) => (
              <li className={`crm-tarefa${tarefa.feita ? " feita" : ""}`} key={tarefa.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={tarefa.feita}
                    onChange={(e) => void aoAtualizarTarefa(tarefa.id, { feita: e.target.checked }).catch(() => undefined)}
                  />
                  <span>{tarefa.texto}</span>
                </label>
                {tarefa.prazo && <time>{formatarDataHora(tarefa.prazo)}</time>}
                <button className="crm-acao-icone" onClick={() => void aoExcluirTarefa(contato.id, tarefa.id).catch(() => undefined)} aria-label={`Excluir tarefa ${tarefa.texto}`} type="button">
                  <IconeLixeira className="" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="crm-painel-pe">
        <BotaoConfirmar
          className="crm-excluir-contato"
          titulo="Excluir este contato e seus negocios"
          aviso="Excluir contato e negocios?"
          aoConfirmar={() => aoExcluir(contato.id)}
        >
          <IconeLixeira className="" /> Excluir contato
        </BotaoConfirmar>
      </footer>
    </aside>
  );
}

function LinhaNegocio({
  negocio,
  colunas,
  destaque,
  aoAtualizar,
  aoExcluir,
}: {
  negocio: Negocio;
  colunas: Coluna[];
  destaque: boolean;
  aoAtualizar: (id: string, dados: DadosNegocio) => Promise<Negocio>;
  aoExcluir: (id: string) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(negocio.titulo);
  const [valor, setValor] = useState(negocio.valorEstimado === undefined ? "" : String(negocio.valorEstimado));

  function salvarTitulo() {
    const limpo = titulo.trim();
    if (!limpo) return setTitulo(negocio.titulo);
    if (limpo !== negocio.titulo) void aoAtualizar(negocio.id, { titulo: limpo }).catch(() => undefined);
  }

  function salvarValor() {
    const limpo = valor.replace(",", ".").trim();
    if (!limpo) {
      if (negocio.valorEstimado !== undefined) void aoAtualizar(negocio.id, { valorEstimado: null }).catch(() => undefined);
      return;
    }
    const numero = Number(limpo);
    if (!Number.isFinite(numero) || numero < 0) return setValor(negocio.valorEstimado === undefined ? "" : String(negocio.valorEstimado));
    if (numero !== negocio.valorEstimado) void aoAtualizar(negocio.id, { valorEstimado: numero }).catch(() => undefined);
  }

  return (
    <article className={`crm-negocio-linha${destaque ? " destaque" : ""}`}>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={salvarTitulo} aria-label="Titulo do negocio" maxLength={200} />
      <div className="crm-negocio-campos">
        <select value={negocio.colunaId} onChange={(e) => void aoAtualizar(negocio.id, { colunaId: e.target.value }).catch(() => undefined)} aria-label="Estagio do negocio">
          {colunas.map((coluna) => <option key={coluna.id} value={coluna.id}>{coluna.nome}</option>)}
        </select>
        <input value={valor} onChange={(e) => setValor(e.target.value)} onBlur={salvarValor} inputMode="decimal" aria-label="Valor estimado do negocio" placeholder={formatarReais(0)} />
        <BotaoConfirmar className="crm-excluir-negocio" titulo="Excluir negocio" aviso="Excluir negocio?" aoConfirmar={() => aoExcluir(negocio.id)}>
          <IconeLixeira className="" />
        </BotaoConfirmar>
      </div>
    </article>
  );
}
