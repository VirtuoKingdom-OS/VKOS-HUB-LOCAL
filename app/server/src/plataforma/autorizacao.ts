import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { CATALOGO_FEATURES } from "../features/catalogo.js";
import { banco, bancoDisponivel } from "./banco.js";
import { armazenamentoRequisicao, type ContextoRequisicao } from "./contexto.js";
import { COOKIE_SESSAO, hashToken, ID_OPERADOR_LOCAL } from "./identidade.js";
import { MODO, PRODUCAO } from "./modo.js";

function contextoOperadorLocal(): ContextoRequisicao {
  return {
    usuario: {
      id: ID_OPERADOR_LOCAL,
      email: "local@vkos.internal",
      papel: "operador",
    },
    workspaceId: null,
    workspacePasta: null,
    features: new Set(CATALOGO_FEATURES.map((feature) => feature.id)),
  };
}

const PUBLICAS = ["/api/auth/", "/api/saude"];
const ROTAS_FEATURES = CATALOGO_FEATURES.flatMap((feature) =>
  feature.rotasApi.map((prefixo) => ({ prefixo, featureId: feature.id })),
).sort((a, b) => b.prefixo.length - a.prefixo.length);

function pertenceAoPrefixo(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

export function featureDaRota(caminho: string): string | null {
  return ROTAS_FEATURES.find(({ prefixo }) =>
    pertenceAoPrefixo(caminho, prefixo)
  )?.featureId ?? null;
}

export function clientePodeAcessarRota(
  caminho: string,
  features: ReadonlySet<string>,
): boolean {
  const feature = featureDaRota(caminho);
  return feature === null || features.has(feature);
}

async function resolverContexto(requisicao: FastifyRequest): Promise<ContextoRequisicao> {
  if (MODO === "core" && !PRODUCAO) return contextoOperadorLocal();
  if (!banco) return { usuario: null, workspaceId: null, workspacePasta: null, features: new Set() };
  const token = requisicao.cookies[COOKIE_SESSAO];
  if (!token) return { usuario: null, workspaceId: null, workspacePasta: null, features: new Set() };
  const sessao = await banco.query(
    `SELECT s.usuario_id, s.workspace_id, u.email, u.papel, u.status
       FROM sessoes_web s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = $1 AND s.modo = $2 AND s.expira_em > now()`,
    [hashToken(token), MODO],
  );
  if (!sessao.rowCount || sessao.rows[0].status !== "ativo") return { usuario: null, workspaceId: null, workspacePasta: null, features: new Set() };
  const linha = sessao.rows[0];
  const solicitado = typeof requisicao.headers["x-workspace-id"] === "string" ? requisicao.headers["x-workspace-id"] : linha.workspace_id;
  let workspaceId: string | null = solicitado ?? null;
  let workspacePasta: string | null = null;
  if (workspaceId && linha.papel === "cliente") {
    const membro = await banco.query("SELECT w.pasta FROM membros_workspace m JOIN workspaces w ON w.id = m.workspace_id WHERE m.usuario_id = $1 AND m.workspace_id = $2 AND w.status = 'ativo'", [linha.usuario_id, workspaceId]);
    if (!membro.rowCount) workspaceId = null;
    else workspacePasta = membro.rows[0].pasta;
  } else if (workspaceId) {
    const workspace = await banco.query("SELECT pasta FROM workspaces WHERE id = $1", [workspaceId]);
    workspacePasta = workspace.rows[0]?.pasta ?? null;
  }
  const features = new Set<string>();
  if (linha.papel === "operador") {
    for (const feature of CATALOGO_FEATURES) features.add(feature.id);
  } else if (workspaceId) {
    const resultado = await banco.query(
      "SELECT fw.feature_id FROM features_workspace fw JOIN workspaces w ON w.id = fw.workspace_id WHERE fw.workspace_id = $1 AND fw.ativa = true AND w.status = 'ativo'",
      [workspaceId],
    );
    const permitidas = new Set(
      CATALOGO_FEATURES.filter((feature) => feature.disponivelParaCliente).map(
        (feature) => feature.id,
      ),
    );
    for (const item of resultado.rows) {
      if (permitidas.has(item.feature_id)) features.add(item.feature_id);
    }
  }
  const duracao = MODO === "core" ? "12 hours" : "7 days";
  await banco.query(`UPDATE sessoes_web SET ultimo_uso = now(), expira_em = now() + interval '${duracao}' WHERE token_hash = $1`, [hashToken(token)]);
  return { usuario: { id: linha.usuario_id, email: linha.email, papel: linha.papel }, workspaceId, workspacePasta, features };
}

function negar(requisicao: FastifyRequest, resposta: FastifyReply, contexto: ContextoRequisicao) {
  const caminho = requisicao.url.split("?")[0];
  if (caminho === "/ws" && !contexto.usuario) return resposta.code(401).send({ erro: "autenticacao necessaria" });
  if (["/pecas/", "/pecas-html/", "/pecas-edicao/"].some((prefixo) => caminho.startsWith(prefixo)) && !contexto.usuario) {
    return resposta.code(401).send({ erro: "autenticacao necessaria" });
  }
  if (!caminho.startsWith("/api/") || PUBLICAS.some((prefixo) => caminho.startsWith(prefixo))) return;
  if (!contexto.usuario) return resposta.code(401).send({ erro: "autenticacao necessaria" });
  if (caminho.startsWith("/api/admin") && contexto.usuario.papel !== "operador") return resposta.code(404).send({ erro: "rota nao encontrada" });
  const feature = featureDaRota(caminho);
  if (
    contexto.usuario.papel === "cliente"
    && !clientePodeAcessarRota(caminho, contexto.features)
  ) {
    return resposta.code(404).send({ erro: "rota nao encontrada" });
  }
  if (contexto.usuario.papel === "cliente" && feature && !contexto.workspaceId) {
    return resposta.code(401).send({ erro: "workspace nao autorizado" });
  }
}

export function autenticacaoObrigatoria(): boolean {
  return MODO === "hub" || PRODUCAO;
}

export function configurarAutorizacao(app: FastifyInstance): void {
  app.addHook("onRequest", (requisicao, resposta, pronto) => {
    resolverContexto(requisicao).then((contexto) => {
      armazenamentoRequisicao.run(contexto, () => {
        const bloqueio = autenticacaoObrigatoria() ? negar(requisicao, resposta, contexto) : undefined;
        if (!bloqueio) pronto();
      });
    }).catch(pronto);
  });
}
