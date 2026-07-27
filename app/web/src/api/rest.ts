// O jeito de falar com o servidor local, num lugar so.
//
// Saiu de dentro do api/crm.ts quando o cliente das conversas nasceu. Duas
// copias deste helper divergiriam na primeira mudanca de cabecalho, e o
// cabecalho aqui nao e detalhe: e o x-vkos-aba, que e como o servidor devolve
// "origem" no aviso do WebSocket e como cada aba reconhece o proprio eco.

import { CABECALHO_ABA, ID_DESTA_ABA, encerrarGravacao, marcarGravacao } from "./aba";

export class ErroApi extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

export async function pedir<T>(url: string, opcoes?: RequestInit): Promise<T> {
  let resposta: Response;
  // Toda gravacao se identifica. Nao vale so pro POST: o PATCH de um campo
  // salvo no blur tambem volta em aviso, e sem o carimbo a propria aba
  // recarregaria por causa de uma mudanca que ela ja aplicou.
  const grava = Boolean(opcoes?.method) && opcoes?.method !== "GET";
  const cabecalhos = {
    ...(opcoes?.body ? { "Content-Type": "application/json" } : {}),
    ...(grava ? { [CABECALHO_ABA]: ID_DESTA_ABA } : {}),
    ...(opcoes?.headers ?? {}),
  };
  if (grava) marcarGravacao();
  try {
    resposta = await fetch(url, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new ErroApi("Servidor fora do ar.", 0);
  } finally {
    if (grava) encerrarGravacao();
  }
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpoErro = (await resposta.json()) as { erro?: string };
      if (corpoErro.erro) mensagem = corpoErro.erro;
    } catch {
      // Mantem a mensagem HTTP quando o corpo nao e JSON.
    }
    throw new ErroApi(mensagem, resposta.status);
  }
  return (await resposta.json()) as T;
}

export function corpo(metodo: string, dados: unknown): RequestInit {
  return { method: metodo, body: JSON.stringify(dados) };
}

export function apagar(url: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(url, { method: "DELETE" });
}

// Pedaco de URL seguro pra id que vem do usuario ou do disco.
export function trecho(valor: string): string {
  return encodeURIComponent(valor);
}
