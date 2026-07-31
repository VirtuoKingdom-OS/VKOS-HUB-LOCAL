// Rotas da IDE de arquivos. Montado sob /api pelo index.ts.
//
// Base de tudo: A RAIZ DO PROJETO (raizProjeto), desde 2026-07-27. Antes era a
// pasta do workspace VKOS ativo, e a IDE mostrava cerebro/, marca/ e materiais/
// de um cliente em vez do projeto: nem app/, nem docs/, nem ferramentas/. Ela e
// a bancada do dono, no nivel CORE, e bancada que so alcanca uma subpasta nao e
// bancada. Ver docs/decisoes/2026-07-27-a-ide-abre-o-projeto.md.
//
// Toda operacao continua escopada na base, com sanitizacao rigida do caminho:
// resolve + startsWith na base, recusa ".." e nunca segue symlink pra fora
// (realpath do ancestral).

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

import { raizProjeto } from "../util/raizProjeto.js";
import { gravarTextoAtomico } from "../util/gravarJson.js";

// Pastas ignoradas na arvore, por NOME, em qualquer nivel: ruido pesado que nao
// interessa editar.
const IGNORAR = new Set(["node_modules", ".git", "dist"]);

// Pastas ignoradas por CAMINHO EXATO a partir da raiz. Diferente do IGNORAR por
// nome: "dados" e palavra comum demais pra sumir em qualquer nivel, e a pasta
// de dados de um cliente tem que continuar visivel.
//
// app/dados guarda o registro de workspaces, o CRM e o token da conexao. Some
// da IDE e do alcance do chat de IA, mas o Hub continua lendo e gravando nela
// normalmente: some da bancada, nao do sistema. Uma sessao no modo "Poder
// total" reescrevendo o CRM por engano nao tem desfazer.
const IGNORAR_CAMINHO = new Set(["app/dados"]);

// Profundidade maxima da arvore, pra nao varrer o mundo em pasta funda.
//
// Era 8 quando a base era a pasta do workspace. Com a base na raiz do projeto a
// arvore comeca um nivel acima, e o mais fundo hoje ja bate 7: sobrava um
// degrau. Truncar aqui nao avisa nada, so devolve pasta vazia, entao a margem
// virou folga de verdade. O teto continua existindo porque a raiz e calculada,
// e calculo errado nao pode virar varredura de disco inteiro.
const PROFUNDIDADE_MAX = 14;

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

// A base da IDE, com symlink ja resolvido.
function baseCanonica(): string {
  const raiz = raizProjeto();
  try {
    return realpathSync(raiz);
  } catch {
    return path.resolve(raiz);
  }
}

// O caminho relativo cai numa pasta bloqueada? Pega a propria pasta e tudo que
// esta dentro dela. Compara em minusculas porque no Windows o sistema de
// arquivos nao diferencia caixa, e "APP/Dados" abriria a mesma pasta.
function caminhoBloqueado(rel: string): boolean {
  const alvo = rel.toLowerCase();
  for (const bloqueada of IGNORAR_CAMINHO) {
    if (alvo === bloqueada || alvo.startsWith(`${bloqueada}/`)) return true;
  }
  return false;
}

// Resolve um caminho relativo dentro da base ativa de forma segura.
// Devolve a base canonica e o caminho absoluto. Lanca ErroIde 400 se sair da base.
function resolverSeguro(rel: unknown): { base: string; abs: string; rel: string } {
  if (typeof rel !== "string") {
    throw new ErroIde(400, "Caminho invalido.");
  }
  const base = baseCanonica();

  // Normaliza barras e tira barra inicial pra tratar sempre como relativo.
  const limpo = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  // Recusa qualquer segmento "..". Sem excecao.
  if (limpo.split("/").some((seg) => seg === "..")) {
    throw new ErroIde(400, "Caminho invalido.");
  }
  // O que nao aparece na arvore tambem nao se le, grava nem apaga por URL. Sem
  // isto, app/dados sumiria da lista e continuaria alcancavel por caminho
  // digitado, que e esconder em vez de proteger.
  if (caminhoBloqueado(limpo)) {
    throw new ErroIde(403, "Esse caminho e do sistema do Hub e nao abre na IDE.");
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
    if (caminhoBloqueado(rel)) continue;
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
  // Arvore completa do projeto. Nao depende de workspace ativo: a IDE abre
  // mesmo antes de existir um, que e o caso de quem acabou de instalar.
  app.get("/ide/arvore", async () => {
    const base = baseCanonica();
    const itens = construirArvore(base, "", 1);
    return { base: path.basename(base), itens };
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
