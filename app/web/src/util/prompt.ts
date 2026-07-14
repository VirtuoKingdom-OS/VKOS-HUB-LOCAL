// Montagem do prompt de uma sessao, conforme a convencao do CONTRATO.md.
// A economia de token mora aqui: o anexo nunca entra inline, so a referencia da
// pasta. O Cerebro nunca e injetado, o CLAUDE.md do VKOS manda ler.

export interface MaterialConectado {
  slug: string;
  nome: string;
  tipo: string;
}

// Monta o prompt final. Cada secao so entra quando tem conteudo.
export function montarPromptCompleto(
  comando: string,
  detalhes: string,
  materiais: MaterialConectado[]
): string {
  const partes: string[] = [comando.trim()];

  const detalhesLimpo = detalhes.trim();
  if (detalhesLimpo) {
    partes.push(`Detalhes adicionais do usuario: ${detalhesLimpo}`);
  }

  if (materiais.length > 0) {
    const linhas = materiais
      .map((m) => `- materiais/cockpit/${m.slug}/ (${m.nome}, tipo ${m.tipo})`)
      .join("\n");
    partes.push(
      "Materiais anexados pelo usuario nesta tarefa (leia o que for util antes de comecar):\n" +
        linhas
    );
  }

  return partes.join("\n\n");
}
