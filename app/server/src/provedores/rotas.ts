// Catalogo HTTP dos provedores e modelos registrados no servidor.

import type { FastifyPluginAsync } from "fastify";

import {
  listarProvedoresRegistrados,
  obterProvedorAtivo,
} from "./index.js";

export const rotasProvedores: FastifyPluginAsync = async (app) => {
  app.get("/provedores", async () => ({
    ativo: obterProvedorAtivo().id,
    provedores: listarProvedoresRegistrados().map((provedor) => ({
      id: provedor.id,
      modelos: provedor.modelos(),
    })),
  }));
};
