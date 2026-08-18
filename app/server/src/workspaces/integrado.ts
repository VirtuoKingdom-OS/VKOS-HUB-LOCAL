// Workspace integrado do pacote final. O VKOS vive ao lado de app/ e deve ser
// encontrado sem pedir que o cliente escolha uma pasta na primeira abertura.
//
// Duas origens, nesta ordem:
//
// 1. Uma pasta VKOS/ ou vkos/ na raiz. E o que o instalador monta e o que a
//    maquina do autor tem. Ela e adotada COMO ESTA, no lugar onde esta.
// 2. O modelo vkos-modelo/, que vem versionado no repositorio. Quem clona o
//    projeto publico nao tem a pasta do item 1, e antes disto travava na
//    primeira tela sem workspace nenhum pra abrir nem pra clonar.
//
// O modelo e SEMENTE, nunca workspace. Ele e copiado pra workspaces/meu-negocio
// e e a COPIA que abre. Assim o Cerebro que o dono preenche cai na pasta
// ignorada pelo git, o modelo continua intacto, e um git pull depois nao briga
// com o negocio de ninguem.

import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validarPastaVkos } from "../vkos/estado.js";
import { registrarEAtivar } from "./ativacao.js";
import { idWorkspaceAtivo, lerRegistro, workspacePorId } from "./estado.js";
import { destinoPadraoWorkspace } from "./pastas.js";

const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");
const raizPacote = resolve(pastaApp, "..");

// Nome da pasta do modelo versionado e o nome que o primeiro workspace recebe.
export const NOME_PASTA_MODELO = "vkos-modelo";
const NOME_PRIMEIRO_WORKSPACE = "Meu negócio";

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

// O modelo versionado, se ele estiver no lugar e tiver cara de VKOS.
export function localizarModeloVkos(raiz = raizPacote): string | null {
  const candidato = join(raiz, NOME_PASTA_MODELO);
  if (existsSync(candidato) && validarPastaVkos(candidato).valida) {
    return candidato;
  }
  return null;
}

// Copia o modelo pra workspaces/meu-negocio e devolve o destino. Destino que ja
// existe e devolvido sem copiar por cima: sobrescrever apagaria o Cerebro de
// quem ja comecou a preencher. node_modules fica de fora, que e peso e o
// modelo nem tem.
export function semearDoModelo(raiz = raizPacote): string | null {
  const modelo = localizarModeloVkos(raiz);
  if (!modelo) {
    return null;
  }
  const destino = destinoPadraoWorkspace(NOME_PRIMEIRO_WORKSPACE, raiz);
  if (existsSync(destino)) {
    return validarPastaVkos(destino).valida ? destino : null;
  }
  // Copia entrada por entrada em vez de mandar a pasta inteira. O filter do
  // cpSync nao vale aqui: ele nao e consultado pra pasta, entao um node_modules
  // no modelo viajaria inteiro mesmo com o filtro no lugar.
  mkdirSync(destino, { recursive: true });
  for (const entrada of readdirSync(modelo)) {
    if (entrada === "node_modules") {
      continue;
    }
    cpSync(join(modelo, entrada), join(destino, entrada), { recursive: true });
  }
  return validarPastaVkos(destino).valida ? destino : null;
}

// Preserva instalações que já têm workspace. Em pacote novo, registra e ativa
// automaticamente o VKOS que veio junto do Hub, ou semeia o primeiro workspace
// a partir do modelo versionado.
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

  const pasta = localizarVkosIntegrado() ?? semearDoModelo();
  if (!pasta) {
    return { pronto: false, pasta: null, criado: false };
  }

  registrarEAtivar(pasta, NOME_PRIMEIRO_WORKSPACE);
  return { pronto: true, pasta, criado: true };
}
