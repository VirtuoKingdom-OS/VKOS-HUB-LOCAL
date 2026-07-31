import { mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

import {
  decodificarBase64,
  EXTENSOES_ANEXO_GERAL,
  LIMITE_ANEXO_BYTES,
  nomeLivre,
  sanitizarNome,
} from "../anexos/rotas.js";
import { ErroCarrossel } from "./carrossel.js";

// Salva um material de apoio dentro da propria peca, para a sessao confinada
// conseguir le-lo sem sair de conteudo/<peca>/.
export function salvarAnexoPeca(
  pastaPeca: string,
  nome: unknown,
  conteudoBase64: unknown,
): string {
  if (typeof nome !== "string" || typeof conteudoBase64 !== "string") {
    throw new ErroCarrossel(400, "Informe nome e conteudoBase64.");
  }

  const nomeSeguro = sanitizarNome(nome);
  if (!nomeSeguro) {
    throw new ErroCarrossel(400, "Nome de arquivo invalido.");
  }

  const ext = extname(nomeSeguro).toLowerCase();
  if (!EXTENSOES_ANEXO_GERAL.has(ext)) {
    throw new ErroCarrossel(400, `Extensao "${ext || "sem extensao"}" nao aceita.`);
  }

  const dados = decodificarBase64(conteudoBase64);
  if (!dados) {
    throw new ErroCarrossel(400, "conteudoBase64 invalido.");
  }
  if (dados.length > LIMITE_ANEXO_BYTES) {
    throw new ErroCarrossel(413, "Arquivo passou do limite de 15MB.");
  }

  const pastaAnexos = join(pastaPeca, "anexos");
  mkdirSync(pastaAnexos, { recursive: true });
  const nomeFinal = nomeLivre(pastaAnexos, nomeSeguro);
  writeFileSync(join(pastaAnexos, nomeFinal), dados);
  return `anexos/${nomeFinal}`;
}
