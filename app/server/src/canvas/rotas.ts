// Persistencia do layout do canvas, escopada por workspace. Montado sob /api.
// O backend NAO interpreta o conteudo: guarda o JSON opaco do frontend em
// app/dados/workspaces/<id>/canvas.json e devolve do jeito que esta. O caminho e
// resolvido POR CHAMADA: o workspace troca em runtime.

import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { FastifyPluginAsync } from "fastify";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { quarentenarOuFalhar } from "../util/quarentena.js";
import {
  garantirPastaDadosWorkspace,
  idWorkspaceAtivo,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";

// Teto de 2MB pro body do PUT, o layout do canvas nao passa disso.
const LIMITE_BODY = 2 * 1024 * 1024;

// Caminho do canvas.json do workspace ativo, ou null sem workspace ativo.
function caminhoCanvasAtivo(): string | null {
  const id = idWorkspaceAtivo();
  return id ? join(pastaDadosWorkspace(id), "canvas.json") : null;
}

// Le o canvas cru de um caminho e devolve o texto do jeito que esta no disco
// (nao reserializa: o blob e opaco e pode ser grande). Arquivo ausente devolve
// null, em silencio. Arquivo que EXISTE mas nao parseia, ou que parseia sem ser
// objeto, vai pra quarentena e devolve null.
//
// Quarentena e segue com vazio: o layout do cockpit e arrumacao de tela, o
// usuario refaz. O que nao pode acontecer e o que acontecia antes: o GET
// devolvia lixo, o frontend desistia de ler, montava um canvas vazio e o PUT
// seguinte gravava esse vazio por cima. Com a quarentena, o original ja saiu do
// caminho antes disso. Se nem a quarentena der, isso aqui lanca e o PUT nem
// chega a rodar.
//
// Exportada pra provar o comportamento com fixture temporaria.
export function lerCanvasDeArquivo(caminho: string): string | null {
  if (!existsSync(caminho)) return null;
  let bruto: string;
  let dados: unknown;
  try {
    bruto = readFileSync(caminho, "utf8");
    dados = JSON.parse(bruto);
  } catch {
    quarentenarOuFalhar(caminho, "O layout do cockpit");
    return null;
  }
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    quarentenarOuFalhar(caminho, "O layout do cockpit");
    return null;
  }
  return bruto;
}

export const rotasCanvas: FastifyPluginAsync = async (app) => {
  // Devolve o JSON gravado, ou {} se ainda nao existe nada (ou sem workspace).
  app.get("/canvas", async (_req, resposta) => {
    const caminho = caminhoCanvasAtivo();
    const bruto = caminho ? lerCanvasDeArquivo(caminho) : null;
    if (bruto !== null) {
      return resposta.type("application/json").send(bruto);
    }
    return {};
  });

  // Grava o body inteiro no canvas do workspace ativo. Nao interpreta, so persiste.
  // Sem workspace ativo, responde ok sem gravar (nao ha onde escrever).
  // Guarda de cliente: se o body traz workspaceId e ele NAO bate com o ativo, o
  // canvas veio de outro cliente (duas abas ou troca rapida). Recusa sem gravar,
  // pra o layout de um cliente nunca cair no arquivo de outro. O workspaceId
  // nunca e persistido dentro do canvas.json.
  app.put("/canvas", { bodyLimit: LIMITE_BODY }, async (req, resposta) => {
    const id = idWorkspaceAtivo();
    if (!id) {
      return { ok: true };
    }
    const corpo = (req.body ?? {}) as Record<string, unknown>;
    const { workspaceId, ...canvas } = corpo;
    if (typeof workspaceId === "string" && workspaceId !== id) {
      return resposta.status(409).send({ erro: "canvas de outro cliente, gravacao recusada" });
    }
    const caminho = join(pastaDadosWorkspace(id), "canvas.json");
    // Confere o que ja esta em disco antes de gravar por cima. Se estiver
    // corrompido, o original vai pra quarentena aqui; se nem isso der certo, o
    // lerCanvasDeArquivo lanca e a gravacao nao acontece.
    lerCanvasDeArquivo(caminho);
    garantirPastaDadosWorkspace(id);
    gravarJsonAtomico(caminho, canvas, false);
    return { ok: true };
  });
};
