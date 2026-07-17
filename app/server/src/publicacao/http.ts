export class ErroPublicacao extends Error {
  statusHttp: number;

  constructor(mensagem: string, statusHttp = 502) {
    super(mensagem);
    this.name = "ErroPublicacao";
    this.statusHttp = statusHttp;
  }
}

export async function lerRespostaExterna<T>(
  resposta: Response,
  destino: "GitHub" | "Netlify",
): Promise<T> {
  if (resposta.ok) return (await resposta.json()) as T;

  let detalhe = "";
  try {
    const corpo = (await resposta.json()) as { message?: unknown; error?: unknown };
    const bruto = typeof corpo.message === "string" ? corpo.message : corpo.error;
    detalhe = typeof bruto === "string" ? bruto.trim() : "";
  } catch {
    // A mensagem principal continua suficiente.
  }

  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroPublicacao(
      `Token recusado pelo ${destino}. Confira a conexão em Conexões.`,
      401,
    );
  }
  const complemento = detalhe ? ` ${detalhe}` : "";
  throw new ErroPublicacao(
    `${destino} respondeu com status ${resposta.status}.${complemento}`,
    502,
  );
}
