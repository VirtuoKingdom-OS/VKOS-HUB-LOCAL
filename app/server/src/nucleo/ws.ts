// Gerencia os clientes WebSocket do cockpit.
// Mantem o conjunto de conexoes vivas e faz broadcast das mensagens do servidor.

import fastifyWebsocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

// Conjunto das conexoes ativas. Cada cliente aberto entra aqui e sai ao fechar.
const clientes = new Set<WebSocket>();

// Qual workspace cada cliente declarou estar olhando, pro envio com escopo.
const workspacePorCliente = new WeakMap<WebSocket, string>();

// Origens de navegador aceitas no upgrade do WebSocket.
//
// A guarda de Host do index.ts nao protege daqui: um site externo aberto numa
// aba manda Host 127.0.0.1:4600, que esta na allowlist, e WebSocket e isento de
// CORS. Sem checar Origin, qualquer site que o usuario visitar conecta no Hub e
// recebe o broadcast inteiro, que carrega o stream das sessoes de IA com o
// Cerebro, o resumo do CRM e trechos de arquivo lidos.
//
// Origem ausente e aceita de proposito: cliente que nao e navegador (script
// local, ferramenta de teste) nao manda o header, e um site malicioso NAO
// consegue suprimi-lo. O navegador sempre carimba a origem real.
export function origemPermitida(
  origem: string | undefined,
  porta: number,
  origemDev: string,
): boolean {
  if (!origem) return true;
  const aceitas = new Set([
    `http://127.0.0.1:${porta}`,
    `http://localhost:${porta}`,
    origemDev,
  ]);
  return aceitas.has(origem);
}

// Le a declaracao de workspace que o cliente manda pelo socket.
// Devolve o id declarado, "" quando o cliente diz que nao esta em workspace
// nenhum, e null quando a mensagem nao e uma declaracao (nada a fazer).
export function lerDeclaracaoDeWorkspace(bruto: unknown): string | null {
  let texto: string;
  if (typeof bruto === "string") texto = bruto;
  else if (bruto instanceof Uint8Array) texto = Buffer.from(bruto).toString("utf8");
  else if (Array.isArray(bruto)) texto = Buffer.concat(bruto as Uint8Array[]).toString("utf8");
  else return null;

  // Mensagem gigante nao chega nem a virar JSON: declaracao de workspace e um
  // id curto, e o cliente nao tem outro motivo pra falar com o servidor aqui.
  if (texto.length > 1000) return null;

  let mensagem: unknown;
  try {
    mensagem = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!mensagem || typeof mensagem !== "object") return null;
  const m = mensagem as { tipo?: unknown; workspaceId?: unknown };
  if (m.tipo !== "workspace") return null;
  return typeof m.workspaceId === "string" ? m.workspaceId : "";
}

// Registra o plugin de WebSocket e a rota /ws.
// Guarda cada conexao nova e limpa quando o cliente cai.
export async function configurarWs(
  app: FastifyInstance,
  porta: number,
  origemDev: string,
): Promise<void> {
  await app.register(fastifyWebsocket);

  // Recusa o upgrade antes de virar WebSocket. Responde 403 no HTTP.
  app.addHook("onRequest", async (req, resposta) => {
    if (req.url.split("?")[0] !== "/ws") return;
    const origem = req.headers.origin;
    if (!origemPermitida(origem, porta, origemDev)) {
      return resposta.status(403).send({ erro: "origem nao autorizada" });
    }
  });

  app.get("/ws", { websocket: true }, (socket, req) => {
    clientes.add(socket);
    // O cliente declara o workspace que esta olhando em ?workspace=<id>. Serve
    // pra transmitirPara nao mandar dado de um cliente pra aba que esta noutro.
    const declarado = (req.query as { workspace?: string } | undefined)?.workspace;
    if (typeof declarado === "string" && declarado) {
      workspacePorCliente.set(socket, declarado);
    }

    // Redeclaracao em runtime. A aba conecta antes de saber qual cliente esta
    // ativo (o boot ainda esta buscando a lista) e troca de cliente sem
    // derrubar a conexao. Sem isto, a declaracao do upgrade congelaria: a aba
    // que abriu no cliente A e foi pro B pararia de receber o stream da sessao
    // que ela mesma disparou. Derrubar e reabrir o socket a cada troca custaria
    // os eventos da janela de reconexao, entao a declaracao anda por mensagem.
    //
    // Esta e a UNICA mensagem que o servidor aceita do cliente. Qualquer outra
    // coisa e ignorada em silencio.
    socket.on("message", (bruto: unknown) => {
      const id = lerDeclaracaoDeWorkspace(bruto);
      if (id === null) return;
      if (id) workspacePorCliente.set(socket, id);
      else workspacePorCliente.delete(socket);
    });

    socket.on("close", () => {
      clientes.delete(socket);
      workspacePorCliente.delete(socket);
    });

    // Erro de socket nao pode derrubar o servidor. Solta o cliente.
    socket.on("error", () => {
      clientes.delete(socket);
      workspacePorCliente.delete(socket);
    });
  });
}

// Envia o texto ja serializado pros clientes que passarem no filtro.
function enviar(texto: string, aceita: (cliente: WebSocket) => boolean): void {
  for (const cliente of clientes) {
    try {
      // readyState 1 = OPEN. So envia pra quem esta pronto.
      if (cliente.readyState === 1 && aceita(cliente)) {
        cliente.send(texto);
      }
    } catch {
      // Cliente morto. Remove do conjunto e segue pros outros.
      clientes.delete(cliente);
      workspacePorCliente.delete(cliente);
    }
  }
}

function serializar(mensagem: object): string | null {
  try {
    return JSON.stringify(mensagem);
  } catch {
    // Mensagem impossivel de serializar. Nao ha o que transmitir.
    return null;
  }
}

// Serializa a mensagem em JSON e envia pra todos os clientes conectados.
// Tolerante a erro: cliente morto ou envio falho nao afeta os demais.
export function transmitir(mensagem: object): void {
  const texto = serializar(mensagem);
  if (texto === null) return;
  enviar(texto, () => true);
}

// Envia so pros clientes que declararam estar neste workspace.
//
// O transmitir manda pra todo mundo, e o frontend e quem filtra pelo campo
// workspaceId do payload. Isso e frouxo demais pro stream das sessoes de IA:
// sessao:evento repassa o stream cru do provedor, com o Cerebro do cliente e
// trechos de arquivo lido. Com broadcast, qualquer aba recebia o stream de
// qualquer cliente e a unica protecao era o frontend se comportar. Aqui o
// servidor decide, nao o cliente.
//
// Cliente que nao declarou workspace nao recebe. Silencio e o padrao seguro.
export function transmitirPara(workspaceId: string, mensagem: object): void {
  if (!workspaceId) return;
  const texto = serializar(mensagem);
  if (texto === null) return;
  enviar(texto, (cliente) => workspacePorCliente.get(cliente) === workspaceId);
}

// Quantos clientes estao olhando um workspace. Existe pro teste provar o
// escopo sem abrir socket de verdade.
export function clientesNoWorkspace(workspaceId: string): number {
  let total = 0;
  for (const cliente of clientes) {
    if (workspacePorCliente.get(cliente) === workspaceId) total++;
  }
  return total;
}
