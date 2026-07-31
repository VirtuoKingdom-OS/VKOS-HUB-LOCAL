// Armazenamento das conversas, dentro da pasta do CRM.
//
//   app/dados/crm/mensagens/
//     indice.json                 lista de conversas, pra coluna da esquerda
//     conversas/<id>.jsonl        uma conversa por arquivo, append-only
//
// Fica sob crm/ porque o CRM e do CORE e o historico de conversa e dado do
// CRM: a pasta e a mesma que crm/estado.ts enxerga, VKOS_DADOS_TESTE incluso.
//
// Por que uma conversa por arquivo: a thread cresce sem teto e so recebe linha
// nova. Anexar e O(1) e nao reescreve nada. Um arquivo unico pra todas as
// conversas faria cada mensagem disputar o mesmo arquivo, e uma linha
// corrompida arriscaria o historico inteiro. Aqui uma linha corrompida custa
// uma mensagem daquela conversa, e mais nada.
//
// Por que o indice separado: a coluna da esquerda precisa de nome, previa e
// nao lidas de todas as conversas. Sem indice, desenhar a lista abriria todos
// os arquivos de thread a cada carregamento.
//
// ATUALIZACAO DE MENSAGEM EM ARQUIVO APPEND-ONLY: a versao nova da mensagem
// entra como UMA LINHA NOVA E COMPLETA, com o mesmo id. A leitura colapsa por
// id e a ultima linha vence, mantendo a posicao da primeira. E assim que o
// canal real vai poder mudar "na-fila" pra "entregue" por callback sem
// reescrever arquivo e sem migrar formato. Ver
// docs/decisoes/2026-07-27-conversa-append-only-e-atualizacao-por-linha-nova.md.
//
// Quem grava a versao nova mantem id, enviadaEm e criadaEm da original: a
// mensagem e a mesma, so o status dela mudou. Trocar essas datas moveria a
// mensagem de lugar na thread por causa de uma confirmacao de entrega.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { pastaCrm } from "../crm/estado.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { anexarJsonl, lerJsonl } from "../util/jsonl.js";
import { quarentenarOuFalhar } from "../util/quarentena.js";
import {
  ErroMensagens,
  VERSAO_MENSAGENS_ATUAL,
  compararMensagens,
  ehIdSeguro,
  ehIndiceMensagens,
  ehMensagem,
  type Conversa,
  type IndiceMensagens,
  type Mensagem,
} from "./modelo.js";

const NOME_PASTA = "mensagens";
const NOME_PASTA_CONVERSAS = "conversas";
const NOME_INDICE = "indice.json";

export function pastaMensagens(): string {
  return join(pastaCrm(), NOME_PASTA);
}

export function pastaConversas(): string {
  return join(pastaMensagens(), NOME_PASTA_CONVERSAS);
}

export function caminhoIndice(): string {
  return join(pastaMensagens(), NOME_INDICE);
}

// Caminho do arquivo de uma conversa. Recusa id que nao serve como nome de
// arquivo ANTES de montar o caminho: id vem da URL, e "../.." nao pode virar
// leitura fora da pasta.
export function caminhoConversa(id: string): string {
  if (!ehIdSeguro(id)) throw new ErroMensagens("Conversa nao encontrada.", 404);
  return join(pastaConversas(), `${id}.jsonl`);
}

function garantirPasta(caminho: string): void {
  if (!existsSync(caminho)) mkdirSync(caminho, { recursive: true });
}

function indiceVazio(): IndiceMensagens {
  return { versao: VERSAO_MENSAGENS_ATUAL, conversas: [] };
}

// Le o indice. Arquivo ausente devolve vazio: conversa que ainda nao comecou
// nao e falha, e nada e gravado por causa de uma leitura.
//
// Arquivo que EXISTE e nao da pra ler vai pra quarentena com os bytes intactos
// e o erro sobe. Nunca sobrescreve dado do usuario as cegas: e a mesma regra
// do crm.json, que ja custou uma base inteira uma vez.
export function lerIndice(): IndiceMensagens {
  const caminho = caminhoIndice();
  if (!existsSync(caminho)) return indiceVazio();
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    const destino = quarentenarOuFalhar(caminho, "O indice de conversas");
    throw new ErroMensagens(
      `O indice de conversas esta corrompido e nao pode ser lido. O original foi preservado em "${basename(destino)}". As conversas em si continuam nos arquivos de thread.`,
      409,
    );
  }
  if (!ehIndiceMensagens(bruto)) {
    const destino = quarentenarOuFalhar(caminho, "O indice de conversas");
    throw new ErroMensagens(
      `O indice de conversas esta num formato invalido e nao pode ser lido. O original foi preservado em "${basename(destino)}". As conversas em si continuam nos arquivos de thread.`,
      409,
    );
  }
  const indice = bruto as IndiceMensagens;
  return { versao: indice.versao, conversas: indice.conversas };
}

export function salvarIndice(indice: IndiceMensagens): void {
  garantirPasta(pastaMensagens());
  gravarJsonAtomico(caminhoIndice(), indice);
}

export interface LeituraConversa {
  mensagens: Mensagem[];
  // Quantas linhas o arquivo tinha e nao deram pra ler. Acima de zero, a
  // conversa perdeu mensagem e quem chama tem como avisar em vez de fingir que
  // a thread esta inteira.
  linhasInvalidas: number;
}

// Le a thread inteira, ja colapsada por id e ordenada por enviadaEm.
//
// Le o arquivo todo a cada chamada, de proposito. E arquivo local, de uma
// conversa so, e a alternativa (indice de deslocamento por mensagem) e
// complexidade que ninguem precisa nesta escala. Se um dia uma thread ficar
// grande o bastante pra doer, o indice entra aqui dentro sem mudar o formato.
export function lerConversaCompleta(id: string): LeituraConversa {
  const { itens, linhasInvalidas } = lerJsonl<Mensagem>(caminhoConversa(id), ehMensagem);
  // Map preserva a ordem da PRIMEIRA insercao, entao a versao nova de uma
  // mensagem substitui o conteudo sem pular pro fim da thread.
  const porId = new Map<string, Mensagem>();
  for (const mensagem of itens) porId.set(mensagem.id, mensagem);
  const mensagens = [...porId.values()].sort(compararMensagens);
  return { mensagens, linhasInvalidas };
}

// Anexa linhas no fim do arquivo da conversa. Erro de escrita SOBE: mensagem
// que o usuario acabou de registrar nao pode sumir em silencio.
export function anexarMensagens(
  conversaId: string,
  mensagens: readonly Mensagem[],
): void {
  if (mensagens.length === 0) return;
  garantirPasta(pastaConversas());
  anexarJsonl(caminhoConversa(conversaId), mensagens);
}

export function acharConversaNoIndice(
  indice: IndiceMensagens,
  id: string,
): Conversa | undefined {
  return indice.conversas.find((conversa) => conversa.id === id);
}
