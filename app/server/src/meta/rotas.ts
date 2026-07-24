import type { FastifyPluginAsync } from "fastify";

import { contextoAtual } from "../plataforma/contexto.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import {
  lerJsonMeta,
  lerJsonlMeta,
  lerVinculoMeta,
} from "./estado.js";

function workspaceAtual(): string {
  const id = contextoAtual()?.workspaceId ?? idWorkspaceAtivo();
  if (!id) {
    const erro = new Error("Nenhum workspace ativo.");
    Object.assign(erro, { statusCode: 400 });
    throw erro;
  }
  return id;
}

export const rotasMeta: FastifyPluginAsync = async (app) => {
  app.get("/meta/estado", async () => {
    const vinculo = lerVinculoMeta(workspaceAtual());
    return {
      vinculo,
      produtos: {
        instagram: Boolean(vinculo.instagramId),
        anuncios: Boolean(vinculo.contaAnunciosId),
        facebook: Boolean(vinculo.paginaId),
      },
    };
  });

  app.get("/meta/instagram", async () => {
    const id = workspaceAtual();
    return {
      serie: lerJsonlMeta(id, "instagram-perfil.jsonl"),
      publicacoes: lerJsonMeta(id, "instagram-publicacoes.json", []),
    };
  });

  app.get("/meta/anuncios", async () => ({
    serie: lerJsonlMeta(workspaceAtual(), "anuncios.jsonl"),
  }));

  app.get("/meta/facebook", async () => {
    const id = workspaceAtual();
    return {
      serie: lerJsonlMeta(id, "facebook.jsonl"),
      publicacoes: lerJsonMeta(id, "facebook-publicacoes.json", []),
    };
  });
};
