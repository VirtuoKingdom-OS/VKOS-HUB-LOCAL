import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const GrupoMapaSchema = z.object({
  id: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  cor: z.string().trim().min(1),
});

const NoMapaSchema = z.object({
  id: z.string().trim().min(1),
  grupo: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  resumo: z.string().trim().min(1),
  descricao: z.string().trim().min(1),
  conversaCom: z.array(z.string().trim().min(1)),
});

const LigacaoMapaSchema = z.object({
  de: z.string().trim().min(1),
  para: z.string().trim().min(1),
  rotulo: z.string().trim().min(1),
});

const MapaSistemaSchema = z
  .object({
    versao: z.literal(1),
    grupos: z.array(GrupoMapaSchema).min(1),
    nos: z.array(NoMapaSchema).min(1),
    ligacoes: z.array(LigacaoMapaSchema),
  })
  .superRefine((mapa, contexto) => {
    const grupos = new Set<string>();
    for (const grupo of mapa.grupos) {
      if (grupos.has(grupo.id)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `grupo repetido: ${grupo.id}`,
        });
      }
      grupos.add(grupo.id);
    }

    const nos = new Set<string>();
    for (const no of mapa.nos) {
      if (nos.has(no.id)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `no repetido: ${no.id}`,
        });
      }
      nos.add(no.id);
      if (!grupos.has(no.grupo)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `grupo ausente no no ${no.id}`,
        });
      }
    }

    for (const no of mapa.nos) {
      for (const destino of no.conversaCom) {
        if (!nos.has(destino)) {
          contexto.addIssue({
            code: z.ZodIssueCode.custom,
            message: `conversaCom ausente no no ${no.id}: ${destino}`,
          });
        }
      }
    }

    for (const ligacao of mapa.ligacoes) {
      if (!nos.has(ligacao.de) || !nos.has(ligacao.para)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `ligacao com ponta ausente: ${ligacao.de} -> ${ligacao.para}`,
        });
      }
    }
  });

export type MapaSistema = z.infer<typeof MapaSistemaSchema>;

const pastaModulo = dirname(fileURLToPath(import.meta.url));
const caminhoMapa = resolve(
  pastaModulo,
  "..",
  "..",
  "..",
  "interno",
  "mapa-sistema.json",
);

export function validarMapaSistema(valor: unknown): MapaSistema | null {
  const resultado = MapaSistemaSchema.safeParse(valor);
  return resultado.success ? resultado.data : null;
}

export async function lerMapaSistema(): Promise<MapaSistema | null> {
  try {
    const texto = await readFile(caminhoMapa, "utf8");
    return validarMapaSistema(JSON.parse(texto) as unknown);
  } catch {
    return null;
  }
}

export const rotasMapa: FastifyPluginAsync = async (app) => {
  app.get("/mapa", async (_requisicao, resposta) => {
    const mapa = await lerMapaSistema();
    if (!mapa) return resposta.send({ disponivel: false });
    return resposta.send({ disponivel: true, mapa });
  });
};
