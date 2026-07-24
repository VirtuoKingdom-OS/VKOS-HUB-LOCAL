import { readFileSync } from "node:fs";

function tokenMotor(): string {
  const arquivo = process.env.MOTOR_INTERNAL_TOKEN_FILE?.trim();
  return arquivo
    ? readFileSync(arquivo, "utf8").trim()
    : process.env.MOTOR_INTERNAL_TOKEN?.trim() ?? "";
}

async function chamarMotor<T>(
  caminho: string,
  corpo?: object,
): Promise<T> {
  const token = tokenMotor();
  if (!token) {
    throw new Error("O acesso interno ao motor ainda não foi configurado.");
  }
  let resposta: Response;
  try {
    resposta = await fetch(
      `${process.env.MOTOR_URL ?? "http://motor:4700"}${caminho}`,
      {
        method: corpo ? "POST" : "GET",
        headers: {
          "x-motor-token": token,
          ...(corpo ? { "content-type": "application/json" } : {}),
        },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: AbortSignal.timeout(60_000),
      },
    );
  } catch {
    throw new Error("O serviço de IA está indisponível.");
  }
  const dados = (await resposta.json().catch(() => ({}))) as T & {
    erro?: string;
  };
  if (!resposta.ok) {
    throw Object.assign(
      new Error(dados.erro ?? "O teste do motor falhou."),
      { status: resposta.status },
    );
  }
  return dados;
}

export interface EstadoMotores {
  gemini: {
    disponivel: boolean;
    localizacao: string;
    modelos: object;
  };
  claudeTeam: {
    disponivel: boolean;
    modelos: object;
  };
}

export function obterEstadoMotores(): Promise<EstadoMotores> {
  return chamarMotor("/interno/configuracao");
}

export function testarMotorWorkspace(
  workspaceId: string,
  motor: "gemini" | "claude_team",
): Promise<{
  ok: true;
  motor: string;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoEstimado: number;
  resposta: string;
}> {
  return chamarMotor("/interno/testar-motor", { workspaceId, motor });
}
