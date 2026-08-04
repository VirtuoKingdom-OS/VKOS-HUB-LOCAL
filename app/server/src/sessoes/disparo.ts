import type { Sessao } from "../tipos.js";
import { lerCerebro } from "../vkos/cerebro.js";
import { raizProjeto } from "../util/raizProjeto.js";
import { gerenciador } from "./gerenciador.js";
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
import {
  ehConversaDeAnuncio,
  ehGeracaoDeAnuncio,
  ErroGeracaoAnuncio,
  prepararConversaAnuncio,
  prepararGeracaoAnuncio,
} from "./geracao-anuncio.js";
import { gravarVinculo } from "../anuncios/vinculo.js";
import {
  ehEscopoProjeto,
  geracaoVisualEmAndamento,
  promptCitaCrm,
  resolverPastaAlvoGeracaoSite,
  skillExigeCerebro,
} from "./rotas.js";

export interface AlvoDaGeracao {
  workspaceId: string;
  pastaVkos: string;
}

export interface PedidoDeGeracao {
  titulo?: string;
  prompt: string;
  skill?: string;
  modelo?: string;
  permissao?: string;
  escopoPeca?: EscopoPecaSolicitado;
  pastaAlvo?: string;
  escopo?: string;
}

export class ErroDisparo extends Error {
  constructor(
    mensagem: string,
    public readonly status: number,
    public readonly dados?: Record<string, unknown>,
  ) {
    super(mensagem);
    this.name = "ErroDisparo";
  }
}

const ROTULO_CRIACAO_GUIADA: Record<string, string> = {
  site: "site",
  anuncio: "anúncio",
  carrossel: "conteúdo visual",
};

function erroDe(erro: unknown): ErroDisparo {
  if (erro instanceof ErroDisparo) return erro;
  return new ErroDisparo(erro instanceof Error ? erro.message : String(erro), 400);
}

function modeloValidado(modelo: unknown): string | undefined {
  if (modelo === undefined) return undefined;
  const provedor = obterProvedorAtivo();
  const aliases = provedor.modelos().map((item) => item.alias);
  if (typeof modelo !== "string" || !aliases.includes(modelo)) {
    throw new ErroDisparo(
      `modelo invalido para ${provedor.id}. Use: ${aliases.join(", ")}.`,
      400,
    );
  }
  return modelo;
}

function permissaoValidada(permissao: unknown): "padrao" | "total" | undefined {
  if (permissao === undefined) return undefined;
  if (permissao !== "padrao" && permissao !== "total") {
    throw new ErroDisparo("permissao invalida. Use padrao ou total.", 400);
  }
  return permissao;
}

export function dispararGeracao(
  alvo: AlvoDaGeracao,
  pedido: PedidoDeGeracao,
): { sessao: Sessao } {
  try {
    let prompt = pedido.prompt.trim();
    if (!prompt) throw new ErroDisparo("prompt e obrigatorio", 400);

    const modelo = modeloValidado(pedido.modelo);
    const permissao = permissaoValidada(pedido.permissao);
    if (!alvo.workspaceId) throw new ErroDisparo("nenhum workspace ativo", 400);

    if (skillExigeCerebro(pedido.skill) && !lerCerebro(alvo.pastaVkos).preenchido) {
      throw new ErroDisparo(
        "O Cérebro deste negócio ainda está em branco. Monte o Cérebro antes de gerar carrosséis, sites ou anúncios.",
        409,
      );
    }

    const escopoProjeto = ehEscopoProjeto(pedido.escopo);
    if (escopoProjeto && pedido.escopoPeca !== undefined) {
      throw new ErroDisparo("escopo de projeto nao aceita escopoPeca junto.", 400);
    }
    const tocaAnuncio = ehGeracaoDeAnuncio(pedido.skill) || ehConversaDeAnuncio(pedido.skill);
    if (tocaAnuncio && escopoProjeto) {
      throw new ErroDisparo("escopo de projeto nao vale para a geracao de anuncio.", 400);
    }
    if (tocaAnuncio && pedido.escopoPeca !== undefined) {
      throw new ErroDisparo("a geracao de anuncio nao aceita escopoPeca junto.", 400);
    }

    if (skillExigeCerebro(pedido.skill)) {
      const emAndamento = geracaoVisualEmAndamento(gerenciador.listar());
      if (emAndamento) {
        const tipo = ROTULO_CRIACAO_GUIADA[emAndamento.skill ?? ""] ?? "conteúdo visual";
        throw new ErroDisparo(
          `Já existe uma geração de ${tipo} em andamento. ` +
            "Finalize ou cancele essa criação antes de iniciar outra.",
          409,
          { sessaoId: emAndamento.id, tipo: emAndamento.skill },
        );
      }
    }

    let pastaTrabalho = escopoProjeto ? raizProjeto() : alvo.pastaVkos;
    let skill = pedido.skill;
    let pastaAlvoDaPeca: string | undefined;
    if (pedido.escopoPeca !== undefined) {
      try {
        const escopo = resolverEscopoPeca(alvo.pastaVkos, pedido.escopoPeca);
        pastaTrabalho = escopo.pastaTrabalho;
        skill = escopo.skill;
        pastaAlvoDaPeca = pastaAlvoDoEscopo(escopo);
        const principios = escopo.revisaoDesign
          ? lerPrincipiosVisuaisSite(alvo.pastaVkos)
          : undefined;
        prompt = montarPromptAjustePeca(
          prompt,
          escopo,
          lerCerebro(alvo.pastaVkos).conteudo,
          principios,
        );
      } catch (erro) {
        if (erro instanceof ErroEscopoPeca) {
          throw new ErroDisparo(erro.message, erro.status);
        }
        throw erro;
      }
    }

    let promptVisivel: string | undefined;
    if (ehGeracaoDeAnuncio(skill) || ehConversaDeAnuncio(skill)) {
      promptVisivel = prompt;
      try {
        const preparada = ehConversaDeAnuncio(skill)
          ? prepararConversaAnuncio({
              pastaVkos: alvo.pastaVkos,
              pastaAlvo: pedido.pastaAlvo,
              pedido: prompt,
            })
          : prepararGeracaoAnuncio({
              pastaVkos: alvo.pastaVkos,
              pastaAlvo: pedido.pastaAlvo,
              intencao: prompt,
            });
        pastaTrabalho = preparada.pastaTrabalho;
        pastaAlvoDaPeca = preparada.pasta;
        prompt = preparada.prompt;
      } catch (erro) {
        if (erro instanceof ErroGeracaoAnuncio) {
          throw new ErroDisparo(erro.message, erro.status);
        }
        throw erro;
      }
    }

    let pastaAlvo: string | undefined;
    try {
      pastaAlvo = resolverPastaAlvoGeracaoSite({
        skill,
        prompt,
        pastaAlvo: pedido.pastaAlvo,
        temEscopoPeca: pedido.escopoPeca !== undefined,
      });
    } catch (erro) {
      throw new ErroDisparo(erro instanceof Error ? erro.message : "pastaAlvo invalida", 400);
    }
    if (pastaAlvoDaPeca) pastaAlvo = pastaAlvoDaPeca;

    const contextoCrm = promptCitaCrm(prompt) ? montarResumoCrm() ?? undefined : undefined;
    const sessao = gerenciador.criar({
      titulo: pedido.titulo,
      prompt,
      skill,
      pastaTrabalho,
      modelo,
      workspaceId: alvo.workspaceId,
      permissao,
      contextoCrm,
      pastaAlvo,
      promptVisivel,
    });

    if (ehGeracaoDeAnuncio(skill) && pastaAlvoDaPeca) {
      try {
        gravarVinculo(alvo.workspaceId, pastaAlvoDaPeca, sessao.id);
      } catch {
        // A geração continua. O vínculo é uma melhoria de navegação, não o
        // artefato que o provedor está criando.
      }
    }
    return { sessao };
  } catch (erro) {
    throw erroDe(erro);
  }
}
