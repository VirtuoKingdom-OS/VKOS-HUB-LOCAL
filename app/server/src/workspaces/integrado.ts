// Workspace integrado do pacote final. O VKOS vive ao lado de app/ e deve ser
// encontrado sem pedir que o cliente escolha uma pasta na primeira abertura.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validarPastaVkos } from "../vkos/estado.js";
import { registrarEAtivar } from "./ativacao.js";
import { idWorkspaceAtivo, lerRegistro, workspacePorId } from "./estado.js";

const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");
const raizPacote = resolve(pastaApp, "..");

export interface ResultadoWorkspaceIntegrado {
  pronto: boolean;
  pasta: string | null;
  criado: boolean;
}

// Aceita VKOS no pacote final e vkos no ambiente de desenvolvimento.
export function localizarVkosIntegrado(raiz = raizPacote): string | null {
  for (const nome of ["VKOS", "vkos"]) {
    const candidato = join(raiz, nome);
    if (existsSync(candidato) && validarPastaVkos(candidato).valida) {
      return candidato;
    }
  }
  return null;
}

// Preserva instalações que já têm workspace. Em pacote novo, registra e ativa
// automaticamente o VKOS que veio junto do Hub.
export function garantirWorkspaceIntegrado(): ResultadoWorkspaceIntegrado {
  const ativo = idWorkspaceAtivo();
  if (ativo) {
    return {
      pronto: true,
      pasta: workspacePorId(ativo)?.pasta ?? null,
      criado: false,
    };
  }

  const registro = lerRegistro();
  const existente = registro.workspaces[0];
  if (existente) {
    registrarEAtivar(existente.pasta, existente.nome);
    return { pronto: true, pasta: existente.pasta, criado: false };
  }

  const pasta = localizarVkosIntegrado();
  if (!pasta) {
    return { pronto: false, pasta: null, criado: false };
  }

  registrarEAtivar(pasta, "Meu negócio");
  return { pronto: true, pasta, criado: true };
}
