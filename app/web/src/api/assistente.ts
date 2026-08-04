import { ErroApi, ErroRede } from "./cliente";
import type {
  ConversaAssistente,
  EntradaRastroAssistente,
  EstadoTarefa,
  TarefaAssistente,
} from "../tipos/assistente";

export { ErroApi, ErroRede };
export type { ConversaAssistente, EntradaRastroAssistente, EstadoTarefa, TarefaAssistente } from "../tipos/assistente";

export interface ConversaAssistenteDetalhe extends ConversaAssistente {
  estadoSessao: string | null;
  turnos: { papel: "usuario" | "assistente"; texto: string; em: string }[];
}

async function pedir<T>(url: string, opcoes?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      ...opcoes,
      headers: opcoes?.body
        ? { "Content-Type": "application/json", ...(opcoes.headers ?? {}) }
        : opcoes?.headers,
    });
  } catch {
    throw new ErroRede();
  }
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string; mensagem?: string };
      mensagem = corpo.erro ?? corpo.mensagem ?? mensagem;
    } catch {
      // Mantem o status quando o servidor nao devolve JSON.
    }
    throw new ErroApi(mensagem, resposta.status);
  }
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}

function json(dados: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(dados) };
}

export function listarConversas(): Promise<{ conversas: ConversaAssistente[] }> {
  return pedir("/api/assistente/conversas");
}

export function criarConversa(titulo?: string): Promise<{ conversa: ConversaAssistente }> {
  return pedir("/api/assistente/conversas", json(titulo ? { titulo } : {}));
}

export function obterConversa(id: string): Promise<ConversaAssistenteDetalhe> {
  return pedir(`/api/assistente/conversas/${encodeURIComponent(id)}`);
}

export function renomearConversa(id: string, titulo: string): Promise<{ conversa: ConversaAssistente }> {
  return pedir(`/api/assistente/conversas/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ titulo }),
  });
}

export function apagarConversa(id: string): Promise<{ ok: true }> {
  return pedir(`/api/assistente/conversas/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function enviarMensagem(id: string, texto: string): Promise<{ ok: true; sessaoId: string }> {
  return pedir(`/api/assistente/conversas/${encodeURIComponent(id)}/mensagem`, json({ texto }));
}

export function sincronizarConversa(id: string): Promise<{ tarefas: TarefaAssistente[] }> {
  return pedir(`/api/assistente/conversas/${encodeURIComponent(id)}/sincronizar`, json({}));
}

export function listarFila(): Promise<{ tarefas: TarefaAssistente[] }> {
  return pedir("/api/assistente/fila");
}

export function aprovarLote(id: string): Promise<{ tarefas: TarefaAssistente[] }> {
  return pedir(`/api/assistente/lotes/${encodeURIComponent(id)}/aprovar`, json({}));
}

export function cancelarLote(id: string): Promise<{ tarefas: TarefaAssistente[] }> {
  return pedir(`/api/assistente/lotes/${encodeURIComponent(id)}/cancelar`, json({}));
}

export function cancelarTarefa(id: string): Promise<{ tarefa: TarefaAssistente }> {
  return pedir(`/api/assistente/tarefas/${encodeURIComponent(id)}/cancelar`, json({}));
}

export function listarRastro(opcoes: { limite?: number; cursor?: string } = {}): Promise<{
  entradas: EntradaRastroAssistente[];
  proximoCursor: string | null;
}> {
  const params = new URLSearchParams();
  if (opcoes.limite) params.set("limite", String(opcoes.limite));
  if (opcoes.cursor) params.set("cursor", opcoes.cursor);
  const sufixo = params.toString() ? `?${params.toString()}` : "";
  return pedir(`/api/assistente/rastro${sufixo}`);
}
