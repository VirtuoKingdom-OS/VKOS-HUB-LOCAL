// Monta o prompt final do Site Guiado. O entregavel nao e texto (site.md), e um
// site HTML estatico completo, construido direto em conteudo/<pasta>/. O prompt
// instrui uma sessao headless em tres blocos, nesta ordem: bloco 1 O DESIGN VEM
// PRIMEIRO (le o Cerebro, os principios visuais, a cartela e o indice de estilos,
// escolhe uma direcao e um estilo, declara a escolha e aplica o sistema inteiro),
// bloco 2 conteudo e estrutura (skill /site, objetivo, secoes, CTA, imagens), e
// bloco 3 regras tecnicas compactas (salvamento, caminhos, marcadores do site).
// Entrega tudo pronto sem fazer nenhuma pergunta.

import type { DadosEtapasSite } from "./EtapasSite";
import { blocoSemCerebro } from "./blocoSemCerebro";

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
    return "- Formato: link na bio. Entregue um único index.html: uma página curta e centrada, com o nome do negócio, uma frase e os links principais em CTAs grandes. Sem seções longas de rolagem. Use <main> como container semântico direto do <body>, sem um <div> genérico envolvendo todo o conteúdo.";
  }
  return "- Formato: página única, uma landing de uma tela só. Entregue um único index.html com todas as seções numa rolagem só.";
}

// As secoes: vazio deixa a IA escolher pelo metodo; texto livre preserva a
// estrutura e a ordem pedidas pelo usuario.
function secoesLinhas(secoesLivre: string): string {
  const descricao = secoesLivre.trim();
  if (!descricao) {
    return "Seções: escolha as seções que fizerem sentido pro negócio, seguindo o método da skill /site (herói, problema, serviços, provas, sobre, FAQ, chamada final). Não precisa usar todas.";
  }
  return `Seções: monte a estrutura seguindo esta descrição do usuário, na ordem que ele deu (adapte nomes ao método da skill /site sem inventar seção que ele não pediu):\n${descricao}`;
}

// O objetivo numero 1 e o CTA principal. WhatsApp vira link wa.me com o numero
// limpo; os outros apontam pro link informado, ou pro contato do Cerebro. No
// modo sem Cerebro nao ha contato de negocio pra recuperar: o CTA sem link
// aponta pra #contato, sem citar o Cerebro.
function ctaLinhas(
  objetivo: DadosEtapasSite["objetivo"],
  link: string,
  semCerebro: boolean,
): string {
  const alvo = link.trim();
  const linhas = ["Objetivo e CTA principal:"];

  if (objetivo === "whatsapp") {
    if (alvo) {
      const num = limparNumero(alvo);
      linhas.push(
        `- O objetivo nº 1 é gerar contato no WhatsApp. O botão principal e todos os CTAs abrem https://wa.me/${num} (abrir em nova aba).`
      );
    } else if (semCerebro) {
      linhas.push(
        "- O objetivo nº 1 é gerar contato no WhatsApp. Sem número informado, aponte o CTA pra #contato e deixe claro no texto que o contato ainda será definido."
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
    } else if (semCerebro) {
      linhas.push(
        `- O objetivo nº 1 é ${rotulo}. Sem link informado, aponte os CTAs pra #contato.`
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
  if (dados.modoImagem === "ia") {
    return [
      "Imagens:",
      `- Use explicitamente $imagegen para criar quantas imagens originais forem necessarias para este site. Decida a quantidade depois de definir a funcao e a mensagem de cada secao. Salve cada arquivo final em conteudo/${pasta}/img/ e use apenas caminhos relativos no HTML.`,
      "- Planeje a imagem secao por secao e pagina por pagina. Cada imagem precisa responder ao conteudo que acompanha. Nao use a mesma imagem em todo o site por conveniencia. Reutilize apenas quando houver uma funcao visual intencional, como continuidade entre secoes.",
      "- Gere imagens diferentes quando hero, prova, servico, sobre ou CTA pedirem contextos diferentes. Secoes que funcionam melhor sem imagem devem usar tipografia, cor e composicao.",
      "- As imagens precisam seguir a identidade do Cerebro e o visual escolhido. Nao use stock externo, placeholder, URL remota nem arquivo fora da pasta do site.",
      "- Toda imagem de conteudo precisa continuar editavel no Studio: use <img> ou background-image em um elemento HTML real. Nao use pseudo-elemento CSS para imagem de conteudo.",
      "- Borda, mascara, sombra e overlay ligados a uma imagem devem ficar no proprio elemento ou no container real que envolve essa imagem, para o Studio selecionar e excluir o conjunto inteiro.",
    ].join("\n");
  }
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
    "- Distribua cada imagem conforme o contexto da secao ou pagina. Nao repita a mesma imagem em todo o site por conveniencia.",
    "- Toda imagem de conteudo precisa continuar editavel no Studio: use <img> ou background-image em um elemento HTML real, nunca em pseudo-elemento CSS.",
    "- Borda, mascara, sombra e overlay ligados a uma imagem devem ficar no proprio elemento ou no container real que envolve essa imagem, para o Studio selecionar e excluir o conjunto inteiro.",
  ].join("\n");
}

// Visual personalizado: as cores do usuario substituem SO os tokens de cor do
// estilo escolhido. A escala tipografica, o spacing, o motion e a personalidade
// continuam vindo do estilo. As fontes do usuario entram como familias, dentro
// da escala do estilo.
function visualLinha(dados: DadosEtapasSite): string {
  return [
    `Visual personalizado: as cores escolhidas pelo usuário substituem apenas os tokens de cor do estilo. Use fundo ${dados.corFundo}, destaque ${dados.corDestaque} e texto ${dados.corTexto}.`,
    `A escala tipográfica, o spacing, o motion e a personalidade continuam vindo do estilo escolhido. Use ${dados.fonteTitulos} nos títulos e ${dados.fonteCorpo} no corpo (importe do Google Fonts se precisar), sempre dentro da escala e do tracking do estilo.`,
  ].join("\n");
}

// Os marcadores da peca 1: ancoras invisiveis que o conversor Astro usa como
// pontos de corte. Obrigatorios no site com paginas (multipagina); nos outros
// formatos nao custam. Inclui um exemplo minimo do corpo de cada pagina.
function marcadoresLinhas(formato: DadosEtapasSite["formato"]): string {
  const obrigatorio = formato === "completo";
  return [
    obrigatorio
      ? "Marcadores do site com páginas (OBRIGATÓRIOS neste formato):"
      : "Marcadores de estrutura (opcionais neste formato, mas não custam):",
    "- A navegação compartilhada fica dentro de <nav data-vk-nav>, idêntica em todas as páginas.",
    "- O rodapé compartilhado fica dentro de <footer data-vk-footer>, idêntico em todas as páginas.",
    "- O conteúdo próprio de cada página fica dentro de <main data-vk-pagina>.",
    '- Cada página tem <title> e <meta name="description"> únicos e específicos.',
    "- Um único CSS principal (styles.css ou equivalente) referenciado igual em todas as páginas.",
    "- São atributos sem valor, invisíveis pro visitante e pro Studio.",
    "Exemplo mínimo do corpo de cada página:",
    "<nav data-vk-nav>menu igual em todas as páginas</nav>",
    "<main data-vk-pagina>conteúdo próprio desta página</main>",
    "<footer data-vk-footer>rodapé igual em todas as páginas</footer>",
  ].join("\n");
}

// Bloco 1 enxuto do modo economico (interruptor "Aprimorar com IA" desligado):
// SUBSTITUI o bloco de design do modo ligado. Sem cartela, sem escolha de
// direcao: um estilo fixo da biblioteca, aplicado como esta. O estilo padrao e
// o Grade de zinco, o mais neutro e legivel do indice (cinza neutro dominante,
// um acento so, bordas finas).
export function blocoDesignEconomicoSite(semCerebro = false): string {
  return [
    "BLOCO 1, DESIGN NO MODO MONTAGEM (o usuário desligou o Aprimorar com IA):",
    semCerebro
      ? "- NÃO leia cerebro/cerebro.md. O conteúdo vem do que o usuário forneceu nesta geração (tema, descrição, instruções finais)."
      : "- Leia cerebro/cerebro.md: a identidade do negócio (voz, oferta, dor, desejo, provas, cidade, contato). É a fonte da verdade do conteúdo.",
    "- Não crie direção de arte nova. Use o estilo fixo Grade de zinco: leia templates/design/estilos/grade-zinco.md INTEIRO e aplique os tokens dele (cores, escala tipográfica, spacing, motion) como estão, sem inventar variação.",
    "- Não leia a cartela nem escolha outra direção. Um estilo, executado inteiro, sem mistura.",
    "- NUNCA cite a marca de origem do estilo em nenhum texto do site.",
  ].join("\n");
}

// Prompt completo pronto pra criarSessao. Sem perguntas: a sessao le os arquivos
// de contexto, resolve mensagem e estrutura pela skill e entrega o site em HTML.
export function montarPromptSite(dados: DadosEtapasSite, pasta: string): string {
  const tema = dados.tema.trim();
  // Modo economico: so o Bloco 1 muda (inteiro). Blocos 2 e 3 permanecem.
  const economico = dados.aprimorarComIA === false;
  const semCerebro = dados.semCerebro === true;
  const partes: string[] = [];

  partes.push(
    `Construa um site HTML estático completo, bonito e pronto pra publicar sobre: ${tema}.`
  );

  // Instrucao de topo do modo sem Cerebro: inequivoca, antes de qualquer bloco.
  if (semCerebro) {
    partes.push(blocoSemCerebro(dados.descricaoNegocio));
  }

  // ===== BLOCO 1: O DESIGN VEM PRIMEIRO. Antes de qualquer linha de codigo.
  // No modo economico o bloco inteiro e substituido pelo enxuto.
  if (economico) {
    partes.push(blocoDesignEconomicoSite(semCerebro));
  } else {
  partes.push(
    [
      "BLOCO 1, O DESIGN VEM PRIMEIRO. Antes de escrever qualquer linha, resolva o design:",
      semCerebro
        ? "- NÃO leia cerebro/cerebro.md. A identidade (voz, oferta, público) vem do que o usuário forneceu nesta geração; não invente nome, endereço, preço nem prova social."
        : "- Leia cerebro/cerebro.md: a identidade do negócio (voz, oferta, dor, desejo, provas, cidade, contato). É a fonte da verdade do visual e do conteúdo.",
      "- Leia templates/site/principios-visuais.md: a leitura de design, as regras, as proibições e o teste anti-slop.",
      "- Leia templates/design/cartela.md e escolha UMA direção que case com o negócio.",
      "- Leia templates/design/estilos/indice.md e escolha UM estilo que case com o negócio e com a direção. Leia o arquivo desse estilo INTEIRO antes de decidir cores, tipografia, spacing e motion.",
      "- Declare no início do trabalho, em até 3 linhas: a leitura de design que fez, a direção da cartela, o estilo escolhido e por quê.",
      "- Aplique o sistema do estilo inteiro (cores, escala tipográfica, spacing, motion), adaptado ao negócio. Um estilo por site, executado inteiro. Misturar estilos é proibido.",
      "- NUNCA cite a marca de origem do estilo em nenhum texto do site.",
    ].join("\n")
  );
  }

  if (dados.visualModo === "personalizado") {
    partes.push(visualLinha(dados));
  } else if (semCerebro) {
    partes.push(
      "Visual: use o sistema completo do estilo escolhido, incluindo a paleta dele nos tokens de cor."
    );
  } else {
    partes.push(
      "Visual: use o sistema completo do estilo escolhido. As cores se adaptam à identidade do Cérebro: se o Cérebro tiver paleta, ela manda nos tokens de cor; se não houver, use a paleta do estilo."
    );
  }

  // ===== BLOCO 2: conteudo e estrutura.
  const objetivoLivre = dados.objetivoLivre.trim();
  const bloco2 = [
    "BLOCO 2, conteúdo e estrutura.",
    "- Leia .claude/skills/site/SKILL.md: o contrato de mensagem e estrutura dos três formatos. Siga a arquitetura do formato escolhido e a voz do negócio. NÃO salve site.md: o entregável é o site em HTML, não texto solto.",
  ];
  if (objetivoLivre) {
    bloco2.push(`- Objetivo número 1 do site, definido pelo usuário: ${objetivoLivre}`);
  }
  partes.push(bloco2.join("\n"));

  // Bio nao tem secoes longas: o formato ja diz o que fazer.
  if (dados.formato !== "bio") {
    partes.push(secoesLinhas(dados.secoesLivre));
  }

  partes.push(ctaLinhas(dados.objetivo, dados.linkObjetivo, semCerebro));
  partes.push(imagensLinhas(dados, pasta));

  // ===== BLOCO 3: regras tecnicas, compactas no fim.
  partes.push(
    [
      "BLOCO 3, regras técnicas. Onde salvar e como nomear:",
      `- Salve tudo em conteudo/${pasta}/ (crie a pasta com esse nome exato).`,
      formatoLinha(dados.formato),
      "- O site sempre precisa ter index.html na raiz. O CSS pode ficar num styles.css compartilhado ou embutido no HTML.",
      "- Se usar CSS ou JavaScript separado, referencie esses arquivos em TODAS as páginas que dependem deles.",
      "- Todos os caminhos internos são relativos ao arquivo atual, sem começar com /. Isso vale pra páginas, CSS, JavaScript, imagens, fontes, favicon e manifest. Pode importar fontes do Google Fonts.",
      "- PROIBIDO criar um arquivo chamado carrossel.html. PROIBIDO salvar qualquer arquivo .md nessa pasta: senão o app classifica o site errado.",
    ].join("\n")
  );

  partes.push(marcadoresLinhas(dados.formato));

  partes.push(
    [
      "Exigências finais:",
      "- Entregue somente arquivos do site. Não crie site.md nem qualquer outro arquivo .md dentro da pasta da peça.",
      "- Site responsivo mobile-first: precisa ficar bom em 390px de largura e em 1440px.",
      "- Capriche no visual: hierarquia clara, respiro generoso e contraste mensurável. O motion obedece à direção visual declarada e aos detalhes do usuário; na ausência de instrução, use motion sutil. prefers-reduced-motion precisa desligar toda animação e todo deslocamento, sem exceção: inclua a media query no CSS zerando transition, animation e transform de reveal.",
      "- Contraste vale pra TODO texto, não só título e parágrafo principal: nota, legenda, rodapé, copyright, tag e link de menu precisam de 4.5:1 contra o fundo real onde estão. Em fundo escuro, texto secundário rebaixado demais reprova a auditoria e bloqueia a publicação; rebaixe saturação, não luminosidade.",
      "- Tudo local e relativo: nenhuma imagem de stock externa, nenhum link pra recurso que não existe.",
      "- Antes de terminar, confira página por página: index.html existe na raiz, toda folha CSS e todo script referenciado existe, todas as imagens abrem, todos os links internos chegam a uma página existente e nenhuma URL interna começa com /.",
      "- Marcação amigável ao editor: os filhos diretos do <body> são as seções semânticas da página (header, main, section, footer) quando o layout permitir. Camada decorativa (partículas, orbs, fundo animado) sempre com aria-hidden=\"true\".",
      "- PROIBIDO envolver o conteúdo da página num painel ou wrapper genérico (um <div> único abraçando todo o body). O menu mobile é um overlay position fixed que abre e fecha, nunca um contêiner que embrulha o body. A conferência do Hub reprova wrapper genérico no body.",
      "- PROIBIDO efeito decorativo que segue o cursor (glow, blob, spotlight, aura que persegue o mouse): cria overflow, gera rolagem horizontal e reprova a conferência.",
      "- backdrop-filter só em elemento que fica de fato sobre conteúdo real (uma imagem ou seção atrás dele). Vidro decorativo sem nada atrás é proibido: sem camada real, o efeito não existe e a conferência marca.",
      "- QUALQUER elemento com position absolute precisa estar confinado: overflow controlado no pai ou inset limitado. Confira em 390px que nada vaza pra fora da tela.",
      "- Use semântica de interação real: navegação, CTA e cartão que levam a um destino são <a>; filtros, menu hambúrguer, abrir/fechar diálogo, favoritos e demais ações na própria página são <button type=\"button\">. Item de destino \"em breve\" é <a> sem href e com aria-disabled=\"true\". Nunca use pointer-events pra fingir estado desativado.",
      "- Antes de concluir, percorra a rolagem inteira de cada página, confira que todo reveal apareceu e abra o site também com JavaScript desligado e com prefers-reduced-motion ativo.",
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
