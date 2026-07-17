import { existsSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { lerConexoes } from "../conexoes/estado.js";
import { emitir } from "../eventos/barramento.js";
import { obterPastaVkos } from "../vkos/estado.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import { publicarNoGithub } from "./github.js";
import { publicarNaNetlify } from "./netlify.js";
import { registroDaPeca } from "./estado.js";
import { ErroPublicacao } from "./http.js";
import { pastaDaPeca } from "./arquivos.js";
import {
  auditarSitePublicavel,
  type AlvoPublicacao,
} from "./auditoria.js";
import { ConversaoInviavel } from "./astro/conversor.js";
import { BuildFalhou, MotorIndisponivel } from "./astro/motor.js";
import {
  prepararAstro,
  resolverModoPublicacao,
  type ArtefatosAstro,
  type ModoPublicacao,
} from "./astro/publicacao.js";

export function nomePecaPublicacaoValido(pasta: string): boolean {
  return !!pasta &&
    !pasta.includes("\0") &&
    !pasta.includes("/") &&
    !pasta.includes("\\") &&
    !pasta.includes("..") &&
    !pasta.startsWith(".");
}

export function resolverAlvoPublicacao(bruto: string): AlvoPublicacao | null {
  const workspaceId = idWorkspaceAtivo();
  const pastaVkos = obterPastaVkos();
  if (!workspaceId || !pastaVkos) return null;
  let pasta: string;
  try {
    pasta = decodeURIComponent(bruto);
  } catch {
    return null;
  }
  if (!nomePecaPublicacaoValido(pasta)) return null;

  const base = resolve(join(pastaVkos, "conteudo"));
  const alvo = resolve(base, pasta);
  const rel = relative(base, alvo);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return null;
  try {
    if (!existsSync(alvo) || !statSync(alvo).isDirectory()) return null;
  } catch {
    return null;
  }
  return { workspaceId, pasta };
}

function alvoOuResposta(
  bruto: string,
  resposta: FastifyReply,
): AlvoPublicacao | FastifyReply {
  const temWorkspace = !!idWorkspaceAtivo() && !!obterPastaVkos();
  if (!temWorkspace) {
    return resposta.status(400).send({ erro: "Nenhum workspace ativo." });
  }
  const alvo = resolverAlvoPublicacao(bruto);
  if (alvo) return alvo;
  let decodificada = bruto;
  try { decodificada = decodeURIComponent(bruto); } catch { /* invalida */ }
  const pareceInvalida = !decodificada || /[\\/\0]/.test(decodificada) || decodificada.includes("..");
  return resposta
    .status(pareceInvalida ? 400 : 404)
    .send({ erro: pareceInvalida ? "Nome de peça inválido." : "Peça não encontrada." });
}

// URL publica conhecida da peca, usada pelo conversor pra gerar o sitemap.
// Vem do ultimo deploy Netlify registrado. Sem ela, o conversor pula o sitemap.
function urlPublicaConhecida(alvo: AlvoPublicacao): string | undefined {
  return registroDaPeca(alvo.workspaceId, alvo.pasta).netlify?.url;
}

function ehFalhaAstro(erro: unknown): erro is Error {
  return (
    erro instanceof ConversaoInviavel ||
    erro instanceof MotorIndisponivel ||
    erro instanceof BuildFalhou
  );
}

// Tenta preparar o projeto Astro. Em qualquer falha esperada (conversao, motor,
// build, dist), registra o aviso e devolve null pra o chamador cair no HTML.
async function prepararAstroOuFallback(
  pastaPeca: string,
  urlPublica: string | undefined,
  avisos: string[],
): Promise<ArtefatosAstro | null> {
  try {
    return await prepararAstro(pastaPeca, urlPublica);
  } catch (erro) {
    if (ehFalhaAstro(erro)) {
      avisos.push(erro.message);
      return null;
    }
    throw erro;
  }
}

function tratarErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroPublicacao) {
    return resposta.status(erro.statusHttp).send({ erro: erro.message });
  }
  const mensagem = erro instanceof Error ? erro.message : "Não foi possível publicar o site.";
  return resposta.status(500).send({ erro: mensagem });
}

async function exigirSitePublicavel(
  alvo: AlvoPublicacao,
): Promise<void> {
  // Host resolvido no server (mesmo do laco), nao a partir do header. Assim a
  // barreira do deploy e o laco conferem exatamente a mesma URL.
  const auditoria = await auditarSitePublicavel(alvo);
  if (!auditoria.valido) {
    throw new ErroPublicacao(
      `O site ainda não está pronto para publicar. ${auditoria.erros.join(" ")}`,
      400,
    );
  }
}

export const rotasPublicacao: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { pasta: string } }>("/publicacao/:pasta", async (req, resposta) => {
    const alvo = alvoOuResposta(req.params.pasta, resposta);
    if (!("workspaceId" in alvo)) return alvo;
    const servidores = lerConexoes(alvo.workspaceId).servidores;
    const auditoria = await auditarSitePublicavel(alvo);
    let modoPrevisto: ModoPublicacao = "html";
    try {
      modoPrevisto = resolverModoPublicacao(pastaDaPeca(alvo.workspaceId, alvo.pasta));
    } catch {
      modoPrevisto = "html";
    }
    return {
      github: {
        conectado: servidores.github?.habilitado === true && !!servidores.github.config.token?.trim(),
      },
      netlify: {
        conectado: servidores.netlify?.habilitado === true && !!servidores.netlify.config.token?.trim(),
      },
      registro: registroDaPeca(alvo.workspaceId, alvo.pasta),
      auditoria,
      modoPrevisto,
    };
  });

  app.post<{ Params: { pasta: string } }>("/publicacao/:pasta/github", async (req, resposta) => {
    const alvo = alvoOuResposta(req.params.pasta, resposta);
    if (!("workspaceId" in alvo)) return alvo;
    try {
      await exigirSitePublicavel(alvo);
      const pastaPeca = pastaDaPeca(alvo.workspaceId, alvo.pasta);
      const avisos: string[] = [];
      let modo: ModoPublicacao = "html";
      let arquivos: ArtefatosAstro["fonte"] | undefined;
      if (resolverModoPublicacao(pastaPeca) === "astro") {
        const artefatos = await prepararAstroOuFallback(
          pastaPeca,
          urlPublicaConhecida(alvo),
          avisos,
        );
        if (artefatos) {
          modo = "astro";
          arquivos = artefatos.fonte;
          avisos.push(...artefatos.projeto.avisos);
        }
      }
      const resultado = await publicarNoGithub(alvo.workspaceId, alvo.pasta, {
        arquivos,
        modo,
      });
      emitir({
        tipo: "peca:publicada",
        workspaceId: alvo.workspaceId,
        em: resultado.em,
        dados: { pasta: alvo.pasta, destino: "github", url: resultado.url },
      });
      return { ...resultado, modo, avisos };
    } catch (erro) {
      return tratarErro(erro, resposta);
    }
  });

  app.post<{ Params: { pasta: string } }>("/publicacao/:pasta/netlify", async (req, resposta) => {
    const alvo = alvoOuResposta(req.params.pasta, resposta);
    if (!("workspaceId" in alvo)) return alvo;
    try {
      await exigirSitePublicavel(alvo);
      const pastaPeca = pastaDaPeca(alvo.workspaceId, alvo.pasta);
      const avisos: string[] = [];
      let modo: ModoPublicacao = "html";
      let arquivos: ArtefatosAstro["dist"] | undefined;
      if (resolverModoPublicacao(pastaPeca) === "astro") {
        const artefatos = await prepararAstroOuFallback(
          pastaPeca,
          urlPublicaConhecida(alvo),
          avisos,
        );
        if (artefatos) {
          modo = "astro";
          arquivos = artefatos.dist;
          avisos.push(...artefatos.projeto.avisos);
        }
      }
      const resultado = await publicarNaNetlify(alvo.workspaceId, alvo.pasta, {
        arquivos,
        modo,
      });
      if (!resultado.pendente) {
        emitir({
          tipo: "peca:publicada",
          workspaceId: alvo.workspaceId,
          em: resultado.em,
          dados: { pasta: alvo.pasta, destino: "netlify", url: resultado.url },
        });
      }
      return { ...resultado, modo, avisos };
    } catch (erro) {
      return tratarErro(erro, resposta);
    }
  });

  // Diagnostico interno do QA e do suporte: converte e builda SEM publicar.
  // Nao aparece na UI.
  app.post<{ Params: { pasta: string } }>(
    "/publicacao/:pasta/ensaiar-astro",
    async (req, resposta) => {
      const alvo = alvoOuResposta(req.params.pasta, resposta);
      if (!("workspaceId" in alvo)) return alvo;
      try {
        const pastaPeca = pastaDaPeca(alvo.workspaceId, alvo.pasta);
        // Rota de diagnostico: mesmo quando o modo previsto e html, tenta a
        // conversao pra devolver o motivo REAL (elemento fora dos marcadores,
        // head divergente, motor indisponivel), nao um aviso generico.
        const avisos: string[] = [];
        const artefatos = await prepararAstroOuFallback(
          pastaPeca,
          urlPublicaConhecida(alvo),
          avisos,
        );
        if (!artefatos) {
          return { ok: false, modo: "html" as ModoPublicacao, paginas: [], avisos };
        }
        return {
          ok: true,
          modo: "astro" as ModoPublicacao,
          paginas: artefatos.projeto.paginas,
          avisos: [...avisos, ...artefatos.projeto.avisos],
        };
      } catch (erro) {
        return tratarErro(erro, resposta);
      }
    },
  );
};
