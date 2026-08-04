// A INTENCAO DO DONO DO ANUNCIO.
//
// Subiu do web pro servidor em 2026-08-04, junto com os outros dois prompts de
// geracao. A divisao de trabalho descrita abaixo nao muda: o contrato do
// anuncio.json e os limites do Google continuam sendo costurados pelo servidor,
// colados no schema.
//
// O que sobe daqui e o que so o dono sabe: a oferta, o que conta como
// resultado, pra onde vai o clique, a praca e quanto ele pode gastar por dia. O
// Cerebro nao tem nenhum bloco de orcamento, ticket, margem ou custo de
// aquisicao, entao sem esta resposta o bloco de orcamento nasce chutado.

import type { DadosAnuncio } from "./modelo.js";

// O destino do clique em prosa, pro prompt. Não é o rótulo da interface: aqui a
// frase precisa fazer sentido dentro de uma instrução.
const PROSA_DESTINO: Record<DadosAnuncio["destino"], string> = {
  whatsapp: "conversa no WhatsApp",
  landing: "uma landing page",
  agendamento: "uma página de agendamento",
  telefone: "uma ligação de telefone",
};

// A linha do destino. Endereço em branco não vira invenção: manda buscar o
// contato no Cérebro e diz isso na cara.
function linhaDestino(dados: DadosAnuncio): string {
  const alvo = dados.linkDestino.trim();
  const prosa = PROSA_DESTINO[dados.destino];
  if (alvo) {
    return `- Destino do clique: ${prosa}, em ${alvo}.`;
  }
  return `- Destino do clique: ${prosa}. O dono não informou o endereço: use o contato que está no Cérebro.`;
}

// A linha da praça. Vazia deixa a decisão com o Cérebro, sem fingir que o dono
// respondeu.
function linhaPraca(dados: DadosAnuncio): string {
  const praca = dados.praca.trim();
  if (praca) return `- Onde o anúncio aparece: ${praca}.`;
  return "- Onde o anúncio aparece: o dono não apertou a praça, siga a região que está no Cérebro.";
}

export function montarPromptAnuncio(dados: DadosAnuncio): string {
  const oferta = dados.oferta.trim();
  const objetivo = dados.objetivo.trim();
  const raio = dados.raio.trim();
  const orcamento = dados.orcamentoDiario.trim();
  const detalhes = dados.detalhes.trim();

  const linhas: string[] = [
    "O QUE O DONO RESPONDEU NO ASSISTENTE:",
    `- Oferta a anunciar: ${oferta}`,
  ];

  linhas.push(
    objetivo
      ? `- O que conta como resultado: ${objetivo}`
      : "- O dono não disse o que conta como resultado. Decida pelo Cérebro e deixe escrito qual foi a escolha."
  );

  linhas.push(linhaDestino(dados));
  linhas.push(linhaPraca(dados));

  if (raio) linhas.push(`- Raio em volta da praça: ${raio}.`);

  linhas.push(
    `- Orçamento por dia: ${orcamento}. Este número foi dado pelo dono, não é estimativa: a campanha inteira precisa caber nele.`
  );

  const partes = [linhas.join("\n")];

  if (detalhes) {
    partes.push(
      `DETALHES DO DONO, preserve integralmente o conteúdo e a ordem:\n${detalhes}`
    );
  }

  return partes.join("\n\n");
}

