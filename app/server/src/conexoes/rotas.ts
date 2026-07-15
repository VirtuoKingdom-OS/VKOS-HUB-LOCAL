// Rotas HTTP das conexoes MCP. Caminhos sem /api: o prefixo e aplicado por quem
// registra o plugin (index.ts). Segredos sempre mascarados na resposta: so os 4
// ultimos caracteres ficam visiveis. O caminho de estado e resolvido POR CHAMADA
// (workspace ativo), que troca em runtime.

import type { FastifyPluginAsync } from "fastify";

import { idWorkspaceAtivo } from "../workspaces/estado.js";
import { desconectar, iniciarConexao, ErroOAuth } from "../google/oauth.js";
import { catalogoPublico, entradaCatalogo, listaCatalogo } from "./catalogo.js";
import { lerConexoes, salvarConexoes, type EstadoServidor } from "./estado.js";

// Mascara um segredo: mostra so os 4 ultimos caracteres, o resto vira asteriscos.
// Deterministica: o mesmo segredo sempre gera a mesma mascara, entao o front pode
// devolver a mascara igual pra sinalizar "nao troca o segredo salvo".
function mascarar(valor: string): string {
  if (!valor) return "";
  if (valor.length <= 4) return "*".repeat(valor.length);
  const estrelas = Math.min(valor.length - 4, 12);
  return "*".repeat(estrelas) + valor.slice(-4);
}

// Estado de um servidor com os segredos mascarados, no shape que o front espera.
function estadoMascarado(id: string, servidor: EstadoServidor | undefined) {
  const entrada = entradaCatalogo(id);
  const bruto = servidor?.config ?? {};
  const config: Record<string, string> = {};
  if (entrada) {
    for (const campo of entrada.campos) {
      const valor = bruto[campo.chave] ?? "";
      config[campo.chave] = campo.segredo ? mascarar(valor) : valor;
    }
  } else {
    for (const [chave, valor] of Object.entries(bruto)) {
      config[chave] = mascarar(valor);
    }
  }
  // O contaEmail nao e segredo (o proprio usuario ve qual conta conectou) e nao e
  // um campo do catalogo, entao vai legivel pro front saber o estado da conexao
  // OAuth (Google Calendar). O conectado sinaliza a presenca do refresh token sem
  // vazar o token. Campos so preenchidos quando existem no bruto.
  const contaEmail = (bruto.contaEmail ?? "").trim();
  const conectado = (bruto.refreshToken ?? "").trim().length > 0;
  return {
    habilitado: servidor?.habilitado ?? false,
    config,
    ...(contaEmail ? { contaEmail } : {}),
    conectado,
  };
}

export const rotasConexoes: FastifyPluginAsync = async (app) => {
  // Catalogo fixo mais o estado do workspace ativo, com os segredos mascarados.
  app.get("/conexoes", async () => {
    const id = idWorkspaceAtivo();
    const estado = id ? lerConexoes(id) : { servidores: {} };
    const servidores: Record<string, ReturnType<typeof estadoMascarado>> = {};
    for (const entrada of listaCatalogo()) {
      servidores[entrada.id] = estadoMascarado(entrada.id, estado.servidores[entrada.id]);
    }
    return { catalogo: catalogoPublico(), estado: { servidores } };
  });

  // Liga ou desliga um servidor e mescla a config. Um campo de segredo recebido
  // igual ao valor mascarado nao sobrescreve o segredo salvo (o front devolve a
  // mascara quando o usuario nao mexeu no token).
  app.put("/conexoes/:id", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };

    const entrada = entradaCatalogo(id);
    if (!entrada) {
      return resposta.status(404).send({ erro: "conexao desconhecida" });
    }
    if (!entrada.disponivel) {
      return resposta.status(400).send({ erro: "conexao ainda indisponivel" });
    }

    const workspaceId = idWorkspaceAtivo();
    if (!workspaceId) {
      return resposta.status(400).send({ erro: "nenhum cliente ativo" });
    }

    const corpo = (requisicao.body ?? {}) as { habilitado?: unknown; config?: unknown };
    if (typeof corpo.habilitado !== "boolean") {
      return resposta.status(400).send({ erro: "habilitado precisa ser booleano" });
    }

    const estado = lerConexoes(workspaceId);
    const atual = estado.servidores[id] ?? { habilitado: false, config: {} };
    const mesclada: Record<string, string> = { ...atual.config };

    if (corpo.config && typeof corpo.config === "object") {
      const recebida = corpo.config as Record<string, unknown>;
      for (const campo of entrada.campos) {
        const valor = recebida[campo.chave];
        if (typeof valor !== "string") continue;
        // Segredo devolvido mascarado, igual ao que saiu no GET: mantem o salvo.
        if (campo.segredo && valor === mascarar(atual.config[campo.chave] ?? "")) {
          continue;
        }
        mesclada[campo.chave] = valor;
      }
    }

    estado.servidores[id] = { habilitado: corpo.habilitado, config: mesclada };
    salvarConexoes(workspaceId, estado);

    return { servidor: estadoMascarado(id, estado.servidores[id]) };
  });

  // Inicia o fluxo OAuth loopback do Google Calendar: abre o navegador na tela de
  // consentimento e responde quando o callback chegar (ou no timeout honesto).
  // Exige clientId e clientSecret ja salvos pelo PUT generico acima.
  app.post("/conexoes/googlecalendar/conectar", async (_requisicao, resposta) => {
    const workspaceId = idWorkspaceAtivo();
    if (!workspaceId) {
      return resposta.status(400).send({ erro: "nenhum cliente ativo" });
    }
    try {
      const { contaEmail } = await iniciarConexao(workspaceId);
      return { contaEmail };
    } catch (e) {
      if (e instanceof ErroOAuth) {
        return resposta.status(e.status).send({ erro: e.message });
      }
      return resposta.status(500).send({ erro: "falha ao conectar com o Google" });
    }
  });

  // Desconecta o Google Calendar: revoga o refresh token e limpa refreshToken e
  // contaEmail, mantendo clientId e clientSecret pra reconectar sem recolar.
  app.post("/conexoes/googlecalendar/desconectar", async (_requisicao, resposta) => {
    const workspaceId = idWorkspaceAtivo();
    if (!workspaceId) {
      return resposta.status(400).send({ erro: "nenhum cliente ativo" });
    }
    try {
      await desconectar(workspaceId);
      return { ok: true };
    } catch (e) {
      if (e instanceof ErroOAuth) {
        return resposta.status(e.status).send({ erro: e.message });
      }
      return resposta.status(500).send({ erro: "falha ao desconectar do Google" });
    }
  });
};
