import type { ModeloCarrossel } from "../../tipos/dominio";

export type GrupoModelo = "capa" | "desenvolvimento" | "cta" | "unica";

export function modelosDoGrupo(
  modelos: ModeloCarrossel[],
  grupo: GrupoModelo,
): ModeloCarrossel[] {
  return modelos.filter((modelo) => {
    const tipo = modelo.tipo ?? "completo";
    if (grupo === "capa") return tipo === "capa" || tipo === "completo";
    if (grupo === "desenvolvimento") {
      return tipo === "desenvolvimento" || tipo === "completo";
    }
    if (grupo === "cta") return tipo === "cta" || tipo === "completo";
    return tipo === "completo" || tipo === "capa" || tipo === "desenvolvimento";
  });
}
