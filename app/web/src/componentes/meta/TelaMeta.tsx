import { useEffect, useMemo, useState } from "react";

import {
  coletarMetaAgora,
  obterAnunciosMeta,
  obterAtivosMeta,
  obterCredencialMeta,
  obterEstadoMeta,
  obterFacebookMeta,
  obterInstagramMeta,
  salvarVinculoMeta,
  testarCredencialMeta,
  type AtivosMeta,
  type EstadoCredencialMeta,
  type EstadoMeta,
  type VinculoMeta,
} from "../../api/meta";
import { usarEstado } from "../../estado/contexto";
import "../../estilos/meta.css";

type Aba = "geral" | "instagram" | "anuncios" | "facebook";
type Linha = Record<string, unknown>;

function numero(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

function formatar(valor: unknown, moeda = false): string {
  const n = numero(valor);
  if (n === null) return "sem dado";
  return moeda
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : n.toLocaleString("pt-BR");
}

function somar(linhas: Linha[], campo: string): number | null {
  const valores = linhas.map((item) => numero(item[campo])).filter((n): n is number => n !== null);
  return valores.length ? valores.reduce((total, valor) => total + valor, 0) : null;
}

function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null || anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

function dividir(numerador: number | null, denominador: number | null, fator = 1): number | null {
  if (numerador === null || denominador === null || denominador === 0) return null;
  return (numerador / denominador) * fator;
}

function semanas(linhas: Linha[], campo: string): {
  atual: number | null;
  variacao: number | null;
} {
  const hoje = new Date();
  const inicioAtual = new Date(hoje);
  inicioAtual.setDate(inicioAtual.getDate() - 6);
  const inicioAnterior = new Date(hoje);
  inicioAnterior.setDate(inicioAnterior.getDate() - 13);
  const atual = somar(linhas.filter((item) => new Date(String(item.data)) >= inicioAtual), campo);
  const anterior = somar(linhas.filter((item) => {
    const data = new Date(String(item.data));
    return data >= inicioAnterior && data < inicioAtual;
  }), campo);
  return { atual, variacao: variacao(atual, anterior) };
}

function Cartao({
  rotulo,
  valor,
  moeda,
  mudanca,
}: {
  rotulo: string;
  valor: unknown;
  moeda?: boolean;
  mudanca?: number | null;
}) {
  return (
    <article className="meta-cartao">
      <span>{rotulo}</span>
      <strong>{formatar(valor, moeda)}</strong>
      {mudanca !== undefined && (
        <small className={mudanca !== null && mudanca < 0 ? "negativa" : ""}>
          {mudanca === null
            ? "sem comparação anterior"
            : `${mudanca >= 0 ? "+" : ""}${mudanca.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% contra a semana anterior`}
        </small>
      )}
    </article>
  );
}

function Grafico({ linhas, campos }: { linhas: Linha[]; campos: string[] }) {
  const pontos = campos.flatMap((campo) =>
    linhas.map((item) => numero(item[campo])).filter((n): n is number => n !== null));
  if (pontos.length < 2) return <div className="meta-sem-dados">Coletando os primeiros dados.</div>;
  const minimo = Math.min(...pontos);
  const maximo = Math.max(...pontos);
  const amplitude = Math.max(1, maximo - minimo);
  const caminho = (campo: string) => linhas.map((item, indice) => {
    const valor = numero(item[campo]) ?? minimo;
    const x = linhas.length === 1 ? 0 : (indice / (linhas.length - 1)) * 100;
    const y = 40 - ((valor - minimo) / amplitude) * 36;
    return `${indice ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  return (
    <svg className="meta-grafico" viewBox="0 0 100 44" preserveAspectRatio="none" aria-label="Evolução diária">
      <path d={caminho(campos[0])} />
      {campos[1] && <path className="secundaria" d={caminho(campos[1])} />}
    </svg>
  );
}

function VisaoInstagram({ serie, publicacoes }: { serie: Linha[]; publicacoes: Linha[] }) {
  const [ordem, setOrdem] = useState("alcance");
  const ordenadas = [...publicacoes].sort(
    (a, b) => (numero(b[ordem]) ?? -1) - (numero(a[ordem]) ?? -1),
  );
  return (
    <div className="meta-pilha">
      <section className="meta-painel">
        <h2>Perfil</h2>
        <Grafico linhas={serie} campos={["seguidores", "alcance"]} />
      </section>
      <section className="meta-painel">
        <div className="meta-linha-titulo">
          <h2>Publicações recentes</h2>
          <select value={ordem} onChange={(evento) => setOrdem(evento.target.value)} aria-label="Ordenar publicações">
            <option value="alcance">Alcance</option>
            <option value="like_count">Curtidas</option>
            <option value="salvamentos">Salvamentos</option>
          </select>
        </div>
        <div className="meta-publicacoes">
          {ordenadas.map((item) => (
            <article key={String(item.id)} className="meta-publicacao">
              <strong>{String(item.caption ?? "Publicação sem legenda").slice(0, 100)}</strong>
              <span>Alcance: {formatar(item.alcance)}</span>
              <span>Curtidas: {formatar(item.like_count)}</span>
              <span>Salvamentos: {formatar(item.salvamentos)}</span>
            </article>
          ))}
          {!ordenadas.length && <p className="meta-sem-dados">Coletando as primeiras publicações.</p>}
        </div>
      </section>
    </div>
  );
}

function VisaoAnuncios({ serie }: { serie: Linha[] }) {
  const [periodo, setPeriodo] = useState(7);
  const limite = new Date();
  limite.setDate(limite.getDate() - periodo + 1);
  const linhas = serie.filter((item) => new Date(String(item.data)) >= limite);
  const campanhas = new Map<string, Linha[]>();
  for (const item of linhas) {
    const id = String(item.campanhaId ?? "");
    campanhas.set(id, [...(campanhas.get(id) ?? []), item]);
  }
  return (
    <div className="meta-pilha">
      <div className="meta-linha-titulo">
        <div className="meta-resumo">
          <Cartao rotulo="Gasto" valor={somar(linhas, "gasto")} moeda />
          <Cartao rotulo="Resultados" valor={somar(linhas, "resultados")} />
          <Cartao rotulo="Cliques" valor={somar(linhas, "cliques")} />
        </div>
        <select value={periodo} onChange={(evento) => setPeriodo(Number(evento.target.value))} aria-label="Período">
          <option value={7}>7 dias</option>
          <option value={14}>14 dias</option>
          <option value={37}>37 dias</option>
        </select>
      </div>
      <div className="meta-tabela-caixa">
        <table className="meta-tabela">
          <thead><tr><th>Campanha</th><th>Gasto</th><th>Resultados</th><th>Custo por resultado</th><th>CPC</th><th>CPM</th></tr></thead>
          <tbody>
            {[...campanhas.values()].map((itens) => (
              <tr key={String(itens[0]?.campanhaId)}>
                <td>{String(itens[0]?.campanha ?? "Campanha")}</td>
                <td>{formatar(somar(itens, "gasto"), true)}</td>
                <td>{formatar(somar(itens, "resultados"))}</td>
                <td>{formatar(dividir(somar(itens, "gasto"), somar(itens, "resultados")), true)}</td>
                <td>{formatar(dividir(somar(itens, "gasto"), somar(itens, "cliques")), true)}</td>
                <td>{formatar(dividir(somar(itens, "gasto"), somar(itens, "impressoes"), 1000), true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!linhas.length && <p className="meta-sem-dados">Coletando os primeiros dados de anúncios.</p>}
      </div>
    </div>
  );
}

function VisaoFacebook({ serie, publicacoes }: { serie: Linha[]; publicacoes: Linha[] }) {
  return (
    <div className="meta-pilha">
      <section className="meta-painel">
        <h2>Página</h2>
        <Grafico linhas={serie} campos={["seguidores", "alcance"]} />
      </section>
      <section className="meta-painel">
        <h2>Publicações recentes</h2>
        <div className="meta-publicacoes">
          {publicacoes.map((item) => (
            <article key={String(item.id)} className="meta-publicacao">
              <strong>{String(item.message ?? "Publicação sem texto").slice(0, 120)}</strong>
              <span>Alcance: {formatar(item.alcance)}</span>
              <span>Engajamento: {formatar(item.engajamento)}</span>
            </article>
          ))}
          {!publicacoes.length && <p className="meta-sem-dados">Coletando as primeiras publicações.</p>}
        </div>
      </section>
    </div>
  );
}

function ConfiguracaoMeta({
  workspaceId,
  aoAtualizar,
}: {
  workspaceId: string;
  aoAtualizar: () => Promise<void>;
}) {
  const [credencial, setCredencial] = useState<EstadoCredencialMeta | null>(null);
  const [ativos, setAtivos] = useState<AtivosMeta | null>(null);
  const [vinculo, setVinculo] = useState<VinculoMeta>({});
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    Promise.all([
      obterCredencialMeta(),
      obterAtivosMeta().catch(() => null),
      obterEstadoMeta(),
    ]).then(([estadoCredencial, lista, estado]) => {
      setCredencial(estadoCredencial);
      setAtivos(lista);
      setVinculo(estado.vinculo);
    }).catch((erro) => setMensagem(erro instanceof Error ? erro.message : "Falha ao abrir a configuração."));
  }, [workspaceId]);

  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    setOcupado(true);
    setMensagem("");
    try {
      await acao();
      setMensagem(sucesso);
      await aoAtualizar();
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "A ação não foi concluída.");
    } finally {
      setOcupado(false);
    }
  };

  const seletor = (
    campo: keyof Pick<VinculoMeta, "instagramId" | "contaAnunciosId" | "paginaId">,
    rotulo: string,
    opcoes: Array<{ id: string; nome: string }> | undefined,
  ) => (
    <label>
      <span>{rotulo}</span>
      <select value={vinculo[campo] ?? ""} onChange={(evento) => setVinculo({ ...vinculo, [campo]: evento.target.value || undefined })}>
        <option value="">Não vinculado</option>
        {(opcoes ?? []).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
      </select>
    </label>
  );

  return (
    <section className="meta-configuracao">
      <div className="meta-linha-titulo">
        <div>
          <span className="meta-sobretitulo">Somente operador</span>
          <h2>Configuração</h2>
        </div>
        <a href="/sistema/conexoes">Conexões do Sistema</a>
      </div>
      <p>
        Credencial central: <strong>{credencial?.configurada ? "configurada" : "incompleta"}</strong>
        {credencial?.config.tokenSistema ? `, token ${credencial.config.tokenSistema}` : ""}.
      </p>
      <div className="meta-config-grade">
        {seletor("instagramId", "Instagram", ativos?.instagram)}
        {seletor("contaAnunciosId", "Conta de anúncios", ativos?.anuncios)}
        {seletor("paginaId", "Página do Facebook", ativos?.paginas)}
      </div>
      <div className="meta-acoes">
        <button disabled={ocupado} onClick={() => executar(
          () => salvarVinculoMeta(workspaceId, vinculo),
          "Vínculo salvo.",
        )}>Salvar vínculo</button>
        <button className="secundario" disabled={ocupado} onClick={() => executar(
          async () => {
            const teste = await testarCredencialMeta();
            setCredencial((atual) => atual ? { ...atual, ultimoTeste: teste } : atual);
          },
          "Conexão testada.",
        )}>Testar conexão</button>
        <button className="secundario" disabled={ocupado} onClick={() => executar(
          () => coletarMetaAgora(workspaceId),
          "Dados atualizados.",
        )}>Atualizar agora</button>
      </div>
      {mensagem && <p className="meta-mensagem" role="status">{mensagem}</p>}
      {credencial?.ultimoTeste && (
        <ul className="meta-diagnostico">
          {credencial.ultimoTeste.diagnosticos.map((item) => (
            <li key={item.item} className={item.ok ? "ok" : "erro"}>
              <strong>{item.item}:</strong> {item.mensagem}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TelaMeta({ ehOperador = false }: { ehOperador?: boolean }) {
  const { workspaceAtivo } = usarEstado();
  const [estado, setEstado] = useState<EstadoMeta | null>(null);
  const [instagram, setInstagram] = useState<{ serie: Linha[]; publicacoes: Linha[] }>({ serie: [], publicacoes: [] });
  const [anuncios, setAnuncios] = useState<{ serie: Linha[] }>({ serie: [] });
  const [facebook, setFacebook] = useState<{ serie: Linha[]; publicacoes: Linha[] }>({ serie: [], publicacoes: [] });
  const [aba, setAba] = useState<Aba>("geral");
  const [erro, setErro] = useState("");

  const carregar = async () => {
    setErro("");
    try {
      const novoEstado = await obterEstadoMeta();
      setEstado(novoEstado);
      const [ig, ads, fb] = await Promise.all([
        novoEstado.produtos.instagram ? obterInstagramMeta() : Promise.resolve({ serie: [], publicacoes: [] }),
        novoEstado.produtos.anuncios ? obterAnunciosMeta() : Promise.resolve({ serie: [] }),
        novoEstado.produtos.facebook ? obterFacebookMeta() : Promise.resolve({ serie: [], publicacoes: [] }),
      ]);
      setInstagram(ig);
      setAnuncios(ads);
      setFacebook(fb);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir os dados da Meta.");
    }
  };

  useEffect(() => { void carregar(); }, [workspaceAtivo]);

  const abas = useMemo(() => {
    const itens: Array<[Aba, string]> = [["geral", "Visão geral"]];
    if (estado?.produtos.instagram) itens.push(["instagram", "Instagram"]);
    if (estado?.produtos.anuncios) itens.push(["anuncios", "Anúncios"]);
    if (estado?.produtos.facebook) itens.push(["facebook", "Facebook"]);
    return itens;
  }, [estado]);
  const temProduto = estado && Object.values(estado.produtos).some(Boolean);
  const atualizadaEm = estado?.vinculo.ultimaColeta?.quando;
  const alcanceInstagram = semanas(instagram.serie, "alcance");
  const gastoAnuncios = semanas(anuncios.serie, "gasto");
  const resultadosAnuncios = semanas(anuncios.serie, "resultados");
  const alcanceFacebook = semanas(facebook.serie, "alcance");
  const seguidoresAtual = numero(instagram.serie.at(-1)?.seguidores);
  const seguidoresAnterior = numero(instagram.serie.at(-8)?.seguidores);

  return (
    // tela-fluxo: o conteiner padrao que cobre o canvas do cockpit por baixo,
    // como CRM e Calendario. Sem ele os nos flutuantes vazam por cima.
    <main className="tela-fluxo tela-meta">
      <header className="meta-cabecalho">
        <div>
          <span className="meta-sobretitulo">Desempenho</span>
          <h1>Meta</h1>
          <p>Instagram, anúncios e Facebook em uma leitura clara.</p>
        </div>
      </header>

      {ehOperador && workspaceAtivo && <ConfiguracaoMeta workspaceId={workspaceAtivo} aoAtualizar={carregar} />}

      {erro && <section className="meta-estado erro"><h2>Conexão com problema</h2><p>{ehOperador ? erro : "Os dados estão temporariamente indisponíveis. Tente novamente mais tarde."}</p></section>}
      {!erro && estado && !temProduto && (
        <section className="meta-estado">
          <h2>Ainda não conectado</h2>
          <p>A VirtuoKingdom faz essa conexão junto com você durante a implementação.</p>
        </section>
      )}
      {!erro && temProduto && (
        <>
          <nav className="meta-abas" aria-label="Produtos da Meta">
            {abas.map(([id, nome]) => (
              <button key={id} className={aba === id ? "ativo" : ""} onClick={() => setAba(id)}>{nome}</button>
            ))}
          </nav>
          {aba === "geral" && (
            <section className="meta-resumo">
              {estado.produtos.instagram && <>
                <Cartao rotulo="Seguidores no Instagram" valor={seguidoresAtual} mudanca={variacao(seguidoresAtual, seguidoresAnterior)} />
                <Cartao rotulo="Alcance no Instagram" valor={alcanceInstagram.atual} mudanca={alcanceInstagram.variacao} />
              </>}
              {estado.produtos.anuncios && <>
                <Cartao rotulo="Gasto em anúncios" valor={gastoAnuncios.atual} moeda mudanca={gastoAnuncios.variacao} />
                <Cartao rotulo="Resultados dos anúncios" valor={resultadosAnuncios.atual} mudanca={resultadosAnuncios.variacao} />
              </>}
              {estado.produtos.facebook && <Cartao rotulo="Alcance da Página" valor={alcanceFacebook.atual} mudanca={alcanceFacebook.variacao} />}
            </section>
          )}
          {aba === "instagram" && <VisaoInstagram {...instagram} />}
          {aba === "anuncios" && <VisaoAnuncios {...anuncios} />}
          {aba === "facebook" && <VisaoFacebook {...facebook} />}
        </>
      )}
      <footer className="meta-rodape">
        {atualizadaEm
          ? `Dados da Meta, atualizados em ${new Date(atualizadaEm).toLocaleString("pt-BR")}.`
          : "Dados da Meta, aguardando a primeira coleta."}
      </footer>
    </main>
  );
}
