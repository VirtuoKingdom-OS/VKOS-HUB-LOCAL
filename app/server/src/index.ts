// Boot do servidor local do VKOS Hub.
// Fastify na porta 4600, host 127.0.0.1. Serve o frontend, orquestra sessoes
// e faz a ponte com o VKOS instalado. So escuta na maquina local, nunca na rede.

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

import Fastify from "fastify";
import type { FastifyError } from "fastify";
import cors from "@fastify/cors";
import estatico from "@fastify/static";

import { configurarWs } from "./nucleo/ws.js";
import { rotasSessoes } from "./sessoes/rotas.js";
import { gerenciador } from "./sessoes/gerenciador.js";
import { rotasPecas, rotasVkos } from "./vkos/rotas.js";
import { rotasAmbiente } from "./ambiente/rotas.js";
import { rotasContextos } from "./contextos/rotas.js";
import { rotasAnexos } from "./anexos/rotas.js";
import { rotasAnuncios } from "./anuncios/rotas.js";
import { rotasCanvas } from "./canvas/rotas.js";
import { rotasConfig } from "./config/rotas.js";
import { rotasWorkspaces } from "./workspaces/rotas.js";
import { rotasIde } from "./ide/rotas.js";
import { rotasConexoes } from "./conexoes/rotas.js";
import { rotasCore } from "./core/rotas.js";
import { rotasCrm } from "./crm/rotas.js";
import { rotasMensagens } from "./mensagens/rotas.js";
import { migrarSeNecessario } from "./workspaces/migracao.js";
import { migrarPastasParaRaizWorkspaces } from "./workspaces/migracaoPastas.js";
import { garantirWorkspaceIntegrado } from "./workspaces/integrado.js";
import { rotasProvedores } from "./provedores/rotas.js";
import { rotasPublicacao } from "./publicacao/rotas.js";
import { rotasMapa } from "./mapa/rotas.js";
import { rotasLeads } from "./leads/rotas.js";
import { rotasFormulario } from "./formulario/rotas.js";
import { rotasAssistente } from "./assistente/rotas.js";
import { executorAssistente } from "./assistente/executor.js";
import { inicializarRastro } from "./assistente/rastro.js";
import { ehRotaDoApp } from "./nucleo/spa.js";

const PORTA_PADRAO = 4600;
const HOST = "127.0.0.1";
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

  // Migracao do estado global antigo pro primeiro workspace. Roda antes de tudo,
  // pra o registro de workspaces ja existir quando as sessoes carregarem.
  migrarSeNecessario();
  // Recolhe pra <raiz>/workspaces/ as pastas de workspace que ficaram soltas na
  // raiz do projeto. Depois do registro existir, antes do integrado ser
  // procurado ao lado de app/.
  for (const aviso of migrarPastasParaRaizWorkspaces().avisos) {
    console.warn(aviso);
  }
  const integrado = garantirWorkspaceIntegrado();
  if (!integrado.pronto) {
    console.warn("O VKOS integrado nao foi encontrado ao lado da pasta app.");
  }
  // Carrega as sessoes de todos os workspaces (depende do registro ja pronto).
  gerenciador.inicializar();
  inicializarRastro();
  executorAssistente.iniciar();

  const app = Fastify({ logger: false });

  // CORS liberado so pro dev do Vite. Em producao o proprio backend serve o front.
  await app.register(cors, {
    origin: ORIGEM_DEV,
  });

  // Handler de erro global. Responde sempre no formato { erro: mensagem }.
  app.setErrorHandler((erro: FastifyError, _req, resposta) => {
    const status = erro.statusCode && erro.statusCode >= 400 ? erro.statusCode : 500;
    const mensagem = erro.message || "Erro interno no servidor";
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

  // WebSocket primeiro: os modulos de rotas usam transmitir no boot e em runtime.
  await configurarWs(app, PORTA, ORIGEM_DEV);

  // Modulos dos outros agentes, montados sob /api conforme o contrato.
  await app.register(rotasAmbiente, { prefix: "/api" });
  await app.register(rotasWorkspaces, { prefix: "/api" });
  await app.register(rotasVkos, { prefix: "/api" });
  await app.register(rotasSessoes, { prefix: "/api" });
  await app.register(rotasContextos, { prefix: "/api" });
  await app.register(rotasAnexos, { prefix: "/api" });
  await app.register(rotasAnuncios, { prefix: "/api" });
  await app.register(rotasCanvas, { prefix: "/api" });
  await app.register(rotasConfig, { prefix: "/api" });
  await app.register(rotasProvedores, { prefix: "/api" });
  // Telas do hub (rodada 10): IDE, conexoes MCP e CRM.
  await app.register(rotasIde, { prefix: "/api" });
  await app.register(rotasConexoes, { prefix: "/api" });
  await app.register(rotasCore, { prefix: "/api" });
  await app.register(rotasCrm, { prefix: "/api" });
  // Conversas do CRM. Plugin proprio, com aviso ao vivo proprio, mas URL da
  // familia do CRM: conversa nao existe sem contato.
  await app.register(rotasMensagens, { prefix: "/api" });
  await app.register(rotasLeads, { prefix: "/api" });
  await app.register(rotasFormulario, { prefix: "/api" });
  await app.register(rotasPublicacao, { prefix: "/api" });
  await app.register(rotasMapa, { prefix: "/api" });
  await app.register(rotasAssistente, { prefix: "/api" });

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
      setHeaders(res, caminho) {
        const ehAsset = caminho.replace(/\\/g, "/").includes("/assets/");
        res.setHeader(
          "Cache-Control",
          ehAsset ? "public, max-age=31536000, immutable" : "no-cache",
        );
      },
    });

    // Rota de interface que nao existe em disco devolve a casca do app. Sem
    // isto, F5 em /crm daria 404: o navegador manda o caminho pro servidor
    // agora, coisa que o roteamento por hash antigo escondia. A decisao de
    // quem merece a casca mora em spa.ts, separada e testada.
    app.setNotFoundHandler((pedido, resposta) => {
      const naveg = ehRotaDoApp({
        metodo: pedido.method,
        url: pedido.url,
        aceita: pedido.headers.accept,
      });
      if (!naveg) {
        return resposta.code(404).send({ erro: "Rota nao encontrada." });
      }
      // O index nunca cacheia: build novo precisa chegar no usuario.
      return resposta
        .code(200)
        .header("Cache-Control", "no-cache")
        .type("text/html; charset=utf-8")
        .send(readFileSync(join(pastaWebDist, "index.html")));
    });
  }

  try {
    await app.listen({ port: PORTA, host: HOST });
  } catch (erro) {
    console.error("Falha ao subir o servidor:", erro);
    process.exit(1);
  }

  const url = `http://${HOST}:${PORTA}`;
  console.log("");
  console.log("  VKOS Hub  servidor local no ar");
  console.log("  ----------------------------------------");
  console.log(`  porta     ${PORTA}`);
  console.log(`  url       ${url}`);
  console.log(`  frontend  ${temFrontend ? "servindo web/dist" : "via Vite (dev na 5173)"}`);
  console.log(`  dados     ${pastaDados}`);
  console.log("  ----------------------------------------");
  // VKOS_DADOS_TESTE desvia a raiz que o CRM enxerga. Serve pro teste nao
  // gravar por cima do funil real. Se ela vazar pra um uso normal, o CRM abre
  // vazio e parece que os contatos sumiram. Avisar aqui troca esse susto por
  // uma linha visivel na hora de subir.
  const desvioDeDados = process.env.VKOS_DADOS_TESTE?.trim();
  if (desvioDeDados) {
    console.warn(`  ATENCAO: VKOS_DADOS_TESTE esta ligada. O CRM vai ler e gravar em ${desvioDeDados}, nao na pasta de dados acima. Se voce nao esta rodando teste, apague essa variavel de ambiente.`);
    console.log("");
  }
  console.log("");

  // Encerramento gracioso. Fecha as conexoes e sai limpo.
  const encerrar = async (sinal: string) => {
    console.log(`\n  ${sinal} recebido. Encerrando o servidor...`);
    try {
      await app.close();
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
