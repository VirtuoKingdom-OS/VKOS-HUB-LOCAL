// Quarentena de arquivo de estado corrompido.
//
// Dado do usuario e sagrado: arquivo existente nunca e sobrescrito as cegas. O
// bug que apagou o CRM inteiro comecou num catch que devolvia estado vazio, e a
// gravacao seguinte persistia esse vazio por cima do original. A regra que sai
// daqui e uma so: se o arquivo existe e nao da pra ler, ele SAI DO LUGAR com
// carimbo de data antes de qualquer gravacao. Assim a proxima escrita cria um
// arquivo novo em vez de apagar o dado bom.
//
// Modulo folha: so depende de node fs/path, nunca de outro modulo do servidor.

import { existsSync, renameSync } from "node:fs";
import { basename } from "node:path";

// Erro de estado corrompido. O statusCode e o que o handler global do Fastify le
// pra responder 409 com mensagem legivel em vez de 500 generico.
export class ErroDadoCorrompido extends Error {
  statusCode = 409;
  statusHttp = 409;
  quarentena: string | null;

  constructor(mensagem: string, quarentena: string | null) {
    super(mensagem);
    this.name = "ErroDadoCorrompido";
    this.quarentena = quarentena;
  }
}

// Carimbo AAAA-MM-DDTHH-mm-ss. O ":" do ISO nao vale em nome de arquivo no
// Windows, entao vira "-".
function carimbo(): string {
  return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

// Move o arquivo pra <nome>.corrompido-<carimbo> e devolve o novo caminho.
//
// Devolve null quando nao deu pra mover (ausente, travado, sem permissao). Esse
// null e a informacao mais importante da funcao: enquanto o original estiver no
// lugar, o chamador nao pode gravar nada por cima.
//
// Renomeia, nunca copia nem trunca: os bytes originais chegam intactos do outro
// lado. Duas quarentenas no mesmo segundo ganham sufixo numerico, uma nunca
// cobre a outra.
export function quarentenar(caminho: string): string | null {
  try {
    if (!existsSync(caminho)) return null;
    const base = `${caminho}.corrompido-${carimbo()}`;
    let destino = base;
    let n = 2;
    while (existsSync(destino)) {
      destino = `${base}-${n}`;
      n += 1;
    }
    renameSync(caminho, destino);
    return destino;
  } catch {
    // Falha ao mover nao pode derrubar o servidor. Quem chamou decide o que
    // fazer com o null, e nenhuma escolha inclui gravar por cima.
    return null;
  }
}

function mensagem(oQue: string, caminho: string, destino: string | null): string {
  if (destino) {
    return `${oQue} esta corrompido e nao pode ser lido. O original foi preservado em "${basename(destino)}" e nada foi gravado por cima. Restaure um backup valido pra recuperar os dados.`;
  }
  return `${oQue} esta corrompido e nao deu pra mover pra quarentena. Nada foi gravado por cima. Feche quem estiver usando "${basename(caminho)}" e tente de novo.`;
}

// Falha fechado: quarentena o arquivo e MONTA o erro pra quem chamou lancar.
// Use com throw na frente:  throw quarentenarComErro(caminho, "O registro").
// Devolver o erro em vez de lanca-lo mantem o fluxo explicito no chamador.
export function quarentenarComErro(caminho: string, oQue: string): ErroDadoCorrompido {
  const destino = quarentenar(caminho);
  return new ErroDadoCorrompido(mensagem(oQue, caminho, destino), destino);
}

// Quarentena e libera quem chamou a seguir com o estado padrao. So devolve
// quando o original ja saiu do lugar. Se nao saiu, lanca: seguir com vazio aqui
// deixaria a proxima gravacao apagar o arquivo bom.
export function quarentenarOuFalhar(caminho: string, oQue: string): string {
  const destino = quarentenar(caminho);
  if (!destino) throw new ErroDadoCorrompido(mensagem(oQue, caminho, null), null);
  return destino;
}
