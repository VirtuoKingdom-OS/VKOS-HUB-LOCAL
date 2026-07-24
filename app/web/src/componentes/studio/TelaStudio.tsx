import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import type { ModeloIA } from "../../api/cliente";
import type { AnexoAjuste } from "../../tipos/dominio";
import { formatarTema } from "../telas/fluxos";
import { usarMotorEdicao } from "../editor/motor";
import { usarGeracaoImagemIA } from "../editor/usarGeracaoImagem";
import { PainelPropriedades } from "./PainelPropriedades";
import { PainelAjusteCarrossel } from "./PainelAjusteCarrossel";
import { blocoDeAnexos } from "../comum/AnexosAjuste";
import { IconeSeta, IconeArquivo, IconeGaleria, IconeChevron, IconeRaio } from "../comum/Icones";
import "../../estilos/editor.css";
import "../../estilos/studio.css";
import { navegarParaCaminho } from "../layout/rotas";

interface Props {
  // Subpasta da peca (um segmento decodificado), ex "2026-07-14-tema-curto".
  pasta: string;
}

// Modos de zoom: "fit" mede pra altura do slide caber; os demais sao fixos.
type ZoomModo = "fit" | "50" | "75" | "100";
const ZOOMS: { id: ZoomModo; rotulo: string }[] = [
  { id: "fit", rotulo: "Ajustar" },
  { id: "50", rotulo: "50%" },
  { id: "75", rotulo: "75%" },
  { id: "100", rotulo: "100%" },
];

function pedidoCriaImagem(texto: string): boolean {
  return /\b(crie|criar|gere|gerar|adicione|adicionar|coloque|inserir|inclua|troque|substitua)\b[\s\S]{0,80}\b(imagem|foto|ilustra[cç][aã]o|fundo)\b/i.test(texto);
}

function paginaPedida(texto: string, atual: number, total: number): number {
  const ordinais: Array<[RegExp, number]> = [
    [/\b(primeira|primeiro)\b/i, 0],
    [/\b(segunda|segundo)\b/i, 1],
    [/\b(terceira|terceiro)\b/i, 2],
    [/\b(quarta|quarto)\b/i, 3],
    [/\b(quinta|quinto)\b/i, 4],
    [/\b(sexta|sexto)\b/i, 5],
    [/\b(s[eé]tima|s[eé]timo)\b/i, 6],
    [/\b(oitava|oitavo)\b/i, 7],
    [/\b(nona|nono)\b/i, 8],
    [/\b(d[eé]cima|d[eé]cimo)\b/i, 9],
  ];
  const numero = texto.match(/\bp[aá]gina\s*(?:n[uú]mero\s*)?(\d{1,2})\b/i);
  if (numero) return Math.max(0, Math.min(total - 1, Number(numero[1]) - 1));
  for (const [padrao, indice] of ordinais) {
    if (padrao.test(texto)) return Math.min(total - 1, indice);
  }
  return Math.max(0, Math.min(total - 1, atual));
}

// Geometria de um slide no documento (coordenadas do corpo, sem escala).
interface Geo {
  left: number;
  top: number;
  width: number;
}

// Studio de edicao: pagina inteira, todas as paginas do carrossel lado a lado
// num unico iframe, com scroll horizontal. Toda edicao vem do motor
// compartilhado; este componente cuida do layout (side-by-side), do zoom, da
// pagina em foco, do header e dos atalhos. Nao e overlay.
export function TelaStudio({ pasta }: Props) {
  const { pecas, carregandoInicial, trocandoWorkspace, criarSessao, sessoes } = usarEstado();
  const { modelos, modeloPadrao } = usarProvedoresIA();

  const [zoom, setZoom] = useState<ZoomModo>("fit");
  const [escala, setEscala] = useState(0.1);
  const [conteudo, setConteudo] = useState({ w: 1080, h: 1350, slideH: 1350 });
  const [geos, setGeos] = useState<Geo[]>([]);
  const [foco, setFoco] = useState(0);
  const [aplicarTodas, setAplicarTodas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [menuBaixar, setMenuBaixar] = useState(false);
  const [ts, setTs] = useState(() => Date.now());
  const [painelIa, setPainelIa] = useState(false);
  const [pedidoIa, setPedidoIa] = useState("");
  const [anexosAjuste, setAnexosAjuste] = useState<AnexoAjuste[]>([]);
  const [modeloIa, setModeloIa] = useState<ModeloIA>(modeloPadrao);
  const [ajustandoIa, setAjustandoIa] = useState(false);
  const [sessaoAjuste, setSessaoAjuste] = useState<string | null>(null);
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);
  const [ajusteConcluido, setAjusteConcluido] = useState(false);
  const [confirmarAjuste, setConfirmarAjuste] = useState(false);
  const [inicioAjusteImagem, setInicioAjusteImagem] = useState<number | null>(null);
  const geracaoImagemAjuste = usarGeracaoImagemIA();

  const refIframe = useRef<HTMLIFrameElement>(null);
  const refCanvas = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomModo>("fit");
  const escalaRef = useRef(0.1);
  const focoRef = useRef(0);
  // Espelha "nao salvo" num ref pra callback de atalho (Ctrl+S no iframe) ler
  // sem recriar o motor.
  const naoSalvoRef = useRef(false);
  zoomRef.current = zoom;
  escalaRef.current = escala;
  focoRef.current = foco;

  useEffect(() => {
    if (modelos.length === 0 || modelos.some((item) => item.alias === modeloIa)) return;
    setModeloIa(modeloPadrao || modelos[0].alias);
  }, [modelos, modeloPadrao, modeloIa]);

  const getDoc = (): Document | null => refIframe.current?.contentDocument ?? null;

  // A peca da rota. O guard usa fonteHtml pra saber se e editavel.
  const peca = useMemo(() => pecas.find((p) => p.pasta === pasta), [pecas, pasta]);
  const carregandoPeca = carregandoInicial || trocandoWorkspace;

  // ===== Layout side-by-side, injetado no doc a cada (re)carga do iframe. O id
  // "vkos-ed-layout" e limpo pelo motor no save (nao vaza pro HTML final).
  const injetarLayout = useCallback((doc: Document) => {
    let s = doc.getElementById("vkos-ed-layout") as HTMLStyleElement | null;
    if (!s) {
      s = doc.createElement("style");
      s.id = "vkos-ed-layout";
      doc.head.appendChild(s);
    }
    s.textContent =
      "body{margin:0 !important;display:flex !important;flex-direction:row !important;" +
      "align-items:flex-start !important;gap:56px !important;padding:64px !important;" +
      "width:max-content !important;background:transparent !important;}" +
      ".slide{flex:0 0 auto !important;margin:0 !important;" +
      "box-shadow:0 14px 44px rgba(0,0,0,0.30) !important;}";
  }, []);

  // Mede o conteudo (largura total da fileira, altura do slide) e recalcula a
  // escala pelo modo de zoom. Fit cabe a altura; os demais sao fixos.
  const medir = useCallback(() => {
    const doc = getDoc();
    const box = refCanvas.current;
    if (!doc || !doc.body || !box) return;
    const primeiro = doc.querySelector<HTMLElement>(".slide");
    const slideH = primeiro?.offsetHeight || 1350;
    const w = doc.body.scrollWidth;
    const h = doc.body.scrollHeight;
    setConteudo({ w, h, slideH });
    const lista = Array.from(doc.querySelectorAll<HTMLElement>(".slide")).map((s) => ({
      left: s.offsetLeft,
      top: s.offsetTop,
      width: s.offsetWidth,
    }));
    setGeos(lista);
    const pad = 80;
    const esc =
      zoomRef.current === "fit"
        ? Math.min((box.clientHeight - pad) / slideH, 1)
        : Number(zoomRef.current) / 100;
    setEscala(esc > 0 ? esc : 0.1);
  }, []);

  // Pagina em foco: a de centro mais proximo do centro do scroll horizontal.
  const atualizarFoco = useCallback(() => {
    const box = refCanvas.current;
    if (!box || geos.length === 0) return;
    const esc = escalaRef.current;
    const centro = box.scrollLeft + box.clientWidth / 2;
    let melhor = 0;
    let dist = Infinity;
    geos.forEach((g, i) => {
      const c = (g.left + g.width / 2) * esc;
      const d = Math.abs(c - centro);
      if (d < dist) {
        dist = d;
        melhor = i;
      }
    });
    if (melhor !== focoRef.current) setFoco(melhor);
  }, [geos]);

  // Roda do mouse rola as paginas na horizontal (padrao de canvas de slides
  // lado a lado). deltaY vira scrollLeft; deltaX e Shift somam no mesmo eixo. O
  // mesmo handler serve pro corpo do iframe (que nao rola sozinho) e pra area
  // do canvas fora do iframe, pra roda funcionar em QUALQUER ponto. Ctrl+roda
  // fica de fora (reservado a zoom do navegador), sem interceptar.
  const aoRoda = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) return;
    const box = refCanvas.current;
    if (!box) return;
    box.scrollLeft += e.deltaX + e.deltaY;
    e.preventDefault();
  }, []);

  const motor = usarMotorEdicao(refIframe, {
    pasta,
    aoMudar: () => {},
    obterEscala: () => escalaRef.current,
    // Ctrl+S com o foco dentro do iframe: mesmo caminho de salvar do app.
    aoAtalhoSalvar: () => {
      if (naoSalvoRef.current && !salvando) void salvarWrap();
    },
    aoInstrumentar: (doc) => {
      injetarLayout(doc);
      doc.addEventListener("wheel", aoRoda, { passive: false });
      requestAnimationFrame(() => medir());
    },
  });
  naoSalvoRef.current = motor.naoSalvo;

  // Remede quando o modo de zoom muda ou o palco redimensiona.
  useEffect(() => {
    if (motor.pronto) medir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, motor.pronto]);

  useEffect(() => {
    const box = refCanvas.current;
    if (!box) return;
    const ro = new ResizeObserver(() => medir());
    ro.observe(box);
    return () => ro.disconnect();
  }, [medir]);

  // Roda do mouse na area do canvas fora do iframe (padding, fundo) tambem rola
  // as paginas na horizontal. Dentro do iframe, o motor liga o mesmo handler.
  useEffect(() => {
    const box = refCanvas.current;
    if (!box) return;
    box.addEventListener("wheel", aoRoda, { passive: false });
    return () => box.removeEventListener("wheel", aoRoda);
  }, [aoRoda]);

  // Recalcula o foco quando a escala, o conteudo ou a lista de slides mudam.
  useEffect(() => {
    atualizarFoco();
  }, [escala, geos, atualizarFoco]);

  // As alcas de redimensionamento tem tamanho fixo na tela: quando a escala do
  // canvas muda (zoom), o motor as redesenha no novo tamanho.
  useEffect(() => {
    if (motor.pronto) motor.reposicionarAlcas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escala, motor.pronto]);

  // Scroll do canvas atualiza o foco (via rAF pra nao saturar).
  const rafRef = useRef(0);
  function aoRolar() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      atualizarFoco();
    });
  }

  // ===== Salvar.
  async function salvarWrap(): Promise<boolean> {
    if (salvando) return false;
    setSalvando(true);
    setErro(null);
    try {
      await motor.salvar();
      return true;
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
      return false;
    } finally {
      setSalvando(false);
    }
  }

  const dispararAjuste = useCallback(async () => {
    const pedido = pedidoIa.trim();
    if (!pedido || ajustandoIa || !modeloIa) return;
    const promptFinal = pedido + blocoDeAnexos(anexosAjuste);
    setErroAjuste(null);
    setAjusteConcluido(false);
    setAjustandoIa(true);
    if (anexosAjuste.length === 0 && pedidoCriaImagem(pedido)) {
      const inicio = Date.now();
      const pagina = paginaPedida(pedido, focoRef.current, motor.paginas);
      const doc = getDoc();
      const slide = doc?.querySelectorAll<HTMLElement>(".slide")[pagina];
      setInicioAjusteImagem(inicio);
      await geracaoImagemAjuste.gerar(
        pasta,
        {
          contexto: [
            `Pedido do usuário: ${pedido}`,
            `Página ${pagina + 1} de ${motor.paginas}`,
            slide?.innerText || slide?.textContent || "",
          ].join(". "),
          aplicar: (caminhoRelativo) =>
            motor.adicionarImagemFundoPagina(pagina, caminhoRelativo),
        },
        modeloPadrao,
      );
      return;
    }
    try {
      const sessao = await criarSessao({
        titulo: `Ajuste do carrossel: ${formatarTema(peca?.tema ?? pasta)}`,
        prompt: promptFinal,
        modelo: modeloIa,
        escopoPeca: { pasta, tipo: "carrossel" },
      });
      setSessaoAjuste(sessao.id);
    } catch (erro) {
      setAjustandoIa(false);
      setErroAjuste(
        erro instanceof Error ? erro.message : "Não foi possível iniciar o ajuste."
      );
    }
  }, [
    pedidoIa,
    anexosAjuste,
    ajustandoIa,
    modeloIa,
    modeloPadrao,
    criarSessao,
    peca,
    pasta,
    motor,
    geracaoImagemAjuste,
  ]);

  useEffect(() => {
    if (inicioAjusteImagem === null) return;
    if (geracaoImagemAjuste.erro) {
      setAjustandoIa(false);
      setInicioAjusteImagem(null);
      setErroAjuste(geracaoImagemAjuste.erro);
      return;
    }
    if (geracaoImagemAjuste.ultimaConcluidaEm < inicioAjusteImagem) return;
    setAjustandoIa(false);
    setInicioAjusteImagem(null);
    setAjusteConcluido(true);
    setPedidoIa("");
    setAnexosAjuste([]);
  }, [
    inicioAjusteImagem,
    geracaoImagemAjuste.erro,
    geracaoImagemAjuste.ultimaConcluidaEm,
  ]);

  function solicitarAjuste() {
    if (!pedidoIa.trim() || ajustandoIa) return;
    if (motor.naoSalvo) {
      setConfirmarAjuste(true);
      return;
    }
    void dispararAjuste();
  }

  async function salvarEAjustar() {
    const ok = await salvarWrap();
    if (!ok) return;
    setConfirmarAjuste(false);
    await dispararAjuste();
  }

  useEffect(() => {
    if (!sessaoAjuste) return;
    const sessao = sessoes.find((item) => item.id === sessaoAjuste);
    if (!sessao) return;
    if (sessao.status === "concluida") {
      const resposta = sessao.resultado?.trim() || "";
      if (/não consegui|nao consegui|não foi possível alterar|nao foi possivel alterar|não alterei|nao alterei|bloqueou a leitura|preciso que você|preciso que voce/i.test(resposta)) {
        setAjustandoIa(false);
        setSessaoAjuste(null);
        setErroAjuste(resposta || "O provedor não conseguiu alterar o carrossel.");
        return;
      }
      setAjustandoIa(false);
      setSessaoAjuste(null);
      setAjusteConcluido(true);
      setPedidoIa("");
      setAnexosAjuste([]);
      motor.limparSelecao();
      setTs(Date.now());
    } else if (sessao.status === "erro" || sessao.status === "parada") {
      setAjustandoIa(false);
      setSessaoAjuste(null);
      setErroAjuste(
        sessao.erro?.trim() || "O ajuste não foi concluído. Tente um pedido mais direto."
      );
    }
  }, [sessoes, sessaoAjuste, motor]);

  // ===== Sair: volta pra de onde veio, com aviso se houver mudanca nao salva.
  // history.back() so e seguro quando existe uma entrada anterior DO PROPRIO app:
  // abrir /studio/<pasta> direto numa aba nova deixa about:blank como entrada
  // anterior, e um back() cego cairia nela. Usamos o referrer como sinal: se a
  // pagina anterior e da mesma origem, back() volta pra ela; senao, vai pras
  // galerias por hash (troca interna, nunca sai do app).
  function sair() {
    let mesmaOrigem = false;
    try {
      mesmaOrigem =
        !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {
      mesmaOrigem = false;
    }
    if (window.history.length > 1 && mesmaOrigem) window.history.back();
    else navegarParaCaminho("/galerias");
  }
  function tentarSair() {
    if (motor.naoSalvo) setConfirmando(true);
    else sair();
  }
  async function salvarESair() {
    const ok = await salvarWrap();
    if (ok) sair();
  }

  // ===== Atalhos: Ctrl+S salva, Ctrl+Z desfaz, Esc desmarca (nao fecha a tela).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (motor.naoSalvo && !salvando) void salvarWrap();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        motor.desfazer();
        return;
      }
      if (e.key === "Escape") {
        if (confirmando) {
          setConfirmando(false);
        } else if (menuBaixar) {
          setMenuBaixar(false);
        } else if (motor.selecao) {
          e.stopPropagation();
          motor.limparSelecao();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor.naoSalvo, salvando, confirmando, menuBaixar, motor.selecao]);

  // Fecha o menu Baixar ao clicar fora.
  useEffect(() => {
    if (!menuBaixar) return;
    const fora = () => setMenuBaixar(false);
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [menuBaixar]);

  function baixar(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ===== Guard: peca inexistente ou sem fonteHtml (e ja carregou) => erro.
  if (!carregandoPeca && (!peca || !peca.fonteHtml)) {
    return (
      <section className="tela-studio tela-studio-erro">
        <div className="studio-erro-caixa">
          <IconeGaleria className="studio-erro-icone" />
          <h1>Peça não encontrada</h1>
          <p>
            Esta peça não existe mais ou não é um carrossel editável. Volte pras
            Galerias para escolher outra.
          </p>
          <a className="botao botao-principal" href="/galerias">
            Ir pras Galerias
          </a>
        </div>
      </section>
    );
  }

  const nome = peca ? formatarTema(peca.tema) : formatarTema(pasta.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
  const src = `/pecas/${encodeURIComponent(pasta)}/carrossel.html?vk=${ts}`;
  const encPasta = encodeURIComponent(pasta);

  return (
    <section className="tela-studio">
      <header className="studio-topo">
        <div className="studio-topo-esq">
          <button className="studio-voltar" onClick={tentarSair} title="Voltar">
            <IconeSeta className="" />
          </button>
          <div className="studio-titulo">
            <h1 title={nome}>{nome}</h1>
            {motor.naoSalvo && (
              <span className="studio-ponto-salvar" title="Alterações não salvas" />
            )}
          </div>
        </div>

        <div className="studio-acoes">
          <button
            className="botao botao-fantasma"
            onClick={motor.desfazer}
            disabled={!motor.podeDesfazer || ajustandoIa}
            title="Desfazer (Ctrl+Z)"
          >
            Desfazer
          </button>

          <div className="studio-baixar">
            <button
              className="botao botao-neutro"
              onMouseDown={(e) => {
                e.stopPropagation();
                setMenuBaixar((v) => !v);
              }}
              title="Baixar"
            >
              <IconeArquivo className="" />
              Baixar
              <IconeChevron className="studio-baixar-seta" />
            </button>
            {menuBaixar && (
              <div className="studio-baixar-menu" onMouseDown={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setMenuBaixar(false);
                    baixar(`/api/vkos/pecas/${encPasta}/png/${foco + 1}`);
                  }}
                >
                  <IconeArquivo className="" />
                  PNG da página {foco + 1}
                </button>
                <button
                  onClick={() => {
                    setMenuBaixar(false);
                    baixar(`/api/vkos/pecas/${encPasta}/png-zip`);
                  }}
                >
                  <IconeGaleria className="" />
                  Todas em ZIP
                </button>
              </div>
            )}
          </div>

          <button
            className={`botao ${painelIa ? "botao-neutro" : "botao-principal"}`}
            onClick={() => setPainelIa((aberto) => !aberto)}
            disabled={ajustandoIa}
            title="Ajustar este carrossel com IA"
          >
            <IconeRaio className="" />
            Ajustar com IA
          </button>

          <button
            className="botao botao-principal"
            onClick={() => void salvarWrap()}
            disabled={!motor.naoSalvo || salvando || ajustandoIa}
            title="Salvar (Ctrl+S)"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      {erro && <div className="studio-erro-barra">{erro}</div>}

      <div className="studio-corpo">
        <div className="studio-canvas" ref={refCanvas} onScroll={aoRolar}>
          <div
            className="studio-palco"
            style={{ width: conteudo.w * escala, height: conteudo.h * escala }}
          >
            <iframe
              ref={refIframe}
              className="studio-frame"
              src={src}
              title={nome}
              style={{
                width: `${conteudo.w}px`,
                height: `${conteudo.h}px`,
                transform: `scale(${escala})`,
              }}
            />
            {/* Numeracao FORA do iframe, sobreposta: alinha por slide e some no
                save (nao toca o HTML). */}
            {geos.map((g, i) => (
              <span
                key={i}
                className={`studio-num${i === foco ? " ativo" : ""}`}
                style={{
                  left: g.left * escala,
                  top: g.top * escala,
                  width: g.width * escala,
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>

          {!motor.pronto && (
            <div className="studio-carregando">
              <div className="giro" />
              <span>Abrindo o estúdio...</span>
            </div>
          )}
        </div>

        {painelIa ? (
          <PainelAjusteCarrossel
            pasta={pasta}
            pedido={pedidoIa}
            anexos={anexosAjuste}
            modelo={modeloIa}
            modelos={modelos}
            ajustando={ajustandoIa}
            concluido={ajusteConcluido}
            erro={erroAjuste}
            aoMudarPedido={setPedidoIa}
            aoMudarAnexos={setAnexosAjuste}
            aoMudarModelo={setModeloIa}
            aoAjustar={solicitarAjuste}
            aoFechar={() => setPainelIa(false)}
          />
        ) : (
          <PainelPropriedades
            motor={motor}
            foco={foco}
            pecaPasta={pasta}
            aplicarTodas={aplicarTodas}
            aoAlternarTodas={() => setAplicarTodas((v) => !v)}
          />
        )}

        {ajustandoIa && (
          <div className="studio-ajuste-travado">
            <div className="giro" />
            <span>A IA está ajustando este carrossel. Aguarde.</span>
          </div>
        )}

        {/* Barra flutuante: pagina em foco e zoom (padrao Figma/Canva). */}
        <div className="studio-barra">
          <span className="studio-barra-pagina">
            Página {foco + 1} / {motor.paginas}
          </span>
          <span className="studio-barra-sep" />
          <div className="studio-zoom">
            {ZOOMS.map((z) => (
              <button
                key={z.id}
                className={`studio-zoom-btn${zoom === z.id ? " ativo" : ""}`}
                onClick={() => setZoom(z.id)}
              >
                {z.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {confirmando && (
        <div className="studio-confirm-scrim" onMouseDown={() => setConfirmando(false)}>
          <div className="studio-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Sair com alterações não salvas?</h3>
            <p>As mudanças que você fez neste carrossel serão perdidas.</p>
            <div className="studio-confirm-acoes">
              <button className="botao botao-fantasma" onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
              <button className="botao botao-perigo" onClick={sair}>
                Sair sem salvar
              </button>
              <button className="botao botao-principal" onClick={() => void salvarESair()}>
                Salvar e sair
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmarAjuste && (
        <div className="studio-confirm-scrim" onMouseDown={() => setConfirmarAjuste(false)}>
          <div className="studio-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Salvar antes de ajustar com IA?</h3>
            <p>
              A IA trabalha sobre o carrossel salvo no disco. Salve suas edições para ela
              receber a versão mais recente desta peça.
            </p>
            <div className="studio-confirm-acoes">
              <button className="botao botao-fantasma" onClick={() => setConfirmarAjuste(false)}>
                Cancelar
              </button>
              <button
                className="botao botao-principal"
                onClick={() => void salvarEAjustar()}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar e continuar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
