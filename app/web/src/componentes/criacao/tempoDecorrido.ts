// Quanto tempo a geracao esta rodando.
//
// POR QUE ISTO EXISTE: "Gerando seu carrossel" sem tempo nenhum na tela deixa a
// pessoa sem saber se esperou dois minutos ou dez, e a duvida sempre termina do
// mesmo jeito, que e cancelar uma geracao que ia terminar. O estado global da
// geracao nao guarda o instante do disparo, entao o instante mora aqui, num
// mapa por sessao: o wizard e o cartao flutuante leem o MESMO valor, e ele
// sobrevive a minimizar e reabrir, que e justamente quando o relogio importa.

const iniciosPorSessao = new Map<string, number>();

// Instante em que esta sessao comecou a ser acompanhada. Registra na primeira
// chamada e devolve sempre o mesmo valor depois.
export function inicioDaGeracao(sessaoId: string): number {
  const guardado = iniciosPorSessao.get(sessaoId);
  if (guardado !== undefined) return guardado;
  const agora = Date.now();
  iniciosPorSessao.set(sessaoId, agora);
  return agora;
}

// Esquece uma sessao encerrada, pra o mapa nao crescer numa sessao longa de uso.
export function esquecerGeracao(sessaoId: string): void {
  iniciosPorSessao.delete(sessaoId);
}

// "12s", "1min 05s", "1h 03min". Sempre curto: e um metadado, nao um cronometro
// de corrida.
export function formatarDecorrido(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const dois = (n: number) => String(n).padStart(2, "0");
  if (horas > 0) return `${horas}h ${dois(minutos)}min`;
  if (minutos > 0) return `${minutos}min ${dois(segundos)}s`;
  return `${segundos}s`;
}
