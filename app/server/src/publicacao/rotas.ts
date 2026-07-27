import { existsSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { emitir } from "../eventos/barramento.js";
import { obterPastaVkos } from "../vkos/estado.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import { atualizarRegistroPeca, registroDaPeca } from "./estado.js";
import { ErroPublicacao } from "./erros.js";
import { pastaDaPeca } from "./arquivos.js";
import {
  auditarSitePublicavel,
  type AlvoPublicacao,
} from "./auditoria.js";
import {
  abrirPastaNoSistema,
  conferirBarreiraQualidade,
  criarZipExportacao,
  nomeArquivoExportacao,
  prepararConteudoExportacao,
} from "./exportacao.js";
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

function ehFalhaAstro(erro: unknown): erro is Error {
  return (
    erro instanceof ConversaoInviavel ||
    erro instanceof MotorIndisponivel ||
    erro instanceof BuildFalhou
  );
}

function tratarErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroPublicacao) {
    return resposta.status(erro.statusHttp).send({ erro: erro.message });
  }
  const mensagem = erro instanceof Error ? erro.message : "Não foi possível exportar o site.";
  return resposta.status(500).send({ erro: mensagem });
}

export const rotasPublicacao: FastifyPluginAsync = async (app) => {
  // Estado da exportacao: o veredicto da auditoria, o modo previsto do pacote e
  // a ultima exportacao registrada. Nao fala mais de destino remoto.
  app.get<{ Params: { pasta: string } }>("/publicacao/:pasta", async (req, resposta) => {
    const alvo = alvoOuResposta(req.params.pasta, resposta);
    if (!("workspaceId" in alvo)) return alvo;
    const auditoria = await auditarSitePublicavel(alvo);
    let modoPrevisto: ModoPublicacao = "html";
    try {
      modoPrevisto = resolverModoPublicacao(pastaDaPeca(alvo.workspaceId, alvo.pasta));
    } catch {
      modoPrevisto = "html";
    }
    return {
      registro: registroDaPeca(alvo.workspaceId, alvo.pasta),
      auditoria,
      modoPrevisto,
      nomeArquivo: nomeArquivoExportacao(alvo.pasta),
    };
  });

  // Abre a pasta da peca no explorador de arquivos do sistema.
  app.post<{ Params: { pasta: string } }>(
    "/publicacao/:pasta/abrir-pasta",
    async (req, resposta) => {
      const alvo = alvoOuResposta(req.params.pasta, resposta);
      if (!("workspaceId" in alvo)) return alvo;
      try {
        await abrirPastaNoSistema(pastaDaPeca(alvo.workspaceId, alvo.pasta));
        return { ok: true };
      } catch (erro) {
        return tratarErro(erro, resposta);
      }
    },
  );

  // Baixa o site pronto num ZIP. Passa pela mesma barreira de qualidade que
  // barrava o deploy: site reprovado na auditoria nao vira arquivo.
  // POST, e nao GET, de proposito. A rota levanta navegador, roda auditoria em
  // duas viewports e pode disparar npm install e astro build. Em GET, uma tag
  // <img src> em qualquer site aberto numa aba dispararia tudo isso na maquina
  // do usuario, porque o guarda de Host aceita a origem local e o navegador
  // manda a requisicao mesmo sem poder ler a resposta.
  app.post<{ Params: { pasta: string } }>(
    "/publicacao/:pasta/exportar",
    async (req, resposta) => {
      const alvo = alvoOuResposta(req.params.pasta, resposta);
      if (!("workspaceId" in alvo)) return alvo;
      try {
        conferirBarreiraQualidade(await auditarSitePublicavel(alvo));
        const conteudo = await prepararConteudoExportacao(
          alvo.workspaceId,
          alvo.pasta,
          pastaDaPeca(alvo.workspaceId, alvo.pasta),
        );
        const zip = criarZipExportacao(conteudo.arquivos);
        zip.on("error", (erro) => {
          req.log?.error?.(erro);
          resposta.raw.destroy(erro);
        });

        // So registra depois que o ZIP saiu inteiro. Registrar antes marcava a
        // peca como exportada mesmo quando o download morria no meio, e a tela
        // passava a mostrar "ultima exportacao" de um arquivo que nunca chegou.
        zip.on("end", () => {
          const em = new Date().toISOString();
          atualizarRegistroPeca(alvo.workspaceId, alvo.pasta, {
            exportacao: { em, modo: conteudo.modo },
          });
          emitir({
            tipo: "peca:exportada",
            workspaceId: alvo.workspaceId,
            em,
            dados: { pasta: alvo.pasta, modo: conteudo.modo, avisos: conteudo.avisos },
          });
        });

        resposta.header("Content-Type", "application/zip");
        resposta.header(
          "Content-Disposition",
          `attachment; filename="${nomeArquivoExportacao(alvo.pasta)}"`,
        );
        // O modo real e os avisos viajam em header: o corpo e o ZIP, e a tela
        // precisa saber se saiu Astro ou HTML puro.
        resposta.header("X-VKOS-Modo-Exportacao", conteudo.modo);
        if (conteudo.avisos.length > 0) {
          // Motivo do fallback pra HTML, pra tela poder contar ao usuario.
          resposta.header(
            "X-VKOS-Avisos-Exportacao",
            encodeURIComponent(conteudo.avisos.join(" | ")),
          );
        }
        resposta.send(zip);
        // O erro do finalize ja chega no listener de erro acima. Sem este catch
        // a Promise rejeitada derruba o processo no Node 24.
        zip.finalize().catch(() => {});
        return resposta;
      } catch (erro) {
        return tratarErro(erro, resposta);
      }
    },
  );

  // Diagnostico interno do QA e do suporte: converte e builda SEM exportar.
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
        let artefatos: ArtefatosAstro | null = null;
        try {
          artefatos = await prepararAstro(pastaPeca);
        } catch (falha) {
          if (!ehFalhaAstro(falha)) throw falha;
          avisos.push(falha.message);
        }
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
