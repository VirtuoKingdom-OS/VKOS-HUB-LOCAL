import { z } from "zod";

export const VisualPersonalizadoSchema = z
  .object({
    corFundo: z.string(),
    corDestaque: z.string(),
    corTexto: z.string(),
    fonteTitulos: z.string(),
    fonteCorpo: z.string(),
  })
  .nullable();

export const DadosCriacaoSchema = z.object({
  tema: z.string(),
  detalhes: z.string(),
  paginas: z.number().int().min(2).max(15).nullable(),
  estilo: z.string(),
  estiloCapa: z.string(),
  estiloPaginas: z.string(),
  formato: z.enum(["multiplas", "unica"]),
  proporcao: z.enum(["1x1", "4x5", "9x16"]),
  modoImagem: z.enum(["sem", "com", "intercalado"]),
  origemImagem: z.enum(["usuario", "ia"]),
  caminhosImagens: z.array(z.string()),
  visual: VisualPersonalizadoSchema,
  aprimorarComIA: z.boolean().default(true),
});

export const DadosSiteSchema = z.object({
  tema: z.string(),
  detalhes: z.string(),
  formato: z.enum(["unica", "completo", "bio"]),
  objetivo: z.enum(["whatsapp", "agendamento", "orcamento", "contato"]),
  objetivoLivre: z.string(),
  linkObjetivo: z.string(),
  secoesLivre: z.string(),
  modoImagem: z.enum(["sem", "com", "ia"]),
  anexos: z.array(z.object({ nome: z.string(), caminhoRelativo: z.string() })),
  visualModo: z.enum(["negocio", "personalizado"]),
  corFundo: z.string(),
  corDestaque: z.string(),
  corTexto: z.string(),
  fonteTitulos: z.string(),
  fonteCorpo: z.string(),
  aprimorarComIA: z.boolean().default(true),
});

export const DadosAnuncioSchema = z.object({
  oferta: z.string(),
  objetivo: z.string(),
  destino: z.enum(["whatsapp", "landing", "agendamento", "telefone"]),
  linkDestino: z.string(),
  praca: z.string(),
  raio: z.string(),
  orcamentoDiario: z.string(),
  detalhes: z.string(),
});

export type DadosCriacao = z.infer<typeof DadosCriacaoSchema>;
export type DadosSite = z.infer<typeof DadosSiteSchema>;
export type DadosAnuncio = z.infer<typeof DadosAnuncioSchema>;

// A forma de ENTRADA, antes do schema aplicar os padrões. A diferença é
// `aprimorarComIA`: ele tem `.default(true)`, então sai obrigatório do parse e
// entra opcional. O wizard trabalha com a forma de entrada, porque rascunho
// antigo não tem esse campo; a fila trabalha com a de saída, já resolvida.
//
// Os prompts aceitam a de ENTRADA de propósito: assim o mesmo montarPrompt
// serve o wizard e a fila, sem cada lado carregar a própria cópia do tipo.
export type DadosCriacaoEntrada = z.input<typeof DadosCriacaoSchema>;
export type DadosSiteEntrada = z.input<typeof DadosSiteSchema>;

export function validarDados<T>(schema: { parse: (valor: unknown) => T }, valor: unknown): T {
  return schema.parse(valor);
}
