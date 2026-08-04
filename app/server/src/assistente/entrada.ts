// O QUE O ASSISTENTE PRECISA ESCREVER, e o que o Hub completa por ele.
//
// POR QUE ISTO EXISTE. A tarefa que a fila executa carrega os dados COMPLETOS
// de uma criação: um carrossel tem 14 campos, um site tem 16. Eles existem
// porque a criação guiada os colhe em cinco etapas, com o dono escolhendo
// proporção, estilo de capa, modo de imagem e paleta.
//
// Numa conversa de texto o assistente não tem nada disso. Exigir os 14 campos
// dele é exigir que ele INVENTE 12: ou ele chuta, ou o lote é recusado. Foi o
// que aconteceu na primeira conversa real, em 2026-08-04: o assistente escreveu
// `{tema, briefing}`, o schema recusou os 22 campos que faltavam, e o erro
// morreu num catch vazio. O dono viu a IA dizer "criei o lote.json" e a fila
// vazia do lado.
//
// A separação aqui é essa: a ENTRADA é o pouco que só o assistente sabe, saído
// da conversa. O resto são as MESMAS escolhas iniciais da criação guiada, e o
// servidor as aplica. Campo que o dono não escolheu na conversa nasce com o
// padrão do Hub, e não com um chute da IA.
//
// Quem quiser mudar um padrão mexe em PADRAO_CARROSSEL e PADRAO_SITE, aqui.

import { z } from "zod";

import {
  DadosAnuncioSchema,
  DadosCriacaoSchema,
  DadosSiteSchema,
  type DadosAnuncio,
  type DadosCriacao,
  type DadosSite,
} from "../geracao/modelo.js";

// ==========================================================================
// 1. O QUE O ASSISTENTE ESCREVE
// ==========================================================================

// Carrossel. `tema` e `detalhes` são o pedido; o resto é escolha de formato, e
// o assistente só a envia quando o dono disse algo a respeito na conversa.
export const EntradaCarrosselSchema = z.object({
  tema: z.string().min(1),
  detalhes: z.string().min(1),
  paginas: z.number().int().min(2).max(15).nullable().optional(),
  formato: z.enum(["multiplas", "unica"]).optional(),
  proporcao: z.enum(["1x1", "4x5", "9x16"]).optional(),
  modoImagem: z.enum(["sem", "com", "intercalado"]).optional(),
  estilo: z.string().optional(),
}).strict();

export const EntradaSiteSchema = z.object({
  tema: z.string().min(1),
  detalhes: z.string().min(1),
  formato: z.enum(["unica", "completo", "bio"]).optional(),
  objetivo: z.enum(["whatsapp", "agendamento", "orcamento", "contato"]).optional(),
  linkObjetivo: z.string().optional(),
  secoesLivre: z.string().optional(),
  modoImagem: z.enum(["sem", "com", "ia"]).optional(),
}).strict();

// Anúncio não ganha padrão para oferta, destino, praça e orçamento de
// propósito: são as quatro perguntas que a criação guiada faz porque o Cérebro
// não tem como responder. Um padrão aqui seria o Hub inventando para onde vai o
// clique e quanto o dono pode gastar por dia.
export const EntradaAnuncioSchema = z.object({
  oferta: z.string().min(1),
  objetivo: z.string().min(1),
  destino: z.enum(["whatsapp", "landing", "agendamento", "telefone"]),
  // A chave é obrigatória, o conteúdo pode ser vazio: é assim na criação
  // guiada, onde quem escolhe WhatsApp às vezes ainda não tem o link em mãos.
  // Exigir conteúdo aqui reprovaria um lote que o fluxo normal aceitaria.
  linkDestino: z.string(),
  praca: z.string().min(1),
  orcamentoDiario: z.string().min(1),
  raio: z.string().optional(),
  detalhes: z.string().optional(),
}).strict();

export type EntradaCarrossel = z.infer<typeof EntradaCarrosselSchema>;
export type EntradaSite = z.infer<typeof EntradaSiteSchema>;
export type EntradaAnuncio = z.infer<typeof EntradaAnuncioSchema>;

// ==========================================================================
// 2. O QUE O HUB COMPLETA
// ==========================================================================

// Os mesmos valores iniciais de `criarDadosEtapas` da criação guiada. Eles
// moram aqui em constante, e não espalhados no completar, pra o contrato do
// prompt poder DIZER qual é o padrão de cada campo em vez de só dizer que existe
// um.
export const PADRAO_CARROSSEL = {
  paginas: null,
  formato: "multiplas",
  proporcao: "4x5",
  modoImagem: "sem",
  origemImagem: "usuario",
  estilo: "",
  aprimorarComIA: true,
} as const;

export const PADRAO_SITE = {
  formato: "completo",
  objetivo: "whatsapp",
  modoImagem: "sem",
  visualModo: "negocio",
  aprimorarComIA: true,
} as const;

export function completarCarrossel(entrada: EntradaCarrossel): DadosCriacao {
  // Estilo escolhido vale pra capa e pras páginas: a criação guiada tem os dois
  // controles separados, mas quem pede por conversa não distingue os dois, e
  // divergir eles aqui inventaria uma escolha que ninguém fez.
  const estilo = entrada.estilo ?? PADRAO_CARROSSEL.estilo;
  return DadosCriacaoSchema.parse({
    tema: entrada.tema,
    detalhes: entrada.detalhes,
    paginas: entrada.paginas ?? PADRAO_CARROSSEL.paginas,
    estilo,
    estiloCapa: estilo,
    estiloPaginas: estilo,
    formato: entrada.formato ?? PADRAO_CARROSSEL.formato,
    proporcao: entrada.proporcao ?? PADRAO_CARROSSEL.proporcao,
    modoImagem: entrada.modoImagem ?? PADRAO_CARROSSEL.modoImagem,
    origemImagem: PADRAO_CARROSSEL.origemImagem,
    // Sem anexo nenhum: o assistente conversa por texto e não tem arquivo do
    // dono em mãos. Pedir imagem própria numa tarefa dessas seria prometer um
    // arquivo que não existe.
    caminhosImagens: [],
    // Visual nulo é "usa a identidade do negócio", que é o padrão da criação
    // guiada. Cor escolhida por IA seria a IA decidindo a marca do dono.
    visual: null,
    aprimorarComIA: PADRAO_CARROSSEL.aprimorarComIA,
  });
}

export function completarSite(entrada: EntradaSite): DadosSite {
  return DadosSiteSchema.parse({
    tema: entrada.tema,
    detalhes: entrada.detalhes,
    formato: entrada.formato ?? PADRAO_SITE.formato,
    objetivo: entrada.objetivo ?? PADRAO_SITE.objetivo,
    objetivoLivre: "",
    linkObjetivo: entrada.linkObjetivo ?? "",
    secoesLivre: entrada.secoesLivre ?? "",
    modoImagem: entrada.modoImagem ?? PADRAO_SITE.modoImagem,
    anexos: [],
    visualModo: PADRAO_SITE.visualModo,
    corFundo: "",
    corDestaque: "",
    corTexto: "",
    fonteTitulos: "",
    fonteCorpo: "",
    aprimorarComIA: PADRAO_SITE.aprimorarComIA,
  });
}

export function completarAnuncio(entrada: EntradaAnuncio): DadosAnuncio {
  return DadosAnuncioSchema.parse({
    oferta: entrada.oferta,
    objetivo: entrada.objetivo,
    destino: entrada.destino,
    linkDestino: entrada.linkDestino,
    praca: entrada.praca,
    raio: entrada.raio ?? "",
    orcamentoDiario: entrada.orcamentoDiario,
    detalhes: entrada.detalhes ?? "",
  });
}
