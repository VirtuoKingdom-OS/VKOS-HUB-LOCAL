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
import { usarProvedoresIA } from "../../estado/provedores";
import {
  obterPublicacao,
  publicarGithub,
  publicarNetlify,
  type ModeloIA,
  type RespostaPublicacao,
} from "../../api/cliente";
import type { Peca } from "../../tipos/dominio";
import type { AnexoAjuste } from "../../tipos/dominio";
import { formatarTema } from "../telas/fluxos";
import { usarMotorSite } from "../editor/motorSite";
import { usarGeracaoImagemIA } from "../editor/usarGeracaoImagem";
import { PainelSite } from "./PainelSite";
import { AnexosAjuste, blocoDeAnexos } from "../comum/AnexosAjuste";
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

// ===== Revisão de design: atalho do painel Ajustar com IA. É um preset do
// fluxo de ajuste comum (mesma sessão escopada, mesmas guardas), com o prompt
// pronto abaixo no lugar do texto do campo livre. Contrato do Dono B da rodada
// otimizações de IA.
const DESCRICAO_REVISAO_DESIGN =
  "uma crítica e correção visual consistente em todas as páginas do site";
// O preset invoca a skill /revisar-design do workspace: uma linha de contexto
// mais o comando. A skill traz o roteiro completo (nota por área, teste anti-slop
// nas duas ordens, conferência do estilo declarado, correções por impacto).
const PROMPT_REVISAO_DESIGN = `Faça uma revisão de design do site inteiro nesta pasta: leia todas as páginas, o CSS e o JavaScript, e corrija os problemas de maior impacto, preservando conteúdo, seções, imagens e a marcação amigável ao Studio.
/revisar-design`;

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

// Caminho da pagina dentro da peca, inclusive subpastas. O backend aceita esse
// caminho pelo wildcard seguro e valida o confinamento dentro do site.
function caminhoPagina(url: string, pasta: string): string {
  const pathname = new URL(url, window.location.origin).pathname;
  const prefixo = `/pecas/${encodeURIComponent(pasta)}/`;
  if (!pathname.startsWith(prefixo)) return nomeArquivo(url);
  return pathname
    .slice(prefixo.length)
    .split("/")
    .map((segmento) => decodeURIComponent(segmento))
    .join("/");
}

function urlSalvarPagina(pasta: string, caminho: string): string {
  const caminhoUrl = caminho.split("/").map(encodeURIComponent).join("/");
  return `/api/vkos/pecas/${encodeURIComponent(pasta)}/pagina/${caminhoUrl}`;
}

function urlEdicaoPagina(url: string): string {
  return url.replace(/^\/pecas\//, "/pecas-edicao/");
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

function IconePublicar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c3.8 1.8 6.4 5.6 6.4 10v2.2l-3.1-1.3-3.3 4.6-3.3-4.6-3.1 1.3V13C5.6 8.6 8.2 4.8 12 3Z" />
      <circle cx="12" cy="10" r="2" />
      <path d="M9.4 18.3 8.5 21M14.6 18.3l.9 2.7" />
    </svg>
  );
}

function IconeLupaRevisao() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
      <path d="M8.6 11a2.4 2.4 0 0 1 2.4-2.4" />
    </svg>
  );
}

function pedidoCriaImagemSite(texto: string): boolean {
  return /\b(crie|criar|gere|gerar|adicione|adicionar|coloque|inserir|inclua|troque|substitua)\b[\s\S]{0,90}\b(imagem|foto|ilustra[cç][aã]o|background|fundo)\b/i.test(texto);
}

function encontrarAlvoVisual(doc: Document, pedido: string): HTMLElement | null {
  const seletores: string[] = [];
  if (/\b(hero|capa|topo|principal)\b/i.test(pedido)) {
    seletores.push('[data-hero]', '#hero', '.hero', '[class*="hero"]', '[class*="banner"]');
  }
  if (/\b(sobre|about)\b/i.test(pedido)) {
    seletores.push('#sobre', '#about', '.sobre', '.about', '[class*="sobre"]', '[class*="about"]');
  }
  if (/\b(servi[cç]os?|services?)\b/i.test(pedido)) {
    seletores.push('#servicos', '#services', '[class*="servic"]');
  }
  if (/\b(cta|chamada final|se[cç][aã]o final)\b/i.test(pedido)) {
    seletores.push('.cta', '#cta', '[class*="cta"]');
  }
  seletores.push(
    '[data-hero]',
    '#hero',
    '.hero',
    '[class*="hero"]',
    'main > section:first-of-type',
    'body > section:first-of-type',
    'main',
  );
  for (const seletor of seletores) {
    const alvo = doc.querySelector<HTMLElement>(seletor);
    if (alvo) return alvo;
  }
  return null;
}

async function lerDocumentoSite(url: string): Promise<Document> {
  const resposta = await fetch(comCacheBust(url, Date.now()));
  if (!resposta.ok) throw new Error("Não foi possível abrir a página atual para aplicar a imagem.");
  return new DOMParser().parseFromString(await resposta.text(), "text/html");
}

function serializarDocumentoSite(doc: Document): string {
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

async function aplicarImagemEmSecaoSite(
  pagina: string,
  pasta: string,
  pedido: string,
  caminhoRelativo: string,
): Promise<void> {
  const doc = await lerDocumentoSite(pagina);
  const alvo = encontrarAlvoVisual(doc, pedido);
  if (!alvo) throw new Error("Não encontrei a seção pedida nessa página.");
  alvo.setAttribute("data-vkos-generated-bg", "1");
  alvo.style.position = alvo.style.position || "relative";
  alvo.style.overflow = alvo.style.overflow || "hidden";

  let img = alvo.querySelector<HTMLImageElement>(":scope > img[data-vkos-image-bg]");
  if (!img) {
    img = doc.createElement("img");
    img.setAttribute("data-vkos-image-bg", "1");
    img.alt = "Imagem de fundo contextual";
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.objectPosition = "center";
    img.style.filter = "brightness(0.48) saturate(0.9)";
    img.style.zIndex = "0";
    img.style.pointerEvents = "none";
    alvo.insertBefore(img, alvo.firstChild);
  }
  img.src = caminhoRelativo;
  Array.from(alvo.children).forEach((filho) => {
    if (filho === img || !(filho instanceof HTMLElement)) return;
    filho.style.position = filho.style.position || "relative";
    filho.style.zIndex = filho.style.zIndex || "2";
  });

  let estilo = doc.getElementById("vkos-generated-bg-style") as HTMLStyleElement | null;
  if (!estilo) {
    estilo = doc.createElement("style");
    estilo.id = "vkos-generated-bg-style";
    doc.head.appendChild(estilo);
  }
  const estilosHub = window.getComputedStyle(document.documentElement);
  alvo.style.setProperty(
    "--overlay-imagem-leve",
    estilosHub.getPropertyValue("--overlay-imagem-leve").trim(),
  );
  alvo.style.setProperty(
    "--overlay-imagem-forte",
    estilosHub.getPropertyValue("--overlay-imagem-forte").trim(),
  );
  estilo.textContent =
    '[data-vkos-generated-bg]::before{background-image:linear-gradient(var(--overlay-imagem-leve),var(--overlay-imagem-forte))!important;z-index:1!important;pointer-events:none!important;}';

  const resp = await fetch(
    urlSalvarPagina(pasta, caminhoPagina(pagina, pasta)),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: serializarDocumentoSite(doc) }),
    },
  );
  if (!resp.ok) throw new Error("A imagem foi criada, mas não consegui aplicá-la à página.");
}

// Acao pendente atras da guarda de estado sujo.
type AcaoPendente =
  | { tipo: "ver" }
  | { tipo: "pagina"; alvo: string }
  | { tipo: "sair" }
  // "ajustar" sem texto usa o campo livre; com texto e o preset (Revisao de design).
  | { tipo: "ajustar"; texto?: string };

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
  const { modelos, modeloPadrao } = usarProvedoresIA();

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
  const [anexosAjuste, setAnexosAjuste] = useState<AnexoAjuste[]>([]);
  const [modelo, setModelo] = useState<ModeloIA>(modeloPadrao);
  // Inicializacao do modelo do painel Ajustar com IA: comeca no economico do
  // provedor ativo (campo `economico` vem do backend, sem tabela local). A
  // Revisao de design continua saindo no padrao do provedor enquanto o usuario
  // nao tocar no seletor.
  const modeloEconomico = useMemo(
    () => modelos.find((m) => m.economico)?.alias,
    [modelos]
  );
  const modeloTocadoRef = useRef(false);
  const inicializouEconomicoRef = useRef(false);
  useEffect(() => {
    if (inicializouEconomicoRef.current || !modeloEconomico) return;
    inicializouEconomicoRef.current = true;
    if (!modeloTocadoRef.current) setModelo(modeloEconomico);
  }, [modeloEconomico]);
  const [ajustando, setAjustando] = useState(false);
  const [sessaoAjuste, setSessaoAjuste] = useState<string | null>(null);
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);
  const [ajusteFeito, setAjusteFeito] = useState(false);
  // Fase do ajuste. Depois que a IA termina de editar, o Hub confere o site e
  // pode mandar corrigir: enquanto isso o ajuste ainda nao acabou.
  const [faseAjuste, setFaseAjuste] = useState<"editando" | "conferindo" | "corrigindo">("editando");
  const [ajusteComPendencias, setAjusteComPendencias] = useState(false);
  const [inicioAjusteImagem, setInicioAjusteImagem] = useState<number | null>(null);
  const geracaoImagemAjuste = usarGeracaoImagemIA();
  // Espelho pro efeito de pecas (dep so em "pecas") saber se ha ajuste rodando.
  ajustandoRef.current = ajustando;
  // O ajuste em andamento nasceu do preset (Revisao de design)? Se sim, ao
  // concluir nao limpa o campo livre: o rascunho do usuario nao e do preset.
  const ehPresetRef = useRef(false);

  const refViewport = useRef<HTMLDivElement>(null);

  // ===== Publicação determinística, independente da sessão de IA.
  const [publicarAberto, setPublicarAberto] = useState(false);
  const [publicacao, setPublicacao] = useState<RespostaPublicacao | null>(null);
  const [carregandoPublicacao, setCarregandoPublicacao] = useState(false);
  const [publicando, setPublicando] = useState<"github" | "netlify" | null>(null);
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null);
  const [sucessoPublicacao, setSucessoPublicacao] = useState<string | null>(null);
  // Avisos que o servidor devolve no POST (ex: fallback pro modo HTML puro).
  const [avisosPublicacao, setAvisosPublicacao] = useState<string[]>([]);

  useEffect(() => {
    if (!publicarAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !publicando) setPublicarAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [publicarAberto, publicando]);

  const carregarPublicacao = useCallback(async () => {
    setCarregandoPublicacao(true);
    setErroPublicacao(null);
    try {
      setPublicacao(await obterPublicacao(pasta));
    } catch (erro) {
      setErroPublicacao(
        erro instanceof Error ? erro.message : "Não foi possível consultar a publicação.",
      );
    } finally {
      setCarregandoPublicacao(false);
    }
  }, [pasta]);

  useEffect(() => {
    if (publicarAberto) void carregarPublicacao();
  }, [publicarAberto, carregarPublicacao]);

  async function executarPublicacao(destino: "github" | "netlify") {
    if (publicando) return;
    setPublicando(destino);
    setErroPublicacao(null);
    setSucessoPublicacao(null);
    setAvisosPublicacao([]);
    try {
      if (destino === "github") {
        const resultado = await publicarGithub(pasta);
        setPublicacao(await obterPublicacao(pasta));
        setAvisosPublicacao(resultado.avisos ?? []);
        setSucessoPublicacao("Código enviado e confirmado no GitHub.");
      } else {
        const resultado = await publicarNetlify(pasta);
        const atual = await obterPublicacao(pasta);
        setPublicacao({
          ...atual,
          registro: { ...atual.registro, netlify: resultado },
        });
        setAvisosPublicacao(resultado.avisos ?? []);
        setSucessoPublicacao(
          resultado.pendente
            ? "Deploy enviado. A Netlify ainda está preparando a URL."
            : "Site publicado e URL pública verificada com sucesso.",
        );
      }
    } catch (erro) {
      setErroPublicacao(
        erro instanceof Error ? erro.message : "Não foi possível publicar o site.",
      );
    } finally {
      setPublicando(null);
    }
  }

  useEffect(() => {
    if (modelos.length === 0 || modelos.some((m) => m.alias === modelo)) return;
    setModelo(modeloPadrao || modelos[0].alias);
  }, [modelos, modeloPadrao, modelo]);

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
    // A conferencia do Hub roda depois que a sessao conclui e pode retomar a
    // MESMA sessao pra corrigir. Enquanto ela nao assenta, o ajuste nao acabou:
    // anunciar "pronto" aqui seria mentira, e o site pode estar sendo reescrito.
    const conferencia = s.conferenciaSite?.estado;
    if (conferencia === "conferindo" || conferencia === "corrigindo") {
      setFaseAjuste(conferencia);
      return;
    }
    if (s.status === "concluida") {
      const resposta = s.resultado?.trim() || "";
      if (/não consegui|nao consegui|não foi possível alterar|nao foi possivel alterar|não alterei|nao alterei|bloqueou a leitura|preciso que você|preciso que voce/i.test(resposta)) {
        setAjustando(false);
        setFaseAjuste("editando");
        setSessaoAjuste(null);
        setErroAjuste(resposta || "O provedor não conseguiu alterar o site.");
        return;
      }
      setTs(Date.now());
      // No modo Editar, recarrega o editor com o resultado do disco. O eco de
      // pecas foi ignorado durante o ajuste; aqui e a recarga limpa e unica.
      if (modoRef.current === "editar") setRecargaEd((x) => x + 1);
      setAjustando(false);
      setFaseAjuste("editando");
      setSessaoAjuste(null);
      setAjusteComPendencias(conferencia === "pendencias");
      setAjusteFeito(true);
      if (!ehPresetRef.current) setPedido("");
      setAnexosAjuste([]);
    } else if (s.status === "erro" || s.status === "parada") {
      setAjustando(false);
      setFaseAjuste("editando");
      setSessaoAjuste(null);
      setErroAjuste(
        s.erro?.trim()
          ? s.erro
          : "O ajuste não foi concluído. Tente de novo com um pedido mais direto."
      );
    }
  }, [sessoes, sessaoAjuste]);

  useEffect(() => {
    if (inicioAjusteImagem === null) return;
    if (geracaoImagemAjuste.erro) {
      setAjustando(false);
      setInicioAjusteImagem(null);
      setErroAjuste(geracaoImagemAjuste.erro);
      return;
    }
    if (geracaoImagemAjuste.ultimaConcluidaEm < inicioAjusteImagem) return;
    setTs(Date.now());
    if (modoRef.current === "editar") setRecargaEd((x) => x + 1);
    setAjustando(false);
    setInicioAjusteImagem(null);
    setAjusteFeito(true);
    setPedido("");
    setAnexosAjuste([]);
  }, [
    inicioAjusteImagem,
    geracaoImagemAjuste.erro,
    geracaoImagemAjuste.ultimaConcluidaEm,
  ]);

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
      void aoAjustar(a.texto);
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

  const aoAjustar = useCallback(async (textoPreset?: string) => {
    // Preset (Revisao de design) usa o texto pronto; sem preset, o campo livre.
    const texto = (textoPreset ?? pedido).trim();
    if (!texto || ajustando) return;
    const promptFinal = texto + blocoDeAnexos(anexosAjuste);
    ehPresetRef.current = textoPreset !== undefined;
    setErroAjuste(null);
    setAjusteFeito(false);
    setAjusteComPendencias(false);
    setFaseAjuste("editando");
    setAjustando(true);
    // A heuristica de imagem vale so pro campo livre: o preset e sempre uma
    // sessao de revisao, nunca geracao de imagem.
    if (
      textoPreset === undefined &&
      anexosAjuste.length === 0 &&
      pedidoCriaImagemSite(texto)
    ) {
      try {
        const doc = await lerDocumentoSite(pagina);
        const alvo = encontrarAlvoVisual(doc, texto);
        if (!alvo) throw new Error("Não encontrei a seção pedida nessa página.");
        const inicio = Date.now();
        setInicioAjusteImagem(inicio);
        await geracaoImagemAjuste.gerar(
          pasta,
          {
            contexto: [
              `Pedido do usuário: ${texto}`,
              `Página: ${nomeAmigavel(pagina)}`,
              alvo.innerText || alvo.textContent || "",
            ].join(". "),
            aplicar: (caminhoRelativo) =>
              aplicarImagemEmSecaoSite(pagina, pasta, texto, caminhoRelativo),
          },
          modeloPadrao,
        );
      } catch (erro) {
        setAjustando(false);
        setInicioAjusteImagem(null);
        setErroAjuste(
          erro instanceof Error ? erro.message : "Não foi possível preparar a imagem.",
        );
      }
      return;
    }
    try {
      // A Revisao de design revisa o site inteiro: sem escolha manual do
      // usuario no seletor, ela sai no padrao do provedor, nao no economico.
      const modeloDaSessao =
        textoPreset !== undefined && !modeloTocadoRef.current
          ? modeloPadrao || modelo
          : modelo;
      const sessao = await criarSessao({
        titulo:
          textoPreset !== undefined
            ? `Revisão de design: ${formatarTema(peca?.tema ?? pasta)}`
            : `Ajuste do site: ${formatarTema(peca?.tema ?? pasta)}`,
        // O servidor transforma este pedido curto num prompt com o Cérebro
        // completo e confina o cwd na pasta desta peça.
        prompt: promptFinal,
        modelo: modeloDaSessao,
        escopoPeca: {
          pasta,
          tipo: "site",
          arquivo: caminhoPagina(pagina, pasta),
          revisaoDesign: textoPreset !== undefined,
        },
      });
      setSessaoAjuste(sessao.id);
    } catch (erro) {
      setAjustando(false);
      setErroAjuste(
        erro instanceof Error
          ? erro.message
          : "Não foi possível iniciar o ajuste. O servidor respondeu com erro."
      );
    }
  }, [
    pedido,
    anexosAjuste,
    ajustando,
    pasta,
    pagina,
    criarSessao,
    peca,
    modelo,
    modeloPadrao,
    geracaoImagemAjuste,
  ]);

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

  // Atalho "Revisão de design": preset do mesmo fluxo, mesmas guardas (salvar
  // antes no Editar sujo, um ajuste por vez, mesmo progresso e erro).
  function solicitarRevisao() {
    if (ajustando || !modelo) return;
    const texto = PROMPT_REVISAO_DESIGN;
    if (modo === "editar" && estadoEd.naoSalvo) {
      setConfirmar({ tipo: "ajustar", texto });
      return;
    }
    void aoAjustar(texto);
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

          {!editando && (
            <button
              className={`botao botao-neutro${publicarAberto ? " ativo" : ""}`}
              onClick={() => {
                setPainelAberto(false);
                setPublicarAberto((aberto) => !aberto);
              }}
              title="Publicar o site"
              aria-expanded={publicarAberto}
            >
              <IconePublicar />
              Publicar
            </button>
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

      {peca?.site?.valido === false && (
        <div className="site-publicar-auditoria site-pendencias" role="alert">
          <strong>O site está de pé. A conferência achou pendências que bloqueiam a publicação:</strong>
          <ul>
            {peca.site.erros.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
          </ul>
          {peca.site.erros.length > 4 && (
            <p>Há mais {peca.site.erros.length - 4} pendência(s) na conferência.</p>
          )}
          <p>Resolva pelo Ajustar com IA ou pelo modo Editar.</p>
        </div>
      )}

      {publicarAberto && (
        <PainelPublicacao
          estado={publicacao}
          carregando={carregandoPublicacao}
          publicando={publicando}
          erro={erroPublicacao}
          sucesso={sucessoPublicacao}
          avisos={avisosPublicacao}
          aoPublicar={(destino) => void executarPublicacao(destino)}
          aoFechar={() => {
            if (!publicando) setPublicarAberto(false);
          }}
        />
      )}

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
                    sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
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
              {/* Atalho pronto: Revisão de design. Preset do fluxo de ajuste. */}
              <button
                className="site-revisao"
                onClick={solicitarRevisao}
                disabled={ajustando || !modelo}
                title="Dispara um ajuste com IA com o roteiro de revisão pronto. Custa o mesmo que um ajuste comum."
              >
                <span className="site-revisao-titulo">
                  <IconeLupaRevisao />
                  Revisão de design
                </span>
                <span className="site-revisao-desc">{DESCRICAO_REVISAO_DESIGN}</span>
              </button>

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

              <AnexosAjuste
                pasta={pasta}
                anexos={anexosAjuste}
                aoMudar={setAnexosAjuste}
                desabilitado={ajustando}
              />

              <span className="site-ajuste-rotulo">Modelo</span>
              <div className="site-modelos">
                {modelos.map((m) => (
                  <button
                    key={m.alias}
                    className={`site-modelo-btn${modelo === m.alias ? " ativo" : ""}`}
                    onClick={() => {
                      modeloTocadoRef.current = true;
                      setModelo(m.alias);
                    }}
                    disabled={ajustando}
                    title={m.observacaoCusto}
                  >
                    {m.rotulo}
                  </button>
                ))}
              </div>
              <p className="site-ajuste-nota">
                Comece pelo econômico. Se o resultado não convencer, repita o
                pedido num modelo maior.
              </p>

              {ajustando && (
                <div className="site-ajuste-progresso" aria-label="Ajustando o site">
                  <div className="site-ajuste-progresso-barra" />
                </div>
              )}
              {ajustando && (
                <p className="site-ajuste-nota">
                  {faseAjuste === "conferindo"
                    ? "A IA terminou. O Hub está conferindo o site antes de liberar."
                    : faseAjuste === "corrigindo"
                    ? "A conferência achou pendências. A IA está corrigindo."
                    : "A IA está editando o site. Isso leva um instante."}
                </p>
              )}
              {ajusteFeito && !ajustando && (
                ajusteComPendencias ? (
                  <p className="site-ajuste-erro">
                    O site foi atualizado, mas a conferência ainda achou pendências.
                    Veja a lista no topo da tela antes de publicar.
                  </p>
                ) : (
                  <p className="site-ajuste-ok">
                    Pronto. O site foi atualizado e passou na conferência.
                  </p>
                )
              )}
              {erroAjuste && !ajustando && (
                <p className="site-ajuste-erro">{erroAjuste}</p>
              )}

              <button
                className="botao botao-principal site-ajuste-enviar"
                onClick={solicitarAjuste}
                disabled={ajustando || pedido.trim() === "" || !modelo}
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

function PainelPublicacao({
  estado,
  carregando,
  publicando,
  erro,
  sucesso,
  avisos,
  aoPublicar,
  aoFechar,
}: {
  estado: RespostaPublicacao | null;
  carregando: boolean;
  publicando: "github" | "netlify" | null;
  erro: string | null;
  sucesso: string | null;
  avisos: string[];
  aoPublicar: (destino: "github" | "netlify") => void;
  aoFechar: () => void;
}) {
  const nenhumConectado =
    !!estado && !estado.github.conectado && !estado.netlify.conectado;
  const publicavel = estado?.auditoria.valido ?? false;
  const modoAstro = estado?.modoPrevisto === "astro";

  return (
    <aside className="site-publicar" aria-label="Publicar site">
      <header className="site-publicar-topo">
        <div>
          <span className="site-publicar-selo"><IconePublicar /></span>
          <div>
            <h2>Publicar site</h2>
            <p>Código versionado e site no ar, sem usar créditos de IA.</p>
            {modoAstro && (
              <span
                className="site-publicar-badge"
                title="A navegação e o rodapé viram um layout único, com sitemap e robots."
              >
                Publica como projeto Astro
              </span>
            )}
          </div>
        </div>
        <button className="site-publicar-fechar" onClick={aoFechar} aria-label="Fechar publicação">
          <IconeX className="" />
        </button>
      </header>

      {carregando && !estado ? (
        <div className="site-publicar-carregando">Conferindo todas as páginas em desktop e celular...</div>
      ) : (
        <div className="site-publicar-corpo">
          {estado && !publicavel && (
            <div className="site-publicar-auditoria" role="alert">
              <strong>O site precisa de correção antes do deploy.</strong>
              <ul>
                {estado.auditoria.erros.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {estado && estado.auditoria.avisos.length > 0 && (
            <div className="site-publicar-avisos">
              <strong>Avisos da conferência:</strong>
              <ul>
                {estado.auditoria.avisos.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {nenhumConectado && (
            <div className="site-publicar-vazio">
              <p>Conecte o GitHub ou a Netlify para publicar este site.</p>
              <a className="botao botao-principal" href="#/conexoes">Conectar em Conexões</a>
            </div>
          )}

          {!nenhumConectado && estado && (
            <>
              <DestinoPublicacao
                nome="GitHub"
                descricao="Versiona e guarda todo o código do site."
                conectado={estado.github.conectado}
                executando={publicando === "github"}
                bloqueado={publicando !== null || !publicavel}
                rotuloAcao={estado.registro.github ? "Enviar atualização" : "Enviar pro GitHub"}
                registro={estado.registro.github}
                aoPublicar={() => aoPublicar("github")}
              />
              <DestinoPublicacao
                nome="Netlify"
                descricao="Coloca o site no ar com uma URL pública."
                conectado={estado.netlify.conectado}
                executando={publicando === "netlify"}
                bloqueado={publicando !== null || !publicavel}
                rotuloAcao={estado.registro.netlify ? "Publicar atualização" : "Publicar na Netlify"}
                registro={estado.registro.netlify}
                aoPublicar={() => aoPublicar("netlify")}
              />
            </>
          )}

          {avisos.length > 0 && (
            <div className="site-publicar-avisos" role="status">
              <strong>Avisos da publicação:</strong>
              <ul>
                {avisos.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {erro && <p className="site-publicar-erro" role="alert">{erro}</p>}
          {sucesso && <p className="site-publicar-sucesso" role="status">{sucesso}</p>}
        </div>
      )}
    </aside>
  );
}

function DestinoPublicacao({
  nome,
  descricao,
  conectado,
  executando,
  bloqueado,
  rotuloAcao,
  registro,
  aoPublicar,
}: {
  nome: string;
  descricao: string;
  conectado: boolean;
  executando: boolean;
  bloqueado: boolean;
  rotuloAcao: string;
  registro?: { url: string; em: string; pendente?: boolean };
  aoPublicar: () => void;
}) {
  return (
    <section className={`site-publicar-destino${conectado ? "" : " desconectado"}`}>
      <div className="site-publicar-destino-topo">
        <div>
          <h3>{nome}</h3>
          <p>{descricao}</p>
        </div>
        <span className={`site-publicar-status${conectado ? " conectado" : ""}`}>
          {conectado ? "Conectado" : "Desconectado"}
        </span>
      </div>

      {registro && (
        <div className="site-publicar-resultado">
          <a href={registro.url} target="_blank" rel="noreferrer">{registro.url}</a>
          <span>
            {registro.pendente
              ? "Publicação enviada. Confirmação pendente."
              : `Último envio em ${formatarDataPublicacao(registro.em)}`}
          </span>
        </div>
      )}

      {conectado ? (
        <button
          className="botao botao-neutro site-publicar-acao"
          onClick={aoPublicar}
          disabled={bloqueado}
        >
          {executando
            ? nome === "Netlify"
              ? "Publicando e verificando..."
              : "Enviando..."
            : rotuloAcao}
        </button>
      ) : (
        <a className="site-publicar-conectar" href="#/conexoes">Conectar em Conexões</a>
      )}
    </section>
  );
}

function formatarDataPublicacao(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
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

  const arquivo = caminhoPagina(pagina, pasta);

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
          urlSalvarPagina(pasta, arquivo),
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
              src={comCacheBust(urlEdicaoPagina(pagina), tsCarga)}
              title={nome}
              sandbox="allow-same-origin"
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
