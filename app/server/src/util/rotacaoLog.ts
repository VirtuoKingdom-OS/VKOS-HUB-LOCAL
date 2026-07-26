// Rotacao preguicosa compartilhada pros logs jsonl por workspace. Cada chamador
// cria a sua com um rotulo proprio pro log de erro; o contador de gravacoes vive
// dentro do fechamento, isolado por chamador.

import { readFileSync } from "node:fs";

import { gravarTextoAtomico } from "./gravarJson.js";

const TETO_LINHAS = 2000;
const MANTER_LINHAS = 1000;
const CHECAR_A_CADA = 50;

// Devolve uma funcao que so checa o tamanho a cada CHECAR_A_CADA gravacoes
// daquele workspace. Acima do teto, reescreve o arquivo com as ultimas
// MANTER_LINHAS. Falha nunca derruba quem chama: log honesto e segue.
export function criarRotacaoLog(
  rotulo: string,
): (workspaceId: string, caminho: string) => void {
  const gravacoesPorWorkspace = new Map<string, number>();
  return function talvezRotacionar(workspaceId: string, caminho: string): void {
    const n = (gravacoesPorWorkspace.get(workspaceId) ?? 0) + 1;
    gravacoesPorWorkspace.set(workspaceId, n);
    if (n % CHECAR_A_CADA !== 0) return;
    try {
      const bruto = readFileSync(caminho, "utf8");
      const linhas = bruto.split("\n").filter((l) => l.length > 0);
      if (linhas.length <= TETO_LINHAS) return;
      const mantidas = linhas.slice(linhas.length - MANTER_LINHAS);
      gravarTextoAtomico(caminho, mantidas.join("\n") + "\n");
    } catch (erro) {
      console.error(
        `[${rotulo}] falha ao rotacionar log do workspace ${workspaceId}:`,
        erro,
      );
    }
  };
}
