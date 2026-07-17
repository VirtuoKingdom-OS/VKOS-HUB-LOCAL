// Rotas HTTP dos workspaces. Montado sob /api pelo index.ts.
// Gerencia o registro de clientes: listar, criar, ativar, renomear, remover e
// criar cliente novo por clonagem.

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { validarPastaVkos } from "../vkos/estado.js";
import { gerenciador } from "../sessoes/gerenciador.js";
import { invalidarCacheContextos } from "../contextos/armazenamento.js";
import { lerConexoes } from "../conexoes/estado.js";
import { ID_CONEXAO_GOOGLE, revogarToken } from "../google/oauth.js";
import { ativarPorId, registrarEAtivar } from "./ativacao.js";
import { criarWorkspaceNovo, ErroWorkspace } from "./clonagem.js";
import {
  apagarPastaDadosWorkspace,
  idWorkspaceAtivo,
  lerRegistro,
  renomearWorkspace,
  removerWorkspaceRegistro,
  workspacePorId,
  workspacePorPasta,
} from "./estado.js";

// Best effort: revoga o refresh token do Google desse workspace antes de apagar a
// pasta de dados. Falhou (offline, token ja invalido, conexoes ilegivel): loga e
// segue, a exclusao nunca trava por causa do Google.
async function revogarGoogleDoWorkspace(id: string): Promise<void> {
  try {
    const config = lerConexoes(id).servidores[ID_CONEXAO_GOOGLE]?.config ?? {};
    const refreshToken = typeof config.refreshToken === "string" ? config.refreshToken.trim() : "";
    if (refreshToken) await revogarToken(refreshToken);
  } catch (erro) {
    console.error(`[workspaces] falha ao revogar o Google do workspace ${id}:`, erro);
  }
}

export const rotasWorkspaces: FastifyPluginAsync = async (app) => {
  // Registro inteiro: { workspaces, ativo }.
  app.get("/workspaces", async () => {
    return lerRegistro();
  });

  // Registra uma pasta VKOS existente como workspace e ativa.
  app.post("/workspaces", async (req: FastifyRequest, resposta: FastifyReply) => {
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
    const registro = ativarPorId(id);
    if (!registro) {
      return resposta.status(404).send({ erro: "Workspace nao encontrado." });
    }
    return { workspace: workspacePorId(id), ...registro };
  });

  // Renomeia um workspace.
  app.patch("/workspaces/:id", async (req: FastifyRequest, resposta: FastifyReply) => {
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

  // Remove um workspace. Apaga a pasta de dados do hub (segredos e PII) e revoga o
  // Google (best effort); a pasta VKOS do cliente fica INTACTA. 400 se ativo.
  app.delete("/workspaces/:id", async (req: FastifyRequest, resposta: FastifyReply) => {
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
    // Revoga o Google (le o token antes de apagar a pasta) e apaga os dados do hub
    // desse workspace: conexoes.json (segredos), crm.json (PII), calendario, logs.
    await revogarGoogleDoWorkspace(id);
    apagarPastaDadosWorkspace(id);
    removerWorkspaceRegistro(id);
    return lerRegistro();
  });
};
