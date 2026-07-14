// Rotas dos nos de contexto. Montado sob /api pelo index.ts.
// Cria, renomeia, apaga nos e cuida dos anexos (upload multipart, download, delete).
// O conteudo vive na pasta do VKOS, o indice em app/dados/contextos.json.

import { createReadStream, createWriteStream, existsSync, statSync, unlinkSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import multipart from "@fastify/multipart";

import {
  ErroContexto,
  listarContextos,
  criarContexto,
  atualizarContexto,
  removerContexto,
  obterContexto,
  caminhoAnexoSeguro,
  reservarNomeAnexo,
  carimbarAtualizacao,
  contentType,
} from "./armazenamento.js";

// Limite de 25MB por arquivo enviado.
const LIMITE_ARQUIVO = 25 * 1024 * 1024;

// Consome o resto do corpo da requisicao pra a resposta sair sem reset. Tem um
// teto de tempo: se o corpo ja acabou, resolve na hora.
function drenarRequisicao(req: FastifyRequest): Promise<void> {
  return new Promise((resolver) => {
    const bruto = req.raw;
    if (bruto.readableEnded) {
      resolver();
      return;
    }
    const terminar = () => {
      clearTimeout(tempo);
      resolver();
    };
    const tempo = setTimeout(terminar, 2000);
    bruto.on("end", terminar);
    bruto.on("close", terminar);
    bruto.on("error", terminar);
    bruto.resume();
  });
}

// Traduz um ErroContexto em resposta HTTP. Erro inesperado sobe pro handler global.
function responderErro(erro: unknown, resposta: FastifyReply): FastifyReply {
  if (erro instanceof ErroContexto) {
    return resposta.status(erro.status).send({ erro: erro.message });
  }
  throw erro;
}

export const rotasContextos: FastifyPluginAsync = async (app) => {
  // Multipart so pra este escopo de rotas. Limite por arquivo em 25MB.
  // throwFileSizeLimit false: em vez de estourar no meio do stream (o que reseta
  // a conexao), o arquivo vem truncado e a rota responde 413 limpo.
  await app.register(multipart, {
    limits: { fileSize: LIMITE_ARQUIVO },
    throwFileSizeLimit: false,
  });

  // Lista todos os nos de contexto.
  app.get("/contextos", async (_req, resposta) => {
    try {
      return { contextos: listarContextos() };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Cria um no novo a partir do nome e do tipo (texto por padrao).
  app.post("/contextos", async (req: FastifyRequest, resposta: FastifyReply) => {
    const corpo = (req.body ?? {}) as { nome?: unknown; tipo?: unknown };
    const nome = typeof corpo.nome === "string" ? corpo.nome : "";
    try {
      const contexto = criarContexto(nome, corpo.tipo);
      return resposta.status(201).send(contexto);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Renomeia e grava o texto do no.
  app.patch("/contextos/:id", async (req: FastifyRequest, resposta: FastifyReply) => {
    const { id } = req.params as { id: string };
    const corpo = (req.body ?? {}) as { nome?: unknown; texto?: unknown };
    const dados: { nome?: string; texto?: string } = {};
    if (typeof corpo.nome === "string") dados.nome = corpo.nome;
    if (typeof corpo.texto === "string") dados.texto = corpo.texto;
    try {
      return atualizarContexto(id, dados);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Apaga o no inteiro: pasta e entrada do indice.
  app.delete("/contextos/:id", async (req: FastifyRequest, resposta: FastifyReply) => {
    const { id } = req.params as { id: string };
    try {
      removerContexto(id);
      return { ok: true };
    } catch (erro) {
      return responderErro(erro, resposta);
    }
  });

  // Upload de anexos (um ou mais arquivos no mesmo request).
  app.post("/contextos/:id/arquivos", async (req: FastifyRequest, resposta: FastifyReply) => {
    const { id } = req.params as { id: string };

    // Confere que o no existe antes de comecar a gravar.
    try {
      obterContexto(id);
    } catch (erro) {
      return responderErro(erro, resposta);
    }

    let recebeuAlgum = false;
    // Nome do arquivo que estourou o limite, se algum estourar.
    let excedeu = "";
    try {
      const partes = req.parts();
      for await (const parte of partes) {
        if (parte.type !== "file") continue;
        recebeuAlgum = true;

        // Se ja estourou o limite, so drena o resto do corpo pra a resposta sair
        // limpa. Sem drenar, o socket reseta antes do cliente ler o 413.
        if (excedeu) {
          parte.file.resume();
          continue;
        }

        const { nome, caminho } = reservarNomeAnexo(id, parte.filename ?? "arquivo");
        try {
          await pipeline(parte.file, createWriteStream(caminho));
        } catch (erroGravar) {
          // Limpa o arquivo parcial e propaga.
          try {
            if (existsSync(caminho)) unlinkSync(caminho);
          } catch {
            // ignora
          }
          throw erroGravar;
        }

        // Estourou o limite de 25MB: o stream veio truncado. Descarta o parcial
        // e marca, mas segue o loop pra drenar o corpo que ainda esta chegando.
        if (parte.file.truncated) {
          try {
            if (existsSync(caminho)) unlinkSync(caminho);
          } catch {
            // ignora
          }
          excedeu = nome;
        }
      }
    } catch (erro) {
      return responderErro(erro, resposta);
    }

    if (excedeu) {
      // Drena o que ainda estiver chegando no socket antes de responder. Sem isso,
      // o cliente leva connection reset e nunca le o 413. Guarda de tempo pra nao
      // travar caso o corpo ja tenha acabado.
      await drenarRequisicao(req);
      return resposta.status(413).send({
        erro: `Arquivo "${excedeu}" passou do limite de 25MB.`,
      });
    }

    if (!recebeuAlgum) {
      return resposta.status(400).send({ erro: "Nenhum arquivo enviado." });
    }

    carimbarAtualizacao(id);
    return obterContexto(id);
  });

  // Remove um anexo especifico.
  app.delete("/contextos/:id/arquivos/:nome", async (req: FastifyRequest, resposta: FastifyReply) => {
    const { id, nome } = req.params as { id: string; nome: string };
    let alvo: string;
    try {
      alvo = caminhoAnexoSeguro(id, nome);
    } catch (erro) {
      return responderErro(erro, resposta);
    }
    if (!existsSync(alvo)) {
      return resposta.status(404).send({ erro: "Arquivo nao encontrado." });
    }
    try {
      unlinkSync(alvo);
    } catch {
      return resposta.status(500).send({ erro: "Nao deu pra apagar o arquivo." });
    }
    carimbarAtualizacao(id);
    return obterContexto(id);
  });

  // Serve um anexo pra preview, com content-type certo.
  app.get("/contextos/:id/arquivos/:nome", async (req: FastifyRequest, resposta: FastifyReply) => {
    const { id, nome } = req.params as { id: string; nome: string };
    let alvo: string;
    try {
      alvo = caminhoAnexoSeguro(id, nome);
    } catch (erro) {
      return responderErro(erro, resposta);
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
  });
};
