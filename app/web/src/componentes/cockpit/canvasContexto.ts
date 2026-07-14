import { createContext, useContext } from "react";
import type { TipoContexto } from "../../tipos/dominio";

// Ponte entre os nos e o canvas (Cockpit). Os nos pedem acoes que so o dono do
// canvas sabe executar, como criar um no de contexto ja conectado a uma sessao.
export interface ApiCanvas {
  // Cria um no de contexto novo, posicionado perto da sessao e ligado a ela por
  // aresta, e sobe os arquivos dados. Devolve o id do contexto criado.
  criarContextoConectado: (
    idNoSessao: string,
    nomeSugerido: string,
    arquivos: File[],
    tipo: TipoContexto
  ) => Promise<string | null>;
}

export const CanvasContexto = createContext<ApiCanvas | null>(null);

export function usarCanvas(): ApiCanvas {
  const valor = useContext(CanvasContexto);
  if (!valor) {
    throw new Error("usarCanvas precisa estar dentro do CanvasContexto.Provider.");
  }
  return valor;
}
