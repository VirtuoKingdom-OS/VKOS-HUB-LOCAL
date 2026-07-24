// Gerencia os clientes WebSocket do cockpit.
// Mantem o conjunto de conexoes vivas e faz broadcast das mensagens do servidor.

import fastifyWebsocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { contextoAtual } from "./plataforma/contexto.js";

// Conjunto das conexoes ativas. Cada cliente aberto entra aqui e sai ao fechar.
const clientes = new Map<WebSocket, { workspaceId: string | null; operador: boolean }>();

// Registra o plugin de WebSocket e a rota /ws.
// Guarda cada conexao nova e limpa quando o cliente cai.
export async function configurarWs(app: FastifyInstance): Promise<void> {
  await app.register(fastifyWebsocket);

  app.get("/ws", { websocket: true }, (socket) => {
    const contexto = contextoAtual();
    clientes.set(socket, {
      workspaceId: contexto?.workspaceId ?? null,
      operador: contexto?.usuario?.papel === "operador",
    });

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

  const workspaceId = typeof (mensagem as { workspaceId?: unknown }).workspaceId === "string"
    ? (mensagem as { workspaceId: string }).workspaceId
    : null;
  for (const [cliente, escopo] of clientes) {
    if (workspaceId && !escopo.operador && escopo.workspaceId !== workspaceId) continue;
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
