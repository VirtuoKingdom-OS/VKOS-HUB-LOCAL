export const MOTORES_ADMIN = [
  {
    id: "gemini",
    nome: "Gemini (Google), bancado por você",
    descricao: "Usa o projeto Vertex central e mede o custo neste workspace.",
  },
  {
    id: "claude_team",
    nome: "Claude Team, conta que você libera",
    descricao: "Usa somente a credencial cadastrada e testada para este cliente.",
  },
] as const;

export function nomeMotorAdmin(id: string): string {
  if (id === "nenhum") return "IA em manutenção";
  return MOTORES_ADMIN.find((motor) => motor.id === id)?.nome ?? id;
}
