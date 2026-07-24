import { createHmac, randomBytes } from "node:crypto";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function gerarSegredoTotp(): string {
  let bits = "";
  for (const byte of randomBytes(20)) bits += byte.toString(2).padStart(8, "0");
  let saida = "";
  for (let i = 0; i < bits.length; i += 5) {
    saida += ALFABETO[Number.parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return saida;
}

function decodificarBase32(valor: string): Buffer {
  let bits = "";
  for (const caractere of valor.replace(/=+$/g, "").toUpperCase()) {
    const indice = ALFABETO.indexOf(caractere);
    if (indice < 0) throw new Error("Segredo TOTP invalido.");
    bits += indice.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function codigoTotp(segredo: string, instante = Date.now()): string {
  const contador = Math.floor(instante / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(contador));
  const hash = createHmac("sha1", decodificarBase32(segredo)).update(buffer).digest();
  const deslocamento = hash[hash.length - 1] & 0x0f;
  const numero = (hash.readUInt32BE(deslocamento) & 0x7fffffff) % 1_000_000;
  return numero.toString().padStart(6, "0");
}

export function validarTotp(segredo: string, codigo: string, instante = Date.now()): boolean {
  if (!/^\d{6}$/.test(codigo)) return false;
  return [-1, 0, 1].some((janela) => codigoTotp(segredo, instante + janela * 30_000) === codigo);
}

export function segundoFatorValido(
  papel: string,
  segredo: string | null | undefined,
  codigo: unknown,
  instante = Date.now(),
): boolean {
  return papel !== "operador"
    || !segredo
    || (typeof codigo === "string" && validarTotp(segredo, codigo, instante));
}

export function uriTotp(segredo: string, email: string): string {
  const conta = encodeURIComponent(`VKOS CORE:${email}`);
  return `otpauth://totp/${conta}?secret=${segredo}&issuer=VKOS%20CORE&algorithm=SHA1&digits=6&period=30`;
}
