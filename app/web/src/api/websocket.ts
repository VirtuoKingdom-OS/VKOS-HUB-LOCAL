import { useEffect, useRef } from "react";
import type { MensagemWs } from "../tipos/dominio";

// Hook de WebSocket que reconecta sozinho.
// Distribui cada mensagem parseada pra quem passou aoReceber.
// Avisa mudanca de conexao por aoMudarConexao.
// aoReconectar (opcional) dispara SO nas reconexoes (todo onopen que nao e o
// primeiro), pra quem quiser re-sincronizar o estado perdido na queda.
export function usarWebSocket(
  aoReceber: (mensagem: MensagemWs) => void,
  aoMudarConexao: (conectado: boolean) => void,
  aoReconectar?: () => void
): void {
  const refReceber = useRef(aoReceber);
  const refConexao = useRef(aoMudarConexao);
  const refReconectar = useRef(aoReconectar);
  refReceber.current = aoReceber;
  refConexao.current = aoMudarConexao;
  refReconectar.current = aoReconectar;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let timer: number | undefined;
    let desmontado = false;
    // Primeira conexao nao e reconexao: so os onopen seguintes disparam a
    // re-sincronizacao. Persiste por toda a vida do efeito (todas as retomadas).
    let jaConectou = false;

    const conectar = () => {
      const protocolo = location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocolo}://${location.host}/ws`);

      socket.onopen = () => {
        refConexao.current(true);
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
    };
  }, []);
}
