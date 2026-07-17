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
  } else if (dados.origemImagem === "ia") {
    linhas.push(
      `- Use explicitamente $imagegen para criar quantas imagens originais forem necessarias para esta peca. Decida a quantidade depois de escrever o roteiro de cada pagina. Salve cada arquivo final dentro de conteudo/${pasta}/img/ e referencie apenas caminhos relativos no carrossel.html.`,
      "- Planeje a imagem pagina por pagina. Cada imagem precisa representar o argumento, a cena ou a emocao daquela pagina. Nao repita a mesma imagem em varias paginas por conveniencia. Reutilize somente quando a repeticao tiver uma funcao visual intencional e clara.",
      "- Se varias paginas pedirem imagem, gere imagens diferentes para cada contexto. Se o ritmo funcionar melhor intercalado, deixe paginas de texto entre elas. A decisao e editorial, nao um molde fixo.",
      "- As imagens precisam seguir o tema, a identidade do Cerebro e o modelo visual escolhido. Nao use imagem externa, placeholder, URL remota nem arquivo fora da pasta da peca.",
      "- Toda imagem de conteudo precisa ser editavel depois: use <img> ou background-image em um elemento HTML real. Nao coloque imagens de conteudo em pseudo-elementos CSS.",
      "- Borda, mascara, sombra e overlay ligados a uma imagem devem ficar no proprio elemento ou no container real que envolve essa imagem. Nao espalhe a mesma composicao em elementos distantes: o Studio precisa conseguir selecionar o container e excluir o conjunto inteiro.",
      "- Nesta geracao a imagem e obrigatoria. Nao aplique o fallback de seguir sem imagem."
    );
    if (dados.modoImagem === "intercalado") {
      linhas.push(
        "- Use ritmo intercalado: combine paginas com imagem contextual e paginas so de texto. Nao force alternancia mecanica se duas paginas consecutivas precisarem de imagens diferentes."
      );
    }
  } else if (dados.caminhosImagens.length > 0) {
    const caminhos = dados.caminhosImagens.join(", ");
    linhas.push(
      `- Use as imagens anexadas em ${caminhos} como imagens das paginas (copie pra img/ da peca).`
    );
    linhas.push(
      "- Distribua as imagens pelo contexto de cada pagina. Nao replique a mesma imagem em todas as paginas. Reutilize apenas quando isso fizer sentido editorial.",
      "- Toda imagem de conteudo precisa ser editavel depois: use <img> ou background-image em um elemento HTML real, nunca em pseudo-elemento CSS.",
      "- Borda, mascara, sombra e overlay ligados a uma imagem devem ficar no proprio elemento ou no container real que envolve essa imagem, para o Studio excluir o conjunto inteiro."
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
  const estiloCapa = dados.estiloCapa?.trim() ?? "";
  const estiloPaginas = dados.estiloPaginas?.trim() ?? "";
  const estiloSimples = estiloCapa || estiloPaginas || dados.estilo;
  const base =
    estiloCapa && estiloPaginas && estiloCapa !== estiloPaginas
      ? `/carrossel ${tema}, usando a capa do modelo ${estiloCapa} e as paginas do modelo ${estiloPaginas}`
      : estiloSimples
        ? `/carrossel ${tema}, usando o modelo ${estiloSimples}`
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
