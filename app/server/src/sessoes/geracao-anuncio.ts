// O preparo de uma sessao de geracao de anuncio. Espelha escopo-peca.ts: valida
// a pasta, confina o cwd nela e devolve o prompt costurado.
//
// TRES DIFERENCAS EM RELACAO AO SITE, e as tres tem motivo.
//
// 1. A PASTA VEM NO CORPO HTTP, nao por regex no prompt. No site quem cria a
//    pasta e a IA, entao o servidor precisa achar o nome lendo o prompt
//    (resolverPastaAlvoGeracaoSite). Aqui quem cria a pasta e o Hub, o nome ja
//    esta na mao, e adivinhar por regex um dado que voce ja tem e erro.
// 2. O HUB CRIA A PASTA ANTES DE DISPARAR e o cwd da sessao ja e ela. E o que
//    confina a sessao desde o turno um, e isso importa porque o chat da tela de
//    anuncio RETOMA essa mesma sessao: sessao que nasce com cwd na raiz do
//    workspace fica com ele pra sempre, e viraria um agente solto perto do
//    Cerebro.
// 3. A BARREIRA E A MESMA DAS ROTAS DE PECA (vkos/pastaPeca.ts). Uma segunda
//    copia dela seria uma segunda chance de escrever fora de conteudo/.

import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";

import { caminhoAnuncio, existeAnuncio } from "../anuncios/armazenamento.js";
import {
  montarPromptConversaAnuncio,
  montarPromptGeracaoAnuncio,
} from "../anuncios/prompt.js";
import { lerCerebro } from "../vkos/cerebro.js";
import { resolverPeca } from "../vkos/pastaPeca.js";
import { lerConteudoSkill } from "../vkos/skills.js";

// O nome da skill do VKOS e tambem o valor que o frontend manda em skill.
export const SKILL_ANUNCIO = "anuncio";

// A conversa que RECOMECA sobre uma campanha existente. Nao e uma skill do
// VKOS: e o rotulo que o Hub usa pra pedir uma sessao confinada na pasta da
// peca, sem gerar nada do zero.
//
// Ela existe porque a sessao original pode morrer (Hub reiniciado antes de o
// provedor devolver o id da conversa, sessao removida, processo encerrado). O
// chat da tela do anuncio diz isso na cara e oferece esta porta. Sem ela, o
// unico caminho seria fingir que a conversa continua, e a continuidade real e o
// valor inteiro daquele chat.
export const SKILL_CONVERSA_ANUNCIO = "conversa-anuncio";

export class ErroGeracaoAnuncio extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroGeracaoAnuncio";
    this.status = status;
  }
}

export interface GeracaoAnuncioPreparada {
  // O cwd da sessao: a pasta da peca, ja criada.
  pastaTrabalho: string;
  // O nome da pasta dentro de conteudo/, que vira a pastaAlvo da sessao.
  pasta: string;
  // O prompt completo, no lugar da intencao crua que chegou do frontend.
  prompt: string;
}

export function ehGeracaoDeAnuncio(skill: unknown): boolean {
  return skill === SKILL_ANUNCIO;
}

export function ehConversaDeAnuncio(skill: unknown): boolean {
  return skill === SKILL_CONVERSA_ANUNCIO;
}

// Valida, cria a pasta e monta o prompt. Lanca ErroGeracaoAnuncio com o status
// pronto pra virar resposta.
//
// A ORDEM AQUI E DE PROPOSITO: tudo que pode falhar acontece ANTES do mkdir.
// Uma pastaAlvo com ".." ou um workspace sem a skill /anuncio nao podem deixar
// pasta vazia largada em conteudo/.
export function prepararGeracaoAnuncio(parametros: {
  pastaVkos: string;
  pastaAlvo: unknown;
  intencao: string;
}): GeracaoAnuncioPreparada {
  const bruto =
    typeof parametros.pastaAlvo === "string" ? parametros.pastaAlvo.trim() : "";
  if (!bruto) {
    throw new ErroGeracaoAnuncio(
      400,
      "A geração de anúncio precisa da pasta de destino. Recarregue o Hub e tente de novo.",
    );
  }

  const resolvida = resolverPeca(parametros.pastaVkos, bruto);
  if (!resolvida) {
    throw new ErroGeracaoAnuncio(400, "Nome de pasta de anúncio inválido.");
  }

  const conteudoSkill = lerConteudoSkill(parametros.pastaVkos, SKILL_ANUNCIO);
  if (!conteudoSkill) {
    throw new ErroGeracaoAnuncio(
      409,
      "A skill /anuncio não foi encontrada neste VKOS. Sem ela o anúncio sairia sem método, então a geração para aqui.",
    );
  }

  if (existsSync(resolvida.alvo)) {
    if (!statSync(resolvida.alvo).isDirectory()) {
      throw new ErroGeracaoAnuncio(
        400,
        "Já existe um arquivo com esse nome em conteudo/. Escolha outro nome para o anúncio.",
      );
    }
  } else {
    // Idempotente por natureza. Reaproveitar a pasta que ja existe e o
    // comportamento certo: e assim que uma segunda tentativa da mesma peca
    // continua de onde parou, em vez de espalhar pasta duplicada.
    mkdirSync(resolvida.alvo, { recursive: true });
  }

  return {
    pastaTrabalho: resolvida.alvo,
    pasta: resolvida.nome,
    prompt: montarPromptGeracaoAnuncio({
      intencao: parametros.intencao,
      cerebro: lerCerebro(parametros.pastaVkos).conteudo,
      conteudoSkill,
      pasta: resolvida.nome,
    }),
  };
}

// A sessao de resgate: confinada na MESMA pasta da peca, com o anuncio.json
// atual embutido no primeiro turno.
//
// Ela reusa tudo que a Fase 2 construiu: a mesma barreira resolverPeca, o mesmo
// confinamento por cwd, o mesmo contrato de JSON no prompt. A unica diferenca e
// que aqui a pasta PRECISA existir, com uma campanha dentro. Este caminho nunca
// cria peca: quem cria e prepararGeracaoAnuncio, e so o assistente chama aquele.
export function prepararConversaAnuncio(parametros: {
  pastaVkos: string;
  pastaAlvo: unknown;
  pedido: string;
}): GeracaoAnuncioPreparada {
  const bruto =
    typeof parametros.pastaAlvo === "string" ? parametros.pastaAlvo.trim() : "";
  if (!bruto) {
    throw new ErroGeracaoAnuncio(
      400,
      "A conversa da campanha precisa saber de qual peça ela fala. Recarregue o Hub e tente de novo.",
    );
  }

  const resolvida = resolverPeca(parametros.pastaVkos, bruto);
  if (!resolvida) {
    throw new ErroGeracaoAnuncio(400, "Nome de pasta de anúncio inválido.");
  }
  if (!existsSync(resolvida.alvo) || !statSync(resolvida.alvo).isDirectory()) {
    throw new ErroGeracaoAnuncio(404, "Peça não encontrada.");
  }
  if (!existeAnuncio(resolvida.alvo)) {
    throw new ErroGeracaoAnuncio(
      404,
      "Essa peça não tem um anuncio.json, então não há campanha para conversar sobre.",
    );
  }

  return {
    pastaTrabalho: resolvida.alvo,
    pasta: resolvida.nome,
    prompt: montarPromptConversaAnuncio({
      pedido: parametros.pedido,
      // O texto cru, e nao a peca validada: o que a IA precisa ver e o arquivo
      // do jeito que ele esta em disco. Campanha com forma quebrada e
      // exatamente um dos casos em que o dono vai querer conversar.
      anuncioAtual: readFileSync(caminhoAnuncio(resolvida.alvo), "utf8"),
      cerebro: lerCerebro(parametros.pastaVkos).conteudo,
      pasta: resolvida.nome,
    }),
  };
}
