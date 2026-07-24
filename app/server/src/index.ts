// Boot do servidor local do VKOS Hub.
// Fastify na porta 4600, host 127.0.0.1. Serve o frontend, orquestra sessoes
// e faz a ponte com o VKOS instalado. So escuta na maquina local, nunca na rede.

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

import Fastify from "fastify";
import type { FastifyError } from "fastify";
import cors from "@fastify/cors";
import estatico from "@fastify/static";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

import { configurarWs } from "./ws.js";
import { rotasSessoes } from "./sessoes/rotas.js";
import { gerenciador } from "./sessoes/gerenciador.js";
import { rotasPecas, rotasVkos } from "./vkos/rotas.js";
import { rotasAmbiente } from "./ambiente/rotas.js";
import { rotasContextos } from "./contextos/rotas.js";
import { rotasAnexos } from "./anexos.js";
import { rotasCanvas } from "./canvas/rotas.js";
import { rotasConfig } from "./config/rotas.js";
import { rotasWorkspaces } from "./workspaces/rotas.js";
import { rotasIde } from "./ide/rotas.js";
import { rotasConexoes } from "./conexoes/rotas.js";
import { rotasCrm } from "./crm/rotas.js";
import { rotasAutomacoes } from "./automacoes/rotas.js";
import { rotasCalendario } from "./calendario/rotas.js";
import { iniciarSincronizacaoCalendario } from "./calendario/sincronizacao.js";
import { iniciarExecutor } from "./automacoes/executor.js";
import { migrarSeNecessario } from "./workspaces/migracao.js";
import { garantirWorkspaceIntegrado } from "./workspaces/integrado.js";
import { rotasProvedores } from "./provedores/rotas.js";
import { rotasPublicacao } from "./publicacao/rotas.js";
import { rotasMapa } from "./mapa.js";
import { rotasLeads } from "./leads/rotas.js";
import {
  autenticacaoObrigatoria,
  configurarAutorizacao,
} from "./plataforma/autorizacao.js";
import {
  bancoDisponivel,
  exigirBanco,
  fecharBanco,
  migrarBanco,
} from "./plataforma/banco.js";
import { garantirOperadorLocal, rotasIdentidade } from "./plataforma/identidade.js";
import { MODO, permiteIaLocal } from "./plataforma/modo.js";
import { CATALOGO_FEATURES } from "./features/catalogo.js";
import { rotasAdmin } from "./plataforma/admin.js";
import { contextoAtual } from "./plataforma/contexto.js";
import { rotasSessoesNuvem } from "./plataforma/sessoesNuvem.js";
import { deveEntregarSpa } from "./spa.js";
import { rotasMeta } from "./meta/rotas.js";
import { rotasAdminMeta } from "./meta/admin.js";
import { iniciarColetorMeta } from "./meta/coletor.js";

const PORTA_PADRAO = 4600;
const HOST = process.env.VKOS_HOST?.trim() || "127.0.0.1";
const ORIGEM_DEV = "http://localhost:5173";

// VKOS_PORT existe apenas para QA e execucoes isoladas. O produto continua na
// 4600. Uma porta invalida falha cedo, antes de inicializar qualquer modulo.
function obterPorta(): number {
  const valor = process.env.VKOS_PORT?.trim();
  if (!valor) return PORTA_PADRAO;

  const porta = Number(valor);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65_535) {
    console.error(
      `VKOS_PORT invalida: "${valor}". Use um numero entre 1 e 65535.`,
    );
    process.exit(1);
  }
  return porta;
}

const PORTA = obterPorta();

// Hosts aceitos no header Host. So o loopback local, com ou sem a porta. Bloqueia
// requisicao com Host estranho (defesa contra DNS rebinding de site malicioso que
// tente falar com o servidor local). O proxy do Vite manda changeOrigin, entao no
// dev o Host chega como localhost:4600, ja coberto aqui.
const HOSTS_PERMITIDOS = new Set([
  `127.0.0.1:${PORTA}`,
  `localhost:${PORTA}`,
  "127.0.0.1",
  "localhost",
  ...(process.env.VKOS_HOSTS_PERMITIDOS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
]);

// Caminhos base. Em dev roda de app/server/src, em build de app/server/dist.
// Dos dois jeitos, a pasta app fica dois niveis acima. Serve pra achar dados e web.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaSrc = dirname(arquivoAtual);
const pastaApp = resolve(pastaSrc, "..", "..");
const pastaDados = join(pastaApp, "dados");
const pastaWebDist = join(pastaApp, "web", "dist");

// Garante que app/dados existe antes de qualquer modulo tentar persistir nela.
function garantirPastaDados(): void {
  if (!existsSync(pastaDados)) {
    mkdirSync(pastaDados, { recursive: true });
  }
}

async function subir(): Promise<void> {
  garantirPastaDados();
  if (MODO === "hub" && !bancoDisponivel)
    throw new Error("MODO=hub exige DATABASE_URL.");
  await migrarBanco();
  await garantirOperadorLocal();

  // Migracao do estado global antigo pro primeiro workspace. Roda antes de tudo,
  // pra o registro de workspaces ja existir quando as sessoes carregarem.
  if (MODO === "core") {
    migrarSeNecessario();
    const integrado = garantirWorkspaceIntegrado();
    if (!integrado.pronto) {
      console.warn("O VKOS integrado nao foi encontrado ao lado da pasta app.");
    }
  }
  // Carrega as sessoes de todos os workspaces (depende do registro ja pronto).
  if (permiteIaLocal()) gerenciador.inicializar();

  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
  });

  // CORS liberado so pro dev do Vite. Em producao o proprio backend serve o front.
  await app.register(cors, {
    origin: ORIGEM_DEV,
  });

  // Handler de erro global. Responde sempre no formato { erro: mensagem }.
  app.setErrorHandler((erro: FastifyError, _req, resposta) => {
    const status =
      erro.statusCode && erro.statusCode >= 400 ? erro.statusCode : 500;
    if (status >= 500) {
      console.error(
        "Erro interno no servidor:",
        erro.name,
        erro.code ?? "sem_codigo",
      );
    }
    const mensagem = status >= 500 ? "Erro interno no servidor" : erro.message;
    resposta.status(status).send({ erro: mensagem });
  });

  // Guarda de Host: recusa qualquer requisicao cujo header Host nao seja o
  // loopback local. Roda antes de tudo, inclusive do upgrade de WebSocket.
  app.addHook("onRequest", async (req, resposta) => {
    const host = req.headers.host;
    if (!host || !HOSTS_PERMITIDOS.has(host)) {
      return resposta.status(403).send({ erro: "host nao autorizado" });
    }
  });

  configurarAutorizacao(app);

  // WebSocket primeiro: os modulos de rotas usam transmitir no boot e em runtime.
  await configurarWs(app);

  await app.register(rotasIdentidade, { prefix: "/api" });
  app.get("/api/saude", async () => ({ ok: true, modo: MODO }));
  app.get("/api/plataforma", async () => ({
    modo: MODO,
    features: CATALOGO_FEATURES,
  }));
  app.get("/api/features-ativas", async () => {
    const contexto = contextoAtual();
    const features = !autenticacaoObrigatoria()
      ? CATALOGO_FEATURES.map((feature) => feature.id)
      : [...(contexto?.features ?? [])];
    return { features, workspaceId: contexto?.workspaceId ?? null };
  });
  if (MODO === "core") await app.register(rotasAdmin, { prefix: "/api" });
  if (MODO === "core") await app.register(rotasAdminMeta, { prefix: "/api" });

  // Modulos dos outros agentes, montados sob /api conforme o contrato.
  await app.register(rotasAmbiente, { prefix: "/api" });
  await app.register(rotasWorkspaces, { prefix: "/api" });
  await app.register(rotasVkos, { prefix: "/api" });
  await app.register(MODO === "hub" ? rotasSessoesNuvem : rotasSessoes, {
    prefix: "/api",
  });
  await app.register(rotasContextos, { prefix: "/api" });
  await app.register(rotasAnexos, { prefix: "/api" });
  await app.register(rotasCanvas, { prefix: "/api" });
  if (MODO === "core") {
    await app.register(rotasConfig, { prefix: "/api" });
  } else {
    app.get("/api/config", async () => ({
      modeloPadrao: "padrao",
      provedorPadrao: "claude",
      modoEnxuto: true,
    }));
    app.put("/api/config", async (_requisicao, resposta) =>
      resposta.code(404).send({ erro: "rota nao encontrada" }),
    );
  }
  if (permiteIaLocal()) {
    await app.register(rotasProvedores, { prefix: "/api" });
  } else {
    app.get("/api/provedores", async () => {
      const workspaceId = contextoAtual()?.workspaceId;
      const resultado = workspaceId
        ? await exigirBanco().query(
            "SELECT motor FROM workspaces WHERE id = $1",
            [workspaceId],
          )
        : null;
      const motor = resultado?.rows[0]?.motor ?? "nenhum";
      if (motor === "nenhum") return { ativo: "claude", provedores: [] };
      return {
        ativo: "claude",
        provedores: [
          {
            id: "claude",
            modelos: [
              {
                alias: "economico",
                rotulo:
                  motor === "gemini"
                    ? "Gemini econômico"
                    : "Claude econômico",
                observacaoCusto: "Menor custo, medido no CORE",
                economico: true,
              },
              {
                alias: "padrao",
                rotulo:
                  motor === "gemini"
                    ? "Gemini padrão"
                    : "Claude padrão",
                observacaoCusto: "Equilíbrio",
              },
              {
                alias: "forte",
                rotulo:
                  motor === "gemini"
                    ? "Gemini forte"
                    : "Claude forte",
                observacaoCusto: "Mais capaz e mais caro",
              },
            ],
          },
        ],
      };
    });
  }
  // Telas do hub (rodada 10): IDE, conexoes MCP e CRM.
  await app.register(rotasIde, { prefix: "/api" });
  if (MODO === "core") await app.register(rotasConexoes, { prefix: "/api" });
  await app.register(rotasCrm, { prefix: "/api" });
  await app.register(rotasLeads, { prefix: "/api" });
  if (MODO === "core") await app.register(rotasAutomacoes, { prefix: "/api" });
  await app.register(rotasCalendario, { prefix: "/api" });
  await app.register(rotasMeta, { prefix: "/api" });
  await app.register(rotasPublicacao, { prefix: "/api" });
  if (MODO === "core") await app.register(rotasMapa, { prefix: "/api" });

  // Executor de automacoes: assina o barramento e reage aos eventos do hub.
  if (MODO === "core") iniciarExecutor();
  // Sincronizacao CRM > Google Calendar: tambem assina o barramento.
  iniciarSincronizacaoCalendario();
  iniciarColetorMeta();

  // Arquivos das pecas na raiz, sem /api: o frontend faz proxy de /pecas separado.
  await app.register(rotasPecas);

  // Producao local: serve o frontend buildado, se existir.
  const temFrontend = existsSync(pastaWebDist);
  if (temFrontend) {
    await app.register(estatico, {
      root: pastaWebDist,
      prefix: "/",
      // Cache certo por tipo de arquivo: o index.html nunca fica preso no cache
      // do navegador (sempre revalida, senao um build novo nao chega no usuario),
      // e os assets com hash no nome podem cachear pra sempre (mudou o codigo,
      // muda o nome).
      cacheControl: false,
      setHeaders(reply, caminho) {
        const ehAsset = caminho.replace(/\\/g, "/").includes("/assets/");
        reply.header(
          "Cache-Control",
          ehAsset ? "public, max-age=31536000, immutable" : "no-cache",
        );
      },
    });
  }
  app.setNotFoundHandler((requisicao, resposta) => {
    if (deveEntregarSpa(requisicao.method, requisicao.url, temFrontend)) {
      return resposta
        .header("Cache-Control", "no-cache")
        .type("text/html; charset=utf-8")
        .sendFile("index.html");
    }
    return resposta.code(404).send({ erro: "rota nao encontrada" });
  });

  try {
    await app.listen({ port: PORTA, host: HOST });
  } catch (erro) {
    console.error("Falha ao subir o servidor:", erro);
    process.exit(1);
  }

  const url = `http://${HOST}:${PORTA}`;
  console.log("");
  console.log(`  VKOS Hub 3.0, modo ${MODO}`);
  console.log("  ----------------------------------------");
  console.log(`  porta     ${PORTA}`);
  console.log(`  url       ${url}`);
  console.log(
    `  frontend  ${temFrontend ? "servindo web/dist" : "via Vite (dev na 5173)"}`,
  );
  console.log(`  dados     ${pastaDados}`);
  console.log("  ----------------------------------------");
  console.log("");

  // Encerramento gracioso. Fecha as conexoes e sai limpo.
  const encerrar = async (sinal: string) => {
    console.log(`\n  ${sinal} recebido. Encerrando o servidor...`);
    try {
      await app.close();
      await fecharBanco();
      console.log("  Servidor encerrado.");
      process.exit(0);
    } catch (erro) {
      console.error("  Erro ao encerrar:", erro);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void encerrar("SIGINT"));
  process.on("SIGTERM", () => void encerrar("SIGTERM"));
}

void subir();
