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
import { blocoSemCerebro } from "./blocoSemCerebro";

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
  estiloCta?: string;
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
  // Geracao sem Cerebro: so quando o negocio ainda nao tem Cerebro e o usuario
  // escolheu seguir mesmo assim. Ausente = fluxo normal com Cerebro.
  semCerebro?: boolean;
  // Descricao livre do negocio, opcional, usada apenas no modo sem Cerebro.
  descricaoNegocio?: string;
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

function arquivoDoModelo(id: string): string {
  const seguro = id.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return seguro === "dark" ? "modelo.html" : `modelo-${seguro}.html`;
}

// A frase do comando ativa o caminho rapido da skill. Este bloco transforma a
// escolha visual em contrato verificavel, para o agente usar o arquivo real
// como base em vez de apenas imitar o nome do modelo.
function contratoModelo(dados: DadosCriacao, pasta: string): string {
  const capa = dados.estiloCapa?.trim() ?? "";
  const paginas = dados.estiloPaginas?.trim() ?? "";
  const cta = dados.estiloCta?.trim() ?? "";
  const simples = capa || paginas || dados.estilo.trim();
  if (!simples) {
    return [
      "CONTRATO DO MODELO VISUAL:",
      "- Nenhum modelo foi travado na interface. Escolha um pelo método da skill e use o arquivo real como base estrutural.",
    ].join("\n");
  }

  if (cta && cta !== paginas) {
    return [
      "CONTRATO OBRIGATÓRIO DOS MODELOS ESCOLHIDOS:",
      `- Capa: ${capa || paginas}, arquivo templates/carrossel/${arquivoDoModelo(capa || paginas)}.`,
      `- Páginas de conteúdo: ${paginas || capa}, arquivo templates/carrossel/${arquivoDoModelo(paginas || capa)}.`,
      `- Fecho e CTA: ${cta}, arquivo templates/carrossel/${arquivoDoModelo(cta)}.`,
      `- Copie primeiro o arquivo de páginas para conteudo/${pasta}/carrossel.html. Transplante a primeira .slide da capa quando ela diferir e transplante a última .slide do modelo de CTA, sempre com classes exclusivas e somente o CSS necessário e escopado.`,
      "- Não redesenhe nem substitua esses modelos por uma interpretação parecida. Preserve estrutura, classes, geometria, hierarquia, ritmo, componentes e acabamento dos arquivos escolhidos.",
      "- Cores, fontes, imagens e instruções finais personalizam o conteúdo dentro dos modelos; não autorizam trocar a anatomia escolhida, salvo pedido explícito do usuário.",
      "- Antes de concluir, compare o HTML final com os três arquivos e confirme a origem da capa, das páginas e do CTA, sem vazamento de CSS.",
    ].join("\n");
  }

  if (capa && paginas && capa !== paginas) {
    return [
      "CONTRATO OBRIGATÓRIO DOS MODELOS ESCOLHIDOS:",
      `- Capa: ${capa}, arquivo templates/carrossel/${arquivoDoModelo(capa)}.`,
      `- Páginas de conteúdo e CTA: ${paginas}, arquivo templates/carrossel/${arquivoDoModelo(paginas)}.`,
      `- Copie primeiro o arquivo de páginas para conteudo/${pasta}/carrossel.html. Depois transplante a primeira .slide e somente o CSS necessário da capa ${capa}, com classe exclusiva e regras escopadas.`,
      "- Não redesenhe nem substitua esses modelos por uma interpretação parecida. Preserve estrutura, classes, geometria, hierarquia, ritmo, componentes e acabamento dos arquivos escolhidos.",
      "- Cores, fontes, imagens e instruções finais personalizam o conteúdo dentro dos modelos; não autorizam trocar a anatomia escolhida, salvo pedido explícito do usuário.",
      "- Antes de concluir, compare o HTML final com os dois arquivos e confirme que a capa vem do modelo de capa e as demais páginas vêm do modelo de páginas, sem vazamento de CSS.",
    ].join("\n");
  }

  return [
    "CONTRATO OBRIGATÓRIO DO MODELO ESCOLHIDO:",
    `- Modelo: ${simples}, arquivo templates/carrossel/${arquivoDoModelo(simples)}.`,
    `- Antes de escrever o conteúdo, copie esse arquivo para conteudo/${pasta}/carrossel.html e edite a cópia.`,
    "- Não redesenhe nem substitua o modelo por uma interpretação parecida. Preserve estrutura, classes, geometria, hierarquia, ritmo, componentes e acabamento do arquivo escolhido.",
    "- Cores, fontes, imagens e instruções finais personalizam o conteúdo dentro do modelo; não autorizam trocar a anatomia escolhida, salvo pedido explícito do usuário.",
    "- Antes de concluir, compare o HTML final com o arquivo do modelo e confira que os tipos de slide e as classes estruturais continuam reconhecíveis.",
  ].join("\n");
}

// Bloco anexado ao prompt quando o interruptor "Aprimorar com IA" esta
// desligado. Nao muda nenhuma linha dos blocos do modo ligado: so ANEXA. O modo
// montagem tira toda a liberdade criativa: o modelo barato copia o template e
// preenche com o conteudo do usuario e do Cerebro, nada mais.
export function blocoMontagemEconomica(semCerebro = false): string {
  return [
    "MODO MONTAGEM (o usuário desligou o Aprimorar com IA):",
    "- Esta geração é montagem, não criação. Siga o template modelo-X.html indicado no contrato acima SEM alterar anatomia, cores, fontes ou layout.",
    semCerebro
      ? "- O conteúdo vem das instruções finais do usuário. Não invente direção de arte."
      : "- O conteúdo vem das instruções finais do usuário e do Cérebro. Não invente direção de arte.",
    "- Não adicione elementos novos que o template não tem. Não redesenhe nada.",
    "- Preencha o template com o conteúdo e pare.",
  ].join("\n");
}

// Prompt completo pronto pra criarSessao. Base /carrossel <tema>, o modelo de
// estilo como sufixo quando escolhido, as instrucoes de formato e dimensao
// (reusadas de fluxos.ts) e o bloco de detalhes desta geracao.
export function montarPromptCriacao(dados: DadosCriacao, pasta: string): string {
  const tema = dados.tema.trim();
  const estiloCapa = dados.estiloCapa?.trim() ?? "";
  const estiloPaginas = dados.estiloPaginas?.trim() ?? "";
  const estiloCta = dados.estiloCta?.trim() ?? "";
  const estiloSimples = estiloCapa || estiloPaginas || dados.estilo;
  const base =
    estiloCta && estiloCta !== estiloPaginas
      ? `/carrossel ${tema}, usando a capa do modelo ${estiloCapa || estiloPaginas}, as paginas do modelo ${estiloPaginas || estiloCapa} e o CTA do modelo ${estiloCta}`
      : estiloCapa && estiloPaginas && estiloCapa !== estiloPaginas
      ? `/carrossel ${tema}, usando a capa do modelo ${estiloCapa} e as paginas do modelo ${estiloPaginas}`
      : estiloSimples
        ? `/carrossel ${tema}, usando o modelo ${estiloSimples}`
        : `/carrossel ${tema}`;

  const semCerebro = dados.semCerebro === true;
  const partes = [base];

  // Instrucao de topo do modo sem Cerebro: logo apos o comando, antes do
  // contrato do modelo, pra o agente nunca procurar uma identidade que nao existe.
  if (semCerebro) {
    partes.push(blocoSemCerebro(dados.descricaoNegocio));
  }

  partes.push(
    contratoModelo(dados, pasta),
    instrucoesImagem(dados.formato, dados.proporcao, "instagram"),
    linhasExtras(dados, pasta),
  );

  const detalhes = dados.detalhes.trim();
  if (detalhes) {
    partes.push(
      `INSTRUÇÕES FINAIS DO USUÁRIO, preserve integralmente o conteúdo e a ordem quando ele trouxer um roteiro:\n${detalhes}`,
    );
  }

  // Modo economico: o bloco de montagem e ANEXADO no fim. Nenhuma linha dos
  // blocos do modo ligado muda.
  if (dados.aprimorarComIA === false) {
    partes.push(blocoMontagemEconomica(semCerebro));
  }

  return partes.join("\n\n");
}

export function modelosUsadosDaCriacao(dados: DadosCriacao): string[] {
  return [...new Set([
    dados.estilo,
    dados.estiloCapa,
    dados.estiloPaginas,
    dados.estiloCta ?? "",
  ].map((id) => id.trim()).filter(Boolean))];
}
