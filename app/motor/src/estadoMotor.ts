export type CodigoFalhaMotor =
  | "autenticacao"
  | "quota"
  | "configuracao"
  | "indisponivel";

export interface FalhaMotor {
  codigo: CodigoFalhaMotor;
  mensagemCliente: string;
}

export function statusCredencialClaude(
  estado: "operante" | "manutencao",
  codigo: CodigoFalhaMotor | null,
): "valida" | "invalida" | null {
  if (estado === "operante") return "valida";
  return codigo === "autenticacao" ? "invalida" : null;
}

function statusDoErro(erro: unknown): number | undefined {
  return typeof erro === "object" && erro
    ? (erro as { status?: number; code?: number }).status
      ?? (erro as { code?: number }).code
    : undefined;
}

export function classificarFalhaMotor(erro: unknown): FalhaMotor {
  const status = statusDoErro(erro);
  const texto = erro instanceof Error ? erro.message : String(erro ?? "");
  if (
    status === 401
    || status === 403
    || /api key|credential|unauthorized|unauthenticated|permission denied/i.test(texto)
  ) {
    return {
      codigo: "autenticacao",
      mensagemCliente:
        "A IA deste workspace está em manutenção. Fale com o suporte.",
    };
  }
  if (status === 429 || /quota|rate limit|resource exhausted/i.test(texto)) {
    return {
      codigo: "quota",
      mensagemCliente:
        "O limite temporário da IA foi atingido. Tente novamente em alguns minutos.",
    };
  }
  if (
    /GOOGLE_CLOUD_PROJECT|tabela de custo|nao configurad|não configurad/i.test(texto)
  ) {
    return {
      codigo: "configuracao",
      mensagemCliente:
        "A IA deste workspace está em manutenção. Fale com o suporte.",
    };
  }
  return {
    codigo: "indisponivel",
    mensagemCliente:
      "A IA está temporariamente indisponível. Tente novamente em alguns minutos.",
  };
}
