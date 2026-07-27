// Ficha completa do contato.
//
// O que mudou junto com o modelo v4:
// - interacoes e tarefas nao moram mais dentro do contato. As interacoes sao
//   pedidas por contato ao abrir a ficha; as tarefas chegam por prop, da lista
//   de topo do estado.
// - "empresa" virou organizacao. O campo continua sendo texto simples porque o
//   servidor aceita o nome e resolve (ou cria) a Organizacao.
// - o que se digita nao se perde mais: Esc salva o que estava pendente antes de
//   fechar, existe indicacao visivel de "salvo" e o erro aparece DENTRO do
//   painel, nao atras dele.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listarInteracoes,
  type Coluna,
  type Contato,
  type DadosContato,
  type DadosNegocio,
  type DadosOrcamento,
  type Interacao,
  type Negocio,
  type Orcamento,
  type StatusNegocio,
  type StatusOrcamento,
  type Tarefa,
  type TipoInteracao,
} from "../../api/crm";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { formatarDataHora, formatarReais, isoParaDatetimeLocal } from "./formatos";
import { IconeLixeira, IconeMais, IconeX } from "../comum/Icones";

type ChaveRascunho = "nome" | "empresa" | "telefone" | "email" | "origem" | "proximoContato" | "cadenciaDias";
type Rascunho = Record<ChaveRascunho, string>;

const CAMPOS: { chave: ChaveRascunho; rotulo: string; dica: string; tipo?: string }[] = [
  { chave: "empresa", rotulo: "Empresa", dica: "Nome da empresa" },
  { chave: "telefone", rotulo: "Telefone", dica: "(00) 00000-0000", tipo: "tel" },
  { chave: "email", rotulo: "Email", dica: "email@exemplo.com", tipo: "email" },
  { chave: "origem", rotulo: "Origem", dica: "Como chegou até você" },
];

const TIPOS: { valor: TipoInteracao; rotulo: string }[] = [
  { valor: "nota", rotulo: "Nota" },
  { valor: "ligacao", rotulo: "Ligação" },
  { valor: "mensagem", rotulo: "Mensagem" },
  { valor: "reuniao", rotulo: "Reunião" },
  { valor: "outro", rotulo: "Outro" },
];

const STATUS_NEGOCIO: { valor: StatusNegocio; rotulo: string }[] = [
  { valor: "aberto", rotulo: "Em aberto" },
  { valor: "ganho", rotulo: "Ganho" },
  { valor: "perdido", rotulo: "Perdido" },
];

const STATUS_ORCAMENTO: { valor: StatusOrcamento; rotulo: string }[] = [
  { valor: "rascunho", rotulo: "Rascunho" },
  { valor: "enviado", rotulo: "Enviado" },
  { valor: "aceito", rotulo: "Aceito" },
  { valor: "recusado", rotulo: "Recusado" },
  { valor: "expirado", rotulo: "Expirado" },
];

// Garante um endereco navegavel a partir do site do lead (pode vir sem http).
function enderecoSite(site: string): string {
  const limpo = site.trim();
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

// Texto da nota do lead, com o total de avaliacoes quando houver.
function textoNotaLead(lead: { nota?: number; totalAvaliacoes?: number }): string | null {
  if (typeof lead.nota !== "number") return null;
  const avaliacoes = typeof lead.totalAvaliacoes === "number"
    ? ` (${lead.totalAvaliacoes.toLocaleString("pt-BR")} avaliações)`
    : "";
  return `${lead.nota.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5${avaliacoes}`;
}

function numeroOuNulo(texto: string): number | null {
  const limpo = texto.replace(",", ".").trim();
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export function PainelContato({
  contato,
  nomeOrganizacao,
  negocios,
  tarefas,
  orcamentos,
  colunas,
  negocioDestaqueId,
  versaoLinhaDoTempo,
  aoAtualizar,
  aoMoverEstagio,
  aoRegistrarInteracao,
  aoSaberUltimaInteracao,
  aoCriarTarefa,
  aoAtualizarTarefa,
  aoExcluirTarefa,
  aoAbrirNovoNegocio,
  aoAtualizarNegocio,
  aoExcluirNegocio,
  aoCriarOrcamento,
  aoAtualizarOrcamento,
  aoExcluirOrcamento,
  aoExcluir,
  aoFechar,
}: {
  contato: Contato;
  nomeOrganizacao: string;
  negocios: Negocio[];
  tarefas: Tarefa[];
  orcamentos: Orcamento[];
  colunas: Coluna[];
  negocioDestaqueId: string | null;
  // Sobe de um quando outra aba mexeu na linha do tempo DESTE contato. So a
  // lista de interacoes e relida: os campos da ficha ficam como estao, senao o
  // que a pessoa esta digitando aqui seria atropelado por uma mudanca de fora.
  versaoLinhaDoTempo: number;
  aoAtualizar: (id: string, dados: DadosContato) => Promise<Contato>;
  aoMoverEstagio: (id: string, colunaId: string) => Promise<void> | void;
  aoRegistrarInteracao: (id: string, tipo: TipoInteracao, texto: string) => Promise<Interacao>;
  aoSaberUltimaInteracao: (contatoId: string, em: string | undefined) => void;
  aoCriarTarefa: (id: string, texto: string, prazo?: string) => Promise<Tarefa>;
  aoAtualizarTarefa: (id: string, dados: { feita?: boolean; prazo?: string | null }) => Promise<Tarefa>;
  aoExcluirTarefa: (id: string) => Promise<void>;
  aoAbrirNovoNegocio: (contatoId: string) => void;
  aoAtualizarNegocio: (id: string, dados: DadosNegocio) => Promise<Negocio>;
  aoExcluirNegocio: (id: string) => Promise<void>;
  aoCriarOrcamento: (negocioId: string, valor: number, validoAte?: string) => Promise<Orcamento>;
  aoAtualizarOrcamento: (id: string, dados: DadosOrcamento) => Promise<Orcamento>;
  aoExcluirOrcamento: (id: string) => Promise<void>;
  aoExcluir: (id: string) => Promise<void>;
  aoFechar: () => void;
}) {
  const original: Rascunho = {
    nome: contato.nome,
    empresa: nomeOrganizacao,
    telefone: contato.telefone ?? "",
    email: contato.email ?? "",
    origem: contato.origem ?? "",
    proximoContato: isoParaDatetimeLocal(contato.proximoContato),
    cadenciaDias: contato.cadenciaDias ? String(contato.cadenciaDias) : "",
  };
  const [rascunho, setRascunho] = useState<Rascunho>(original);
  const [novaTag, setNovaTag] = useState("");
  const [tipoInteracao, setTipoInteracao] = useState<TipoInteracao>("nota");
  const [textoInteracao, setTextoInteracao] = useState("");
  const [salvandoInteracao, setSalvandoInteracao] = useState(false);
  const [textoTarefa, setTextoTarefa] = useState("");
  const [prazoTarefa, setPrazoTarefa] = useState("");
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [carregandoInteracoes, setCarregandoInteracoes] = useState(true);
  const salvamento = usarSalvamento();
  // O rascunho vivo, pra o Esc conseguir salvar sem depender do ciclo de render.
  const rascunhoRef = useRef(rascunho);
  rascunhoRef.current = rascunho;
  const originalRef = useRef(original);
  originalRef.current = original;

  // A ficha e remontada por key quando o contato muda, entao esta e a primeira
  // carga deste contato. Recarga ao vivo nao pisca a lista nem mostra erro: e
  // sincronizacao de fundo, nao acao do usuario.
  const primeiraCarga = useRef(true);

  useEffect(() => {
    let vivo = true;
    const inicial = primeiraCarga.current;
    primeiraCarga.current = false;
    if (inicial) setCarregandoInteracoes(true);
    listarInteracoes(contato.id)
      .then((lista) => {
        if (!vivo) return;
        setInteracoes(lista);
        aoSaberUltimaInteracao(contato.id, lista[0]?.em);
      })
      .catch((e: unknown) => {
        if (vivo && inicial) salvamento.falhar(e, "Não deu pra carregar a linha do tempo.");
      })
      .finally(() => {
        if (vivo && inicial) setCarregandoInteracoes(false);
      });
    return () => { vivo = false; };
    // salvamento tem identidade estavel (useRef dentro do hook).
  }, [aoSaberUltimaInteracao, contato.id, salvamento, versaoLinhaDoTempo]);

  // Diferenca entre o que esta na tela e o que esta gravado.
  const pendencias = useCallback((): DadosContato => {
    const atual = rascunhoRef.current;
    const antes = originalRef.current;
    const dados: DadosContato = {};
    if (atual.nome.trim() && atual.nome.trim() !== antes.nome) dados.nome = atual.nome.trim();
    for (const chave of ["empresa", "telefone", "email", "origem"] as const) {
      if (atual[chave].trim() !== antes[chave]) dados[chave] = atual[chave].trim();
    }
    if (atual.proximoContato !== antes.proximoContato) {
      dados.proximoContato = atual.proximoContato || null;
    }
    if (atual.cadenciaDias !== antes.cadenciaDias) {
      const dias = Number(atual.cadenciaDias);
      dados.cadenciaDias = atual.cadenciaDias && Number.isFinite(dias) && dias > 0
        ? Math.trunc(dias)
        : null;
    }
    return dados;
  }, []);

  const salvarDados = useCallback(async (dados: DadosContato) => {
    if (Object.keys(dados).length === 0) return;
    await salvamento.correr(() => aoAtualizar(contato.id, dados), "Não deu pra salvar a ficha.");
  }, [aoAtualizar, contato.id, salvamento]);

  // Esc DESMONTAVA o painel antes do blur, e o que estava digitado ia pro lixo
  // sem aviso. Agora ele salva o pendente e so entao fecha.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const dados = pendencias();
      if (Object.keys(dados).length === 0) return aoFechar();
      void salvarDados(dados).then(aoFechar, aoFechar);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar, pendencias, salvarDados]);

  function definir(chave: ChaveRascunho, valor: string) {
    setRascunho((atual) => ({ ...atual, [chave]: valor }));
  }

  function salvarCampo(chave: ChaveRascunho) {
    // Nome vazio volta ao valor gravado: ficha sem nome nao existe.
    if (chave === "nome" && !rascunhoRef.current.nome.trim()) {
      return definir("nome", contato.nome);
    }
    const dados = pendencias();
    const recorte: DadosContato = {};
    if (chave in dados) {
      Object.assign(recorte, { [chave]: dados[chave as keyof DadosContato] });
    }
    void salvarDados(recorte);
  }

  function adicionarTag() {
    const limpo = novaTag.trim();
    if (!limpo) return;
    setNovaTag("");
    if (contato.tags.some((tag) => tag.toLowerCase() === limpo.toLowerCase())) return;
    void salvarDados({ tags: [...contato.tags, limpo] });
  }

  async function enviarInteracao() {
    const limpo = textoInteracao.trim();
    if (!limpo || salvandoInteracao) return;
    setSalvandoInteracao(true);
    try {
      const interacao = await aoRegistrarInteracao(contato.id, tipoInteracao, limpo);
      setInteracoes((atual) => [interacao, ...atual]);
      setTextoInteracao("");
      salvamento.confirmar();
    } catch (e) {
      salvamento.falhar(e, "Não deu pra registrar a interação.");
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
      salvamento.confirmar();
    } catch (e) {
      salvamento.falhar(e, "Não deu pra criar a tarefa.");
    } finally {
      setSalvandoTarefa(false);
    }
  }

  const orcamentosDe = (negocioId: string) =>
    orcamentos.filter((orcamento) => orcamento.negocioId === negocioId);

  return (
    <aside className="crm-painel" role="dialog" aria-modal="false" aria-label={`Ficha de ${contato.nome}`}>
      <header className="crm-painel-topo">
        <div>
          <span className="crm-painel-sobre">Ficha completa</span>
          <h2>{contato.nome}</h2>
        </div>
        <div className="crm-painel-topo-acoes">
          <MarcaSalvamento estado={salvamento.estado} />
          <button className="crm-painel-fechar" onClick={aoFechar} aria-label="Fechar" type="button">
            <IconeX className="" />
          </button>
        </div>
      </header>

      {/* O erro fica DENTRO do painel. Na faixa da tela ele aparecia atras do
          painel em tela estreita, e o usuario nunca sabia por que nao salvou. */}
      {salvamento.erro && (
        <p className="crm-painel-erro" role="alert">
          {salvamento.erro}
          <button onClick={salvamento.limpar} aria-label="Fechar aviso" type="button"><IconeX className="" /></button>
        </p>
      )}

      <div className="crm-painel-corpo">
        <div className="crm-painel-estagio">
          <span className="crm-rotulo">Estágio no funil</span>
          <select
            value={contato.colunaId}
            onChange={(e) => void aoMoverEstagio(contato.id, e.target.value)}
            aria-label="Estágio do contato no funil"
          >
            {colunas.map((coluna) => (
              <option key={coluna.id} value={coluna.id}>{coluna.nome}</option>
            ))}
          </select>
        </div>

        <section className="crm-painel-secao">
          <h3>Contato</h3>
          <label className="crm-campo crm-campo-nome">
            <span className="crm-rotulo">Nome</span>
            <input
              value={rascunho.nome}
              onChange={(e) => definir("nome", e.target.value)}
              onBlur={() => salvarCampo("nome")}
              maxLength={200}
            />
          </label>
          <div className="crm-campos-grade">
            {CAMPOS.map(({ chave, rotulo, dica, tipo }) => (
              <label className="crm-campo" key={chave}>
                <span className="crm-rotulo">{rotulo}</span>
                <input
                  type={tipo ?? "text"}
                  value={rascunho[chave]}
                  onChange={(e) => definir(chave, e.target.value)}
                  onBlur={() => salvarCampo(chave)}
                  placeholder={dica}
                  maxLength={200}
                />
              </label>
            ))}
          </div>
          <div className="crm-campos-grade">
            <label className="crm-campo">
              <span className="crm-rotulo">Próximo contato</span>
              <input
                type="datetime-local"
                value={rascunho.proximoContato}
                onChange={(e) => definir("proximoContato", e.target.value)}
                onBlur={() => salvarCampo("proximoContato")}
              />
            </label>
            <label className="crm-campo">
              <span className="crm-rotulo">Falar a cada (dias)</span>
              <input
                type="number"
                min={1}
                max={3650}
                value={rascunho.cadenciaDias}
                onChange={(e) => definir("cadenciaDias", e.target.value)}
                onBlur={() => salvarCampo("cadenciaDias")}
                placeholder="Opcional"
              />
            </label>
          </div>
          <span className="crm-ajuda">
            Com cadência definida, registrar uma interação já reagenda o próximo contato. Sem ela, o follow-up fecha.
          </span>
          <div className="crm-campo">
            <span className="crm-rotulo">Tags</span>
            <div className="crm-tags-lista">
              {contato.tags.length === 0 && <span className="crm-vazio-inline">Nenhuma tag ainda.</span>}
              {contato.tags.map((tag) => (
                <span className="crm-tag crm-tag-editavel" key={tag}>
                  {tag}
                  <button
                    className="crm-tag-x"
                    onClick={() => void salvarDados({ tags: contato.tags.filter((item) => item !== tag) })}
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

        {contato.lead && (
          <section className="crm-painel-secao">
            <h3>Dados do lead</h3>
            <dl className="crm-lead-ficha">
              {contato.lead.categoria && <div><dt>Categoria</dt><dd>{contato.lead.categoria}</dd></div>}
              {contato.lead.endereco && <div><dt>Endereço</dt><dd>{contato.lead.endereco}</dd></div>}
              {contato.lead.site && <div><dt>Site</dt><dd><a href={enderecoSite(contato.lead.site)} target="_blank" rel="noreferrer">{contato.lead.site}</a></dd></div>}
              {textoNotaLead(contato.lead) && <div><dt>Nota</dt><dd>{textoNotaLead(contato.lead)}</dd></div>}
              {contato.lead.termoBusca && <div><dt>Termo da busca</dt><dd>{contato.lead.termoBusca}</dd></div>}
              {contato.lead.localizacao && <div><dt>Localização</dt><dd>{contato.lead.localizacao}</dd></div>}
              {contato.lead.capturadoEm && <div><dt>Minerado em</dt><dd>{formatarDataHora(contato.lead.capturadoEm)}</dd></div>}
            </dl>
          </section>
        )}

        <section className="crm-painel-secao">
          <div className="crm-secao-topo">
            <h3>Negócios</h3>
            <button className="botao botao-neutro crm-botao-compacto" onClick={() => aoAbrirNovoNegocio(contato.id)} type="button">
              <IconeMais className="" /> Novo negócio
            </button>
          </div>
          {negocios.length === 0 && <p className="crm-vazio-inline">Nenhum negócio para este contato.</p>}
          <div className="crm-negocios-lista">
            {negocios.map((negocio) => (
              <LinhaNegocio
                key={negocio.id}
                negocio={negocio}
                orcamentos={orcamentosDe(negocio.id)}
                destaque={negocio.id === negocioDestaqueId}
                aoAtualizar={aoAtualizarNegocio}
                aoExcluir={aoExcluirNegocio}
                aoCriarOrcamento={aoCriarOrcamento}
                aoAtualizarOrcamento={aoAtualizarOrcamento}
                aoExcluirOrcamento={aoExcluirOrcamento}
              />
            ))}
          </div>
        </section>

        <section className="crm-painel-secao">
          <h3>Interações</h3>
          <div className="crm-interacao-nova">
            <select value={tipoInteracao} onChange={(e) => setTipoInteracao(e.target.value as TipoInteracao)} aria-label="Tipo da interação">
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
              {salvandoInteracao ? "Salvando..." : "Registrar interação"}
            </button>
          </div>
          <ol className="crm-linha-tempo">
            {carregandoInteracoes && <li className="crm-vazio-inline">Carregando a linha do tempo...</li>}
            {!carregandoInteracoes && interacoes.length === 0 && <li className="crm-vazio-inline">Nenhuma interação ainda.</li>}
            {interacoes.map((interacao) => (
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
            <input value={textoTarefa} onChange={(e) => setTextoTarefa(e.target.value)} placeholder="Ex: enviar orçamento" maxLength={500} />
            <input type="datetime-local" value={prazoTarefa} onChange={(e) => setPrazoTarefa(e.target.value)} aria-label="Prazo da tarefa" />
            <button className="botao botao-neutro crm-botao-compacto" onClick={() => void enviarTarefa()} disabled={!textoTarefa.trim() || salvandoTarefa} type="button">
              <IconeMais className="" /> Adicionar tarefa
            </button>
          </div>
          <ul className="crm-tarefas-lista">
            {tarefas.length === 0 && <li className="crm-vazio-inline">Nenhuma tarefa ainda.</li>}
            {tarefas.map((tarefa) => (
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
                <button className="crm-acao-icone" onClick={() => void aoExcluirTarefa(tarefa.id).catch(() => undefined)} aria-label={`Excluir tarefa ${tarefa.texto}`} type="button">
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
          titulo="Excluir este contato e seus negócios"
          aviso="Excluir contato e negócios?"
          aoConfirmar={() => aoExcluir(contato.id)}
        >
          <IconeLixeira className="" /> Excluir contato
        </BotaoConfirmar>
      </footer>
    </aside>
  );
}

type EstadoSalvamento = "parado" | "salvando" | "salvo";

// Estado visivel do salvamento. Sem isto o campo salvava no blur e nada na tela
// dizia se tinha salvado, se estava salvando ou se falhou.
function usarSalvamento() {
  const [estado, setEstado] = useState<EstadoSalvamento>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const relogio = useRef<number | null>(null);

  useEffect(() => () => {
    if (relogio.current !== null) window.clearTimeout(relogio.current);
  }, []);

  const confirmar = useCallback(() => {
    setEstado("salvo");
    if (relogio.current !== null) window.clearTimeout(relogio.current);
    relogio.current = window.setTimeout(() => setEstado("parado"), 2200);
  }, []);

  const falhar = useCallback((e: unknown, fallback: string) => {
    setEstado("parado");
    setErro(e instanceof Error ? e.message : fallback);
  }, []);

  const correr = useCallback(async (acao: () => Promise<unknown>, fallback: string) => {
    setEstado("salvando");
    setErro(null);
    try {
      await acao();
      confirmar();
    } catch (e) {
      falhar(e, fallback);
    }
  }, [confirmar, falhar]);

  const limpar = useCallback(() => setErro(null), []);

  // A identidade precisa ser estavel: este objeto entra em dependencia de efeito.
  const referencia = useRef({ estado, erro, confirmar, falhar, correr, limpar });
  referencia.current.estado = estado;
  referencia.current.erro = erro;
  return referencia.current;
}

function MarcaSalvamento({ estado }: { estado: EstadoSalvamento }) {
  if (estado === "parado") return null;
  return (
    <span className={`crm-marca-salvo${estado === "salvando" ? " ocupado" : ""}`} role="status">
      {estado === "salvando" ? "Salvando..." : "Salvo"}
    </span>
  );
}

function LinhaNegocio({
  negocio,
  orcamentos,
  destaque,
  aoAtualizar,
  aoExcluir,
  aoCriarOrcamento,
  aoAtualizarOrcamento,
  aoExcluirOrcamento,
}: {
  negocio: Negocio;
  orcamentos: Orcamento[];
  destaque: boolean;
  aoAtualizar: (id: string, dados: DadosNegocio) => Promise<Negocio>;
  aoExcluir: (id: string) => Promise<void>;
  aoCriarOrcamento: (negocioId: string, valor: number, validoAte?: string) => Promise<Orcamento>;
  aoAtualizarOrcamento: (id: string, dados: DadosOrcamento) => Promise<Orcamento>;
  aoExcluirOrcamento: (id: string) => Promise<void>;
}) {
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

  return (
    <article className={`crm-negocio-linha${destaque ? " destaque" : ""} status-${negocio.status}`}>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={salvarTitulo} aria-label="Título do negócio" maxLength={200} />
      <div className="crm-negocio-campos">
        <input value={valor} onChange={(e) => setValor(e.target.value)} onBlur={salvarValor} inputMode="decimal" aria-label="Valor estimado do negócio" placeholder={formatarReais(0)} />
        <select
          value={negocio.status}
          onChange={(e) => void aoAtualizar(negocio.id, { status: e.target.value as StatusNegocio }).catch(() => undefined)}
          aria-label="Status do negócio"
        >
          {STATUS_NEGOCIO.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
        </select>
        <BotaoConfirmar className="crm-excluir-negocio" titulo="Excluir negócio" aviso="Excluir negócio?" aoConfirmar={() => aoExcluir(negocio.id)}>
          <IconeLixeira className="" />
        </BotaoConfirmar>
      </div>
      <div className="crm-negocio-acao">
        <label className="crm-campo">
          <span className="crm-rotulo">Próxima ação</span>
          <input type="datetime-local" value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} onBlur={salvarProximaAcao} />
        </label>
        <label className="crm-campo">
          <span className="crm-rotulo">O que fazer</span>
          <input value={proximaAcaoTexto} onChange={(e) => setProximaAcaoTexto(e.target.value)} onBlur={salvarProximaAcaoTexto} placeholder="Ex: mandar a proposta" maxLength={300} />
        </label>
      </div>
      <Orcamentos
        negocioId={negocio.id}
        orcamentos={orcamentos}
        aoCriar={aoCriarOrcamento}
        aoAtualizar={aoAtualizarOrcamento}
        aoExcluir={aoExcluirOrcamento}
      />
    </article>
  );
}

// Interface minima de orcamento: criar, ver status e validade, e marcar aceito
// ou recusado. O momento mais caro do ciclo nao cabia num titulo e num valor.
function Orcamentos({
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
      // O painel ja mostra o erro.
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="crm-orcamentos">
      <div className="crm-orcamentos-topo">
        <span className="crm-rotulo">Orçamentos</span>
        <button className="crm-acao-inline" onClick={() => setCriando((atual) => !atual)} aria-expanded={criando} type="button">
          {criando ? "Cancelar" : "Novo orçamento"}
        </button>
      </div>

      {criando && (
        <div className="crm-orcamento-novo">
          <label className="crm-campo">
            <span className="crm-rotulo">Valor (R$)</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" autoFocus />
          </label>
          <label className="crm-campo">
            <span className="crm-rotulo">Válido até</span>
            <input type="date" value={validoAte} onChange={(e) => setValidoAte(e.target.value)} />
          </label>
          <button className="botao botao-neutro crm-botao-compacto" onClick={() => void criar()} disabled={numeroOuNulo(valor) === null || salvando} type="button">
            {salvando ? "Criando..." : "Criar"}
          </button>
        </div>
      )}

      {orcamentos.length === 0 && !criando && <p className="crm-vazio-inline">Nenhum orçamento ainda.</p>}

      <ul className="crm-orcamentos-lista">
        {orcamentos.map((orcamento) => (
          <li className={`crm-orcamento status-${orcamento.status}`} key={orcamento.id}>
            <span className="crm-orcamento-dados">
              <b>{formatarReais(orcamento.valor)}</b>
              <small>
                {STATUS_ORCAMENTO.find((item) => item.valor === orcamento.status)?.rotulo}
                {orcamento.validoAte ? ` até ${formatarDataHora(orcamento.validoAte)}` : ""}
              </small>
            </span>
            <span className="crm-orcamento-acoes">
              <select
                value={orcamento.status}
                onChange={(e) => void aoAtualizar(orcamento.id, { status: e.target.value as StatusOrcamento }).catch(() => undefined)}
                aria-label={`Status do orçamento de ${formatarReais(orcamento.valor)}`}
              >
                {STATUS_ORCAMENTO.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
              </select>
              <button className="crm-acao-inline" onClick={() => void aoAtualizar(orcamento.id, { status: "aceito" }).catch(() => undefined)} type="button">Aceito</button>
              <button className="crm-acao-inline" onClick={() => void aoAtualizar(orcamento.id, { status: "recusado" }).catch(() => undefined)} type="button">Recusado</button>
              <button className="crm-acao-icone" onClick={() => void aoExcluir(orcamento.id).catch(() => undefined)} aria-label={`Excluir orçamento de ${formatarReais(orcamento.valor)}`} type="button">
                <IconeLixeira className="" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
