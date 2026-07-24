import { createDecipheriv } from "node:crypto";
import { readFileSync } from "node:fs";

function chaveMestra(): Buffer {
  const arquivo = process.env.COFRE_MASTER_KEY_FILE?.trim();
  const valor = arquivo ? readFileSync(arquivo, "utf8").trim() : process.env.COFRE_MASTER_KEY?.trim();
  if (!valor) throw new Error("COFRE_MASTER_KEY nao configurada.");
  const chave = Buffer.from(valor, "base64");
  if (chave.length !== 32) throw new Error("COFRE_MASTER_KEY precisa ter 32 bytes em base64.");
  return chave;
}

export function decifrar(valor: string): string {
  const [versao, iv64, tag64, cifrado64] = valor.split(".");
  if (versao !== "v1" || !iv64 || !tag64 || !cifrado64) throw new Error("Credencial cifrada invalida.");
  const decipher = createDecipheriv("aes-256-gcm", chaveMestra(), Buffer.from(iv64, "base64"));
  decipher.setAuthTag(Buffer.from(tag64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(cifrado64, "base64")), decipher.final()]).toString("utf8");
}
