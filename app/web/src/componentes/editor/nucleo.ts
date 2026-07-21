// Nucleo de edicao compartilhado. Reune as primitivas que nao dependem de
// slide nem de layout: usadas tanto pelo motor do carrossel (motor.ts, palco de
// slides com posicao absoluta) quanto pelo motor do site (motorSite.ts, pagina
// fluida inteira no iframe). Aqui mora o que os dois fazem igual: achar o
// elemento de texto sob o clique, entrar e sair do modo contentEditable
// preservando os filhos inline, empilhar snapshots pro desfazer, limpar os
// artefatos que o editor injeta e ler cores e fontes do documento. Nada aqui
// conhece ".slide", left/top de arrasto ou endpoint de save: isso e de cada motor.

// Variavel de cor do :root do documento (nome + valor efetivo computado).
export interface VarCss {
  nome: string;
  valor: string;
}

// Tags inline toleradas dentro de um bloco de texto editavel: nao quebram a
// leitura como texto corrido. Um elemento so com filhos assim ainda edita como
// texto (no textarea perde o destaque, no duplo clique preserva).
export const TAGS_INLINE = new Set([
  "B", "I", "EM", "STRONG", "SPAN", "SMALL", "MARK", "BR", "A", "U", "SUP",
  "SUB", "FONT", "ABBR", "CODE", "S", "DEL", "INS",
]);

// Verdadeiro quando todos os filhos elemento sao inline (sem div/p/section...).
export function soFilhosInline(el: Element): boolean {
  return Array.from(el.children).every((c) => TAGS_INLINE.has(c.tagName));
}

// Versao do soFilhosInline que olha tambem o display COMPUTADO de cada filho:
// um span com display block/flex/grid quebra o texto corrido igual a uma div,
// e o textContent do pai sairia embolado em varias linhas no textarea. Filho
// com display none ou contents nao quebra nada. Funcao separada de proposito:
// so o motor do site usa (alvoEdicaoComputado e o editavelTexto do painel); o
// motor do carrossel segue com soFilhosInline puro, sem mudar de comportamento.
export function soFilhosInlineComputado(el: Element): boolean {
  const win = el.ownerDocument.defaultView;
  return Array.from(el.children).every((c) => {
    if (!TAGS_INLINE.has(c.tagName)) return false;
    if (!win) return true;
    const d = win.getComputedStyle(c).display;
    return d === "none" || d === "contents" || d.startsWith("inline");
  });
}

// Verdadeiro quando o elemento tem um text node proprio nao vazio.
export function temTextoProprio(el: Element): boolean {
  return (el.textContent || "").trim().length > 0;
}

// Hit-test: sobe do alvo do clique ate o elemento de texto editavel mais
// proximo (tem texto e nenhum filho de bloco). Null se so ha containers de
// bloco no caminho ate o body.
export function alvoEdicao(alvo: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = alvo;
  while (el && el.tagName !== "BODY" && el.tagName !== "HTML") {
    if (temTextoProprio(el) && soFilhosInline(el)) return el;
    el = el.parentElement;
  }
  return null;
}

// Variante do alvoEdicao com o criterio computado: os filhos precisam ser
// inline de fato (tag E display). Impede que um cartao com spans display:block
// (label + titulo) vire "bloco de texto" com o conteudo todo embolado. So o
// motor do site usa; o carrossel segue com alvoEdicao puro.
export function alvoEdicaoComputado(alvo: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = alvo;
  while (el && el.tagName !== "BODY" && el.tagName !== "HTML") {
    if (temTextoProprio(el) && soFilhosInlineComputado(el)) return el;
    el = el.parentElement;
  }
  return null;
}

// Descida geometrica de hit-test: a partir do alvo que o navegador resolveu,
// desce nos descendentes cujo retangulo contem o ponto (x, y), IGNORANDO
// pointer-events, ate o elemento mais especifico. Resolve o cartao "em breve"
// (pointer-events: none): o navegador nao o entrega como alvo, o clique
// atravessa e cai no container pai, deixando o cartao impossivel de selecionar.
// A cada nivel escolhe o filho de MENOR area sob o ponto (o mais especifico);
// no empate vence o ultimo na ordem do DOM (pintado por cima). Pula camadas
// decorativas GRANDES marcadas aria-hidden (particulas, orbs: retangulo
// cobrindo mais de 60% da area da viewport do documento), que nao sao alvo de
// edicao: no pior caso a descida para no proprio alvo. Um aria-hidden PEQUENO
// (icone de emoji, seta) e alvo legitimo: pular ele deixaria o clique parado
// no container e o filho certo inalcancavel nos cartoes com pointer-events:
// none, onde TODO clique passa pela descida. Nao toca em pointer-events.
// Usada pelos dois motores: o site com o filtro de decorativa grande ligado (o
// padrao), o carrossel com ele desligado (num slide 1080x1350 um hero de fundo
// e alvo legitimo de edicao, nunca deve ser pulado).
export interface OpcoesAlvoNoPonto {
  // Quando false, NAO pula camadas decorativas grandes marcadas aria-hidden.
  // Padrao true (comportamento original do site).
  pularDecorativaGrande?: boolean;
}

export function alvoNoPonto(
  raiz: HTMLElement,
  x: number,
  y: number,
  opcoes?: OpcoesAlvoNoPonto,
): HTMLElement {
  const pularDecorativa = opcoes?.pularDecorativaGrande !== false;
  // Area da viewport do documento, base do criterio de camada decorativa.
  const raizDoc = raiz.ownerDocument.documentElement;
  const areaViewport = raizDoc.clientWidth * raizDoc.clientHeight;
  let atual = raiz;
  for (;;) {
    let escolhido: HTMLElement | null = null;
    let menorArea = Infinity;
    const filhos = atual.children;
    for (let i = 0; i < filhos.length; i++) {
      const f = filhos[i] as HTMLElement;
      if (f.nodeType !== 1) continue;
      const r = f.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (
        pularDecorativa &&
        f.getAttribute("aria-hidden") === "true" &&
        areaViewport > 0 &&
        r.width * r.height > areaViewport * 0.6
      ) {
        continue;
      }
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const area = r.width * r.height;
      if (area <= menorArea) {
        menorArea = area;
        escolhido = f;
      }
    }
    if (!escolhido) return atual;
    atual = escolhido;
  }
}

// Pilha de elementos sob um ponto, pro ciclo de clique repetido: TODOS os
// descendentes de raiz (raiz fora) cujo retangulo contem (x, y) e tem area
// visivel, ordenados do mais especifico pro de tras: menor area primeiro; no
// empate de area, quem vem DEPOIS no DOM primeiro (pintado por cima). Ignora
// pointer-events, como o alvoNoPonto. Quem chama filtra artefatos do editor.
export function pilhaNoPonto(raiz: HTMLElement, x: number, y: number): HTMLElement[] {
  const sob: { el: HTMLElement; area: number; ordem: number }[] = [];
  const todos = raiz.querySelectorAll<HTMLElement>("*");
  for (let i = 0; i < todos.length; i++) {
    const el = todos[i];
    if (el.nodeType !== 1) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    sob.push({ el, area: r.width * r.height, ordem: i });
  }
  sob.sort((a, b) => a.area - b.area || b.ordem - a.ordem);
  return sob.map((s) => s.el);
}

// Fontes seguras sempre oferecidas, alem das que o proprio documento usa.
export const FONTES_SEGURAS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Georgia",
  "Arial",
];

// Familias de fonte: as do documento (links do Google Fonts) mais as seguras.
export function montarFontes(doc: Document): string[] {
  const nomes = new Set<string>(FONTES_SEGURAS);
  doc.querySelectorAll<HTMLLinkElement>('link[href*="googleapis"]').forEach((l) => {
    const re = /family=([^&:]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(l.href))) {
      nomes.add(decodeURIComponent(m[1].replace(/\+/g, " ")));
    }
  });
  return Array.from(nomes);
}

// Le as variaveis CSS do :root de todos os <style> do documento, dedup pelo
// primeiro visto, resolvendo o valor efetivo pelo computed style do <html>.
export function lerVarsRoot(doc: Document): VarCss[] {
  const vistos = new Map<string, string>();
  doc.querySelectorAll("style").forEach((s) => {
    const txt = s.textContent || "";
    const reRoot = /:root\s*\{([^}]*)\}/g;
    let bloco: RegExpExecArray | null;
    while ((bloco = reRoot.exec(txt))) {
      const reVar = /(--[\w-]+)\s*:\s*([^;]+);/g;
      let d: RegExpExecArray | null;
      while ((d = reVar.exec(bloco[1]))) {
        const nome = d[1].trim();
        if (!vistos.has(nome)) vistos.set(nome, d[2].trim());
      }
    }
  });
  const win = doc.defaultView;
  const cs = win ? win.getComputedStyle(doc.documentElement) : null;
  const lista: VarCss[] = [];
  vistos.forEach((decl, nome) => {
    const efetivo = (cs?.getPropertyValue(nome) || "").trim() || decl;
    lista.push({ nome, valor: efetivo });
  });
  return lista;
}

// Converte rgb/rgba computado pra hex, pro input type=color. Null se nao der.
export function rgbParaHex(cor: string): string | null {
  const m = cor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const h = (n: number) => Number(n).toString(16).padStart(2, "0");
  return "#" + h(+m[1]) + h(+m[2]) + h(+m[3]);
}

// Fonte principal de uma declaracao font-family (tira aspas e o resto da pilha).
export function primeiraFonte(ff: string): string {
  return (ff.split(",")[0] || "").trim().replace(/^['"]|['"]$/g, "");
}

// Le um arquivo como base64 puro (sem o prefixo data:).
export function lerBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      res(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

// Le um numero de um valor css (px, etc). 0 quando nao da.
export function lerNum(v: string | null | undefined): number {
  const n = parseFloat(v || "");
  return isNaN(n) ? 0 : n;
}

// Pilha de snapshots pro desfazer. Generica: cada motor decide o que um
// snapshot guarda (corpo + vars no carrossel, documento inteiro no site) e como
// restaura. A pilha so empilha, retira e limita o tamanho.
export class PilhaSnapshots<T> {
  private itens: T[] = [];
  constructor(private limite = 40) {}
  // Empilha um snapshot novo; se passar do limite, descarta o mais antigo.
  empurrar(snap: T): void {
    this.itens.push(snap);
    if (this.itens.length > this.limite) this.itens.shift();
  }
  // Retira e devolve o topo (o snapshot a restaurar), ou undefined se vazia.
  retirar(): T | undefined {
    return this.itens.pop();
  }
  // Joga fora o topo sem restaurar (ex: edicao que nao mudou nada).
  descartarUltimo(): void {
    this.itens.pop();
  }
  // Zera a pilha (ex: ao recarregar o iframe).
  limpar(): void {
    this.itens = [];
  }
  // Ha ao menos um snapshot pra desfazer.
  get tem(): boolean {
    return this.itens.length > 0;
  }
  // Quantos snapshots existem.
  get tamanho(): number {
    return this.itens.length;
  }
}

// Entra no modo contentEditable in-place no elemento, preservando os filhos
// inline (destaque colorido, br). Marca com data-ed-editando, foca e posiciona
// o cursor no ponto (x, y) do clique quando o navegador oferece
// caretRangeFromPoint. Devolve o innerHTML de ANTES da edicao, pra quem chama
// saber depois se mudou de verdade. Nao mexe em listeners de blur nem em
// snapshot: isso e responsabilidade de quem chama.
// Restaura o user-select inline de um elemento que passou pela edicao: volta o
// valor inline que existia antes (guardado em data-ed-us*) ou limpa. Usada na
// saida da edicao e na limpeza de artefatos (clones de snapshot/serializacao),
// pra nenhum user-select do editor vazar pro HTML salvo.
function restaurarUserSelect(el: HTMLElement): void {
  if (!el.hasAttribute("data-ed-us")) return;
  const us = el.getAttribute("data-ed-us") || "";
  const uswk = el.getAttribute("data-ed-us-wk") || "";
  if (us) el.style.setProperty("user-select", us);
  else el.style.removeProperty("user-select");
  if (uswk) el.style.setProperty("-webkit-user-select", uswk);
  else el.style.removeProperty("-webkit-user-select");
  el.removeAttribute("data-ed-us");
  el.removeAttribute("data-ed-us-wk");
  if (!el.getAttribute("style")) el.removeAttribute("style");
}

export function entrarContentEditable(el: HTMLElement, x: number, y: number): string {
  const doc = el.ownerDocument;
  const antes = el.innerHTML;
  el.setAttribute("contenteditable", "true");
  el.setAttribute("data-ed-editando", "1");
  // user-select:none (enfeites como as aspas dos templates) mata o caret do
  // contentEditable: o foco entra, mas nao ha range e digitar nao muda nada.
  // Neutraliza inline SO durante a edicao, guardando o valor inline anterior
  // em data-ed-us* pra saida (ou a limpeza de artefatos) restaurar sem residuo.
  el.setAttribute("data-ed-us", el.style.getPropertyValue("user-select"));
  el.setAttribute("data-ed-us-wk", el.style.getPropertyValue("-webkit-user-select"));
  el.style.setProperty("user-select", "text", "important");
  el.style.setProperty("-webkit-user-select", "text", "important");
  el.focus();
  const s = doc.getSelection?.();
  const anyDoc = doc as unknown as {
    caretRangeFromPoint?: (px: number, py: number) => Range | null;
  };
  if (s) {
    // Caret no ponto do clique quando ele cai DENTRO do elemento; senao, no
    // fim do conteudo (um alvo com pointer-events:none pode fazer o
    // caretRangeFromPoint devolver um range de outro elemento).
    const r = anyDoc.caretRangeFromPoint?.(x, y);
    if (r && el.contains(r.startContainer)) {
      s.removeAllRanges();
      s.addRange(r);
    } else {
      const fim = doc.createRange();
      fim.selectNodeContents(el);
      fim.collapse(false);
      s.removeAllRanges();
      s.addRange(fim);
    }
  }
  return antes;
}

// Sai do modo contentEditable: tira os atributos do editor, restaura o
// user-select e normaliza os text nodes (junta os fragmentos partidos).
export function sairContentEditable(el: HTMLElement): void {
  el.removeAttribute("contenteditable");
  el.removeAttribute("data-ed-editando");
  restaurarUserSelect(el);
  el.normalize();
}

// Limpa os artefatos volateis do editor numa arvore (clone): guias de arrasto,
// contorno de selecao e a marca de edicao in-place. NAO toca em left/top nem em
// data-ed-mov/data-ed-relpos (a posicao editada, que o snapshot precisa manter)
// nem em data-vk (a ancora das regras da folha de ajustes do site). Cada motor
// remove os proprios extras alem destes.
export function limparArtefatosSelecao(raiz: Element): void {
  raiz.querySelectorAll(".vkos-ed-guia").forEach((n) => n.remove());
  raiz.querySelectorAll(".vkos-ed-alca").forEach((n) => n.remove());
  raiz.querySelectorAll("[data-ed-sel]").forEach((n) => n.removeAttribute("data-ed-sel"));
  raiz.querySelectorAll("[data-ed-editando],[contenteditable]").forEach((n) => {
    n.removeAttribute("data-ed-editando");
    n.removeAttribute("contenteditable");
  });
  raiz.querySelectorAll("[data-ed-us]").forEach((n) => restaurarUserSelect(n as HTMLElement));
}
