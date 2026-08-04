// A CONVERSA COM O CÉREBRO, num lugar só.
//
// Dois lugares falam com a mesma conversa: a cerimônia, que abre o Cérebro do
// zero, e a aba Chat do painel, que continua de onde ela parou. O que os dois
// precisam saber é o mesmo: por que título a sessão se reencontra, qual delas
// vale quando existe mais de uma, e o que dizer a uma conversa NOVA sobre um
// Cérebro que já existe.
//
// Isto é módulo separado, e não constante dentro do .tsx, porque o prompt daqui
// é INJEÇÃO DE CONTEÚDO num processo de IA. A regra do projeto é que injeção se
// testa afirmando o conteúdo injetado, e dentro do componente ele ficaria fora
// do alcance do runner.

import type { Sessao } from "../../tipos/dominio";

// Título fixo da sessão da conversa do Cérebro: é por ele que a gente
// reencontra uma entrevista em andamento ao reabrir a tela (a sessão vive no
// servidor). Mudar esta string órfã toda conversa já gravada.
export const TITULO_CERIMONIA = "Cerimônia do Cérebro";

// A sessão do Cérebro deste workspace: a MAIS RECENTE com o título fixo.
//
// Mais recente pela ordem da lista, que é a ordem em que o servidor devolve, e
// não por data: a data de criação empata em sessões abertas no mesmo segundo, e
// a lista já chega ordenada.
export function acharSessaoDoCerebro(sessoes: Sessao[]): Sessao | undefined {
  const minhas = sessoes.filter((s) => s.titulo === TITULO_CERIMONIA);
  return minhas.length > 0 ? minhas[minhas.length - 1] : undefined;
}

// Uma sessão está MORTA quando não dá para retomar de onde ela parou: ou ela
// sumiu do registro do Hub, ou ela parou sem o id da conversa do provedor. A
// segunda pega o Hub reiniciado no meio de um turno, e o gerenciador recusa
// retomar sem ele. Avisar antes é melhor do que recusar depois que a pessoa
// escreveu.
export function sessaoDoCerebroMorreu(sessao: Sessao | undefined, rodando: boolean): boolean {
  if (!sessao) return true;
  return !rodando && !sessao.sessionIdClaude;
}

// O prompt de uma conversa NOVA sobre um Cérebro que já existe.
//
// Ele NÃO invoca o /instalar de propósito. A skill conduz a entrevista inteira,
// bloco por bloco, e usá-la aqui faria a IA recomeçar a montagem de uma
// identidade que já está escrita. O que este caminho quer é outra coisa: mexer
// no documento que existe, no ponto que o dono pediu.
//
// O caminho do arquivo aparece literal porque a sessão roda com o diretório de
// trabalho na pasta do workspace, que é onde `cerebro/cerebro.md` mora.
export function promptDeConversaComCerebro(pedido: string): string {
  return [
    "Você está conversando com o dono do negócio sobre o Cérebro dele, o documento de identidade que toda geração de IA deste app lê antes de trabalhar.",
    "",
    "O Cérebro já existe, em `cerebro/cerebro.md` (caminho relativo à pasta deste workspace).",
    "",
    "Como trabalhar:",
    "",
    "1. Leia o arquivo inteiro antes de responder qualquer coisa.",
    "2. Faça o que o dono pedir e MAIS NADA. Não reescreva bloco que ele não citou, não melhore texto que ele não reclamou, não recomece a entrevista.",
    "3. Não invente informação sobre o negócio. Quando faltar um dado pra atender o pedido, pergunte, uma pergunta de cada vez.",
    "4. Ao mudar o documento, grave em `cerebro/cerebro.md` e diga em uma linha o que mudou.",
    "5. Escreva SEMPRE em português do Brasil, incluindo as perguntas e o conteúdo do Cérebro. Nenhuma palavra em outro idioma ou em outro alfabeto.",
    "",
    "O pedido do dono:",
    "",
    pedido,
  ].join("\n");
}
