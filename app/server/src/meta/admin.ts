import type { FastifyPluginAsync } from "fastify";

import { bancoDisponivel, exigirBanco } from "../plataforma/banco.js";
import { PRODUCAO } from "../plataforma/modo.js";
import { workspacePorId } from "../workspaces/estado.js";
import { coletarAgoraMeta } from "./coletor.js";
import {
  obterEstadoCredencialMeta,
  lerCredencialMeta,
  salvarCredencialMeta,
  salvarTesteCredencialMeta,
  type CredencialMeta,
} from "./credencial.js";
import {
  diagnosticarCredencialMeta,
  descobrirAtivosMeta,
  ErroGraphMeta,
} from "./graph.js";
import { lerVinculoMeta, salvarVinculoMeta, type VinculoMeta } from "./estado.js";

async function workspaceExiste(id: string): Promise<boolean> {
  if (PRODUCAO && bancoDisponivel) {
    const resultado = await exigirBanco().query(
      "SELECT 1 FROM workspaces WHERE id = $1 AND status = 'ativo'",
      [id],
    );
    return Boolean(resultado.rowCount);
  }
  return Boolean(workspacePorId(id));
}

function respostaErroMeta(erro: unknown): { status: number; mensagem: string } {
  if (erro instanceof ErroGraphMeta) {
    return { status: erro.status, mensagem: erro.message };
  }
  return {
    status: 502,
    mensagem: erro instanceof Error ? erro.message : "Falha ao consultar a Meta.",
  };
}

export const rotasAdminMeta: FastifyPluginAsync = async (app) => {
  app.get("/admin/meta/credencial", obterEstadoCredencialMeta);

  app.put("/admin/meta/credencial", async (requisicao, resposta) => {
    const corpo = requisicao.body;
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
      return resposta.code(400).send({ erro: "Credencial invalida." });
    }
    return salvarCredencialMeta(corpo as Partial<CredencialMeta>);
  });

  app.post("/admin/meta/testar", async (_requisicao, resposta) => {
    const { credencial } = await lerCredencialMeta();
    try {
      const diagnosticos = await diagnosticarCredencialMeta(credencial);
      const teste = {
        quando: new Date().toISOString(),
        ok: diagnosticos.every((item) => item.ok),
        diagnosticos,
      };
      await salvarTesteCredencialMeta(teste);
      return teste;
    } catch (erro) {
      const falha = respostaErroMeta(erro);
      const teste = {
        quando: new Date().toISOString(),
        ok: false,
        diagnosticos: [{ item: "Conexao", ok: false, mensagem: falha.mensagem }],
      };
      await salvarTesteCredencialMeta(teste);
      return resposta.code(falha.status).send({ erro: falha.mensagem, ...teste });
    }
  });

  app.get("/admin/meta/ativos", async (_requisicao, resposta) => {
    const { credencial } = await lerCredencialMeta();
    try {
      return await descobrirAtivosMeta(credencial);
    } catch (erro) {
      const falha = respostaErroMeta(erro);
      return resposta.code(falha.status).send({ erro: falha.mensagem });
    }
  });

  app.get("/admin/meta/vinculo/:workspaceId", async (requisicao, resposta) => {
    const { workspaceId } = requisicao.params as { workspaceId: string };
    if (!await workspaceExiste(workspaceId)) {
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    }
    return { vinculo: lerVinculoMeta(workspaceId) };
  });

  app.put("/admin/meta/vinculo/:workspaceId", async (requisicao, resposta) => {
    const { workspaceId } = requisicao.params as { workspaceId: string };
    if (!await workspaceExiste(workspaceId)) {
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    }
    const corpo = requisicao.body;
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
      return resposta.code(400).send({ erro: "Vinculo invalido." });
    }
    return { vinculo: salvarVinculoMeta(workspaceId, corpo as VinculoMeta) };
  });

  app.post("/admin/meta/coletar/:workspaceId", async (requisicao, resposta) => {
    const { workspaceId } = requisicao.params as { workspaceId: string };
    if (!await workspaceExiste(workspaceId)) {
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    }
    try {
      await coletarAgoraMeta(workspaceId);
      return { ok: true, vinculo: lerVinculoMeta(workspaceId) };
    } catch (erro) {
      const status = Number((erro as { statusCode?: unknown })?.statusCode) || 502;
      return resposta.code(status).send({
        erro: erro instanceof Error ? erro.message : "Falha na coleta da Meta.",
      });
    }
  });
};
