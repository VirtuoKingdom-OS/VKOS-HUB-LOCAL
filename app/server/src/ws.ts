// Gerencia os clientes WebSocket do cockpit.
// Mantem o conjunto de conexoes vivas e faz broadcast das mensagens do servidor.

import fastifyWebsocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

// Conjunto das conexoes ativas. Cada cliente aberto entra aqui e sai ao fechar.
const clientes = new Set<WebSocket>();

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

  app.get("/ws", { websocket: true }, (socket) => {
    clientes.add(socket);

    socket.on("close", () => {
      clientes.delete(socket);
    });

    // Erro de socket nao pode derrubar o servidor. Solta o cliente.
    socket.on("error", () => {
      clientes.delete(socket);
    });
  });
}

// Serializa a mensagem em JSON e envia pra todos os clientes conectados.
// Tolerante a erro: cliente morto ou envio falho nao afeta os demais.
export function transmitir(mensagem: object): void {
  let texto: string;
  try {
    texto = JSON.stringify(mensagem);
  } catch {
    // Mensagem impossivel de serializar. Nao ha o que transmitir.
    return;
  }

  for (const cliente of clientes) {
    try {
      // readyState 1 = OPEN. So envia pra quem esta pronto.
      if (cliente.readyState === 1) {
        cliente.send(texto);
      }
    } catch {
      // Cliente morto. Remove do conjunto e segue pros outros.
      clientes.delete(cliente);
    }
  }
}
