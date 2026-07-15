// Monta o prompt final do assistente de criacao e resolve a pasta alvo.
// Reusa instrucoesImagem de config/fluxos.ts: o formato aqui e sempre carrossel
// de varias paginas ("multiplas"), so a proporcao muda. Nao duplica a regra de
// formato e dimensao que ja vive la.

import {
  instrucoesImagem,
  type IdFormato,
  type IdProporcao,
} from "../../config/fluxos";
import type { Peca } from "../../tipos/dominio";

// Modo de imagem escolhido no wizard.
export type ModoImagem = "sem" | "com" | "intercalado";

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
  // Formato da geracao: carrossel de varias paginas ou pagina unica (post/story).
  formato: IdFormato;
  proporcao: IdProporcao;
  modoImagem: ModoImagem;
  // Caminhos relativos das imagens ja enviadas via /api/anexos.
  caminhosImagens: string[];
  // Visual personalizado, ou null pra usar o do negocio (design-guide/Cerebro).
  visual: VisualPersonalizado | null;
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

// Monta as linhas extras que descrevem a geracao: pasta alvo, quantidade,
// imagens e visual personalizado. Os detalhes livres do usuario entram depois,
// em paragrafo proprio.
function linhasExtras(dados: DadosCriacao, pasta: string): string {
  const linhas: string[] = ["Detalhes desta geracao:"];

  linhas.push(
    `- Salve exatamente em conteudo/${pasta}/ (crie a pasta com esse nome exato).`
  );

  if (dados.paginas != null) {
    linhas.push(`- O carrossel tem exatamente ${dados.paginas} paginas.`);
  }

  if (dados.modoImagem === "sem") {
    linhas.push(
      "- Nao use imagem nenhuma, escolha um modelo que funcione sem imagem."
    );
  } else if (dados.caminhosImagens.length > 0) {
    const caminhos = dados.caminhosImagens.join(", ");
    linhas.push(
      `- Use as imagens anexadas em ${caminhos} como imagens das paginas (copie pra img/ da peca).`
    );
    if (dados.modoImagem === "intercalado") {
      linhas.push("- Alterne pagina com imagem e pagina so de texto.");
    }
  }

  if (dados.visual) {
    const v = dados.visual;
    linhas.push(
      `- Ignore as cores do design-guide nesta geracao. Use fundo ${v.corFundo}, destaque ${v.corDestaque}, texto ${v.corTexto}, fonte dos titulos ${v.fonteTitulos}, fonte do corpo ${v.fonteCorpo} (importe do Google Fonts se precisar).`
    );
  }

  return linhas.join("\n");
}

// Prompt completo pronto pra criarSessao. Base /carrossel <tema>, o modelo de
// estilo como sufixo quando escolhido, as instrucoes de formato e dimensao
// (reusadas de fluxos.ts) e o bloco de detalhes desta geracao.
export function montarPromptCriacao(dados: DadosCriacao, pasta: string): string {
  const tema = dados.tema.trim();
  const base = dados.estilo
    ? `/carrossel ${tema}, usando o modelo ${dados.estilo}`
    : `/carrossel ${tema}`;

  const partes = [
    base,
    instrucoesImagem(dados.formato, dados.proporcao, "instagram"),
    linhasExtras(dados, pasta),
  ];

  const detalhes = dados.detalhes.trim();
  if (detalhes) {
    partes.push(`Detalhes que o usuario deu:\n${detalhes}`);
  }

  return partes.join("\n\n");
}
