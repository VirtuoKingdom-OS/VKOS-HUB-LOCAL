import { useEffect, useRef } from "react";
import type { MensagemWs } from "../tipos/dominio";

// Hook de WebSocket que reconecta sozinho.
// Distribui cada mensagem parseada pra quem passou aoReceber.
// Avisa mudanca de conexao por aoMudarConexao.
// aoReconectar (opcional) dispara SO nas reconexoes (todo onopen que nao e o
// primeiro), pra quem quiser re-sincronizar o estado perdido na queda.
//
// workspace e o cliente que esta aberto nesta aba. O servidor usa a declaracao
// pra decidir quem recebe o stream das sessoes: sessao:evento carrega o Cerebro
// e trechos de arquivo lido, e antes ia em broadcast pra todas as abas, com o
// frontend filtrando. Quem nao declara nada nao recebe evento de sessao
// nenhuma, entao a declaracao NAO e opcional pro cockpit funcionar.
//
// A declaracao anda em duas pernas, e as duas sao necessarias:
//   1. ?workspace=<id> no upgrade, pra ja nascer no escopo certo.
//   2. uma mensagem quando o cliente ativo muda, porque a aba conecta antes de
//      saber qual e o ativo (o boot ainda esta buscando a lista) e porque
//      trocar de cliente nao pode derrubar o socket: os eventos da janela de
//      reconexao se perderiam.
export function usarWebSocket(
  aoReceber: (mensagem: MensagemWs) => void,
  aoMudarConexao: (conectado: boolean) => void,
  aoReconectar?: () => void,
  workspace?: string | null
): void {
  const refReceber = useRef(aoReceber);
  const refConexao = useRef(aoMudarConexao);
  const refReconectar = useRef(aoReconectar);
  const refWorkspace = useRef(workspace ?? null);
  const refSocket = useRef<WebSocket | null>(null);
  refReceber.current = aoReceber;
  refConexao.current = aoMudarConexao;
  refReconectar.current = aoReconectar;
  refWorkspace.current = workspace ?? null;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let timer: number | undefined;
    let desmontado = false;
    // Primeira conexao nao e reconexao: so os onopen seguintes disparam a
    // re-sincronizacao. Persiste por toda a vida do efeito (todas as retomadas).
    let jaConectou = false;

    const conectar = () => {
      const protocolo = location.protocol === "https:" ? "wss" : "ws";
      const declarado = refWorkspace.current;
      const consulta = declarado ? `?workspace=${encodeURIComponent(declarado)}` : "";
      socket = new WebSocket(`${protocolo}://${location.host}/ws${consulta}`);
      refSocket.current = socket;

      socket.onopen = () => {
        refConexao.current(true);
        // Redeclara sempre no open: entre criar o socket e ele abrir, o boot
        // pode ter descoberto o cliente ativo. Na reconexao isto e o que
        // devolve o escopo, senao a aba volta muda depois da queda.
        declararWorkspace(socket, refWorkspace.current);
        if (jaConectou) {
          // Reconexao: um reconnect, uma recarga. Reconcilia o que se perdeu.
          refReconectar.current?.();
        } else {
          jaConectou = true;
        }
      };

      socket.onmessage = (evento) => {
        try {
          const mensagem = JSON.parse(evento.data as string) as MensagemWs;
          refReceber.current(mensagem);
        } catch {
          // linha invalida, ignora
        }
      };

      socket.onclose = () => {
        refConexao.current(false);
        if (!desmontado) {
          timer = window.setTimeout(conectar, 2000);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    conectar();

    return () => {
      desmontado = true;
      if (timer) window.clearTimeout(timer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      refSocket.current = null;
    };
  }, []);

  // Trocou de cliente: avisa o servidor pela conexao que ja existe. Sem isto a
  // aba continuaria no escopo declarado no upgrade e pararia de receber o
  // stream da sessao que ela mesma acabou de disparar.
  useEffect(() => {
    declararWorkspace(refSocket.current, workspace ?? null);
  }, [workspace]);
}

// Manda a declaracao de escopo. Socket fechado nao recebe: o onopen redeclara.
function declararWorkspace(socket: WebSocket | null, workspace: string | null): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  try {
    socket.send(JSON.stringify({ tipo: "workspace", workspaceId: workspace ?? "" }));
  } catch {
    // Socket morrendo. O onopen da proxima conexao redeclara.
  }
}
