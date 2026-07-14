// Escrita atomica de arquivos de estado. Mesmo padrao do Cerebro: grava num .tmp
// no MESMO diretorio do alvo e renomeia por cima. Um encerramento no meio da
// escrita deixa o .tmp pela metade, nunca o arquivo real truncado, entao o leitor
// nunca ve o estado vazio por gravacao interrompida.

import { existsSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// Grava texto de forma atomica: escreve no .tmp e renomeia por cima do alvo.
// No Windows o rename por cima de arquivo existente pode falhar: nesse caso
// remove o alvo e tenta de novo. So limpa o .tmp e propaga o erro se nem assim.
export function gravarTextoAtomico(caminho: string, texto: string): void {
  const tmp = join(dirname(caminho), `.${basename(caminho)}-${process.pid}-${Date.now()}.tmp`);
  writeFileSync(tmp, texto, "utf8");
  try {
    renameSync(tmp, caminho);
  } catch {
    try {
      if (existsSync(caminho)) unlinkSync(caminho);
      renameSync(tmp, caminho);
    } catch (erro) {
      try {
        if (existsSync(tmp)) unlinkSync(tmp);
      } catch {
        // Limpeza do parcial e defensiva: nao mascara o erro real.
      }
      throw erro;
    }
  }
}

// Grava JSON de forma atomica. Indentado por padrao (arquivos de estado legiveis);
// passe indentar=false pra blobs opacos grandes, como o canvas.
export function gravarJsonAtomico(caminho: string, dados: unknown, indentar = true): void {
  const texto = indentar ? JSON.stringify(dados, null, 2) : JSON.stringify(dados);
  gravarTextoAtomico(caminho, texto);
}
