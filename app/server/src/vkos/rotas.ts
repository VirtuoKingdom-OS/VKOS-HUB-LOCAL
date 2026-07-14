// Rotas da ponte VKOS. Monta o estado do VKOS escolhido, serve o Cerebro, as
// skills e as pecas, e entrega os arquivos das pecas de dentro de conteudo/.
//
// Dois plugins: rotasVkos (montado sob /api pelo index.ts) e rotasPecas
// (montado na raiz, sem prefixo, porque o frontend faz proxy de /pecas separado).

import { createReadStream, existsSync, rmSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import type { EstadoVkos } from "../tipos.js";
import { obterPastaVkos, validarPastaVkos } from "./estado.js";
import {
  cerebroPreenchido,
  ErroCerebro,
  gravarCerebro,
  lerCerebro,
  lerCerebroCompleto,
} from "./cerebro.js";
import { transmitir } from "../ws.js";
import { registrarEAtivar } from "../workspaces/ativacao.js";
import { lerSkills } from "./skills.js";
import { lerPecas, reinstalarObservador } from "./pecas.js";
import { servirZip } from "./zip.js";
import { lerModelosCarrossel } from "./modelos.js";

// Monta o EstadoVkos a partir da pasta atual (ou null).
function montarEstado(pasta: string | null): EstadoVkos {
  if (!pasta) {
    return { pasta: null, valida: false, cerebroPreenchido: false, totalSkills: 0 };
  }
  const validacao = validarPastaVkos(pasta);
  if (!validacao.valida) {
    return { pasta, valida: false, cerebroPreenchido: false, totalSkills: 0 };
  }
  const cerebro = lerCerebro(pasta);
  const skills = lerSkills(pasta);
  return {
    pasta,
    valida: true,
    cerebroPreenchido: cerebro.preenchido,
    totalSkills: skills.length,
  };
}

export const rotasVkos: FastifyPluginAsync = async (app) => {
  // Observador de conteudo comeca junto com o servidor.
  reinstalarObservador();

  // Estado atual da ponte.
  app.get("/vkos", async () => {
    return montarEstado(obterPastaVkos());
  });

  // Escolhe (e valida) a pasta do VKOS. Erro 400 com mensagem clara se invalida.
  app.post("/vkos", async (req: FastifyRequest, resposta: FastifyReply) => {
    const corpo = (req.body ?? {}) as { caminho?: unknown };
    const caminho = typeof corpo.caminho === "string" ? corpo.caminho.trim() : "";

    const validacao = validarPastaVkos(caminho);
    if (!validacao.valida) {
      return resposta.status(400).send({ erro: validacao.motivo });
    }

    // Registra (ou reaproveita) e ATIVA o workspace dessa pasta. Isso ja chama
    // definirPastaVkos, religa o observador e transmite workspace:ativado, pra o
    // onboarding existente continuar redondo.
    registrarEAtivar(caminho);
    return montarEstado(caminho);
  });

  // Conteudo do Cerebro. Contrato novo: texto, caminho, atualizadoEm (mtime).
  // conteudo e preenchido continuam por compatibilidade com o painel atual.
  app.get("/vkos/cerebro", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    const cerebro = lerCerebroCompleto(pasta);
    if (!cerebro) {
      return resposta.status(404).send({ erro: "Nao achei o cerebro.md nessa pasta." });
    }
    return {
      texto: cerebro.texto,
      caminho: cerebro.caminho,
      atualizadoEm: cerebro.atualizadoEm,
      conteudo: cerebro.texto,
      preenchido: cerebroPreenchido(cerebro.texto),
    };
  });

  // Grava o Cerebro. Corpo { texto }. Gravacao atomica com backup unico por boot.
  // Depois de gravar, transmite cerebro:atualizado pelo WebSocket. Limite de corpo
  // folgado (2MB) pra o JSON com o texto de ate 512 KB e os escapes caberem.
  app.put(
    "/vkos/cerebro",
    { bodyLimit: 2 * 1024 * 1024 },
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const pasta = obterPastaVkos();
      if (!pasta) {
        return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
      }
      const corpo = (req.body ?? {}) as { texto?: unknown };
      try {
        const salvo = gravarCerebro(pasta, corpo.texto);
        transmitir({ tipo: "cerebro:atualizado" });
        return {
          texto: salvo.texto,
          caminho: salvo.caminho,
          atualizadoEm: salvo.atualizadoEm,
          conteudo: salvo.texto,
          preenchido: cerebroPreenchido(salvo.texto),
        };
      } catch (erro) {
        if (erro instanceof ErroCerebro) {
          return resposta.status(erro.status).send({ erro: erro.message });
        }
        throw erro;
      }
    },
  );

  // Lista das skills (comandos) do VKOS.
  app.get("/vkos/skills", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    return { skills: lerSkills(pasta) };
  });

  // Lista das pecas geradas.
  app.get("/vkos/pecas", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    return { pecas: lerPecas(pasta) };
  });

  // Baixa uma geracao inteira como ZIP, imagens renomeadas em ordem natural.
  app.get("/vkos/pecas/:pasta/zip", servirZip);

  // Apaga uma geracao inteira: a subpasta da peca dentro de conteudo/.
  // Sanitizacao rigida: o nome nao pode conter separador nem "..", e o alvo
  // resolvido precisa ser uma subpasta direta e existente de conteudo/.
  app.delete("/vkos/pecas/:pasta", async (req, resposta) => {
    const pastaVkos = obterPastaVkos();
    if (!pastaVkos) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    const { pasta } = req.params as { pasta: string };
    if (
      !pasta ||
      pasta.includes("/") ||
      pasta.includes("\\") ||
      pasta.includes("..") ||
      pasta.startsWith(".")
    ) {
      return resposta.status(400).send({ erro: "Nome de peça inválido." });
    }
    const pastaConteudo = join(pastaVkos, "conteudo");
    const alvo = join(pastaConteudo, pasta);
    // O alvo resolvido tem que continuar dentro de conteudo/.
    if (!alvo.startsWith(pastaConteudo + sep)) {
      return resposta.status(400).send({ erro: "Nome de peça inválido." });
    }
    if (!existsSync(alvo) || !statSync(alvo).isDirectory()) {
      return resposta.status(404).send({ erro: "Peça não encontrada." });
    }
    rmSync(alvo, { recursive: true, force: true });
    // O watcher de conteudo/ tambem dispara, mas transmitir aqui garante a
    // atualizacao imediata mesmo se o watch falhar no Windows.
    transmitir({ tipo: "pecas:atualizadas" });
    return { ok: true };
  });

  // Lista dos modelos de carrossel (templates/carrossel/modelo-*.html).
  app.get("/vkos/modelos-carrossel", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    return { modelos: lerModelosCarrossel(pasta) };
  });

};

// Arquivos das pecas na raiz (sem /api). O index.ts registra sem prefixo.
export const rotasPecas: FastifyPluginAsync = async (app) => {
  app.get("/pecas/*", servirPeca);
};

// Mapa simples de content-type pelas extensoes que as pecas usam.
const TIPOS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
};

function contentType(caminho: string): string {
  const ponto = caminho.lastIndexOf(".");
  const ext = ponto >= 0 ? caminho.slice(ponto).toLowerCase() : "";
  return TIPOS[ext] ?? "application/octet-stream";
}

// Serve um arquivo de dentro de conteudo/ da pasta VKOS escolhida.
// Seguranca: resolve o alvo e garante que ele esta dentro de conteudo/. Bloqueia
// qualquer tentativa de sair da pasta (../, caminho absoluto, byte nulo).
async function servirPeca(req: FastifyRequest, resposta: FastifyReply): Promise<FastifyReply> {
  const pasta = obterPastaVkos();
  if (!pasta) {
    return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
  }

  const params = req.params as Record<string, string>;
  const bruto = params["*"] ?? "";

  let relativo: string;
  try {
    relativo = decodeURIComponent(bruto);
  } catch {
    return resposta.status(400).send({ erro: "Caminho invalido." });
  }
  if (relativo.includes("\0")) {
    return resposta.status(400).send({ erro: "Caminho invalido." });
  }

  const base = resolve(join(pasta, "conteudo"));
  const alvo = resolve(base, relativo);

  // Garante que o alvo esta dentro de conteudo/. rel comeca com .. ou vira
  // absoluto quando o caminho escapa da base.
  const rel = relative(base, alvo);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    return resposta.status(403).send({ erro: "Acesso fora da pasta de conteudo." });
  }

  let estat;
  try {
    estat = statSync(alvo);
  } catch {
    return resposta.status(404).send({ erro: "Arquivo nao encontrado." });
  }
  if (!estat.isFile()) {
    return resposta.status(404).send({ erro: "Arquivo nao encontrado." });
  }

  resposta.header("Content-Type", contentType(alvo));
  resposta.header("Content-Length", estat.size);
  return resposta.send(createReadStream(alvo));
}
