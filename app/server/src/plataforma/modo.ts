export type ModoAplicacao = "core" | "hub";

export function lerModo(valor = process.env.MODO): ModoAplicacao {
  const normalizado = valor?.trim().toLowerCase();
  if (!normalizado || normalizado === "core") return "core";
  if (normalizado === "hub") return "hub";
  throw new Error(`MODO invalido: "${valor}". Use core ou hub.`);
}

export const MODO = lerModo();

export function lerProducao(
  valor = process.env.PRODUCAO,
  authObrigatoria = process.env.AUTH_OBRIGATORIA,
): boolean {
  return valor?.trim() === "1" || authObrigatoria?.trim() === "1";
}

export const PRODUCAO = lerProducao();

export function permiteIaLocal(modo: ModoAplicacao = MODO): boolean {
  return modo === "core";
}
