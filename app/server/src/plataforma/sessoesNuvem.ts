import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { FastifyPluginAsync } from "fastify";

import { transmitir } from "../ws.js";
import { lerCerebro } from "../vkos/cerebro.js";
import { exigirBanco } from "./banco.js";
import { contextoAtual } from "./contexto.js";
import {
  aplicarArquivosDoResultado,
  ErroSkillNuvem,
  PROTOCOLO_ARQUIVOS,
  resolverPedidoComSkill,
} from "./skillsNuvem.js";
import { garantirModelosNoWorkspace } from "../vkos/bancoModelos.js";

type Status = "fila" | "rodando" | "concluida" | "erro" | "parada";
interface SessaoNuvem {
  id: string;
  provedor: "gemini" | "claude_team";
  titulo: string;
  prompt: string;
  skill?: string;
  workspaceId: string;
  status: Status;
  criadaEm: string;
  atualizadaEm: string;
  pastaTrabalho: string;
  resultado?: string;
  erro?: string;
  modelo?: string;
  custoUsd?: number;
  tokensEntrada?: number;
  tokensSaida?: number;
  estimado: true;
}

const sessoes = new Map<string, SessaoNuvem>();
const turnos = new Map<string, Array<{ papel: "usuario" | "assistente"; texto: string; em: string; custoUsd?: number; estimado?: boolean }>>();
const controles = new Map<string, AbortController>();
const instrucoesSkills = new Map<string, string>();

function tokenMotor(): string {
  const arquivo = process.env.MOTOR_INTERNAL_TOKEN_FILE?.trim();
  return arquivo ? readFileSync(arquivo, "utf8").trim() : process.env.MOTOR_INTERNAL_TOKEN ?? "";
}

function featureDoPedido(skill: unknown): string {
  if (skill === "site") return "site-guiado";
  if (skill === "carrossel" || skill === "post" || skill === "story") return "criador-visual";
  return "cockpit";
}

function atualizar(sessao: SessaoNuvem, status: Status, detalhe?: string) {
  sessao.status = status;
  sessao.atualizadaEm = new Date().toISOString();
  if (status === "erro") sessao.erro = detalhe;
  transmitir({ tipo: "sessao:status", id: sessao.id, workspaceId: sessao.workspaceId, status, detalhe });
}

function contextoDaSessao(
  sessao: SessaoNuvem,
  cerebro: string,
  incluirHistorico: boolean,
): string {
  const instrucao = instrucoesSkills.get(sessao.id);
  const historico = incluirHistorico
    ? (turnos.get(sessao.id) ?? [])
        .slice(0, -1)
        .map((turno) =>
          `${turno.papel === "usuario" ? "USUÁRIO" : "ASSISTENTE"}:\n${turno.texto}`
        )
        .join("\n\n")
    : "";
  return [
    instrucao ? `INSTRUÇÕES DA SKILL:\n${instrucao}` : "",
    instrucao ? `PROTOCOLO DE ARQUIVOS:\n${PROTOCOLO_ARQUIVOS}` : "",
    cerebro ? `CÉREBRO ATUAL DO WORKSPACE:\n${cerebro}` : "",
    historico ? `CONVERSA ANTERIOR:\n${historico}` : "",
  ].filter(Boolean).join("\n\n");
}

async function executar(sessao: SessaoNuvem, pedido: string, contexto: string) {
  const controle = new AbortController();
  controles.set(sessao.id, controle);
  atualizar(sessao, "rodando");
  try {
    const resposta = await fetch(`${process.env.MOTOR_URL ?? "http://motor:4700"}/interno/sessao`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-motor-token": tokenMotor() },
      body: JSON.stringify({ workspaceId: sessao.workspaceId, feature: featureDoPedido(sessao.skill), pedido, contexto, modelo: sessao.modelo, sessaoId: sessao.id }),
      signal: controle.signal,
    });
    if (!resposta.ok || !resposta.body) {
      const corpo = await resposta.json().catch(() => ({})) as { erro?: string };
      throw new Error(corpo.erro ?? "Motor de IA indisponivel.");
    }
    const leitor = resposta.body.getReader();
    const decodificador = new TextDecoder();
    let buffer = "";
    let resultado = "";
    while (true) {
      const { done, value } = await leitor.read();
      buffer += decodificador.decode(value, { stream: !done });
      const linhas = buffer.split("\n");
      buffer = linhas.pop() ?? "";
      for (const linha of linhas) {
        if (!linha.trim()) continue;
        const evento = JSON.parse(linha) as Record<string, unknown>;
        if (evento.tipo === "texto" && typeof evento.texto === "string") {
          resultado += evento.texto;
          transmitir({ tipo: "sessao:evento", id: sessao.id, workspaceId: sessao.workspaceId, evento: { type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: evento.texto } } } });
        } else if (evento.tipo === "erro") {
          throw new Error(typeof evento.mensagem === "string" ? evento.mensagem : "Falha no motor.");
        } else if (evento.tipo === "fim" && evento.sucesso === true) {
          sessao.modelo = typeof evento.modelo === "string" ? evento.modelo : sessao.modelo;
          sessao.tokensEntrada = typeof evento.tokensEntrada === "number" ? evento.tokensEntrada : 0;
          sessao.tokensSaida = typeof evento.tokensSaida === "number" ? evento.tokensSaida : 0;
          sessao.custoUsd = typeof evento.custoEstimado === "number" ? evento.custoEstimado : 0;
        }
      }
      if (done) break;
    }
    const aplicado = instrucoesSkills.has(sessao.id)
      ? aplicarArquivosDoResultado(sessao.pastaTrabalho, resultado)
      : { texto: resultado, arquivos: [] };
    const resultadoFinal = aplicado.texto || (
      aplicado.arquivos.length
        ? `Arquivos atualizados: ${aplicado.arquivos.join(", ")}.`
        : resultado
    );
    sessao.resultado = resultadoFinal;
    turnos.set(sessao.id, [...(turnos.get(sessao.id) ?? []), { papel: "assistente", texto: resultadoFinal, em: new Date().toISOString(), custoUsd: sessao.custoUsd, estimado: true }]);
    transmitir({ tipo: "sessao:evento", id: sessao.id, workspaceId: sessao.workspaceId, evento: { type: "result", result: resultadoFinal, total_cost_usd: sessao.custoUsd ?? 0 } });
    atualizar(sessao, "concluida");
  } catch (erro) {
    if (controle.signal.aborted) atualizar(sessao, "parada");
    else atualizar(sessao, "erro", erro instanceof Error ? erro.message : "Falha no motor.");
  } finally {
    controles.delete(sessao.id);
  }
}

export const rotasSessoesNuvem: FastifyPluginAsync = async (app) => {
  app.get("/sessoes", async () => {
    const workspaceId = contextoAtual()?.workspaceId;
    return { sessoes: [...sessoes.values()].filter((sessao) => sessao.workspaceId === workspaceId) };
  });

  app.get("/custos", async () => {
    const workspaceId = contextoAtual()?.workspaceId;
    if (!workspaceId) return { totalUsd: 0, totalSessoes: 0, tokensEntrada: 0, tokensSaida: 0, estimado: true };
    const resultado = await exigirBanco().query("SELECT COALESCE(sum(custo_estimado), 0)::float AS total, count(*)::int AS sessoes, COALESCE(sum(tokens_entrada), 0)::int AS entrada, COALESCE(sum(tokens_saida), 0)::int AS saida FROM consumo_ia WHERE workspace_id = $1", [workspaceId]);
    const item = resultado.rows[0];
    return { totalUsd: item.total, totalSessoes: item.sessoes, tokensEntrada: item.entrada, tokensSaida: item.saida, estimado: true };
  });

  app.get("/sessoes/:id/transcricao", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const sessao = sessoes.get(id);
    if (!sessao || sessao.workspaceId !== contextoAtual()?.workspaceId) return resposta.code(404).send({ erro: "Sessao nao encontrada." });
    return { turnos: turnos.get(id) ?? [] };
  });

  app.post("/sessoes", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as {
      titulo?: unknown;
      prompt?: unknown;
      skill?: unknown;
      modelo?: unknown;
      modelosUsados?: unknown;
    };
    const prompt = typeof corpo.prompt === "string" ? corpo.prompt.trim() : "";
    const contexto = contextoAtual();
    if (!prompt) return resposta.code(400).send({ erro: "prompt e obrigatorio" });
    if (!contexto?.workspaceId) return resposta.code(404).send({ erro: "rota nao encontrada" });
    if (!contexto.workspacePasta) return resposta.code(404).send({ erro: "Workspace sem pasta materializada." });
    if (corpo.modelosUsados !== undefined) {
      if (
        !Array.isArray(corpo.modelosUsados)
        || corpo.modelosUsados.length > 4
        || corpo.modelosUsados.some((id) => typeof id !== "string")
      ) {
        return resposta.code(400).send({ erro: "Lista de modelos inválida." });
      }
      try {
        garantirModelosNoWorkspace(
          contexto.workspacePasta,
          corpo.modelosUsados as string[],
        );
      } catch (erro) {
        return resposta.code(400).send({
          erro: erro instanceof Error ? erro.message : "Não foi possível preparar o modelo.",
        });
      }
    }
    let pedidoResolvido;
    try {
      pedidoResolvido = resolverPedidoComSkill(
        contexto.workspacePasta,
        prompt,
        corpo.skill,
      );
    } catch (erro) {
      if (erro instanceof ErroSkillNuvem) {
        return resposta.code(422).send({ erro: erro.message });
      }
      throw erro;
    }
    const feature = featureDoPedido(pedidoResolvido.skill);
    if (!contexto.features.has(feature)) return resposta.code(404).send({ erro: "rota nao encontrada" });
    const motor = await exigirBanco().query(
      "SELECT motor, motor_estado FROM workspaces WHERE id = $1 AND status = 'ativo'",
      [contexto.workspaceId],
    );
    if (!motor.rowCount || motor.rows[0].motor === "nenhum") return resposta.code(409).send({
      erro: "A IA deste workspace está em manutenção. Fale com o suporte.",
    });
    if (
      motor.rows[0].motor === "claude_team"
      && motor.rows[0].motor_estado !== "operante"
    ) {
      return resposta.code(409).send({
        erro: "A IA deste workspace está em manutenção. Fale com o suporte.",
      });
    }
    const agora = new Date().toISOString();
    const sessao: SessaoNuvem = { id: randomUUID(), provedor: motor.rows[0].motor, titulo: typeof corpo.titulo === "string" ? corpo.titulo.slice(0, 120) : "Nova sessao", prompt, skill: pedidoResolvido.skill ?? undefined, workspaceId: contexto.workspaceId, status: "fila", criadaEm: agora, atualizadaEm: agora, pastaTrabalho: contexto.workspacePasta, modelo: typeof corpo.modelo === "string" ? corpo.modelo : undefined, estimado: true };
    sessoes.set(sessao.id, sessao);
    turnos.set(sessao.id, [{ papel: "usuario", texto: prompt, em: agora }]);
    if (pedidoResolvido.instrucao) {
      instrucoesSkills.set(sessao.id, pedidoResolvido.instrucao);
    }
    const cerebro = lerCerebro(contexto.workspacePasta).conteudo.slice(0, 200_000);
    void executar(
      sessao,
      pedidoResolvido.pedido,
      contextoDaSessao(sessao, cerebro, false),
    );
    return resposta.code(201).send({ sessao });
  });

  app.post("/sessoes/:id/mensagem", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const texto = typeof (requisicao.body as { texto?: unknown } | null)?.texto === "string" ? (requisicao.body as { texto: string }).texto.trim() : "";
    const sessao = sessoes.get(id);
    if (!texto || !sessao || sessao.workspaceId !== contextoAtual()?.workspaceId || controles.has(id)) return resposta.code(400).send({ erro: "Sessao ou mensagem invalida." });
    turnos.set(id, [...(turnos.get(id) ?? []), { papel: "usuario", texto, em: new Date().toISOString() }]);
    const cerebro = lerCerebro(sessao.pastaTrabalho).conteudo.slice(0, 200_000);
    void executar(
      sessao,
      texto,
      contextoDaSessao(sessao, cerebro, true),
    );
    return { ok: true };
  });

  app.post("/sessoes/:id/parar", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const sessao = sessoes.get(id);
    if (!sessao || sessao.workspaceId !== contextoAtual()?.workspaceId) return resposta.code(404).send({ erro: "Sessao nao encontrada." });
    controles.get(id)?.abort();
    return { ok: true };
  });

  app.delete("/sessoes/:id", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const sessao = sessoes.get(id);
    if (!sessao || sessao.workspaceId !== contextoAtual()?.workspaceId) return resposta.code(404).send({ erro: "Sessao nao encontrada." });
    controles.get(id)?.abort();
    sessoes.delete(id);
    turnos.delete(id);
    instrucoesSkills.delete(id);
    return { ok: true };
  });
};
