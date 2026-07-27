// Armazenamento append-only em JSON Lines, um registro por linha.
//
// Serve pro que cresce sem teto: interacao, historico de estagio, mensagem.
// Anexar uma linha e O(1) e nao reescreve nada do que ja esta em disco, ao
// contrario do crm.json, que e lido e gravado inteiro a cada operacao.
//
// Leitura tolerante: linha invalida e pulada e contada, nunca derruba o resto.
// Uma linha corrompida custa um registro, nao o historico inteiro. E o mesmo
// espirito do eventos/barramento.ts, que ja fazia isso.
//
// NAO tem rotacao, de proposito. Rotacao serve pra log de auditoria, que pode
// perder o comeco sem prejuizo. Aqui mora dado do usuario: interacao e
// historico de estagio sao permanentes.
//
// Modulo folha: so depende de node fs/path.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export interface LeituraJsonl<T> {
  itens: T[];
  // Quantas linhas o arquivo tinha e nao deram pra ler. Zero e o normal; acima
  // disso o chamador tem como avisar em vez de fingir que o arquivo esta inteiro.
  linhasInvalidas: number;
}

function garantirPasta(caminho: string): void {
  const pasta = dirname(caminho);
  if (!existsSync(pasta)) mkdirSync(pasta, { recursive: true });
}

// Le o arquivo inteiro, na ordem em que foi gravado. Arquivo ausente devolve
// lista vazia sem erro: historico que ainda nao comecou nao e falha.
export function lerJsonl<T>(
  caminho: string,
  ehValido: (valor: unknown) => boolean,
): LeituraJsonl<T> {
  if (!existsSync(caminho)) return { itens: [], linhasInvalidas: 0 };
  let bruto: string;
  try {
    bruto = readFileSync(caminho, "utf8");
  } catch {
    // Arquivo travado ou sem permissao: devolve vazio e conta como problema.
    // Nada e gravado por cima por causa disso, entao o original segue intacto.
    return { itens: [], linhasInvalidas: 0 };
  }
  const itens: T[] = [];
  let linhasInvalidas = 0;
  for (const linha of bruto.split("\n")) {
    if (!linha.trim()) continue;
    try {
      const valor: unknown = JSON.parse(linha);
      if (ehValido(valor)) itens.push(valor as T);
      else linhasInvalidas += 1;
    } catch {
      linhasInvalidas += 1;
    }
  }
  return { itens, linhasInvalidas };
}

// Anexa registros no fim do arquivo, numa chamada so.
//
// Erro de escrita SOBE. Aqui e dado do usuario, nao log: uma interacao que o
// usuario acabou de registrar nao pode sumir em silencio. Quem chama devolve o
// erro pra tela.
export function anexarJsonl(caminho: string, itens: readonly unknown[]): void {
  if (itens.length === 0) return;
  garantirPasta(caminho);
  const texto = itens.map((item) => JSON.stringify(item)).join("\n") + "\n";
  appendFileSync(caminho, texto, "utf8");
}

// Anexa so o que ainda nao esta la, comparando por id. E o que torna a migracao
// idempotente: se o processo cair depois de gravar o historico e antes de gravar
// o crm.json novo, a proxima leitura tenta de novo e nao duplica nada.
//
// Le o arquivo inteiro antes de gravar, entao serve pra migracao, nao pro
// caminho quente do dia a dia. Devolve quantos registros entraram de fato.
export function anexarJsonlSemRepetir<T>(
  caminho: string,
  itens: readonly T[],
  idDe: (item: T) => string,
  ehValido: (valor: unknown) => boolean,
): number {
  if (itens.length === 0) return 0;
  const existentes = new Set(
    lerJsonl<T>(caminho, ehValido).itens.map((item) => idDe(item)),
  );
  const novos: T[] = [];
  for (const item of itens) {
    const id = idDe(item);
    if (existentes.has(id)) continue;
    existentes.add(id);
    novos.push(item);
  }
  anexarJsonl(caminho, novos);
  return novos.length;
}
