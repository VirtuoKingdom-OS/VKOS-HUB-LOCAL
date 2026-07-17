// Primitivas comuns de imagem dos dois Studios. Imagem de conteudo pode ser
// uma tag img ou a primeira camada url() de um background-image real.

import { enviarImagemPeca, urlArquivoContexto } from "../../api/cliente";
import { lerBase64 } from "../../util/arquivo";

export interface AlvoImagemCapturado {
  contexto: string;
  aplicar: (caminhoRelativo: string) => void | Promise<void>;
}

const PADRAO_URL = /url\(\s*["']?([^"')]+)["']?\s*\)/i;

export function extrairUrlFundo(valor: string): string {
  return PADRAO_URL.exec(valor)?.[1] ?? "";
}

export function substituirUrlFundo(valor: string, url: string): string {
  return valor.replace(PADRAO_URL, `url('${url}')`);
}

export function removerUrlFundo(valor: string): string {
  const semUrl = valor
    .replace(PADRAO_URL, "")
    .replace(/^\s*,|,\s*$|,\s*,/g, "")
    .trim();
  return semUrl || "none";
}

export function urlImagemPreview(src: string, pasta: string): string {
  const valor = src.trim();
  if (!valor) return "";
  if (/^(https?:|data:|blob:|\/\/|\/)/i.test(valor)) return valor;
  return `/pecas/${encodeURIComponent(pasta)}/${valor}`;
}

export async function aplicarImagemDaFonte(
  pasta: string,
  arquivo: { contextoId: string; nome: string },
  alvo: AlvoImagemCapturado,
): Promise<string> {
  const resposta = await fetch(urlArquivoContexto(arquivo.contextoId, arquivo.nome));
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar a imagem da fonte de dados.");
  }
  const blob = await resposta.blob();
  const conteudoBase64 = await lerBase64(new File([blob], arquivo.nome, { type: blob.type }));
  const { caminhoRelativo } = await enviarImagemPeca(pasta, {
    nome: arquivo.nome,
    conteudoBase64,
  });
  await alvo.aplicar(caminhoRelativo);
  return caminhoRelativo;
}
