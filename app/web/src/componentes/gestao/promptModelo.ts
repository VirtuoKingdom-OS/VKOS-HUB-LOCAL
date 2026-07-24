import type { TipoModeloBanco } from "../../api/cliente";

export interface DadosPromptModelo {
  nome: string;
  tipo: TipoModeloBanco;
  pasta: string;
  imagem: string;
  instrucoes?: string;
}

const ENTREGAS: Record<TipoModeloBanco, string> = {
  capa: "gere 1 slide de capa",
  desenvolvimento: "gere ao menos 2 slides de desenvolvimento, um de texto e um de lista",
  cta: "gere 1 slide de fecho com CTA",
  completo: "gere capa, slide de texto, slide de lista e slide final de CTA",
};

export function montarPromptModelo(dados: DadosPromptModelo): string {
  const partes = [
    "Crie um modelo reutilizável de carrossel a partir da imagem de referência.",
    "Leia templates/carrossel/principios-modelos.md inteiro e leia um modelo existente da mesma pasta para respeitar a anatomia do VKOS.",
    `Imagem de referência: ${dados.imagem}.`,
    `Tipo pedido: ${dados.tipo}, ${ENTREGAS[dados.tipo]}.`,
    "Replique o layout, a tipografia, o ritmo e a composição visual da referência. Não copie marca, nome, logo ou texto específico da imagem.",
    "Use conteúdo de demonstração genérico. O resultado é um modelo, não uma peça pública.",
    "Cada slide precisa ter a classe slide, largura 1080px, altura 1350px e overflow hidden.",
    "Use CSS embutido. Coloque cores e fontes em variáveis no :root para permitir recoloração.",
    `Salve somente em conteudo/${dados.pasta}/carrossel.html. Crie a pasta com esse nome exato.`,
  ];
  const instrucoes = dados.instrucoes?.trim();
  if (instrucoes) {
    partes.push(`Instruções adicionais do operador:\n${instrucoes}`);
  }
  return partes.join("\n\n");
}
