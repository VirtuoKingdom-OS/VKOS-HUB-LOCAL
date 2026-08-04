// O QUE O WIZARD COLETA, e a ponte pro prompt que mora no servidor.
//
// O TEXTO DO PROMPT NAO MORA MAIS AQUI. Ele subiu pro servidor em 2026-08-04,
// pra fila do Assistente poder montar o mesmo prompt sem navegador aberto. Ver
// server/src/geracao/promptCarrossel.ts, que explica o que custou ter duas
// implementacoes.
//
// A importacao e de VALOR, e nao so de tipo: o Vite compila o modulo do
// servidor junto, do mesmo jeito que a ponte de tipos do CORE ja faz. Assim
// existe UMA implementacao, e as fixtures deste diretorio provam que a mudanca
// de casa nao mudou uma virgula do texto.

export {
  montarPromptCriacao,
  blocoMontagemEconomica,
} from "../../../../server/src/geracao/promptCarrossel";


import {
  instrucoesImagem,
  type IdFormato,
  type IdProporcao,
} from "../../config/fluxos";
import type { Peca } from "../../tipos/dominio";

// Modo de imagem escolhido no wizard.
export type ModoImagem = "sem" | "com" | "intercalado";
export type OrigemImagem = "usuario" | "ia";

// Visual personalizado da etapa 4, quando o usuario nao usa o do negocio.
export interface VisualPersonalizado {
  corFundo: string;
  corDestaque: string;
  corTexto: string;
  fonteTitulos: string;
  fonteCorpo: string;
}

// Tudo que o wizard coletou e que vira prompt.
export interface DadosCriacao {
  tema: string;
  detalhes: string;
  // Numero de paginas, ou null pra Auto (a IA decide). Post e story sempre null
  // (pagina unica).
  paginas: number | null;
  // Id do modelo de carrossel, ou "" pra deixar a IA escolher.
  estilo: string;
  // No wizard de carrossel, capa e paginas podem vir de modelos diferentes.
  estiloCapa: string;
  estiloPaginas: string;
  // Formato da geracao: carrossel de varias paginas ou pagina unica (post/story).
  formato: IdFormato;
  proporcao: IdProporcao;
  modoImagem: ModoImagem;
  // A geracao integrada de imagem existe no Codex. No Claude, o fluxo segue
  // aceitando apenas arquivos enviados pelo usuario.
  origemImagem: OrigemImagem;
  // Caminhos relativos das imagens ja enviadas via /api/anexos.
  caminhosImagens: string[];
  // Visual personalizado, ou null pra usar o do negocio (design-guide/Cerebro).
  visual: VisualPersonalizado | null;
  // Interruptor "Aprimorar com IA" da etapa de instrucoes finais. Ligado
  // (padrao, ou ausente em rascunho antigo): fluxo atual, nada muda. Desligado:
  // o prompt ganha o bloco de montagem economica no fim.
  aprimorarComIA?: boolean;
}

// Data de hoje no fuso local, no formato AAAA-MM-DD (o mesmo das pastas de peca).
export function dataHoje(dia = new Date()): string {
  const ano = dia.getFullYear();
  const mes = String(dia.getMonth() + 1).padStart(2, "0");
  const d = String(dia.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${d}`;
}

// Slug do tema: kebab sem acento, minusculo, no maximo 40 chars, sem hifen solto
// nas pontas. O corte respeita a fronteira de palavra: sem "design-d" no fim,
// porque o nome da pasta vira o titulo da peca na tela. Vazio vira "carrossel"
// pra nunca gerar pasta sem nome.
export function gerarSlug(tema: string): string {
  // Remove os diacriticos combinados (faixa unicode U+0300 a U+036F) depois do
  // NFD: assim "coração" vira "coracao", sem depender de char literal no fonte.
  const limpo = tema
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let cortado = limpo.slice(0, 40).replace(/-+$/g, "");
  if (limpo.length > 40 && limpo[40] !== "-") {
    const ultimoHifen = cortado.lastIndexOf("-");
    if (ultimoHifen > 0) cortado = cortado.slice(0, ultimoHifen);
  }
  return cortado || "carrossel";
}

// Nome de pasta unico pro dia: <data>-<slug>. Se ja existe peca com essa pasta,
// tenta -2, -3... ate achar um livre. Compara contra as pecas ja carregadas.
export function pastaUnica(
  tema: string,
  pecas: Peca[],
  dia = new Date()
): string {
  const base = `${dataHoje(dia)}-${gerarSlug(tema)}`;
  const usadas = new Set(pecas.map((p) => p.pasta));
  if (!usadas.has(base)) return base;
  let n = 2;
  while (usadas.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
