import { existsSync, readFileSync } from "node:fs";

interface AcessoArquivos {
  existe(caminho: string): boolean;
  ler(caminho: string): string;
}

const acessoPadrao: AcessoArquivos = {
  existe: existsSync,
  ler: (caminho) => readFileSync(caminho, "utf8"),
};

export function geminiConfigurado(
  ambiente: NodeJS.ProcessEnv = process.env,
  arquivos: AcessoArquivos = acessoPadrao,
): boolean {
  if (!ambiente.GOOGLE_CLOUD_PROJECT?.trim()) return false;
  const caminho = ambiente.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!caminho) return true;
  if (!arquivos.existe(caminho)) return false;
  try {
    const credencial = JSON.parse(arquivos.ler(caminho)) as {
      client_email?: unknown;
      private_key?: unknown;
    };
    return (
      typeof credencial.client_email === "string"
      && Boolean(credencial.client_email.trim())
      && typeof credencial.private_key === "string"
      && Boolean(credencial.private_key.trim())
    );
  } catch {
    return false;
  }
}
