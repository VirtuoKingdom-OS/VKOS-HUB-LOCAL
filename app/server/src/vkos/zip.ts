// Empacota as imagens de preview de uma peca num ZIP, renomeadas em ordem.
// Convenção de nome: base = tema so com letras e numeros (bolo-sem-susto vira
// bolosemsusto, vazio vira geracao). Entradas: <base>01.png, <base>02.png...
// (dois digitos, extensao original de cada arquivo). O zip se chama <base>.zip.

import { readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import archiver from "archiver";

import { obterPastaVkos } from "./estado.js";
import { listarImagensPreview } from "./pecas.js";

// Reduz o tema a base do nome: so letras e numeros, tudo minusculo. Vazio vira
// "geracao" pra nunca gerar um nome de arquivo em branco.
export function baseDoTema(tema: string): string {
  const limpo = tema.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return limpo.length > 0 ? limpo : "geracao";
}

// Extrai a extensao (com o ponto) de um caminho interno. Sem ponto vira ".png".
function extensaoDe(interno: string): string {
  const ponto = interno.lastIndexOf(".");
  return ponto >= 0 ? interno.slice(ponto).toLowerCase() : ".png";
}

// GET /vkos/pecas/:pasta/zip: streama o ZIP das imagens da peca em ordem natural.
// 400 sem pasta VKOS escolhida, 404 pasta inexistente, 400 peca sem imagem.
// Seguranca: o parametro pasta e um unico segmento e nunca escapa de conteudo/.
export async function servirZip(
  req: FastifyRequest,
  resposta: FastifyReply,
): Promise<FastifyReply> {
  const pastaVkos = obterPastaVkos();
  if (!pastaVkos) {
    return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
  }

  const params = req.params as Record<string, string>;
  const bruto = params["pasta"] ?? "";

  let nomePasta: string;
  try {
    nomePasta = decodeURIComponent(bruto);
  } catch {
    return resposta.status(400).send({ erro: "Nome de pasta invalido." });
  }

  // O nome da peca e um unico segmento dentro de conteudo/. Barra, ".." ou byte
  // nulo sao tentativa de sair da pasta: barra fatal.
  if (
    !nomePasta ||
    nomePasta.includes("\0") ||
    nomePasta.includes("/") ||
    nomePasta.includes("\\") ||
    nomePasta === "." ||
    nomePasta === ".."
  ) {
    return resposta.status(400).send({ erro: "Nome de pasta invalido." });
  }

  const base = resolve(join(pastaVkos, "conteudo"));
  const alvo = resolve(base, nomePasta);

  // Reforco: mesmo depois de resolver, o alvo tem que ficar dentro de conteudo/.
  const rel = relative(base, alvo);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    return resposta.status(400).send({ erro: "Nome de pasta invalido." });
  }

  // A pasta da peca precisa existir de verdade.
  let ehPasta = false;
  try {
    ehPasta = statSync(alvo).isDirectory();
  } catch {
    ehPasta = false;
  }
  if (!ehPasta) {
    return resposta.status(404).send({ erro: "Peca nao encontrada." });
  }

  // Imagens de preview em ordem natural. Peca sem imagem (site, texto) nao zipa.
  const { tema, internos } = listarImagensPreview(pastaVkos, nomePasta);
  if (internos.length === 0) {
    return resposta.status(400).send({ erro: "Essa peca nao tem imagem pra baixar." });
  }

  const nomeBase = baseDoTema(tema);

  // Store: PNG ja vem comprimido, a prioridade e velocidade.
  const arquivo = archiver("zip", { store: true });
  arquivo.on("error", (erro) => {
    req.log?.error?.(erro);
    resposta.raw.destroy(erro);
  });

  resposta.header("Content-Type", "application/zip");
  resposta.header("Content-Disposition", `attachment; filename="${nomeBase}.zip"`);

  // Append de buffer em sequencia: garante a ordem natural das entradas dentro
  // do zip (arquivo.file faz stat assincrono e embaralha a ordem interna).
  for (const [i, interno] of internos.entries()) {
    const ordem = String(i + 1).padStart(2, "0");
    const nomeEntrada = `${nomeBase}${ordem}${extensaoDe(interno)}`;
    // interno usa barra normal: quebra em segmentos pro join do Windows.
    const caminhoAbs = join(alvo, ...interno.split("/"));
    try {
      arquivo.append(readFileSync(caminhoAbs), { name: nomeEntrada });
    } catch {
      // Arquivo sumiu entre a listagem e o zip: segue sem ele.
    }
  }

  // Enviar o stream e finalizar. O finalize fecha o zip depois de enfileirar tudo.
  resposta.send(arquivo);
  void arquivo.finalize();
  return resposta;
}
