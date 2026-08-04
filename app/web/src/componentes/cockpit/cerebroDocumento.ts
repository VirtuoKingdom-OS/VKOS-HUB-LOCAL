// A terceira porta do Cerebro: um documento que o dono do negocio ja tinha
// escrito. Ele nao substitui a entrevista, ele a ENCURTA. A cerimonia comeca
// lendo o arquivo, preenche o que der e so pergunta o que ficou em branco.
//
// Este modulo e separado do componente de proposito: o prompt e INJECAO DE
// CONTEUDO num processo de IA, e injecao se testa afirmando o que foi
// injetado. Dentro do .tsx ele ficaria fora do alcance do runner.

export interface DocumentoCerebro {
  // Caminho relativo a pasta do VKOS. A sessao roda com cwd ali, entao e assim
  // que o prompt aponta pro arquivo.
  caminho: string;
  // Nome original, so pra mostrar na tela.
  nome: string;
}

// Extensao aceita. So markdown: aceitar txt ou pdf aqui seria prometer um
// processamento que a cerimonia nao faz, e um pdf chegaria como binario
// ilegivel no meio da entrevista.
export function ehDocumentoDeCerebro(nome: string): boolean {
  return /\.md$/i.test(nome);
}

// O prompt da cerimonia semeada.
//
// Ele vai inteiro pelo STDIN do provedor (ver server/provedores/util.ts), entao
// pode ser multilinha: a proibicao de valor multilinha do projeto vale pra
// ARGUMENTO de processo filho, que nao e o caso aqui.
//
// Ele NAO reimplementa o /instalar. A skill ja sabe conduzir uma pergunta por
// vez e ja manda aproveitar material que existe no workspace. O que este texto
// acrescenta e por onde comecar, e o que nao fazer.
//
// A REGRA DE IDIOMA, e por que ela existe.
//
// Em 2026-08-04 uma entrevista real saiu com "օrinak" (armenio pra "por
// exemplo") no meio de uma pergunta em portugues. O prompt nunca dizia em que
// lingua escrever: ele so herdava o portugues do texto em volta, e herança nao
// e instrucao. Quem le isso e o dono do negocio, no meio da tarefa mais longa
// do produto, e uma palavra em outro alfabeto destroi a confianca na conversa
// inteira.
//
// Ela fica FORA do bloco numerado de propósito: vale pra toda a entrevista, e
// nao e um passo dela.
const REGRA_IDIOMA =
  "Escreva SEMPRE em português do Brasil, do começo ao fim da conversa, incluindo as perguntas, os exemplos e o conteúdo do Cérebro. Nenhuma palavra em outro idioma ou em outro alfabeto.";

// O prompt da entrevista comum, sem documento nenhum.
//
// A skill /instalar ja sabe conduzir tudo. O que este texto acrescenta e uma
// linha so, a do idioma.
export function promptDaCerimonia(): string {
  return ["/instalar", "", REGRA_IDIOMA].join("\n");
}

// A primeira linha e exatamente "/instalar", sozinha. Isso importa: no Codex o
// expansor de skills so troca o comando por "leia o SKILL.md" quando ele ocupa
// a linha inteira (ver server/provedores/skills.ts).
export function promptComDocumento(caminho: string): string {
  return [
    "/instalar",
    "",
    REGRA_IDIOMA,
    "",
    `O dono do negócio já tem a identidade escrita e enviou um documento: \`${caminho}\` (caminho relativo à pasta deste workspace).`,
    "",
    "Comece por ele, nesta ordem:",
    "",
    "1. Leia o arquivo inteiro antes de perguntar qualquer coisa.",
    "2. Preencha o `cerebro/cerebro.md` bloco por bloco com o que estiver lá, escrito na voz do próprio negócio.",
    "3. Não invente nada, e não deduza o que o documento não diz. Bloco sem resposta no documento continua com o marcador de campo vazio.",
    "4. Diga em poucas linhas o que o documento preencheu e o que ficou faltando.",
    "5. Conduza a entrevista SÓ pelos blocos que ficaram em branco, uma pergunta de cada vez, do jeito que o /instalar manda.",
    "",
    "Se o documento cobrir tudo, não invente pergunta pra parecer completo: mostre o resumo e confirme antes de fechar.",
  ].join("\n");
}
