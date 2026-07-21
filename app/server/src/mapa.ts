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

// Percurso de uma skill: so feedback visual sobreposto ao mapa. Opcional, o
// mapa continua valido sem ele. Cada id do percurso precisa ser um no existente.
const SkillMapaSchema = z.object({
  id: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  resumo: z.string().trim().min(1),
  cor: z.string().trim().min(1),
  percurso: z.array(z.string().trim().min(1)).min(2),
});

const MapaSistemaSchema = z
  .object({
    versao: z.literal(1),
    grupos: z.array(GrupoMapaSchema).min(1),
    nos: z.array(NoMapaSchema).min(1),
    ligacoes: z.array(LigacaoMapaSchema),
    skills: z.array(SkillMapaSchema).optional(),
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

    const skills = new Set<string>();
    for (const skill of mapa.skills ?? []) {
      if (skills.has(skill.id)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `skill repetida: ${skill.id}`,
        });
      }
      skills.add(skill.id);
      for (const passo of skill.percurso) {
        if (!nos.has(passo)) {
          contexto.addIssue({
            code: z.ZodIssueCode.custom,
            message: `percurso da skill ${skill.id} cita no ausente: ${passo}`,
          });
        }
      }
    }
  });

export type MapaSistema = z.infer<typeof MapaSistemaSchema>;

// ===== Mapa de Telas: espelho visual das telas, rotas e estados do app =====
// So feedback visual, nao muda comportamento. Curado a mao em interno/mapa-telas.json.

const ZonaTelaSchema = z.object({
  id: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  cor: z.string().trim().min(1),
});

const TelaMapaSchema = z.object({
  id: z.string().trim().min(1),
  zona: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  rota: z.string().trim().min(1),
  // destino de navegacao na gramatica de telas do Shell; null para estado sem
  // navegacao direta (Splash, Onboarding, Geracao flutuante).
  destino: z.string().trim().min(1).nullable(),
  resumo: z.string().trim().min(1),
  descricao: z.string().trim().min(1),
  estados: z.array(z.string().trim().min(1)),
  esqueleto: z.string().trim().min(1),
});

const LigacaoTelasSchema = z.object({
  de: z.string().trim().min(1),
  para: z.string().trim().min(1),
  gesto: z.string().trim().min(1),
});

const JornadaTelasSchema = z.object({
  id: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  resumo: z.string().trim().min(1),
  cor: z.string().trim().min(1),
  passos: z.array(z.string().trim().min(1)).min(2),
});

const MapaTelasSchema = z
  .object({
    versao: z.literal(1),
    zonas: z.array(ZonaTelaSchema).min(1),
    telas: z.array(TelaMapaSchema).min(1),
    ligacoes: z.array(LigacaoTelasSchema),
    jornadas: z.array(JornadaTelasSchema),
  })
  .superRefine((mapa, contexto) => {
    const zonas = new Set<string>();
    for (const zona of mapa.zonas) {
      if (zonas.has(zona.id)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `zona repetida: ${zona.id}`,
        });
      }
      zonas.add(zona.id);
    }

    const telas = new Set<string>();
    for (const tela of mapa.telas) {
      if (telas.has(tela.id)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `tela repetida: ${tela.id}`,
        });
      }
      telas.add(tela.id);
      if (!zonas.has(tela.zona)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `zona ausente na tela ${tela.id}`,
        });
      }
    }

    for (const ligacao of mapa.ligacoes) {
      if (!telas.has(ligacao.de) || !telas.has(ligacao.para)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `ligacao com ponta ausente: ${ligacao.de} -> ${ligacao.para}`,
        });
      }
    }

    const jornadas = new Set<string>();
    for (const jornada of mapa.jornadas) {
      if (jornadas.has(jornada.id)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          message: `jornada repetida: ${jornada.id}`,
        });
      }
      jornadas.add(jornada.id);
      for (const passo of jornada.passos) {
        if (!telas.has(passo)) {
          contexto.addIssue({
            code: z.ZodIssueCode.custom,
            message: `jornada ${jornada.id} cita tela ausente: ${passo}`,
          });
        }
      }
    }
  });

export type MapaTelas = z.infer<typeof MapaTelasSchema>;

const pastaModulo = dirname(fileURLToPath(import.meta.url));
const caminhoMapa = resolve(
  pastaModulo,
  "..",
  "..",
  "..",
  "interno",
  "mapa-sistema.json",
);
const caminhoMapaTelas = resolve(
  pastaModulo,
  "..",
  "..",
  "..",
  "interno",
  "mapa-telas.json",
);

export function validarMapaSistema(valor: unknown): MapaSistema | null {
  const resultado = MapaSistemaSchema.safeParse(valor);
  return resultado.success ? resultado.data : null;
}

export function validarMapaTelas(valor: unknown): MapaTelas | null {
  const resultado = MapaTelasSchema.safeParse(valor);
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

export async function lerMapaTelas(): Promise<MapaTelas | null> {
  try {
    const texto = await readFile(caminhoMapaTelas, "utf8");
    return validarMapaTelas(JSON.parse(texto) as unknown);
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

  app.get("/mapa/telas", async (_requisicao, resposta) => {
    const mapa = await lerMapaTelas();
    if (!mapa) return resposta.send({ disponivel: false });
    return resposta.send({ disponivel: true, mapa });
  });
};
