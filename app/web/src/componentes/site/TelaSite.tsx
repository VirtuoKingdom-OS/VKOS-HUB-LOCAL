// Tela do site gerado pelo Site Guiado: tela cheia irma do Studio. Dois modos:
// Visualizar (o de sempre: presets Desktop/Mobile, seletor de paginas, abrir em
// nova aba, atualizacao ao vivo, painel Ajustar com IA) e Editar (liga o
// usarMotorSite no iframe da pagina atual, zoom Ajustar/50/75/100, painel de
// propriedades a direita, Ctrl+S salva pela rota de pagina, Ctrl+Z desfaz).
// O painel Ajustar com IA existe nos dois modos: no Editar ele TROCA com o de
// propriedades (abrir o de IA esconde o de propriedades, fechar volta pra ele).
// Disparar o ajuste com edicao nao salva exige salvar antes (guarda de estado
// sujo). Durante o ajuste a edicao fica travada e o eco do proprio ajuste nao
// dispara o aviso de conflito; ao concluir, o editor recarrega com o resultado.
// Guarda de estado sujo em toda troca que perderia edicao, e aviso de conflito
// externo sem recarregar por cima do trabalho.
// Interface { pasta } e o export default sao contrato da rodada 17.
// Toda cor via tokens de tema, funciona nos 3 temas, sem backdrop-filter.

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type RefObject,
} from "react";
import { usarEstado } from "../../estado/contexto";
import { type ModeloIA } from "../../api/cliente";
import type { Peca } from "../../tipos/dominio";
import { formatarTema } from "../telas/fluxos";
import { usarMotorSite } from "../editor/motorSite";
import { PainelSite } from "./PainelSite";
import { IconeSeta, IconeGaleria, IconeRaio, IconeX, IconeOlho, IconeLapis } from "../comum/Icones";
import "../../estilos/site.css";

interface Props {
  // Subpasta da peca (um segmento decodificado), ex "2026-07-14-tema-curto".
  pasta: string;
}

// Presets de viewport. Desktop e o padrao; mobile encolhe menos.
const DESKTOP = { largura: 1440, altura: 900 };
const MOBILE = { largura: 390, altura: 844 };

type Preset = "desktop" | "mobile";
type Modo = "ver" | "editar";
interface Dim {
  largura: number;
  altura: number;
}

// Zoom do modo Editar, no padrao do Studio: fit (Ajustar) e fixos.
type ZoomModo = "fit" | "50" | "75" | "100";
const ZOOMS: { id: ZoomModo; rotulo: string }[] = [
  { id: "fit", rotulo: "Ajustar" },
  { id: "50", rotulo: "50%" },
  { id: "75", rotulo: "75%" },
  { id: "100", rotulo: "100%" },
];

// Modelos pro ajuste com IA. Padrao Sonnet (contrato).
const MODELOS: { id: ModeloIA; rotulo: string }[] = [
  { id: "haiku", rotulo: "Haiku" },
  { id: "sonnet", rotulo: "Sonnet" },
  { id: "opus", rotulo: "Opus" },
];

// Pagina inicial de uma peca de site: a index.html se existir, senao a primeira
// pagina em ordem natural.
function paginaInicial(peca: Peca): string | undefined {
  if (peca.previews.length === 0) return undefined;
  const index = peca.previews.find((u) => /(^|\/)index\.html?($|\?)/i.test(u));
  return index ?? peca.previews[0];
}

// Nome do arquivo .html de uma preview de pagina (ultimo segmento, sem query).
function nomeArquivo(url: string): string {
  return (url.split("/").pop() ?? url).split(/[?#]/)[0];
}

// Nome amigavel da pagina: index.html vira "Início"; o resto capitaliza o nome
// do arquivo (hifens e sublinhados viram espaco).
function nomeAmigavel(url: string): string {
  const base = nomeArquivo(url).replace(/\.html?$/i, "");
  if (/^index$/i.test(base)) return "Início";
  const limpo = base.replace(/[-_]+/g, " ").trim();
  if (!limpo) return nomeArquivo(url);
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

// Cache-bust: acrescenta um timestamp pra forcar o iframe a recarregar quando a
// peca e regenerada, sem depender do navegador soltar o cache.
function comCacheBust(url: string, ts: number): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}vk=${ts}`;
}

// Acao pendente atras da guarda de estado sujo.
type AcaoPendente =
  | { tipo: "ver" }
  | { tipo: "pagina"; alvo: string }
  | { tipo: "sair" }
  | { tipo: "ajustar" };

interface EstadoEditor {
  naoSalvo: boolean;
  podeDesfazer: boolean;
  pronto: boolean;
}

interface HandleEditor {
  salvar: () => Promise<boolean>;
  desfazer: () => void;
}

export default function TelaSite({ pasta }: Props) {
  const { pecas, carregandoInicial, trocandoWorkspace, criarSessao, sessoes } =
    usarEstado();

  const peca = useMemo(() => pecas.find((p) => p.pasta === pasta), [pecas, pasta]);
  const carregandoPeca = carregandoInicial || trocandoWorkspace;

  const paginas = peca?.previews ?? [];
  const [pagina, setPagina] = useState<string>(
    () => (peca ? paginaInicial(peca) : undefined) ?? ""
  );
  const [preset, setPreset] = useState<Preset>("desktop");
  const [fator, setFator] = useState(0);
  const [ts, setTs] = useState(() => Date.now());

  // ===== Modo Editar.
  const [modo, setModo] = useState<Modo>("ver");
  const [estadoEd, setEstadoEd] = useState<EstadoEditor>({
    naoSalvo: false,
    podeDesfazer: false,
    pronto: false,
  });
  const [salvandoEd, setSalvandoEd] = useState(false);
  const [erroEd, setErroEd] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<AcaoPendente | null>(null);
  const [conflito, setConflito] = useState(false);
  // Forca o remonte do editor com carga limpa (troca de pagina discard, recarga
  // de conflito). Muda de valor => novo motor, naoSalvo volta a falso.
  const [recargaEd, setRecargaEd] = useState(0);
  const refEditor = useRef<HandleEditor>(null);
  // Espelhos pros efeitos que so dependem de "pecas" lerem o valor atual.
  const modoRef = useRef(modo);
  modoRef.current = modo;
  const naoSalvoRef = useRef(false);
  naoSalvoRef.current = estadoEd.naoSalvo;
  // Ignora a proxima atualizacao de pecas: e o eco do nosso proprio salvar
  // (o backend transmite pecas:atualizadas), nao um conflito externo.
  const ignorarProximaPeca = useRef(false);
  // Ha um ajuste com IA rodando: as atualizacoes de pecas durante ele sao eco
  // do proprio ajuste (a IA reescreve o arquivo), nunca conflito externo.
  const ajustandoRef = useRef(false);

  const dim: Dim = preset === "desktop" ? DESKTOP : MOBILE;

  // Painel de ajuste com IA (estado LOCAL da tela).
  const [painelAberto, setPainelAberto] = useState(false);
  const [pedido, setPedido] = useState("");
  const [modelo, setModelo] = useState<ModeloIA>("sonnet");
  const [ajustando, setAjustando] = useState(false);
  const [sessaoAjuste, setSessaoAjuste] = useState<string | null>(null);
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);
  const [ajusteFeito, setAjusteFeito] = useState(false);
  // Espelho pro efeito de pecas (dep so em "pecas") saber se ha ajuste rodando.
  ajustandoRef.current = ajustando;

  const refViewport = useRef<HTMLDivElement>(null);

  // Se a pagina escolhida sumiu (peca regenerada com outras paginas), volta pra
  // inicial. So mexe quando a peca existe.
  useEffect(() => {
    if (!peca) return;
    if (pagina && paginas.includes(pagina)) return;
    const nova = paginaInicial(peca);
    if (nova) setPagina(nova);
  }, [peca, paginas, pagina]);

  // Atualizacao ao vivo: a lista global de pecas troca de referencia sempre que
  // o backend emite pecas:atualizadas. No modo Visualizar, recarrega o iframe
  // via cache-bust. No modo Editar, NUNCA recarrega por cima de trabalho nao
  // salvo: mostra o aviso de conflito. Sem trabalho pendente, recarrega limpo.
  const primeiraCarga = useRef(true);
  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    if (ignorarProximaPeca.current) {
      ignorarProximaPeca.current = false;
      return;
    }
    // Ajuste com IA em andamento: cada reescrita do arquivo emite pecas, mas e
    // eco do nosso proprio ajuste. Nao e conflito e nao remonta no meio: o
    // recarregamento com o resultado acontece so ao concluir (efeito de sessoes).
    if (ajustandoRef.current) return;
    if (modoRef.current === "editar") {
      if (naoSalvoRef.current) setConflito(true);
      else setRecargaEd((x) => x + 1);
    } else {
      setTs(Date.now());
    }
  }, [pecas]);

  // Recalcula a escala do modo Visualizar pra pagina caber inteira. Nunca passa
  // de 1. O modo Editar tem escala propria (por zoom), calculada no editor.
  useEffect(() => {
    if (modo !== "ver") return;
    const area = refViewport.current;
    if (!area) return;
    const recalc = () => {
      const larg = area.clientWidth - 48;
      const alt = area.clientHeight - 48;
      if (larg <= 0 || alt <= 0) return;
      const f = Math.min(larg / dim.largura, alt / dim.altura, 1);
      setFator(f > 0 ? f : 0);
    };
    const ro = new ResizeObserver(recalc);
    ro.observe(area);
    recalc();
    return () => ro.disconnect();
  }, [dim, modo]);

  // Acompanha a conclusao da sessao de ajuste pela lista global de sessoes.
  useEffect(() => {
    if (!sessaoAjuste) return;
    const s = sessoes.find((x) => x.id === sessaoAjuste);
    if (!s) return;
    if (s.status === "concluida") {
      setTs(Date.now());
      // No modo Editar, recarrega o editor com o resultado do disco. O eco de
      // pecas foi ignorado durante o ajuste; aqui e a recarga limpa e unica.
      if (modoRef.current === "editar") setRecargaEd((x) => x + 1);
      setAjustando(false);
      setSessaoAjuste(null);
      setAjusteFeito(true);
      setPedido("");
    } else if (s.status === "erro" || s.status === "parada") {
      setAjustando(false);
      setSessaoAjuste(null);
      setErroAjuste(
        s.erro?.trim()
          ? s.erro
          : "O ajuste não foi concluído. Tente de novo com um pedido mais direto."
      );
    }
  }, [sessoes, sessaoAjuste]);

  // ===== Callbacks estaveis passados ao editor. aoEstado entra na dependencia
  // de um efeito do editor: precisa de identidade fixa pra nao criar laco.
  const aoEstadoEditor = useCallback((e: EstadoEditor) => {
    setEstadoEd(e);
  }, []);
  const aoErroEditor = useCallback((msg: string | null) => {
    setErroEd(msg);
  }, []);

  // ===== Salvar do modo Editar. Marca o proximo eco de pecas pra ser ignorado.
  const salvarEd = useCallback(async (): Promise<boolean> => {
    if (salvandoEd) return false;
    setSalvandoEd(true);
    const ok = (await refEditor.current?.salvar()) ?? false;
    if (ok) ignorarProximaPeca.current = true;
    setSalvandoEd(false);
    return ok;
  }, [salvandoEd]);

  // ===== Voltar: mesmo padrao do Studio. history.back() so e seguro com uma
  // entrada anterior DO PROPRIO app; senao vai pro dashboard por hash.
  const voltar = useCallback(() => {
    let mesmaOrigem = false;
    try {
      mesmaOrigem =
        !!document.referrer &&
        new URL(document.referrer).origin === window.location.origin;
    } catch {
      mesmaOrigem = false;
    }
    if (window.history.length > 1 && mesmaOrigem) window.history.back();
    else window.location.hash = "#/dashboard";
  }, []);

  // ===== Guarda de estado sujo. Executa a acao pendente depois de resolver.
  function aplicarAcao(a: AcaoPendente) {
    if (a.tipo === "sair") {
      voltar();
      return;
    }
    if (a.tipo === "pagina") {
      setPagina(a.alvo);
      return;
    }
    if (a.tipo === "ajustar") {
      // Ja salvou (unico caminho que chega aqui e o Salvar da guarda): dispara.
      void aoAjustar();
      return;
    }
    // "ver": sai do modo Editar. A pagina do Visualizar recarrega do disco pelo
    // ts, refletindo o que ficou salvo.
    setModo("ver");
    setConflito(false);
    setErroEd(null);
    setTs(Date.now());
  }

  // Pede a acao; se ha edicao nao salva, abre a confirmacao antes.
  function pedirAcao(a: AcaoPendente) {
    if (modo === "editar" && estadoEd.naoSalvo) {
      setConfirmar(a);
      return;
    }
    aplicarAcao(a);
  }

  async function confirmarSalvando() {
    const a = confirmar;
    if (!a) return;
    const ok = await salvarEd();
    if (!ok) return; // salvar falhou: mantem a confirmacao aberta
    setConfirmar(null);
    aplicarAcao(a);
  }
  function confirmarDescartando() {
    const a = confirmar;
    if (!a) return;
    setConfirmar(null);
    // Descartar troca de pagina ou recarrega o editor limpo, jogando fora as
    // edicoes locais. "sair" nao precisa: o editor sai de cena.
    if (a.tipo === "pagina" || a.tipo === "ver") {
      setRecargaEd((x) => x + 1);
    }
    aplicarAcao(a);
  }

  // Entrar no modo Editar: fecha o painel de IA (nunca abertos juntos).
  function entrarEditar() {
    if (!pagina) return;
    setPainelAberto(false);
    setErroEd(null);
    setModo("editar");
  }

  const aoAjustar = useCallback(async () => {
    const texto = pedido.trim();
    if (!texto || ajustando) return;
    setErroAjuste(null);
    setAjusteFeito(false);
    setAjustando(true);
    const prompt =
      `Ajuste o site que está em conteudo/${pasta}/: ${texto}. ` +
      `Edite os arquivos existentes dessa pasta, mantenha todo o resto como está. ` +
      `Não crie carrossel.html nem arquivos .md.`;
    try {
      const sessao = await criarSessao({
        titulo: `Ajuste do site: ${formatarTema(peca?.tema ?? pasta)}`,
        prompt,
        modelo,
      });
      setSessaoAjuste(sessao.id);
    } catch {
      setAjustando(false);
      setErroAjuste("Não foi possível iniciar o ajuste. O servidor respondeu com erro.");
    }
  }, [pedido, ajustando, pasta, criarSessao, peca, modelo]);

  // Botao "Ajustar" do painel de IA. No modo Editar com edicao nao salva, a IA
  // trabalha em cima do disco: exige salvar antes, pela guarda de estado sujo
  // (Salvar e continuar / Cancelar). Salvo (ou no modo Visualizar), dispara.
  function solicitarAjuste() {
    if (pedido.trim() === "" || ajustando) return;
    if (modo === "editar" && estadoEd.naoSalvo) {
      setConfirmar({ tipo: "ajustar" });
      return;
    }
    void aoAjustar();
  }

  // ===== Atalhos com foco no app (fora do iframe), so no modo Editar. Ctrl+S
  // salva, Ctrl+Z desfaz, Esc fecha um aviso aberto. Dentro do iframe o motor
  // ja cuida dos mesmos atalhos.
  useEffect(() => {
    if (modo !== "editar") return;
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (estadoEd.naoSalvo && !salvandoEd) void salvarEd();
      } else if (ctrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        refEditor.current?.desfazer();
      } else if (e.key === "Escape") {
        if (confirmar) setConfirmar(null);
        else if (conflito) setConflito(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [modo, estadoEd.naoSalvo, salvandoEd, confirmar, conflito, salvarEd]);

  // Aviso do navegador ao fechar a aba com edicao nao salva.
  useEffect(() => {
    if (modo !== "editar" || !estadoEd.naoSalvo) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [modo, estadoEd.naoSalvo]);

  // ===== Guard: peca inexistente ou sem previews (e ja carregou) => erro.
  if (!carregandoPeca && (!peca || peca.previews.length === 0)) {
    return (
      <section className="tela-site tela-site-erro">
        <div className="site-erro-caixa">
          <IconeGaleria className="site-erro-icone" />
          <h1>Site não encontrado</h1>
          <p>
            Esta peça não existe mais ou ainda não tem páginas pra mostrar. Volte
            pro Dashboard e escolha outra.
          </p>
          <a className="botao botao-principal" href="#/dashboard">
            Voltar pro Dashboard
          </a>
        </div>
      </section>
    );
  }

  const nome = peca
    ? formatarTema(peca.tema)
    : formatarTema(pasta.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
  const pct = Math.round(fator * 100);
  const editando = modo === "editar";

  return (
    <section className="tela-site">
      <header className="site-topo">
        <div className="site-topo-esq">
          <button className="site-voltar" onClick={() => pedirAcao({ tipo: "sair" })} title="Voltar">
            <IconeSeta className="" />
          </button>
          <div className="site-titulo">
            <h1 title={nome}>{nome}</h1>
            {editando ? (
              <span className="site-sub site-sub-estado">
                <span className={`site-ponto${estadoEd.naoSalvo ? " sujo" : ""}`} />
                {estadoEd.naoSalvo ? "Não salvo" : "Tudo salvo"}
              </span>
            ) : (
              pagina && <span className="site-sub">{nomeAmigavel(pagina)}</span>
            )}
          </div>
        </div>

        <div className="site-acoes">
          {/* Toggle Visualizar | Editar, segmentado (padrao da casa). */}
          <div className="site-modo" role="tablist" aria-label="Modo da tela">
            <button
              className={`site-modo-btn${!editando ? " ativo" : ""}`}
              onClick={() => pedirAcao({ tipo: "ver" })}
              role="tab"
              aria-selected={!editando}
            >
              <IconeOlho className="" />
              Visualizar
            </button>
            <button
              className={`site-modo-btn${editando ? " ativo" : ""}`}
              onClick={entrarEditar}
              disabled={!pagina}
              role="tab"
              aria-selected={editando}
            >
              <IconeLapis className="" />
              Editar
            </button>
          </div>

          {!editando && pagina && (
            <a
              className="botao botao-neutro"
              href={comCacheBust(pagina, ts)}
              target="_blank"
              rel="noreferrer"
              title="Abrir a página atual em nova aba"
            >
              <IconeSeta className="site-icone-abrir" />
              Abrir em nova aba
            </a>
          )}

          {/* Ajustar com IA existe nos dois modos. No Editar troca com o painel
              de propriedades; no Visualizar abre a faixa lateral. */}
          <button
            className={`botao ${painelAberto ? "botao-neutro" : editando ? "botao-neutro" : "botao-principal"}`}
            onClick={() => setPainelAberto((v) => !v)}
            title="Ajustar o site com IA"
          >
            <IconeRaio className="" />
            Ajustar com IA
          </button>

          {editando && (
            <button
              className="botao botao-principal"
              onClick={() => void salvarEd()}
              disabled={!estadoEd.naoSalvo || salvandoEd}
              title="Salvar (Ctrl+S)"
            >
              {salvandoEd ? "Salvando..." : "Salvar"}
            </button>
          )}
        </div>
      </header>

      {editando && erroEd && <div className="site-erro-barra">{erroEd}</div>}

      <div className="site-corpo">
        {editando ? (
          <PalcoEditor
            key={`${pagina}|${recargaEd}`}
            ref={refEditor}
            pasta={pasta}
            pagina={pagina}
            paginas={paginas}
            nome={nome}
            dim={dim}
            preset={preset}
            iaAberta={painelAberto}
            travado={ajustando}
            aoTrocarPreset={setPreset}
            aoPedirTrocarPagina={(u) => pedirAcao({ tipo: "pagina", alvo: u })}
            aoFechar={() => pedirAcao({ tipo: "ver" })}
            aoEstado={aoEstadoEditor}
            aoErro={aoErroEditor}
            aoSalvarAtalho={() => {
              if (estadoEd.naoSalvo && !salvandoEd) void salvarEd();
            }}
          />
        ) : (
          <div className="site-palco">
            <div className="site-barra">
              {paginas.length > 1 && (
                <select
                  className="site-select-pagina"
                  value={pagina}
                  onChange={(e) => setPagina(e.target.value)}
                  title="Escolher a página"
                >
                  {paginas.map((u) => (
                    <option key={u} value={u}>
                      {nomeAmigavel(u)}
                    </option>
                  ))}
                </select>
              )}

              <div className="site-presets">
                <button
                  className={`site-preset-btn${preset === "desktop" ? " ativo" : ""}`}
                  onClick={() => setPreset("desktop")}
                >
                  Desktop
                </button>
                <button
                  className={`site-preset-btn${preset === "mobile" ? " ativo" : ""}`}
                  onClick={() => setPreset("mobile")}
                >
                  Mobile
                </button>
              </div>
            </div>

            <div className="site-viewport" ref={refViewport}>
              {pagina && fator > 0 && (
                <div
                  className="site-moldura"
                  style={{
                    width: `${dim.largura * fator}px`,
                    height: `${dim.altura * fator}px`,
                  }}
                >
                  <iframe
                    key={`${pagina}|${ts}`}
                    className="site-frame"
                    src={comCacheBust(pagina, ts)}
                    title={nome}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    style={{
                      width: `${dim.largura}px`,
                      height: `${dim.altura}px`,
                      transform: `scale(${fator})`,
                    }}
                  />
                </div>
              )}
              {pagina && (
                <span className="site-selo">
                  {dim.largura}x{dim.altura}, {pct}%
                </span>
              )}
            </div>
          </div>
        )}

        {painelAberto && (
          <aside className="site-ajuste">
            <header className="site-ajuste-topo">
              <div className="site-ajuste-titulo">
                <IconeRaio className="site-ajuste-icone" />
                <h2>Ajustar com IA</h2>
              </div>
              <button
                className="site-ajuste-fechar"
                onClick={() => setPainelAberto(false)}
                title="Fechar"
              >
                <IconeX className="" />
              </button>
            </header>

            <div className="site-ajuste-corpo">
              <label className="site-ajuste-rotulo" htmlFor="site-pedido">
                O que você quer mudar?
              </label>
              <textarea
                id="site-pedido"
                className="site-ajuste-campo"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                placeholder="Ex: troque o texto do topo, deixe o botão do WhatsApp mais visível, mude a cor de fundo pra um tom mais escuro."
                disabled={ajustando}
                rows={5}
              />

              <span className="site-ajuste-rotulo">Modelo</span>
              <div className="site-modelos">
                {MODELOS.map((m) => (
                  <button
                    key={m.id}
                    className={`site-modelo-btn${modelo === m.id ? " ativo" : ""}`}
                    onClick={() => setModelo(m.id)}
                    disabled={ajustando}
                  >
                    {m.rotulo}
                  </button>
                ))}
              </div>

              {ajustando && (
                <div className="site-ajuste-progresso" aria-label="Ajustando o site">
                  <div className="site-ajuste-progresso-barra" />
                </div>
              )}
              {ajustando && (
                <p className="site-ajuste-nota">
                  A IA está editando o site. Isso leva um instante.
                </p>
              )}
              {ajusteFeito && !ajustando && (
                <p className="site-ajuste-ok">Pronto. O site foi atualizado.</p>
              )}
              {erroAjuste && !ajustando && (
                <p className="site-ajuste-erro">{erroAjuste}</p>
              )}

              <button
                className="botao botao-principal site-ajuste-enviar"
                onClick={solicitarAjuste}
                disabled={ajustando || pedido.trim() === ""}
              >
                {ajustando ? "Ajustando..." : "Ajustar"}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* ===== Aviso de conflito externo (modo Editar, edicao nao salva). ===== */}
      {editando && conflito && (
        <div className="site-conflito">
          <div className="site-conflito-texto">
            <strong>O site mudou por fora.</strong>
            <span>
              Alguma coisa reescreveu esta página enquanto você editava. Recarregar
              descarta suas edições não salvas.
            </span>
          </div>
          <div className="site-conflito-acoes">
            <button className="botao botao-fantasma" onClick={() => setConflito(false)}>
              Manter as minhas
            </button>
            <button
              className="botao botao-neutro"
              onClick={() => {
                setConflito(false);
                setRecargaEd((x) => x + 1);
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      )}

      {/* ===== Confirmacao de estado sujo. ===== */}
      {confirmar && (
        <div className="site-confirm-scrim" onMouseDown={() => setConfirmar(null)}>
          <div className="site-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <h3>
              {confirmar.tipo === "pagina"
                ? "Trocar de página sem salvar?"
                : confirmar.tipo === "sair"
                ? "Sair da tela sem salvar?"
                : confirmar.tipo === "ajustar"
                ? "Salvar antes de ajustar com IA?"
                : "Sair do modo Editar sem salvar?"}
            </h3>
            <p>
              {confirmar.tipo === "ajustar"
                ? "A IA ajusta o site a partir do que está salvo no disco. Salve suas edições pra ela trabalhar em cima delas."
                : "As mudanças que você fez nesta página ainda não foram salvas."}
            </p>
            <div className="site-confirm-acoes">
              <button className="botao botao-fantasma" onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
              {confirmar.tipo !== "ajustar" && (
                <button className="botao botao-perigo" onClick={confirmarDescartando}>
                  Descartar edições
                </button>
              )}
              <button
                className="botao botao-principal"
                onClick={() => void confirmarSalvando()}
                disabled={salvandoEd}
              >
                {salvandoEd
                  ? "Salvando..."
                  : confirmar.tipo === "ajustar"
                  ? "Salvar e continuar"
                  : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Editor: palco do modo Editar. Monta o usarMotorSite no iframe da pagina,
// controla o zoom (Ajustar/50/75/100), reporta o estado pro TelaSite e renderiza
// o painel de propriedades (dono C) a direita. Remontado (key) a cada carga
// limpa (troca de pagina, recarga de conflito): o motor nasce zerado.
// ============================================================================
interface PalcoEditorProps {
  pasta: string;
  pagina: string;
  paginas: string[];
  nome: string;
  dim: Dim;
  preset: Preset;
  // Painel de IA aberto: esconde o de propriedades (os dois trocam de lugar).
  iaAberta: boolean;
  // Ajuste com IA rodando: trava a edicao com um veu sobre o canvas.
  travado: boolean;
  aoTrocarPreset: (p: Preset) => void;
  aoPedirTrocarPagina: (url: string) => void;
  aoFechar: () => void;
  aoEstado: (e: EstadoEditor) => void;
  aoErro: (msg: string | null) => void;
  // Ctrl+S com foco DENTRO do iframe: a tela salva pelo mesmo caminho do atalho
  // com foco no app (salvarEd), que marca o proprio eco de pecas pra ignorar.
  // Sem isso, o eco do salvar remontaria o editor e perderia selecao e desfazer.
  aoSalvarAtalho: () => void;
}

const PalcoEditor = forwardRef<HandleEditor, PalcoEditorProps>(function PalcoEditor(
  {
    pasta,
    pagina,
    paginas,
    nome,
    dim,
    preset,
    iaAberta,
    travado,
    aoTrocarPreset,
    aoPedirTrocarPagina,
    aoFechar,
    aoEstado,
    aoErro,
    aoSalvarAtalho,
  },
  ref
) {
  const refIframe = useRef<HTMLIFrameElement>(null);
  const refArea = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<ZoomModo>("fit");
  const [fator, setFator] = useState(0);
  // Cache-bust fixo por montagem: cada carga limpa (remonte) pega o disco atual.
  const [tsCarga] = useState(() => Date.now());

  const arquivo = nomeArquivo(pagina);

  // Ref pro callback de salvar por atalho (a tela troca de identidade a cada
  // render): o listener do motor sempre le a versao atual sem reanexar.
  const aoSalvarAtalhoRef = useRef(aoSalvarAtalho);
  aoSalvarAtalhoRef.current = aoSalvarAtalho;

  const motor = usarMotorSite(refIframe as RefObject<HTMLIFrameElement | null>, {
    pasta,
    aoAtalhoSalvar: () => {
      // Roteia pela tela (salvarEd), que ignora o eco do proprio salvar. So a
      // tela sabe se ha o que salvar; ela ja guarda naoSalvo e salvandoEd.
      aoSalvarAtalhoRef.current();
    },
  });
  // Ref pro callback de atalho (Ctrl+S de dentro do iframe) ler o estado atual.
  const motorRef = useRef(motor);
  motorRef.current = motor;

  // Reporta o estado do motor pra tela (indicador de sujo, guardas, botoes).
  useEffect(() => {
    aoEstado({
      naoSalvo: motor.naoSalvo,
      podeDesfazer: motor.podeDesfazer,
      pronto: motor.pronto,
    });
  }, [motor.naoSalvo, motor.podeDesfazer, motor.pronto, aoEstado]);

  // Salvar: serializa e grava pela rota de pagina. Erros sobem pra tela.
  const salvar = useCallback(async (): Promise<boolean> => {
    aoErro(null);
    try {
      await motorRef.current.salvar(async (texto) => {
        const resp = await fetch(
          `/api/vkos/pecas/${encodeURIComponent(pasta)}/pagina/${encodeURIComponent(arquivo)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texto }),
          }
        );
        if (!resp.ok) {
          let m = "Não foi possível salvar a página.";
          try {
            const d = (await resp.json()) as { erro?: string };
            if (d?.erro) m = d.erro;
          } catch {
            // corpo sem json: mantem a mensagem padrao
          }
          throw new Error(m);
        }
      });
      return true;
    } catch (err) {
      aoErro(err instanceof Error ? err.message : "Não foi possível salvar a página.");
      return false;
    }
  }, [pasta, arquivo, aoErro]);

  useImperativeHandle(
    ref,
    () => ({
      salvar,
      desfazer: () => motorRef.current.desfazer(),
    }),
    [salvar]
  );

  // Escala do palco: fit cabe a pagina inteira; os demais sao fixos. Recalcula
  // no resize da area e quando o preset ou o zoom mudam.
  useEffect(() => {
    const area = refArea.current;
    if (!area) return;
    const recalc = () => {
      if (zoom === "fit") {
        const larg = area.clientWidth - 48;
        const alt = area.clientHeight - 48;
        if (larg <= 0 || alt <= 0) return;
        const f = Math.min(larg / dim.largura, alt / dim.altura, 1);
        setFator(f > 0 ? f : 0);
      } else {
        setFator(Number(zoom) / 100);
      }
    };
    const ro = new ResizeObserver(recalc);
    ro.observe(area);
    recalc();
    return () => ro.disconnect();
  }, [dim, zoom]);

  const pct = Math.round(fator * 100);

  return (
    <>
      <div className="site-palco">
        <div className="site-barra">
          {paginas.length > 1 && (
            <select
              className="site-select-pagina"
              value={pagina}
              onChange={(e) => aoPedirTrocarPagina(e.target.value)}
              title="Escolher a página"
            >
              {paginas.map((u) => (
                <option key={u} value={u}>
                  {nomeAmigavel(u)}
                </option>
              ))}
            </select>
          )}

          <div className="site-presets">
            <button
              className={`site-preset-btn${preset === "desktop" ? " ativo" : ""}`}
              onClick={() => aoTrocarPreset("desktop")}
            >
              Desktop
            </button>
            <button
              className={`site-preset-btn${preset === "mobile" ? " ativo" : ""}`}
              onClick={() => aoTrocarPreset("mobile")}
            >
              Mobile
            </button>
          </div>

          <div className="site-zoom">
            {ZOOMS.map((z) => (
              <button
                key={z.id}
                className={`site-zoom-btn${zoom === z.id ? " ativo" : ""}`}
                onClick={() => setZoom(z.id)}
              >
                {z.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="site-viewport editando" ref={refArea}>
          {/* O iframe fica SEMPRE montado (nao gated por fator): o
              usarMotorSite instrumenta o doc na carga, e o ref precisa existir
              quando o efeito de montagem do motor roda. */}
          <div
            className="site-moldura"
            style={{
              width: `${dim.largura * fator}px`,
              height: `${dim.altura * fator}px`,
            }}
          >
            <iframe
              ref={refIframe}
              className="site-frame"
              src={comCacheBust(pagina, tsCarga)}
              title={nome}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              style={{
                width: `${dim.largura}px`,
                height: `${dim.altura}px`,
                transform: `scale(${fator})`,
              }}
            />
          </div>
          <span className="site-selo">
            {dim.largura}x{dim.altura}, {pct}%
          </span>
          {!motor.pronto && (
            <div className="site-carregando">
              <div className="giro" />
              <span>Abrindo o editor...</span>
            </div>
          )}
          {/* Veu de travamento: durante o ajuste com IA o canvas nao recebe
              cliques (o veu fica por cima) e mostra o estado claro. */}
          {travado && (
            <div className="site-editor-travado">
              <div className="giro" />
              <span>A IA está ajustando o site. Aguarde.</span>
            </div>
          )}
        </div>
      </div>

      {/* Com o painel de IA aberto, o de propriedades sai de cena (trocam de
          lugar). A tela renderiza a faixa de IA no nivel do site-corpo. */}
      {!iaAberta && (
        <PainelSite
          motor={motor}
          pecaPasta={pasta}
          arquivoAtual={arquivo}
          aoFechar={aoFechar}
        />
      )}
    </>
  );
});
