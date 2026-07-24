// Bloco compartilhado pelo carrossel e pelo Site Guiado quando o usuario escolhe
// gerar sem o Cerebro. E uma instrucao de topo, inequivoca: nao ler o Cerebro,
// nao chamar a entrevista, e usar so a identidade fornecida na propria geracao.
// A guarda do servidor ja liberou a geracao (flag semCerebro); aqui o prompt
// alinha o agente pra ele nao procurar uma identidade que nao existe.

// A descricao livre do negocio, quando o usuario preencheu. Vira uma linha de
// contexto dentro do bloco; vazio nao adiciona nada.
export function linhaDescricaoNegocio(descricao: string | undefined): string | null {
  const texto = (descricao ?? "").trim();
  if (!texto) return null;
  return `- O usuário descreveu o negócio assim: ${texto}`;
}

// O bloco de topo do modo sem Cerebro. Opcionalmente inclui a descricao livre.
export function blocoSemCerebro(descricaoNegocio?: string): string {
  const linhas = [
    "MODO SEM CÉREBRO (escolha explícita do usuário nesta geração):",
    "- NÃO leia cerebro/cerebro.md e NÃO chame /instalar. Não faça nenhuma pergunta.",
    "- A identidade desta geração vem SOMENTE do que o usuário forneceu neste prompt (tema, descrição do negócio, instruções finais). O que não foi dito, resolva com bom senso genérico do nicho, sem inventar nome, endereço, preço ou prova social.",
    "- Onde a skill mandar usar o Cérebro, use a identidade desta geração no lugar.",
  ];
  const descricao = linhaDescricaoNegocio(descricaoNegocio);
  if (descricao) linhas.push(descricao);
  return linhas.join("\n");
}
