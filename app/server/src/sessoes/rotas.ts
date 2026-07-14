// Rotas HTTP do orquestrador de sessoes. Segue o CONTRATO.md a risca.
// Caminhos sem /api: o prefixo e aplicado por quem registra o plugin (index.ts).

import type { FastifyPluginAsync } from "fastify";

import type { TurnoSessao } from "../tipos.js";
import { obterPastaVkos } from "../vkos/estado.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import { gerenciador } from "./gerenciador.js";
import { lerTranscricao } from "./transcricao.js";
import { custosVazios, lerCustos, totalGeralUsd } from "./custos.js";

// Modelos aceitos no POST /sessoes. Espelha os aliases da config.
const MODELOS_VALIDOS = ["opus", "sonnet", "haiku"];

export const rotasSessoes: FastifyPluginAsync = async (app) => {
  // Lista as sessoes do workspace ativo. ?todas=1 devolve as de todos (pro futuro).
  app.get("/sessoes", async (requisicao) => {
    const q = (requisicao.query ?? {}) as { todas?: string };
    if (q.todas === "1" || q.todas === "true") {
      return { sessoes: gerenciador.listar() };
    }
    const ativo = idWorkspaceAtivo();
    return { sessoes: ativo ? gerenciador.listar(ativo) : [] };
  });

  // Custos acumulados do workspace ativo, mais o total geral somando todos.
  app.get("/custos", async () => {
    const ativo = idWorkspaceAtivo();
    const base = ativo ? lerCustos(ativo) : custosVazios();
    return { ...base, totalGeralUsd: totalGeralUsd() };
  });

  // Transcricao (turnos) de uma sessao. Vazia se nao ha arquivo.
  // Fallback pra sessao antiga (nascida antes da persistencia de transcricao):
  // sem arquivo mas com prompt/resultado no indice, monta turnos sinteticos so
  // pra resposta, sem gravar em disco.
  app.get("/sessoes/:id/transcricao", async (requisicao) => {
    const { id } = requisicao.params as { id: string };
    const sessao = gerenciador.acharSessao(id);
    // Resolve pelo workspace da sessao; sem sessao conhecida, tenta o ativo.
    const workspaceId = sessao?.workspaceId ?? idWorkspaceAtivo() ?? "";
    const turnos = lerTranscricao(workspaceId, id);
    if (turnos.length > 0) {
      return { turnos };
    }

    if (!sessao) {
      return { turnos };
    }

    const sinteticos: TurnoSessao[] = [];
    if (sessao.prompt) {
      sinteticos.push({ papel: "usuario", texto: sessao.prompt, em: sessao.criadaEm });
    }
    if (sessao.resultado) {
      sinteticos.push({
        papel: "assistente",
        texto: sessao.resultado,
        em: sessao.atualizadaEm,
        custoUsd: sessao.custoUsd,
      });
    }
    return { turnos: sinteticos };
  });

  // Cria e inicia (ou enfileira) uma sessao nova.
  app.post("/sessoes", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as {
      titulo?: string;
      prompt?: string;
      skill?: string;
      modelo?: string;
      permissao?: string;
    };

    const prompt = typeof corpo.prompt === "string" ? corpo.prompt.trim() : "";
    if (!prompt) {
      return resposta.code(400).send({ erro: "prompt e obrigatorio" });
    }

    // Modelo e opcional. Se veio, precisa ser um dos aceitos.
    let modelo: string | undefined;
    if (corpo.modelo !== undefined) {
      if (typeof corpo.modelo !== "string" || !MODELOS_VALIDOS.includes(corpo.modelo)) {
        return resposta.code(400).send({ erro: "modelo invalido. Use opus, sonnet ou haiku." });
      }
      modelo = corpo.modelo;
    }

    // Permissao e opcional. Se veio, precisa ser padrao ou total.
    let permissao: "padrao" | "total" | undefined;
    if (corpo.permissao !== undefined) {
      if (corpo.permissao !== "padrao" && corpo.permissao !== "total") {
        return resposta.code(400).send({ erro: "permissao invalida. Use padrao ou total." });
      }
      permissao = corpo.permissao;
    }

    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.code(400).send({ erro: "nenhuma pasta VKOS escolhida" });
    }
    const workspaceId = idWorkspaceAtivo();
    if (!workspaceId) {
      return resposta.code(400).send({ erro: "nenhum workspace ativo" });
    }

    const sessao = gerenciador.criar({
      titulo: corpo.titulo,
      prompt,
      skill: corpo.skill,
      pastaTrabalho: pasta,
      modelo,
      workspaceId,
      permissao,
    });

    return resposta.code(201).send({ sessao });
  });

  // Continua uma sessao existente com um texto novo, via --resume.
  app.post("/sessoes/:id/mensagem", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const corpo = (requisicao.body ?? {}) as { texto?: string };
    const texto = typeof corpo.texto === "string" ? corpo.texto.trim() : "";

    if (!texto) {
      return resposta.code(400).send({ erro: "texto e obrigatorio" });
    }

    const resultado = gerenciador.continuar(id, texto);
    if (!resultado.ok) {
      return resposta.code(400).send({ erro: resultado.erro });
    }
    return { ok: true };
  });

  // Para uma sessao: mata o processo.
  app.post("/sessoes/:id/parar", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const resultado = gerenciador.parar(id);
    if (!resultado.ok) {
      return resposta.code(404).send({ erro: resultado.erro });
    }
    return { ok: true };
  });

  // Remove uma sessao: para o processo se rodando e apaga do indice. 404 se nao existe.
  app.delete("/sessoes/:id", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const resultado = gerenciador.remover(id);
    if (!resultado.ok) {
      return resposta.code(404).send({ erro: resultado.erro });
    }
    return { ok: true };
  });
};
