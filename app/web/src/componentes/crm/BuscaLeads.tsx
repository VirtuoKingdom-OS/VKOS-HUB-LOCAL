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
    <div className="crm-leads-visao">
      <aside className="crm-leads-aviso">
        <IconeAlerta className="" />
        <p>Os resultados ficam salvos na mineração. Importe para criar Contatos e use Arquivar para separar o que foi descartado.</p>
      </aside>

      <div className="crm-leads-conteudo">
        <section className="crm-leads-intro" aria-labelledby="crm-leads-titulo">
          <div className="crm-leads-intro-texto">
            <span className="crm-leads-etiqueta">Mineração no Google Maps</span>
            <h2 id="crm-leads-titulo">Encontre empresas e guarde o resultado</h2>
            <p>Apenas o tipo de negócio é obrigatório. Use os demais campos para controlar a região, o custo e o nível de detalhe.</p>
          </div>
          <form className="crm-leads-form" onSubmit={buscar}>
            <label className="crm-leads-campo crm-leads-campo-principal" htmlFor="crm-termo-leads">
              <span>O que você procura? <b>Obrigatório</b></span>
              <input id="crm-termo-leads" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex.: clínicas odontológicas" maxLength={180} disabled={buscando} />
            </label>
            <label className="crm-leads-campo" htmlFor="crm-local-leads">
              <span>Cidade ou região <small>Opcional</small></span>
              <input id="crm-local-leads" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Ex.: Belo Horizonte, MG" maxLength={120} disabled={buscando} />
            </label>
            <label className="crm-leads-campo" htmlFor="crm-limite-leads">
              <span>Quantidade</span>
              <select id="crm-limite-leads" value={limite} onChange={(e) => setLimite(Number(e.target.value))} disabled={buscando}>
                <option value={10}>10 leads</option>
                <option value={20}>20 leads</option>
                <option value={40}>40 leads</option>
              </select>
            </label>
            <label className="crm-leads-email">
              <input type="checkbox" checked={buscarEmails} onChange={(e) => setBuscarEmails(e.target.checked)} disabled={buscando} />
              <span><strong>Buscar emails nos sites</strong><small>Mais completo, com custo adicional na busca.</small></span>
            </label>
            <button className="botao botao-principal crm-leads-buscar" type="submit" disabled={!termo.trim() || buscando}>
              {buscando ? "Buscando e salvando" : `Buscar até ${limite} leads`}
            </button>
          </form>
        </section>

        {buscando && (
          <div className="crm-leads-carregando" role="status" aria-live="polite">
            <span className="crm-leads-pulso" aria-hidden="true"><i /><i /><i /></span>
            <div><strong>Minerando no Google Maps</strong><p>Quando a busca terminar, os resultados são salvos antes de aparecerem aqui.</p><small>Busca em andamento há {segundos}s. Você pode continuar usando esta aba.</small></div>
          </div>
        )}

        {erro && !buscando && (
          <div className="crm-leads-erro" role="alert"><div><strong>Não deu pra concluir</strong><p>{erro.message}</p></div>{faltaConexao && <a className="botao botao-neutro" href="#/conexoes">Ir para Conexões</a>}</div>
        )}

        {feedback && (
          <div className={`crm-leads-resumo ${feedback.tipo}`} role="status"><IconeCheck className="" /><p>{feedback.texto}</p></div>
        )}

        <section className="crm-leads-biblioteca" aria-labelledby="crm-lista-titulo">
          <header className="crm-leads-lista-topo">
            <div><span className="crm-leads-etiqueta">Sua base de prospecção</span><h3 id="crm-lista-titulo">Leads salvos</h3></div>
            <div className="crm-leads-subabas" role="tablist" aria-label="Listas de leads">
              <button type="button" role="tab" aria-selected={aba === "minerados"} className={aba === "minerados" ? "ativa" : ""} onClick={() => setAba("minerados")}>Minerados <span>{listas.minerados.length}</span></button>
              <button type="button" role="tab" aria-selected={aba === "arquivados"} className={aba === "arquivados" ? "ativa" : ""} onClick={() => setAba("arquivados")}>Arquivados <span>{listas.arquivados.length}</span></button>
            </div>
          </header>

          {aba === "minerados" && listaAtual.length > 0 && (
            <div className="crm-leads-selecao-topo"><p><strong>{listaAtual.length}</strong> na mineração, <strong>{importaveis.length}</strong> disponíveis para importar</p><button className="botao botao-fantasma" type="button" onClick={alternarTodos} disabled={!importaveis.length || importando}>{todosMarcados ? "Desmarcar todos" : "Marcar disponíveis"}</button></div>
          )}

          {carregando ? (
            <div className="crm-leads-vazio"><strong>Carregando sua mineração</strong></div>
          ) : listaAtual.length === 0 ? (
            <div className="crm-leads-vazio"><strong>{aba === "minerados" ? "Nenhum lead minerado ainda." : "Nenhum lead arquivado."}</strong><p>{aba === "minerados" ? "Faça uma busca acima. O resultado ficará salvo aqui mesmo se você trocar de aba." : "Leads que você descartar aparecem aqui e podem ser restaurados."}</p></div>
          ) : (
            <div className="crm-leads-grade">
              {listaAtual.map((lead) => {
                const marcado = selecionados.has(lead.id);
                const nota = textoNota(lead);
                const ocupado = ocupadoId === lead.id;
                return (
                  <article className={`crm-lead-cartao${lead.jaExisteNoCrm ? " existente" : ""}${marcado ? " marcado" : ""}`} key={lead.id}>
                    <div className="crm-lead-identidade">
                      {aba === "minerados" && <input type="checkbox" checked={marcado} disabled={lead.jaExisteNoCrm || importando} onChange={() => alternar(lead)} aria-label={`Selecionar ${lead.nome}`} />}
                      <div><div className="crm-lead-titulo-linha"><h4>{lead.nome}</h4>{lead.jaExisteNoCrm && <span className="crm-lead-selo">em Contatos</span>}</div><p>{lead.categoria || "Categoria não informada"}</p><small>Minerado em {dataCurta(lead.capturadoEm)} por “{lead.termoBusca}”</small></div>
                    </div>
                    <dl className="crm-lead-dados">
                      {lead.endereco && <div><dt>Endereço</dt><dd>{lead.endereco}</dd></div>}
                      {lead.telefone && <div><dt>Telefone</dt><dd>{lead.telefone}</dd></div>}
                      {lead.email && <div><dt>Email</dt><dd>{lead.email}</dd></div>}
                      {lead.site && <div><dt>Site</dt><dd><a href={enderecoSite(lead.site)} target="_blank" rel="noreferrer">Visitar site</a></dd></div>}
                      {nota && <div><dt>Nota</dt><dd>{nota}</dd></div>}
                    </dl>
                    <div className="crm-lead-acoes">
                      {aba === "minerados" ? (
                        <>
                          <button className="botao botao-principal crm-lead-importar" type="button" disabled={ocupado || lead.jaExisteNoCrm || importando} onClick={() => void importarUm(lead)}><IconeCheck className="" /> {lead.jaExisteNoCrm ? "Em Contatos" : ocupado ? "Importando" : "Importar"}</button>
                          <button className="botao botao-fantasma" type="button" disabled={ocupado} onClick={() => void mudarStatus(lead.id, "arquivado")}><IconePasta className="" /> Arquivar</button>
                        </>
                      ) : (
                        <button className="botao botao-fantasma" type="button" disabled={ocupado} onClick={() => void mudarStatus(lead.id, "minerado")}><IconeSeta className="" /> Restaurar</button>
                      )}
                      <button className={`botao botao-fantasma crm-lead-excluir${confirmandoExclusao === lead.id ? " confirmar" : ""}`} type="button" disabled={ocupado} onClick={() => void excluir(lead.id)}><IconeLixeira className="" /> {confirmandoExclusao === lead.id ? "Confirmar exclusão" : "Excluir"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {aba === "minerados" && selecionados.size > 0 && (
        <footer className="crm-leads-rodape"><span><strong>{selecionados.size}</strong> {selecionados.size === 1 ? "lead selecionado" : "leads selecionados"}</span><div><button className="botao botao-neutro" type="button" onClick={() => void arquivarSelecionados()} disabled={importando}>Arquivar</button><button className="botao botao-principal" type="button" onClick={() => void importar()} disabled={importando}>{importando ? "Processando" : "Importar para Contatos"}</button></div></footer>
      )}
    </div>
  );
}
