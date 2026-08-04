// A barreira de pasta das pecas. Um lugar so, porque uma segunda copia dela e
// uma segunda chance de escrever fora de conteudo/. Morava dentro de rotas.ts
// ate 2026-07-31, quando o modulo de anuncios passou a precisar da mesma
// barreira.

import { join, sep } from "node:path";

// Sanitiza o nome da peca (um segmento) e devolve o caminho absoluto dentro de
// conteudo/. Null quando invalido. Padrao rigido: sem barra, sem "..", sem ponto
// inicial, sem byte nulo, e o alvo tem que ficar dentro de conteudo.
export function resolverPeca(
  pastaVkos: string,
  bruto: string,
): { alvo: string; nome: string } | null {
  let nome: string;
  try {
    nome = decodeURIComponent(bruto);
  } catch {
    return null;
  }
  if (
    !nome ||
    nome.includes("/") ||
    nome.includes("\\") ||
    nome.includes("..") ||
    nome.startsWith(".") ||
    nome.includes("\0")
  ) {
    return null;
  }
  const pastaConteudo = join(pastaVkos, "conteudo");
  const alvo = join(pastaConteudo, nome);
  if (!alvo.startsWith(pastaConteudo + sep)) {
    return null;
  }
  return { alvo, nome };
}
