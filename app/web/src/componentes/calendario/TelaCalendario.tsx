import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../estilos/calendario.css";
import { usarEstado } from "../../estado/contexto";
import {
  obterCalendario,
  obterEventos,
  criarEvento,
  atualizarEvento,
  excluirEvento,
  sincronizarCrm,
  sincronizarGoogle,
  ErroCalendario,
  type Evento,
  type DadosEvento,
} from "../../api/calendario";
import { IconeAlerta, IconeMais, IconeChevron, IconeX } from "../comum/Icones";
import {
  NOMES_DIAS,
  chaveDia,
  dataDoIso,
  ehDiaInteiro,
  gradeDoMes,
  intervaloDaGrade,
  rotuloMes,
  horaCurta,
  dataHoraLonga,
  diaPorExtenso,
  mesmoDia,
  paraInputLocal,
  proximaHoraCheia,
} from "./datas";

// Quantos chips de evento cabem numa celula antes do "+N".
const MAX_CHIPS = 3;
// Poll discreto: recarrega o mes visivel a cada 60s.
const POLL_MS = 60000;

// Alvo do formulario: novo evento (com data opcional ja preenchida) ou edicao
// de um evento existente.
type AlvoForm = { evento?: Evento; data?: Date } | null;

// Tela do calendario: agenda do cliente em visao de mes, local-first. Funciona
// sem Google (agenda local); o Google e uma opcao de sincronizacao ao lado da
// do CRM. A visao de mes renderiza sempre.
export function TelaCalendario() {
  const { workspaceAtivo } = usarEstado();
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [contaEmail, setContaEmail] = useState("");
  const [ref, setRef] = useState<Date>(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [eventoAberto, setEventoAberto] = useState<Evento | null>(null);
  const [alvoForm, setAlvoForm] = useState<AlvoForm>(null);

  // Sincronizacao CRM -> agenda: estado do toggle, carga do POST e o aviso
  // temporario com o resumo (some sozinho depois de alguns segundos).
  const [sincCrm, setSincCrm] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [avisoSinc, setAvisoSinc] = useState<string | null>(null);

  // Sincronizacao com o Google Calendar: toggle, carga do POST, aviso temporario
  // com o resumo e o pedido inline pra conectar (quando tenta ligar sem conexao).
  const [sincGoogle, setSincGoogle] = useState(false);
  const [sincGoogleCarregando, setSincGoogleCarregando] = useState(false);
  const [avisoGoogle, setAvisoGoogle] = useState<string | null>(null);
  const [pedirConexao, setPedirConexao] = useState(false);

  const hoje = useMemo(() => new Date(), []);

  // Estado da conexao. 409 (sem workspace) cai como nao conectado, sem drama.
  const carregarEstado = useCallback(async () => {
    setCarregando(true);
    setErroApi(null);
    try {
      const est = await obterCalendario();
      setConectado(est.conectado);
      setContaEmail(est.contaEmail);
      setSincCrm(est.sincronizarCrm);
      setSincGoogle(est.sincronizarGoogle);
    } catch {
      setConectado(false);
      setContaEmail("");
      setSincCrm(false);
      setSincGoogle(false);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Eventos do intervalo visivel. discreto: nao zera a lista atual enquanto
  // busca, so acende o indicador sutil. Erro real vira banner com link.
  const carregarEventos = useCallback(
    async (mes: Date) => {
      setCarregandoEventos(true);
      const { deIso, ateIso } = intervaloDaGrade(mes);
      try {
        const lista = await obterEventos(deIso, ateIso);
        setEventos(lista);
        setErroApi(null);
      } catch (e) {
        // Token revogado, conexao caida: banner honesto, mantem o que tinha.
        setErroApi(
          e instanceof Error ? e.message : "Não deu pra carregar a agenda."
        );
      } finally {
        setCarregandoEventos(false);
      }
    },
    []
  );

  useEffect(() => {
    void carregarEstado();
  }, [carregarEstado, workspaceAtivo]);

  // Assim que o estado inicial resolve, carrega os eventos do mes (modo local
  // ou Google, o backend resolve). Recarrega ao trocar de mes.
  useEffect(() => {
    if (conectado === null) return;
    void carregarEventos(ref);
  }, [conectado, ref, carregarEventos]);

  // Poll discreto de 60s e recarga ao recuperar o foco da janela.
  useEffect(() => {
    if (conectado === null) return;
    const t = window.setInterval(() => void carregarEventos(ref), POLL_MS);
    const aoFoco = () => void carregarEventos(ref);
    window.addEventListener("focus", aoFoco);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", aoFoco);
    };
  }, [conectado, ref, carregarEventos]);

  // Ao trocar de workspace, os toggles voltam a estar sem pendencia visual.
  useEffect(() => {
    setAvisoGoogle(null);
    setPedirConexao(false);
  }, [workspaceAtivo]);

  // Eventos agrupados por dia local (chave YYYY-MM-DD), cada grupo ordenado por
  // hora (dia inteiro primeiro).
  const porDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const ev of eventos) {
      const d = dataDoIso(ev.inicioIso);
      if (!d) continue;
      const chave = chaveDia(d);
      const lista = mapa.get(chave) ?? [];
      lista.push(ev);
      mapa.set(chave, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => {
        const ia = ehDiaInteiro(a.inicioIso) ? 0 : 1;
        const ib = ehDiaInteiro(b.inicioIso) ? 0 : 1;
        if (ia !== ib) return ia - ib;
        return (a.inicioIso ?? "").localeCompare(b.inicioIso ?? "");
      });
    }
    return mapa;
  }, [eventos]);

  const dias = useMemo(() => gradeDoMes(ref), [ref]);

  const irMes = (delta: number) =>
    setRef((r) => new Date(r.getFullYear(), r.getMonth() + delta, 1));
  const irHoje = () => {
    const h = new Date();
    setRef(new Date(h.getFullYear(), h.getMonth(), 1));
  };

  // Recarrega apos criar, editar ou excluir.
  const aposMudanca = useCallback(() => {
    void carregarEventos(ref);
  }, [carregarEventos, ref]);

  // O aviso da sincronizacao some sozinho depois de 7s.
  useEffect(() => {
    if (!avisoSinc) return;
    const t = window.setTimeout(() => setAvisoSinc(null), 7000);
    return () => window.clearTimeout(t);
  }, [avisoSinc]);

  // O aviso da sincronizacao com o Google some sozinho depois de 7s.
  useEffect(() => {
    if (!avisoGoogle) return;
    const t = window.setTimeout(() => setAvisoGoogle(null), 7000);
    return () => window.clearTimeout(t);
  }, [avisoGoogle]);

  // Liga ou desliga a sincronizacao com o CRM. Ligar roda a sincronizacao
  // inicial no backend (pode demorar alguns segundos) e mostra o resumo.
  const alternarSincCrm = useCallback(
    async (ligado: boolean) => {
      if (sincronizando) return;
      setSincronizando(true);
      setAvisoSinc(null);
      try {
        const res = await sincronizarCrm(ligado);
        setSincCrm(res.ligado);
        if (ligado) {
          const criados = res.criados ?? 0;
          const atualizados = res.atualizados ?? 0;
          const erros = res.erros ?? 0;
          const partes: string[] = [];
          if (criados > 0) {
            partes.push(
              criados === 1
                ? "1 compromisso criado"
                : `${criados} compromissos criados`
            );
          }
          if (atualizados > 0) {
            partes.push(`${atualizados} atualizados`);
          }
          let texto =
            partes.length > 0 ? partes.join(", ") : "Tudo já estava em dia";
          if (erros > 0) texto += `, ${erros} falharam`;
          setAvisoSinc(texto);
          // Os compromissos novos devem aparecer na grade do mes.
          void carregarEventos(ref);
        } else {
          setAvisoSinc(
            "Sincronização desligada. Os compromissos já criados ficam na agenda."
          );
        }
      } catch (e) {
        setErroApi(
          e instanceof Error ? e.message : "Não deu pra sincronizar agora."
        );
      } finally {
        setSincronizando(false);
      }
    },
    [sincronizando, carregarEventos, ref]
  );

  // Liga ou desliga a sincronizacao com o Google Calendar. Ligar sem conexao
  // nao liga: mostra o pedido inline pra conectar em Conexoes. Ligar conectado
  // envia a agenda local pro Google e recarrega o mes (a fonte muda de local
  // pra Google). Desligar mantem a agenda local intacta.
  const alternarSincGoogle = useCallback(
    async (ligado: boolean) => {
      if (sincGoogleCarregando) return;
      // Tentou ligar sem estar conectado: nao liga, pede pra conectar antes.
      if (ligado && !conectado) {
        setPedirConexao(true);
        return;
      }
      setPedirConexao(false);
      setSincGoogleCarregando(true);
      setAvisoGoogle(null);
      try {
        const res = await sincronizarGoogle(ligado);
        setSincGoogle(res.ligado);
        if (res.ligado) {
          const enviados = res.enviados ?? 0;
          const erros = res.erros ?? 0;
          let texto =
            enviados > 0
              ? enviados === 1
                ? "1 evento enviado pro Google"
                : `${enviados} eventos enviados pro Google`
              : "Tudo já estava em dia";
          if (erros > 0) texto += `, ${erros} falharam`;
          setAvisoGoogle(texto);
        } else {
          setAvisoGoogle(
            "Sincronização com o Google desligada. Sua agenda local continua aqui e nada foi apagado."
          );
        }
        // A lista muda de fonte (local <-> Google): recarrega o mes visivel.
        void carregarEventos(ref);
      } catch (e) {
        // Backend recusou por falta de conexao: pede pra conectar em Conexoes.
        if (e instanceof ErroCalendario && e.status === 409) {
          setPedirConexao(true);
        } else {
          setErroApi(
            e instanceof Error
              ? e.message
              : "Não deu pra sincronizar com o Google agora."
          );
        }
      } finally {
        setSincGoogleCarregando(false);
      }
    },
    [sincGoogleCarregando, conectado, carregarEventos, ref]
  );

  if (carregando && conectado === null) {
    return (
      <section className="tela-fluxo cal-tela">
        <div className="cal-carregando-cheio">
          <span className="giro" />
        </div>
      </section>
    );
  }

  // Subtitulo mostra a conta do Google so quando a sincronizacao esta ligada e
  // ha conta conectada. No modo local, deixa claro que a agenda vive aqui.
  const mostrarConta = sincGoogle && conectado && !!contaEmail;

  const eventosDoDia = diaSelecionado
    ? porDia.get(chaveDia(diaSelecionado)) ?? []
    : [];

  return (
    <section className="tela-fluxo cal-tela">
      <header className="tela-fluxo-topo cal-topo">
        <div className="cal-topo-titulo">
          <div>
            <h1>Calendário</h1>
            <p className="subtitulo">
              {mostrarConta
                ? `Conectado como ${contaEmail}`
                : "Sua agenda local, aqui no hub"}
            </p>
          </div>
        </div>
        <div className="cal-topo-acoes">
          <div className="cal-sincs">
            <div
              className="cal-sinc"
              title="Cartões do CRM com próximo contato viram compromissos na agenda"
            >
              <label className="cal-switch">
                <input
                  type="checkbox"
                  checked={sincCrm}
                  disabled={sincronizando}
                  onChange={(e) => void alternarSincCrm(e.target.checked)}
                />
                <span className="cal-switch-trilho">
                  <span className="cal-switch-bola" />
                </span>
              </label>
              <span className="cal-sinc-rotulo">Sincronizar com CRM</span>
              {sincronizando && <span className="cal-giro-mini" />}
              {avisoSinc && !sincronizando && (
                <span className="cal-sinc-aviso">{avisoSinc}</span>
              )}
            </div>
            <div
              className="cal-sinc"
              title="Envia a agenda do hub pro Google Calendar e mostra os compromissos do Google aqui"
            >
              <label className="cal-switch">
                <input
                  type="checkbox"
                  checked={sincGoogle}
                  disabled={sincGoogleCarregando}
                  onChange={(e) => void alternarSincGoogle(e.target.checked)}
                />
                <span className="cal-switch-trilho">
                  <span className="cal-switch-bola" />
                </span>
              </label>
              <span className="cal-sinc-rotulo">Sincronizar com Google Calendar</span>
              {sincGoogleCarregando && <span className="cal-giro-mini" />}
              {avisoGoogle && !sincGoogleCarregando && (
                <span className="cal-sinc-aviso">{avisoGoogle}</span>
              )}
            </div>
          </div>
          <div className="cal-nav">
            <button
              className="cal-nav-btn"
              onClick={() => irMes(-1)}
              title="Mês anterior"
              aria-label="Mês anterior"
            >
              <IconeChevron className="" />
            </button>
            <span className="cal-nav-mes">{rotuloMes(ref)}</span>
            <button
              className="cal-nav-btn cal-nav-prox"
              onClick={() => irMes(1)}
              title="Próximo mês"
              aria-label="Próximo mês"
            >
              <IconeChevron className="" />
            </button>
            <button className="botao botao-neutro cal-btn-hoje" onClick={irHoje}>
              Hoje
            </button>
            {carregandoEventos && <span className="cal-giro-mini" />}
          </div>
          <button
            className="botao botao-principal cal-btn-novo"
            onClick={() => setAlvoForm({})}
          >
            <IconeMais className="" />
            Novo evento
          </button>
        </div>
      </header>

      <div className="cal-corpo">
        {pedirConexao && (
          <div className="cal-banner-conectar">
            <IconeAlerta className="cal-banner-icone-menta" />
            <span>
              Conecte o Google Calendar na tela Conexões antes de ligar a
              sincronização.
            </span>
            <a
              className="botao botao-principal cal-banner-btn"
              href="#/conexoes"
              onClick={() => setPedirConexao(false)}
            >
              Conectar em Conexões
            </a>
          </div>
        )}

        {erroApi && (
          <div className="cal-banner-erro">
            <IconeAlerta className="cal-banner-icone" />
            <span>{erroApi}</span>
            <a className="cal-banner-link" href="#/conexoes">
              Ir pra Conexões
            </a>
          </div>
        )}

        <div className="cal-grade" role="grid">
          <div className="cal-cabecalho-dias" role="row">
            {NOMES_DIAS.map((nome) => (
              <div key={nome} className="cal-dia-nome" role="columnheader">
                {nome}
              </div>
            ))}
          </div>
          <div className="cal-semanas">
            {dias.map((dia) => {
              const foraDoMes = dia.getMonth() !== ref.getMonth();
              const ehHoje = mesmoDia(dia, hoje);
              const doDia = porDia.get(chaveDia(dia)) ?? [];
              const visiveis = doDia.slice(0, MAX_CHIPS);
              const extra = doDia.length - visiveis.length;
              return (
                <button
                  key={chaveDia(dia)}
                  className={`cal-celula${foraDoMes ? " fora" : ""}${
                    ehHoje ? " hoje" : ""
                  }`}
                  onClick={() => setDiaSelecionado(dia)}
                  role="gridcell"
                >
                  <span className="cal-celula-num">{dia.getDate()}</span>
                  <div className="cal-celula-chips">
                    {visiveis.map((ev) => (
                      <span
                        key={ev.id}
                        className={`cal-chip${
                          ehDiaInteiro(ev.inicioIso) ? " dia-inteiro" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventoAberto(ev);
                        }}
                        title={ev.titulo}
                      >
                        {!ehDiaInteiro(ev.inicioIso) && (
                          <span className="cal-chip-hora">
                            {horaCurta(ev.inicioIso)}
                          </span>
                        )}
                        <span className="cal-chip-titulo">{ev.titulo}</span>
                      </span>
                    ))}
                    {extra > 0 && (
                      <span
                        className="cal-chip-mais"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDiaSelecionado(dia);
                        }}
                      >
                        +{extra}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {diaSelecionado && (
        <PainelDia
          dia={diaSelecionado}
          eventos={eventosDoDia}
          aoFechar={() => setDiaSelecionado(null)}
          aoAbrirEvento={(ev) => setEventoAberto(ev)}
          aoNovoEvento={() => setAlvoForm({ data: diaSelecionado })}
        />
      )}

      {eventoAberto && (
        <DetalheEvento
          evento={eventoAberto}
          aoFechar={() => setEventoAberto(null)}
          aoEditar={() => {
            setAlvoForm({ evento: eventoAberto });
            setEventoAberto(null);
          }}
          aoExcluido={() => {
            setEventoAberto(null);
            aposMudanca();
          }}
        />
      )}

      {alvoForm && (
        <FormularioEvento
          evento={alvoForm.evento}
          dataBase={alvoForm.data}
          aoFechar={() => setAlvoForm(null)}
          aoSalvo={() => {
            setAlvoForm(null);
            aposMudanca();
          }}
        />
      )}
    </section>
  );
}

// Painel lateral do dia: lista completa dos eventos daquele dia e o botao de
// novo evento ja com a data. Desliza da direita, scrim solido (sem blur).
function PainelDia({
  dia,
  eventos,
  aoFechar,
  aoAbrirEvento,
  aoNovoEvento,
}: {
  dia: Date;
  eventos: Evento[];
  aoFechar: () => void;
  aoAbrirEvento: (ev: Evento) => void;
  aoNovoEvento: () => void;
}) {
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [aoFechar]);

  return (
    <div className="cal-drawer-scrim" onClick={aoFechar}>
      <aside className="cal-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="cal-drawer-topo">
          <div>
            <h2 className="cal-drawer-dia">{dia.getDate()}</h2>
            <p className="cal-drawer-extenso">{diaPorExtenso(dia)}</p>
          </div>
          <button
            className="botao-fantasma cal-drawer-x"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <IconeX className="" />
          </button>
        </header>

        <div className="cal-drawer-corpo">
          {eventos.length === 0 ? (
            <p className="cal-drawer-vazio">Nenhum compromisso neste dia.</p>
          ) : (
            <ul className="cal-drawer-lista">
              {eventos.map((ev) => (
                <li key={ev.id}>
                  <button
                    className="cal-drawer-item"
                    onClick={() => aoAbrirEvento(ev)}
                  >
                    <span className="cal-drawer-item-hora">
                      {ehDiaInteiro(ev.inicioIso)
                        ? "Dia inteiro"
                        : horaCurta(ev.inicioIso)}
                    </span>
                    <span className="cal-drawer-item-info">
                      <span className="cal-drawer-item-titulo">{ev.titulo}</span>
                      {ev.descricao && (
                        <span className="cal-drawer-item-desc">
                          {ev.descricao}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="cal-drawer-rodape">
          <button
            className="botao botao-principal cal-drawer-novo"
            onClick={aoNovoEvento}
          >
            <IconeMais className="" />
            Novo evento
          </button>
        </footer>
      </aside>
    </div>
  );
}

// Detalhe de um evento: titulo, horario, descricao, link do Google, editar e
// excluir com confirmacao em dois cliques.
function DetalheEvento({
  evento,
  aoFechar,
  aoEditar,
  aoExcluido,
}: {
  evento: Evento;
  aoFechar: () => void;
  aoEditar: () => void;
  aoExcluido: () => void;
}) {
  const [armado, setArmado] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const diaInteiro = ehDiaInteiro(evento.inicioIso);

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [aoFechar]);

  // Armou e nao confirmou: desarma sozinho em 4s (padrao do app).
  useEffect(() => {
    if (!armado) return;
    const t = window.setTimeout(() => setArmado(false), 4000);
    return () => window.clearTimeout(t);
  }, [armado]);

  const clicarExcluir = async () => {
    if (apagando) return;
    if (!armado) {
      setArmado(true);
      return;
    }
    setApagando(true);
    setErro(null);
    try {
      await excluirEvento(evento.id);
      aoExcluido();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu pra excluir.");
      setApagando(false);
      setArmado(false);
    }
  };

  return (
    <div className="cal-overlay" onClick={aoFechar}>
      <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cal-modal-topo">
          <h2 className="cal-modal-titulo">{evento.titulo}</h2>
          <button
            className="botao-fantasma cal-modal-x"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <IconeX className="" />
          </button>
        </header>

        <div className="cal-modal-corpo">
          <div className="cal-detalhe-linha">
            <span className="cal-detalhe-rot">Quando</span>
            <span className="cal-detalhe-val">
              {diaInteiro
                ? `${dataHoraLonga(evento.inicioIso)}, dia inteiro`
                : `${dataHoraLonga(evento.inicioIso)} até ${horaCurta(
                    evento.fimIso
                  ) || dataHoraLonga(evento.fimIso)}`}
            </span>
          </div>
          {evento.descricao && (
            <div className="cal-detalhe-linha">
              <span className="cal-detalhe-rot">Descrição</span>
              <span className="cal-detalhe-val">{evento.descricao}</span>
            </div>
          )}
          {evento.link && (
            <a
              className="cal-detalhe-link"
              href={evento.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir no Google
            </a>
          )}
          {erro && <p className="cal-erro">{erro}</p>}
        </div>

        <footer className="cal-modal-rodape">
          <button
            className={`botao botao-perigo cal-excluir${armado ? " armado" : ""}`}
            onClick={() => void clicarExcluir()}
            disabled={apagando}
          >
            {apagando ? "Excluindo..." : armado ? "Confirmar?" : "Excluir"}
          </button>
          <button className="botao botao-principal" onClick={aoEditar}>
            Editar
          </button>
        </footer>
      </div>
    </div>
  );
}

// Formulario de novo evento ou edicao. datetime-local e local: a conversao pra
// ISO usa new Date(valor).toISOString(), que aplica o offset da maquina.
function FormularioEvento({
  evento,
  dataBase,
  aoFechar,
  aoSalvo,
}: {
  evento?: Evento;
  dataBase?: Date;
  aoFechar: () => void;
  aoSalvo: () => void;
}) {
  const editando = !!evento;

  // Valores iniciais. Editando: parte do evento. Novo: 1h a partir da proxima
  // hora cheia (no dia clicado, se veio um).
  const inicial = useMemo(() => {
    if (evento) {
      const ini = dataDoIso(evento.inicioIso) ?? new Date();
      const fim =
        dataDoIso(evento.fimIso) ?? new Date(ini.getTime() + 60 * 60 * 1000);
      return {
        titulo: evento.titulo,
        inicio: paraInputLocal(ini),
        fim: paraInputLocal(fim),
        descricao: evento.descricao ?? "",
      };
    }
    const ini = proximaHoraCheia(dataBase);
    const fim = new Date(ini.getTime() + 60 * 60 * 1000);
    return {
      titulo: "",
      inicio: paraInputLocal(ini),
      fim: paraInputLocal(fim),
      descricao: "",
    };
  }, [evento, dataBase]);

  const [titulo, setTitulo] = useState(inicial.titulo);
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const [descricao, setDescricao] = useState(inicial.descricao);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const refTitulo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refTitulo.current?.focus();
  }, []);

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [aoFechar]);

  // Ao mudar o inicio, empurra o fim junto se ele ficou antes (1h de folga).
  const aoMudarInicio = (valor: string) => {
    setInicio(valor);
    const di = new Date(valor);
    const df = new Date(fim);
    if (!isNaN(di.getTime()) && (isNaN(df.getTime()) || df <= di)) {
      setFim(paraInputLocal(new Date(di.getTime() + 60 * 60 * 1000)));
    }
  };

  const salvar = async () => {
    if (salvando) return;
    const t = titulo.trim();
    if (!t) {
      setErro("Dê um título ao evento.");
      return;
    }
    const di = new Date(inicio);
    const df = new Date(fim);
    if (isNaN(di.getTime()) || isNaN(df.getTime())) {
      setErro("Confira a data e a hora.");
      return;
    }
    if (df <= di) {
      setErro("O fim tem que ser depois do início.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados: DadosEvento = {
      titulo: t,
      inicioIso: di.toISOString(),
      fimIso: df.toISOString(),
      descricao: descricao.trim() || undefined,
    };
    try {
      if (evento) {
        await atualizarEvento(evento.id, dados);
      } else {
        await criarEvento(dados);
      }
      aoSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu pra salvar.");
      setSalvando(false);
    }
  };

  return (
    <div className="cal-overlay" onClick={aoFechar}>
      <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cal-modal-topo">
          <h2 className="cal-modal-titulo">
            {editando ? "Editar evento" : "Novo evento"}
          </h2>
          <button
            className="botao-fantasma cal-modal-x"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <IconeX className="" />
          </button>
        </header>

        <div className="cal-modal-corpo">
          <div className="cal-campo">
            <label className="cal-rotulo" htmlFor="cal-titulo">
              Título
            </label>
            <input
              id="cal-titulo"
              ref={refTitulo}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Reunião com o cliente"
              spellCheck={false}
            />
          </div>
          <div className="cal-campo-dupla">
            <div className="cal-campo">
              <label className="cal-rotulo" htmlFor="cal-inicio">
                Início
              </label>
              <input
                id="cal-inicio"
                type="datetime-local"
                value={inicio}
                onChange={(e) => aoMudarInicio(e.target.value)}
              />
            </div>
            <div className="cal-campo">
              <label className="cal-rotulo" htmlFor="cal-fim">
                Fim
              </label>
              <input
                id="cal-fim"
                type="datetime-local"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            </div>
          </div>
          <div className="cal-campo">
            <label className="cal-rotulo" htmlFor="cal-desc">
              Descrição
            </label>
            <textarea
              id="cal-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          {erro && <p className="cal-erro">{erro}</p>}
        </div>

        <footer className="cal-modal-rodape">
          <button className="botao botao-neutro" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            className="botao botao-principal"
            onClick={() => void salvar()}
            disabled={salvando}
          >
            {salvando ? "Salvando..." : editando ? "Salvar" : "Criar evento"}
          </button>
        </footer>
      </div>
    </div>
  );
}

