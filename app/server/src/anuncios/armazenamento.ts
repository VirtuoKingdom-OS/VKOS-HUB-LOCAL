// Leitura e escrita do anuncio.json de uma peca. Mesmo padrao de gravacao
// atomica (tmp mais rename) e backup unico por boot do vkos/paginaSite.ts.
//
// A peca mora dentro do VKOS do workspace, em conteudo/<pasta>/anuncio.json, e
// nao em app/dados: quem chama ja resolveu a pasta pela barreira de
// vkos/pastaPeca.ts.

import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { NOME_ARQUIVO_ANUNCIO, descreverErroDeForma, validarPecaAnuncio } from "./modelo.js";
import type { PecaAnuncio } from "./modelo.js";

// Teto de leitura e gravacao do anuncio.json: 2 MB. Uma campanha inteira em
// texto nao passa de algumas dezenas de KB, entao passar disso e sinal de que
// alguem gravou outra coisa ali.
const TAMANHO_MAXIMO_JSON = 2 * 1024 * 1024;

// Erro de negocio com status HTTP, pra virar resposta clara nas rotas.
export class ErroAnuncio extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroAnuncio";
    this.status = status;
  }
}

export function caminhoAnuncio(pastaPeca: string): string {
  return join(pastaPeca, NOME_ARQUIVO_ANUNCIO);
}

export function existeAnuncio(pastaPeca: string): boolean {
  const caminho = caminhoAnuncio(pastaPeca);
  return existsSync(caminho) && statSync(caminho).isFile();
}

// Backup unico por boot, por peca. So a primeira gravacao da sessao do servidor
// preserva o arquivo original em "anuncio.json.bak". A chave e o caminho.
const backupsFeitos = new Set<string>();

// Faz UM backup antes da primeira gravacao do servidor. Sem original, so marca
// feito. Nao aborta: o backup e defensivo e nao pode travar o save.
function backupUmaVez(caminho: string): void {
  if (backupsFeitos.has(caminho)) return;
  try {
    if (existsSync(caminho)) {
      copyFileSync(caminho, `${caminho}.bak`);
    }
  } catch {
    // Backup e defensivo. Falhar aqui nao pode travar o save.
  }
  backupsFeitos.add(caminho);
}

// Le e valida o anuncio.json da peca. Lanca ErroAnuncio: 404 (arquivo ausente),
// 413 (tamanho), 422 (JSON quebrado ou forma invalida).
export function lerAnuncio(pastaPeca: string): PecaAnuncio {
  const caminho = caminhoAnuncio(pastaPeca);
  if (!existeAnuncio(pastaPeca)) {
    throw new ErroAnuncio(404, "Essa peça não tem um anuncio.json.");
  }
  if (statSync(caminho).size > TAMANHO_MAXIMO_JSON) {
    throw new ErroAnuncio(413, "O anuncio.json passou do limite de 2 MB.");
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(caminho, "utf8")) as unknown;
  } catch {
    throw new ErroAnuncio(422, "O anuncio.json não é um JSON válido.");
  }

  const resultado = validarPecaAnuncio(bruto);
  if (!resultado.success) {
    throw new ErroAnuncio(422, descreverErroDeForma(resultado.error));
  }
  return resultado.data;
}

// Diagnostico da forma do anuncio.json, pra lista de pecas e pro laco de
// conformidade. NUNCA lanca: devolve o veredito e o erro literal.
//
// Espelha o que auditarSiteEstatico faz pela peca de site. Existe porque a
// classificacao chama a peca de "anuncio" so por existir um anuncio.json na
// raiz, SEM olhar o conteudo, e isso e o certo: campanha com forma quebrada
// continua sendo uma peca de anuncio, e mandar ela pra "texto" faria a tela do
// anuncio nunca abrir justo no caso em que o dono precisa ver o problema. Quem
// carrega o veredito e a peca, entao, e nao o tipo dela.
export function diagnosticarAnuncio(pastaPeca: string): { valido: boolean; erro?: string } {
  try {
    lerAnuncio(pastaPeca);
    return { valido: true };
  } catch (erro) {
    return {
      valido: false,
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

// Grava a peca de forma atomica, com backup unico por boot. Recebe peca ja
// validada: quem valida e a rota, que sabe responder 422.
export function gravarAnuncio(pastaPeca: string, peca: PecaAnuncio): void {
  if (!existsSync(pastaPeca) || !statSync(pastaPeca).isDirectory()) {
    throw new ErroAnuncio(404, "Peça não encontrada.");
  }

  const caminho = caminhoAnuncio(pastaPeca);
  const texto = `${JSON.stringify(peca, null, 2)}\n`;
  if (Buffer.byteLength(texto, "utf8") > TAMANHO_MAXIMO_JSON) {
    throw new ErroAnuncio(413, "O anuncio.json passou do limite de 2 MB.");
  }

  backupUmaVez(caminho);

  // Gravacao atomica: escreve no .tmp e renomeia por cima do arquivo real.
  const tmp = join(pastaPeca, `.anuncio-${process.pid}-${Date.now()}.tmp`);
  writeFileSync(tmp, texto, "utf8");
  try {
    renameSync(tmp, caminho);
  } catch (erro) {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      // ignora: limpeza do parcial e defensiva.
    }
    throw erro;
  }
}
