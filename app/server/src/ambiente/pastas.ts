// Navegador de pastas do lado do servidor.
// Lista raizes (drives no Windows) e subpastas, marcando quais sao um VKOS.
// So enxerga pastas, nunca arquivos. Robusto: pasta sem permissao some, nao quebra.

import { readdir, access } from "node:fs/promises";
import { constants as constantesFs } from "node:fs";
import { homedir, platform as plataformaOs } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";

// Uma pasta na resposta do navegador.
export interface PastaItem {
  nome: string;
  caminho: string;
  ehVkos: boolean;
}

// A resposta completa de uma listagem.
export interface RespostaPastas {
  caminho: string | null;
  pai: string | null;
  pastas: PastaItem[];
}

// Nomes de pastas de sistema do Windows que nunca interessam ao usuario.
// Comparacao sempre em minusculas.
const PASTAS_SISTEMA = new Set([
  "windows",
  "program files",
  "program files (x86)",
  "programdata",
  "$recycle.bin",
  "system volume information",
  "appdata",
  "node_modules",
]);

const EH_WINDOWS = plataformaOs() === "win32";

// Decide se uma pasta deve ser escondida da listagem.
function pastaIgnorada(nome: string): boolean {
  if (nome.startsWith(".")) return true;
  if (PASTAS_SISTEMA.has(nome.toLowerCase())) return true;
  return false;
}

// Testa se uma pasta e um VKOS: precisa ter cerebro/cerebro.md dentro.
async function ehVkos(caminhoPasta: string): Promise<boolean> {
  try {
    await access(join(caminhoPasta, "cerebro", "cerebro.md"), constantesFs.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Descobre os drives existentes no Windows testando de C a Z.
async function descobrirDrives(): Promise<string[]> {
  const letras = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const testes = letras.map(async (letra) => {
    const raiz = `${letra}:${sep}`;
    try {
      await access(raiz, constantesFs.F_OK);
      return raiz;
    } catch {
      return null;
    }
  });
  const resultados = await Promise.all(testes);
  return resultados.filter((r): r is string => r !== null);
}

// Monta o atalho pra pasta pessoal do usuario. Aparece junto das raizes.
async function atalhoHome(): Promise<PastaItem> {
  const casa = homedir();
  return {
    nome: `Pasta pessoal (${basename(casa)})`,
    caminho: casa,
    ehVkos: await ehVkos(casa),
  };
}

// Lista as raizes: drives no Windows, ou barra e home no resto. Sempre com o atalho da home.
async function listarRaizes(): Promise<RespostaPastas> {
  const pastas: PastaItem[] = [];

  if (EH_WINDOWS) {
    const drives = await descobrirDrives();
    for (const raiz of drives) {
      pastas.push({
        nome: raiz.replace(sep, ""),
        caminho: raiz,
        ehVkos: await ehVkos(raiz),
      });
    }
  } else {
    pastas.push({ nome: "/", caminho: "/", ehVkos: await ehVkos("/") });
  }

  pastas.push(await atalhoHome());

  return { caminho: null, pai: null, pastas };
}

// Normaliza o caminho pedido. Rejeita o que nao for absoluto ou for lixo.
function sanitizarCaminho(bruto: string): string {
  const limpo = bruto.trim();
  if (limpo.length === 0) {
    throw Object.assign(new Error("Caminho vazio"), { statusCode: 400 });
  }
  // Um drive nu como "C:" vira "C:\" pra o resolve nao cair no diretorio atual.
  const comRaiz = /^[A-Za-z]:$/.test(limpo) ? limpo + sep : limpo;
  if (!isAbsolute(comRaiz)) {
    throw Object.assign(new Error("O caminho precisa ser absoluto"), {
      statusCode: 400,
    });
  }
  // resolve normaliza, resolvendo .. e barras repetidas.
  return resolve(comRaiz);
}

// Calcula a pasta pai. Numa raiz de drive ou na barra, devolve null.
function calcularPai(caminho: string): string | null {
  const pai = dirname(caminho);
  if (pai === caminho) return null;
  return pai;
}

// Lista as subpastas de um caminho. Nao lanca por pasta ilegivel, so a omite.
async function listarSubpastas(caminho: string): Promise<RespostaPastas> {
  let entradas;
  try {
    entradas = await readdir(caminho, { withFileTypes: true });
  } catch {
    // Sem permissao ou caminho sumiu. Devolve vazio em vez de quebrar.
    return { caminho, pai: calcularPai(caminho), pastas: [] };
  }

  const candidatas = entradas.filter(
    (e) => e.isDirectory() && !pastaIgnorada(e.name),
  );

  const pastas = await Promise.all(
    candidatas.map(async (e) => {
      const caminhoFilho = join(caminho, e.name);
      return {
        nome: e.name,
        caminho: caminhoFilho,
        ehVkos: await ehVkos(caminhoFilho),
      };
    }),
  );

  pastas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { caminho, pai: calcularPai(caminho), pastas };
}

// Ponto de entrada do navegador. Sem caminho lista raizes, com caminho lista subpastas.
export async function navegar(caminho?: string): Promise<RespostaPastas> {
  if (caminho === undefined || caminho === null || caminho.trim() === "") {
    return listarRaizes();
  }
  const alvo = sanitizarCaminho(caminho);
  return listarSubpastas(alvo);
}
