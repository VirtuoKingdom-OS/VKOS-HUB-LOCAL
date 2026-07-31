// Quem responde por um caminho que nao existe em disco.
//
// O Hub roteava por hash ate 2026-07-27, entao o servidor nunca via as rotas
// da interface: o navegador guardava tudo depois do "#" e nao mandava pra ca.
// Com caminho de verdade (/crm em vez de /#/crm), um F5 em qualquer tela bate
// no servidor. Se ele responder 404, o app nao abre.
//
// A regra nao pode ser "devolve o index pra tudo". Isso transformaria erro de
// API em pagina HTML, e o frontend quebraria tentando ler JSON de um "<!doctype".
// Entao a decisao mora aqui, isolada e testavel.

// Prefixos que sao do servidor, nunca da interface. Faltou algo aqui, o
// frontend recebe HTML no lugar do dado e o erro aparece longe da causa.
const PREFIXOS_DO_SERVIDOR = [
  "/api",
  "/ws",
  "/pecas",
  "/pecas-edicao",
  "/modelos-html",
  "/assets",
];

export interface PedidoParaDecidir {
  metodo: string;
  url: string;
  aceita?: string;
}

// O ultimo segmento parece nome de arquivo? "/logo.png" e "/assets/x.js" sim,
// "/crm" e "/studio/minha-peca" nao. Arquivo que nao existe continua 404: e o
// jeito de um asset quebrado aparecer como quebrado, e nao como pagina em branco.
function pareceArquivo(caminho: string): boolean {
  const ultimo = caminho.split("/").filter(Boolean).pop() ?? "";
  return /\.[a-z0-9]{1,8}$/i.test(ultimo);
}

// Este pedido deve receber a casca do app (o index.html)?
export function ehRotaDoApp(pedido: PedidoParaDecidir): boolean {
  // Navegacao e sempre GET. HEAD entra junto porque o navegador usa nos dois.
  const metodo = pedido.metodo.toUpperCase();
  if (metodo !== "GET" && metodo !== "HEAD") return false;

  const caminho = pedido.url.split("?")[0] ?? "";
  if (!caminho.startsWith("/")) return false;

  for (const prefixo of PREFIXOS_DO_SERVIDOR) {
    if (caminho === prefixo || caminho.startsWith(`${prefixo}/`)) return false;
  }

  if (pareceArquivo(caminho)) return false;

  // Sem Accept de HTML nao e navegacao, e um fetch. Devolver pagina pra ele
  // troca um 404 claro por um erro de parse tres camadas adiante.
  const aceita = pedido.aceita ?? "";
  if (!aceita.includes("text/html") && !aceita.includes("*/*")) return false;

  return true;
}
