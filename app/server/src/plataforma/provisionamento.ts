import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const pastaModulo = dirname(fileURLToPath(import.meta.url));
const pastaApp = resolve(pastaModulo, "..", "..", "..");
const pastaRepositorio = resolve(pastaApp, "..");
export const pastaClientes = resolve(
  process.env.DADOS_CLIENTES ?? join(pastaApp, "dados", "clientes"),
);

function dentroDaBase(alvo: string): boolean {
  const trecho = relative(pastaClientes, alvo);
  return (
    trecho !== "" &&
    trecho !== ".." &&
    !trecho.startsWith(`..${sep}`) &&
    !isAbsolute(trecho)
  );
}

export function pastaDoWorkspace(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("Id de workspace invalido.");
  const alvo = resolve(pastaClientes, id);
  if (!dentroDaBase(alvo))
    throw new Error("Pasta de workspace fora da area permitida.");
  return alvo;
}

export function resolverSemente(nome: string | null): string | null {
  if (!nome) return null;
  if (nome !== "vkos2") throw new Error("Semente desconhecida.");
  const pasta = join(pastaRepositorio, "vkos2");
  if (!existsSync(pasta))
    throw new Error("A semente vkos2 nao foi encontrada.");
  return pasta;
}

export function materializarWorkspace(
  id: string,
  semente: string | null,
): string {
  mkdirSync(pastaClientes, { recursive: true });
  const destino = pastaDoWorkspace(id);
  if (existsSync(destino))
    throw new Error("A pasta desse workspace ja existe.");
  const temporaria = `${destino}.criando`;
  if (existsSync(temporaria))
    throw new Error("Ja existe um provisionamento em andamento.");
  try {
    mkdirSync(temporaria, { recursive: true });
    if (semente) {
      cpSync(semente, temporaria, {
        recursive: true,
        errorOnExist: true,
        filter: (origem) =>
          ![".git", "node_modules"].includes(origem.split(/[\\/]/).pop() ?? ""),
      });
    } else {
      for (const pasta of [
        "cerebro",
        "conteudo",
        "materiais",
        "crm",
        "calendario",
        "automacoes",
      ]) {
        mkdirSync(join(temporaria, pasta), { recursive: true });
      }
    }
    renameSync(temporaria, destino);
    return destino;
  } catch (erro) {
    if (existsSync(temporaria))
      rmSync(temporaria, { recursive: true, force: true });
    throw erro;
  }
}

export function desfazerWorkspaceNovo(id: string): void {
  const destino = pastaDoWorkspace(id);
  if (existsSync(destino)) rmSync(destino, { recursive: true, force: true });
}
