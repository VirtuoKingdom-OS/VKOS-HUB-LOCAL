// Identidade desta aba do navegador.
//
// Existe por um motivo so: o CRM ao vivo. Toda gravacao carimba este id no
// cabecalho x-vkos-aba, o servidor devolve ele como "origem" no aviso do
// WebSocket, e a aba que gravou reconhece o proprio eco e nao recarrega. Sem
// isso, cada campo salvo na ficha faria a propria tela reler o funil inteiro
// por causa de uma mudanca que ela ja tinha aplicado na resposta do PATCH.
//
// O id vive em memoria e morre com a aba. Duas abas do mesmo navegador tem ids
// diferentes, que e exatamente o que se quer: uma precisa saber da outra.

export const CABECALHO_ABA = "x-vkos-aba";

export const ID_DESTA_ABA = `aba-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Quantas gravacoes desta aba ainda nao voltaram do servidor. O CRM ao vivo usa
// pra nao reler enquanto a propria gravacao esta no ar: a leitura sairia antes
// da escrita chegar ao disco e o campo voltaria sozinho pro valor velho.
let gravacoesEmVoo = 0;

export function marcarGravacao(): void {
  gravacoesEmVoo++;
}

export function encerrarGravacao(): void {
  if (gravacoesEmVoo > 0) gravacoesEmVoo--;
}

export function gravando(): boolean {
  return gravacoesEmVoo > 0;
}
