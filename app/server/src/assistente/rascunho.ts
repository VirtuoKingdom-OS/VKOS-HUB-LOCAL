import { existsSync, readdirSync, readFileSync, statSync, mkdtempSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

import { LotePropostaSchema, descreverErroDeTarefa, type LoteProposta } from "./tarefa.js";

export function criarPastaRascunho(conversaId: string): string {
  const segura = conversaId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return mkdtempSync(join(tmpdir(), `vkos-assistente-${segura}-`));
}

function listarArquivos(pasta: string, acumulado: string[] = []): string[] {
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) listarArquivos(caminho, acumulado);
    else if (entrada.isFile()) acumulado.push(relative(pasta, caminho));
  }
  return acumulado;
}

export function lerLoteDoRascunho(pasta: string): LoteProposta | null {
  const caminho = join(pasta, "lote.json");
  if (!existsSync(caminho)) return null;
  const arquivos = listarArquivos(pasta);
  if (arquivos.some((arquivo) => arquivo !== "lote.json")) {
    throw new Error("O assistente só pode escrever lote.json no diretório temporário.");
  }
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    throw new Error("lote.json não é um JSON válido.");
  }
  const resultado = LotePropostaSchema.safeParse(bruto);
  if (!resultado.success) throw new Error(descreverErroDeTarefa(resultado.error));
  return resultado.data;
}

export function pastaRascunhoExiste(pasta: string): boolean {
  try {
    return statSync(pasta).isDirectory();
  } catch {
    return false;
  }
}
