// Persistencia do layout do canvas, escopada por workspace. Montado sob /api.
// O backend NAO interpreta o conteudo: guarda o JSON opaco do frontend em
// app/dados/workspaces/<id>/canvas.json e devolve do jeito que esta. O caminho e
// resolvido POR CHAMADA: o workspace troca em runtime.

import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { FastifyPluginAsync } from "fastify";

import { gravarJsonAtomico } from "../util/gravarJson.js";
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

export const rotasCanvas: FastifyPluginAsync = async (app) => {
  // Devolve o JSON gravado, ou {} se ainda nao existe nada (ou sem workspace).
  app.get("/canvas", async (_req, resposta) => {
    try {
      const caminho = caminhoCanvasAtivo();
      if (caminho && existsSync(caminho)) {
        const bruto = readFileSync(caminho, "utf8");
        return resposta.type("application/json").send(bruto);
      }
    } catch {
      // Arquivo ilegivel: devolve vazio em vez de quebrar.
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
    garantirPastaDadosWorkspace(id);
    gravarJsonAtomico(join(pastaDadosWorkspace(id), "canvas.json"), canvas, false);
    return { ok: true };
  });
};
