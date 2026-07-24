// Rotas HTTP dos workspaces. Montado sob /api pelo index.ts.
// Gerencia o registro de clientes: listar, criar, ativar, renomear, remover e
// criar cliente novo por clonagem.

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { validarPastaVkos } from "../vkos/estado.js";
import { gerenciador } from "../sessoes/gerenciador.js";
import { invalidarCacheContextos } from "../contextos/armazenamento.js";
import { ativarPorId, registrarEAtivar } from "./ativacao.js";
import { criarWorkspaceNovo, ErroWorkspace } from "./clonagem.js";
import {
  apagarPastaDadosWorkspace,
  garantirWorkspaceOculto,
  idWorkspaceAtivo,
  lerRegistro,
  renomearWorkspace,
  removerWorkspaceRegistro,
  workspacePorId,
  workspacePorPasta,
} from "./estado.js";
import { existsSync } from "node:fs";
import { pastaDoWorkspace } from "../plataforma/provisionamento.js";
import { MODO } from "../plataforma/modo.js";
import { contextoAtual } from "../plataforma/contexto.js";
import { exigirBanco } from "../plataforma/banco.js";
import { COOKIE_SESSAO, hashToken } from "../plataforma/identidade.js";

// Ativa no CORE um workspace de cliente que so existe no banco. Registra a
// pasta materializada (dados/clientes/<id>) como entrada oculta com o MESMO id
// do banco e ativa. Devolve null se o banco nao responde, o id nao existe ou a
// pasta nao foi materializada.
async function ativarClienteDoBanco(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const resultado = await exigirBanco().query(
      "SELECT id, nome FROM workspaces WHERE id = $1",
      [id],
    );
    if (!resultado.rowCount) return null;
    const pasta = pastaDoWorkspace(id);
    if (!existsSync(pasta)) return null;
    garantirWorkspaceOculto(id, resultado.rows[0].nome, pasta);
    return ativarPorId(id);
  } catch {
    return null;
  }
}

export const rotasWorkspaces: FastifyPluginAsync = async (app) => {
  // Registro inteiro: { workspaces, ativo }.
  app.get("/workspaces", async () => {
    if (MODO === "hub") {
      const contexto = contextoAtual();
      const resultado = await exigirBanco().query(
        `SELECT w.id, w.nome, w.pasta, w.criado_em
           FROM workspaces w JOIN membros_workspace m ON m.workspace_id = w.id
          WHERE m.usuario_id = $1 AND w.status = 'ativo' ORDER BY w.nome`,
        [contexto?.usuario?.id],
      );
      return {
        workspaces: resultado.rows.map((item) => ({ id: item.id, nome: item.nome, pasta: "", criadoEm: item.criado_em, ultimoUso: item.criado_em })),
        ativo: contexto?.workspaceId ?? null,
      };
    }
    return lerRegistro();
  });

  // Registra uma pasta VKOS existente como workspace e ativa.
  app.post("/workspaces", async (req: FastifyRequest, resposta: FastifyReply) => {
    if (MODO === "hub") return resposta.status(404).send({ erro: "rota nao encontrada" });
    const corpo = (req.body ?? {}) as { pasta?: unknown; nome?: unknown };
    const pasta = typeof corpo.pasta === "string" ? corpo.pasta.trim() : "";
    const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : undefined;

    const validacao = validarPastaVkos(pasta);
    if (!validacao.valida) {
      return resposta.status(400).send({ erro: validacao.motivo });
    }
    if (workspacePorPasta(pasta)) {
      return resposta.status(400).send({ erro: "Essa pasta ja esta registrada como workspace." });
    }

    registrarEAtivar(pasta, nome);
    // Devolve o workspace alvo explicito alem do registro, pro frontend nao ter
    // que adivinhar qual foi criado/ativado.
    return { workspace: workspacePorPasta(pasta), ...lerRegistro() };
  });

  // Cria um cliente novo clonando a estrutura do ativo.
  app.post("/workspaces/novo", async (req: FastifyRequest, resposta: FastifyReply) => {
    if (MODO === "hub") return resposta.status(404).send({ erro: "rota nao encontrada" });
    const corpo = (req.body ?? {}) as { nome?: unknown; pastaDestino?: unknown };
    const nome = typeof corpo.nome === "string" ? corpo.nome : "";
    const pastaDestino = typeof corpo.pastaDestino === "string" ? corpo.pastaDestino.trim() : "";
    try {
      const { registro, avisos, workspace } = criarWorkspaceNovo({ nome, pastaDestino });
      return { workspace, ...registro, avisos };
    } catch (erro) {
      if (erro instanceof ErroWorkspace) {
        return resposta.status(erro.status).send({ erro: erro.message });
      }
      throw erro;
    }
  });

  // Ativa um workspace ja registrado.
  app.post("/workspaces/:id/ativar", async (req: FastifyRequest, resposta: FastifyReply) => {
    const { id } = req.params as { id: string };
    if (MODO === "hub") {
      const contexto = contextoAtual();
      const membro = await exigirBanco().query("SELECT 1 FROM membros_workspace WHERE usuario_id = $1 AND workspace_id = $2", [contexto?.usuario?.id, id]);
      const token = req.cookies[COOKIE_SESSAO];
      if (!membro.rowCount || !token) return resposta.status(404).send({ erro: "Workspace nao encontrado." });
      await exigirBanco().query("UPDATE sessoes_web SET workspace_id = $1 WHERE token_hash = $2", [id, hashToken(token)]);
      const registro = await exigirBanco().query("SELECT id, nome, pasta, criado_em FROM workspaces WHERE id = $1", [id]);
      const item = registro.rows[0];
      const workspace = { id: item.id, nome: item.nome, pasta: "", criadoEm: item.criado_em, ultimoUso: new Date().toISOString() };
      return { workspace, workspaces: [workspace], ativo: id };
    }
    let registro = ativarPorId(id);
    if (!registro) {
      // Fallback do CORE: o id pode ser um workspace de cliente do banco, que
      // nao vive no registro local. Se a pasta materializada existe, entra no
      // registro como entrada oculta (fora do Estudio) e ativa. Sem isso, a
      // entrada em /w/<id> abria o workspace anterior por engano.
      registro = await ativarClienteDoBanco(id);
    }
    if (!registro) {
      return resposta.status(404).send({ erro: "Workspace nao encontrado." });
    }
    return { workspace: workspacePorId(id), ...registro };
  });

  // Renomeia um workspace.
  app.patch("/workspaces/:id", async (req: FastifyRequest, resposta: FastifyReply) => {
    if (MODO === "hub") return resposta.status(404).send({ erro: "rota nao encontrada" });
    const { id } = req.params as { id: string };
    const corpo = (req.body ?? {}) as { nome?: unknown };
    const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
    if (!nome) {
      return resposta.status(400).send({ erro: "Informe o novo nome." });
    }
    const workspace = renomearWorkspace(id, nome);
    if (!workspace) {
      return resposta.status(404).send({ erro: "Workspace nao encontrado." });
    }
    return { workspace, ...lerRegistro() };
  });

  // Remove um workspace. Apaga a pasta de dados do hub (PII); a pasta VKOS do
  // cliente fica INTACTA. 400 se ativo. As conexoes agora sao centrais do CORE
  // (app/dados/conexoes.json), entao remover um workspace nao revoga o Google.
  app.delete("/workspaces/:id", async (req: FastifyRequest, resposta: FastifyReply) => {
    if (MODO === "hub") return resposta.status(404).send({ erro: "rota nao encontrada" });
    const { id } = req.params as { id: string };
    if (!workspacePorId(id)) {
      return resposta.status(404).send({ erro: "Workspace nao encontrado." });
    }
    if (id === idWorkspaceAtivo()) {
      return resposta.status(400).send({ erro: "Nao da pra remover o workspace ativo." });
    }
    // Para e remove do gerenciador todas as sessoes desse workspace antes de tirar
    // do registro. Sem isso um processo claude ficaria rodando invisivel.
    for (const sessao of gerenciador.listar(id)) {
      gerenciador.remover(sessao.id);
    }
    // Descarta o cache do indice de contextos desse workspace.
    invalidarCacheContextos(id);
    // Apaga os dados do hub desse workspace: crm.json (PII), calendario, logs e
    // eventuais conexoes.json legados de antes da centralizacao.
    apagarPastaDadosWorkspace(id);
    removerWorkspaceRegistro(id);
    return lerRegistro();
  });
};
