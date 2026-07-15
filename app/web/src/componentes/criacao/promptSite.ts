// Monta o prompt final do Site Guiado. O entregavel nao e texto (site.md), e um
// site HTML estatico completo, construido direto em conteudo/<pasta>/. O prompt
// instrui uma sessao headless: le o Cerebro pra voz e conteudo, le a metodologia
// da skill /site pro texto por secao, le principios-visuais.md pro visual, e
// entrega tudo pronto sem fazer nenhuma pergunta.

import type { DadosEtapasSite } from "./EtapasSite";

// Rotulo humano de cada secao, na ordem do metodo da skill /site.
const ROTULO_SECAO: Record<string, string> = {
  heroi: "Herói (topo, a promessa concreta e o CTA)",
  problema: "Problema, pra quem é (o cliente se reconhece na dor)",
  servicos: "Serviços (o que faz, com nome, e pacotes se houver)",
  provas: "Provas e diferencial (números, resultados, depoimentos reais)",
  sobre: "Sobre (curto, humano, do jeito do negócio)",
  faq: "FAQ (responde as objeções)",
  cta: "Chamada final (repete o convite, com o contato)",
};

// So os digitos de um numero de WhatsApp: tira espaco, parentese, hifen, sinal.
function limparNumero(v: string): string {
  return v.replace(/\D/g, "");
}

// A linha do formato: pagina unica, site com paginas ou link na bio.
function formatoLinha(formato: DadosEtapasSite["formato"]): string {
  if (formato === "completo") {
    return "- Formato: site com páginas. Entregue index.html mais as páginas separadas que fizerem sentido (por exemplo sobre.html, servicos.html, contato.html), com navegação entre elas por links relativos e um menu no topo.";
  }
  if (formato === "bio") {
    return "- Formato: link na bio, estilo linktree. Entregue um único index.html: uma página curta e centrada, com o nome do negócio, uma frase, e os links principais em botões grandes, o CTA em destaque. Sem seções longas de rolagem.";
  }
  return "- Formato: página única, uma landing de uma tela só. Entregue um único index.html com todas as seções numa rolagem só.";
}

// As secoes: Auto deixa a IA escolher pelo metodo; lista fixa manda usar aquelas.
function secoesLinhas(secoes: string[] | null): string {
  if (!secoes || secoes.length === 0) {
    return "Seções: escolha as seções que fizerem sentido pro negócio, seguindo o método da skill /site (herói, problema, serviços, provas, sobre, FAQ, chamada final). Não precisa usar todas.";
  }
  const nomes = secoes.map((s) => ROTULO_SECAO[s] ?? s);
  return ["Seções: use exatamente estas, nesta ordem:", ...nomes.map((n) => `- ${n}`)].join(
    "\n"
  );
}

// O objetivo numero 1 e o CTA principal. WhatsApp vira link wa.me com o numero
// limpo; os outros apontam pro link informado, ou pro contato do Cerebro.
function ctaLinhas(objetivo: DadosEtapasSite["objetivo"], link: string): string {
  const alvo = link.trim();
  const linhas = ["Objetivo e CTA principal:"];

  if (objetivo === "whatsapp") {
    if (alvo) {
      const num = limparNumero(alvo);
      linhas.push(
        `- O objetivo nº 1 é gerar contato no WhatsApp. O botão principal e todos os CTAs abrem https://wa.me/${num} (abrir em nova aba).`
      );
    } else {
      linhas.push(
        "- O objetivo nº 1 é gerar contato no WhatsApp. Use o WhatsApp do Cérebro como link https://wa.me/ com o número só de dígitos. Se o Cérebro não tiver número, aponte o CTA pra #contato."
      );
    }
  } else {
    const rotulo =
      objetivo === "agendamento"
        ? "agendamento"
        : objetivo === "orcamento"
          ? "orçamento"
          : "contato";
    if (alvo) {
      linhas.push(
        `- O objetivo nº 1 é ${rotulo}. O botão principal e os CTAs apontam pra ${alvo}.`
      );
    } else {
      linhas.push(
        `- O objetivo nº 1 é ${rotulo}. Use o contato do Cérebro no CTA. Se não houver, aponte pra #contato.`
      );
    }
  }

  linhas.push("- Um objetivo por página: tudo empurra pro CTA principal.");
  return linhas.join("\n");
}

// As imagens: com anexos do usuario, copiar pra img/ da peca e referenciar
// relativo; sem imagens, resolver com cor, gradiente, forma e tipografia.
function imagensLinhas(dados: DadosEtapasSite, pasta: string): string {
  if (dados.modoImagem === "sem" || dados.anexos.length === 0) {
    return [
      "Imagens:",
      "- Sem imagens do usuário. Resolva o visual com gradientes, formas, cor e tipografia. Não use nenhuma imagem de stock externa nem link pra imagem que não existe.",
    ].join("\n");
  }
  const caminhos = dados.anexos.map((a) => a.caminhoRelativo).join(", ");
  return [
    "Imagens:",
    `- O usuário enviou imagens em: ${caminhos}.`,
    `- Copie os arquivos que você usar pra conteudo/${pasta}/img/ e referencie por caminho relativo (por exemplo img/foto.jpg). Não referencie os caminhos originais.`,
  ].join("\n");
}

// Visual personalizado: as mesmas linhas de cor e fonte do prompt do carrossel.
function visualLinha(dados: DadosEtapasSite): string {
  return `Visual personalizado: ignore as cores do design-guide nesta geração. Use fundo ${dados.corFundo}, destaque ${dados.corDestaque}, texto ${dados.corTexto}, fonte dos títulos ${dados.fonteTitulos}, fonte do corpo ${dados.fonteCorpo} (importe do Google Fonts se precisar).`;
}

// Prompt completo pronto pra criarSessao. Sem perguntas: a sessao le os arquivos
// de contexto, escreve o conteudo pelo metodo da skill e entrega o site em HTML.
export function montarPromptSite(dados: DadosEtapasSite, pasta: string): string {
  const tema = dados.tema.trim();
  const partes: string[] = [];

  partes.push(
    `Construa um site HTML estático completo, bonito e pronto pra publicar sobre: ${tema}.`
  );

  partes.push(
    [
      "Antes de escrever, leia estes arquivos do workspace:",
      "- cerebro/cerebro.md: a identidade do negócio (voz, oferta, dor, desejo, provas, cidade, contato). É a fonte da verdade do conteúdo.",
      "- .claude/skills/site/SKILL.md: a metodologia de texto por seção. Siga o método pra escrever o texto de cada seção na voz do negócio, mas NÃO salve site.md: o entregável é o site em HTML, não o texto solto.",
      "- templates/site/principios-visuais.md: os princípios visuais (tokens de cor, tipografia, componentes, motion, responsivo, armadilhas). Aplique no CSS.",
    ].join("\n")
  );

  partes.push(
    [
      "Onde salvar e como nomear:",
      `- Salve tudo em conteudo/${pasta}/ (crie a pasta com esse nome exato).`,
      formatoLinha(dados.formato),
      "- O CSS pode ficar num styles.css na mesma pasta ou embutido no HTML. Todos os caminhos de recurso são relativos. Pode importar fontes do Google Fonts.",
      "- PROIBIDO criar um arquivo chamado carrossel.html. PROIBIDO salvar qualquer arquivo .md nessa pasta: senão o app classifica o site errado.",
    ].join("\n")
  );

  // Bio nao tem secoes longas: o formato ja diz o que fazer.
  if (dados.formato !== "bio") {
    partes.push(secoesLinhas(dados.secoes));
  }

  partes.push(ctaLinhas(dados.objetivo, dados.linkObjetivo));
  partes.push(imagensLinhas(dados, pasta));

  if (dados.visualModo === "personalizado") {
    partes.push(visualLinha(dados));
  } else {
    partes.push(
      "Visual: use as cores e as fontes da marca (design-guide e Cérebro), seguindo os princípios visuais. Se não houver paleta definida, escolha uma que combine com o negócio."
    );
  }

  partes.push(
    [
      "Exigências finais:",
      "- Site responsivo mobile-first: precisa ficar bom em 390px de largura e em 1440px.",
      "- Capriche no visual: hierarquia clara, respiro generoso, contraste confortável, motion sutil (reveal on-scroll leve, com prefers-reduced-motion desligando tudo).",
      "- Tudo local e relativo: nenhuma imagem de stock externa, nenhum link pra recurso que não existe.",
      "- Marcação amigável ao editor: os filhos diretos do <body> são as seções semânticas da página (header, main, section, footer) quando o layout permitir. Camada decorativa (partículas, orbs, fundo animado) sempre com aria-hidden=\"true\".",
      "- Todo botão ou cartão clicável é um <a>, mesmo desativado ou \"em breve\": nesse caso um <a> SEM atributo href e com aria-disabled=\"true\", que não navega. Nunca use pointer-events pra desligar interação.",
      "- Escrita: frase curta e direta, português brasileiro. NUNCA use travessão (—) nem o caractere ·, em nenhum texto do site, nem no <title>. Use vírgula, ponto ou dois-pontos.",
      "- Não faça nenhuma pergunta: decida com bom senso e entregue o site pronto.",
    ].join("\n")
  );

  const detalhes = dados.detalhes.trim();
  if (detalhes) {
    partes.push(`Detalhes que o usuário deu:\n${detalhes}`);
  }

  return partes.join("\n\n");
}
