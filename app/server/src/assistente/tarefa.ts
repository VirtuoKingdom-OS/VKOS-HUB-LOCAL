import { z } from "zod";

import {
  DadosAnuncioSchema,
  DadosCriacaoSchema,
  DadosSiteSchema,
} from "../geracao/modelo.js";
import {
  EntradaAnuncioSchema,
  EntradaCarrosselSchema,
  EntradaSiteSchema,
} from "./entrada.js";

// Os dados de uma tarefa são os MESMOS de uma criação guiada, e vêm de
// geracao/modelo.ts. Eles já eram redeclarados aqui, campo a campo, e duas
// cópias do mesmo contrato divergem no primeiro campo novo: o executor monta o
// prompt com o modelo de lá, então quem mandaria na forma real seria aquele
// arquivo, e este aqui reprovaria ou aprovaria a coisa errada em silêncio.
export { DadosAnuncioSchema, DadosSiteSchema };
export { DadosCriacaoSchema as DadosCarrosselSchema };

export const TipoTarefaSchema = z.enum(["carrossel", "site", "anuncio"]);

// A forma COMPLETA, que a fila guarda e o executor consome.
const dadosPorTipo = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("carrossel"), dados: DadosCriacaoSchema }),
  z.object({ tipo: z.literal("site"), dados: DadosSiteSchema }),
  z.object({ tipo: z.literal("anuncio"), dados: DadosAnuncioSchema }),
]);

// A forma MÍNIMA, que o assistente escreve no lote.json. O porquê da diferença
// está em entrada.ts.
const entradaPorTipo = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("carrossel"), dados: EntradaCarrosselSchema }),
  z.object({ tipo: z.literal("site"), dados: EntradaSiteSchema }),
  z.object({ tipo: z.literal("anuncio"), dados: EntradaAnuncioSchema }),
]);

export const TarefaSchema = z
  .object({
    id: z.string().min(1),
    loteId: z.string().min(1),
    criadaEm: z.string().min(1),
    atualizadaEm: z.string().optional(),
    origem: z.enum(["assistente", "dono"]),
    conversaId: z.string().min(1).optional(),
    workspaceId: z.string().min(1),
    workspaceNome: z.string().min(1),
    estado: z.enum(["proposta", "aprovada", "na-fila", "rodando", "feita", "falhou", "cancelada"]),
    sessaoId: z.string().optional(),
    pastaAlvo: z.string().optional(),
    erro: z.string().optional(),
    em: z.string().optional(),
  })
  .and(dadosPorTipo);

export const LotePropostaSchema = z.object({
  id: z.string().min(1),
  conversaId: z.string().min(1).optional(),
  tarefas: z
    .array(
      z
        .object({
          id: z.string().min(1).optional(),
          workspaceId: z.string().min(1),
          workspaceNome: z.string().min(1).optional(),
        })
        .and(entradaPorTipo),
    )
    // Lote sem tarefa nenhuma não é proposta, é arquivo vazio. Aceitar ele
    // registraria um lote no rastro que nunca vai gerar peça.
    .min(1),
});

export type TipoTarefa = z.infer<typeof TipoTarefaSchema>;
export type DadosCarrossel = z.infer<typeof DadosCriacaoSchema>;
export type DadosSite = z.infer<typeof DadosSiteSchema>;
export type DadosAnuncio = z.infer<typeof DadosAnuncioSchema>;
export type Tarefa = z.infer<typeof TarefaSchema>;
export type LoteProposta = z.infer<typeof LotePropostaSchema>;

function caminhoDoErro(caminho: (string | number)[]): string {
  if (caminho.length === 0) return "o lote";
  return caminho
    .map((parte, indice) => (typeof parte === "number" ? `[${parte}]` : indice === 0 ? parte : `.${parte}`))
    .join("");
}

export function descreverErroDeTarefa(erro: z.ZodError): string {
  const problemas = erro.issues.slice(0, 3).map((item) => {
    const recebido = item.code === "invalid_type" ? ` (recebido ${item.received})` : "";
    return `${caminhoDoErro(item.path)}: ${item.message}${recebido}`;
  });
  const restantes = erro.issues.length - problemas.length;
  return `Tarefa inválida. ${problemas.join("; ")}${
    restantes > 0 ? `; e mais ${restantes} problema${restantes > 1 ? "s" : ""}` : ""
  }.`;
}

export function validarTarefa(valor: unknown): Tarefa {
  const resultado = TarefaSchema.safeParse(valor);
  if (!resultado.success) throw new Error(descreverErroDeTarefa(resultado.error));
  return resultado.data;
}
