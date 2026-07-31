// Aba "Formulário" do CRM: quem chegou pelo formulário do site.
//
// Par da BuscaLeads: lá eu vou atrás (outbound, Google Maps), aqui eles vieram
// até mim (inbound, Supabase). As duas terminam no mesmo lugar, criando Contato
// no funil, e as duas deduplicam por telefone e por chave externa.
//
// A divisão Novos / No funil vem do crm.json local, não do status do Supabase.
// Ver docs/decisoes/2026-07-29-leads-do-formulario-do-site.md.

import { useEffect, useMemo, useState } from "react";

import {
  ErroApiFormulario,
  importarLeadsFormulario,
  linkWhatsapp,
  obterLeadsFormulario,
  type LeadFormulario,
  type ListaFormulario,
  type Temperatura,
} from "../../api/formulario";
import { tempoRelativo } from "../core/logica";
import { irParaTela } from "../layout/rotas";
import { IconeAlerta, IconeCheck, IconeChevron } from "../comum/Icones";

interface Props {
  aoImportar?: () => void | Promise<void>;
}

type AbaLista = "novos" | "noFunil";

const LISTA_VAZIA: ListaFormulario = { novos: [], noFunil: [], temMais: false };

// Quente não ganha cor própria: ganha peso. Um selo sólido no meio de selos
// tênues salta mais que verde no meio de vermelho, e não gasta o orçamento de
// cor da casa, onde o menta só fala do que está vivo.
const ROTULO_TEMPERATURA: Record<Temperatura, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
};

function dataCompleta(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "data desconhecida";
  // O criado_em chega em UTC. Sem fixar o fuso, lead da noite aparece no dia
  // seguinte.
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadsFormulario({ aoImportar }: Props) {
  const [listas, setListas] = useState<ListaFormulario>(LISTA_VAZIA);
  const [aba, setAba] = useState<AbaLista>("novos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [erro, setErro] = useState<ErroApiFormulario | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroTemp, setFiltroTemp] = useState<Temperatura | "todas">("todas");
  const [filtroDor, setFiltroDor] = useState("todas");

  async function carregar(silencioso = false) {
    if (!silencioso) setCarregando(true);
    try {
      setListas(await obterLeadsFormulario());
      setErro(null);
    } catch (falha) {
      setErro(
        falha instanceof ErroApiFormulario
          ? falha
          : new ErroApiFormulario("Não deu pra ler os leads.", 0),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const listaAtual = aba === "novos" ? listas.novos : listas.noFunil;

  // As opções de dor saem do que chegou de verdade, não de uma lista fixa
  // copiada do site. Assim o filtro nunca oferece uma dor que ninguém marcou,
  // nem esquece uma que o formulário passou a oferecer do outro lado.
  const doresDisponiveis = useMemo(() => {
    const todas = new Set<string>();
    for (const lead of [...listas.novos, ...listas.noFunil]) {
      for (const dor of lead.dores) todas.add(dor);
    }
    return [...todas].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [listas]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return listaAtual.filter((lead) => {
      if (filtroTemp !== "todas" && lead.temperatura !== filtroTemp) return false;
      if (filtroDor !== "todas" && !lead.dores.includes(filtroDor)) return false;
      if (!termo) return true;
      return (
        lead.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        lead.negocio.toLocaleLowerCase("pt-BR").includes(termo)
      );
    });
  }, [listaAtual, busca, filtroTemp, filtroDor]);

  const importaveis = useMemo(
    () => filtrados.filter((lead) => !lead.jaExisteNoCrm),
    [filtrados],
  );
  const todosMarcados =
    importaveis.length > 0 && importaveis.every((lead) => selecionados.has(lead.id));

  function alternar(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function alternarTodos() {
    setSelecionados(todosMarcados ? new Set() : new Set(importaveis.map((l) => l.id)));
  }

  function alternarExpandido(id: string) {
    setExpandidos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  async function importar(ids: string[], umSo = false) {
    if (!ids.length) return;
    if (umSo) setOcupadoId(ids[0]);
    else setImportando(true);
    setErro(null);
    setFeedback(null);
    try {
      const resultado = await importarLeadsFormulario(ids);
      setListas(resultado.listas);
      setSelecionados(new Set());
      const partes: string[] = [];
      if (resultado.importados > 0) {
        partes.push(
          `${resultado.importados} ${resultado.importados === 1 ? "contato criado" : "contatos criados"} no funil.`,
        );
      }
      if (resultado.duplicados > 0) {
        partes.push(`${resultado.duplicados} já estava no funil.`);
      }
      if (resultado.avisoStatus) partes.push(resultado.avisoStatus);
      setFeedback(partes.join(" "));
      await aoImportar?.();
    } catch (falha) {
      setErro(
        falha instanceof ErroApiFormulario
          ? falha
          : new ErroApiFormulario("Não deu pra importar.", 0),
      );
    } finally {
      setImportando(false);
      setOcupadoId(null);
    }
  }

  const faltaConexao =
    erro?.status === 400 && /supabase|conex(?:a|ã)o|chave/i.test(erro.message);

  return (
    <div className="tela-corpo crm-form">
      {erro && (
        <div className="faixa faixa-alerta crm-faixa-bloco" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">{erro.message}</div>
          {faltaConexao && (
            <div className="faixa-acoes">
              <a
                className="botao botao-p botao-neutro"
                href="/conexoes"
                onClick={(e) => {
                  e.preventDefault();
                  irParaTela("conexoes");
                }}
              >
                Ir para Conexões
              </a>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div className="faixa faixa-boa crm-faixa-bloco" role="status">
          <IconeCheck className="" />
          <div className="faixa-texto">{feedback}</div>
        </div>
      )}

      {/* Informativo, não sucesso: a faixa neutra evita pintar de menta um
          aviso de recorte. O menta fica pro resultado de importação. */}
      {listas.temMais && (
        <div className="faixa crm-faixa-bloco" role="status">
          <div className="faixa-texto">
            Mostrando os leads mais recentes. Existe mais coisa além deste
            recorte no Supabase.
          </div>
        </div>
      )}

      <section className="secao" aria-labelledby="crm-form-titulo">
        <div className="secao-topo">
          <h2 id="crm-form-titulo">Leads do site</h2>
          <button
            className="botao botao-p botao-fantasma"
            type="button"
            onClick={() => void carregar(true)}
            disabled={carregando || importando}
            aria-busy={carregando || undefined}
          >
            Recarregar
          </button>
        </div>

        <div
          className="abas crm-subabas"
          role="tablist"
          aria-label="Listas de leads do formulário"
        >
          <button
            type="button"
            role="tab"
            aria-selected={aba === "novos"}
            className="aba"
            onClick={() => setAba("novos")}
          >
            Novos <span className="contagem">{listas.novos.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === "noFunil"}
            className="aba"
            onClick={() => setAba("noFunil")}
          >
            No funil <span className="contagem">{listas.noFunil.length}</span>
          </button>
        </div>

        <p className="dica crm-form-nota">
          Importar cria o Contato. Daí em diante o estágio de verdade é a coluna do Quadro.
        </p>

        <div className="barra-ferramentas crm-form-filtros">
          <label className="crm-filtro crm-filtro-busca">
            <span className="rotulo">Buscar</span>
            <input
              className="campo campo-p"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou negócio"
              maxLength={120}
            />
          </label>
          <label className="crm-filtro">
            <span className="rotulo">Temperatura</span>
            <select
              className="campo campo-p"
              value={filtroTemp}
              onChange={(e) => setFiltroTemp(e.target.value as Temperatura | "todas")}
            >
              <option value="todas">Todas</option>
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </select>
          </label>
          <label className="crm-filtro">
            <span className="rotulo">Dor</span>
            <select className="campo campo-p" value={filtroDor} onChange={(e) => setFiltroDor(e.target.value)}>
              <option value="todas">Todas</option>
              {doresDisponiveis.map((dor) => (
                <option value={dor} key={dor}>
                  {dor}
                </option>
              ))}
            </select>
          </label>
          <span className="barra-ferramentas-espaco" />
          <span className="crm-resultados">
            {filtrados.length} {filtrados.length === 1 ? "lead" : "leads"}
          </span>
          {aba === "novos" && importaveis.length > 0 && (
            <button
              className="botao botao-p botao-fantasma"
              type="button"
              onClick={alternarTodos}
              disabled={importando}
            >
              {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
            </button>
          )}
        </div>

        {carregando ? (
          <div className="lista" aria-busy="true">
            <span className="so-leitor">Lendo o formulário do site</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <div className="item-lista" key={i} aria-hidden="true">
                <span className="esqueleto crm-esqueleto-linha" />
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="vazio">
            <h2>
              {listaAtual.length === 0
                ? aba === "novos"
                  ? "Nenhum lead novo por aqui."
                  : "Nenhum lead do site entrou no funil ainda."
                : "Nenhum lead com esses filtros."}
            </h2>
            <p>
              {listaAtual.length === 0
                ? "Assim que alguém preencher o formulário do site, aparece aqui."
                : "Afrouxe a busca ou volte os filtros para Todas."}
            </p>
          </div>
        ) : (
          <ul className="lista crm-form-lista">
            {filtrados.map((lead) => {
              const marcado = selecionados.has(lead.id);
              const ocupado = ocupadoId === lead.id;
              const zap = linkWhatsapp(lead.whatsapp);
              const aberto = expandidos.has(lead.id);
              return (
                <li
                  className={`crm-form-item${marcado ? " marcado" : ""}${
                    aberto ? " aberto" : ""
                  }`}
                  key={lead.id}
                >
                  {/* A linha compacta: quem é, quando chegou, quão quente, e
                      o que fazer. Tudo que qualifica mora no painel de baixo,
                      porque numa fila de contato o que decide a ordem é nome,
                      temperatura e tempo, não a faixa de faturamento. */}
                  <div className="item-lista crm-form-linha">
                    {aba === "novos" && (
                      <input
                        className="caixa"
                        type="checkbox"
                        checked={marcado}
                        disabled={importando}
                        onChange={() => alternar(lead.id)}
                        aria-label={`Selecionar ${lead.nome}`}
                      />
                    )}

                    <span className="item-lista-texto">
                      <span className="item-lista-titulo">{lead.nome}</span>
                      <span className="item-lista-meta" title={lead.negocio}>
                        {lead.negocio || "Negócio não descrito"}
                      </span>
                    </span>

                    <time
                      className="crm-item-quando"
                      dateTime={lead.criadoEm}
                      title={dataCompleta(lead.criadoEm)}
                    >
                      {tempoRelativo(lead.criadoEm) ?? dataCompleta(lead.criadoEm)}
                    </time>

                    {/* Quente não ganha cor própria, ganha peso: um selo cheio
                        no meio de selos tênues salta mais que verde no meio de
                        vermelho, e não gasta o orçamento de cor da casa. */}
                    <span className={`selo crm-temp-${lead.temperatura}`}>
                      {ROTULO_TEMPERATURA[lead.temperatura]}
                    </span>

                    {lead.jaExisteNoCrm && <span className="selo">No funil</span>}

                    <span className="item-lista-acoes">
                      {zap ? (
                        <a
                          className="botao botao-p botao-neutro"
                          href={zap}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      ) : (
                        <span className="crm-vazio-inline">Sem telefone</span>
                      )}
                      {aba === "novos" && (
                        <button
                          className="botao botao-p botao-neutro"
                          type="button"
                          disabled={ocupado || importando}
                          aria-busy={ocupado || undefined}
                          onClick={() => void importar([lead.id], true)}
                        >
                          Importar
                        </button>
                      )}
                      {/* Botão próprio em vez de linha inteira clicável: a
                          linha já tem três alvos, e clique ambíguo entre abrir
                          e agir é pior que um alvo a mais. */}
                      <button
                        className="botao botao-p botao-icone botao-fantasma crm-form-expandir"
                        type="button"
                        aria-expanded={aberto}
                        aria-controls={`lead-detalhe-${lead.id}`}
                        aria-label={
                          aberto
                            ? `Recolher as respostas de ${lead.nome}`
                            : `Ver todas as respostas de ${lead.nome}`
                        }
                        onClick={() => alternarExpandido(lead.id)}
                      >
                        <IconeChevron className="" />
                      </button>
                    </span>
                  </div>

                  {aberto && (
                    <div className="crm-form-detalhe" id={`lead-detalhe-${lead.id}`}>
                      <dl className="crm-dados">
                          <div>
                            <dt>Investimento</dt>
                            <dd>{lead.investimento || "Não respondeu"}</dd>
                          </div>
                          <div>
                            <dt>Faturamento</dt>
                            <dd>{lead.faturamento || "Não respondeu"}</dd>
                          </div>
                          <div>
                            <dt>Decisão</dt>
                            <dd>{lead.decisao || "Não respondeu"}</dd>
                          </div>
                          <div>
                            <dt>Marketing hoje</dt>
                            <dd>{lead.papelMarketing || "Não respondeu"}</dd>
                          </div>
                          {lead.horario && (
                            <div>
                              <dt>Melhor horário</dt>
                              <dd>{lead.horario}</dd>
                            </div>
                          )}
                          {lead.whatsapp && (
                            <div>
                              <dt>WhatsApp</dt>
                              <dd>{lead.whatsapp}</dd>
                            </div>
                          )}
                        </dl>

                      {lead.dores.length > 0 && (
                        <div className="crm-form-bloco">
                          <h3>O que trava o crescimento</h3>
                          <ul className="crm-form-dores">
                            {lead.dores.map((dor) => (
                              <li className="selo" key={dor}>{dor}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Resposta aberta ganha parágrafo inteiro: é o que
                          mais serve na hora de ligar pra pessoa, e cortar em
                          reticências apagaria o melhor do formulário. */}
                      {lead.gatilho && (
                        <div className="crm-form-bloco">
                          <h3>O que fez procurarem agora</h3>
                          <p>{lead.gatilho}</p>
                        </div>
                      )}
                      {lead.tentativas && (
                        <div className="crm-form-bloco">
                          <h3>O que já tentaram</h3>
                          <p>{lead.tentativas}</p>
                        </div>
                      )}

                      <dl className="crm-dados">
                        <div>
                          <dt>Chegou em</dt>
                          <dd>{dataCompleta(lead.criadoEm)}</dd>
                        </div>
                        {lead.origem && (
                          <div>
                            <dt>Origem</dt>
                            <dd>{lead.origem}</dd>
                          </div>
                        )}
                        {lead.referrer && (
                          <div>
                            <dt>Veio de</dt>
                            <dd>{lead.referrer}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* A barra de seleção só existe quando há seleção, e ela gruda no pé da
          área rolante: a ação principal da aba mora aqui. */}
      {aba === "novos" && selecionados.size > 0 && (
        <div className="crm-barra-selecao">
          <span>
            {selecionados.size}{" "}
            {selecionados.size === 1 ? "lead selecionado" : "leads selecionados"}
          </span>
          <button
            className="botao botao-principal"
            type="button"
            onClick={() => void importar([...selecionados])}
            disabled={importando}
            aria-busy={importando || undefined}
          >
            Importar para Contatos
          </button>
        </div>
      )}
    </div>
  );
}
