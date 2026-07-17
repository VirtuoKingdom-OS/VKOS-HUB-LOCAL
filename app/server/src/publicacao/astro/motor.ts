// Motor de build Astro compartilhado. Uma unica instalacao de Astro em
// app/dados/motor-sites/ serve todas as pecas. Nada e instalado dentro da peca:
// no build, um junction node_modules aponta pro motor e some no fim, entao a
// fonte que sobe pro GitHub nunca leva node_modules.

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { VERSAO_ASTRO } from "./conversor.js";

// Este modulo mora em src/publicacao/astro (dev) ou dist/publicacao/astro
// (build). Subir quatro niveis chega na pasta app nos dois casos.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..", "..");
const PASTA_MOTOR = join(pastaApp, "dados", "motor-sites");

const TIMEOUT_INSTALL_MS = 180_000;
const TIMEOUT_BUILD_MS = 120_000;

// Motor nao instalado (sem internet ou npm install falhou). O chamador vira
// isso em fallback HTML com aviso legivel.
export class MotorIndisponivel extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "MotorIndisponivel";
  }
}

// Build do Astro falhou (config, sintaxe, dist divergente). Tambem cai no
// fallback HTML com aviso.
export class BuildFalhou extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "BuildFalhou";
  }
}

interface ResultadoSpawn {
  code: number | null;
  stdout: string;
  stderr: string;
  expirou: boolean;
  erroInicio?: string;
}

function rodar(
  comando: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  usarShell = false,
): Promise<ResultadoSpawn> {
  return new Promise<ResultadoSpawn>((resolver) => {
    const proc = spawn(comando, args, {
      cwd,
      windowsHide: true,
      shell: usarShell,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let expirou = false;
    proc.stdout?.on("data", (d) => {
      stdout += String(d);
    });
    proc.stderr?.on("data", (d) => {
      stderr += String(d);
    });
    const temporizador = setTimeout(() => {
      expirou = true;
      proc.kill();
    }, timeoutMs);
    proc.on("error", (erro) => {
      clearTimeout(temporizador);
      resolver({ code: null, stdout, stderr, expirou, erroInicio: erro.message });
    });
    proc.on("close", (code) => {
      clearTimeout(temporizador);
      resolver({ code, stdout, stderr, expirou });
    });
  });
}

function versaoAstroInstalada(): string | null {
  try {
    const pkg = JSON.parse(
      readFileSync(join(PASTA_MOTOR, "node_modules", "astro", "package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

// Procura npm no PATH sem gastar spawn: varre as pastas do PATH atras do
// executavel. Barato e sincrono, cabe na rota de badge.
function npmNoPath(): boolean {
  const win = process.platform === "win32";
  const nomes = win ? ["npm.cmd", "npm.exe", "npm.bat", "npm"] : ["npm"];
  const separador = win ? ";" : ":";
  const pastas = (process.env.PATH || process.env.Path || "").split(separador);
  for (const pasta of pastas) {
    const dir = pasta.trim();
    if (!dir) continue;
    for (const nome of nomes) {
      try {
        if (existsSync(join(dir, nome))) return true;
      } catch {
        // PATH pode ter entrada invalida: ignora e segue.
      }
    }
  }
  return false;
}

// Regra pura da viabilidade do motor, isolada pra teste dos dois lados.
export function decidirMotorViavel(astroInstalado: boolean, npmDisponivel: boolean): boolean {
  return astroInstalado || npmDisponivel;
}

let npmDisponivelCache: boolean | null = null;

// Viabilidade barata do motor Astro pro badge da UI: ou o Astro ja esta
// instalado, ou ha npm no PATH pra instalar sob demanda. Sem isso o deploy
// cairia no HTML puro logo apos o clique, entao o badge nao pode prometer Astro.
// O Astro instalado e reconferido a cada chamada (so passa de ausente a
// presente); a presenca de npm no PATH e cacheada (nao some durante a execucao).
export function motorViavel(): boolean {
  if (versaoAstroInstalada() !== null) return true;
  if (npmDisponivelCache === null) npmDisponivelCache = npmNoPath();
  return decidirMotorViavel(false, npmDisponivelCache);
}

function garantirPackageJsonMotor(): void {
  mkdirSync(PASTA_MOTOR, { recursive: true });
  const alvo = join(PASTA_MOTOR, "package.json");
  const desejado = `${JSON.stringify(
    {
      name: "vkos-motor-sites",
      version: "0.0.0",
      private: true,
      type: "module",
      description: "Motor Astro compartilhado do VKOS Hub. Nao editar a mao.",
      dependencies: { astro: VERSAO_ASTRO },
    },
    null,
    2,
  )}\n`;
  const atual = existsSync(alvo) ? readFileSync(alvo, "utf8") : "";
  if (atual !== desejado) writeFileSync(alvo, desejado, "utf8");
}

// Garante o motor pronto: Astro na versao pinada dentro de app/dados/motor-sites.
// Instala sob demanda com npm. Sem internet ou falha: MotorIndisponivel.
export async function garantirMotor(): Promise<void> {
  garantirPackageJsonMotor();
  if (versaoAstroInstalada() === VERSAO_ASTRO) return;

  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  // Comando inteiro numa string com shell: true evita o DEP0190 do Node ao
  // passar args separados junto de shell.
  const resultado = await rodar(
    `${npm} install --no-audit --no-fund --loglevel=error`,
    [],
    PASTA_MOTOR,
    TIMEOUT_INSTALL_MS,
    true,
  );
  if (resultado.expirou) {
    throw new MotorIndisponivel(
      "A instalacao do motor Astro passou de 180s e foi cancelada. Publicado como HTML puro.",
    );
  }
  if (resultado.code !== 0 || versaoAstroInstalada() !== VERSAO_ASTRO) {
    const cauda = (resultado.stderr || resultado.erroInicio || "").trim().split("\n").slice(-3).join(" ");
    throw new MotorIndisponivel(
      `Motor Astro nao instalado (sem internet ou npm indisponivel). Publicado como HTML puro. ${cauda}`.trim(),
    );
  }
}

// Builda o projeto Astro. Cria um junction node_modules apontando pro motor so
// durante o build e o remove no fim, pra fonte nunca carregar dependencia.
export async function buildarProjeto(pastaProjeto: string): Promise<void> {
  const nodeModulesMotor = join(PASTA_MOTOR, "node_modules");
  if (!existsSync(join(nodeModulesMotor, "astro"))) {
    throw new MotorIndisponivel("Motor Astro nao instalado. Publicado como HTML puro.");
  }
  const ligacao = join(pastaProjeto, "node_modules");
  rmSync(ligacao, { recursive: true, force: true });
  try {
    symlinkSync(nodeModulesMotor, ligacao, "junction");
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    throw new BuildFalhou(`Nao consegui preparar o motor para o build. ${msg}`);
  }

  try {
    const astroJs = join(nodeModulesMotor, "astro", "astro.js");
    const resultado = await rodar(
      process.execPath,
      [astroJs, "build"],
      pastaProjeto,
      TIMEOUT_BUILD_MS,
    );
    if (resultado.expirou) {
      throw new BuildFalhou("O build do Astro passou de 120s e foi cancelado.");
    }
    if (resultado.code !== 0) {
      const cauda = (resultado.stderr || resultado.stdout || resultado.erroInicio || "")
        .trim()
        .split("\n")
        .slice(-6)
        .join("\n");
      throw new BuildFalhou(`O build do Astro falhou (codigo ${resultado.code}). ${cauda}`.trim());
    }
  } finally {
    rmSync(ligacao, { recursive: true, force: true });
  }
}

function listarHtmlDist(pastaDist: string, prefixo = "", saida: string[] = []): string[] {
  let entradas;
  try {
    entradas = readdirSync(pastaDist, { withFileTypes: true });
  } catch {
    return saida;
  }
  for (const entrada of entradas) {
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    const absoluto = join(pastaDist, entrada.name);
    if (entrada.isDirectory()) {
      listarHtmlDist(absoluto, relativo, saida);
    } else if (entrada.isFile() && /\.html?$/i.test(entrada.name)) {
      saida.push(relativo);
    }
  }
  return saida;
}

// Confere que o dist/ emitiu exatamente as paginas esperadas, uma a uma. E a
// garantia "o que voce viu e o que sobe". Divergencia aborta o modo Astro.
export function conferirDist(pastaProjeto: string, paginasEsperadas: string[]): void {
  const pastaDist = join(pastaProjeto, "dist");
  const emitidas = new Set(listarHtmlDist(pastaDist).map((p) => p.toLowerCase()));
  const esperadas = paginasEsperadas.map((p) => p.replace(/\\/g, "/").toLowerCase());

  const faltando = esperadas.filter((p) => !emitidas.has(p));
  const esperadasSet = new Set(esperadas);
  const sobrando = [...emitidas].filter((p) => !esperadasSet.has(p));

  if (faltando.length > 0 || sobrando.length > 0) {
    const partes: string[] = [];
    if (faltando.length > 0) partes.push(`faltaram ${faltando.join(", ")}`);
    if (sobrando.length > 0) partes.push(`sobraram ${sobrando.join(", ")}`);
    throw new BuildFalhou(
      `O build gerou paginas diferentes da peca (${partes.join("; ")}). Publicado como HTML puro.`,
    );
  }
}

export { PASTA_MOTOR };
