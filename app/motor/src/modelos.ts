export type MotorCliente = "gemini" | "claude_team";
export type FaixaModelo = "economico" | "padrao" | "forte";

export interface ModeloResolvido {
  id: string;
  faixa: FaixaModelo;
  rotulo: string;
}

export interface CatalogoMotor {
  economico: ModeloResolvido;
  padrao: ModeloResolvido;
  forte: ModeloResolvido;
}

function valor(
  ambiente: NodeJS.ProcessEnv,
  nome: string,
  padrao: string,
): string {
  return ambiente[nome]?.trim() || padrao;
}

export function catalogoModelos(
  motor: MotorCliente,
  ambiente: NodeJS.ProcessEnv = process.env,
): CatalogoMotor {
  if (motor === "gemini") {
    const economico = valor(
      ambiente,
      "GEMINI_MODELO_ECONOMICO",
      valor(ambiente, "GEMINI_MODELO_PADRAO", "gemini-2.5-flash"),
    );
    const padrao = valor(ambiente, "GEMINI_MODELO_PADRAO", economico);
    const forte = valor(
      ambiente,
      "GEMINI_MODELO_FORTE",
      "gemini-2.5-pro",
    );
    return {
      economico: { id: economico, faixa: "economico", rotulo: "Gemini econômico" },
      padrao: { id: padrao, faixa: "padrao", rotulo: "Gemini padrão" },
      forte: { id: forte, faixa: "forte", rotulo: "Gemini forte" },
    };
  }
  const padrao = valor(
    ambiente,
    "CLAUDE_MODELO_PADRAO",
    "claude-sonnet-4-5",
  );
  const economico = valor(ambiente, "CLAUDE_MODELO_ECONOMICO", padrao);
  const forte = valor(
    ambiente,
    "CLAUDE_MODELO_FORTE",
    "claude-opus-4-5",
  );
  return {
    economico: { id: economico, faixa: "economico", rotulo: "Claude econômico" },
    padrao: { id: padrao, faixa: "padrao", rotulo: "Claude padrão" },
    forte: { id: forte, faixa: "forte", rotulo: "Claude forte" },
  };
}

export function resolverModelo(
  motor: MotorCliente,
  solicitado: unknown,
  ambiente: NodeJS.ProcessEnv = process.env,
): ModeloResolvido {
  const catalogo = catalogoModelos(motor, ambiente);
  const alias = typeof solicitado === "string"
    ? solicitado.trim().toLowerCase()
    : "";
  if (
    alias === "economico"
    || alias === "haiku"
    || alias === catalogo.economico.id.toLowerCase()
  ) {
    return catalogo.economico;
  }
  if (
    alias === "forte"
    || alias === "opus"
    || alias === catalogo.forte.id.toLowerCase()
  ) {
    return catalogo.forte;
  }
  return catalogo.padrao;
}

export function precoDoModelo(
  motor: MotorCliente,
  faixa: FaixaModelo,
  tipo: "ENTRADA" | "SAIDA",
  ambiente: NodeJS.ProcessEnv = process.env,
): number {
  const prefixo = motor.toUpperCase();
  const especifica = `PRECO_${prefixo}_${faixa.toUpperCase()}_${tipo}`;
  const legada = `PRECO_${prefixo}_${tipo}`;
  const bruto = ambiente[especifica]?.trim() || ambiente[legada]?.trim();
  const preco = Number(bruto);
  if (!Number.isFinite(preco) || preco <= 0) {
    throw new Error("Tabela de custo do motor nao configurada.");
  }
  return preco;
}
