import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

import { exigirBanco, bancoDisponivel } from "../plataforma/banco.js";
import { cifrar, decifrar, mascarar } from "../plataforma/cofre.js";
import { MODO, PRODUCAO } from "../plataforma/modo.js";
import { lerConexoes, salvarConexoes } from "../conexoes/estado.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";

export interface CredencialMeta {
  appId: string;
  appSecret: string;
  businessId: string;
  tokenSistema: string;
}

export interface DiagnosticoMeta {
  item: string;
  ok: boolean;
  mensagem: string;
}

export interface TesteCredencialMeta {
  quando: string;
  ok: boolean;
  diagnosticos: DiagnosticoMeta[];
}

export interface EstadoCredencialMeta {
  configurada: boolean;
  config: CredencialMeta;
  ultimoTeste: TesteCredencialMeta | null;
}

const VAZIA: CredencialMeta = {
  appId: "",
  appSecret: "",
  businessId: "",
  tokenSistema: "",
};
const pastaApp = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const caminhoTeste = process.env.VKOS_META_TESTE_ARQUIVO?.trim()
  || join(pastaApp, "dados", "meta-credencial-teste.json");

function usaBanco(): boolean {
  return MODO === "core" && PRODUCAO && bancoDisponivel;
}

function normalizar(valor: unknown): CredencialMeta {
  const item = valor && typeof valor === "object" ? valor as Record<string, unknown> : {};
  return {
    appId: typeof item.appId === "string" ? item.appId.trim() : "",
    appSecret: typeof item.appSecret === "string" ? item.appSecret.trim() : "",
    businessId: typeof item.businessId === "string" ? item.businessId.trim() : "",
    tokenSistema: typeof item.tokenSistema === "string" ? item.tokenSistema.trim() : "",
  };
}

function testeLocal(): TesteCredencialMeta | null {
  try {
    return existsSync(caminhoTeste)
      ? JSON.parse(readFileSync(caminhoTeste, "utf8")) as TesteCredencialMeta
      : null;
  } catch {
    return null;
  }
}

export async function lerCredencialMeta(): Promise<{
  credencial: CredencialMeta;
  ultimoTeste: TesteCredencialMeta | null;
}> {
  if (usaBanco()) {
    const resultado = await exigirBanco().query(
      "SELECT valor_cifrado, teste_json FROM credenciais_sistema WHERE tipo = 'meta'",
    );
    if (!resultado.rowCount) return { credencial: { ...VAZIA }, ultimoTeste: null };
    const credencial = normalizar(JSON.parse(decifrar(resultado.rows[0].valor_cifrado)));
    return {
      credencial,
      ultimoTeste: resultado.rows[0].teste_json as TesteCredencialMeta | null,
    };
  }
  const estado = lerConexoes("sistema");
  return {
    credencial: normalizar(estado.servidores.meta?.config),
    ultimoTeste: testeLocal(),
  };
}

function preservarMascara(recebido: string, atual: string): string {
  return recebido === mascarar(atual) ? atual : recebido;
}

export async function salvarCredencialMeta(
  recebido: Partial<CredencialMeta>,
): Promise<EstadoCredencialMeta> {
  const anterior = await lerCredencialMeta();
  const credencial = normalizar({
    ...anterior.credencial,
    ...recebido,
    appSecret: preservarMascara(recebido.appSecret ?? anterior.credencial.appSecret, anterior.credencial.appSecret),
    tokenSistema: preservarMascara(recebido.tokenSistema ?? anterior.credencial.tokenSistema, anterior.credencial.tokenSistema),
  });
  if (usaBanco()) {
    const valor = cifrar(JSON.stringify(credencial));
    await exigirBanco().query(
      `INSERT INTO credenciais_sistema (tipo, valor_cifrado, mascara, atualizado_em)
       VALUES ('meta', $1, $2, now())
       ON CONFLICT (tipo) DO UPDATE
       SET valor_cifrado = EXCLUDED.valor_cifrado, mascara = EXCLUDED.mascara,
           atualizado_em = now()`,
      [valor, mascarar(credencial.tokenSistema)],
    );
  } else {
    const estado = lerConexoes("sistema");
    estado.servidores.meta = { habilitado: true, config: { ...credencial } };
    salvarConexoes("sistema", estado);
  }
  return estadoMascarado(credencial, anterior.ultimoTeste);
}

export async function salvarTesteCredencialMeta(teste: TesteCredencialMeta): Promise<void> {
  if (usaBanco()) {
    await exigirBanco().query(
      "UPDATE credenciais_sistema SET teste_json = $1, atualizado_em = now() WHERE tipo = 'meta'",
      [JSON.stringify(teste)],
    );
    return;
  }
  mkdirSync(dirname(caminhoTeste), { recursive: true });
  gravarJsonAtomico(caminhoTeste, teste);
}

export function estadoMascarado(
  credencial: CredencialMeta,
  ultimoTeste: TesteCredencialMeta | null,
): EstadoCredencialMeta {
  return {
    configurada: Object.values(credencial).every(Boolean),
    config: {
      appId: credencial.appId,
      appSecret: credencial.appSecret ? mascarar(credencial.appSecret) : "",
      businessId: credencial.businessId,
      tokenSistema: credencial.tokenSistema ? mascarar(credencial.tokenSistema) : "",
    },
    ultimoTeste,
  };
}

export async function obterEstadoCredencialMeta(): Promise<EstadoCredencialMeta> {
  const estado = await lerCredencialMeta();
  return estadoMascarado(estado.credencial, estado.ultimoTeste);
}
