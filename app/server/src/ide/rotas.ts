// Rotas da IDE de arquivos. Montado sob /api pelo index.ts.
// Base de tudo: a pasta do workspace VKOS ATIVO (obterPastaVkos). Toda operacao
// e escopada nessa pasta, com sanitizacao rigida do caminho: resolve + startsWith
// na base, recusa ".." e nunca segue symlink pra fora (realpath do ancestral).

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { fileURLToPath } from "node:url";

import { obterPastaVkos } from "../vkos/estado.js";
import { gravarTextoAtomico } from "../util/gravarJson.js";
import { MODO } from "../plataforma/modo.js";
import { exigirBanco } from "../plataforma/banco.js";
import { pastaDoWorkspace } from "../plataforma/provisionamento.js";
import {
  garantirWorkspaceOculto,
  idWorkspaceAtivo,
  lerRegistro,
  workspacePorId,
} from "../workspaces/estado.js";

// Raiz do repositorio do VKOS HUB: sobe de src/ide (ou dist/ide) ate app e mais
// um nivel. E a base da raiz "sistema" da IDE geral do CORE.
const pastaRepositorio = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

// Id fixo da entrada oculta que representa o sistema inteiro no registro.
const ID_RAIZ_SISTEMA = "w-sistema";

// Pastas ignoradas na arvore: ruido pesado que nao interessa editar.
const IGNORAR = new Set(["node_modules", ".git", "dist"]);

// Profundidade maxima da arvore, pra nao varrer o mundo em pasta funda.
const PROFUNDIDADE_MAX = 8;

// Teto de leitura de arquivo: 1MB. Acima disso responde 413.
const LIMITE_LEITURA = 1024 * 1024;

// Um no da arvore de arquivos.
interface No {
  nome: string;
  caminho: string;
  tipo: "pasta" | "arquivo";
  filhos?: No[];
}

// Erro de IDE com status HTTP embutido, traduzido pra { erro } na resposta.
class ErroIde extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

// Traduz um ErroIde em resposta HTTP. Erro inesperado sobe pro handler global.
function responderErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroIde) {
    return resposta.status(erro.status).send({ erro: erro.message });
  }
  throw erro;
}

// Realpath do ancestral existente mais proximo de um caminho. Serve pra pegar
// symlink no meio do caminho mesmo quando o alvo ainda nao existe (criacao).
function realpathAncestral(dir: string): string {
  let atual = dir;
  while (!existsSync(atual)) {
    const pai = path.dirname(atual);
    if (pai === atual) break;
    atual = pai;
  }
  try {
    return realpathSync(atual);
  } catch {
    return atual;
  }
}

// Resolve um caminho relativo dentro da base ativa de forma segura.
// Devolve a base canonica e o caminho absoluto. Lanca ErroIde 400 se sair da base.
function resolverSeguro(rel: unknown): { base: string; abs: string; rel: string } {
  const pasta = obterPastaVkos();
  if (!pasta) {
    throw new ErroIde(400, "Nenhum workspace ativo. Escolha um VKOS primeiro.");
  }
  if (typeof rel !== "string") {
    throw new ErroIde(400, "Caminho invalido.");
  }
  // Base canonica: resolve symlink da propria pasta do workspace.
  let base: string;
  try {
    base = realpathSync(pasta);
  } catch {
    base = path.resolve(pasta);
  }

  // Normaliza barras e tira barra inicial pra tratar sempre como relativo.
  const limpo = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  // Recusa qualquer segmento "..". Sem excecao.
  if (limpo.split("/").some((seg) => seg === "..")) {
    throw new ErroIde(400, "Caminho invalido.");
  }

  const abs = path.resolve(base, limpo);
  // Precisa estar dentro da base (ou ser a propria base).
  if (abs !== base && !abs.startsWith(base + path.sep)) {
    throw new ErroIde(400, "Caminho fora da base.");
  }
  // Symlink no meio do caminho nao pode escapar da base.
  const paiReal = realpathAncestral(path.dirname(abs));
  if (paiReal !== base && !paiReal.startsWith(base + path.sep)) {
    throw new ErroIde(400, "Caminho fora da base.");
  }
  return { base, abs, rel: limpo };
}

// Monta a arvore de um diretorio, recursiva, ignorando ruido e symlinks.
// Pastas primeiro, depois arquivos, cada grupo em ordem alfabetica.
function construirArvore(absDir: string, relDir: string, profundidade: number): No[] {
  if (profundidade > PROFUNDIDADE_MAX) return [];
  let entradas: import("node:fs").Dirent[];
  try {
    entradas = readdirSync(absDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const pastas: No[] = [];
  const arquivos: No[] = [];
  for (const e of entradas) {
    if (IGNORAR.has(e.name)) continue;
    // Symlink nao entra na arvore: guarda contra escapar da base.
    if (e.isSymbolicLink()) continue;
    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    if (e.isDirectory()) {
      pastas.push({
        nome: e.name,
        caminho: rel,
        tipo: "pasta",
        filhos: construirArvore(path.join(absDir, e.name), rel, profundidade + 1),
      });
    } else if (e.isFile()) {
      arquivos.push({ nome: e.name, caminho: rel, tipo: "arquivo" });
    }
  }
  pastas.sort((a, b) => a.nome.localeCompare(b.nome));
  arquivos.sort((a, b) => a.nome.localeCompare(b.nome));
  return [...pastas, ...arquivos];
}

// Heuristica de binario: byte nulo nos primeiros 8000 bytes.
function pareceBinario(buffer: Buffer): boolean {
  const limite = Math.min(buffer.length, 8000);
  for (let i = 0; i < limite; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export const rotasIde: FastifyPluginAsync = async (app) => {
  // Raizes da IDE geral do CORE: o sistema inteiro (o repositorio do hub), os
  // workspaces do estudio e os clientes do banco ja materializados. Selecionar
  // uma raiz no front ativa o workspace correspondente, entao arvore, editor e
  // chat passam a operar nela. So existe no CORE: cliente nunca ve isso.
  if (MODO === "core") {
    app.get("/ide/raizes", async () => {
      const sistema = garantirWorkspaceOculto(
        ID_RAIZ_SISTEMA,
        "VKOS HUB (sistema)",
        pastaRepositorio,
      );
      const raizes: { id: string; nome: string; tipo: string }[] = [
        { id: sistema.id, nome: sistema.nome, tipo: "sistema" },
      ];
      for (const w of lerRegistro().workspaces) {
        if (!w.oculto) raizes.push({ id: w.id, nome: w.nome, tipo: "estudio" });
      }
      try {
        const clientes = await exigirBanco().query(
          "SELECT id, nome FROM workspaces ORDER BY nome",
        );
        for (const linha of clientes.rows as { id: string; nome: string }[]) {
          try {
            if (existsSync(pastaDoWorkspace(linha.id))) {
              raizes.push({ id: linha.id, nome: linha.nome, tipo: "cliente" });
            }
          } catch {
            // id fora do formato uuid: nao e um cliente materializavel.
          }
        }
      } catch {
        // Banco fora do ar: a IDE geral segue com sistema e estudio.
      }
      return { raizes, ativo: idWorkspaceAtivo() };
    });
  }

  // Arvore completa da pasta do workspace ativo.
  app.get("/ide/arvore", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhum workspace ativo. Escolha um VKOS primeiro." });
    }
    let base: string;
    try {
      base = realpathSync(pasta);
    } catch {
      base = path.resolve(pasta);
    }
    const itens = construirArvore(base, "", 1);
    // Nome amigavel: o nome do workspace ativo quando registrado (a pasta de um
    // cliente materializado e um uuid, feio de mostrar). Senao, o basename.
    const ativo = idWorkspaceAtivo();
    const nome = (ativo && workspacePorId(ativo)?.nome) || path.basename(base);
    return { base: nome, itens };
  });

  // Le um arquivo de texto. Recusa binario e arquivo acima de 1MB (413).
  app.get("/ide/arquivo", async (req, resposta) => {
    const q = (req.query ?? {}) as { caminho?: string };
    let alvo;
    try {
      alvo = resolverSeguro(q.caminho);
    } catch (erro) {
      return responderErro(erro, resposta);
    }

    let estat;
    try {
      estat = statSync(alvo.abs);
    } catch {
      return resposta.status(404).send({ erro: "Arquivo nao encontrado." });
    }
    if (!estat.isFile()) {
      return resposta.status(400).send({ erro: "O caminho nao e um arquivo." });
    }
    if (estat.size > LIMITE_LEITURA) {
      return resposta.status(413).send({ erro: "Arquivo grande demais pra abrir (limite de 1MB)." });
    }

    let buffer: Buffer;
    try {
      buffer = readFileSync(alvo.abs);
    } catch {
      return resposta.status(500).send({ erro: "Nao deu pra ler o arquivo." });
    }
    if (pareceBinario(buffer)) {
      return resposta.status(415).send({ erro: "Arquivo binario nao pode ser aberto no editor." });
    }
    return { caminho: alvo.rel, conteudo: buffer.toString("utf8"), tamanho: estat.size };
  });

  // Grava um arquivo (atomico). Cria a pasta pai e o arquivo se nao existirem.
  app.put("/ide/arquivo", async (req, resposta) => {
    const corpo = (req.body ?? {}) as { caminho?: unknown; conteudo?: unknown };
    if (typeof corpo.conteudo !== "string") {
      return resposta.status(400).send({ erro: "conteudo e obrigatorio." });
    }
    let alvo;
    try {
      alvo = resolverSeguro(corpo.caminho);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
    if (alvo.abs === alvo.base) {
      return resposta.status(400).send({ erro: "Caminho invalido." });
    }
    // Nao sobrescrever pasta com arquivo.
    if (existsSync(alvo.abs) && statSync(alvo.abs).isDirectory()) {
      return resposta.status(400).send({ erro: "O caminho e uma pasta." });
    }
    try {
      mkdirSync(path.dirname(alvo.abs), { recursive: true });
      gravarTextoAtomico(alvo.abs, corpo.conteudo);
    } catch {
      return resposta.status(500).send({ erro: "Nao deu pra gravar o arquivo." });
    }
    return { ok: true, caminho: alvo.rel };
  });

  // Cria uma pasta (recursivo).
  app.post("/ide/pasta", async (req, resposta) => {
    const corpo = (req.body ?? {}) as { caminho?: unknown };
    let alvo;
    try {
      alvo = resolverSeguro(corpo.caminho);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
    if (alvo.abs === alvo.base) {
      return resposta.status(400).send({ erro: "Caminho invalido." });
    }
    if (existsSync(alvo.abs)) {
      if (statSync(alvo.abs).isDirectory()) {
        return { ok: true, caminho: alvo.rel };
      }
      return resposta.status(400).send({ erro: "Ja existe um arquivo com esse nome." });
    }
    try {
      mkdirSync(alvo.abs, { recursive: true });
    } catch {
      return resposta.status(500).send({ erro: "Nao deu pra criar a pasta." });
    }
    return { ok: true, caminho: alvo.rel };
  });

  // Renomeia ou move um arquivo ou pasta dentro da base.
  app.post("/ide/renomear", async (req, resposta) => {
    const corpo = (req.body ?? {}) as { de?: unknown; para?: unknown };
    let origem;
    let destino;
    try {
      origem = resolverSeguro(corpo.de);
      destino = resolverSeguro(corpo.para);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
    if (origem.abs === origem.base || destino.abs === destino.base) {
      return resposta.status(400).send({ erro: "Caminho invalido." });
    }
    if (!existsSync(origem.abs)) {
      return resposta.status(404).send({ erro: "Origem nao encontrada." });
    }
    if (existsSync(destino.abs)) {
      return resposta.status(409).send({ erro: "Ja existe algo nesse destino." });
    }
    try {
      mkdirSync(path.dirname(destino.abs), { recursive: true });
      renameSync(origem.abs, destino.abs);
    } catch {
      return resposta.status(500).send({ erro: "Nao deu pra renomear." });
    }
    return { ok: true, de: origem.rel, para: destino.rel };
  });

  // Apaga um arquivo ou pasta vazia. Pasta cheia responde 409.
  app.delete("/ide/arquivo", async (req, resposta) => {
    const q = (req.query ?? {}) as { caminho?: string };
    let alvo;
    try {
      alvo = resolverSeguro(q.caminho);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
    if (alvo.abs === alvo.base) {
      return resposta.status(400).send({ erro: "Caminho invalido." });
    }

    let estat;
    try {
      estat = statSync(alvo.abs);
    } catch {
      return resposta.status(404).send({ erro: "Arquivo nao encontrado." });
    }

    if (estat.isDirectory()) {
      let vazia = true;
      try {
        vazia = readdirSync(alvo.abs).length === 0;
      } catch {
        vazia = false;
      }
      if (!vazia) {
        return resposta.status(409).send({ erro: "A pasta nao esta vazia." });
      }
      try {
        rmdirSync(alvo.abs);
      } catch {
        return resposta.status(500).send({ erro: "Nao deu pra apagar a pasta." });
      }
      return { ok: true };
    }

    try {
      unlinkSync(alvo.abs);
    } catch {
      return resposta.status(500).send({ erro: "Nao deu pra apagar o arquivo." });
    }
    return { ok: true };
  });
};
