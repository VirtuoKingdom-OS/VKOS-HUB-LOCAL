import { useEffect, useRef, useState, type RefObject } from "react";
import {
  alvoEdicaoComputado,
  alvoNoPonto,
  entrarContentEditable,
  lerBase64,
  lerVarsRoot,
  limparArtefatosSelecao,
  montarFontes,
  Historico,
  primeiraFonte,
  rgbParaHex,
  sairContentEditable,
  soFilhosInlineComputado,
  temTextoProprio,
  type VarCss,
} from "./nucleo";
import { corDoTema } from "./tema";
import {
  extrairUrlFundo,
  removerUrlFundo,
  substituirUrlFundo,
  type AlvoImagemCapturado,
} from "./imagens";
import type { DirecaoCamada, ItemCamada } from "./PainelCamadas";

// ============================================================================
// CONTRATO PUBLICO DO usarMotorSite
// ============================================================================
//
// Hook de edicao manual do site gerado, irmao do usarMotorEdicao do carrossel,
// mas operando na PAGINA INTEIRA carregada no iframe (nao em slides). Um hook
// por iframe montado. Ele instrumenta o contentDocument (estilo de selecao,
// listeners de clique, duplo clique e teclado, tudo DENTRO do iframe, nunca no
// window do app, licao da rodada 13) e expoe a API abaixo. Nao grava em disco:
// serializa e entrega o HTML pra quem chama (a TelaSite, dono B) gravar.
//
// USO:
//   const motor = usarMotorSite(refIframe, {
//     pasta,                          // subpasta da peca, pro upload de imagem
//     aoMudar: () => setSujo(true),   // opcional: liga o "nao salvo" da tela
//     aoInstrumentar: (doc) => {},    // opcional: pos-carga do iframe
//     aoAtalhoSalvar: () => salvar(), // opcional: Ctrl+S com foco no iframe
//   });
//
// OPCOES (OpcoesMotorSite):
//   pasta: string
//     Subpasta da peca (um segmento). Usada no endpoint de upload de imagem.
//   aoMudar?: () => void
//     Chamado a cada edicao que suja o documento. Quem monta liga o estado de
//     "nao salvo" e afins. O motor tambem expoe naoSalvo por conta propria.
//   aoInstrumentar?: (doc: Document) => void
//     Chamado logo apos instrumentar o doc, a cada (re)carga do iframe.
//   aoAtalhoSalvar?: () => void
//     Chamado quando o usuario aperta Ctrl+S com o foco DENTRO do iframe. O
//     keydown fica no doc do iframe e nao chega ao window do app; o motor
//     intercepta e repassa pra quem monta seguir o mesmo caminho de salvar.
//
// RETORNO (MotorSite):
//   pronto: boolean
//     Verdadeiro quando o doc foi instrumentado e a API esta operante.
//   naoSalvo: boolean
//     Ha edicao pendente de gravacao. Volta a falso so depois de salvar() ok.
//   podeDesfazer: boolean
//     Ha ao menos um snapshot na pilha de desfazer.
//   podeRefazer: boolean
//     Ha ao menos um snapshot na pilha de refazer (so depois de um desfazer;
//     qualquer edicao nova zera essa pilha).
//   selecao: SelecaoSite | null
//     Propriedades do elemento selecionado, pro painel espelhar. Null sem
//     selecao. Campos:
//       tag, classes: identificacao do elemento.
//       texto: textContent atual.
//       editavelTexto: o textarea do painel pode reescrever o texto (tem texto
//         e nenhum filho de bloco, olhando tag E display computado: um span
//         display:block conta como bloco). Filhos inline sao ok, mas reescrever
//         pelo textarea apaga o destaque (ver temDestaqueInline).
//       temDestaqueInline: ha filhos inline (destaque, br); editar pelo textarea
//         troca o texto inteiro e perde o destaque. O painel sugere o duplo
//         clique no canvas, que preserva os filhos.
//       editando: o elemento esta em edicao in-place (contentEditable) agora.
//       ehLink: o selecionado e um <a> ou esta dentro de um <a>. Liga o campo
//         de link do painel. href traz o alvo atual.
//       podeVirarLink: o selecionado ainda nao e link mas pode virar um (nao e
//         body/html, imagem, secao inteira nem contem outro link). O painel
//         mostra o campo Link mesmo assim; o primeiro href converte (ver
//         definirHref).
//       href: valor do atributo href do link mais proximo ("" se nao ha link).
//       ehImagem: o selecionado e um <img>. Liga o trocar imagem do painel.
//       src: atributo src da imagem ("" se nao ha imagem).
//       ehSecao: o selecionado e uma das secoes de nivel de body listadas.
//       fonte, tamanho, peso, cor: tipografia computada (cor em hex).
//       corFundo: cor de fundo do bloco em hex ("" quando transparente).
//   secoes: SecaoSite[]
//     Secoes da pagina, em ordem visual. Sao os filhos elegiveis do body, sem
//     as camadas decorativas; quando sobra um unico container de conteudo (o
//     padrao div.wrapper), a lista desce um nivel e mostra os filhos dele.
//     Cada uma:
//       id: identificador estavel ate a proxima re-listagem (use sempre o mais
//         recente vindo deste array). Passe-o pros metodos de secao.
//       rotulo: nome amigavel (titulo interno ou tipo do bloco + posicao).
//       tag: nome da tag em minusculas.
//       selecionada: a secao e o elemento selecionado agora.
//   camadas: ItemCamada[]
//     Camadas da secao que contem a selecao atual, em ordem de fluxo (a
//     primeira da lista e a primeira no DOM, o topo da secao). Dois niveis:
//     filhos diretos da secao e, quando o filho e um conteiner, os filhos
//     diretos dele. Vazio sem selecao dentro de uma secao. Formato do
//     PainelCamadas compartilhado (id data-vk, papel, conteudo, setas).
//   camadaSelecionadaId: string | null
//     data-vk do selecionado quando ele aparece na lista de camadas.
//   vars: VarCss[]
//     Variaveis de cor do :root da pagina (nome + valor efetivo). Sao as cores
//     globais que o painel lista e sobrescreve por aplicarVar.
//   fontesOpc: string[]
//     Familias de fonte oferecidas (as do documento mais as seguras).
//
//   aplicarTexto(v: string): void
//     Reescreve o textContent do selecionado. So faz sentido quando
//     editavelTexto. Registra snapshot (desfazivel) e suja o documento.
//   aplicarEstilo(prop: string, valor: string, escopo: EscopoEstilo): void
//     Aplica uma propriedade css no selecionado via folha propria
//     <style id="vkos-ajustes">, NUNCA inline. O elemento ganha um id curto
//     estavel data-vk e a folha ganha a regra [data-vk="..."] { prop: valor }.
//     escopo "geral" vale nos dois tamanhos; escopo "mobile" embrulha a regra
//     em @media (max-width: 640px). valor "" remove a propriedade daquele
//     escopo. Desfazivel; suja o documento.
//   definirHref(v: string): void
//     Define o href do link mais proximo do selecionado. Sem link por perto e
//     com podeVirarLink, o primeiro valor nao vazio converte o selecionado em
//     <a> in-place: copia todos os atributos, move os filhos e substitui no
//     DOM, re-selecionando o novo elemento. Desfazivel.
//   trocarImagem(file: File): Promise<void>
//     Faz upload do arquivo pela rota POST /vkos/pecas/:pasta/imagem (mesmo
//     fluxo do carrossel) e aponta o src da <img> selecionada pro caminho
//     relativo devolvido. Rejeita se o selecionado nao for imagem. Desfazivel.
//   aplicarVar(nome: string, valor: string): void
//     Sobrescreve uma variavel de cor global num bloco :root dentro da folha
//     vkos-ajustes (a folha original da pagina nunca e tocada). Desfazivel.
//   selecionarCamada(id: string): void
//     Seleciona no canvas o elemento da camada (id data-vk) e rola ate ele.
//   moverCamada(id: string, direcao: "acima" | "abaixo"): void
//     Troca o elemento com o vizinho de mesmo pai na ordem do DOM. Site e
//     fluxo: "acima" sobe na pagina (antes no DOM), sem mexer em z-index.
//     Desfazivel; suja o documento.
//   inserirImagemLivre(file: File): Promise<void>
//     Faz upload do arquivo e insere um <img> de bloco no FIM da secao que
//     contem a selecao atual (largura 100% da coluna, altura automatica). A
//     largura maxima e ajustavel pelo campo do painel (max-width). Rejeita sem
//     selecao dentro de uma secao. Desfazivel.
//   capturarInsercaoImagem(): AlvoImagemCapturado | null
//     Mesma insercao, mas pro fluxo das fontes de dados: devolve o alvo com
//     contexto da secao e aplicar(caminhoRelativo). Null sem secao de contexto.
//   selecionarSecao(id: string): void
//     Seleciona a secao pelo id (realce + selecao no painel).
//   moverSecao(id: string, direcao: "cima" | "baixo"): void
//     Move a secao uma posicao pra cima ou pra baixo no body. Desfazivel.
//   duplicarSecao(id: string): void
//     Insere uma copia da secao logo depois dela. A copia perde os data-vk pra
//     nao compartilhar regras de estilo com a original. Desfazivel.
//   excluirSecao(id: string): void
//     Remove a secao do documento. Desfazivel. A confirmacao e do painel.
//   limparSelecao(): void
//     Solta a selecao atual e fecha uma edicao in-place aberta. E o que o Esc
//     faz por dentro do iframe.
//   desfazer(): void
//     Restaura o ultimo snapshot (documento inteiro). Cobre texto, estilo,
//     link, imagem e todas as operacoes de secao.
//   serializar(): string
//     Devolve o HTML do documento inteiro pronto pra gravar: doctype
//     preservado, data-vk e a folha vkos-ajustes mantidos, e todos os artefatos
//     do editor removidos (contenteditable, data-ed-*, realces, estilo de
//     runtime, cache-bust de imagem). Nao grava nada.
//   salvar(gravar: (texto: string) => Promise<void>): Promise<void>
//     Serializa e entrega o texto pro callback gravar (quem chama monta o PUT
//     da pagina). Zera naoSalvo so quando o callback resolve. Propaga erro do
//     callback sem zerar naoSalvo.
//
// TECLADO (dentro do iframe): Esc desmarca (nao sai do modo, quem sai e a
// tela). Ctrl+S chama aoAtalhoSalvar. Ctrl+Z desfaz. Em edicao in-place: Esc
// encerra a edicao, Ctrl+Z encerra e desfaz, Ctrl+S encerra e salva. Com o foco
// no app (fora do iframe), a tela espelha Ctrl+S e Ctrl+Z chamando salvar e
// desfazer deste retorno.
// ============================================================================

export interface OpcoesMotorSite {
  // Subpasta da peca (um segmento). Usada no upload de imagem.
  pasta: string;
  // Chamado a cada edicao. Quem monta usa pra ligar o "nao salvo".
  aoMudar?: () => void;
  // Chamado apos instrumentar o doc, a cada (re)carga do iframe.
  aoInstrumentar?: (doc: Document) => void;
  // Chamado no Ctrl+S com foco DENTRO do iframe.
  aoAtalhoSalvar?: () => void;
}

export type EscopoEstilo = "geral" | "mobile";

export interface SelecaoSite {
  tag: string;
  classes: string;
  texto: string;
  editavelTexto: boolean;
  temDestaqueInline: boolean;
  editando: boolean;
  ehLink: boolean;
  // Ainda nao e link mas pode virar um pelo campo Link (ver definirHref).
  podeVirarLink: boolean;
  href: string;
  ehImagem: boolean;
  src: string;
  tipoImagem: "img" | "fundo" | null;
  // Largura maxima efetiva da <img> em px (max-width computado, senao a largura
  // renderizada). 0 quando o selecionado nao e uma tag img.
  larguraMax: number;
  ehSecao: boolean;
  fonte: string;
  tamanho: number;
  peso: string;
  cor: string; // hex, pro color picker
  corFundo: string; // hex, "" quando transparente
  podeSubirNivel: boolean;
  podeExcluir: boolean;
}

export interface SecaoSite {
  id: string;
  rotulo: string;
  tag: string;
  selecionada: boolean;
}

export interface MotorSite {
  pronto: boolean;
  naoSalvo: boolean;
  podeDesfazer: boolean;
  podeRefazer: boolean;
  selecao: SelecaoSite | null;
  secoes: SecaoSite[];
  camadas: ItemCamada[];
  camadaSelecionadaId: string | null;
  vars: VarCss[];
  fontesOpc: string[];
  aplicarTexto(v: string): void;
  aplicarEstilo(prop: string, valor: string, escopo: EscopoEstilo): void;
  definirHref(v: string): void;
  trocarImagem(file: File): Promise<void>;
  excluirImagem(): void;
  selecionarPai(): void;
  excluirSelecionado(): void;
  capturarImagemSelecionada(): AlvoImagemCapturado | null;
  aplicarVar(nome: string, valor: string): void;
  selecionarCamada(id: string): void;
  moverCamada(id: string, direcao: DirecaoCamada): void;
  inserirImagemLivre(file: File): Promise<void>;
  capturarInsercaoImagem(): AlvoImagemCapturado | null;
  selecionarSecao(id: string): void;
  moverSecao(id: string, direcao: "cima" | "baixo"): void;
  duplicarSecao(id: string): void;
  excluirSecao(id: string): void;
  limparSelecao(): void;
  desfazer(): void;
  // Refaz o passo que o desfazer acabou de tirar (Ctrl+Shift+Z, Ctrl+Y).
  refazer(): void;
  serializar(): string;
  salvar(gravar: (texto: string) => Promise<void>): Promise<void>;
}

// Modelo em memoria da folha vkos-ajustes: as vars globais e, por id data-vk,
// as regras de estilo geral e mobile. A folha e re-renderizada a partir daqui a
// cada mudanca, e re-lida daqui a cada carga do doc.
interface RegrasVk {
  geral: Map<string, string>;
  mobile: Map<string, string>;
}
interface ModeloAjustes {
  root: Map<string, string>;
  alvos: Map<string, RegrasVk>;
}

// Tags que nunca contam como secao de nivel de body.
const NAO_SECAO = new Set([
  "SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT", "BR",
]);
// Tags sempre tratadas como secao quando filhas diretas do body.
const TAGS_SECAO = new Set([
  "HEADER", "SECTION", "FOOTER", "MAIN", "NAV", "ARTICLE", "ASIDE",
]);
// Nome amigavel por tipo de bloco.
const NOME_SECAO: Record<string, string> = {
  HEADER: "Cabeçalho",
  FOOTER: "Rodapé",
  SECTION: "Seção",
  MAIN: "Conteúdo",
  NAV: "Menu",
  ARTICLE: "Bloco",
  ASIDE: "Lateral",
  DIV: "Bloco",
};
// Altura minima (px) pra um div direto do body virar secao.
const ALTURA_SECAO = 40;
// Largura do recorte mobile do escopo "mobile".
const MEDIA_MOBILE = "@media (max-width: 640px)";

export function usarMotorSite(
  refIframe: RefObject<HTMLIFrameElement | null>,
  opts: OpcoesMotorSite,
): MotorSite {
  const [pronto, setPronto] = useState(false);
  const [naoSalvo, setNaoSalvo] = useState(false);
  const [podeDesfazer, setPodeDesfazer] = useState(false);
  const [podeRefazer, setPodeRefazer] = useState(false);
  const [selecao, setSelecao] = useState<SelecaoSite | null>(null);
  const [secoes, setSecoes] = useState<SecaoSite[]>([]);
  const [camadas, setCamadas] = useState<ItemCamada[]>([]);
  const [camadaSelecionadaId, setCamadaSelecionadaId] = useState<string | null>(null);
  const [vars, setVars] = useState<VarCss[]>([]);
  const [fontesOpc, setFontesOpc] = useState<string[]>([]);

  // opts muda de identidade a cada render: guardamos num ref pros listeners
  // sempre lerem a versao atual sem reanexar.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const selRef = useRef<HTMLElement | null>(null);
  const histRef = useRef(new Historico<{ html: string }>(50));
  const modeloRef = useRef<ModeloAjustes>({ root: new Map(), alvos: new Map() });
  const contadorVkRef = useRef(0);
  const secoesRef = useRef<Map<string, HTMLElement>>(new Map());
  // Elemento em edicao in-place e o innerHTML de quando entrou.
  const editandoRef = useRef<HTMLElement | null>(null);
  const edAntesRef = useRef<string>("");
  const finalizarEdRef = useRef<() => void>(() => {});
  const aoBlurEd = useRef(() => finalizarEdRef.current());

  const getDoc = (): Document | null => refIframe.current?.contentDocument ?? null;

  function marcarMudou() {
    setNaoSalvo(true);
    optsRef.current.aoMudar?.();
  }

  // ===== Estilo de runtime do editor (removido no save): so o realce da
  // selecao e da edicao in-place. Nao mexe no layout da pagina.
  function injetarRuntime(doc: Document) {
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
    s.textContent =
      `[data-ed-sel]{outline:2px solid ${menta} !important;outline-offset:-2px !important;cursor:pointer !important;}` +
      `[data-ed-editando]{outline:2px dashed ${menta} !important;outline-offset:2px !important;cursor:text !important;}` +
      "[data-ed-editando] *{cursor:text !important;}";
  }

  // ===== Folha de ajustes.
  function garantirFolha(doc: Document): HTMLStyleElement {
    let f = doc.getElementById("vkos-ajustes") as HTMLStyleElement | null;
    if (!f) {
      f = doc.createElement("style");
      f.id = "vkos-ajustes";
      doc.head.appendChild(f);
    }
    return f;
  }

  function declaracoes(mapa: Map<string, string>): string {
    return Array.from(mapa)
      .map(([p, v]) => `${p}:${v};`)
      .join("");
  }

  // Declaracoes de alvo levam !important: o seletor [data-vk] tem especificidade
  // baixa (0,1,0) e perdia pra qualquer regra do site com elemento+classe (ex:
  // h2.title). Numa folha de override de editor, a intencao do usuario vence
  // sempre. O :root fica sem important (a folha vive no fim do head, entao a
  // ordem ja resolve as variaveis).
  function declaracoesImportantes(mapa: Map<string, string>): string {
    return Array.from(mapa)
      .map(([p, v]) => `${p}:${v} !important;`)
      .join("");
  }

  // Re-renderiza a folha vkos-ajustes a partir do modelo em memoria.
  function renderAjustes(doc: Document) {
    const m = modeloRef.current;
    const partes: string[] = [];
    if (m.root.size) partes.push(`:root{${declaracoes(m.root)}}`);
    for (const [id, reg] of m.alvos) {
      if (reg.geral.size) {
        partes.push(`[data-vk="${id}"]{${declaracoesImportantes(reg.geral)}}`);
      }
    }
    const mob: string[] = [];
    for (const [id, reg] of m.alvos) {
      if (reg.mobile.size) {
        mob.push(`[data-vk="${id}"]{${declaracoesImportantes(reg.mobile)}}`);
      }
    }
    if (mob.length) partes.push(`${MEDIA_MOBILE}{${mob.join("")}}`);
    const folha = garantirFolha(doc);
    folha.textContent = partes.join("\n");
  }

  // Le a folha vkos-ajustes existente (pagina ja editada) pro modelo, via CSSOM.
  function lerAjustes(doc: Document) {
    modeloRef.current = { root: new Map(), alvos: new Map() };
    const win = doc.defaultView;
    const folha = doc.getElementById("vkos-ajustes") as HTMLStyleElement | null;
    if (!folha || !win) return;
    let regras: CSSRule[] = [];
    try {
      regras = folha.sheet ? Array.from(folha.sheet.cssRules) : [];
    } catch {
      regras = [];
    }
    for (const regra of regras) {
      if (regra instanceof win.CSSMediaRule) {
        for (const r of Array.from(regra.cssRules)) {
          if (r instanceof win.CSSStyleRule) lerRegraAlvo(r, "mobile");
        }
      } else if (regra instanceof win.CSSStyleRule) {
        if (regra.selectorText.trim() === ":root") {
          for (let i = 0; i < regra.style.length; i++) {
            const nome = regra.style.item(i);
            modeloRef.current.root.set(nome, regra.style.getPropertyValue(nome).trim());
          }
        } else {
          lerRegraAlvo(regra, "geral");
        }
      }
    }
  }

  function lerRegraAlvo(r: CSSStyleRule, escopo: EscopoEstilo) {
    const m = /\[data-vk="([^"]+)"\]/.exec(r.selectorText);
    if (!m) return;
    const id = m[1];
    let reg = modeloRef.current.alvos.get(id);
    if (!reg) {
      reg = { geral: new Map(), mobile: new Map() };
      modeloRef.current.alvos.set(id, reg);
    }
    const destino = escopo === "mobile" ? reg.mobile : reg.geral;
    for (let i = 0; i < r.style.length; i++) {
      const nome = r.style.item(i);
      destino.set(nome, r.style.getPropertyValue(nome).trim());
    }
  }

  // Garante um id data-vk estavel no elemento e a entrada no modelo.
  function garantirVkId(el: HTMLElement): string {
    let id = el.getAttribute("data-vk");
    if (!id) {
      id = "a" + ++contadorVkRef.current;
      el.setAttribute("data-vk", id);
    }
    if (!modeloRef.current.alvos.has(id)) {
      modeloRef.current.alvos.set(id, { geral: new Map(), mobile: new Map() });
    }
    return id;
  }

  // Semeia o contador de ids a partir dos data-vk ja presentes no doc.
  function semearContador(doc: Document) {
    let max = 0;
    doc.querySelectorAll<HTMLElement>("[data-vk]").forEach((el) => {
      const m = /^a(\d+)$/.exec(el.getAttribute("data-vk") || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    contadorVkRef.current = max;
  }

  // ===== Selecao.
  function ehSecaoEl(el: HTMLElement): boolean {
    for (const alvo of secoesRef.current.values()) if (alvo === el) return true;
    return false;
  }

  // O selecionado pode virar link pelo campo Link do painel: nunca body/html,
  // imagem ou uma secao inteira, e nem quem ja e link ou contem um (um <a>
  // dentro de outro e invalido e quebra a navegacao do site).
  function podeVirarLinkEl(el: HTMLElement): boolean {
    if (el.tagName === "BODY" || el.tagName === "HTML" || el.tagName === "IMG") return false;
    if (el.closest("a") || el.querySelector("a")) return false;
    return !ehSecaoEl(el);
  }

  function propsDe(el: HTMLElement): SelecaoSite {
    const win = el.ownerDocument.defaultView!;
    const cs = win.getComputedStyle(el);
    const familia = primeiraFonte(el.style.fontFamily || cs.fontFamily);
    setFontesOpc((prev) => (prev.includes(familia) ? prev : [familia, ...prev]));
    // Criterio computado: um span display:block conta como filho de bloco.
    const semBloco = soFilhosInlineComputado(el);
    const link = el.closest("a");
    const ehImg = el.tagName === "IMG";
    const srcFundo = ehImg ? "" : extrairUrlFundo(cs.backgroundImage || "");
    const bg = cs.backgroundColor;
    const corFundo =
      bg && bg !== "transparent" && !/rgba?\([^)]*,\s*0\s*\)/.test(bg)
        ? rgbParaHex(bg) || ""
        : "";
    const pai = el.parentElement;
    // Largura maxima da <img>: o max-width computado quando ha um definido,
    // senao a largura renderizada (ponto de partida honesto pro campo).
    const larguraMax = ehImg
      ? Math.round(parseFloat(cs.maxWidth) || el.getBoundingClientRect().width)
      : 0;
    return {
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList).filter((c) => c !== "").join(" "),
      texto: el.textContent || "",
      editavelTexto: temTextoProprio(el) && semBloco,
      temDestaqueInline: semBloco && el.children.length > 0,
      editando: editandoRef.current === el,
      ehLink: !!link,
      podeVirarLink: !link && podeVirarLinkEl(el),
      href: link?.getAttribute("href") || "",
      ehImagem: ehImg || !!srcFundo,
      src: ehImg ? (el as HTMLImageElement).getAttribute("src") || "" : srcFundo,
      tipoImagem: ehImg ? "img" : srcFundo ? "fundo" : null,
      larguraMax,
      ehSecao: ehSecaoEl(el),
      fonte: familia,
      tamanho: Math.round(parseFloat(cs.fontSize) || 0),
      peso: String(cs.fontWeight || "400"),
      cor: rgbParaHex(cs.color) || "#000000",
      corFundo,
      podeSubirNivel: !!pai && pai.tagName !== "BODY" && pai.tagName !== "HTML",
      podeExcluir: el.tagName !== "BODY" && el.tagName !== "HTML",
    };
  }

  function selecionar(el: HTMLElement) {
    const doc = el.ownerDocument;
    if (!doc.defaultView) return;
    doc.querySelectorAll("[data-ed-sel]").forEach((n) => n.removeAttribute("data-ed-sel"));
    el.setAttribute("data-ed-sel", "1");
    selRef.current = el;
    setSelecao(propsDe(el));
    marcarSecaoSelecionada();
    relistarCamadas();
  }

  function ressincronizarSelecao() {
    const el = selRef.current;
    if (el && el.isConnected) setSelecao(propsDe(el));
    else {
      selRef.current = null;
      setSelecao(null);
    }
    relistarCamadas();
  }

  function limparSelecao() {
    if (editandoRef.current) finalizarEdicao();
    const doc = getDoc();
    doc?.querySelectorAll("[data-ed-sel]").forEach((n) => n.removeAttribute("data-ed-sel"));
    selRef.current = null;
    setSelecao(null);
    marcarSecaoSelecionada();
    relistarCamadas();
  }

  function selecionarPai(): void {
    const pai = selRef.current?.parentElement;
    if (!pai || pai.tagName === "BODY" || pai.tagName === "HTML") return;
    selecionar(pai);
  }

  function excluirSelecionado(): void {
    const el = selRef.current;
    const doc = getDoc();
    if (!el || !doc || el.tagName === "BODY" || el.tagName === "HTML") return;
    if (editandoRef.current === el) finalizarEdicao();
    snapshot();
    el.remove();
    selRef.current = null;
    setSelecao(null);
    marcarMudou();
    relistarSecoes(doc);
    relistarCamadas();
  }

  // ===== Edicao de texto in-place (duplo clique), via nucleo.
  function iniciarEdicao(el: HTMLElement, x: number, y: number) {
    if (editandoRef.current === el) return;
    if (editandoRef.current) finalizarEdicao();
    const doc = el.ownerDocument;
    if (!doc.defaultView) return;
    snapshot();
    selecionar(el);
    editandoRef.current = el;
    el.addEventListener("blur", aoBlurEd.current);
    edAntesRef.current = entrarContentEditable(el, x, y);
    setSelecao((p) => (p ? { ...p, editando: true } : p));
  }

  function finalizarEdicao() {
    const el = editandoRef.current;
    if (!el) return;
    editandoRef.current = null;
    el.removeEventListener("blur", aoBlurEd.current);
    sairContentEditable(el);
    if (el.innerHTML !== edAntesRef.current) {
      marcarMudou();
    } else {
      histRef.current.descartarUltimo();
      sincronizarBotoesHistorico();
    }
    ressincronizarSelecao();
  }
  finalizarEdRef.current = finalizarEdicao;

  // ===== Snapshot pro desfazer: o documento inteiro, limpo dos artefatos
  // volateis (o runtime e re-injetado na restauracao). Cobre texto, estilo
  // (folha vkos-ajustes e data-vk ficam no snapshot), link, imagem e secoes.
  function capturarSnapshot(): { html: string } | null {
    const doc = getDoc();
    if (!doc) return null;
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("#vkos-ed-runtime").forEach((n) => n.remove());
    limparArtefatosSelecao(clone);
    return { html: clone.innerHTML };
  }

  function sincronizarBotoesHistorico() {
    setPodeDesfazer(histRef.current.temDesfazer);
    setPodeRefazer(histRef.current.temRefazer);
  }

  function snapshot() {
    const snap = capturarSnapshot();
    if (!snap) return;
    histRef.current.registrar(snap);
    sincronizarBotoesHistorico();
  }

  function restaurar(snap: { html: string }) {
    const doc = getDoc();
    if (!doc) return;
    if (editandoRef.current) {
      editandoRef.current.removeEventListener("blur", aoBlurEd.current);
      editandoRef.current = null;
    }
    selRef.current = null;
    setSelecao(null);
    doc.documentElement.innerHTML = snap.html;
    // Os listeners ficam no document (nao nos filhos), entao sobrevivem a troca
    // do innerHTML. So re-preparamos o estado derivado do doc.
    prepararDoc(doc);
    sincronizarBotoesHistorico();
    marcarMudou();
  }

  function desfazer() {
    const atual = capturarSnapshot();
    if (!atual) return;
    const snap = histRef.current.desfazer(atual);
    if (snap) restaurar(snap);
  }

  function refazer() {
    const atual = capturarSnapshot();
    if (!atual) return;
    const snap = histRef.current.refazer(atual);
    if (snap) restaurar(snap);
  }

  // ===== Estilo via folha vkos-ajustes.
  function aplicarEstilo(prop: string, valor: string, escopo: EscopoEstilo) {
    const el = selRef.current;
    const doc = getDoc();
    if (!el || !doc) return;
    snapshot();
    const id = garantirVkId(el);
    const reg = modeloRef.current.alvos.get(id)!;
    const destino = escopo === "mobile" ? reg.mobile : reg.geral;
    if (valor === "") destino.delete(prop);
    else destino.set(prop, valor);
    renderAjustes(doc);
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

  function definirHref(v: string) {
    const el = selRef.current;
    if (!el) return;
    const link = el.closest("a");
    if (link) {
      snapshot();
      link.setAttribute("href", v);
      marcarMudou();
      ressincronizarSelecao();
      return;
    }
    // Sem link por perto: o primeiro valor nao vazio converte o selecionado em
    // <a> in-place (caso do cartao <div> "em breve"). Copia TODOS os atributos
    // (class, style, data-vk, aria-*), move os filhos e substitui no DOM, pra
    // preservar visual e regras de ajuste. O snapshot de documento inteiro
    // cobre o desfazer da conversao.
    if (v === "" || !podeVirarLinkEl(el)) return;
    snapshot();
    const a = el.ownerDocument.createElement("a");
    for (const at of Array.from(el.attributes)) a.setAttribute(at.name, at.value);
    a.setAttribute("href", v);
    while (el.firstChild) a.appendChild(el.firstChild);
    el.replaceWith(a);
    selecionar(a);
    marcarMudou();
  }

  function aplicarVar(nome: string, valor: string) {
    const doc = getDoc();
    if (!doc) return;
    snapshot();
    modeloRef.current.root.set(nome, valor);
    renderAjustes(doc);
    setVars((prev) => prev.map((x) => (x.nome === nome ? { ...x, valor } : x)));
    marcarMudou();
    ressincronizarSelecao();
  }

  // ===== Secoes.
  // Nao usa instanceof HTMLElement: os filhos do body vem do realm do iframe,
  // e o hook roda no realm do app, entao instanceof falharia sempre. Basta ler
  // tag e offsetHeight (que existe em qualquer HTMLElement).
  function ehElegivelSecao(el: Element): el is HTMLElement {
    const he = el as HTMLElement;
    if (el.nodeType !== 1) return false;
    if (NAO_SECAO.has(el.tagName)) return false;
    if (TAGS_SECAO.has(el.tagName)) return true;
    return typeof he.offsetHeight === "number" && he.offsetHeight >= ALTURA_SECAO;
  }

  function rotuloSecao(el: HTMLElement, i: number): string {
    const h = el.querySelector("h1,h2,h3,h4,h5,h6");
    const t = (h?.textContent || "").trim();
    if (t) return t.length > 32 ? t.slice(0, 32) + "..." : t;
    const nome = NOME_SECAO[el.tagName] || el.tagName.toLowerCase();
    return `${nome} ${i + 1}`;
  }

  function marcarSecaoSelecionada() {
    const sel = selRef.current;
    setSecoes((prev) =>
      prev.map((s) => {
        const el = secoesRef.current.get(s.id);
        return { ...s, selecionada: !!el && el === sel };
      }),
    );
  }

  // Camada decorativa de nivel de secao: marcada aria-hidden (particulas,
  // orbs, aneis) ou fixa cobrindo praticamente a viewport inteira (>= 90% da
  // largura E da altura: fundo animado sem aria-hidden). Mover ou duplicar uma
  // dessas nao muda nada visivel, e selecionar mostra um "editar" quebrado
  // (div invisivel de tela inteira), entao ficam fora da lista de secoes.
  function ehDecorativa(el: HTMLElement, doc: Document): boolean {
    if (el.getAttribute("aria-hidden") === "true") return true;
    const win = doc.defaultView;
    if (!win) return false;
    if (win.getComputedStyle(el).position !== "fixed") return false;
    const r = el.getBoundingClientRect();
    const raiz = doc.documentElement;
    return r.width >= raiz.clientWidth * 0.9 && r.height >= raiz.clientHeight * 0.9;
  }

  // Filhos elegiveis de um container, sem as camadas decorativas.
  function filhosSecao(el: Element, doc: Document): HTMLElement[] {
    return Array.from(el.children)
      .filter(ehElegivelSecao)
      .filter((f) => !ehDecorativa(f, doc));
  }

  function relistarSecoes(doc: Document) {
    const body = doc.body;
    secoesRef.current = new Map();
    if (!body) {
      setSecoes([]);
      return;
    }
    // Quando sobra UM unico container de conteudo no body (o padrao de pagina
    // com div.wrapper segurando tudo), desce um nivel e lista os filhos DELE:
    // sao as secoes reais. Repete enquanto sobrar um unico, com limite pequeno
    // de profundidade pra nao afundar em paginas exoticas. As operacoes de
    // secao (mover, duplicar, excluir) operam por parentElement, entao
    // funcionam em qualquer nivel.
    let els = filhosSecao(body, doc);
    for (let prof = 0; prof < 3 && els.length === 1; prof++) {
      const dentro = filhosSecao(els[0], doc);
      if (dentro.length === 0) break;
      els = dentro;
    }
    const sel = selRef.current;
    const lista: SecaoSite[] = els.map((el, i) => {
      const id = "sec" + i;
      secoesRef.current.set(id, el);
      return {
        id,
        rotulo: rotuloSecao(el, i),
        tag: el.tagName.toLowerCase(),
        selecionada: el === sel,
      };
    });
    setSecoes(lista);
  }

  function selecionarSecao(id: string) {
    const el = secoesRef.current.get(id);
    if (el) selecionar(el);
  }

  function moverSecao(id: string, direcao: "cima" | "baixo") {
    const doc = getDoc();
    const el = secoesRef.current.get(id);
    if (!doc || !el) return;
    const alvo = direcao === "cima" ? el.previousElementSibling : el.nextElementSibling;
    if (!alvo) return;
    snapshot();
    if (direcao === "cima") el.parentElement!.insertBefore(el, alvo);
    else el.parentElement!.insertBefore(alvo, el);
    marcarMudou();
    relistarSecoes(doc);
    ressincronizarSelecao();
  }

  function duplicarSecao(id: string) {
    const doc = getDoc();
    const el = secoesRef.current.get(id);
    if (!doc || !el) return;
    snapshot();
    const copia = el.cloneNode(true) as HTMLElement;
    // A copia comeca sem data-vk pra nao dividir regra de estilo com a original.
    if (copia.hasAttribute("data-vk")) copia.removeAttribute("data-vk");
    copia.querySelectorAll("[data-vk]").forEach((n) => n.removeAttribute("data-vk"));
    el.parentElement!.insertBefore(copia, el.nextElementSibling);
    marcarMudou();
    relistarSecoes(doc);
    ressincronizarSelecao();
  }

  function excluirSecao(id: string) {
    const doc = getDoc();
    const el = secoesRef.current.get(id);
    if (!doc || !el) return;
    snapshot();
    if (selRef.current === el || (selRef.current && el.contains(selRef.current))) {
      selRef.current = null;
      setSelecao(null);
    }
    el.remove();
    marcarMudou();
    relistarSecoes(doc);
    relistarCamadas();
  }

  // ===== Camadas da secao (E4): dois niveis, ordem de fluxo do DOM.
  // A secao de contexto e a que contem a selecao atual (ou e a propria
  // selecao). Sem selecao dentro de uma secao, a lista fica vazia.
  function secaoDaSelecao(): HTMLElement | null {
    const sel = selRef.current;
    if (!sel || !sel.isConnected) return null;
    for (const el of secoesRef.current.values()) {
      if (el === sel || el.contains(sel)) return el;
    }
    return null;
  }

  // Filhos elegiveis pra camada: qualquer elemento util, sem o filtro de
  // altura das secoes (um enfeite baixinho tambem e camada).
  function filhosCamada(el: Element): HTMLElement[] {
    return Array.from(el.children).filter(
      (f): f is HTMLElement => f.nodeType === 1 && !NAO_SECAO.has(f.tagName),
    );
  }

  function primeirasPalavras(el: HTMLElement, max = 28): string {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max) + "..." : t;
  }

  // Papel deduzido pro nome amigavel, mesmo criterio do carrossel.
  function papelDe(el: HTMLElement): string {
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    if (el.tagName === "IMG" || extrairUrlFundo(cs?.backgroundImage || "")) {
      return "Imagem";
    }
    if (cs?.pointerEvents === "none" || el.getAttribute("aria-hidden") === "true") {
      return "Enfeite";
    }
    if (temTextoProprio(el) && soFilhosInlineComputado(el)) return "Texto";
    return "Bloco";
  }

  function itemCamadaDe(el: HTMLElement, nivel: 0 | 1, ordem: HTMLElement[]): ItemCamada {
    const i = ordem.indexOf(el);
    const papel = papelDe(el);
    return {
      id: garantirVkId(el),
      nome: papel,
      conteudo: papel === "Texto" ? primeirasPalavras(el) : "",
      detalhe:
        el.tagName.toLowerCase() +
        (el.classList.length ? "." + Array.from(el.classList).join(".") : ""),
      nivel,
      podeSubir: i > 0,
      podeDescer: i >= 0 && i < ordem.length - 1,
    };
  }

  // Um conteiner (bloco sem texto corrido proprio) aninha os filhos diretos um
  // nivel. Dois niveis bastam pra anatomia das secoes geradas.
  function ehConteinerCamada(el: HTMLElement): boolean {
    if (el.children.length === 0) return false;
    return !(temTextoProprio(el) && soFilhosInlineComputado(el));
  }

  function relistarCamadas() {
    const secao = secaoDaSelecao();
    if (!secao) {
      setCamadas([]);
      setCamadaSelecionadaId(null);
      return;
    }
    const itens: ItemCamada[] = [];
    const topo = filhosCamada(secao);
    topo.forEach((el) => {
      itens.push(itemCamadaDe(el, 0, topo));
      if (ehConteinerCamada(el)) {
        const filhos = filhosCamada(el);
        filhos.forEach((f) => itens.push(itemCamadaDe(f, 1, filhos)));
      }
    });
    setCamadas(itens);
    const selId = selRef.current?.getAttribute("data-vk") || null;
    setCamadaSelecionadaId(selId && itens.some((i) => i.id === selId) ? selId : null);
  }

  function selecionarCamada(id: string): void {
    const el = getDoc()?.querySelector<HTMLElement>(`[data-vk="${id}"]`);
    if (!el) return;
    selecionar(el);
    el.scrollIntoView({ block: "nearest" });
  }

  // Site e fluxo: reordenar e trocar de lugar no DOM com o vizinho de mesmo
  // pai. "acima" sobe na pagina (antes no DOM). Sem mexer em z-index.
  function moverCamada(id: string, direcao: DirecaoCamada): void {
    const doc = getDoc();
    const el = doc?.querySelector<HTMLElement>(`[data-vk="${id}"]`);
    const pai = el?.parentElement;
    if (!doc || !el || !pai) return;
    const ordem = filhosCamada(pai);
    const i = ordem.indexOf(el);
    const j = direcao === "acima" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ordem.length) return;
    snapshot();
    if (direcao === "acima") pai.insertBefore(el, ordem[j]);
    else pai.insertBefore(ordem[j], el);
    marcarMudou();
    relistarSecoes(doc);
    relistarCamadas();
    ressincronizarSelecao();
  }

  // ===== Imagem propria (E3): <img> de bloco no fim da secao de contexto.
  // Fluido de proposito (largura 100% da coluna, altura automatica): imagem
  // absoluta quebra o responsivo do site. O max-width sai do campo do painel.
  function inserirImagemNaSecao(caminhoRelativo: string): void {
    const doc = getDoc();
    const secao = secaoDaSelecao();
    if (!doc || !secao) throw new Error("Selecione uma seção do site primeiro.");
    snapshot();
    const img = doc.createElement("img");
    img.alt = "";
    img.style.display = "block";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.maxWidth = "100%";
    img.style.marginLeft = "auto";
    img.style.marginRight = "auto";
    img.setAttribute("data-vk", "a" + ++contadorVkRef.current);
    img.src = `${caminhoRelativo}?vk=${Date.now()}`;
    secao.appendChild(img);
    marcarMudou();
    relistarSecoes(doc);
    selecionar(img);
  }

  async function inserirImagemLivre(file: File): Promise<void> {
    if (!secaoDaSelecao()) throw new Error("Selecione uma seção do site primeiro.");
    const rel = await enviarImagem(optsRef.current.pasta, file);
    inserirImagemNaSecao(rel);
  }

  function capturarInsercaoImagem(): AlvoImagemCapturado | null {
    const secao = secaoDaSelecao();
    if (!secao) return null;
    const contexto = (secao.innerText || secao.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);
    return {
      contexto,
      aplicar: (caminhoRelativo) => inserirImagemNaSecao(caminhoRelativo),
    };
  }

  // ===== Troca de imagem (mesmo fluxo do carrossel).
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

  function aplicarImagemNoAlvo(el: HTMLElement, tipo: "img" | "fundo", rel: string) {
    const doc = getDoc();
    if (!doc || !el.isConnected) throw new Error("A imagem original não está mais no site.");
    snapshot();
    const url = `${rel}?vk=${Date.now()}`;
    if (tipo === "img") {
      (el as HTMLImageElement).setAttribute("src", url);
    } else {
      const id = garantirVkId(el);
      const atual = el.ownerDocument.defaultView?.getComputedStyle(el).backgroundImage || "";
      modeloRef.current.alvos
        .get(id)!
        .geral.set("background-image", substituirUrlFundo(atual, url));
      renderAjustes(doc);
    }
    marcarMudou();
    if (selRef.current === el) ressincronizarSelecao();
  }

  async function trocarImagem(file: File): Promise<void> {
    const el = selRef.current;
    if (!el) throw new Error("Selecione uma imagem primeiro.");
    const props = propsDe(el);
    if (!props.tipoImagem) throw new Error("Selecione uma imagem primeiro.");
    const rel = await enviarImagem(optsRef.current.pasta, file);
    aplicarImagemNoAlvo(el, props.tipoImagem, rel);
  }

  function excluirImagem(): void {
    const el = selRef.current;
    const doc = getDoc();
    if (!el || !doc) return;
    const props = propsDe(el);
    if (!props.tipoImagem) return;
    snapshot();
    if (props.tipoImagem === "img") {
      el.remove();
      selRef.current = null;
      setSelecao(null);
    } else {
      const id = garantirVkId(el);
      const atual = el.ownerDocument.defaultView?.getComputedStyle(el).backgroundImage || "";
      modeloRef.current.alvos
        .get(id)!
        .geral.set("background-image", removerUrlFundo(atual));
      renderAjustes(doc);
      ressincronizarSelecao();
    }
    marcarMudou();
    relistarSecoes(doc);
    relistarCamadas();
  }

  function capturarImagemSelecionada(): AlvoImagemCapturado | null {
    const el = selRef.current;
    if (!el) return null;
    const props = propsDe(el);
    if (!props.tipoImagem) return null;
    const secao = el.closest<HTMLElement>("section,header,main,footer,article") || el.parentElement;
    const alt = el.tagName === "IMG" ? (el as HTMLImageElement).alt : "";
    const contexto = [alt, secao?.innerText || secao?.textContent || ""]
      .filter(Boolean)
      .join(". ");
    return {
      contexto,
      aplicar: (caminhoRelativo) => aplicarImagemNoAlvo(el, props.tipoImagem!, caminhoRelativo),
    };
  }

  // ===== Serializacao e save.
  function doctypeString(doc: Document): string {
    const dt = doc.doctype;
    if (!dt) return "<!DOCTYPE html>";
    let s = "<!DOCTYPE " + dt.name;
    if (dt.publicId) s += ` PUBLIC "${dt.publicId}"`;
    if (dt.systemId) s += `${dt.publicId ? "" : " SYSTEM"} "${dt.systemId}"`;
    return s + ">";
  }

  function serializar(): string {
    const doc = getDoc();
    if (!doc) throw new Error("Documento não carregado.");
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    // Remove o estilo de runtime do editor; mantem data-vk e a folha vkos-ajustes.
    clone.querySelectorAll("#vkos-ed-runtime").forEach((n) => n.remove());
    clone
      .querySelectorAll<HTMLScriptElement>(
        "script[data-vkos-script-type],script[data-vkos-script-sem-type]",
      )
      .forEach((script) => {
        const original = script.getAttribute("data-vkos-script-type");
        if (original !== null) {
          try {
            script.setAttribute("type", decodeURIComponent(original));
          } catch {
            script.setAttribute("type", original);
          }
        } else {
          script.removeAttribute("type");
        }
        script.removeAttribute("data-vkos-script-type");
        script.removeAttribute("data-vkos-script-sem-type");
      });
    limparArtefatosSelecao(clone);
    let html = doctypeString(doc) + "\n" + clone.outerHTML;
    html = html.replace(/([?&])vk=\d+/g, "");
    return html;
  }

  async function salvar(gravar: (texto: string) => Promise<void>): Promise<void> {
    const texto = serializar();
    await gravar(texto);
    histRef.current.limpar();
    setPodeDesfazer(false);
    setPodeRefazer(false);
    setNaoSalvo(false);
  }

  // ===== Clique e teclado (tudo dentro do iframe).
  function aoClicarDoc(e: MouseEvent) {
    const alvo = e.target as HTMLElement | null;
    if (!alvo) return;
    // Editando: clique DENTRO do proprio elemento so posiciona o cursor.
    const emEdicao = editandoRef.current;
    if (emEdicao && (alvo === emEdicao || emEdicao.contains(alvo))) return;
    if (emEdicao) finalizarEdicao();
    // Neutraliza navegacao e handlers do site (menu, etc) no modo edicao.
    e.preventDefault();
    e.stopPropagation();
    // Descida geometrica primeiro: alcanca o cartao "em breve" (pointer-events:
    // none), que o navegador entrega como o container pai. Depois o elemento
    // mais profundo com texto a partir dai, senao o proprio alvo geometrico.
    const geo = alvoNoPonto(alvo, e.clientX, e.clientY);
    const el = alvoEdicaoComputado(geo) || geo;
    selecionar(el);
  }

  function aoDuploClicarDoc(e: MouseEvent) {
    const alvo = e.target as HTMLElement | null;
    if (!alvo) return;
    const geo = alvoNoPonto(alvo, e.clientX, e.clientY);
    const el = alvoEdicaoComputado(geo);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    iniciarEdicao(el, e.clientX, e.clientY);
  }

  // Submit de formulario no modo edicao nunca navega.
  function aoSubmitDoc(e: Event) {
    e.preventDefault();
  }

  // Refazer nas duas grafias que os editores aceitam: Ctrl+Shift+Z e Ctrl+Y.
  function ehRefazer(e: KeyboardEvent): boolean {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return false;
    const k = e.key.toLowerCase();
    return (k === "z" && e.shiftKey) || (k === "y" && !e.shiftKey);
  }

  function aoTeclaDoc(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
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
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      limparSelecao();
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
  }

  // Prepara o estado derivado do doc (sem tocar em listeners). Serve pra carga
  // inicial e pra restauracao do desfazer.
  function prepararDoc(doc: Document) {
    injetarRuntime(doc);
    editandoRef.current = null;
    lerAjustes(doc);
    semearContador(doc);
    setVars(lerVarsRoot(doc));
    setFontesOpc(montarFontes(doc));
    relistarSecoes(doc);
    relistarCamadas();
  }

  // ===== Instrumentacao: liga tudo ao (re)carregar o iframe, limpa no unmount.
  useEffect(() => {
    const iframe = refIframe.current;
    if (!iframe) return;

    function instrumentar() {
      const doc = getDoc();
      if (!doc || !doc.body) return;
      try {
        doc.addEventListener("click", aoClicarDoc, true);
        doc.addEventListener("dblclick", aoDuploClicarDoc, true);
        doc.addEventListener("keydown", aoTeclaDoc, true);
        doc.addEventListener("submit", aoSubmitDoc, true);
        histRef.current.limpar();
        selRef.current = null;
        setSelecao(null);
        setPodeDesfazer(false);
        setPodeRefazer(false);
    setPodeRefazer(false);
        prepararDoc(doc);
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
    const doc0 = iframe.contentDocument;
    if (doc0 && doc0.readyState === "complete" && doc0.body) instrumentar();

    return () => {
      iframe.removeEventListener("load", aoCarregar);
      const d = iframe.contentDocument;
      if (d) {
        d.removeEventListener("click", aoClicarDoc, true);
        d.removeEventListener("dblclick", aoDuploClicarDoc, true);
        d.removeEventListener("keydown", aoTeclaDoc, true);
        d.removeEventListener("submit", aoSubmitDoc, true);
      }
    };
    // Efeito de montagem: refIframe e estavel, os handlers leem tudo por ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    pronto,
    naoSalvo,
    podeDesfazer,
    podeRefazer,
    selecao,
    secoes,
    camadas,
    camadaSelecionadaId,
    vars,
    fontesOpc,
    aplicarTexto,
    aplicarEstilo,
    definirHref,
    trocarImagem,
    excluirImagem,
    selecionarPai,
    excluirSelecionado,
    capturarImagemSelecionada,
    aplicarVar,
    selecionarCamada,
    moverCamada,
    inserirImagemLivre,
    capturarInsercaoImagem,
    selecionarSecao,
    moverSecao,
    duplicarSecao,
    excluirSecao,
    limparSelecao,
    desfazer,
    refazer,
    serializar,
    salvar,
  };
}
