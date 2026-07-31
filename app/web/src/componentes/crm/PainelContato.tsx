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
//
// A edicao de negocio, orcamento e tag saiu daqui pro EditorNegocio.tsx quando o
// painel de contexto do chat passou a precisar das mesmas tres coisas. Duas
// copias divergiriam na primeira mudanca de campo.

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
  type Tarefa,
  type TipoInteracao,
} from "../../api/crm";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { EditorTags, LinhaNegocio } from "./EditorNegocio";
import { formatarDataHora, isoParaDatetimeLocal } from "./formatos";
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
        <div className="crm-painel-titulo">
          <span className="rotulo">Ficha completa</span>
          <h2>{contato.nome}</h2>
        </div>
        <div className="crm-painel-topo-acoes">
          <MarcaSalvamento estado={salvamento.estado} />
          <button className="botao botao-p botao-icone botao-fantasma" onClick={aoFechar} aria-label="Fechar" type="button">
            <IconeX className="" />
          </button>
        </div>
      </header>

      {/* O erro fica DENTRO do painel. Na faixa da tela ele aparecia atras do
          painel em tela estreita, e o usuario nunca sabia por que nao salvou. */}
      {salvamento.erro && (
        <div className="faixa faixa-alerta crm-painel-erro" role="alert">
          <div className="faixa-texto">{salvamento.erro}</div>
          <div className="faixa-acoes">
            <button className="botao botao-p botao-icone botao-fantasma" onClick={salvamento.limpar} aria-label="Fechar aviso" type="button"><IconeX className="" /></button>
          </div>
        </div>
      )}

      <div className="crm-painel-corpo">
        <label className="grupo-campo">
          <span className="rotulo">Estágio no funil</span>
          <select
            className="campo"
            value={contato.colunaId}
            onChange={(e) => void aoMoverEstagio(contato.id, e.target.value)}
            aria-label="Estágio do contato no funil"
          >
            {colunas.map((coluna) => (
              <option key={coluna.id} value={coluna.id}>{coluna.nome}</option>
            ))}
          </select>
        </label>

        <section className="secao">
          <div className="secao-topo"><h2>Contato</h2></div>
          <label className="grupo-campo">
            <span className="rotulo">Nome</span>
            <input
              className="campo"
              value={rascunho.nome}
              onChange={(e) => definir("nome", e.target.value)}
              onBlur={() => salvarCampo("nome")}
              maxLength={200}
            />
          </label>
          <div className="crm-campos-grade">
            {CAMPOS.map(({ chave, rotulo, dica, tipo }) => (
              <label className="grupo-campo" key={chave}>
                <span className="rotulo">{rotulo}</span>
                <input
                  className="campo"
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
            <label className="grupo-campo">
              <span className="rotulo">Próximo contato</span>
              <input
                className="campo"
                type="datetime-local"
                value={rascunho.proximoContato}
                onChange={(e) => definir("proximoContato", e.target.value)}
                onBlur={() => salvarCampo("proximoContato")}
              />
            </label>
            <label className="grupo-campo">
              <span className="rotulo">Falar a cada (dias)</span>
              <input
                className="campo"
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
          <span className="dica crm-ajuda">
            Com cadência definida, registrar uma interação já reagenda o próximo contato. Sem ela, o follow-up fecha.
          </span>
          <EditorTags contato={contato} aoSalvar={(dados) => void salvarDados(dados)} />
        </section>

        {contato.lead && (
          <section className="secao">
            <div className="secao-topo"><h2>Dados do lead</h2></div>
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

        {/* Quem chegou pelo formulário do site respondeu 9 perguntas de
            qualificação. Elas ficam aqui inteiras: importar não pode perder o
            que a pessoa contou, e é isso que serve na hora de ligar pra ela. */}
        {contato.formulario && (
          <section className="secao">
            <div className="secao-topo"><h2>Respostas do formulário</h2></div>
            <dl className="crm-lead-ficha">
              {contato.formulario.negocio && <div><dt>O negócio</dt><dd>{contato.formulario.negocio}</dd></div>}
              {contato.formulario.temperatura && <div><dt>Temperatura</dt><dd>{contato.formulario.temperatura}</dd></div>}
              {contato.formulario.faturamento && <div><dt>Faturamento</dt><dd>{contato.formulario.faturamento}</dd></div>}
              {contato.formulario.investimento && <div><dt>Investimento</dt><dd>{contato.formulario.investimento}</dd></div>}
              {contato.formulario.decisao && <div><dt>Decisão</dt><dd>{contato.formulario.decisao}</dd></div>}
              {contato.formulario.papelMarketing && <div><dt>Marketing hoje</dt><dd>{contato.formulario.papelMarketing}</dd></div>}
              {contato.formulario.dores && contato.formulario.dores.length > 0 && (
                <div><dt>O que trava</dt><dd>{contato.formulario.dores.join(", ")}</dd></div>
              )}
              {contato.formulario.horario && <div><dt>Melhor horário</dt><dd>{contato.formulario.horario}</dd></div>}
              {contato.formulario.recebidoEm && <div><dt>Chegou em</dt><dd>{formatarDataHora(contato.formulario.recebidoEm)}</dd></div>}
            </dl>
            {/* Resposta aberta ganha parágrafo, não linha de tabela: cortar
                estes dois em reticências apagaria o melhor do formulário. */}
            {contato.formulario.gatilho && (
              <div className="crm-resposta-aberta">
                <h3>O que fez procurarem agora</h3>
                <p>{contato.formulario.gatilho}</p>
              </div>
            )}
            {contato.formulario.tentativas && (
              <div className="crm-resposta-aberta">
                <h3>O que já tentaram</h3>
                <p>{contato.formulario.tentativas}</p>
              </div>
            )}
          </section>
        )}

        <section className="secao">
          <div className="secao-topo">
            <h2>Negócios</h2>
            <button className="botao botao-p botao-neutro" onClick={() => aoAbrirNovoNegocio(contato.id)} type="button">
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
                acoes={{
                  aoAtualizar: aoAtualizarNegocio,
                  aoExcluir: aoExcluirNegocio,
                  aoCriarOrcamento,
                  aoAtualizarOrcamento,
                  aoExcluirOrcamento,
                }}
              />
            ))}
          </div>
        </section>

        <section className="secao">
          <div className="secao-topo"><h2>Interações</h2></div>
          <div className="crm-interacao-nova">
            <select className="campo campo-p crm-interacao-tipo-campo" value={tipoInteracao} onChange={(e) => setTipoInteracao(e.target.value as TipoInteracao)} aria-label="Tipo da interação">
              {TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
            </select>
            <textarea
              className="campo"
              value={textoInteracao}
              onChange={(e) => setTextoInteracao(e.target.value)}
              placeholder="O que aconteceu neste contato?"
              rows={2}
              maxLength={2000}
            />
            {/* O rotulo NAO some enquanto salva: trocar ele por um giro apaga a
                informacao de qual acao esta em curso. */}
            <button className="botao botao-p botao-neutro" onClick={() => void enviarInteracao()} disabled={!textoInteracao.trim() || salvandoInteracao} aria-busy={salvandoInteracao || undefined} type="button">
              Registrar interação
            </button>
          </div>
          <ol className="crm-linha-tempo">
            {carregandoInteracoes && <li className="crm-vazio-inline">Carregando a linha do tempo...</li>}
            {!carregandoInteracoes && interacoes.length === 0 && <li className="crm-vazio-inline">Nenhuma interação ainda.</li>}
            {interacoes.map((interacao) => (
              <li className="crm-interacao" key={interacao.id}>
                <span className="selo">{TIPOS.find((tipo) => tipo.valor === interacao.tipo)?.rotulo}</span>
                <time>{formatarDataHora(interacao.em)}</time>
                <p>{interacao.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="secao">
          <div className="secao-topo"><h2>Tarefas</h2></div>
          <div className="crm-tarefa-nova">
            <input className="campo campo-p" value={textoTarefa} onChange={(e) => setTextoTarefa(e.target.value)} placeholder="Ex: enviar orçamento" maxLength={500} />
            <input className="campo campo-p crm-tarefa-prazo" type="datetime-local" value={prazoTarefa} onChange={(e) => setPrazoTarefa(e.target.value)} aria-label="Prazo da tarefa" />
            <button className="botao botao-p botao-neutro" onClick={() => void enviarTarefa()} disabled={!textoTarefa.trim() || salvandoTarefa} aria-busy={salvandoTarefa || undefined} type="button">
              <IconeMais className="" /> Adicionar
            </button>
          </div>
          {tarefas.length === 0 && <p className="crm-vazio-inline">Nenhuma tarefa ainda.</p>}
          {tarefas.length > 0 && (
            <ul className="lista">
              {tarefas.map((tarefa) => (
                <li className={`item-lista crm-tarefa${tarefa.feita ? " feita" : ""}`} key={tarefa.id}>
                  <label className="crm-tarefa-texto">
                    <input
                      className="caixa"
                      type="checkbox"
                      checked={tarefa.feita}
                      onChange={(e) => void aoAtualizarTarefa(tarefa.id, { feita: e.target.checked }).catch(() => undefined)}
                    />
                    <span>{tarefa.texto}</span>
                  </label>
                  {tarefa.prazo && <time className="crm-item-quando">{formatarDataHora(tarefa.prazo)}</time>}
                  <span className="item-lista-acoes">
                    <button className="botao botao-p botao-icone botao-fantasma" onClick={() => void aoExcluirTarefa(tarefa.id).catch(() => undefined)} aria-label={`Excluir tarefa ${tarefa.texto}`} type="button">
                      <IconeLixeira className="" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="crm-painel-pe">
        <BotaoConfirmar
          className="botao botao-p botao-perigo crm-excluir-contato"
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
