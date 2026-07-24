import { randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { VertexAI } from "@google-cloud/vertexai";
import Fastify from "fastify";
import pg from "pg";

import { decifrar } from "./cofre.js";
import {
  classificarFalhaMotor,
  statusCredencialClaude,
  type CodigoFalhaMotor,
} from "./estadoMotor.js";
import { geminiConfigurado } from "./configuracao.js";
import {
  catalogoModelos,
  precoDoModelo,
  resolverModelo,
  type MotorCliente,
  type ModeloResolvido,
} from "./modelos.js";

const { Pool } = pg;
function segredo(nome: string): string | undefined {
  const arquivo = process.env[`${nome}_FILE`]?.trim();
  return arquivo
    ? readFileSync(arquivo, "utf8").trim()
    : process.env[nome]?.trim();
}

const databaseUrl = segredo("DATABASE_URL");
const db = new Pool({ connectionString: databaseUrl, max: 8 });
const porta = Number(process.env.MOTOR_PORT ?? 4700);
const tokenInterno = segredo("MOTOR_INTERNAL_TOKEN");
const API_APIFY = "https://api.apify.com/v2";
const ATOR_GOOGLE_MAPS = "compass~crawler-google-places";
if (!databaseUrl || !tokenInterno)
  throw new Error("DATABASE_URL e MOTOR_INTERNAL_TOKEN sao obrigatorios.");

function tokenValido(recebido: string | undefined): boolean {
  if (!recebido || !tokenInterno || recebido.length !== tokenInterno.length)
    return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(tokenInterno));
}

function enviar(
  linha: object,
  resposta: import("node:http").ServerResponse,
): void {
  if (!resposta.destroyed) resposta.write(`${JSON.stringify(linha)}\n`);
}

async function configurarWorkspace(workspaceId: string) {
  const resultado = await db.query(
    `SELECT w.motor, w.status, l.orcamento_mensal::float, l.acao_ao_estourar,
            COALESCE(sum(c.custo_estimado) FILTER (WHERE c.criado_em >= date_trunc('month', now())), 0)::float AS consumo
       FROM workspaces w LEFT JOIN limites_workspace l ON l.workspace_id = w.id
       LEFT JOIN consumo_ia c ON c.workspace_id = w.id
      WHERE w.id = $1 GROUP BY w.id, l.workspace_id`,
    [workspaceId],
  );
  return resultado.rows[0] ?? null;
}

async function credencial(workspaceId: string, tipo: string): Promise<string> {
  const resultado = await db.query(
    "SELECT valor_cifrado FROM credenciais WHERE workspace_id = $1 AND tipo = $2",
    [workspaceId, tipo],
  );
  if (!resultado.rowCount)
    throw new Error("Credencial do motor nao configurada.");
  await db.query(
    "INSERT INTO auditoria (workspace_id, acao, alvo, detalhes_json) VALUES ($1, 'credencial.acessada', $2, $3)",
    [workspaceId, `credencial:${tipo}`, JSON.stringify({ servico: "motor" })],
  );
  return decifrar(resultado.rows[0].valor_cifrado);
}

async function tokenApify(workspaceId: string): Promise<string> {
  const valor = await credencial(workspaceId, "conexao_externa");
  let configuracao: unknown;
  try {
    configuracao = JSON.parse(valor);
  } catch {
    throw new Error("Credencial da Apify invalida.");
  }
  const token =
    configuracao && typeof configuracao === "object" &&
    typeof (configuracao as { apify?: unknown }).apify === "string"
      ? (configuracao as { apify: string }).apify.trim()
      : "";
  if (!token) throw new Error("Credencial da Apify nao configurada.");
  return token;
}

async function apifyDisponivel(workspaceId: string): Promise<boolean> {
  const resultado = await db.query(
    "SELECT valor_cifrado FROM credenciais WHERE workspace_id = $1 AND tipo = 'conexao_externa'",
    [workspaceId],
  );
  if (!resultado.rowCount) return false;
  try {
    const configuracao = JSON.parse(decifrar(resultado.rows[0].valor_cifrado));
    return typeof configuracao?.apify === "string" && Boolean(configuracao.apify.trim());
  } catch {
    return false;
  }
}

async function executarGemini(
  prompt: string,
  modelo: string,
  aoTexto: (texto: string) => void,
  maximoSaida?: number,
) {
  const projeto = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projeto) throw new Error("GOOGLE_CLOUD_PROJECT nao configurado.");
  const vertex = new VertexAI({
    project: projeto,
    location: process.env.VERTEX_LOCATION ?? "us-central1",
  });
  const gerador = vertex.getGenerativeModel({
    model: modelo,
    ...(maximoSaida
      ? { generationConfig: { maxOutputTokens: maximoSaida } }
      : {}),
  });
  const fluxo = await gerador.generateContentStream(prompt);
  let entrada = 0;
  let saida = 0;
  for await (const item of fluxo.stream) {
    const texto =
      item.candidates?.[0]?.content?.parts
        ?.map((parte) => ("text" in parte ? (parte.text ?? "") : ""))
        .join("") ?? "";
    if (texto) aoTexto(texto);
    entrada = item.usageMetadata?.promptTokenCount ?? entrada;
    saida = item.usageMetadata?.candidatesTokenCount ?? saida;
  }
  const final = await fluxo.response;
  entrada = final.usageMetadata?.promptTokenCount ?? entrada;
  saida = final.usageMetadata?.candidatesTokenCount ?? saida;
  return { entrada, saida };
}

async function executarClaude(
  workspaceId: string,
  prompt: string,
  modelo: string,
  aoTexto: (texto: string) => void,
  maximoSaida = 8192,
) {
  const anthropic = new Anthropic({
    apiKey: await credencial(workspaceId, "claude_team"),
  });
  const fluxo = anthropic.messages.stream({
    model: modelo,
    max_tokens: maximoSaida,
    messages: [{ role: "user", content: prompt }],
  });
  fluxo.on("text", aoTexto);
  const final = await fluxo.finalMessage();
  return {
    entrada: final.usage.input_tokens,
    saida: final.usage.output_tokens,
  };
}

function geminiDisponivel(): boolean {
  return geminiConfigurado();
}

async function marcarEstadoMotor(
  workspaceId: string,
  motor: MotorCliente,
  estado: "operante" | "manutencao",
  codigo: CodigoFalhaMotor | null,
): Promise<void> {
  await db.query(
    "UPDATE workspaces SET motor_estado = $1, motor_erro_codigo = $2, motor_testado_em = now() WHERE id = $3",
    [estado, codigo, workspaceId],
  );
  if (motor === "claude_team") {
    const status = statusCredencialClaude(estado, codigo);
    if (status) {
      await db.query(
        "UPDATE credenciais SET status = $1, erro_codigo = $2, testada_em = now() WHERE workspace_id = $3 AND tipo = 'claude_team'",
        [status, codigo, workspaceId],
      );
    }
  }
}

async function registrarConsumo(
  workspaceId: string,
  sessaoId: string,
  motor: MotorCliente,
  modelo: ModeloResolvido,
  uso: { entrada: number; saida: number },
): Promise<number> {
  const custo =
    (uso.entrada / 1_000_000)
      * precoDoModelo(motor, modelo.faixa, "ENTRADA")
    + (uso.saida / 1_000_000)
      * precoDoModelo(motor, modelo.faixa, "SAIDA");
  await db.query(
    "INSERT INTO consumo_ia (workspace_id, sessao_id, motor, modelo, tokens_entrada, tokens_saida, custo_estimado) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      workspaceId,
      sessaoId,
      motor,
      modelo.id,
      uso.entrada,
      uso.saida,
      custo,
    ],
  );
  return custo;
}

function validarTabelaCusto(
  motor: MotorCliente,
  modelo: ModeloResolvido,
): void {
  precoDoModelo(motor, modelo.faixa, "ENTRADA");
  precoDoModelo(motor, modelo.faixa, "SAIDA");
}

async function executarMotor(
  workspaceId: string,
  motor: MotorCliente,
  prompt: string,
  modelo: ModeloResolvido,
  aoTexto: (texto: string) => void,
  maximoSaida?: number,
) {
  return motor === "gemini"
    ? executarGemini(prompt, modelo.id, aoTexto, maximoSaida)
    : executarClaude(
        workspaceId,
        prompt,
        modelo.id,
        aoTexto,
        maximoSaida,
      );
}

const app = Fastify({ logger: false });
app.addHook("onRequest", async (requisicao, resposta) => {
  if (!tokenValido(requisicao.headers["x-motor-token"] as string | undefined))
    return resposta.code(401).send({ erro: "nao autorizado" });
});

app.get("/interno/saude", async () => ({ ok: true }));
app.get("/interno/configuracao", async () => ({
  gemini: {
    disponivel: geminiDisponivel(),
    localizacao: process.env.VERTEX_LOCATION ?? "us-central1",
    modelos: catalogoModelos("gemini"),
  },
  claudeTeam: {
    disponivel: true,
    modelos: catalogoModelos("claude_team"),
  },
}));

app.post("/interno/testar-motor", async (requisicao, resposta) => {
  const corpo = (requisicao.body ?? {}) as {
    workspaceId?: unknown;
    motor?: unknown;
  };
  const workspaceId =
    typeof corpo.workspaceId === "string" ? corpo.workspaceId : "";
  const motor =
    corpo.motor === "gemini" || corpo.motor === "claude_team"
      ? corpo.motor
      : null;
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId) || !motor) {
    return resposta.code(400).send({ erro: "Teste de motor invalido." });
  }
  if (motor === "gemini" && !geminiDisponivel()) {
    return resposta.code(409).send({
      erro: "O projeto Vertex ainda não foi configurado no motor.",
      codigo: "configuracao",
    });
  }
  const workspace = await db.query(
    "SELECT 1 FROM workspaces WHERE id = $1 AND status = 'ativo'",
    [workspaceId],
  );
  if (!workspace.rowCount) {
    return resposta.code(404).send({ erro: "Workspace indisponível." });
  }
  const modelo = resolverModelo(motor, "economico");
  let texto = "";
  try {
    validarTabelaCusto(motor, modelo);
    const uso = await executarMotor(
      workspaceId,
      motor,
      "Responda somente com a palavra OK.",
      modelo,
      (trecho) => {
        texto += trecho;
      },
      32,
    );
    const custo = await registrarConsumo(
      workspaceId,
      `teste-${randomUUID()}`,
      motor,
      modelo,
      uso,
    );
    await marcarEstadoMotor(workspaceId, motor, "operante", null);
    return {
      ok: true,
      motor,
      modelo: modelo.id,
      tokensEntrada: uso.entrada,
      tokensSaida: uso.saida,
      custoEstimado: custo,
      resposta: texto.trim().slice(0, 80),
    };
  } catch (erro) {
    const falha = classificarFalhaMotor(erro);
    if (falha.codigo === "autenticacao" || falha.codigo === "configuracao") {
      await marcarEstadoMotor(
        workspaceId,
        motor,
        "manutencao",
        falha.codigo,
      );
    }
    return resposta
      .code(falha.codigo === "autenticacao" ? 401 : 503)
      .send({ erro: falha.mensagemCliente, codigo: falha.codigo });
  }
});
app.post("/interno/apify/disponivel", async (requisicao, resposta) => {
  const corpo = (requisicao.body ?? {}) as { workspaceId?: unknown };
  const workspaceId =
    typeof corpo.workspaceId === "string" ? corpo.workspaceId : "";
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId))
    return resposta.code(400).send({ erro: "Workspace invalido." });
  return { disponivel: await apifyDisponivel(workspaceId) };
});

app.post("/interno/apify/buscar", async (requisicao, resposta) => {
  const corpo = (requisicao.body ?? {}) as {
    workspaceId?: unknown;
    termo?: unknown;
    localizacao?: unknown;
    limite?: unknown;
    buscarEmails?: unknown;
  };
  const workspaceId =
    typeof corpo.workspaceId === "string" ? corpo.workspaceId : "";
  const termo = typeof corpo.termo === "string" ? corpo.termo.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId) || !termo)
    return resposta.code(400).send({ erro: "Busca invalida." });

  const limite = Math.min(
    40,
    Math.max(
      1,
      Math.trunc(typeof corpo.limite === "number" ? corpo.limite : 20),
    ),
  );
  const localizacao =
    typeof corpo.localizacao === "string" ? corpo.localizacao.trim() : "";
  let token: string;
  try {
    token = await tokenApify(workspaceId);
  } catch {
    return resposta.code(409).send({
      erro: "Busca de leads ainda nao foi configurada para este workspace.",
    });
  }

  const url = `${API_APIFY}/acts/${ATOR_GOOGLE_MAPS}/run-sync-get-dataset-items?clean=true&maxItems=${limite}`;
  const externa = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      searchStringsArray: [termo],
      maxCrawledPlacesPerSearch: limite,
      language: "pt-BR",
      scrapeContacts: corpo.buscarEmails !== false,
      maximumLeadsEnrichmentRecords: 0,
      maxReviews: 0,
      ...(localizacao ? { locationQuery: localizacao } : {}),
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const textoResposta = await externa.text();
  resposta.code(externa.status).header(
    "content-type",
    externa.headers.get("content-type") ?? "application/json; charset=utf-8",
  );
  try {
    return resposta.send(JSON.parse(textoResposta));
  } catch {
    return resposta.send(textoResposta);
  }
});

app.post("/interno/sessao", async (requisicao, resposta) => {
  const corpo = (requisicao.body ?? {}) as {
    workspaceId?: unknown;
    pedido?: unknown;
    contexto?: unknown;
    modelo?: unknown;
    feature?: unknown;
    sessaoId?: unknown;
  };
  const workspaceId =
    typeof corpo.workspaceId === "string" ? corpo.workspaceId : "";
  const pedido = typeof corpo.pedido === "string" ? corpo.pedido.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId) || !pedido)
    return resposta.code(400).send({ erro: "Pedido invalido." });
  const config = await configurarWorkspace(workspaceId);
  if (!config || config.status !== "ativo")
    return resposta.code(404).send({ erro: "Workspace indisponivel." });
  if (config.motor === "nenhum")
    return resposta.code(409).send({
      erro: "A IA deste workspace está em manutenção. Fale com o suporte.",
    });
  if (
    config.orcamento_mensal > 0 &&
    config.consumo >= config.orcamento_mensal &&
    config.acao_ao_estourar === "cortar"
  ) {
    return resposta
      .code(402)
      .send({ erro: "IA pausada neste workspace, fale com o suporte." });
  }
  const sessaoId =
    typeof corpo.sessaoId === "string" ? corpo.sessaoId : randomUUID();
  const prompt =
    typeof corpo.contexto === "string" && corpo.contexto
      ? `${corpo.contexto}\n\nPEDIDO:\n${pedido}`
      : pedido;
  const motor = config.motor as MotorCliente;
  const modelo = resolverModelo(motor, corpo.modelo);
  try {
    validarTabelaCusto(motor, modelo);
  } catch (erro) {
    const falha = classificarFalhaMotor(erro);
    await marcarEstadoMotor(
      workspaceId,
      motor,
      "manutencao",
      falha.codigo,
    ).catch(() => undefined);
    return resposta.code(503).send({
      erro: falha.mensagemCliente,
      codigo: falha.codigo,
    });
  }
  resposta.hijack();
  resposta.raw.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  let textoCompleto = "";
  try {
    const uso = await executarMotor(
      workspaceId,
      motor,
      prompt,
      modelo,
      (texto) => {
        textoCompleto += texto;
        enviar({ tipo: "texto", texto }, resposta.raw);
      },
    );
    const custo = await registrarConsumo(
      workspaceId,
      sessaoId,
      motor,
      modelo,
      uso,
    );
    await marcarEstadoMotor(workspaceId, motor, "operante", null);
    enviar(
      {
        tipo: "fim",
        sucesso: true,
        sessaoId,
        motor: config.motor,
        modelo: modelo.id,
        tokensEntrada: uso.entrada,
        tokensSaida: uso.saida,
        custoEstimado: custo,
        resultado: textoCompleto,
      },
      resposta.raw,
    );
  } catch (erro) {
    const falha = classificarFalhaMotor(erro);
    if (falha.codigo === "autenticacao" || falha.codigo === "configuracao") {
      await marcarEstadoMotor(
        workspaceId,
        motor,
        "manutencao",
        falha.codigo,
      ).catch(() => undefined);
    }
    enviar(
      { tipo: "erro", mensagem: falha.mensagemCliente, codigo: falha.codigo },
      resposta.raw,
    );
    enviar({ tipo: "fim", sucesso: false, sessaoId }, resposta.raw);
  } finally {
    resposta.raw.end();
  }
  return resposta;
});

app.listen({ host: "0.0.0.0", port: porta }).then(() => {
  console.log(`Motor VKOS ouvindo internamente na porta ${porta}.`);
});

for (const sinal of ["SIGINT", "SIGTERM"] as const) {
  process.on(
    sinal,
    () =>
      void app
        .close()
        .then(() => db.end())
        .then(() => process.exit(0)),
  );
}
