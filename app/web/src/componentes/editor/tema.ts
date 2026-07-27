// Ponte entre os tokens de tema do app e o CSS que os motores injetam DENTRO do
// iframe da peca.
//
// O documento do iframe e outro documento: ele nao herda o :root do Hub, nao
// participa da cascata em @layer e nao enxerga var(--menta). Escrever a cor
// direto no motor foi o que deixou o contorno de selecao num verde #00c896 que
// nao e mais o menta do app. A saida honesta e ler o valor efetivo do token no
// documento do HUB, no momento da injecao, e mandar o literal pro iframe. A
// fonte da verdade continua sendo o token, e a cor acompanha os tres temas.
//
// A cor da peca do usuario nunca passa por aqui: isto e so instrumentacao do
// editor (contorno, alca, guia), removida na serializacao.

// Valor de emergencia: o menta dos temas. So entra em cena se o token sumir do
// :root, o que significaria o app inteiro sem tema.
const MENTA_PADRAO = "#2fd4a7";

// Le um token de cor do :root do documento do Hub. Devolve o padrao quando o
// token nao existe ou o documento nao esta disponivel.
export function corDoTema(nome: string, padrao = MENTA_PADRAO): string {
  if (typeof window === "undefined" || typeof document === "undefined") return padrao;
  const valor = window.getComputedStyle(document.documentElement).getPropertyValue(nome);
  const limpo = valor.trim();
  return limpo || padrao;
}

// Converte "#rrggbb" ou "#rgb" em "r, g, b", pro CSS injetado montar rgba() com
// a mesma cor do tema. Cor em outro formato volta null e quem chama cai num
// halo neutro, nunca num verde chumbado.
export function canaisRgb(cor: string): string | null {
  const hex = cor.trim();
  const curto = /^#([0-9a-fA-F]{3})$/.exec(hex);
  const longo = /^#([0-9a-fA-F]{6})$/.exec(hex);
  const bruto = curto
    ? curto[1]
        .split("")
        .map((c) => c + c)
        .join("")
    : longo?.[1];
  if (!bruto) {
    const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(hex);
    return rgb ? `${rgb[1]}, ${rgb[2]}, ${rgb[3]}` : null;
  }
  const n = parseInt(bruto, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
