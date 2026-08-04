// O PROMPT DE UMA GERAÇÃO DE CARROSSEL.
//
// Ele morava em `web/src/componentes/criacao/prompt.ts` e subiu pro servidor em
// 2026-08-04. O arquivo do web agora reexporta daqui, e as fixtures de lá são a
// prova de que a mudança de casa não mudou uma vírgula do texto.
//
// POR QUE ELE PRECISA MORAR AQUI. A fila do Assistente monta prompt sem
// navegador nenhum aberto. Quando a Fase 1 do plano do Assistente pediu esta
// mudança, o que aconteceu foi uma REESCRITA de vinte linhas em vez de uma
// mudança de casa: o servidor passou a ter um prompt próprio, magro, que tinha
// perdido o contrato do modelo visual, as instruções de formato, o modo direto
// e, o mais caro, a linha que manda a skill NÃO renderizar PNG. As duas
// primeiras peças criadas pelo Assistente nasceram com PNG em instagram/, e
// peça com PNG é legado, e legado o Studio não abre.
//
// Duas implementações do mesmo prompt divergem no primeiro dia. Esta é a única.

import type { DadosCriacaoEntrada as DadosCriacao } from "./modelo.js";
import { instrucoesImagem } from "./formato.js";

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
  const simples = capa || paginas || dados.estilo.trim();
  if (!simples) {
    return [
      "CONTRATO DO MODELO VISUAL:",
      "- Nenhum modelo foi travado na interface. Escolha um pelo método da skill e use o arquivo real como base estrutural.",
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
export function blocoMontagemEconomica(): string {
  return [
    "MODO MONTAGEM (o usuário desligou o Aprimorar com IA):",
    "- Esta geração é montagem, não criação. Siga o template modelo-X.html indicado no contrato acima SEM alterar anatomia, cores, fontes ou layout.",
    "- O conteúdo vem das instruções finais do usuário e do Cérebro. Não invente direção de arte.",
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
  const estiloSimples = estiloCapa || estiloPaginas || dados.estilo;
  const base =
    estiloCapa && estiloPaginas && estiloCapa !== estiloPaginas
      ? `/carrossel ${tema}, usando a capa do modelo ${estiloCapa} e as paginas do modelo ${estiloPaginas}`
      : estiloSimples
        ? `/carrossel ${tema}, usando o modelo ${estiloSimples}`
        : `/carrossel ${tema}`;

  const partes = [
    base,
    contratoModelo(dados, pasta),
    instrucoesImagem(dados.formato, dados.proporcao, "instagram"),
    linhasExtras(dados, pasta),
  ];

  const detalhes = dados.detalhes.trim();
  if (detalhes) {
    partes.push(
      `INSTRUÇÕES FINAIS DO USUÁRIO, preserve integralmente o conteúdo e a ordem quando ele trouxer um roteiro:\n${detalhes}`,
    );
  }

  // Modo economico: o bloco de montagem e ANEXADO no fim. Nenhuma linha dos
  // blocos do modo ligado muda.
  if (dados.aprimorarComIA === false) {
    partes.push(blocoMontagemEconomica());
  }

  return partes.join("\n\n");
}

