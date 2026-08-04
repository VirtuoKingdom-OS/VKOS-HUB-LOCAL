// Rotas da peca de anuncio. Montado sob /api pelo index.ts.
//
// A peca mora no VKOS do workspace, entao a barreira de pasta e a mesma das
// outras rotas de peca: vkos/pastaPeca.ts. Uma segunda copia dela seria uma
// segunda chance de escrever fora de conteudo/.

import { existsSync, statSync } from "node:fs";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { obterPastaVkos } from "../vkos/estado.js";
import { resolverPeca } from "../vkos/pastaPeca.js";
import { idWorkspaceAtivo } from "../workspaces/estado.js";
import { transmitir } from "../nucleo/ws.js";
import { ErroAnuncio, gravarAnuncio, lerAnuncio } from "./armazenamento.js";
import { conferirLimites } from "./limites.js";
import { descreverErroDeForma, validarPecaAnuncio } from "./modelo.js";
import { gravarVinculo, lerVinculo } from "./vinculo.js";

// Resolve a pasta da peca a partir do parametro da URL. Devolve a resposta de
// erro ja pronta quando algo nao bate, pra as duas rotas responderem igual.
function resolverPastaDaPeca(
  req: FastifyRequest,
  resposta: FastifyReply,
): { pasta: string; nome: string } | { erro: FastifyReply } {
  const pastaVkos = obterPastaVkos();
  if (!pastaVkos) {
    return { erro: resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." }) };
  }
  const { pasta } = req.params as { pasta: string };
  const resolvida = resolverPeca(pastaVkos, pasta);
  if (!resolvida) {
    return { erro: resposta.status(400).send({ erro: "Nome de peça inválido." }) };
  }
  if (!existsSync(resolvida.alvo) || !statSync(resolvida.alvo).isDirectory()) {
    return { erro: resposta.status(404).send({ erro: "Peça não encontrada." }) };
  }
  return { pasta: resolvida.alvo, nome: resolvida.nome };
}

export const rotasAnuncios: FastifyPluginAsync = async (app) => {
  // A peca inteira mais o que estoura limite do Google. As violacoes vem juntas
  // de proposito: a tela precisa marcar o campo no mesmo render, e recalcular
  // isso no navegador seria uma segunda tabela de limites pra manter.
  app.get("/anuncios/:pasta", async (req: FastifyRequest, resposta: FastifyReply) => {
    const resolvida = resolverPastaDaPeca(req, resposta);
    if ("erro" in resolvida) return resolvida.erro;

    try {
      const peca = lerAnuncio(resolvida.pasta);
      return { peca, violacoes: conferirLimites(peca) };
    } catch (erro) {
      if (erro instanceof ErroAnuncio) {
        return resposta.status(erro.status).send({ erro: erro.message });
      }
      throw erro;
    }
  });

  // Grava a peca. So forma invalida reprova: titulo estourado grava e volta como
  // violacao, porque quem decide se corrige ou nao e o dono.
  app.put(
    "/anuncios/:pasta",
    { bodyLimit: 2 * 1024 * 1024 },
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const resolvida = resolverPastaDaPeca(req, resposta);
      if ("erro" in resolvida) return resolvida.erro;

      const validacao = validarPecaAnuncio(req.body);
      if (!validacao.success) {
        return resposta.status(422).send({ erro: descreverErroDeForma(validacao.error) });
      }

      try {
        gravarAnuncio(resolvida.pasta, validacao.data);
      } catch (erro) {
        if (erro instanceof ErroAnuncio) {
          return resposta.status(erro.status).send({ erro: erro.message });
        }
        throw erro;
      }

      transmitir({ tipo: "pecas:atualizadas" });
      return { ok: true, violacoes: conferirLimites(validacao.data) };
    },
  );

  // QUAL CONVERSA ESCREVEU ESTA PECA.
  //
  // A resposta e o id da sessao do Hub, e so isso. Quem decide se aquela sessao
  // ainda esta viva e a tela, que ja tem a lista de sessoes do workspace pelo
  // mesmo estado que alimenta o resto do app. Devolver "vivo: true" daqui seria
  // uma segunda verdade sobre o mesmo fato, e as duas envelheceriam diferente.
  //
  // Peca sem conversa responde 200 com sessaoId nulo, nao 404: a peca existe, e
  // "ainda nao tem conversa" e um estado normal (peca escrita a mao, ou vinculo
  // perdido). 404 aqui mandaria a tela tratar o normal como falha.
  app.get(
    "/anuncios/:pasta/conversa",
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const resolvida = resolverPastaDaPeca(req, resposta);
      if ("erro" in resolvida) return resolvida.erro;

      const workspaceId = idWorkspaceAtivo();
      if (!workspaceId) {
        return resposta.status(400).send({ erro: "nenhum workspace ativo" });
      }
      const vinculo = lerVinculo(workspaceId, resolvida.nome);
      return {
        sessaoId: vinculo?.sessaoId ?? null,
        atualizadoEm: vinculo?.atualizadoEm ?? null,
      };
    },
  );

  // APONTA A PECA PRA OUTRA CONVERSA.
  //
  // Quem chama e a tela do anuncio, depois de abrir uma sessao de resgate porque
  // a anterior morreu. A geracao nao passa por aqui: ali quem grava e o servidor,
  // em sessoes/rotas.ts, logo depois de criar a sessao, porque o navegador pode
  // fechar no meio e o vinculo tem que existir do mesmo jeito.
  app.put(
    "/anuncios/:pasta/conversa",
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const resolvida = resolverPastaDaPeca(req, resposta);
      if ("erro" in resolvida) return resolvida.erro;

      const corpo = (req.body ?? {}) as { sessaoId?: unknown };
      const sessaoId =
        typeof corpo.sessaoId === "string" ? corpo.sessaoId.trim() : "";
      if (!sessaoId) {
        return resposta.status(400).send({ erro: "sessaoId e obrigatorio" });
      }

      const workspaceId = idWorkspaceAtivo();
      if (!workspaceId) {
        return resposta.status(400).send({ erro: "nenhum workspace ativo" });
      }
      const vinculo = gravarVinculo(workspaceId, resolvida.nome, sessaoId);
      return { sessaoId: vinculo.sessaoId, atualizadoEm: vinculo.atualizadoEm };
    },
  );
};
