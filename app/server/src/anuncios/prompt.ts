// A montagem do prompt que gera uma peca de anuncio.
//
// O frontend manda SO a intencao do dono (oferta, objetivo, destino do clique,
// praca, orcamento, detalhes livres). Tudo que faz aquilo virar um anuncio.json
// valido e costurado aqui: a plataforma, a proibicao de perguntar, a skill, o
// Cerebro, o contrato do JSON e o limite de escrita.
//
// O estilo segue montarPromptAjustePeca, em sessoes/escopo-peca.ts: blocos com
// marcador, pra a IA saber onde cada coisa comeca e termina.
//
// POR QUE A SKILL VAI EMBUTIDA: o cwd desta sessao e a pasta da peca, uma
// subpasta de conteudo/. De la nao da pra contar com o provedor descobrindo
// .claude/skills/ subindo diretorios, e ninguem mediu isso. O SKILL.md tem 57
// linhas: o custo em token e baixo e o ganho e o fluxo parar de depender de uma
// resolucao de caminho que nao foi medida.
//
// POR QUE O CEREBRO VAI EMBUTIDO: pelo mesmo motivo. Com o cwd na pasta da peca
// a IA nao alcanca cerebro/cerebro.md.

import { montarContratoAnuncioJson } from "./contratoPrompt.js";
import { NOME_ARQUIVO_ANUNCIO } from "./modelo.js";

export interface EntradaPromptAnuncio {
  // O que o dono respondeu no assistente, literal.
  intencao: string;
  // O cerebro/cerebro.md inteiro do workspace.
  cerebro: string;
  // O SKILL.md inteiro da skill /anuncio deste workspace.
  conteudoSkill: string;
  // O nome da pasta da peca dentro de conteudo/. Ja e o cwd da sessao.
  pasta: string;
}

export function montarPromptGeracaoAnuncio(entrada: EntradaPromptAnuncio): string {
  return [
    // 1. O que e o trabalho.
    "Monte uma campanha de anúncios do Google na REDE DE BUSCA para este negócio.",
    "A skill abaixo sabe fazer Google e Meta. Nesta rodada só vale o ramo Google rede de busca: ignore por inteiro o ramo Meta, Instagram e Facebook, inclusive segmentação por interesse e texto principal de feed.",
    "",
    // 2. Nao se pergunta nada.
    "NÃO FAÇA NENHUMA PERGUNTA. O passo 1 da skill pede para confirmar onde anunciar, qual é a oferta e para onde vai o clique. As três respostas já foram colhidas pelo assistente do Hub e estão no pedido do dono, mais abaixo. Trabalhe com o que está escrito ali e com o Cérebro. Se faltar um detalhe, escolha o caminho mais conservador e registre a escolha no campo de observação correspondente.",
    "",
    // 3. A skill, embutida.
    "Instruções da skill /anuncio deste VKOS. O Hub injetou o arquivo aqui porque o seu diretório de trabalho é a pasta da peça, e de lá você não alcança .claude/skills/. Siga estas instruções, com uma exceção declarada: o formato de entrega desta rodada é o do contrato mais abaixo, não o markdown que a skill descreve.",
    "<skill>",
    entrada.conteudoSkill.trim(),
    "</skill>",
    "",
    // 4. O Cerebro, embutido.
    "Contexto integral do negócio. É daqui que saem identidade, voz, oferta, público, dor, provas, praça e palavras-chave. Não invente dado de negócio que não esteja aqui nem no pedido do dono.",
    "<cerebro>",
    entrada.cerebro.trim(),
    "</cerebro>",
    "",
    // 5. O contrato do JSON, colado no schema.
    "<contrato>",
    montarContratoAnuncioJson(),
    "</contrato>",
    "",
    // 5b. As duas regras que a primeira geracao real, em 2026-07-31, mostrou
    // que faltavam. Sem elas o resultado passava no schema e mesmo assim era
    // uma campanha pior do que o dono conseguiria montar na mao.
    "DUAS REGRAS DE QUALIDADE, e as duas foram medidas numa geração real:",
    "1. Escreva em português correto, COM ACENTUAÇÃO E CEDILHA, em todo campo de texto. O Google publica exatamente o que você escrever. Anúncio escrito \"orcamento\", \"bebe\" e \"album\" parece feito às pressas, e quem lê é um cliente decidindo se confia no negócio.",
    "2. Faça de 2 a 4 grupos de anúncios, UM POR INTENÇÃO DE BUSCA distinta, nunca um grupo só com tudo dentro. Quem busca o nome do serviço, quem busca preço e quem busca a cidade estão em momentos diferentes e merecem título e palavra-chave diferentes. Um grupo só obriga um texto médio que não fala com ninguém. Se o negócio realmente só tiver uma intenção, use um grupo e explique o motivo na observação da estratégia.",
    "",
    // 6. A intencao do dono, literal.
    "Pedido do dono, colhido pelo assistente do Hub:",
    "<pedido>",
    entrada.intencao.trim(),
    "</pedido>",
    "",
    // 7. O unico artefato, e o limite de escrita.
    `O ÚNICO ARTEFATO desta tarefa é o arquivo ${NOME_ARQUIVO_ANUNCIO}, gravado na raiz do seu diretório de trabalho atual, que já é conteudo/${entrada.pasta}/.`,
    `Não crie markdown, não crie HTML, não crie imagem e não crie subpasta. Um segundo arquivo dizendo a mesma coisa que o ${NOME_ARQUIVO_ANUNCIO} acaba divergindo dele.`,
    "LIMITE OBRIGATÓRIO: não leia, escreva, renomeie nem apague nada fora do diretório atual. Nada de caminho com .., nada de caminho absoluto, nada de Git e nada de comando que alcance o resto do workspace.",
    "Ao terminar, responda em uma frase curta dizendo quantos grupos e quantos anúncios a campanha tem.",
  ].join("\n");
}

export interface EntradaPromptConversaAnuncio {
  // O que o dono escreveu no chat da tela da campanha, literal.
  pedido: string;
  // O anuncio.json que esta em disco agora, como texto.
  anuncioAtual: string;
  // O cerebro/cerebro.md inteiro do workspace.
  cerebro: string;
  // O nome da pasta da peca dentro de conteudo/. Ja e o cwd da sessao.
  pasta: string;
}

// O primeiro turno de uma conversa que RECOMECA sobre uma campanha que ja
// existe. Ele so entra quando a sessao original morreu: enquanto ela vive, o
// chat retoma aquela por --resume, e o contexto inteiro ja esta la.
//
// A diferenca em relacao ao prompt de geracao e o ponto de partida. Aqui a
// campanha existe, e o trabalho e MUDAR o que o dono pediu e deixar o resto
// parado. Por isso o anuncio.json atual vai embutido: com o cwd na pasta da
// peca a IA até conseguiria abrir o arquivo, mas mandar ele junto tira uma ida
// e volta do primeiro turno e deixa claro que aquilo e a base, nao um rascunho.
//
// O Cerebro vai junto pelo mesmo motivo do prompt de geracao: a sessao esta
// confinada e nao alcanca cerebro/cerebro.md. Reescrever titulo sem a voz do
// negocio seria pior do que a conversa que morreu.
export function montarPromptConversaAnuncio(
  entrada: EntradaPromptConversaAnuncio,
): string {
  return [
    `Você está continuando o trabalho numa campanha de anúncios do Google na rede de busca que já existe. Ela está no arquivo ${NOME_ARQUIVO_ANUNCIO}, na raiz do seu diretório de trabalho atual, que já é conteudo/${entrada.pasta}/.`,
    "A conversa que gerou essa campanha não existe mais, então este é o primeiro turno de uma conversa nova. Nada se perdeu: a campanha inteira está abaixo.",
    "",
    "NÃO FAÇA NENHUMA PERGUNTA e não peça confirmação. Faça o que o dono pediu.",
    "",
    "Contexto integral do negócio, para manter voz, oferta, público e provas coerentes:",
    "<cerebro>",
    entrada.cerebro.trim(),
    "</cerebro>",
    "",
    `A campanha como ela está agora, o conteúdo literal do ${NOME_ARQUIVO_ANUNCIO}:`,
    "<campanha>",
    entrada.anuncioAtual.trim(),
    "</campanha>",
    "",
    "<contrato>",
    montarContratoAnuncioJson(),
    "</contrato>",
    "",
    "Pedido do dono:",
    "<pedido>",
    entrada.pedido.trim(),
    "</pedido>",
    "",
    "COMO RESPONDER AO PEDIDO:",
    `1. Mude só o que foi pedido. Todo campo que o pedido não toca continua com o valor exato que está na campanha acima. Regravar o ${NOME_ARQUIVO_ANUNCIO} inteiro é o certo; reescrever o que não foi pedido não é.`,
    "2. Escreva em português correto, com acentuação e cedilha. O Google publica exatamente o que você escrever.",
    "3. Respeite os limites de caractere do contrato acima em todo campo que você tocar.",
    `4. Se o pedido for uma pergunta e não um ajuste, responda em texto e não toque no ${NOME_ARQUIVO_ANUNCIO}.`,
    "",
    `O ÚNICO artefato que você pode criar ou alterar é o ${NOME_ARQUIVO_ANUNCIO} na raiz do diretório atual.`,
    "LIMITE OBRIGATÓRIO: não leia, escreva, renomeie nem apague nada fora do diretório atual. Nada de caminho com .., nada de caminho absoluto, nada de Git e nada de comando que alcance o resto do workspace.",
    "Ao terminar, responda em uma frase curta dizendo o que você mudou.",
  ].join("\n");
}
