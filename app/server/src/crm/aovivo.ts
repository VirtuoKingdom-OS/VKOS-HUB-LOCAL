// O CRM ao vivo: quem grava avisa, quem esta com a tela aberta refaz o fetch.
//
// O padrao e o mesmo do pecas:atualizadas do vkos/rotas.ts: a mensagem e so
// notificacao, nenhum dado de contato viaja nela. Isso evita duas abas com
// estados diferentes e mantem o funil fora do barramento de WebSocket.
//
// POR QUE NAO UM "crm:atualizado" SECO. Um aviso unico e sempre correto, mas
// obriga a tela inteira a reler o funil a cada gravacao, e a ficha grava a cada
// campo que perde o foco. Duas linhas do CRM crescem sem teto e sao lidas por
// caminhos diferentes: o funil (crm.json, o GET /crm) e o historico
// (interacoes.jsonl, o GET /crm/interacoes/ultimas). Registrar uma interacao so
// toca o historico; no funil ele mexe no atualizadoEm do contato, que a tela
// nem desenha. Separar os dois deixa o caso mais frequente, registrar interacao,
// custar a leitura barata em vez do funil inteiro, e ainda diz PARA QUAL contato
// a linha do tempo mudou, entao ficha aberta de outro contato nao recarrega.
//
// O envio e transmitir, pra todas as abas. O CRM subiu pro nivel CORE: e o
// mesmo funil pra qualquer aba do dono, entao transmitirPara estaria errado
// aqui, filtrando por um workspace que o CRM nao tem mais.

import { transmitir } from "../ws.js";

export type EscopoCrm = "funil" | "interacoes";

export interface AvisoCrm {
  tipo: "crm:atualizado";
  escopo: EscopoCrm;
  // So no escopo interacoes: de qual contato a linha do tempo mudou.
  contatoId?: string;
  // Id da aba que gravou, quando ela se identificou no cabecalho x-vkos-aba.
  // Volta no aviso pra essa aba nao recarregar por causa da propria mudanca:
  // ela ja tem a resposta do proprio PATCH na mao.
  origem?: string;
}

// Metodos que nunca mudam nada, entao nunca avisam.
const METODOS_DE_LEITURA = new Set(["GET", "HEAD", "OPTIONS"]);

export function deveAvisar(metodo: string, status: number): boolean {
  return !METODOS_DE_LEITURA.has(metodo) && status < 400;
}

// So as rotas do historico mexem no interacoes.jsonl. O resto e funil.
export function escopoDaRota(padrao: string): EscopoCrm {
  return padrao.endsWith("/interacoes") || padrao.endsWith("/notas")
    ? "interacoes"
    : "funil";
}

export function montarAviso(entrada: {
  escopo: EscopoCrm;
  contatoId?: unknown;
  origem?: unknown;
}): AvisoCrm {
  const contatoId = entrada.contatoId;
  const origem = entrada.origem;
  return {
    tipo: "crm:atualizado",
    escopo: entrada.escopo,
    ...(entrada.escopo === "interacoes" && typeof contatoId === "string" && contatoId
      ? { contatoId }
      : {}),
    ...(typeof origem === "string" && origem ? { origem } : {}),
  };
}

export function avisarCrm(entrada: {
  escopo: EscopoCrm;
  contatoId?: unknown;
  origem?: unknown;
}): void {
  transmitir(montarAviso(entrada));
}
