import { useEffect, useRef, useState, type RefObject } from "react";
import {
  alvoEdicao,
  alvoNoPonto,
  entrarContentEditable,
  FONTES_SEGURAS,
  Historico,
  lerBase64,
  lerNum,
  lerVarsRoot,
  limparArtefatosSelecao,
  montarFontes,
  pilhaNoPonto,
  primeiraFonte,
  rgbParaHex,
  sairContentEditable,
  soFilhosInline,
  temTextoProprio,
  type VarCss,
} from "./nucleo";
import {
  calcularAlinhamento,
  deveAgruparPasso,
  type Caixa,
  type Guia,
  type PassoGesto,
} from "./alinhamento";
import { canaisRgb, corDoTema } from "./tema";
import type { DirecaoCamada, ItemCamada } from "./PainelCamadas";
import {
  extrairUrlFundo,
  removerUrlFundo,
  substituirUrlFundo,
  type AlvoImagemCapturado,
} from "./imagens";

// Motor de edicao compartilhado do carrossel HTML-first. Um hook por iframe
// montado. Ele instrumenta o contentDocument (estilo runtime, listeners de
// clique e arrasto, teclas de seta) e expoe a API de edicao: cores globais,
// texto, fonte, tamanho, peso, cor, mover elemento, trocar imagem de fundo,
// desfazer e salvar limpo. Nao decide layout: quem monta o iframe escolhe
// quais slides aparecem e a escala. Serve tanto pro overlay (um slide por vez)
// quanto pro Studio (todos os slides lado a lado no mesmo doc). As primitivas
// que nao dependem de slide (hit-test, contentEditable, pilha de snapshots,
// limpeza de artefatos, leitura de vars e fontes) vivem em nucleo.ts.

// VarCss (cor do :root) vem do nucleo; re-exportada pra manter a API publica.
export type { VarCss };

// Propriedades do elemento selecionado, espelhadas no painel de quem monta.
export interface PropsSel {
  tag: string;
  classes: string;
  texto: string;
  // Verdadeiro quando o textarea do painel pode reescrever o texto: o elemento
  // tem texto e nenhum filho de BLOCO. Filhos inline (b, span, br) sao aceitos,
  // mas reescrever pelo textarea apaga o destaque (ver temDestaqueInline).
  editavelTexto: boolean;
  // Verdadeiro quando ha filhos inline (destaque colorido, br, etc.): editar
  // pelo textarea troca o textContent inteiro e perde o destaque. O painel
  // avisa e sugere o duplo clique no canvas, que preserva os filhos.
  temDestaqueInline: boolean;
  // Verdadeiro enquanto o elemento esta em edicao in-place (contentEditable).
  editando: boolean;
  fonte: string;
  tamanho: number;
  peso: string;
  cor: string; // hex, pro color picker
  // Verdadeiro quando o editor injetou left/top no elemento (posicao movida).
  posicaoAjustada: boolean;
  // Imagem selecionada diretamente, seja uma tag img ou background-image num
  // elemento HTML real. Nao depende de ser a maior imagem da pagina.
  ehImagem: boolean;
  tipoImagem: "img" | "fundo" | null;
  srcImagem: string;
  // A hierarquia fica navegavel no painel. Assim um img pode levar ao frame
  // que carrega borda, sombra ou mascara, sem depender do clique acertar a
  // pequena faixa visivel do container.
  podeSubirNivel: boolean;
  podeExcluir: boolean;
  // Id estavel (data-vk) do selecionado, ancora do painel de camadas e do undo.
  vkId: string;
  // Largura atual em px (arredondada), pro campo numerico de largura de imagem.
  larguraPx: number;
  // Altura atual em px (arredondada), pro campo numerico de tamanho de bloco.
  alturaPx: number;
  // Verdadeiro quando o elemento aceita as alcas de redimensionamento: so
  // absolute/fixed, onde left/top/width/height definem a caixa sem ambiguidade
  // (elemento de fluxo redimensiona pela largura numerica, sem alca).
  redimensionavel: boolean;
}

export interface OpcoesMotor {
  // Subpasta da peca (um segmento). Usada nos endpoints de save e imagem.
  pasta: string;
  // Chamado a cada edicao. Quem monta usa pra ligar o "nao salvo" e afins.
  aoMudar: () => void;
  // Escala atual do canvas (transform:scale do iframe). O arrasto divide o
  // deslocamento da tela por ela pra achar o deslocamento real do slide.
  // Sem callback assume 1 (documento em tamanho natural).
  obterEscala?: () => number;
  // Chamado logo apos instrumentar o doc, a cada (re)carga do iframe. Quem
  // monta injeta aqui o layout (quais slides aparecem, side-by-side, etc).
  aoInstrumentar?: (doc: Document) => void;
  // Chamado quando o usuario aperta Ctrl+S com o foco DENTRO do iframe. O
  // keydown vai pro documento do iframe, entao o listener do app nao ve: o
  // motor instala um atalho no doc e chama esta callback pra quem monta seguir
  // o mesmo caminho de salvar.
  aoAtalhoSalvar?: () => void;
  // Chamado quando o usuario aperta Delete ou Backspace com um elemento
  // selecionado. O motor NAO apaga sozinho: quem monta a tela abre a mesma
  // confirmacao do botao do painel, porque o Desfazer some depois de salvar.
  aoPedirExcluir?: () => void;
}

export interface MotorEdicao {
  pronto: boolean;
  paginas: number;
  vars: VarCss[];
  aplicarVar(nome: string, valor: string): void;
  selecao: PropsSel | null;
  aplicarTexto(v: string): void;
  comEstilo(prop: string, valor: string, emTodas: boolean): void;
  moverSelecao(dx: number, dy: number): void;
  resetarPosicao(): void;
  fontesOpc: string[];
  trocarImagemFundo(pagina: number, file: File): Promise<void>;
  // Extra util pro painel: diz se a pagina tem um fundo trocavel.
  paginaTemFundo(pagina: number): boolean;
  trocarImagemSelecionada(file: File): Promise<void>;
  excluirImagemSelecionada(): void;
  selecionarPai(): void;
  excluirSelecionado(): void;
  // Duplica o selecionado ao lado, com ids novos, e seleciona a copia (Ctrl+D).
  duplicarSelecionado(): void;
  adicionarImagemFundoPagina(pagina: number, caminhoRelativo: string): void;
  capturarImagemSelecionada(): AlvoImagemCapturado | null;
  desfazer(): void;
  podeDesfazer: boolean;
  refazer(): void;
  podeRefazer: boolean;
  salvar(): Promise<void>;
  naoSalvo: boolean;
  // Instante da ultima gravacao bem sucedida (0 se ainda nao salvou nesta
  // sessao). Quem monta usa pra confirmar "Salvo" por alguns segundos.
  salvoEm: number;
  // Solta a selecao atual (ex: ao trocar de pagina no overlay).
  limparSelecao(): void;
  // ===== Camadas (E2). Lista as camadas visiveis de uma pagina (mais alta
  // primeiro), seleciona pela lista e sobe/desce no empilhamento.
  listarCamadas(pagina: number): ItemCamada[];
  selecionarPorId(id: string): void;
  moverCamada(id: string, direcao: DirecaoCamada): void;
  // ===== Imagem livre (E3). Insere uma imagem propria posicionavel no slide.
  inserirImagemLivre(pagina: number, caminhoRelativo: string): void;
  inserirImagemLivreArquivo(pagina: number, file: File): Promise<void>;
  // Contador que sobe a cada mudanca no doc: quem monta re-le listarCamadas.
  versaoDoc: number;
  // Reposiciona as alcas de redimensionamento da selecao atual. Quem monta
  // chama quando a escala do canvas muda (zoom), pra elas seguirem o novo
  // tamanho de tela sem precisar reselecionar.
  reposicionarAlcas(): void;
}

// Alvo de fundo detectado num slide: imagem grande ou elemento com bg-image.
interface Fundo {
  el: HTMLElement;
  tipo: "img" | "bg";
}

// O que um passo de desfazer guarda: o corpo do doc e o valor das vars de tema
// editadas. Nao guarda a selecao: ela e reencontrada pelo data-vk.
interface Snapshot {
  body: string;
  vars: Record<string, string>;
}

// Estado do gesto de arrasto em andamento.
interface Arrasto {
  el: HTMLElement;
  slide: HTMLElement | null;
  baseLeft: number;
  baseTop: number;
  // Posicao do ponteiro no inicio do gesto, em coordenadas do DOC do iframe
  // (px do slide, sem a escala css externa). E o sistema natural do slide.
  docX0: number;
  docY0: number;
  ativo: boolean;
  guiaV: HTMLElement | null;
  guiaH: HTMLElement | null;
  // Caixas dos vizinhos, medidas uma vez no inicio do gesto (elas nao andam).
  vizinhos: Caixa[];
  // Guardamos se demos position:relative temporario no slide, pra restaurar.
  slidePosAntes: string | null;
  // Janela do iframe onde o gesto acontece: e onde ouvimos move/up.
  win: Window;
}

// Direcoes das oito alcas de redimensionamento (cantos e meios de aresta).
type DirAlca = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const DIRS_ALCA: DirAlca[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const CURSOR_ALCA: Record<DirAlca, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

// Estado do gesto de redimensionamento em andamento. Tudo em px do DOC do
// iframe (px do slide), o mesmo sistema do arrasto.
interface Redim {
  el: HTMLElement;
  dir: DirAlca;
  // Caixa inicial do elemento, relativa ao offsetParent (offsetLeft/Top/W/H).
  left0: number;
  top0: number;
  w0: number;
  h0: number;
  // Ponteiro no inicio, em px do slide.
  x0: number;
  y0: number;
  // Proporcao inicial largura/altura, pra travar imagem no canto.
  ratio: number;
  // Verdadeiro quando o alvo e uma imagem (canto trava proporcao por padrao).
  img: boolean;
  win: Window;
}

// Tamanho da alca na TELA (px). Convertido pra px de slide dividindo pela
// escala, pra alca ficar do mesmo tamanho visual em qualquer zoom.
// Sao duas medidas de proposito: o QUADRADINHO desenhado tem 10 px, o padrao de
// editor (Konva usa 10, Excalidraw 8 no mouse), e a AREA DE CLIQUE tem 24 px, o
// minimo do WCAG 2.5.8 (AA). Desenhar 24 px deixaria a alca gorda em cima da
// peca; a area maior mora num pseudo-elemento transparente.
const TAM_ALCA = 10;
const ALVO_ALCA = 24;
// Abaixo de 5 vezes a alca no eixo, as alcas de LADO somem e ficam so os cantos:
// senao elas se sobrepoem e o gesto vira loteria. Regra do Excalidraw
// (minimumSizeForEightHandles).
const MIN_ALCA_LATERAL = 5 * TAM_ALCA;
// Tamanho minimo (px de slide) de um elemento redimensionado.
const MIN_REDIM = 16;

// Distancia da tela pra iniciar o arrasto (nao confundir com clique).
const LIMIAR_ARRASTO = 3;
// Distancia (em px de TELA) pro alinhamento grudar. 8 px e o valor documentado
// pelo tldraw, escalado pelo zoom: a tolerancia e do olho, nao do documento.
const LIMIAR_SNAP = 8;

// Assinatura de um elemento: tag + lista de classes ordenada. Serve pra achar
// os "irmaos" em todas as paginas quando "aplicar em todas" esta on.
function assinaturaDe(el: Element): string {
  return el.tagName + "|" + Array.from(el.classList).sort().join(".");
}

// Le o offset atual (left/top numerico) do elemento, preferindo o inline.
function offsetAtual(el: HTMLElement, cs: CSSStyleDeclaration): { left: number; top: number } {
  const li = el.style.left ? lerNum(el.style.left) : NaN;
  const ti = el.style.top ? lerNum(el.style.top) : NaN;
  const left = !isNaN(li) ? li : cs.left !== "auto" ? lerNum(cs.left) : 0;
  const top = !isNaN(ti) ? ti : cs.top !== "auto" ? lerNum(cs.top) : 0;
  return { left, top };
}

// Z-index efetivo pro empilhamento (auto conta como 0).
function zEfetivo(el: HTMLElement): number {
  const v = el.ownerDocument.defaultView?.getComputedStyle(el).zIndex ?? "auto";
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

// Filhos elemento visiveis de um pai (sem artefatos do editor nem tags mudas),
// ordenados por empilhamento EFETIVO, do mais alto pro mais baixo: z-index
// computado, com desempate pela ordem no DOM (quem vem depois pinta por cima).
function filhosEmpilhados(pai: HTMLElement): HTMLElement[] {
  const lista: { el: HTMLElement; z: number; ordem: number }[] = [];
  Array.from(pai.children).forEach((c, i) => {
    if (c.nodeType !== 1) return;
    const el = c as HTMLElement;
    if (el.classList.contains("vkos-ed-guia")) return;
    if (el.classList.contains("vkos-ed-alca")) return;
    if (/^(STYLE|SCRIPT|LINK|BR)$/.test(el.tagName)) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    lista.push({ el, z: zEfetivo(el), ordem: i });
  });
  return lista.sort((a, b) => b.z - a.z || b.ordem - a.ordem).map((x) => x.el);
}

// Texto visivel de um elemento, normalizado, cortado nas primeiras palavras.
function primeirasPalavras(el: HTMLElement, max = 28): string {
  const texto = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (texto.length <= max) return texto;
  return texto.slice(0, max).replace(/\s+\S*$/, "") + "...";
}

export function usarMotorEdicao(
  refIframe: RefObject<HTMLIFrameElement | null>,
  opts: OpcoesMotor,
): MotorEdicao {
  const [pronto, setPronto] = useState(false);
  const [paginas, setPaginas] = useState(1);
  const [vars, setVars] = useState<VarCss[]>([]);
  const [fontesOpc, setFontesOpc] = useState<string[]>(FONTES_SEGURAS);
  const [selecao, setSelecao] = useState<PropsSel | null>(null);
  const [naoSalvo, setNaoSalvo] = useState(false);
  const [podeDesfazer, setPodeDesfazer] = useState(false);
  const [podeRefazer, setPodeRefazer] = useState(false);
  // Instante da ultima gravacao bem sucedida. Zero enquanto nada foi salvo nesta
  // sessao de edicao. Serve pro aviso "salvo" da tela, que hoje so tinha o
  // sumico do ponto de nao salvo como sinal.
  const [salvoEm, setSalvoEm] = useState(0);
  const [versaoDoc, setVersaoDoc] = useState(0);

  // opts muda de identidade a cada render, entao guardamos num ref pros
  // listeners sempre enxergarem a versao atual sem reanexar.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const selRef = useRef<HTMLElement | null>(null);
  const varsRef = useRef<VarCss[]>([]);
  const editadasRef = useRef<Set<string>>(new Set());
  // 50 passos: o padrao do Photoshop. As bibliotecas de texto usam 100, mas
  // aqui cada passo e o corpo inteiro do documento serializado, bem mais pesado
  // que um diff de texto.
  const histRef = useRef(new Historico<Snapshot>(50));
  // Ultimo passo registrado, pro agrupamento de gesto continuo (setas seguidas).
  const ultimoPassoRef = useRef<PassoGesto | null>(null);
  const arrastoRef = useRef<Arrasto | null>(null);
  const redimRef = useRef<Redim | null>(null);
  const suprimirCliqueRef = useRef(false);
  // Contador de ids data-vk semeados no doc (mesmo esquema "aN" do site).
  const contadorVkRef = useRef(0);
  // Ultimo ponto de clique, pro ciclo de clique repetido entre empilhados.
  const cliqueAnteriorRef = useRef<{ x: number; y: number } | null>(null);
  // Elemento em edicao in-place (contentEditable) e o innerHTML de quando
  // entrou, pra saber se mudou de verdade ao sair.
  const editandoRef = useRef<HTMLElement | null>(null);
  const edAntesRef = useRef<string>("");
  // Handlers estaveis (identidade fixa) pra dar e tirar do elemento editado
  // mesmo que a edicao atravesse renders. finalizarEdRef aponta sempre pra
  // versao atual de finalizarEdicao.
  const finalizarEdRef = useRef<() => void>(() => {});
  const aoBlurEd = useRef(() => finalizarEdRef.current());

  const getDoc = (): Document | null => refIframe.current?.contentDocument ?? null;
  const escala = (): number => {
    const e = optsRef.current.obterEscala?.() ?? 1;
    return e > 0 ? e : 1;
  };

  function marcarMudou() {
    setNaoSalvo(true);
    setVersaoDoc((v) => v + 1);
    optsRef.current.aoMudar();
  }

  // ===== Estilo do editor injetado no documento (removido no save). So
  // instrumentacao: contorno da selecao, cursor de arrasto e guias. O layout
  // (quais slides aparecem) e de quem monta, em outro <style>.
  function injetarEstilo(doc: Document) {
    let s = doc.getElementById("vkos-ed-runtime") as HTMLStyleElement | null;
    if (!s) {
      s = doc.createElement("style");
      s.id = "vkos-ed-runtime";
      doc.head.appendChild(s);
    }
    // A cor vem do token --menta-viva do documento do HUB, resolvida agora: o
    // doc do iframe nao enxerga as variaveis do app. Ver editor/tema.ts.
    //
    // POR QUE --menta-viva E NAO --menta, NEM --acao. Esta e a UNICA marcacao
    // de selecao do Hub que nao segue a regra "selecionado e superficie mais
    // fio em --acao": ela e desenhada por cima do conteudo COLORIDO do
    // usuario, que pode ser preto, branco ou qualquer foto. A tinta de --acao
    // (quase preta no Claro, quase branca no Escuro) desapareceria em metade
    // das pecas. O --menta-viva e o token de SINAL do sistema, passa em 3:1
    // contra os quatro planos nos dois temas e nao se confunde com nenhuma
    // cor de moldura, porque a moldura nao tem cor. E instrumentacao de
    // editor, removida na serializacao, nunca parte da peca.
    const menta = corDoTema("--menta-viva");
    const canais = canaisRgb(menta) || "47, 212, 167";
    s.textContent =
      `[data-ed-sel]{outline:2px solid ${menta} !important;outline-offset:-2px !important;cursor:move !important;}` +
      `[data-ed-editando]{outline:2px dashed ${menta} !important;outline-offset:2px !important;cursor:text !important;}` +
      "[data-ed-editando] *{cursor:text !important;}" +
      // Muitos carrosseis usam um frame decorativo com pointer-events:none.
      // A propriedade e herdada, entao o img interno ficava impossivel de
      // selecionar. O override so existe no runtime do Studio e nao vaza pro
      // HTML salvo: qualquer imagem real de um slide volta a ser um alvo.
      // -webkit-user-drag:none mata o arrasto NATIVO da imagem (o fantasma que
      // o navegador cria ao puxar um <img>). Sem isso o gesto do editor era
      // roubado pelo drag-and-drop nativo e a imagem nem selecionava no clique.
      // So no runtime do Studio, nao vaza pro HTML salvo.
      ".slide img{pointer-events:auto !important;cursor:move !important;-webkit-user-drag:none !important;user-drag:none !important;}" +
      ".vkos-ed-arrastando,.vkos-ed-arrastando *{cursor:grabbing !important;}" +
      // Guia de alinhamento: um SEGMENTO, nao uma linha atravessando a pagina.
      // A geometria (left/top/width/height) e escrita inline a cada movimento,
      // porque muda com o par que alinhou. Ver editor/alinhamento.ts.
      `.vkos-ed-guia{position:absolute;background:${menta};pointer-events:none;z-index:2147483646;box-shadow:0 0 4px rgba(${canais},0.55);}` +
      ".vkos-ed-guia-v{width:1px;}" +
      ".vkos-ed-guia-h{height:1px;}" +
      // Guia de centro fica pontilhada pra o olho separar "alinhei pelo meio"
      // de "encostei numa borda" sem precisar contar pixel.
      `.vkos-ed-guia-centro{background:repeating-linear-gradient(var(--vkos-ed-eixo,to bottom),${menta} 0 7px,transparent 7px 13px);}` +
      // Alcas de redimensionamento: quadradinhos brancos com borda menta, sempre
      // por cima, pointer-events auto pra pegar o gesto. So instrumentacao, o
      // serializador as remove com as guias.
      // A caixa da alca e a AREA DE CLIQUE (transparente, 24px de tela). O
      // quadradinho visivel de 10px e desenhado pelo ::after no centro dela.
      ".vkos-ed-alca{position:absolute;background:transparent;border:0;box-sizing:border-box;" +
      "z-index:2147483645;pointer-events:auto;display:block;}" +
      `.vkos-ed-alca::after{content:'';position:absolute;left:50%;top:50%;` +
      `width:var(--vkos-ed-alca-tam,10px);height:var(--vkos-ed-alca-tam,10px);` +
      `transform:translate(-50%,-50%);background:#fff;border:2px solid ${menta};` +
      "border-radius:2px;box-sizing:border-box;box-shadow:0 0 3px rgba(0,0,0,0.45);}";
  }

  // Detecta o fundo de um slide: a maior imagem ou o maior elemento com
  // background-image. Retorna null se nada cobre o slide o bastante.
  function detectarFundo(doc: Document, i: number): Fundo | null {
    const slide = doc.querySelectorAll<HTMLElement>(".slide")[i];
    const win = doc.defaultView;
    if (!slide || !win) return null;
    let melhor: HTMLElement | null = null;
    let tipo: "img" | "bg" = "bg";
    let maiorArea = 0;
    slide.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const area = el.offsetWidth * el.offsetHeight;
      if (area <= maiorArea) return;
      if (el.tagName === "IMG") {
        melhor = el;
        tipo = "img";
        maiorArea = area;
        return;
      }
      const cs = win.getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage.includes("url(")) {
        melhor = el;
        tipo = "bg";
        maiorArea = area;
      }
    });
    const areaSlide = slide.offsetWidth * slide.offsetHeight;
    if (melhor && maiorArea > areaSlide * 0.2) return { el: melhor, tipo };
    return null;
  }

  function imagemDoElemento(el: HTMLElement): { tipo: "img" | "bg"; src: string } | null {
    if (el.tagName === "IMG") {
      return { tipo: "img", src: (el as HTMLImageElement).getAttribute("src") || "" };
    }
    const valor = el.ownerDocument.defaultView?.getComputedStyle(el).backgroundImage || "";
    const src = extrairUrlFundo(valor);
    return src ? { tipo: "bg", src } : null;
  }

  // ===== Selecao.
  function propsDe(el: HTMLElement): PropsSel {
    const win = el.ownerDocument.defaultView!;
    const cs = win.getComputedStyle(el);
    const familia = primeiraFonte(el.style.fontFamily || cs.fontFamily);
    setFontesOpc((prev) => (prev.includes(familia) ? prev : [familia, ...prev]));
    const semBloco = soFilhosInline(el);
    const imagem = imagemDoElemento(el);
    const slide = el.closest<HTMLElement>(".slide");
    const pai = el.parentElement;
    return {
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList).join(" "),
      texto: el.textContent || "",
      editavelTexto: temTextoProprio(el) && semBloco,
      temDestaqueInline: semBloco && el.children.length > 0,
      editando: editandoRef.current === el,
      fonte: familia,
      tamanho: Math.round(parseFloat(cs.fontSize) || 0),
      peso: String(cs.fontWeight || "400"),
      cor: rgbParaHex(cs.color) || "#ffffff",
      posicaoAjustada: el.hasAttribute("data-ed-mov"),
      ehImagem: imagem !== null,
      tipoImagem: imagem?.tipo === "bg" ? "fundo" : imagem?.tipo ?? null,
      srcImagem: imagem?.src ?? "",
      podeSubirNivel: !!(slide && pai && pai !== slide),
      podeExcluir: !!slide && el !== slide,
      vkId: el.getAttribute("data-vk") || "",
      larguraPx: Math.round(el.getBoundingClientRect().width),
      alturaPx: Math.round(el.getBoundingClientRect().height),
      redimensionavel: elementoRedimensionavel(el, cs),
    };
  }

  // So absolute/fixed (fora slide/body/html) ganham as alcas: left/top/width/
  // height definem a caixa sem ambiguidade. Elemento de fluxo redimensiona pela
  // largura numerica do painel, sem alca, pra nao arriscar reflow.
  function elementoRedimensionavel(el: HTMLElement, cs: CSSStyleDeclaration): boolean {
    if (el.matches(".slide,body,html")) return false;
    return cs.position === "absolute" || cs.position === "fixed";
  }

  function selecionar(el: HTMLElement) {
    const doc = el.ownerDocument;
    if (!doc.defaultView) return;
    // O slide e o canvas da pagina, nunca um objeto editavel. Seleciona-lo
    // permitia arrastar a pagina inteira e gravar left/top no carrossel.
    if (el.matches(".slide,body,html")) {
      limparSelecao();
      return;
    }
    doc.querySelectorAll("[data-ed-sel]").forEach((n) => n.removeAttribute("data-ed-sel"));
    el.setAttribute("data-ed-sel", "1");
    selRef.current = el;
    setSelecao(propsDe(el));
    sincronizarAlcas();
  }

  // Recalcula as props da selecao atual sem trocar o alvo (apos uma edicao).
  function ressincronizarSelecao() {
    const el = selRef.current;
    if (el && el.isConnected) {
      setSelecao(propsDe(el));
      sincronizarAlcas();
    }
  }

  function limparSelecao() {
    if (editandoRef.current) finalizarEdicao();
    const doc = getDoc();
    doc?.querySelectorAll("[data-ed-sel]").forEach((n) => n.removeAttribute("data-ed-sel"));
    removerAlcas();
    selRef.current = null;
    setSelecao(null);
  }

  function selecionarPai(): void {
    const el = selRef.current;
    const slide = el?.closest<HTMLElement>(".slide");
    const pai = el?.parentElement;
    if (!el || !slide || !pai || pai === slide) return;
    selecionar(pai);
  }

  function excluirSelecionado(): void {
    const el = selRef.current;
    const slide = el?.closest<HTMLElement>(".slide");
    if (!el || !slide || el === slide) return;
    if (editandoRef.current === el) finalizarEdicao();
    snapshot();
    el.remove();
    selRef.current = null;
    setSelecao(null);
    marcarMudou();
  }

  // ===== Edicao de texto in-place (duplo clique). Liga contentEditable no
  // proprio elemento, preservando os filhos inline (destaque, br). Sai no Esc,
  // no clique fora ou no blur. O snapshot da entrada deixa o Ctrl+Z cobrir.
  function iniciarEdicao(el: HTMLElement, x: number, y: number) {
    if (editandoRef.current === el) return;
    if (editandoRef.current) finalizarEdicao();
    const doc = el.ownerDocument;
    if (!doc.defaultView) return;
    snapshot();
    selecionar(el);
    editandoRef.current = el;
    // Editando nao mostra alcas: o gesto vira cursor de texto.
    removerAlcas();
    el.addEventListener("blur", aoBlurEd.current);
    // O nucleo liga o contentEditable, foca e posiciona o cursor no ponto, e
    // devolve o innerHTML de antes pra deteccao de mudanca no finalizarEdicao.
    edAntesRef.current = entrarContentEditable(el, x, y);
    setSelecao((p) => (p ? { ...p, editando: true } : p));
  }

  function finalizarEdicao() {
    const el = editandoRef.current;
    if (!el) return;
    editandoRef.current = null;
    el.removeEventListener("blur", aoBlurEd.current);
    sairContentEditable(el);
    // So conta como mudanca se o conteudo mudou de fato. Sem mudanca, descarta
    // o snapshot da entrada pra nao deixar um "desfazer" vazio.
    if (el.innerHTML !== edAntesRef.current) {
      marcarMudou();
    } else {
      histRef.current.descartarUltimo();
      sincronizarBotoesHistorico();
    }
    ressincronizarSelecao();
  }
  finalizarEdRef.current = finalizarEdicao;

  // ===== Snapshot pro desfazer: corpo do doc mais o mapa de vars editadas.
  function capturarSnapshot(): Snapshot | null {
    const doc = getDoc();
    if (!doc) return null;
    const clone = doc.body.cloneNode(true) as HTMLElement;
    limparArtefatosSelecao(clone);
    const mapa: Record<string, string> = {};
    for (const v of varsRef.current) {
      mapa[v.nome] = doc.documentElement.style.getPropertyValue(v.nome) || "";
    }
    return { body: clone.innerHTML, vars: mapa };
  }

  function sincronizarBotoesHistorico() {
    setPodeDesfazer(histRef.current.temDesfazer);
    setPodeRefazer(histRef.current.temRefazer);
  }

  // Registra o estado de ANTES de uma acao. Quando "gesto" vem preenchido e o
  // toque continua o gesto anterior (mesma acao, mesmo elemento, dentro da
  // janela de tempo), NAO empilha: assim vinte toques de seta viram um unico
  // passo de desfazer, que volta pra posicao de antes do gesto inteiro.
  // A decisao esta em alinhamento.ts, testada sem DOM.
  function snapshot(gesto?: { acao: string; alvo: string }) {
    const passo: PassoGesto | null = gesto
      ? { acao: gesto.acao, alvo: gesto.alvo, momento: Date.now() }
      : null;
    if (passo && deveAgruparPasso(ultimoPassoRef.current, passo)) {
      ultimoPassoRef.current = passo;
      return;
    }
    ultimoPassoRef.current = passo;
    const snap = capturarSnapshot();
    if (!snap) return;
    histRef.current.registrar(snap);
    sincronizarBotoesHistorico();
  }

  // Aplica um snapshot no documento, preservando a selecao pelo data-vk: o no
  // atual morre com o innerHTML, mas o id estavel sobrevive no snapshot.
  function restaurar(snap: Snapshot) {
    const doc = getDoc();
    if (!doc) return;
    if (editandoRef.current) finalizarEdicao();
    const idSel = selRef.current?.getAttribute("data-vk") || null;
    selRef.current = null;
    setSelecao(null);
    doc.body.innerHTML = snap.body;
    for (const [n, v] of Object.entries(snap.vars)) {
      if (v) doc.documentElement.style.setProperty(n, v);
    }
    setVars((prev) => prev.map((x) => ({ ...x, valor: snap.vars[x.nome] || x.valor })));
    if (idSel) {
      const el = doc.querySelector<HTMLElement>(`[data-vk="${idSel}"]`);
      if (el) selecionar(el);
    }
    sincronizarBotoesHistorico();
    marcarMudou();
  }

  function desfazer() {
    const atual = capturarSnapshot();
    if (!atual) return;
    // Um desfazer sempre fecha o gesto corrente: o proximo toque comeca outro
    // passo, senao ele agruparia com o que acabou de ser desfeito.
    ultimoPassoRef.current = null;
    const snap = histRef.current.desfazer(atual);
    if (!snap) return;
    restaurar(snap);
  }

  function refazer() {
    const atual = capturarSnapshot();
    if (!atual) return;
    ultimoPassoRef.current = null;
    const snap = histRef.current.refazer(atual);
    if (!snap) return;
    restaurar(snap);
  }

  // ===== Estilo no elemento selecionado (e nos irmaos se emTodas).
  function irmaos(el: HTMLElement): HTMLElement[] {
    const doc = el.ownerDocument;
    const alvo = assinaturaDe(el);
    return Array.from(doc.querySelectorAll<HTMLElement>(el.tagName.toLowerCase())).filter(
      (x) => assinaturaDe(x) === alvo,
    );
  }

  function comEstilo(prop: string, valor: string, emTodas: boolean) {
    const el = selRef.current;
    if (!el) return;
    snapshot();
    const alvos = emTodas ? irmaos(el) : [el];
    alvos.forEach((a) => a.style.setProperty(prop, valor));
    marcarMudou();
    ressincronizarSelecao();
  }

  function aplicarTexto(v: string) {
    const el = selRef.current;
    if (!el) return;
    snapshot();
    el.textContent = v;
    marcarMudou();
    setSelecao((p) => (p ? { ...p, texto: v } : p));
  }

  function aplicarVar(nome: string, valor: string) {
    const doc = getDoc();
    if (!doc) return;
    snapshot();
    doc.documentElement.style.setProperty(nome, valor);
    editadasRef.current.add(nome);
    setVars((prev) => prev.map((x) => (x.nome === nome ? { ...x, valor } : x)));
    marcarMudou();
    // A cor computada do selecionado pode depender da var que mudou.
    ressincronizarSelecao();
  }

  // ===== Mover elementos.
  // Garante que o elemento aceita left/top. Estatico vira relative (marcado
  // pra desfazer no reset). Absolute/fixed ja posicionam, nao mexemos.
  function garantirPosicionavel(el: HTMLElement, cs: CSSStyleDeclaration) {
    if (cs.position === "static" && !el.hasAttribute("data-ed-relpos")) {
      el.style.position = "relative";
      el.setAttribute("data-ed-relpos", "1");
    }
  }

  // Absolute/fixed com right ou bottom ancorados no CSS fazem o left/top do
  // arrasto REDIMENSIONAR em vez de mover (a borda oposta fica presa e a largura
  // ou altura encolhe). Antes de mover, trava o tamanho atual e solta o lado
  // ancorado, pra left/top passarem a transladar de verdade. Guarda em
  // data-ed-livre o que soltou, pro reset restaurar sem residuo.
  function liberarParaMover(el: HTMLElement, cs: CSSStyleDeclaration) {
    if (cs.position !== "absolute" && cs.position !== "fixed") return;
    if (el.hasAttribute("data-ed-livre")) return;
    const soltou: string[] = [];
    if (cs.right !== "auto") {
      if (!el.style.width) {
        el.style.width = el.offsetWidth + "px";
        soltou.push("width");
      }
      el.style.right = "auto";
      soltou.push("right");
    }
    if (cs.bottom !== "auto") {
      if (!el.style.height) {
        el.style.height = el.offsetHeight + "px";
        soltou.push("height");
      }
      el.style.bottom = "auto";
      soltou.push("bottom");
    }
    if (soltou.length) el.setAttribute("data-ed-livre", soltou.join(","));
  }

  // Aplica um deslocamento incremental (usado pelas setas do teclado).
  function deslocar(el: HTMLElement, dx: number, dy: number) {
    const cs = el.ownerDocument.defaultView!.getComputedStyle(el);
    garantirPosicionavel(el, cs);
    liberarParaMover(el, cs);
    const { left, top } = offsetAtual(el, cs);
    el.style.left = left + dx + "px";
    el.style.top = top + dy + "px";
    el.setAttribute("data-ed-mov", "1");
  }

  function moverSelecao(dx: number, dy: number) {
    const el = selRef.current;
    if (!el || el.matches(".slide,body,html")) return;
    // Gesto de seta: toques seguidos no mesmo elemento viram UM passo. Antes
    // disso, 20 toques comiam 20 dos 40 lugares da pilha e apagavam a historia.
    snapshot({ acao: "seta", alvo: el.getAttribute("data-vk") || "" });
    deslocar(el, dx, dy);
    marcarMudou();
    ressincronizarSelecao();
  }

  // Duplica o selecionado no mesmo pai, deslocado alguns pixels, e ja seleciona
  // a copia. E o gesto que o usuario espera de Ctrl+D num editor visual: repetir
  // um cartao ou um enfeite sem passar pela IA nem pelo HTML.
  const DESLOC_COPIA = 24;
  function duplicarSelecionado(): void {
    const el = selRef.current;
    const doc = getDoc();
    const slide = el?.closest<HTMLElement>(".slide");
    const pai = el?.parentElement;
    if (!el || !doc || !slide || !pai || el === slide) return;
    if (editandoRef.current) finalizarEdicao();
    snapshot();
    const copia = el.cloneNode(true) as HTMLElement;
    limparArtefatosSelecao(copia);
    copia.removeAttribute("data-ed-sel");
    // Ids novos pra copia e pra toda a descendencia: data-vk repetido quebraria
    // o painel de camadas, a re-selecao do desfazer e a reordenacao.
    copia.setAttribute("data-vk", "a" + ++contadorVkRef.current);
    copia.querySelectorAll<HTMLElement>("[data-vk]").forEach((n) => {
      n.setAttribute("data-vk", "a" + ++contadorVkRef.current);
    });
    pai.insertBefore(copia, el.nextSibling);
    // A copia nasce visivel ao lado da original, nunca exatamente por baixo.
    const cs = doc.defaultView!.getComputedStyle(copia);
    garantirPosicionavel(copia, cs);
    liberarParaMover(copia, cs);
    const base = offsetAtual(copia, cs);
    copia.style.left = base.left + DESLOC_COPIA + "px";
    copia.style.top = base.top + DESLOC_COPIA + "px";
    copia.setAttribute("data-ed-mov", "1");
    marcarMudou();
    selecionar(copia);
  }

  function resetarPosicao() {
    const el = selRef.current;
    if (!el || !el.hasAttribute("data-ed-mov")) return;
    snapshot();
    el.style.removeProperty("left");
    el.style.removeProperty("top");
    if (el.hasAttribute("data-ed-relpos")) {
      el.style.removeProperty("position");
      el.removeAttribute("data-ed-relpos");
    }
    const livre = el.getAttribute("data-ed-livre");
    if (livre) {
      livre.split(",").forEach((p) => el.style.removeProperty(p));
      el.removeAttribute("data-ed-livre");
    }
    el.removeAttribute("data-ed-mov");
    marcarMudou();
    ressincronizarSelecao();
  }

  // ===== Alcas de redimensionamento (bordas interativas).
  // As alcas vivem DENTRO do slide como filhos absolutos (classe vkos-ed-alca),
  // no mesmo sistema de coordenadas do arrasto. Nunca entram no desfazer nem no
  // HTML salvo (limpas junto das guias) e nunca sao alvo de clique ou camada.

  function removerAlcas() {
    const doc = getDoc();
    doc?.querySelectorAll(".vkos-ed-alca").forEach((n) => n.remove());
  }

  // (Re)desenha as oito alcas sobre a selecao, se ela for redimensionavel e nao
  // houver edicao ou gesto em andamento. Tamanho constante na tela via escala.
  function sincronizarAlcas() {
    removerAlcas();
    const el = selRef.current;
    const doc = getDoc();
    if (!el || !doc || !el.isConnected) return;
    if (editandoRef.current || arrastoRef.current || redimRef.current) return;
    const win = doc.defaultView;
    if (!win) return;
    if (!elementoRedimensionavel(el, win.getComputedStyle(el))) return;
    const slide = el.closest<HTMLElement>(".slide");
    if (!slide) return;
    // Caixa do elemento em coordenadas do slide (px do doc, sem a escala css).
    const er = el.getBoundingClientRect();
    const sr = slide.getBoundingClientRect();
    const bx = er.left - sr.left;
    const by = er.top - sr.top;
    const bw = er.width;
    const bh = er.height;
    const esc = escala();
    // Tamanhos em px de SLIDE, pra alca ficar do mesmo tamanho na tela em
    // qualquer zoom: o desenho (10px) e o alvo de clique (24px).
    const desenho = TAM_ALCA / esc;
    // A area de clique nunca passa da metade do elemento em nenhum eixo: num
    // objeto pequeno, oito alvos de 24px cobririam a peca inteira e ninguem
    // conseguiria mais clicar nela nem arrastar. Nunca fica menor que o desenho.
    const alvo = Math.max(desenho, Math.min(ALVO_ALCA / esc, bw / 2, bh / 2));
    const minLado = MIN_ALCA_LATERAL / esc;
    const ponto: Record<DirAlca, [number, number]> = {
      nw: [bx, by],
      n: [bx + bw / 2, by],
      ne: [bx + bw, by],
      e: [bx + bw, by + bh / 2],
      se: [bx + bw, by + bh],
      s: [bx + bw / 2, by + bh],
      sw: [bx, by + bh],
      w: [bx, by + bh / 2],
    };
    DIRS_ALCA.forEach((dir) => {
      // Elemento estreito ou baixo perde a alca de lado do eixo apertado: duas
      // alcas coladas viram loteria pro ponteiro.
      if ((dir === "n" || dir === "s") && bw < minLado) return;
      if ((dir === "e" || dir === "w") && bh < minLado) return;
      const [ax, ay] = ponto[dir];
      const a = doc.createElement("div");
      a.className = "vkos-ed-alca";
      a.setAttribute("data-ed-dir", dir);
      a.style.width = alvo + "px";
      a.style.height = alvo + "px";
      a.style.left = ax - alvo / 2 + "px";
      a.style.top = ay - alvo / 2 + "px";
      a.style.setProperty("--vkos-ed-alca-tam", desenho + "px");
      a.style.cursor = CURSOR_ALCA[dir];
      slide.appendChild(a);
    });
  }

  // Deixa a caixa do elemento explicita (left/top/width/height) e solta os lados
  // ancorados (right/bottom), pra o redimensionamento ser exato e sem encolher.
  // Registra em data-ed-livre o que ADICIONAMOS, pro reset restaurar sem residuo.
  function prepararCaixa(el: HTMLElement) {
    const L = el.offsetLeft;
    const T = el.offsetTop;
    const W = el.offsetWidth;
    const H = el.offsetHeight;
    const cs = el.ownerDocument.defaultView!.getComputedStyle(el);
    const soltou = new Set(
      (el.getAttribute("data-ed-livre") || "").split(",").filter(Boolean),
    );
    const fixar = (prop: string, valor: string) => {
      if (!el.style.getPropertyValue(prop)) soltou.add(prop);
      el.style.setProperty(prop, valor);
    };
    fixar("width", W + "px");
    fixar("height", H + "px");
    fixar("left", L + "px");
    fixar("top", T + "px");
    if (cs.right !== "auto") {
      el.style.right = "auto";
      soltou.add("right");
    }
    if (cs.bottom !== "auto") {
      el.style.bottom = "auto";
      soltou.add("bottom");
    }
    if (soltou.size) el.setAttribute("data-ed-livre", Array.from(soltou).join(","));
    el.setAttribute("data-ed-mov", "1");
  }

  function iniciarRedim(alca: HTMLElement, e: MouseEvent) {
    const el = selRef.current;
    const win = el?.ownerDocument.defaultView;
    if (!el || !win) return;
    const dir = (alca.getAttribute("data-ed-dir") || "se") as DirAlca;
    e.preventDefault();
    e.stopPropagation();
    snapshot();
    prepararCaixa(el);
    const img = imagemDoElemento(el) !== null;
    redimRef.current = {
      el,
      dir,
      left0: el.offsetLeft,
      top0: el.offsetTop,
      w0: el.offsetWidth,
      h0: el.offsetHeight,
      x0: e.clientX,
      y0: e.clientY,
      ratio: el.offsetWidth / Math.max(1, el.offsetHeight),
      img,
      win,
    };
    // Some com as alcas durante o gesto (o contorno mostra o tamanho ao vivo);
    // voltam no fim, ja na caixa nova.
    removerAlcas();
    getDoc()?.documentElement.classList.add("vkos-ed-arrastando");
    win.addEventListener("mousemove", aoMoverRedimIframe, true);
    win.addEventListener("mouseup", aoSoltarRedim, true);
    window.addEventListener("mousemove", aoMoverRedimApp, true);
    window.addEventListener("mouseup", aoSoltarRedim, true);
  }

  // Movimento do ponteiro dentro do iframe: clientX/Y ja sao px do slide.
  function aoMoverRedimIframe(e: MouseEvent) {
    aplicarRedim(e.clientX, e.clientY, e.shiftKey);
  }
  // Ponteiro saiu do iframe: converte de px de tela do app pra px de slide.
  function aoMoverRedimApp(e: MouseEvent) {
    const rect = refIframe.current?.getBoundingClientRect();
    const esc = escala();
    aplicarRedim(
      (e.clientX - (rect?.left ?? 0)) / esc,
      (e.clientY - (rect?.top ?? 0)) / esc,
      e.shiftKey,
    );
  }

  // Coracao do redimensionamento. dx/dy em px do slide. Cada direcao move a
  // aresta correspondente; a aresta oposta fica ancorada. Imagem em canto trava
  // a proporcao (Shift libera); bloco em canto e livre (Shift trava). Tamanho
  // minimo garantido pelos dois lados.
  function aplicarRedim(px: number, py: number, shift: boolean) {
    const r = redimRef.current;
    if (!r) return;
    const dx = px - r.x0;
    const dy = py - r.y0;
    const leste = r.dir.includes("e");
    const oeste = r.dir.includes("w");
    const sul = r.dir.includes("s");
    const norte = r.dir.includes("n");
    let w = r.w0;
    let h = r.h0;
    if (leste) w = r.w0 + dx;
    if (oeste) w = r.w0 - dx;
    if (sul) h = r.h0 + dy;
    if (norte) h = r.h0 - dy;
    const canto = (leste || oeste) && (norte || sul);
    const travar = canto && (r.img ? !shift : shift);
    if (travar) {
      // Mantem a proporcao pelo eixo de maior variacao relativa.
      const porLargura = h * r.ratio;
      if (Math.abs(w - r.w0) >= Math.abs(porLargura - r.w0)) h = w / r.ratio;
      else w = h * r.ratio;
    }
    w = Math.max(MIN_REDIM, w);
    h = Math.max(MIN_REDIM, h);
    if (travar) {
      // Reforca a proporcao apos o clamp de minimo.
      if (w / r.ratio >= MIN_REDIM) h = w / r.ratio;
      else {
        h = MIN_REDIM;
        w = h * r.ratio;
      }
    }
    // Ancora a aresta oposta: mover oeste/norte recoloca left/top.
    const left = oeste ? r.left0 + (r.w0 - w) : r.left0;
    const top = norte ? r.top0 + (r.h0 - h) : r.top0;
    r.el.style.width = Math.round(w) + "px";
    r.el.style.height = Math.round(h) + "px";
    r.el.style.left = Math.round(left) + "px";
    r.el.style.top = Math.round(top) + "px";
  }

  function aoSoltarRedim() {
    const r = redimRef.current;
    if (r) {
      r.win.removeEventListener("mousemove", aoMoverRedimIframe, true);
      r.win.removeEventListener("mouseup", aoSoltarRedim, true);
    }
    window.removeEventListener("mousemove", aoMoverRedimApp, true);
    window.removeEventListener("mouseup", aoSoltarRedim, true);
    redimRef.current = null;
    getDoc()?.documentElement.classList.remove("vkos-ed-arrastando");
    if (!r) return;
    // Evita que o clique de fim de gesto re-selecione ou solte a selecao.
    suprimirCliqueRef.current = true;
    marcarMudou();
    ressincronizarSelecao();
  }

  // Cria uma guia (segmento) dentro do slide, escondida. A geometria e escrita
  // a cada movimento por desenharGuia: ela muda conforme o par que alinhou.
  function criarGuia(doc: Document, slide: HTMLElement, eixo: "v" | "h"): HTMLElement {
    const g = doc.createElement("div");
    g.className = "vkos-ed-guia vkos-ed-guia-" + eixo;
    g.style.display = "none";
    slide.appendChild(g);
    return g;
  }

  // Posiciona uma guia em coordenadas do slide. Vertical: x fixo, altura do
  // segmento. Horizontal: y fixo, largura do segmento.
  function desenharGuia(g: HTMLElement | null, guia: Guia | undefined) {
    if (!g) return;
    if (!guia) {
      g.style.display = "none";
      return;
    }
    const tam = Math.max(1, guia.ate - guia.de);
    if (guia.eixo === "v") {
      g.style.left = guia.posicao + "px";
      g.style.top = guia.de + "px";
      g.style.height = tam + "px";
      // Direcao do tracejado da guia de centro, que segue o eixo da linha.
      g.style.setProperty("--vkos-ed-eixo", "to bottom");
    } else {
      g.style.top = guia.posicao + "px";
      g.style.left = guia.de + "px";
      g.style.width = tam + "px";
      g.style.setProperty("--vkos-ed-eixo", "to right");
    }
    g.classList.toggle("vkos-ed-guia-centro", guia.tipo === "centro");
    g.style.display = "block";
  }

  // Quantos vizinhos entram na conta do alinhamento. Passar disso so acrescenta
  // ruido de guia e trabalho por frame, num slide que nunca tem tanto objeto.
  const MAX_VIZINHOS = 48;

  // Caixa de um elemento em coordenadas do slide (px do doc, sem a escala css).
  function caixaNoSlide(el: HTMLElement, rSlide: DOMRect): Caixa {
    const r = el.getBoundingClientRect();
    return {
      esquerda: r.left - rSlide.left,
      topo: r.top - rSlide.top,
      largura: r.width,
      altura: r.height,
    };
  }

  // Vizinhos com quem vale alinhar: os objetos de topo do slide mais os irmaos
  // diretos do arrastado, sem ele proprio, sem quem o contem e sem artefato do
  // editor. Medidos UMA vez, no inicio do gesto: eles nao se mexem durante ele.
  function coletarVizinhos(el: HTMLElement, slide: HTMLElement): Caixa[] {
    const rSlide = slide.getBoundingClientRect();
    const candidatos: HTMLElement[] = [...filhosEmpilhados(slide)];
    const pai = el.parentElement;
    if (pai && pai !== slide) candidatos.push(...filhosEmpilhados(pai));
    const vistos = new Set<HTMLElement>();
    const caixas: Caixa[] = [];
    for (const c of candidatos) {
      if (caixas.length >= MAX_VIZINHOS) break;
      if (vistos.has(c)) continue;
      vistos.add(c);
      if (c === el || c.contains(el) || el.contains(c)) continue;
      if (!ehAlvoLegitimo(c)) continue;
      caixas.push(caixaNoSlide(c, rSlide));
    }
    return caixas;
  }

  // ===== Arrasto (mouse). O gesto acontece DENTRO do iframe, entao o mousedown
  // no doc "prepara" e o movimento e o fim sao ouvidos na janela do iframe
  // (contentWindow), onde clientX/Y ja estao em px do slide (o transform:scale
  // e aplicado por fora, no elemento iframe, e nao afeta o sistema interno do
  // doc). Tambem escutamos na janela do app pra capturar o ponteiro se ele sair
  // do iframe no meio do gesto, convertendo a coordenada de volta pra px de slide.
  function aoMouseDownDoc(e: MouseEvent) {
    if (e.button !== 0) return;
    // Alca de redimensionamento: comeca o gesto de resize e para por aqui.
    const alvoBruto = e.target as HTMLElement | null;
    if (ehAlca(alvoBruto)) {
      iniciarRedim(alvoBruto, e);
      return;
    }
    // Editando: o mouse serve pra posicionar o cursor, nunca pra arrastar.
    if (editandoRef.current) return;
    const sel = selRef.current;
    const alvo = e.target as HTMLElement | null;
    if (!sel || sel.matches(".slide,body,html") || !alvo) return;
    // So arrasta o proprio selecionado (ou um filho dele). Clique em outro
    // elemento segue como selecao normal. Excecao: selecionado com
    // pointer-events:none (aspas, enfeites) nunca aparece como e.target; nesse
    // caso vale o retangulo geometrico do proprio selecionado.
    // O selecionado pode estar atras de um overlay ou ter pointer-events:none
    // (enfeite): nesses casos o e.target nao e ele, mas o gesto ainda deve
    // arrastar a selecao se o ponto cai dentro do retangulo dela. O clique sem
    // movimento continua reselecionando pela geometria (aoClicarDoc), entao isso
    // nao rouba a selecao de quem so quis clicar num vizinho.
    let sobreSel = alvo === sel || sel.contains(alvo);
    if (!sobreSel) {
      const r = sel.getBoundingClientRect();
      sobreSel =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;
    }
    if (!sobreSel) return;
    const win = sel.ownerDocument.defaultView;
    if (!win) return;
    e.preventDefault();
    const cs = win.getComputedStyle(sel);
    const base = offsetAtual(sel, cs);
    arrastoRef.current = {
      el: sel,
      slide: sel.closest<HTMLElement>(".slide"),
      baseLeft: base.left,
      baseTop: base.top,
      // clientX/Y aqui ja estao em coordenadas do doc do iframe (px do slide).
      docX0: e.clientX,
      docY0: e.clientY,
      ativo: false,
      guiaV: null,
      guiaH: null,
      vizinhos: [],
      slidePosAntes: null,
      win,
    };
    win.addEventListener("mousemove", aoMouseMoveIframe, true);
    win.addEventListener("mouseup", aoMouseUp, true);
    window.addEventListener("mousemove", aoMouseMoveApp, true);
    window.addEventListener("mouseup", aoMouseUp, true);
  }

  function ativarArrasto(a: Arrasto) {
    const doc = getDoc();
    if (!doc) return;
    snapshot();
    const cs = a.el.ownerDocument.defaultView!.getComputedStyle(a.el);
    garantirPosicionavel(a.el, cs);
    liberarParaMover(a.el, cs);
    // Some com as alcas durante o arrasto; voltam no fim, na posicao nova.
    removerAlcas();
    doc.documentElement.classList.add("vkos-ed-arrastando");
    // Guias precisam de um contexto posicionado: se o slide e estatico, damos
    // relative temporario e restauramos no fim.
    if (a.slide) {
      const sp = a.el.ownerDocument.defaultView!.getComputedStyle(a.slide).position;
      if (sp === "static") {
        a.slidePosAntes = a.slide.style.position;
        a.slide.style.position = "relative";
      }
      // Mede os vizinhos ANTES de criar as guias, pra elas nao entrarem na conta.
      a.vizinhos = coletarVizinhos(a.el, a.slide);
      a.guiaV = criarGuia(doc, a.slide, "v");
      a.guiaH = criarGuia(doc, a.slide, "h");
    }
    a.ativo = true;
  }

  // Movimento vindo da janela do iframe: clientX/Y ja sao px do slide.
  function aoMouseMoveIframe(e: MouseEvent) {
    aplicarMovimento(e.clientX, e.clientY);
  }

  // Movimento vindo da janela do app (ponteiro saiu do iframe): converte a
  // coordenada do app pra px do slide, descontando o offset e a escala do iframe.
  function aoMouseMoveApp(e: MouseEvent) {
    const rect = refIframe.current?.getBoundingClientRect();
    const esc = escala();
    aplicarMovimento((e.clientX - (rect?.left ?? 0)) / esc, (e.clientY - (rect?.top ?? 0)) / esc);
  }

  // Coracao do arrasto, em coordenadas do doc do iframe (px do slide). O
  // deslocamento e direto: dx = ponteiro atual - ponteiro inicial, sem escala.
  function aplicarMovimento(docX: number, docY: number) {
    const a = arrastoRef.current;
    if (!a) return;
    const dx = docX - a.docX0;
    const dy = docY - a.docY0;
    if (!a.ativo) {
      // Limiar em px de tela, convertido pra px de slide.
      if (Math.hypot(dx, dy) <= LIMIAR_ARRASTO / escala()) return;
      ativarArrasto(a);
    }
    const left = a.baseLeft + dx;
    const top = a.baseTop + dy;
    a.el.style.left = left + "px";
    a.el.style.top = top + "px";
    a.el.setAttribute("data-ed-mov", "1");
    // Alinhamento: gruda no palco (bordas e centro) e nos vizinhos, e desenha a
    // guia do encaixe. getBoundingClientRect de um elemento do iframe volta em
    // px do doc (nao escalado), entao tudo ja esta no sistema do slide; o limiar
    // de tela vira px de slide dividindo pela escala. A decisao de onde grudar
    // e de onde a guia aparece esta em alinhamento.ts, testada sem DOM.
    if (a.slide) {
      const limiar = LIMIAR_SNAP / escala();
      const rSl = a.slide.getBoundingClientRect();
      const movel = caixaNoSlide(a.el, rSl);
      const palco: Caixa = {
        esquerda: 0,
        topo: 0,
        largura: rSl.width,
        altura: rSl.height,
      };
      const r = calcularAlinhamento(movel, a.vizinhos, palco, limiar);
      if (r.dx !== 0) a.el.style.left = left + r.dx + "px";
      if (r.dy !== 0) a.el.style.top = top + r.dy + "px";
      desenharGuia(a.guiaV, r.guias.find((g) => g.eixo === "v"));
      desenharGuia(a.guiaH, r.guias.find((g) => g.eixo === "h"));
    }
  }

  function aoMouseUp() {
    const a = arrastoRef.current;
    if (a) {
      a.win.removeEventListener("mousemove", aoMouseMoveIframe, true);
      a.win.removeEventListener("mouseup", aoMouseUp, true);
    }
    window.removeEventListener("mousemove", aoMouseMoveApp, true);
    window.removeEventListener("mouseup", aoMouseUp, true);
    arrastoRef.current = null;
    if (!a) return;
    const doc = getDoc();
    doc?.documentElement.classList.remove("vkos-ed-arrastando");
    a.guiaV?.remove();
    a.guiaH?.remove();
    if (a.slide && a.slidePosAntes !== null) a.slide.style.position = a.slidePosAntes;
    if (a.ativo) {
      // Um arrasto de verdade: evita que o clique seguinte re-selecione e
      // registra a mudanca.
      suprimirCliqueRef.current = true;
      marcarMudou();
      ressincronizarSelecao();
    }
  }

  // Elemento que pode entrar na pilha de clique/camadas: nada de artefato do
  // editor (guias) e nada sem area visivel.
  function ehAlvoLegitimo(el: HTMLElement): boolean {
    if (el.classList.contains("vkos-ed-guia")) return false;
    if (el.classList.contains("vkos-ed-alca")) return false;
    if (/^(STYLE|SCRIPT|LINK|BR)$/.test(el.tagName)) return false;
    return true;
  }

  // Verdadeiro se o elemento e uma alca de redimensionamento.
  function ehAlca(el: HTMLElement | null): el is HTMLElement {
    return !!el && el.classList.contains("vkos-ed-alca");
  }

  // Distancia (px do doc) pra dois cliques contarem como "no mesmo ponto".
  const LIMIAR_MESMO_PONTO = 8;

  // Clique no documento seleciona o elemento (e nunca navega por link). O alvo
  // vem da descida GEOMETRICA (alvoNoPonto), nao do e.target puro: assim
  // enfeites com pointer-events:none (aspas dos templates) e imagens atras do
  // conteudo viram selecionaveis. Clique repetido no mesmo ponto alterna entre
  // os elementos empilhados sob o ponteiro (menor area primeiro, depois os de
  // tras), pra alcancar o fundo atras de um enfeite sem depender do painel.
  function aoClicarDoc(e: MouseEvent) {
    if (suprimirCliqueRef.current) {
      suprimirCliqueRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const alvo = e.target as HTMLElement | null;
    if (!alvo) return;
    // Clique numa alca nao muda a selecao (o mousedown ja cuidou do resize).
    if (ehAlca(alvo)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Editando: clique DENTRO do proprio elemento so posiciona o cursor.
    const emEdicao = editandoRef.current;
    if (emEdicao && (alvo === emEdicao || emEdicao.contains(alvo))) return;
    // Clique fora encerra a edicao antes de trocar de alvo.
    if (emEdicao) finalizarEdicao();
    e.preventDefault();
    e.stopPropagation();
    // Sem filtro de decorativa grande: num slide 1080x1350, um hero de fundo
    // aria-hidden e alvo legitimo de edicao.
    const geo = alvoNoPonto(alvo, e.clientX, e.clientY, { pularDecorativaGrande: false });
    const slide = geo.closest<HTMLElement>(".slide");
    if (!slide) {
      cliqueAnteriorRef.current = { x: e.clientX, y: e.clientY };
      selecionar(geo);
      return;
    }
    const anterior = cliqueAnteriorRef.current;
    const mesmoPonto =
      !!anterior &&
      Math.abs(anterior.x - e.clientX) <= LIMIAR_MESMO_PONTO &&
      Math.abs(anterior.y - e.clientY) <= LIMIAR_MESMO_PONTO;
    cliqueAnteriorRef.current = { x: e.clientX, y: e.clientY };
    const pilha = pilhaNoPonto(slide, e.clientX, e.clientY).filter(ehAlvoLegitimo);
    const sel = selRef.current;
    if (mesmoPonto && sel && pilha.length > 1) {
      const i = pilha.indexOf(sel);
      if (i >= 0) {
        selecionar(pilha[(i + 1) % pilha.length]);
        return;
      }
    }
    // Primeiro clique no ponto: o MENOR elemento sob o ponteiro, olhando o
    // slide inteiro (a pilha), nao so os descendentes do e.target. E o que
    // alcanca um enfeite irmao do bloco de conteudo (aspas ao lado do .body).
    if (pilha.length > 0) selecionar(pilha[0]);
    else if (ehAlvoLegitimo(geo) && geo !== slide) selecionar(geo);
    else limparSelecao();
  }

  // Duplo clique entra em edicao in-place no elemento de texto mais proximo.
  // Tambem parte do alvo geometrico: um span decorativo com pointer-events:none
  // (aspas) tem texto proprio e vira editavel sem mudar o template.
  function aoDuploClicarDoc(e: MouseEvent) {
    const alvo = e.target as HTMLElement | null;
    if (!alvo || ehAlca(alvo)) return;
    const geo = alvoNoPonto(alvo, e.clientX, e.clientY, { pularDecorativaGrande: false });
    const slide = geo.closest<HTMLElement>(".slide");
    const base = slide
      ? pilhaNoPonto(slide, e.clientX, e.clientY).filter(ehAlvoLegitimo)[0] || geo
      : geo;
    const el = alvoEdicao(base);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    iniciarEdicao(el, e.clientX, e.clientY);
  }

  // Atalhos que agem sobre o OBJETO selecionado: setas movem (1px, Shift 10px),
  // Delete pede a exclusao, Ctrl+D duplica. Valem com o foco no app e, pelo
  // aoTeclaDoc, tambem com o foco dentro do iframe. Enquanto edita texto,
  // nenhum deles vale: ali as teclas sao do cursor.
  function aoTeclaJanela(e: KeyboardEvent) {
    if (!selRef.current) return;
    if (editandoRef.current) return;
    const alvo = e.target as HTMLElement | null;
    if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === "d") {
      e.preventDefault();
      e.stopPropagation();
      duplicarSelecionado();
      return;
    }
    if (!ctrl && (e.key === "Delete" || e.key === "Backspace")) {
      const el = selRef.current;
      const slide = el.closest(".slide");
      if (!slide || el === slide) return;
      e.preventDefault();
      e.stopPropagation();
      // A exclusao continua passando pela confirmacao de quem monta a tela: o
      // Desfazer some depois de salvar, entao apagar por tecla sem aviso seria
      // uma perda silenciosa. Ver docs/decisoes/2026-07-27-manipulacao-direta-no-studio.md.
      optsRef.current.aoPedirExcluir?.();
      return;
    }
    const passo = e.shiftKey ? 10 : 1;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -passo;
    else if (e.key === "ArrowRight") dx = passo;
    else if (e.key === "ArrowUp") dy = -passo;
    else if (e.key === "ArrowDown") dy = passo;
    else return;
    e.preventDefault();
    e.stopPropagation();
    moverSelecao(dx, dy);
  }

  // Verdadeiro pro gesto de refazer, nas duas grafias que os editores aceitam:
  // Ctrl+Shift+Z (Canva, Figma) e Ctrl+Y (herança do Windows).
  function ehRefazer(e: KeyboardEvent): boolean {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return false;
    const k = e.key.toLowerCase();
    return (k === "z" && e.shiftKey) || (k === "y" && !e.shiftKey);
  }

  // Teclas com o foco DENTRO do iframe (depois de clicar num elemento, o
  // keydown vai pro doc do iframe, e o listener do app NAO ve o evento: ele nao
  // atravessa a fronteira do documento). Todo atalho da tela precisa existir
  // aqui tambem, senao ele so funciona quando o foco esta no painel.
  function aoTeclaDoc(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    // Em edicao in-place: Esc sai, Ctrl+Z sai e desfaz, Ctrl+S sai e salva.
    // Todas as outras teclas digitam normalmente no contentEditable.
    if (editandoRef.current) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finalizarEdicao();
        return;
      }
      if (ehRefazer(e)) {
        e.preventDefault();
        finalizarEdicao();
        refazer();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        finalizarEdicao();
        desfazer();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        finalizarEdicao();
        optsRef.current.aoAtalhoSalvar?.();
        return;
      }
      return;
    }
    if (ctrl && e.key.toLowerCase() === "s") {
      e.preventDefault();
      optsRef.current.aoAtalhoSalvar?.();
      return;
    }
    if (ehRefazer(e)) {
      e.preventDefault();
      refazer();
      return;
    }
    if (ctrl && e.key.toLowerCase() === "z") {
      e.preventDefault();
      desfazer();
      return;
    }
    // Esc solta a selecao. Antes so o listener do app tratava isso, e ele nunca
    // recebia a tecla com o foco no iframe: apos clicar num elemento, Esc nao
    // fazia nada. Arrasto em andamento e cancelado primeiro.
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (arrastoRef.current || redimRef.current) cancelarGesto();
      else if (selRef.current) limparSelecao();
      return;
    }
    // Enter com um objeto selecionado entra na edicao de texto, como no Figma,
    // no Canva e no tldraw. Poupa mirar o duplo clique num texto pequeno.
    if (e.key === "Enter" && !ctrl && !e.shiftKey && selRef.current) {
      const alvo = alvoEdicao(selRef.current);
      if (alvo) {
        e.preventDefault();
        e.stopPropagation();
        const r = alvo.getBoundingClientRect();
        iniciarEdicao(alvo, r.left + r.width / 2, r.top + r.height / 2);
        return;
      }
    }
    aoTeclaJanela(e);
  }

  // Aborta o gesto em andamento e devolve o elemento ao estado de antes dele.
  // O snapshot do inicio do gesto ja esta no historico, entao desfazer() basta.
  function cancelarGesto() {
    const tinha = !!(arrastoRef.current || redimRef.current);
    if (arrastoRef.current) aoMouseUp();
    if (redimRef.current) aoSoltarRedim();
    if (tinha) desfazer();
  }

  // ===== Troca de imagem de fundo (a pagina e parametro, nao estado global).
  async function enviarImagem(pasta: string, file: File): Promise<string> {
    const conteudoBase64 = await lerBase64(file);
    const resp = await fetch(`/api/vkos/pecas/${encodeURIComponent(pasta)}/imagem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: file.name, conteudoBase64 }),
    });
    if (!resp.ok) throw new Error("Falha ao enviar a imagem.");
    const dados = (await resp.json()) as { caminhoRelativo: string };
    return dados.caminhoRelativo;
  }

  function paginaTemFundo(pagina: number): boolean {
    const doc = getDoc();
    return !!(doc && detectarFundo(doc, pagina));
  }

  async function trocarImagemFundo(pagina: number, file: File): Promise<void> {
    const doc = getDoc();
    if (!doc) throw new Error("Documento não carregado.");
    const alvo = detectarFundo(doc, pagina);
    if (!alvo) throw new Error("Esta página não tem imagem de fundo.");
    const rel = await enviarImagem(optsRef.current.pasta, file);
    snapshot();
    // Cache-bust so em runtime, limpo no save.
    const url = `${rel}?vk=${Date.now()}`;
    if (alvo.tipo === "img") (alvo.el as HTMLImageElement).src = url;
    else alvo.el.style.backgroundImage = `url('${url}')`;
    marcarMudou();
  }

  function aplicarImagemNoAlvo(el: HTMLElement, tipo: "img" | "bg", rel: string) {
    if (!el.isConnected) throw new Error("A imagem original não está mais no carrossel.");
    snapshot();
    const url = `${rel}?vk=${Date.now()}`;
    if (tipo === "img") (el as HTMLImageElement).setAttribute("src", url);
    else {
      const atual = el.ownerDocument.defaultView?.getComputedStyle(el).backgroundImage || "";
      el.style.backgroundImage = substituirUrlFundo(atual, url);
    }
    marcarMudou();
    if (selRef.current === el) ressincronizarSelecao();
  }

  async function trocarImagemSelecionada(file: File): Promise<void> {
    const el = selRef.current;
    if (!el) throw new Error("Selecione uma imagem primeiro.");
    const imagem = imagemDoElemento(el);
    if (!imagem) throw new Error("O elemento selecionado não é uma imagem editável.");
    const rel = await enviarImagem(optsRef.current.pasta, file);
    aplicarImagemNoAlvo(el, imagem.tipo, rel);
  }

  function excluirImagemSelecionada(): void {
    const el = selRef.current;
    if (!el) return;
    const imagem = imagemDoElemento(el);
    if (!imagem) return;
    snapshot();
    if (imagem.tipo === "img") {
      el.remove();
      selRef.current = null;
      setSelecao(null);
    } else {
      const atual = el.ownerDocument.defaultView?.getComputedStyle(el).backgroundImage || "";
      el.style.setProperty("background-image", removerUrlFundo(atual));
      marcarMudou();
      ressincronizarSelecao();
      return;
    }
    marcarMudou();
  }

  function capturarImagemSelecionada(): AlvoImagemCapturado | null {
    const el = selRef.current;
    if (!el) return null;
    const imagem = imagemDoElemento(el);
    if (!imagem) return null;
    const slide = el.closest<HTMLElement>(".slide");
    const alt = el.tagName === "IMG" ? (el as HTMLImageElement).alt : "";
    const contexto = [alt, slide?.innerText || slide?.textContent || ""]
      .filter(Boolean)
      .join(". ");
    return {
      contexto,
      aplicar: (caminhoRelativo) => aplicarImagemNoAlvo(el, imagem.tipo, caminhoRelativo),
    };
  }

  function adicionarImagemFundoPagina(pagina: number, caminhoRelativo: string): void {
    const doc = getDoc();
    const slide = doc?.querySelectorAll<HTMLElement>(".slide")[pagina];
    if (!doc || !slide) throw new Error("A página indicada não existe no carrossel.");
    snapshot();
    let img = slide.querySelector<HTMLImageElement>("img[data-vkos-image-bg]");
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
      img.style.opacity = "0.38";
      img.style.zIndex = "1";
      img.style.pointerEvents = "none";
      slide.insertBefore(img, slide.firstChild);
    }
    img.src = `${caminhoRelativo}?vk=${Date.now()}`;
    marcarMudou();
    selecionar(img);
  }

  // ===== Camadas (E2): ids estaveis, lista e reordenacao.

  // Semeia data-vk incremental em todo elemento dos slides, no mesmo esquema
  // "aN" do site (motorSite). O contador parte do maior id ja presente, entao
  // recargas e pecas ja salvas com data-vk nao ganham ids duplicados. O
  // serializador PRESERVA data-vk (so remove artefatos data-ed-*).
  function semearVk(doc: Document) {
    let max = 0;
    doc.querySelectorAll<HTMLElement>("[data-vk]").forEach((el) => {
      const m = /^a(\d+)$/.exec(el.getAttribute("data-vk") || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    contadorVkRef.current = Math.max(contadorVkRef.current, max);
    doc.querySelectorAll<HTMLElement>(".slide, .slide *").forEach((el) => {
      if (el.classList.contains("vkos-ed-guia")) return;
      if (!el.getAttribute("data-vk")) {
        el.setAttribute("data-vk", "a" + ++contadorVkRef.current);
      }
    });
  }

  // Papel deduzido de um elemento pro nome amigavel do painel de camadas.
  function papelDe(el: HTMLElement): string {
    if (imagemDoElemento(el)) return "Imagem";
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    if (cs?.pointerEvents === "none" || el.getAttribute("aria-hidden") === "true") {
      return "Enfeite";
    }
    if (temTextoProprio(el) && soFilhosInline(el)) return "Texto";
    return "Bloco";
  }

  function itemDe(el: HTMLElement, nivel: 0 | 1, ordem: HTMLElement[]): ItemCamada {
    const i = ordem.indexOf(el);
    const papel = papelDe(el);
    const classes = Array.from(el.classList).filter((c) => !c.startsWith("vkos-ed"));
    return {
      id: el.getAttribute("data-vk") || "",
      nome: papel,
      conteudo: papel === "Texto" ? primeirasPalavras(el) : "",
      detalhe: el.tagName.toLowerCase() + (classes.length ? "." + classes.join(".") : ""),
      nivel,
      podeSubir: i > 0,
      podeDescer: i >= 0 && i < ordem.length - 1,
    };
  }

  // Um conteiner (bloco sem texto corrido proprio) aninha os filhos diretos um
  // nivel no painel. Dois niveis bastam pra anatomia dos templates.
  function ehConteiner(el: HTMLElement): boolean {
    if (el.children.length === 0) return false;
    return !(temTextoProprio(el) && soFilhosInline(el));
  }

  function listarCamadas(pagina: number): ItemCamada[] {
    const doc = getDoc();
    const slide = doc?.querySelectorAll<HTMLElement>(".slide")[pagina];
    if (!doc || !slide) return [];
    const itens: ItemCamada[] = [];
    const topo = filhosEmpilhados(slide);
    topo.forEach((el) => {
      itens.push(itemDe(el, 0, topo));
      if (ehConteiner(el)) {
        const filhos = filhosEmpilhados(el);
        filhos.forEach((f) => itens.push(itemDe(f, 1, filhos)));
      }
    });
    return itens.filter((item) => item.id);
  }

  function selecionarPorId(id: string): void {
    const el = getDoc()?.querySelector<HTMLElement>(`[data-vk="${id}"]`);
    if (el) selecionar(el);
  }

  // Sobe/desce uma camada no empilhamento, trocando com o vizinho de mesmo
  // pai: troca as posicoes exatas no DOM (insertBefore via marcador) E, quando
  // o CSS fixa z-index diferente nos dois (a ordem no DOM nao decide), troca
  // tambem os z-index inline dos envolvidos, mantendo a escala do template.
  function moverCamada(id: string, direcao: DirecaoCamada): void {
    const doc = getDoc();
    const el = doc?.querySelector<HTMLElement>(`[data-vk="${id}"]`);
    const pai = el?.parentElement;
    if (!doc || !el || !pai) return;
    const ordem = filhosEmpilhados(pai);
    const i = ordem.indexOf(el);
    if (i < 0) return;
    const j = direcao === "acima" ? i - 1 : i + 1;
    if (j < 0 || j >= ordem.length) return;
    const outro = ordem[j];
    snapshot();
    const za = zEfetivo(el);
    const zb = zEfetivo(outro);
    const marcador = doc.createComment("vk-troca");
    pai.replaceChild(marcador, el);
    pai.replaceChild(el, outro);
    pai.replaceChild(outro, marcador);
    if (za !== zb) {
      definirZ(el, zb);
      definirZ(outro, za);
    }
    marcarMudou();
    ressincronizarSelecao();
  }

  // Aplica um z-index alvo sem deixar residuo inline: se o CSS do template ja
  // entrega o valor sem inline (caso do vai-e-volta que devolve o empilhamento
  // original), o inline sai em vez de ficar gravado no HTML salvo.
  function definirZ(alvo: HTMLElement, z: number): void {
    alvo.style.removeProperty("z-index");
    if (zEfetivo(alvo) !== z) alvo.style.zIndex = String(z);
    if (!alvo.getAttribute("style")) alvo.removeAttribute("style");
  }

  // ===== Imagem livre (E3): imagem propria posicionavel no slide.
  function inserirImagemLivre(pagina: number, caminhoRelativo: string): void {
    const doc = getDoc();
    const slide = doc?.querySelectorAll<HTMLElement>(".slide")[pagina];
    if (!doc || !slide) throw new Error("A página indicada não existe no carrossel.");
    snapshot();
    const win = doc.defaultView!;
    // A imagem e absoluta em relacao ao slide: garante o contexto posicionado.
    if (win.getComputedStyle(slide).position === "static") {
      slide.style.position = "relative";
    }
    const w = Math.round(slide.offsetWidth * 0.4);
    let zMax = 0;
    Array.from(slide.children).forEach((c) => {
      if (c.nodeType === 1) zMax = Math.max(zMax, zEfetivo(c as HTMLElement));
    });
    const img = doc.createElement("img");
    img.alt = "";
    img.style.position = "absolute";
    img.style.width = w + "px";
    img.style.left = Math.round((slide.offsetWidth - w) / 2) + "px";
    img.style.top = Math.round((slide.offsetHeight - w) / 2) + "px";
    img.style.zIndex = String(zMax + 1);
    img.setAttribute("data-vk", "a" + ++contadorVkRef.current);
    img.src = `${caminhoRelativo}?vk=${Date.now()}`;
    slide.appendChild(img);
    marcarMudou();
    selecionar(img);
  }

  async function inserirImagemLivreArquivo(pagina: number, file: File): Promise<void> {
    const rel = await enviarImagem(optsRef.current.pasta, file);
    inserirImagemLivre(pagina, rel);
  }

  // ===== Serializacao limpa e save.
  function serializar(doc: Document): string {
    const editVals: Record<string, string> = {};
    editadasRef.current.forEach((n) => {
      const v = doc.documentElement.style.getPropertyValue(n).trim();
      if (v) editVals[n] = v;
    });
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    // Remove tudo que e artefato do editor: runtime, layout de quem monta,
    // guias e o style de vars legado. As cores editadas vao mescladas no :root
    // principal (abaixo), nunca numa tag extra.
    clone
      .querySelectorAll(
        "#vkos-ed-runtime,#vkos-ed-layout,#vkos-editor-runtime,#vkos-editor-vars,.vkos-ed-guia,.vkos-ed-alca",
      )
      .forEach((n) => n.remove());
    // Tira os artefatos volateis (selecao, edicao, guias) pelo nucleo e os
    // extras de arrasto. Os left/top/position inline ficam: sao a posicao real
    // editada.
    limparArtefatosSelecao(clone);
    // Defesa final contra pecas antigas que ja salvaram o deslocamento do
    // proprio slide. Pagina nunca carrega posicao editorial via inline left/top.
    clone.querySelectorAll<HTMLElement>(".slide").forEach((slide) => {
      slide.style.removeProperty("left");
      slide.style.removeProperty("top");
    });
    clone
      .querySelectorAll("[data-ed-atual],[data-ed-mov],[data-ed-relpos],[data-ed-livre]")
      .forEach((n) => {
        n.removeAttribute("data-ed-atual");
        n.removeAttribute("data-ed-mov");
        n.removeAttribute("data-ed-relpos");
        n.removeAttribute("data-ed-livre");
      });
    clone.classList.remove("vkos-ed-arrastando");
    // Remove as vars inline do <html> (eram so preview).
    clone.removeAttribute("style");
    // Mescla as cores editadas no PRIMEIRO bloco :root do <style> principal.
    if (Object.keys(editVals).length) mesclarVarsNoRoot(clone, doc, editVals);
    let html = "<!DOCTYPE html>\n" + clone.outerHTML;
    // Tira o cache-bust de imagens trocadas em runtime.
    html = html.replace(/([?&])vk=\d+/g, "");
    return html;
  }

  // Escapa um nome de var pra uso literal em regex.
  function escaparRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Mescla as vars editadas no primeiro bloco :root{...} do primeiro <style>
  // que tiver um. Substitui a declaracao existente da var ou acrescenta antes
  // do fechamento do bloco. Sem :root em lugar nenhum, cria um no primeiro style.
  function mesclarVarsNoRoot(
    clone: HTMLElement,
    doc: Document,
    editVals: Record<string, string>,
  ) {
    const reRoot = /:root\s*\{([^}]*)\}/;
    const styles = Array.from(clone.querySelectorAll("style"));
    const alvo = styles.find((s) => reRoot.test(s.textContent || ""));
    if (alvo) {
      const css = alvo.textContent || "";
      const m = reRoot.exec(css)!;
      let corpo = m[1];
      for (const [nome, valor] of Object.entries(editVals)) {
        const decl = `${nome}:${valor};`;
        // (^|;|{|espaco) antes do nome pra nao casar --accent dentro de --accent-2.
        const reVar = new RegExp("(^|[;{\\s])" + escaparRegex(nome) + "\\s*:\\s*[^;]*;?");
        if (reVar.test(corpo)) corpo = corpo.replace(reVar, "$1" + decl);
        else corpo = corpo + decl;
      }
      alvo.textContent = css.slice(0, m.index) + ":root{" + corpo + "}" + css.slice(m.index + m[0].length);
      return;
    }
    const decl = Object.entries(editVals)
      .map(([n, v]) => `${n}:${v};`)
      .join("");
    if (styles[0]) {
      styles[0].textContent = `:root{${decl}}` + (styles[0].textContent || "");
    } else {
      const head = clone.querySelector("head");
      if (head) {
        const s = doc.createElement("style");
        s.textContent = `:root{${decl}}`;
        head.appendChild(s);
      }
    }
  }

  async function salvar(): Promise<void> {
    const doc = getDoc();
    if (!doc) throw new Error("Documento não carregado.");
    const texto = serializar(doc);
    const resp = await fetch(
      `/api/vkos/pecas/${encodeURIComponent(optsRef.current.pasta)}/carrossel`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      },
    );
    if (!resp.ok) throw new Error("Não foi possível salvar.");
    // Salvar confirma o estado atual como nova base. A confirmação de exclusão
    // avisa que, depois daqui, o elemento não volta pelo Desfazer.
    histRef.current.limpar();
    ultimoPassoRef.current = null;
    sincronizarBotoesHistorico();
    setNaoSalvo(false);
    setSalvoEm(Date.now());
  }

  // ===== Instrumentacao: liga tudo ao (re)carregar o iframe, limpa no unmount.
  useEffect(() => {
    const iframe = refIframe.current;
    if (!iframe) return;

    function instrumentar() {
      const doc = getDoc();
      if (!doc || !doc.body) return;
      try {
        injetarEstilo(doc);
        semearVk(doc);
        editandoRef.current = null;
        cliqueAnteriorRef.current = null;
        doc.addEventListener("click", aoClicarDoc, true);
        doc.addEventListener("dblclick", aoDuploClicarDoc, true);
        doc.addEventListener("mousedown", aoMouseDownDoc, true);
        doc.addEventListener("keydown", aoTeclaDoc, true);
        const lista = lerVarsRoot(doc);
        varsRef.current = lista;
        editadasRef.current = new Set();
        // Migracao: pecas salvas antes desta correcao guardam as cores editadas
        // num style#vkos-editor-vars. Le como valores editados e aplica no
        // preview; o proximo save mescla no :root principal e remove a tag.
        const svAntigo = doc.getElementById("vkos-editor-vars");
        if (svAntigo) {
          const mRoot = /:root\s*\{([^}]*)\}/.exec(svAntigo.textContent || "");
          if (mRoot) {
            const reVar = /(--[\w-]+)\s*:\s*([^;]+);/g;
            let d: RegExpExecArray | null;
            while ((d = reVar.exec(mRoot[1]))) {
              const nome = d[1].trim();
              const valor = d[2].trim();
              doc.documentElement.style.setProperty(nome, valor);
              editadasRef.current.add(nome);
            }
          }
        }
        histRef.current.limpar();
        ultimoPassoRef.current = null;
        selRef.current = null;
        setVars(lista);
        setFontesOpc(montarFontes(doc));
        setSelecao(null);
        setPodeDesfazer(false);
        setPodeRefazer(false);
        setPaginas(doc.querySelectorAll(".slide").length || 1);
        setVersaoDoc((v) => v + 1);
        setPronto(true);
        optsRef.current.aoInstrumentar?.(doc);
      } catch {
        // Doc cross-origin ou corrompido: deixa "pronto" falso.
      }
    }

    function aoCarregar() {
      setPronto(false);
      instrumentar();
    }

    iframe.addEventListener("load", aoCarregar);
    // Caso o iframe ja tenha carregado antes do efeito rodar.
    const doc = iframe.contentDocument;
    if (doc && doc.readyState === "complete" && doc.querySelector(".slide")) {
      instrumentar();
    }
    window.addEventListener("keydown", aoTeclaJanela, true);

    // O tema do app troca por data-theme no <html>. O CSS do editor mora dentro
    // do iframe, fora da cascata do Hub, entao ele nao se atualiza sozinho:
    // reinjeta com o menta do tema novo. Ver editor/tema.ts.
    const observadorTema = new MutationObserver(() => {
      const d = getDoc();
      if (d) injetarEstilo(d);
    });
    observadorTema.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      iframe.removeEventListener("load", aoCarregar);
      window.removeEventListener("keydown", aoTeclaJanela, true);
      observadorTema.disconnect();
      window.removeEventListener("mousemove", aoMouseMoveApp, true);
      window.removeEventListener("mouseup", aoMouseUp, true);
      const d = iframe.contentDocument;
      const w = iframe.contentWindow;
      if (w) {
        w.removeEventListener("mousemove", aoMouseMoveIframe, true);
        w.removeEventListener("mouseup", aoMouseUp, true);
      }
      if (d) {
        d.removeEventListener("click", aoClicarDoc, true);
        d.removeEventListener("dblclick", aoDuploClicarDoc, true);
        d.removeEventListener("mousedown", aoMouseDownDoc, true);
        d.removeEventListener("keydown", aoTeclaDoc, true);
      }
    };
    // Efeito de montagem: refIframe e estavel, os handlers leem tudo por ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    pronto,
    paginas,
    vars,
    aplicarVar,
    selecao,
    aplicarTexto,
    comEstilo,
    moverSelecao,
    resetarPosicao,
    fontesOpc,
    trocarImagemFundo,
    paginaTemFundo,
    trocarImagemSelecionada,
    excluirImagemSelecionada,
    selecionarPai,
    excluirSelecionado,
    duplicarSelecionado,
    adicionarImagemFundoPagina,
    capturarImagemSelecionada,
    desfazer,
    podeDesfazer,
    refazer,
    podeRefazer,
    salvar,
    naoSalvo,
    salvoEm,
    limparSelecao,
    listarCamadas,
    selecionarPorId,
    moverCamada,
    inserirImagemLivre,
    inserirImagemLivreArquivo,
    versaoDoc,
    reposicionarAlcas: sincronizarAlcas,
  };
}
