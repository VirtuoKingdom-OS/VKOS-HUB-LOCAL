import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  alterarStatusLead,
  buscarLeads,
  ErroApiLeads,
  excluirLead,
  importarLeads,
  obterLeads,
  type LeadMinerado,
  type ListasLeads,
} from "../../api/leads";
import {
  IconeAlerta,
  IconeCheck,
  IconeLixeira,
  IconePasta,
  IconeSeta,
} from "../comum/Icones";
import { irParaTela } from "../layout/rotas";

interface Props {
  aoImportar?: () => void | Promise<void>;
}

type AbaLista = "minerados" | "arquivados";

interface Feedback {
  tipo: "sucesso" | "informacao";
  texto: string;
}

const LISTAS_VAZIAS: ListasLeads = { minerados: [], arquivados: [] };

function enderecoSite(site: string): string {
  const limpo = site.trim();
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

function textoNota(lead: LeadMinerado): string | null {
  if (typeof lead.nota !== "number") return null;
  const avaliacoes = typeof lead.totalAvaliacoes === "number"
    ? ` (${lead.totalAvaliacoes.toLocaleString("pt-BR")} avaliações)`
    : "";
  return `${lead.nota.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5${avaliacoes}`;
}

function dataCurta(data: string): string {
  const valor = new Date(data);
  return Number.isNaN(valor.getTime())
    ? ""
    : valor.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function BuscaLeads({ aoImportar }: Props) {
  const [termo, setTermo] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [limite, setLimite] = useState(20);
  const [buscarEmails, setBuscarEmails] = useState(true);
  const [listas, setListas] = useState<ListasLeads>(LISTAS_VAZIAS);
  const [aba, setAba] = useState<AbaLista>("minerados");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<ErroApiLeads | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let ativo = true;
    obterLeads()
      .then((dados) => { if (ativo) setListas(dados); })
      .catch((falha) => {
        if (ativo) setErro(falha instanceof ErroApiLeads
          ? falha
          : new ErroApiLeads("Não deu pra carregar os leads salvos.", 0));
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!buscando) return;
    setSegundos(0);
    const inicio = Date.now();
    const intervalo = window.setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [buscando]);

  useEffect(() => {
    if (!confirmandoExclusao) return;
    const temporizador = window.setTimeout(() => setConfirmandoExclusao(null), 4000);
    return () => window.clearTimeout(temporizador);
  }, [confirmandoExclusao]);

  const listaAtual = listas[aba];
  const importaveis = useMemo(
    () => listas.minerados.filter((lead) => !lead.jaExisteNoCrm),
    [listas.minerados],
  );
  const todosMarcados = importaveis.length > 0
    && importaveis.every((lead) => selecionados.has(lead.id));

  function aplicarListas(proximas: ListasLeads) {
    setListas(proximas);
    const ids = new Set(proximas.minerados.map((lead) => lead.id));
    setSelecionados((atuais) => new Set([...atuais].filter((id) => ids.has(id))));
  }

  async function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const consulta = termo.trim();
    if (!consulta || buscando) return;
    setBuscando(true);
    setErro(null);
    setFeedback(null);
    try {
      const retorno = await buscarLeads({
        termo: consulta,
        localizacao: localizacao.trim() || undefined,
        limite,
        buscarEmails,
      });
      aplicarListas(retorno);
      setAba("minerados");
      setSelecionados(new Set());
      const repetidos = retorno.resumo.atualizados;
      setFeedback({
        tipo: "sucesso",
        texto: `${retorno.resumo.novos} ${retorno.resumo.novos === 1 ? "lead novo foi salvo" : "leads novos foram salvos"}.${repetidos ? ` ${repetidos} já estavam na sua mineração e foram atualizados.` : ""}`,
      });
    } catch (falha) {
      setErro(falha instanceof ErroApiLeads
        ? falha
        : new ErroApiLeads("Não deu pra buscar os leads.", 0));
    } finally {
      setBuscando(false);
    }
  }

  function alternar(lead: LeadMinerado) {
    if (lead.jaExisteNoCrm || importando) return;
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(lead.id)) proximos.delete(lead.id);
      else proximos.add(lead.id);
      return proximos;
    });
  }

  function alternarTodos() {
    setSelecionados(todosMarcados
      ? new Set()
      : new Set(importaveis.map((lead) => lead.id)));
  }

  async function importar() {
    if (!selecionados.size || importando) return;
    setImportando(true);
    setErro(null);
    try {
      const retorno = await importarLeads([...selecionados]);
      aplicarListas(retorno.listas);
      setSelecionados(new Set());
      setFeedback({
        tipo: "sucesso",
        texto: `${retorno.importados} ${retorno.importados === 1 ? "lead entrou" : "leads entraram"} em Contatos.${retorno.duplicados ? ` ${retorno.duplicados} foram pulados porque já estavam no CRM.` : ""}`,
      });
      await aoImportar?.();
    } catch (falha) {
      setErro(falha instanceof ErroApiLeads
        ? falha
        : new ErroApiLeads("Não deu pra importar os leads.", 0));
    } finally {
      setImportando(false);
    }
  }

  async function importarUm(lead: LeadMinerado) {
    if (lead.jaExisteNoCrm || ocupadoId) return;
    setOcupadoId(lead.id);
    setErro(null);
    try {
      const retorno = await importarLeads([lead.id]);
      aplicarListas(retorno.listas);
      setFeedback({
        tipo: "sucesso",
        texto: retorno.importados
          ? `${lead.nome} entrou em Contatos.`
          : `${lead.nome} já estava no CRM.`,
      });
      await aoImportar?.();
    } catch (falha) {
      setErro(falha instanceof ErroApiLeads
        ? falha
        : new ErroApiLeads("Não deu pra importar o lead.", 0));
    } finally {
      setOcupadoId(null);
    }
  }

  async function mudarStatus(id: string, status: "minerado" | "arquivado") {
    setOcupadoId(id);
    setErro(null);
    try {
      aplicarListas(await alterarStatusLead(id, status));
      setFeedback({
        tipo: "informacao",
        texto: status === "arquivado" ? "Lead movido para Arquivados." : "Lead restaurado para Minerados.",
      });
    } catch (falha) {
      setErro(falha instanceof ErroApiLeads ? falha : new ErroApiLeads("Não deu pra mover o lead.", 0));
    } finally {
      setOcupadoId(null);
    }
  }

  async function arquivarSelecionados() {
    const ids = [...selecionados];
    if (!ids.length) return;
    setImportando(true);
    try {
      let proximas = listas;
      for (const id of ids) proximas = await alterarStatusLead(id, "arquivado");
      aplicarListas(proximas);
      setSelecionados(new Set());
      setFeedback({ tipo: "informacao", texto: `${ids.length} ${ids.length === 1 ? "lead foi arquivado" : "leads foram arquivados"}.` });
    } catch (falha) {
      setErro(falha instanceof ErroApiLeads ? falha : new ErroApiLeads("Não deu pra arquivar os leads.", 0));
    } finally {
      setImportando(false);
    }
  }

  async function excluir(id: string) {
    if (confirmandoExclusao !== id) {
      setConfirmandoExclusao(id);
      return;
    }
    setOcupadoId(id);
    try {
      aplicarListas(await excluirLead(id));
      setConfirmandoExclusao(null);
      setFeedback({ tipo: "informacao", texto: "Lead excluído da mineração." });
    } catch (falha) {
      setErro(falha instanceof ErroApiLeads ? falha : new ErroApiLeads("Não deu pra excluir o lead.", 0));
    } finally {
      setOcupadoId(null);
    }
  }

  const faltaConexao = erro?.status === 400
    && /apify|conex(?:a|ã)o|token/i.test(erro.message);

  return (
    <div className="tela-corpo crm-leads">
      <section className="secao" aria-labelledby="crm-leads-titulo">
        <div className="secao-topo">
          <h2 id="crm-leads-titulo">Encontre empresas no Google Maps</h2>
          <p>Só o tipo de negócio é obrigatório.</p>
        </div>
        <form className="crm-leads-form" onSubmit={buscar}>
          <div className="grupo-campo crm-leads-campo-principal">
            <label className="rotulo" htmlFor="crm-termo-leads">O que você procura?</label>
            <input className="campo" id="crm-termo-leads" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex.: clínicas odontológicas" maxLength={180} disabled={buscando} required />
          </div>
          <div className="grupo-campo">
            <label className="rotulo" htmlFor="crm-local-leads">Cidade ou região</label>
            <input className="campo" id="crm-local-leads" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Ex.: Belo Horizonte, MG" maxLength={120} disabled={buscando} />
          </div>
          <div className="grupo-campo">
            <label className="rotulo" htmlFor="crm-limite-leads">Quantidade</label>
            <select className="campo" id="crm-limite-leads" value={limite} onChange={(e) => setLimite(Number(e.target.value))} disabled={buscando}>
              <option value={10}>10 leads</option>
              <option value={20}>20 leads</option>
              <option value={40}>40 leads</option>
            </select>
          </div>
          <label className="linha-escolha crm-leads-email">
            <input className="caixa" type="checkbox" checked={buscarEmails} onChange={(e) => setBuscarEmails(e.target.checked)} disabled={buscando} />
            <span>Buscar emails nos sites<small>Mais completo, com custo adicional na busca.</small></span>
          </label>
          <button className="botao botao-principal crm-leads-buscar" type="submit" disabled={!termo.trim() || buscando} aria-busy={buscando || undefined}>
            {buscando ? "Buscando e salvando" : `Buscar até ${limite} leads`}
          </button>
        </form>
      </section>

      {buscando && (
        <div className="faixa crm-faixa-bloco" role="status" aria-live="polite">
          <span className="ponto-vivo" aria-hidden="true" />
          <div className="faixa-texto">
            Minerando no Google Maps. Os resultados são salvos antes de aparecerem aqui.
            <span className="dica">Busca em andamento há {segundos}s. Você pode continuar usando esta aba.</span>
          </div>
        </div>
      )}

      {erro && !buscando && (
        <div className="faixa faixa-alerta crm-faixa-bloco" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">{erro.message}</div>
          {faltaConexao && (
            <div className="faixa-acoes">
              <a className="botao botao-p botao-neutro" href="/conexoes" onClick={(e) => { e.preventDefault(); irParaTela("conexoes"); }}>Ir para Conexões</a>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div className={`faixa crm-faixa-bloco${feedback.tipo === "sucesso" ? " faixa-boa" : ""}`} role="status">
          <IconeCheck className="" />
          <div className="faixa-texto">{feedback.texto}</div>
        </div>
      )}

      <section className="secao" aria-labelledby="crm-lista-titulo">
        <div className="secao-topo">
          {/* "Sua base de prospecção" saiu: era a mesma frase de "Leads
              salvos", escrita duas vezes, uma acima da outra. */}
          <h2 id="crm-lista-titulo">Leads salvos</h2>
        </div>

        <div className="abas crm-subabas" role="tablist" aria-label="Listas de leads">
          <button type="button" role="tab" aria-selected={aba === "minerados"} className="aba" onClick={() => setAba("minerados")}>Minerados <span className="contagem">{listas.minerados.length}</span></button>
          <button type="button" role="tab" aria-selected={aba === "arquivados"} className="aba" onClick={() => setAba("arquivados")}>Arquivados <span className="contagem">{listas.arquivados.length}</span></button>
        </div>

        {aba === "minerados" && listaAtual.length > 0 && (
          <div className="barra-ferramentas">
            <span className="crm-resultados">{listaAtual.length} na mineração, {importaveis.length} disponíveis para importar</span>
            <span className="barra-ferramentas-espaco" />
            <button className="botao botao-p botao-fantasma" type="button" onClick={alternarTodos} disabled={!importaveis.length || importando}>{todosMarcados ? "Desmarcar todos" : "Marcar disponíveis"}</button>
          </div>
        )}

        {carregando ? (
          <div className="lista" aria-busy="true">
            <span className="so-leitor">Carregando sua mineração</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <div className="item-lista" key={i} aria-hidden="true"><span className="esqueleto crm-esqueleto-linha" /></div>
            ))}
          </div>
        ) : listaAtual.length === 0 ? (
          <div className="vazio">
            <h2>{aba === "minerados" ? "Nenhum lead minerado ainda." : "Nenhum lead arquivado."}</h2>
            <p>{aba === "minerados" ? "Faça uma busca acima. O resultado fica salvo aqui mesmo se você trocar de aba." : "Leads que você descartar aparecem aqui e podem ser restaurados."}</p>
          </div>
        ) : (
          <ul className="lista crm-leads-lista">
            {listaAtual.map((lead) => {
              const marcado = selecionados.has(lead.id);
              const nota = textoNota(lead);
              const ocupado = ocupadoId === lead.id;
              return (
                <li className={`item-lista crm-lead${marcado ? " marcado" : ""}`} key={lead.id}>
                  {aba === "minerados" && <input className="caixa" type="checkbox" checked={marcado} disabled={lead.jaExisteNoCrm || importando} onChange={() => alternar(lead)} aria-label={`Selecionar ${lead.nome}`} />}
                  <span className="item-lista-texto">
                    <span className="crm-lead-titulo">
                      <span className="item-lista-titulo">{lead.nome}</span>
                      {lead.jaExisteNoCrm && <span className="selo">Em Contatos</span>}
                    </span>
                    <span className="item-lista-meta">
                      {[
                        lead.categoria || "Categoria não informada",
                        lead.telefone,
                        lead.email,
                        lead.endereco,
                        nota ? `nota ${nota}` : "",
                      ].filter(Boolean).join(" · ")}
                    </span>
                    <span className="item-lista-meta">
                      Minerado em {dataCurta(lead.capturadoEm)} por “{lead.termoBusca}”
                      {lead.site && <> · <a href={enderecoSite(lead.site)} target="_blank" rel="noreferrer">visitar site</a></>}
                    </span>
                  </span>
                  <span className="item-lista-acoes">
                    {aba === "minerados" ? (
                      <>
                        {/* Neutro, nao principal: a acao escura e uma por
                            tela, e aqui ela e o "Importar para Contatos" da
                            barra de selecao. */}
                        <button className="botao botao-p botao-neutro" type="button" disabled={ocupado || lead.jaExisteNoCrm || importando} aria-busy={ocupado || undefined} onClick={() => void importarUm(lead)}><IconeCheck className="" /> {lead.jaExisteNoCrm ? "Em Contatos" : "Importar"}</button>
                        <button className="botao botao-p botao-fantasma" type="button" disabled={ocupado} onClick={() => void mudarStatus(lead.id, "arquivado")}><IconePasta className="" /> Arquivar</button>
                      </>
                    ) : (
                      <button className="botao botao-p botao-fantasma" type="button" disabled={ocupado} onClick={() => void mudarStatus(lead.id, "minerado")}><IconeSeta className="" /> Restaurar</button>
                    )}
                    <button className={`botao botao-p ${confirmandoExclusao === lead.id ? "botao-perigo" : "botao-fantasma"}`} type="button" disabled={ocupado} onClick={() => void excluir(lead.id)}><IconeLixeira className="" /> {confirmandoExclusao === lead.id ? "Confirmar" : "Excluir"}</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {aba === "minerados" && selecionados.size > 0 && (
        <div className="crm-barra-selecao">
          <span>{selecionados.size} {selecionados.size === 1 ? "lead selecionado" : "leads selecionados"}</span>
          <button className="botao botao-neutro" type="button" onClick={() => void arquivarSelecionados()} disabled={importando}>Arquivar</button>
          <button className="botao botao-principal" type="button" onClick={() => void importar()} disabled={importando} aria-busy={importando || undefined}>Importar para Contatos</button>
        </div>
      )}
    </div>
  );
}
