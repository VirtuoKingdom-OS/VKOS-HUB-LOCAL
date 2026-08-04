// Rotas HTTP do orquestrador de sessoes. Segue o CONTRATO.md a risca.
// Caminhos sem /api: o prefixo e aplicado por quem registra o plugin (index.ts).

import type { FastifyPluginAsync } from "fastify";

import type { Sessao, TurnoSessao } from "../tipos.js";
import { lerCerebro } from "../vkos/cerebro.js";
import { obterPastaVkos } from "../vkos/estado.js";
import { raizProjeto } from "../util/raizProjeto.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import { gerenciador } from "./gerenciador.js";
import { skillPassaPelaConferencia } from "./conformidade-site.js";
import { lerTranscricao } from "./transcricao.js";
import {
  ErroEscopoPeca,
  lerPrincipiosVisuaisSite,
  montarPromptAjustePeca,
  pastaAlvoDoEscopo,
  resolverEscopoPeca,
  type EscopoPecaSolicitado,
} from "./escopo-peca.js";
import { obterProvedorAtivo } from "../provedores/index.js";
import { montarResumoCrm } from "../crm/resumo.js";
import { custosVazios, lerCustos, totalGeral } from "./custos.js";
import {
  ehConversaDeAnuncio,
  ehGeracaoDeAnuncio,
  ErroGeracaoAnuncio,
  prepararConversaAnuncio,
  prepararGeracaoAnuncio,
} from "./geracao-anuncio.js";
import { gravarVinculo } from "../anuncios/vinculo.js";
import { dispararGeracao, ErroDisparo, type PedidoDeGeracao } from "./disparo.js";

// Skills de criacao guiada. Estar aqui liga duas coisas de uma vez, e as duas
// sao desejadas: a guarda de Cerebro vazio (409) e a trava de uma criacao
// guiada por vez.
const SKILLS_QUE_EXIGEM_CEREBRO = new Set(["carrossel", "site", "anuncio"]);
const STATUS_EM_EXECUCAO = new Set(["fila", "iniciando", "rodando"]);

// Como cada criacao guiada se chama na mensagem da trava. Sem isto o anuncio
// seria anunciado como "conteudo visual", que e outra coisa.
const ROTULO_CRIACAO_GUIADA: Record<string, string> = {
  site: "site",
  anuncio: "anúncio",
  carrossel: "conteúdo visual",
};

export function skillExigeCerebro(skill: unknown): boolean {
  return typeof skill === "string" && SKILLS_QUE_EXIGEM_CEREBRO.has(skill);
}

// A sessao roda na raiz da instalacao em vez da pasta do workspace?
//
// Só o chat da VKOS-IDE pede isso, pra conversar sobre os mesmos arquivos que a
// arvore dela mostra. A comparacao e exata de proposito: qualquer outro valor
// cai na pasta do workspace, que e o escopo fechado. Escopo nao se abre por
// engano de digitacao.
export function ehEscopoProjeto(escopo: unknown): boolean {
  return escopo === "projeto";
}

// Uma sessao de site com o laco de conformidade ainda rodando (conferindo ou
// corrigindo) ocupa a trava tanto quanto uma sessao ativa: durante a conferencia
// a sessao ja esta "concluida", mas o laco pode retomar a MESMA sessao pra
// corrigir. Um POST novo de site/carrossel nessa janela dispararia uma segunda
// geracao guiada em paralelo com a correcao (A5).
function conferenciaSiteEmAndamento(sessao: Sessao): boolean {
  const estado = sessao.conferenciaSite?.estado;
  return skillPassaPelaConferencia(sessao.skill)
    && (estado === "conferindo" || estado === "corrigindo");
}

// Carrossel e site escrevem uma arvore inteira dentro de conteudo/. Uma segunda
// geracao guiada pode disputar o unico estado visual de progresso do Hub. O
// bloqueio e global e vive no servidor para cobrir troca de cliente, outra aba,
// refresh e corrida de cliques, nao so o estado React da tela atual. A janela da
// conferencia de conformidade tambem conta como em andamento.
export function geracaoVisualEmAndamento(sessoes: Sessao[]): Sessao | undefined {
  return sessoes.find(
    (sessao) =>
      skillExigeCerebro(sessao.skill) &&
      (STATUS_EM_EXECUCAO.has(sessao.status) || conferenciaSiteEmAndamento(sessao)),
  );
}

export function promptCitaCrm(prompt: string): boolean {
  return /\bcrm\b/i.test(prompt);
}

const ASSINATURA_SITE_GUIADO = "BLOCO 3, regras técnicas.";
const NOME_PASTA_SITE = /^[a-z0-9][a-z0-9_-]*$/i;

// O prompt do Site Guiado carrega o destino como parte do seu contrato. Essa
// segunda fonte permite que uma aba antiga do Hub ainda ligue o laco de
// conformidade, mesmo que ela nao envie pastaAlvo no corpo HTTP.
export function extrairPastaAlvoDoPrompt(prompt: string): string | undefined {
  const resultado = prompt.match(
    /^- Salve tudo em conteudo\/([^/\\\r\n]+)\/\s*\(crie a pasta com esse nome exato\)\./m,
  );
  const candidata = resultado?.[1]?.trim();
  return candidata && NOME_PASTA_SITE.test(candidata) ? candidata : undefined;
}

export function resolverPastaAlvoGeracaoSite(parametros: {
  skill: unknown;
  prompt: string;
  pastaAlvo: unknown;
  temEscopoPeca: boolean;
}): string | undefined {
  if (parametros.temEscopoPeca || parametros.skill !== "site") return undefined;

  const informada =
    typeof parametros.pastaAlvo === "string" && parametros.pastaAlvo.trim()
      ? parametros.pastaAlvo.trim()
      : undefined;
  if (informada && !NOME_PASTA_SITE.test(informada)) {
    throw new Error("pastaAlvo invalida para a geracao de site");
  }

  const extraida = extrairPastaAlvoDoPrompt(parametros.prompt);
  if (informada && extraida && informada !== extraida) {
    throw new Error("pastaAlvo nao corresponde ao destino declarado no prompt do Site Guiado");
  }

  const resolvida = informada ?? extraida;
  if (parametros.prompt.includes(ASSINATURA_SITE_GUIADO) && !resolvida) {
    throw new Error(
      "O Site Guiado nao informou uma pasta de destino valida. Recarregue o Hub e tente novamente.",
    );
  }
  return resolvida;
}

export const rotasSessoes: FastifyPluginAsync = async (app) => {
  // Lista as sessoes do workspace ativo. ?todas=1 devolve as de todos (pro futuro).
  app.get("/sessoes", async (requisicao) => {
    const q = (requisicao.query ?? {}) as { todas?: string; escopo?: string };
    if (q.escopo === "core") {
      return { sessoes: gerenciador.listar("") };
    }
    if (q.todas === "1" || q.todas === "true") {
      return { sessoes: gerenciador.listar() };
    }
    const ativo = idWorkspaceAtivo();
    return { sessoes: ativo ? gerenciador.listar(ativo) : [] };
  });

  // Custos acumulados do workspace ativo, mais o total geral somando todos os
  // clientes do registro E o historico dos ja removidos.
  app.get("/custos", async () => {
    const ativo = idWorkspaceAtivo();
    const base = ativo ? lerCustos(ativo) : custosVazios();
    const geral = totalGeral();
    // O valor em dolar e sempre uma estimativa client-side (tabela de precos),
    // nao cobranca real. Marca como estimado sempre que ha gasto, inclusive nos
    // arquivos antigos que gravaram estimado=false antes desta regra.
    return {
      ...base,
      estimado: base.estimado || base.totalUsd > 0,
      // O total do cliente e um piso quando algum turno gastou sem o Hub saber
      // quanto. A tela precisa dizer isso em vez de mostrar exatidao que nao tem.
      piso: base.turnosSemCusto > 0,
      totalGeralUsd: geral.totalUsd,
      totalGeralEstimado: geral.estimado || geral.totalUsd > 0,
      totalGeralPiso: geral.piso,
    };
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
        estimado: sessao.estimado,
      });
    }
    return { turnos: sinteticos };
  });

  // Cria e inicia (ou enfileira) uma sessao nova.
  app.post("/sessoes", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as Partial<PedidoDeGeracao>;
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.code(400).send({ erro: "nenhuma pasta VKOS escolhida" });
    }
    const workspaceId = idWorkspaceAtivo();
    if (!workspaceId) {
      return resposta.code(400).send({ erro: "nenhum workspace ativo" });
    }
    try {
      const resultado = dispararGeracao(
        { workspaceId, pastaVkos: pasta },
        { ...corpo, prompt: typeof corpo.prompt === "string" ? corpo.prompt : "" },
      );
      return resposta.code(201).send(resultado);
    } catch (erro) {
      if (erro instanceof ErroDisparo) {
        return resposta.code(erro.status).send({ erro: erro.message, ...(erro.dados ?? {}) });
      }
      throw erro;
    }
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
