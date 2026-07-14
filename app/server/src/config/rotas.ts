// Rotas HTTP da config do app. Caminhos sem /api: o prefixo e aplicado por quem
// registra o plugin (index.ts). Segue o CONTRATO.md a risca.

import type { FastifyPluginAsync } from "fastify";

import { ehModeloValido, obterModeloPadrao, definirModeloPadrao } from "./estado.js";

export const rotasConfig: FastifyPluginAsync = async (app) => {
  // Estado atual da config.
  app.get("/config", async () => {
    return { modeloPadrao: obterModeloPadrao() };
  });

  // Atualiza o modelo padrao. Valida o valor e persiste.
  app.patch("/config", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as { modeloPadrao?: unknown };

    if (corpo.modeloPadrao !== undefined) {
      if (!ehModeloValido(corpo.modeloPadrao)) {
        return resposta.code(400).send({ erro: "modelo invalido. Use opus, sonnet ou haiku." });
      }
      definirModeloPadrao(corpo.modeloPadrao);
    }

    return { modeloPadrao: obterModeloPadrao() };
  });
};
