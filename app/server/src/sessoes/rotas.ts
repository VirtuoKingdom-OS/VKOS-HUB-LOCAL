// Rotas HTTP do orquestrador de sessoes. Segue o CONTRATO.md a risca.
// Caminhos sem /api: o prefixo e aplicado por quem registra o plugin (index.ts).

import type { FastifyPluginAsync } from "fastify";

import type { Sessao, TurnoSessao } from "../tipos.js";
import { lerCerebro } from "../vkos/cerebro.js";
import { obterPastaVkos } from "../vkos/estado.js";
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

const SKILLS_QUE_EXIGEM_CEREBRO = new Set(["carrossel", "site"]);
const STATUS_EM_EXECUCAO = new Set(["fila", "iniciando", "rodando"]);

export function skillExigeCerebro(skill: unknown): boolean {
  return typeof skill === "string" && SKILLS_QUE_EXIGEM_CEREBRO.has(skill);
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
    const q = (requisicao.query ?? {}) as { todas?: string };
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
    const corpo = (requisicao.body ?? {}) as {
      titulo?: string;
      prompt?: string;
      skill?: string;
      modelo?: string;
      permissao?: string;
      escopoPeca?: EscopoPecaSolicitado;
      pastaAlvo?: string;
    };

    let prompt = typeof corpo.prompt === "string" ? corpo.prompt.trim() : "";
    if (!prompt) {
      return resposta.code(400).send({ erro: "prompt e obrigatorio" });
    }

    // Modelo e opcional. Se veio, precisa pertencer ao provedor ativo.
    const provedorAtivo = obterProvedorAtivo();
    const aliasesValidos = provedorAtivo.modelos().map((item) => item.alias);
    let modelo: string | undefined;
    if (corpo.modelo !== undefined) {
      if (typeof corpo.modelo !== "string" || !aliasesValidos.includes(corpo.modelo)) {
        return resposta.code(400).send({
          erro: `modelo invalido para ${provedorAtivo.id}. Use: ${aliasesValidos.join(", ")}.`,
        });
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
    // Carrossel e site dependem da identidade do negocio. Sem esta guarda, os
    // provedores encerram o turno com uma explicacao, a sessao vira concluida e
    // o frontend fica esperando um arquivo que nunca sera criado.
    if (skillExigeCerebro(corpo.skill) && !lerCerebro(pasta).preenchido) {
      return resposta.code(409).send({
        erro:
          "O Cérebro deste negócio ainda está em branco. Monte o Cérebro antes de gerar carrosséis ou sites.",
      });
    }
    const workspaceId = idWorkspaceAtivo();
    if (!workspaceId) {
      return resposta.code(400).send({ erro: "nenhum workspace ativo" });
    }

    let pastaTrabalho = pasta;
    let skill = corpo.skill;
    // Peca de site ajustada com IA tambem passa pela conferencia. A pasta vem do
    // escopo ja resolvido e confinado pelo servidor, nunca do corpo HTTP.
    let pastaAlvoDaPeca: string | undefined;
    if (corpo.escopoPeca !== undefined) {
      try {
        const escopo = resolverEscopoPeca(pasta, corpo.escopoPeca);
        pastaTrabalho = escopo.pastaTrabalho;
        skill = escopo.skill;
        pastaAlvoDaPeca = pastaAlvoDoEscopo(escopo);
        const principios = escopo.revisaoDesign
          ? lerPrincipiosVisuaisSite(pasta)
          : undefined;
        prompt = montarPromptAjustePeca(
          prompt,
          escopo,
          lerCerebro(pasta).conteudo,
          principios,
        );
      } catch (erro) {
        if (erro instanceof ErroEscopoPeca) {
          return resposta.code(erro.status).send({ erro: erro.message });
        }
        throw erro;
      }
    }

    if (skillExigeCerebro(skill)) {
      const emAndamento = geracaoVisualEmAndamento(gerenciador.listar());
      if (emAndamento) {
        const tipo = emAndamento.skill === "site" ? "site" : "conteúdo visual";
        return resposta.code(409).send({
          erro:
            `Já existe uma geração de ${tipo} em andamento. ` +
            "Finalize ou cancele essa criação antes de iniciar outra.",
          sessaoId: emAndamento.id,
          tipo: emAndamento.skill,
        });
      }
    }

    const contextoCrm = promptCitaCrm(prompt) ? montarResumoCrm() ?? undefined : undefined;
    let pastaAlvo: string | undefined;
    try {
      pastaAlvo = resolverPastaAlvoGeracaoSite({
        skill,
        prompt,
        pastaAlvo: corpo.pastaAlvo,
        temEscopoPeca: corpo.escopoPeca !== undefined,
      });
    } catch (erro) {
      return resposta.code(400).send({
        erro: erro instanceof Error ? erro.message : "pastaAlvo invalida",
      });
    }
    if (pastaAlvoDaPeca) pastaAlvo = pastaAlvoDaPeca;
    const sessao = gerenciador.criar({
      titulo: corpo.titulo,
      prompt,
      skill,
      pastaTrabalho,
      modelo,
      workspaceId,
      permissao,
      contextoCrm,
      pastaAlvo,
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
