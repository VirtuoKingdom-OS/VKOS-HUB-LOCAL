import { useEffect, useRef, useState, type RefObject } from "react";
import {
  alvoEdicao,
  entrarContentEditable,
  FONTES_SEGURAS,
  lerBase64,
  lerNum,
  lerVarsRoot,
  limparArtefatosSelecao,
  montarFontes,
  PilhaSnapshots,
  primeiraFonte,
  rgbParaHex,
  sairContentEditable,
  soFilhosInline,
  temTextoProprio,
  type VarCss,
} from "./nucleo";

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
  desfazer(): void;
  podeDesfazer: boolean;
  salvar(): Promise<void>;
  naoSalvo: boolean;
  // Solta a selecao atual (ex: ao trocar de pagina no overlay).
  limparSelecao(): void;
}

// Alvo de fundo detectado num slide: imagem grande ou elemento com bg-image.
interface Fundo {
  el: HTMLElement;
  tipo: "img" | "bg";
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
  // Guardamos se demos position:relative temporario no slide, pra restaurar.
  slidePosAntes: string | null;
  // Janela do iframe onde o gesto acontece: e onde ouvimos move/up.
  win: Window;
}

// Distancia da tela pra iniciar o arrasto (nao confundir com clique).
const LIMIAR_ARRASTO = 3;
// Distancia (em px de tela) pro snap ao centro do slide.
const LIMIAR_SNAP = 6;

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

  // opts muda de identidade a cada render, entao guardamos num ref pros
  // listeners sempre enxergarem a versao atual sem reanexar.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const selRef = useRef<HTMLElement | null>(null);
  const varsRef = useRef<VarCss[]>([]);
  const editadasRef = useRef<Set<string>>(new Set());
  const undoRef = useRef(new PilhaSnapshots<{ body: string; vars: Record<string, string> }>());
  const arrastoRef = useRef<Arrasto | null>(null);
  const suprimirCliqueRef = useRef(false);
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
    s.textContent =
      "[data-ed-sel]{outline:2px solid #00c896 !important;outline-offset:-2px !important;cursor:move !important;}" +
      "[data-ed-editando]{outline:2px dashed #00c896 !important;outline-offset:2px !important;cursor:text !important;}" +
      "[data-ed-editando] *{cursor:text !important;}" +
      ".vkos-ed-arrastando,.vkos-ed-arrastando *{cursor:grabbing !important;}" +
      ".vkos-ed-guia{position:absolute;background:#00c896;pointer-events:none;z-index:2147483646;box-shadow:0 0 4px rgba(0,200,150,0.6);}" +
      ".vkos-ed-guia-v{width:1px;top:0;bottom:0;}" +
      ".vkos-ed-guia-h{height:1px;left:0;right:0;}";
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

  // ===== Selecao.
  function propsDe(el: HTMLElement): PropsSel {
    const win = el.ownerDocument.defaultView!;
    const cs = win.getComputedStyle(el);
    const familia = primeiraFonte(el.style.fontFamily || cs.fontFamily);
    setFontesOpc((prev) => (prev.includes(familia) ? prev : [familia, ...prev]));
    const semBloco = soFilhosInline(el);
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
    };
  }

  function selecionar(el: HTMLElement) {
    const doc = el.ownerDocument;
    if (!doc.defaultView) return;
    doc.querySelectorAll("[data-ed-sel]").forEach((n) => n.removeAttribute("data-ed-sel"));
    el.setAttribute("data-ed-sel", "1");
    selRef.current = el;
    setSelecao(propsDe(el));
  }

  // Recalcula as props da selecao atual sem trocar o alvo (apos uma edicao).
  function ressincronizarSelecao() {
    const el = selRef.current;
    if (el && el.isConnected) setSelecao(propsDe(el));
  }

  function limparSelecao() {
    if (editandoRef.current) finalizarEdicao();
    const doc = getDoc();
    doc?.querySelectorAll("[data-ed-sel]").forEach((n) => n.removeAttribute("data-ed-sel"));
    selRef.current = null;
    setSelecao(null);
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
      undoRef.current.descartarUltimo();
      setPodeDesfazer(undoRef.current.tem);
    }
    ressincronizarSelecao();
  }
  finalizarEdRef.current = finalizarEdicao;

  // ===== Snapshot pro desfazer: corpo do doc mais o mapa de vars editadas.
  function snapshot() {
    const doc = getDoc();
    if (!doc) return;
    const clone = doc.body.cloneNode(true) as HTMLElement;
    limparArtefatosSelecao(clone);
    const mapa: Record<string, string> = {};
    for (const v of varsRef.current) {
      mapa[v.nome] = doc.documentElement.style.getPropertyValue(v.nome) || "";
    }
    undoRef.current.empurrar({ body: clone.innerHTML, vars: mapa });
    setPodeDesfazer(true);
  }

  function desfazer() {
    const doc = getDoc();
    const snap = undoRef.current.retirar();
    if (!doc || !snap) return;
    // A selecao aponta pra um no que vai ser substituido: solta antes.
    selRef.current = null;
    setSelecao(null);
    doc.body.innerHTML = snap.body;
    for (const [n, v] of Object.entries(snap.vars)) {
      if (v) doc.documentElement.style.setProperty(n, v);
    }
    setVars((prev) => prev.map((x) => ({ ...x, valor: snap.vars[x.nome] || x.valor })));
    setPodeDesfazer(undoRef.current.tem);
    marcarMudou();
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

  // Aplica um deslocamento incremental (usado pelas setas do teclado).
  function deslocar(el: HTMLElement, dx: number, dy: number) {
    const cs = el.ownerDocument.defaultView!.getComputedStyle(el);
    garantirPosicionavel(el, cs);
    const { left, top } = offsetAtual(el, cs);
    el.style.left = left + dx + "px";
    el.style.top = top + dy + "px";
    el.setAttribute("data-ed-mov", "1");
  }

  function moverSelecao(dx: number, dy: number) {
    const el = selRef.current;
    if (!el) return;
    snapshot();
    deslocar(el, dx, dy);
    marcarMudou();
    ressincronizarSelecao();
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
    el.removeAttribute("data-ed-mov");
    marcarMudou();
    ressincronizarSelecao();
  }

  // Cria uma guia (linha) dentro do slide, escondida.
  function criarGuia(doc: Document, slide: HTMLElement, eixo: "v" | "h"): HTMLElement {
    const g = doc.createElement("div");
    g.className = "vkos-ed-guia vkos-ed-guia-" + eixo;
    g.style.display = "none";
    if (eixo === "v") g.style.left = "50%";
    else g.style.top = "50%";
    slide.appendChild(g);
    return g;
  }

  // ===== Arrasto (mouse). O gesto acontece DENTRO do iframe, entao o mousedown
  // no doc "prepara" e o movimento e o fim sao ouvidos na janela do iframe
  // (contentWindow), onde clientX/Y ja estao em px do slide (o transform:scale
  // e aplicado por fora, no elemento iframe, e nao afeta o sistema interno do
  // doc). Tambem escutamos na janela do app pra capturar o ponteiro se ele sair
  // do iframe no meio do gesto, convertendo a coordenada de volta pra px de slide.
  function aoMouseDownDoc(e: MouseEvent) {
    if (e.button !== 0) return;
    // Editando: o mouse serve pra posicionar o cursor, nunca pra arrastar.
    if (editandoRef.current) return;
    const sel = selRef.current;
    const alvo = e.target as HTMLElement | null;
    // So arrasta o proprio selecionado (ou um filho dele). Clique em outro
    // elemento segue como selecao normal.
    if (!sel || !alvo || !(alvo === sel || sel.contains(alvo))) return;
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
    doc.documentElement.classList.add("vkos-ed-arrastando");
    // Guias precisam de um contexto posicionado: se o slide e estatico, damos
    // relative temporario e restauramos no fim.
    if (a.slide) {
      const sp = a.el.ownerDocument.defaultView!.getComputedStyle(a.slide).position;
      if (sp === "static") {
        a.slidePosAntes = a.slide.style.position;
        a.slide.style.position = "relative";
      }
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
    // Snap ao centro do slide, com guias. getBoundingClientRect de um elemento
    // do iframe volta em px do doc (nao escalado), entao a diferenca dos centros
    // ja esta em px de slide; o limiar de tela vira px de slide dividindo pela escala.
    if (a.slide) {
      const limiar = LIMIAR_SNAP / escala();
      const rEl = a.el.getBoundingClientRect();
      const rSl = a.slide.getBoundingClientRect();
      const resX = rSl.left + rSl.width / 2 - (rEl.left + rEl.width / 2);
      const resY = rSl.top + rSl.height / 2 - (rEl.top + rEl.height / 2);
      if (Math.abs(resX) <= limiar) {
        a.el.style.left = left + resX + "px";
        if (a.guiaV) a.guiaV.style.display = "block";
      } else if (a.guiaV) {
        a.guiaV.style.display = "none";
      }
      if (Math.abs(resY) <= limiar) {
        a.el.style.top = top + resY + "px";
        if (a.guiaH) a.guiaH.style.display = "block";
      } else if (a.guiaH) {
        a.guiaH.style.display = "none";
      }
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

  // Clique no documento seleciona o elemento (e nunca navega por link).
  function aoClicarDoc(e: MouseEvent) {
    if (suprimirCliqueRef.current) {
      suprimirCliqueRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const alvo = e.target as HTMLElement | null;
    if (!alvo) return;
    // Editando: clique DENTRO do proprio elemento so posiciona o cursor.
    const emEdicao = editandoRef.current;
    if (emEdicao && (alvo === emEdicao || emEdicao.contains(alvo))) return;
    // Clique fora encerra a edicao antes de trocar de alvo.
    if (emEdicao) finalizarEdicao();
    e.preventDefault();
    e.stopPropagation();
    selecionar(alvo);
  }

  // Duplo clique entra em edicao in-place no elemento de texto mais proximo.
  function aoDuploClicarDoc(e: MouseEvent) {
    const alvo = e.target as HTMLElement | null;
    if (!alvo) return;
    const el = alvoEdicao(alvo);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    iniciarEdicao(el, e.clientX, e.clientY);
  }

  // Setas movem o selecionado quando o foco nao esta num campo. 1px, Shift 10px.
  function aoTeclaJanela(e: KeyboardEvent) {
    if (!selRef.current) return;
    // Enquanto edita texto, as setas andam com o cursor, nunca movem o elemento.
    if (editandoRef.current) return;
    const alvo = e.target as HTMLElement | null;
    if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
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

  // Teclas com o foco DENTRO do iframe (depois de clicar num elemento, o
  // keydown vai pro doc do iframe, nao pro window do app). Espelha os atalhos:
  // Ctrl+S salva pelo caminho de quem monta, Ctrl+Z desfaz, setas movem.
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
    if (ctrl && e.key.toLowerCase() === "z") {
      e.preventDefault();
      desfazer();
      return;
    }
    aoTeclaJanela(e);
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
        "#vkos-ed-runtime,#vkos-ed-layout,#vkos-editor-runtime,#vkos-editor-vars,.vkos-ed-guia",
      )
      .forEach((n) => n.remove());
    // Tira os artefatos volateis (selecao, edicao, guias) pelo nucleo e os
    // extras de arrasto. Os left/top/position inline ficam: sao a posicao real
    // editada.
    limparArtefatosSelecao(clone);
    clone
      .querySelectorAll("[data-ed-atual],[data-ed-mov],[data-ed-relpos]")
      .forEach((n) => {
        n.removeAttribute("data-ed-atual");
        n.removeAttribute("data-ed-mov");
        n.removeAttribute("data-ed-relpos");
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
    setNaoSalvo(false);
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
        editandoRef.current = null;
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
        undoRef.current.limpar();
        selRef.current = null;
        setVars(lista);
        setFontesOpc(montarFontes(doc));
        setSelecao(null);
        setPodeDesfazer(false);
        setPaginas(doc.querySelectorAll(".slide").length || 1);
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

    return () => {
      iframe.removeEventListener("load", aoCarregar);
      window.removeEventListener("keydown", aoTeclaJanela, true);
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
    desfazer,
    podeDesfazer,
    salvar,
    naoSalvo,
    limparSelecao,
  };
}
