// O TEXTO QUE ENSINA O ASSISTENTE A ESCREVER O lote.json.
//
// Ele mora colado no schema de propósito, no mesmo espírito de
// anuncios/contratoPrompt.ts: a forma que entrada.ts exige e a forma que a IA
// recebe escrita são duas coisas que precisam andar juntas para sempre.
//
// O DEFEITO QUE ESTE ARQUIVO JÁ TEVE, e que a trava existe pra impedir. A
// versão anterior dizia "dados deve seguir exatamente os campos do tipo
// escolhido" e nunca listava campo nenhum. A única linha que tentava derivar do
// schema lia `TarefaSchema.shape`, que não existe: TarefaSchema é uma
// interseção (`.and`), e interseção não tem `shape`. O fallback era `{}`, então
// a frase saía como "O contrato de estado do servidor é: ." e ia assim pra IA.
// Ela inventou `{tema, briefing}`, o schema recusou os 22 campos que faltavam,
// e o erro morreu num catch vazio. O teste da época passava porque afirmava uma
// lista de chaves escrita à mão, e não o que o schema realmente exige.
//
// `prompt.test.ts` agora percorre as chaves dos schemas de entrada e reprova se
// alguma não aparecer no texto. Campo novo no schema e prompt esquecido viram
// teste vermelho, não divergência em silêncio.

import { z } from "zod";

import {
  EntradaAnuncioSchema,
  EntradaCarrosselSchema,
  EntradaSiteSchema,
  PADRAO_CARROSSEL,
  PADRAO_SITE,
} from "./entrada.js";
import { LotePropostaSchema } from "./tarefa.js";

// As chaves de nível do lote. Continuam à mão porque não saem de um schema de
// objeto simples, e o teste as afirma junto com as dos schemas de entrada.
export const CHAVES_CONTRATO_LOTE = [
  "id",
  "conversaId",
  "tarefas",
  "workspaceId",
  "workspaceNome",
  "tipo",
  "dados",
] as const;

// Desembrulha os invólucros do Zod até chegar no tipo que descreve o valor.
// Optional e nullable são invólucros, e é dentro deles que mora o enum.
function miolo(schema: z.ZodTypeAny): z.ZodTypeAny {
  let atual = schema;
  while (
    atual instanceof z.ZodOptional ||
    atual instanceof z.ZodNullable ||
    atual instanceof z.ZodDefault
  ) {
    atual = atual._def.innerType as z.ZodTypeAny;
  }
  return atual;
}

// O que entra num campo, por extenso. Enum vira a lista fechada de valores,
// porque é a informação que impede a IA de inventar um valor plausível e
// errado.
function comoPreencher(schema: z.ZodTypeAny): string {
  const tipo = miolo(schema);
  if (tipo instanceof z.ZodEnum) {
    return `um destes, sem inventar outro: ${(tipo.options as string[]).join(", ")}`;
  }
  if (tipo instanceof z.ZodNumber) return "número inteiro";
  if (tipo instanceof z.ZodBoolean) return "true ou false";
  if (tipo instanceof z.ZodArray) return "lista";
  return "texto";
}

// Uma linha por campo do schema, dizendo o nome, o que entra e o que acontece
// quando o campo não vem.
export function linhasDoSchema(
  schema: z.ZodObject<z.ZodRawShape>,
  padroes: Record<string, unknown> = {},
): string[] {
  return Object.entries(schema.shape).map(([nome, campo]) => {
    const valor = campo as z.ZodTypeAny;
    const tipo = comoPreencher(valor);
    if (!valor.isOptional()) return `- ${nome} (obrigatório): ${tipo}.`;
    const padrao = padroes[nome];
    const comoFica =
      padrao === undefined || padrao === ""
        ? "o Hub usa o padrão da criação guiada"
        : `o Hub usa ${JSON.stringify(padrao)}`;
    return `- ${nome} (opcional, mande só se o dono disse): ${tipo}. Sem ele, ${comoFica}.`;
  });
}

// O exemplo existe porque forma descrita e forma vista não são a mesma coisa
// pra um modelo: a lista de campos diz o que vale, o exemplo mostra o
// aninhamento. Ele nasce validado contra o próprio schema, porque exemplo que
// não passa no contrato ensina a IA a errar.
export function exemploDeLote(): string {
  const exemplo = {
    id: "lote-1",
    conversaId: "c-exemplo",
    tarefas: [
      {
        workspaceId: "w-abc123",
        workspaceNome: "Nome exato do workspace",
        tipo: "carrossel",
        dados: {
          tema: "O que é Gamiologia",
          detalhes:
            "Carrossel explicativo. Abrir dizendo que muita gente acha que o tema fala de videogames, e mostrar que a proposta é mais ampla.",
          paginas: 8,
        },
      },
      {
        workspaceId: "w-abc123",
        workspaceNome: "Nome exato do workspace",
        tipo: "carrossel",
        dados: {
          tema: "O que é Alfabetização Gamiológica",
          detalhes:
            "Carrossel educativo que define o conceito e compara com a alfabetização textual, científica e digital.",
        },
      },
    ],
  };
  if (!LotePropostaSchema.safeParse(exemplo).success) {
    throw new Error("O exemplo do contrato do lote não passa no próprio schema.");
  }
  return JSON.stringify(exemplo, null, 2);
}

export function contratoLoteAssistente(): string {
  return [
    "O ARQUIVO lote.json, CAMPO A CAMPO",
    "",
    "É um objeto JSON com id, conversaId e tarefas. tarefas é uma lista com pelo menos uma tarefa.",
    "Cada tarefa tem workspaceId, workspaceNome, tipo e dados.",
    "tipo só pode ser carrossel, site ou anuncio. Não existe tarefa de arquivo, comando, exportação ou publicação.",
    "O arquivo é JSON puro: sem comentário, sem vírgula sobrando e sem cerca de bloco de código em volta.",
    "",
    "Os campos de dados mudam com o tipo, e são EXATAMENTE estes. Nome fora desta lista faz o lote inteiro ser recusado.",
    "",
    "dados quando tipo é carrossel:",
    ...linhasDoSchema(EntradaCarrosselSchema, PADRAO_CARROSSEL),
    "",
    "dados quando tipo é site:",
    ...linhasDoSchema(EntradaSiteSchema, PADRAO_SITE),
    "",
    "dados quando tipo é anuncio:",
    ...linhasDoSchema(EntradaAnuncioSchema),
    "",
    "Campo opcional que o dono não mencionou fica de fora. O Hub completa com o mesmo padrão da criação guiada, e um chute seu no lugar dele viraria uma escolha que ninguém fez.",
    "",
    "A EXCEÇÃO É O ESTILO, e ela existe por um defeito real: dois carrosséis do mesmo lote saíram com a mesma cara. Quando o lote tem mais de um carrossel no mesmo workspace, mande `estilo` em cada um, escolhendo ids DIFERENTES da lista `modelosDeCarrossel` daquele workspace no briefing. Peça única, ou modelo pedido pelo dono, segue a regra normal: sem `estilo`, quem escolhe é a skill.",
    "Anúncio não tem padrão: oferta, destino, praça e orçamento por dia são justamente as perguntas que o Cérebro não responde. Sem elas, pergunte em vez de propor.",
    "",
    "Um exemplo de lote válido, com dois carrosséis no mesmo workspace:",
    exemploDeLote(),
  ].join("\n");
}

export function montarPromptAssistente(entrada: {
  conversaId: string;
  briefing: string;
  pedido: string;
}): string {
  return [
    "Você é o Assistente do Hub, no nível CORE.",
    "Converse em português brasileiro, com frases curtas e diretas. Nenhuma palavra em outro idioma ou em outro alfabeto.",
    "Você pode ler o briefing curado abaixo e propor criações. Você não pode rodar comandos, chamar rotas, ativar workspace, escrever em app/dados ou tocar em qualquer arquivo fora do seu diretório temporário.",
    "Para criar peças, primeiro resolva o workspace pelo id. Nome ambíguo ou workspace inexistente exige uma pergunta ou recusa, nunca um chute.",
    "Pedido do dono:",
    entrada.pedido.trim(),
    "",
    entrada.briefing,
    "",
    contratoLoteAssistente(),
    "",
    `Quando houver dados suficientes, grave somente lote.json no diretório atual, com conversaId ${entrada.conversaId}. O lote fica em proposta até o dono aprovar na tela. Nunca aprove por conta própria.`,
    "Depois de gravar, diga em uma linha quantas tarefas você propôs e em qual workspace. Nunca anuncie que gravou sem ter gravado.",
    "Se faltarem quantidade, tema ou workspace, faça uma pergunta e não crie lote.json.",
  ].join("\n");
}
