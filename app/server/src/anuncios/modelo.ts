// A forma da peca de anuncio. Este arquivo e contrato: a tela, o prompt e o
// laco de conformidade falam desses nomes de campo.
//
// A REGRA CENTRAL: o schema valida FORMA, jamais tamanho de texto.
//
// Forma errada (falta um campo, titulos veio como texto em vez de lista, versao
// diferente de 1) quer dizer que a IA nao entregou uma peca de anuncio. Isso e
// 422 na leitura.
//
// Titulo de 34 caracteres e outra coisa: e uma peca perfeitamente legivel com um
// problema que o dono precisa VER. Se o schema reprovasse isso, um titulo ruim
// tornaria a campanha inteira ilegivel e o dono ficaria sem nada em vez de ficar
// com quase tudo. Tamanho de texto e assunto de limites.ts, que devolve
// violacoes em vez de derrubar a peca.
//
// Por isso nenhum campo de texto aqui tem .min(1). A unica contagem que o schema
// faz e a de grupos: campanha sem grupo nenhum nao e campanha.

import { z } from "zod";

export const DestinoSchema = z.object({
  tipo: z.enum(["whatsapp", "landing", "agendamento", "telefone"]),
  url: z.string(),
  observacao: z.string(),
});

export const EstrategiaSchema = z.object({
  objetivo: z.string(),
  oferta: z.string(),
  publico: z.string(),
  dorPrincipal: z.string(),
  provas: z.array(z.string()),
  destino: DestinoSchema,
  localizacoes: z.array(z.string()),
  idioma: z.string(),
});

export const PalavraChaveSchema = z.object({
  texto: z.string(),
  correspondencia: z.enum(["ampla", "frase", "exata"]),
  motivo: z.string(),
});

export const AnuncioResponsivoSchema = z.object({
  titulos: z.array(z.string()),
  descricoes: z.array(z.string()),
  caminhos: z.array(z.string()),
  urlFinal: z.string(),
});

export const GrupoAnuncioSchema = z.object({
  // Slug estavel: vira ancora na tela, entao mudar ele quebra link salvo.
  id: z.string(),
  nome: z.string(),
  tema: z.string(),
  palavrasChave: z.array(PalavraChaveSchema),
  anuncios: z.array(AnuncioResponsivoSchema),
});

export const CampanhaSchema = z.object({
  nome: z.string(),
  tipo: z.literal("busca"),
  // A unica contagem do schema. Campanha sem grupo nao tem o que publicar.
  grupos: z.array(GrupoAnuncioSchema).min(1),
});

export const PalavraNegativaSchema = z.object({
  texto: z.string(),
  motivo: z.string(),
});

export const SitelinkSchema = z.object({
  texto: z.string(),
  descricoes: z.array(z.string()),
  url: z.string(),
});

export const SnippetSchema = z.object({
  cabecalho: z.string(),
  valores: z.array(z.string()),
});

export const RecursosSchema = z.object({
  sitelinks: z.array(SitelinkSchema),
  frasesDestaque: z.array(z.string()),
  snippets: z.array(SnippetSchema),
  chamada: z.string(),
});

export const OrcamentoSchema = z.object({
  diarioBrl: z.number(),
  cpcAlvoBrl: z.number(),
  cliquesEstimadosMes: z.string(),
  observacao: z.string(),
});

export const ConversaoSchema = z.object({
  nome: z.string(),
  tipo: z.enum(["whatsapp", "formulario", "ligacao", "agendamento", "outro"]),
  comoMarcar: z.string(),
  // null quer dizer "o dono ainda nao sabe quanto vale". Zero seria mentira.
  valorBrl: z.number().nullable(),
});

export const PassoPublicacaoSchema = z.object({
  ordem: z.number(),
  titulo: z.string(),
  detalhe: z.string(),
});

export const PecaAnuncioSchema = z.object({
  versao: z.literal(1),
  // A skill sabe fazer Meta tambem. Este fluxo declara Google rede de busca e so.
  // O campo existe pro dia em que a Meta entrar, sem obrigar migracao.
  plataforma: z.literal("google-busca"),
  // ISO. Fica como texto livre de proposito: data mal formatada e um detalhe
  // visivel, nao motivo pra recusar a campanha inteira.
  geradoEm: z.string(),
  estrategia: EstrategiaSchema,
  campanha: CampanhaSchema,
  negativas: z.array(PalavraNegativaSchema),
  recursos: RecursosSchema,
  orcamento: OrcamentoSchema,
  conversoes: z.array(ConversaoSchema),
  publicacao: z.array(PassoPublicacaoSchema),
});

export type Destino = z.infer<typeof DestinoSchema>;
export type Estrategia = z.infer<typeof EstrategiaSchema>;
export type PalavraChave = z.infer<typeof PalavraChaveSchema>;
export type AnuncioResponsivo = z.infer<typeof AnuncioResponsivoSchema>;
export type GrupoAnuncio = z.infer<typeof GrupoAnuncioSchema>;
export type Campanha = z.infer<typeof CampanhaSchema>;
export type PalavraNegativa = z.infer<typeof PalavraNegativaSchema>;
export type Sitelink = z.infer<typeof SitelinkSchema>;
export type Snippet = z.infer<typeof SnippetSchema>;
export type Recursos = z.infer<typeof RecursosSchema>;
export type Orcamento = z.infer<typeof OrcamentoSchema>;
export type Conversao = z.infer<typeof ConversaoSchema>;
export type PassoPublicacao = z.infer<typeof PassoPublicacaoSchema>;
export type PecaAnuncio = z.infer<typeof PecaAnuncioSchema>;

// Nome do arquivo que DEFINE a peca como anuncio. A classificacao em
// vkos/pecas.ts procura exatamente por ele na raiz da pasta.
export const NOME_ARQUIVO_ANUNCIO = "anuncio.json";

export function validarPecaAnuncio(valor: unknown): z.SafeParseReturnType<unknown, PecaAnuncio> {
  return PecaAnuncioSchema.safeParse(valor);
}

// ------------------------------------------------------ o erro em portugues

const NOME_DO_TIPO: Record<string, string> = {
  string: "texto",
  number: "número",
  boolean: "sim ou não",
  array: "lista",
  object: "objeto",
  undefined: "nada",
  null: "nulo",
  nan: "número inválido",
  integer: "número inteiro",
};

function nomeDoTipo(tipo: string): string {
  return NOME_DO_TIPO[tipo] ?? tipo;
}

// Transforma o caminho do Zod em endereco legivel: campanha.grupos[0].anuncios[0].titulos.
function caminhoLegivel(caminho: (string | number)[]): string {
  let saida = "";
  for (const parte of caminho) {
    if (typeof parte === "number") {
      saida += `[${parte}]`;
    } else {
      saida += saida ? `.${parte}` : parte;
    }
  }
  return saida || "o arquivo";
}

function motivoDoProblema(problema: z.ZodIssue): string {
  switch (problema.code) {
    case "invalid_type":
      if (problema.received === "undefined") return "campo obrigatório ausente";
      return `esperava ${nomeDoTipo(problema.expected)}, veio ${nomeDoTipo(problema.received)}`;
    case "invalid_literal":
      return `precisa ser ${JSON.stringify(problema.expected)}`;
    case "invalid_enum_value":
      return `valor não aceito, use um destes: ${problema.options.join(", ")}`;
    case "too_small":
      return `precisa ter pelo menos ${String(problema.minimum)} item`;
    case "too_big":
      return `passou do máximo de ${String(problema.maximum)} item`;
    case "unrecognized_keys":
      return `campo desconhecido: ${problema.keys.join(", ")}`;
    default:
      return problema.message;
  }
}

// Mensagem de 422 legivel pelo dono, nao o dump cru do Zod. Mostra ate tres
// campos: a lista inteira de um JSON muito errado vira parede de texto e ninguem
// le a primeira linha, que e a que importa.
export function descreverErroDeForma(erro: z.ZodError): string {
  const problemas = erro.issues;
  if (problemas.length === 0) return "O anúncio não está no formato esperado.";

  const mostrados = problemas
    .slice(0, 3)
    .map((problema) => `${caminhoLegivel(problema.path)}: ${motivoDoProblema(problema)}`);

  const resto = problemas.length - mostrados.length;
  const cauda = resto > 0 ? `. E mais ${resto} problema${resto > 1 ? "s" : ""}` : "";
  return `O anúncio não está no formato esperado. ${mostrados.join("; ")}${cauda}.`;
}
