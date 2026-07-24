export type MotorWorkspace = "gemini" | "claude_team" | "nenhum";

export function motorInicialDoModelo(_motor: MotorWorkspace): MotorWorkspace {
  return "gemini";
}

export function motivoBloqueioMotor(
  motor: MotorWorkspace,
  estado: {
    geminiDisponivel?: boolean;
    claudeCredencialStatus?: string | null;
  },
): string | null {
  if (
    motor === "claude_team"
    && estado.claudeCredencialStatus !== "valida"
  ) {
    return "Cadastre e teste a credencial Claude Team antes de liberar este motor.";
  }
  return null;
}
