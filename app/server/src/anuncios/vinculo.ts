// O vinculo entre uma peca de anuncio e a sessao de IA que a escreveu.
//
// POR QUE ELE MORA AQUI, e nao em outro lugar mais obvio.
//
// Nao dentro do anuncio.json: aquele arquivo e reescrito pela IA a cada pedido
// do chat. Guardar o id da sessao la seria pendurar o registro do Hub dentro do
// dado do VKOS, e perde-lo na primeira reescrita.
//
// Nao no estado do React: o dono sai da tela e volta, e a conversa precisa estar
// la. Estado de tela morre no primeiro clique em "voltar".
//
// Entao ele mora em app/dados/workspaces/<id>/anuncios.json, que e onde o Hub
// guarda o que e DELE. A peca e do VKOS; o registro de sessao e do Hub.
//
// A raiz de dados vem de pastaDadosWorkspace, a mesma dos outros modulos, e por
// ela o VKOS_DADOS_TESTE e respeitado. Uma segunda resolucao de raiz aqui seria
// uma segunda chance de o teste gravar no registro real.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  garantirPastaDadosWorkspace,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

export interface VinculoConversa {
  // Id da sessao do Hub, nao o sessionId do provedor.
  sessaoId: string;
  atualizadoEm: string;
}

// A pasta da peca aponta pro vinculo. Uma peca, uma conversa.
export type RegistroVinculos = Record<string, VinculoConversa>;

function caminhoRegistro(workspaceId: string): string {
  return join(pastaDadosWorkspace(workspaceId), "anuncios.json");
}

function ehVinculo(valor: unknown): valor is VinculoConversa {
  if (!valor || typeof valor !== "object") return false;
  const v = valor as Record<string, unknown>;
  return typeof v.sessaoId === "string" && v.sessaoId.length > 0;
}

// Le o registro inteiro. Arquivo ausente, ilegivel ou com forma estranha vira
// registro vazio: perder o vinculo custa uma conversa nova, e derrubar a tela do
// anuncio por causa de um JSON torto custa a peca inteira.
export function lerVinculos(workspaceId: string): RegistroVinculos {
  const caminho = caminhoRegistro(workspaceId);
  if (!existsSync(caminho)) return {};
  try {
    const cru = JSON.parse(readFileSync(caminho, "utf8")) as unknown;
    if (!cru || typeof cru !== "object" || Array.isArray(cru)) return {};
    const limpo: RegistroVinculos = {};
    for (const [pasta, valor] of Object.entries(cru as Record<string, unknown>)) {
      if (ehVinculo(valor)) {
        limpo[pasta] = {
          sessaoId: valor.sessaoId,
          atualizadoEm:
            typeof valor.atualizadoEm === "string" ? valor.atualizadoEm : "",
        };
      }
    }
    return limpo;
  } catch {
    return {};
  }
}

export function lerVinculo(
  workspaceId: string,
  pasta: string,
): VinculoConversa | null {
  return lerVinculos(workspaceId)[pasta] ?? null;
}

// Aponta a peca pra uma sessao. Ultima escrita vence de proposito: quando a
// sessao antiga morre e o dono abre outra, o vinculo tem que passar a apontar
// pra viva, senao a proxima visita reencontra o cadaver.
export function gravarVinculo(
  workspaceId: string,
  pasta: string,
  sessaoId: string,
): VinculoConversa {
  const vinculo: VinculoConversa = {
    sessaoId,
    atualizadoEm: new Date().toISOString(),
  };
  const registro = lerVinculos(workspaceId);
  registro[pasta] = vinculo;
  garantirPastaDadosWorkspace(workspaceId);
  gravarJsonAtomico(caminhoRegistro(workspaceId), registro);
  return vinculo;
}
