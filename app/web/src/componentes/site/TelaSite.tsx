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
  abrirPastaDaPeca,
  baixarSite,
  obterPublicacao,
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
// A moldura de edição (barra de topo, palco, coluna lateral, inspetor) é
// compartilhada com os outros dois ambientes e mora em editor.css. O import é
// explícito de propósito: vir de carona pelo PainelSite escondia a dependência.
import "../editor/editor.css";
import "./site.css";
import { irParaTela } from "../layout/rotas";

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

function IconeExportar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5v10.5" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M4.5 16.5v2.2a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
    </svg>
  );
}

function IconePasta() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 6.8A1.8 1.8 0 0 1 5.3 5h3.4l1.9 2.3h8.1a1.8 1.8 0 0 1 1.8 1.8v8.1A1.8 1.8 0 0 1 18.7 19H5.3a1.8 1.8 0 0 1-1.8-1.8Z" />
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

  // ===== Exportação local, determinística e independente da sessão de IA.
  // Dois gestos: abrir a pasta da peça e baixar o site pronto.
  const [exportarAberto, setExportarAberto] = useState(false);
  const [exportacao, setExportacao] = useState<RespostaPublicacao | null>(null);
  const [carregandoExportacao, setCarregandoExportacao] = useState(false);
  const [exportando, setExportando] = useState<"pasta" | "zip" | null>(null);
  const [erroExportacao, setErroExportacao] = useState<string | null>(null);
  const [sucessoExportacao, setSucessoExportacao] = useState<string | null>(null);

  useEffect(() => {
    if (!exportarAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !exportando) setExportarAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [exportarAberto, exportando]);

  const carregarExportacao = useCallback(async () => {
    setCarregandoExportacao(true);
    setErroExportacao(null);
    try {
      setExportacao(await obterPublicacao(pasta));
    } catch (erro) {
      setErroExportacao(
        erro instanceof Error ? erro.message : "Não foi possível conferir o site.",
      );
    } finally {
      setCarregandoExportacao(false);
    }
  }, [pasta]);

  useEffect(() => {
    if (exportarAberto) void carregarExportacao();
  }, [exportarAberto, carregarExportacao]);

  async function executarAbrirPasta() {
    if (exportando) return;
    setExportando("pasta");
    setErroExportacao(null);
    setSucessoExportacao(null);
    try {
      await abrirPastaDaPeca(pasta);
      setSucessoExportacao("A pasta da peça abriu no explorador de arquivos.");
    } catch (erro) {
      setErroExportacao(
        erro instanceof Error ? erro.message : "Não foi possível abrir a pasta.",
      );
    } finally {
      setExportando(null);
    }
  }

  // A barreira de qualidade mora no servidor: site reprovado volta com as
  // pendências e nada é baixado. Aqui o aviso vira a mensagem do painel.
  async function executarBaixarSite() {
    if (exportando) return;
    setExportando("zip");
    setErroExportacao(null);
    setSucessoExportacao(null);
    try {
      const { modo, avisos } = await baixarSite(pasta);
      setExportacao(await obterPublicacao(pasta));
      const base =
        modo === "astro"
          ? "Site baixado como projeto Astro compilado."
          : "Site baixado em HTML puro, pronto pra subir em qualquer hospedagem.";
      // O motivo do fallback vinha só num evento que ninguém escutava, então o
      // usuário via "saiu em HTML" sem saber que o Astro foi tentado e falhou.
      setSucessoExportacao(
        avisos.length > 0 ? `${base} ${avisos.join(" ")}` : base,
      );
    } catch (erro) {
      setErroExportacao(
        erro instanceof Error ? erro.message : "Não foi possível baixar o site.",
      );
    } finally {
      setExportando(null);
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
    else irParaTela("dashboard");
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
        const recusa = await geracaoImagemAjuste.gerar(
          pasta,
          {
            contexto: [
              `Página: ${nomeAmigavel(pagina)}`,
              alvo.innerText || alvo.textContent || "",
            ].join(". "),
            aplicar: (caminhoRelativo) =>
              aplicarImagemEmSecaoSite(pagina, pasta, texto, caminhoRelativo),
          },
          modeloPadrao,
          // O que o usuário escreveu manda sobre o texto raspado da seção.
          texto,
        );
        // Pedido recusado: o motivo volta na mão. Sem isso a recusa saía muda e
        // a tela esperava para sempre por uma sessão que nunca nasceu.
        if (recusa) {
          setAjustando(false);
          setInicioAjusteImagem(null);
          setErroAjuste(recusa);
        }
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
      <section className="tela tela-site tela-site-erro">
        <div className="vazio">
          <IconeGaleria className="" />
          <h2>Site não encontrado</h2>
          <p>
            Esta peça não existe mais ou ainda não tem páginas pra mostrar. Volte
            pro Dashboard e escolha outra.
          </p>
          <a
            className="botao botao-principal"
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              irParaTela("dashboard");
            }}
          >
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
    <section className="tela tela-site">
      <header className="tela-topo ed-topo">
        <div className="ed-identidade">
          <button
            className="botao botao-icone botao-neutro site-voltar"
            onClick={() => pedirAcao({ tipo: "sair" })}
            title="Voltar"
            aria-label="Voltar"
          >
            <IconeSeta className="" />
          </button>
          <div className="site-titulo">
            <h1 title={nome}>{nome}</h1>
            {!editando && pagina && <span className="site-sub">{nomeAmigavel(pagina)}</span>}
          </div>
          {/* No modo Editar o estado da gravação vira palavra, ao lado do nome,
              como nos outros dois editores. */}
          {editando && (
            <span
              className={estadoEd.naoSalvo ? "selo selo-aviso" : "selo"}
              role="status"
              aria-live="polite"
            >
              {estadoEd.naoSalvo ? "Não salvo" : "Tudo salvo"}
            </span>
          )}
        </div>

        <div className="tela-topo-acoes">
          {/* Visualizar ou Editar: escolha única entre opções curtas, então é
              o segmentado das primitivas. Em pílula de menta, este controle era
              a peça mais colorida da barra, ao lado de uma página que já tem a
              cor do cliente. */}
          <div className="segmentado" role="group" aria-label="Modo da tela">
            <button
              className="segmento"
              onClick={() => pedirAcao({ tipo: "ver" })}
              aria-pressed={!editando}
            >
              <IconeOlho className="" />
              Visualizar
            </button>
            <button
              className="segmento"
              onClick={entrarEditar}
              disabled={!pagina}
              aria-pressed={editando}
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
              className="botao botao-neutro"
              onClick={() => {
                setPainelAberto(false);
                setExportarAberto((aberto) => !aberto);
              }}
              title="Abrir a pasta ou baixar o site"
              aria-expanded={exportarAberto}
            >
              <IconeExportar />
              Exportar
            </button>
          )}

          {/* Ajustar com IA existe nos dois modos. No Editar troca com o painel
              de propriedades; no Visualizar abre a faixa lateral. Ele é a ação
              principal só no modo Visualizar, onde não existe Salvar: uma ação
              escura por tela, sempre. */}
          <button
            className={`botao ${editando || painelAberto ? "botao-neutro" : "botao-principal"}`}
            onClick={() => setPainelAberto((v) => !v)}
            title="Ajustar o site com IA"
            aria-expanded={painelAberto}
          >
            <IconeRaio className="" />
            Ajustar com IA
          </button>

          {editando && (
            <button
              className="botao botao-principal"
              onClick={() => void salvarEd()}
              disabled={!estadoEd.naoSalvo || salvandoEd}
              aria-busy={salvandoEd}
              title="Salvar (Ctrl+S)"
            >
              {salvandoEd ? "Salvando" : "Salvar"}
            </button>
          )}
        </div>
      </header>

      {peca?.site?.valido === false && (
        <div className="site-faixa">
          <div className="faixa faixa-aviso" role="alert">
            <div className="faixa-texto">
              <strong>
                O site está de pé. A conferência achou pendências que bloqueiam a
                exportação:
              </strong>
              <ul className="site-exportar-lista">
                {peca.site.erros.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
              </ul>
              {peca.site.erros.length > 4 && (
                <p>Há mais {peca.site.erros.length - 4} pendência(s) na conferência.</p>
              )}
              <p>Resolva pelo Ajustar com IA ou pelo modo Editar.</p>
            </div>
          </div>
        </div>
      )}

      {exportarAberto && (
        <PainelExportacao
          estado={exportacao}
          carregando={carregandoExportacao}
          exportando={exportando}
          erro={erroExportacao}
          sucesso={sucessoExportacao}
          aoAbrirPasta={() => void executarAbrirPasta()}
          aoBaixar={() => void executarBaixarSite()}
          aoFechar={() => {
            if (!exportando) setExportarAberto(false);
          }}
        />
      )}

      {editando && erroEd && (
        <div className="site-faixa">
          <div className="faixa faixa-alerta" role="alert">
            <div className="faixa-texto">{erroEd}</div>
          </div>
        </div>
      )}

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
            <div className="barra-ferramentas site-barra">
              {paginas.length > 1 && (
                <select
                  className="campo campo-p site-select-pagina"
                  value={pagina}
                  onChange={(e) => setPagina(e.target.value)}
                  title="Escolher a página"
                  aria-label="Escolher a página"
                >
                  {paginas.map((u) => (
                    <option key={u} value={u}>
                      {nomeAmigavel(u)}
                    </option>
                  ))}
                </select>
              )}

              <div className="segmentado" role="group" aria-label="Largura do preview">
                <button
                  className="segmento"
                  aria-pressed={preset === "desktop"}
                  onClick={() => setPreset("desktop")}
                >
                  Desktop
                </button>
                <button
                  className="segmento"
                  aria-pressed={preset === "mobile"}
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
                <span className="selo site-medida">
                  {dim.largura}x{dim.altura}, {pct}%
                </span>
              )}
            </div>
          </div>
        )}

        {painelAberto && (
          <aside className="ed-lateral site-ajuste" aria-label="Ajustar com IA">
            <header className="ed-lateral-topo">
              <h2>
                <IconeRaio className="site-ajuste-icone" />
                Ajustar com IA
              </h2>
              {/* Nunca ganha disabled, nem durante o ajuste: é a saída. */}
              <button
                className="botao botao-p botao-icone botao-fantasma"
                onClick={() => setPainelAberto(false)}
                title="Fechar"
                aria-label="Fechar"
              >
                <IconeX className="" />
              </button>
            </header>

            <div className="ed-lateral-corpo">
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

              <div className="grupo-campo">
                <label className="rotulo" htmlFor="site-pedido">
                  O que você quer mudar?
                </label>
                <textarea
                  id="site-pedido"
                  className="campo site-ajuste-campo"
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value)}
                  placeholder="Ex: troque o texto do topo, deixe o botão do WhatsApp mais visível, mude a cor de fundo pra um tom mais escuro."
                  disabled={ajustando}
                  rows={5}
                />
              </div>

              <AnexosAjuste
                pasta={pasta}
                anexos={anexosAjuste}
                aoMudar={setAnexosAjuste}
                desabilitado={ajustando}
              />

              <div className="grupo-campo">
                <span className="rotulo" id="site-rotulo-modelo">
                  Modelo
                </span>
                <div className="segmentado" role="group" aria-labelledby="site-rotulo-modelo">
                  {modelos.map((m) => (
                    <button
                      key={m.alias}
                      className="segmento"
                      aria-pressed={modelo === m.alias}
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
                <span className="dica">
                  Comece pelo econômico. Se o resultado não convencer, repita o
                  pedido num modelo maior.
                </span>
              </div>

              {/* O sinal de trabalho em curso é o giro mais a frase que diz em
                  qual fase o ajuste está. Ele diz mais que uma barra sem
                  porcentagem, e o giro das primitivas já tem o substituto de
                  movimento reduzido declarado onde ele consegue valer. */}
              {ajustando && (
                <p className="ed-trabalhando" role="status">
                  <span className="girinho" />
                  {faseAjuste === "conferindo"
                    ? "A IA terminou. O Hub está conferindo o site antes de liberar."
                    : faseAjuste === "corrigindo"
                    ? "A conferência achou pendências. A IA está corrigindo."
                    : "A IA está editando o site. Isso leva um instante."}
                </p>
              )}
              {ajusteFeito && !ajustando && (
                ajusteComPendencias ? (
                  <p className="ed-erro" role="status">
                    O site foi atualizado, mas a conferência ainda achou pendências.
                    Veja a lista no topo da tela antes de exportar.
                  </p>
                ) : (
                  <p className="ed-ok" role="status">
                    Pronto. O site foi atualizado e passou na conferência.
                  </p>
                )
              )}
              {erroAjuste && !ajustando && (
                <p className="ed-erro" role="alert">
                  {erroAjuste}
                </p>
              )}

              <button
                className="botao botao-principal ed-enviar"
                onClick={solicitarAjuste}
                disabled={ajustando || pedido.trim() === "" || !modelo}
                aria-busy={ajustando}
              >
                {ajustando ? "Ajustando" : "Ajustar"}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* ===== Aviso de conflito externo (modo Editar, edicao nao salva). ===== */}
      {editando && conflito && (
        <div className="faixa faixa-aviso site-conflito" role="alert">
          <div className="faixa-texto site-conflito-texto">
            <strong>O site mudou por fora.</strong>
            <span>
              Alguma coisa reescreveu esta página enquanto você editava. Recarregar
              descarta suas edições não salvas.
            </span>
          </div>
          <div className="faixa-acoes">
            <button
              className="botao botao-p botao-fantasma"
              onClick={() => setConflito(false)}
            >
              Manter as minhas
            </button>
            <button
              className="botao botao-p botao-neutro"
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
        <div className="veu-modal" onMouseDown={() => setConfirmar(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="modal-topo">
              <h2>
                {confirmar.tipo === "pagina"
                  ? "Trocar de página sem salvar?"
                  : confirmar.tipo === "sair"
                  ? "Sair da tela sem salvar?"
                  : confirmar.tipo === "ajustar"
                  ? "Salvar antes de ajustar com IA?"
                  : "Sair do modo Editar sem salvar?"}
              </h2>
            </header>
            <div className="modal-corpo">
              <p>
                {confirmar.tipo === "ajustar"
                  ? "A IA ajusta o site a partir do que está salvo no disco. Salve suas edições pra ela trabalhar em cima delas."
                  : "As mudanças que você fez nesta página ainda não foram salvas."}
              </p>
            </div>
            <div className="modal-rodape">
              <button className="botao botao-neutro" onClick={() => setConfirmar(null)}>
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
                aria-busy={salvandoEd}
              >
                {salvandoEd
                  ? "Salvando"
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

// Painel de exportação local. Dois gestos, nenhuma credencial: abrir a pasta da
// peça no explorador e baixar o site pronto. A barreira de qualidade continua
// valendo, agora bloqueando o download em vez do deploy.
function PainelExportacao({
  estado,
  carregando,
  exportando,
  erro,
  sucesso,
  aoAbrirPasta,
  aoBaixar,
  aoFechar,
}: {
  estado: RespostaPublicacao | null;
  carregando: boolean;
  exportando: "pasta" | "zip" | null;
  erro: string | null;
  sucesso: string | null;
  aoAbrirPasta: () => void;
  aoBaixar: () => void;
  aoFechar: () => void;
}) {
  const aprovado = estado?.auditoria.valido ?? false;
  const modoAstro = estado?.modoPrevisto === "astro";
  const ultima = estado?.registro.exportacao;

  return (
    <aside className="site-exportar" aria-label="Exportar site">
      <header className="ed-lateral-topo">
        <div className="ed-lateral-topo-texto">
          <h2>Exportar site</h2>
          <p>
            {modoAstro
              ? "Sai como projeto Astro compilado"
              : "Sai em HTML puro"}
          </p>
        </div>
        <button
          className="botao botao-p botao-icone botao-fantasma"
          onClick={aoFechar}
          aria-label="Fechar exportação"
        >
          <IconeX className="" />
        </button>
      </header>

      {carregando && !estado ? (
        <div className="site-exportar-carregando" role="status">
          Conferindo todas as páginas em desktop e celular
        </div>
      ) : (
        <div className="site-exportar-corpo">
          {estado && !aprovado && (
            <div className="faixa faixa-alerta" role="alert">
              <div className="faixa-texto">
                <strong>O site precisa de correção antes de sair daqui.</strong>
                <ul className="site-exportar-lista">
                  {estado.auditoria.erros.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          )}
          {estado && estado.auditoria.avisos.length > 0 && (
            <div className="faixa faixa-aviso">
              <div className="faixa-texto">
                <strong>Avisos da conferência:</strong>
                <ul className="site-exportar-lista">
                  {estado.auditoria.avisos.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Os dois gestos são SEÇÕES, não cartões: o painel já é uma
              superfície flutuante, e um cartão aqui dentro seria cartão dentro
              de cartão. */}
          <section className="secao site-exportar-gesto">
            <div className="secao-topo">
              <h2>Abrir pasta</h2>
            </div>
            <p>Mostra os arquivos da peça no explorador deste computador.</p>
            <button
              className="botao botao-neutro"
              onClick={aoAbrirPasta}
              disabled={exportando !== null}
              aria-busy={exportando === "pasta"}
            >
              <IconePasta />
              {exportando === "pasta" ? "Abrindo" : "Abrir pasta"}
            </button>
          </section>

          <section className="secao site-exportar-gesto">
            <div className="secao-topo">
              <h2>Baixar site</h2>
            </div>
            <p>Um ZIP com o site pronto pra subir em qualquer hospedagem.</p>
            {ultima && (
              <span className="site-exportar-ultima">
                Última exportação em {formatarDataExportacao(ultima.em)}
              </span>
            )}
            <button
              className="botao botao-principal"
              onClick={aoBaixar}
              disabled={exportando !== null || !aprovado}
              aria-busy={exportando === "zip"}
              title={
                aprovado
                  ? "Baixar o ZIP do site"
                  : "Resolva as pendências da conferência antes de baixar"
              }
            >
              <IconeExportar />
              {exportando === "zip" ? "Preparando o ZIP" : "Baixar site"}
            </button>
            {!aprovado && estado && (
              <span className="dica">
                Baixar fica travado enquanto a conferência apontar pendências.
              </span>
            )}
          </section>

          {erro && (
            <p className="faixa faixa-alerta" role="alert">
              {erro}
            </p>
          )}
          {sucesso && (
            <p className="faixa faixa-boa" role="status">
              {sucesso}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

function formatarDataExportacao(iso: string): string {
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
        <div className="barra-ferramentas site-barra">
          {paginas.length > 1 && (
            <select
              className="campo campo-p site-select-pagina"
              value={pagina}
              onChange={(e) => aoPedirTrocarPagina(e.target.value)}
              title="Escolher a página"
              aria-label="Escolher a página"
            >
              {paginas.map((u) => (
                <option key={u} value={u}>
                  {nomeAmigavel(u)}
                </option>
              ))}
            </select>
          )}

          <div className="segmentado" role="group" aria-label="Largura do preview">
            <button
              className="segmento"
              aria-pressed={preset === "desktop"}
              onClick={() => aoTrocarPreset("desktop")}
            >
              Desktop
            </button>
            <button
              className="segmento"
              aria-pressed={preset === "mobile"}
              onClick={() => aoTrocarPreset("mobile")}
            >
              Mobile
            </button>
          </div>

          <div className="segmentado" role="group" aria-label="Zoom">
            {ZOOMS.map((z) => (
              <button
                key={z.id}
                className="segmento"
                aria-pressed={zoom === z.id}
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
          <span className="selo site-medida">
            {dim.largura}x{dim.altura}, {pct}%
          </span>
          {!motor.pronto && (
            <div className="ed-carregando" role="status">
              <span className="girinho" />
              <span>Abrindo o editor</span>
            </div>
          )}
          {/* Veu de travamento: durante o ajuste com IA o canvas nao recebe
              cliques (o veu fica por cima) e mostra o estado claro. */}
          {travado && (
            <div className="ed-travado" role="status">
              <div className="ed-travado-caixa">
                <span className="girinho" />
                <span>A IA está ajustando o site. Aguarde.</span>
              </div>
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
