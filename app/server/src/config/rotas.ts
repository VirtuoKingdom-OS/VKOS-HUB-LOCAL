// Rotas HTTP da config global do app.

import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";

import { listarProvedoresRegistrados } from "../provedores/index.js";

import {
  definirModeloPadraoClaude,
  definirModeloPadraoCodex,
  definirModoEnxuto,
  definirProvedorPadrao,
  ehProvedorValido,
  obterConfigApp,
} from "./estado.js";
import type { ModeloApp } from "./estado.js";

interface CorpoConfig {
  // Alias legado do modelo Claude.
  modeloPadrao?: unknown;
  provedorPadrao?: unknown;
  modeloPadraoClaude?: unknown;
  modeloPadraoCodex?: unknown;
  modoEnxuto?: unknown;
}

function modelosDoProvedor(id: "claude" | "codex"): string[] {
  return (
    listarProvedoresRegistrados()
      .find((provedor) => provedor.id === id)
      ?.modelos()
      .map((modelo) => modelo.alias) ?? []
  );
}

function ehAliasDaLista(valor: unknown, aliases: string[]): valor is string {
  return typeof valor === "string" && aliases.includes(valor);
}

function respostaConfig() {
  const config = obterConfigApp();
  const modelosClaude = modelosDoProvedor("claude");
  const modelosCodex = modelosDoProvedor("codex");
  const modeloPadraoClaude = modelosClaude.includes(config.modeloPadraoClaude)
    ? config.modeloPadraoClaude
    : modelosClaude[0] ?? config.modeloPadraoClaude;
  const modeloPadraoCodex = modelosCodex.includes(config.modeloPadraoCodex)
    ? config.modeloPadraoCodex
    : modelosCodex[0] ?? config.modeloPadraoCodex;
  return {
    ...config,
    modeloPadraoClaude,
    modeloPadraoCodex,
    // Mantem o frontend atual funcionando durante a migracao.
    modeloPadrao: modeloPadraoClaude,
  };
}

async function atualizar(
  requisicao: FastifyRequest,
  resposta: FastifyReply,
) {
  const corpo = (requisicao.body ?? {}) as CorpoConfig;
  const modeloClaude =
    corpo.modeloPadraoClaude !== undefined
      ? corpo.modeloPadraoClaude
      : corpo.modeloPadrao;
  const modelosClaude = modelosDoProvedor("claude");
  const modelosCodex = modelosDoProvedor("codex");

  if (corpo.provedorPadrao !== undefined && !ehProvedorValido(corpo.provedorPadrao)) {
    return resposta
      .code(400)
      .send({ erro: "provedor invalido. Use claude ou codex." });
  }
  if (
    corpo.provedorPadrao !== undefined &&
    !listarProvedoresRegistrados().some(
      (provedor) => provedor.id === corpo.provedorPadrao,
    )
  ) {
    return resposta
      .code(400)
      .send({ erro: "provedor ainda nao esta disponivel nesta versao." });
  }
  if (modeloClaude !== undefined && !ehAliasDaLista(modeloClaude, modelosClaude)) {
    return resposta
      .code(400)
      .send({ erro: `modelo Claude invalido. Use: ${modelosClaude.join(", ")}.` });
  }
  if (
    corpo.modeloPadraoCodex !== undefined &&
    !ehAliasDaLista(corpo.modeloPadraoCodex, modelosCodex)
  ) {
    return resposta
      .code(400)
      .send({ erro: `modelo Codex invalido. Use: ${modelosCodex.join(", ")}.` });
  }
  if (corpo.modoEnxuto !== undefined && typeof corpo.modoEnxuto !== "boolean") {
    return resposta
      .code(400)
      .send({ erro: "modoEnxuto invalido. Use true ou false." });
  }

  if (corpo.provedorPadrao !== undefined) {
    definirProvedorPadrao(corpo.provedorPadrao);
  }
  if (modeloClaude !== undefined) {
    definirModeloPadraoClaude(modeloClaude as ModeloApp);
  }
  if (corpo.modeloPadraoCodex !== undefined) {
    definirModeloPadraoCodex(corpo.modeloPadraoCodex);
  }
  if (typeof corpo.modoEnxuto === "boolean") {
    definirModoEnxuto(corpo.modoEnxuto);
  }

  return respostaConfig();
}

export const rotasConfig: FastifyPluginAsync = async (app) => {
  app.get("/config", async () => respostaConfig());

  // PATCH continua aceito pelos clientes atuais. PUT e o contrato novo.
  app.patch("/config", atualizar);
  app.put("/config", atualizar);
};
