// Escrita de uma pagina HTML de site gerado (peca tipo "site"). Mesmo padrao de
// gravacao atomica e backup unico por boot do carrossel.ts. A rota regrava uma
// pagina que ja existe na peca, inclusive em subpasta, e nunca cria pagina nova.

import {
  copyFileSync,
  existsSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { resolverArquivoSite } from "./siteEstatico.js";

// Teto de gravacao de uma pagina: 4 MB. Vale pra bytes utf8.
const TAMANHO_MAXIMO_HTML = 4 * 1024 * 1024;

// Erro de negocio com status HTTP, pra virar resposta clara nas rotas.
export class ErroPaginaSite extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// Backup unico por boot, por pagina. So a primeira gravacao da sessao do
// servidor preserva o arquivo original em "<arquivo>.bak". A chave e o caminho.
const backupsFeitos = new Set<string>();

// Faz UM backup da pagina antes da primeira gravacao do servidor. Se nao existe
// original, so marca feito. Nao aborta: o backup e defensivo.
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

// Resolve e valida o caminho da pagina dentro da raiz da peca. Aceita paginas
// na raiz e em subpastas, sem traversal. Isto cobre sites multipagina com URLs
// limpas, como servicos/index.html, sem abrir escrita fora da peca.
export function resolverPagina(pastaPeca: string, arquivoBruto: unknown): string {
  try {
    return resolverArquivoSite(pastaPeca, arquivoBruto);
  } catch (erro) {
    throw new ErroPaginaSite(
      400,
      erro instanceof Error ? erro.message : "Nome de página inválido.",
    );
  }
}

// Grava a pagina da peca de forma atomica (tmp + rename), com backup unico por
// boot. So regrava pagina que JA existe: a rota nao cria pagina nova. Lanca
// ErroPaginaSite em validacao: 400 (nome ou texto invalido), 404 (pagina
// ausente), 413 (tamanho).
export function gravarPaginaSite(pastaPeca: string, arquivoBruto: unknown, texto: unknown): void {
  const caminho = resolverPagina(pastaPeca, arquivoBruto);

  if (!existsSync(caminho) || !statSync(caminho).isFile()) {
    throw new ErroPaginaSite(404, "Essa página não existe nessa peça.");
  }
  if (typeof texto !== "string") {
    throw new ErroPaginaSite(400, "O campo texto é obrigatório e precisa ser uma string.");
  }
  if (Buffer.byteLength(texto, "utf8") > TAMANHO_MAXIMO_HTML) {
    throw new ErroPaginaSite(413, "A página passou do limite de 4 MB.");
  }

  backupUmaVez(caminho);

  // Gravacao atomica: escreve no .tmp e renomeia por cima do arquivo real.
  const tmp = join(pastaPeca, `.pagina-${process.pid}-${Date.now()}.tmp`);
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
