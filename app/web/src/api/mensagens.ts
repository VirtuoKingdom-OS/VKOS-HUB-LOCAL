// Cliente REST das conversas do CRM.
//
// FRONTEIRA DE TIPOS: Mensagem, Conversa, PaginaConversa, ItemLinhaDoTempo e
// CapacidadesCanal NAO sao redeclaradas aqui. Vem de ../tipos/mensagens, que
// reexporta o modelo do servidor. Existe uma definicao so, e divergencia de
// modelo vira erro de compilacao.
//
// O que mora aqui: o corpo do que a tela ENVIA (Dados*), pelo mesmo motivo do
// api/crm.ts. Nao e entidade, e formato de requisicao.

import { corpo, pedir, trecho } from "./rest";
import type {
  AnexoMensagem,
  CapacidadesCanal,
  Conversa,
  DirecaoMensagem,
  IdCanal,
  ItemLinhaDoTempo,
  Mensagem,
  PaginaConversa,
  StatusConversa,
  TipoMensagem,
} from "../tipos/mensagens";

export type {
  AnexoMensagem,
  AutorMensagem,
  CapacidadesCanal,
  Conversa,
  DirecaoMensagem,
  IdCanal,
  ItemLinhaDoTempo,
  Mensagem,
  PaginaConversa,
  StatusConversa,
  StatusMensagem,
  TipoMensagem,
} from "../tipos/mensagens";

const BASE = "/api/crm/mensagens";

// ----------------------------------------------------------------- canais

export interface CanalResumo {
  id: IdCanal;
  rotulo: string;
  capacidades: CapacidadesCanal;
}

// O que cada canal consegue fazer. A tela pergunta ISTO, nunca "o canal e
// whatsapp?": o relogio da janela de 24 horas e o seletor de template nascem de
// uma capacidade virar verdadeira, nao de alguem citar o nome do canal.
export async function listarCanais(): Promise<CanalResumo[]> {
  const dados = await pedir<{ canais: CanalResumo[] }>(`${BASE}/canais`);
  return dados.canais ?? [];
}

// ------------------------------------------------------------- conversas

export interface FiltroConversas {
  contatoId?: string;
  status?: StatusConversa;
}

// A coluna da esquerda. Ja vem ordenada por quem falou por ultimo, e NAO traz
// mensagem nenhuma: so previa, nao lidas e status.
export async function listarConversas(filtro?: FiltroConversas): Promise<Conversa[]> {
  const busca = new URLSearchParams();
  if (filtro?.contatoId) busca.set("contatoId", filtro.contatoId);
  if (filtro?.status) busca.set("status", filtro.status);
  const consulta = busca.toString();
  const dados = await pedir<{ conversas: Conversa[] }>(
    `${BASE}/conversas${consulta ? `?${consulta}` : ""}`,
  );
  return dados.conversas ?? [];
}

export interface DadosNovaConversa {
  contatoId: string;
  canal?: IdCanal;
  negocioId?: string;
  identificadorExterno?: string;
}

// Abre a conversa de um contato.
//
// ATENCAO: o servidor responde 200 quando a conversa JA EXISTIA, e 201 quando
// nasceu agora. Os dois sao sucesso, e os dois devolvem a conversa. Tratar 200
// como erro aqui faria o botao "conversar" falhar justamente com quem ja tem
// historico.
export function criarConversa(dados: DadosNovaConversa): Promise<Conversa> {
  return pedir<Conversa>(`${BASE}/conversas`, corpo("POST", dados));
}

export interface OpcoesPagina {
  limite?: number;
  // Id da mensagem mais antiga que a tela ja tem. Caminha pro passado.
  antesDe?: string;
}

// Abre a thread. Sempre uma pagina: por padrao a mais nova, que e a que a tela
// mostra ao abrir. Rolar pra cima e repassar o cursorAnterior em antesDe.
export function abrirConversa(id: string, opcoes?: OpcoesPagina): Promise<PaginaConversa> {
  const busca = new URLSearchParams();
  if (opcoes?.limite) busca.set("limite", String(opcoes.limite));
  if (opcoes?.antesDe) busca.set("antesDe", opcoes.antesDe);
  const consulta = busca.toString();
  return pedir<PaginaConversa>(
    `${BASE}/conversas/${trecho(id)}${consulta ? `?${consulta}` : ""}`,
  );
}

export interface DadosConversa {
  status?: StatusConversa;
  adiadaAte?: string | null;
  negocioId?: string | null;
}

export function atualizarConversa(id: string, dados: DadosConversa): Promise<Conversa> {
  return pedir<Conversa>(`${BASE}/conversas/${trecho(id)}`, corpo("PATCH", dados));
}

// Zera as nao lidas e move o cursor de leitura. Nao reescreve mensagem nenhuma:
// "eu ja li" e estado do dono, nao fato da mensagem.
export function marcarComoLida(id: string): Promise<Conversa> {
  return pedir<Conversa>(`${BASE}/conversas/${trecho(id)}/lida`, { method: "POST" });
}

// ------------------------------------------------------------- mensagens

export interface DadosMensagem {
  direcao: DirecaoMensagem;
  texto: string;
  // Quando aconteceu no mundo real. Ausente vale agora. E o campo do registro
  // retroativo: "respondi ontem" entra no lugar certo da thread.
  enviadaEm?: string;
  tipo?: TipoMensagem;
  // Nota interna. Nunca sai pro contato, em canal nenhum.
  privada?: boolean;
  anexos?: AnexoMensagem[];
  // Sempre mandada pela tela. Clique duplo e retentativa de rede devolvem a
  // MESMA mensagem com 200 em vez de gravar uma segunda.
  chaveIdempotencia: string;
}

export function registrarMensagem(
  conversaId: string,
  dados: DadosMensagem,
): Promise<Mensagem> {
  return pedir<Mensagem>(
    `${BASE}/conversas/${trecho(conversaId)}/mensagens`,
    corpo("POST", dados),
  );
}

// -------------------------------------------------------- linha do tempo

// Uniao ordenada de interacao e mensagem, mais novas primeiro, discriminada por
// item.tipo. E view: nada foi copiado de um arquivo pro outro.
export async function linhaDoTempo(
  contatoId: string,
  limite?: number,
): Promise<ItemLinhaDoTempo[]> {
  const consulta = limite ? `?limite=${limite}` : "";
  const dados = await pedir<{ itens: ItemLinhaDoTempo[] }>(
    `/api/crm/contatos/${trecho(contatoId)}/linha-do-tempo${consulta}`,
  );
  return dados.itens ?? [];
}
