// Escrita do carrossel.html de uma peca e das imagens do editor. A peca vira
// HTML-first: a fonte da verdade e o carrossel.html, o PNG so nasce sob demanda.
// Mesmo padrao de gravacao atomica e backup unico por boot do cerebro.ts.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";

// Teto de gravacao do carrossel.html: 4 MB. Vale pra bytes utf8.
const TAMANHO_MAXIMO_HTML = 4 * 1024 * 1024;

// Teto da imagem decodificada: 20 MB.
const TAMANHO_MAXIMO_IMAGEM = 20 * 1024 * 1024;

// Extensoes de imagem aceitas no upload do editor.
const EXTENSOES_IMAGEM = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);

// Subpastas de PNG legado. Quando a peca vira HTML-first, o save apaga todas.
const SUBPASTAS_LEGADO = ["instagram", "instagram-stories", "stories", "post", "instagram-post"];

// Erro de negocio com status HTTP, pra virar resposta clara nas rotas.
export class ErroCarrossel extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// Backup unico por boot, por peca. So a primeira gravacao da sessao do servidor
// preserva o carrossel.html original em carrossel.html.bak. A chave e o caminho.
const backupsFeitos = new Set<string>();

// Faz UM backup do carrossel.html antes da primeira gravacao do servidor. Se nao
// existe original, so marca feito. Nao aborta: o carrossel nao e o Cerebro.
function backupUmaVez(caminho: string): void {
  if (backupsFeitos.has(caminho)) return;
  try {
    if (existsSync(caminho)) {
      copyFileSync(caminho, `${caminho}.bak`);
    }
  } catch {
    // Backup do carrossel e defensivo. Falhar aqui nao pode travar o save.
  }
  backupsFeitos.add(caminho);
}

// Grava o carrossel.html da peca de forma atomica (tmp + rename), com backup
// unico por boot. Depois apaga as subpastas de PNG legado: a peca vira HTML-first.
// Lanca ErroCarrossel em validacao (400 texto, 413 tamanho).
export function gravarCarrossel(pastaPeca: string, texto: unknown): void {
  if (typeof texto !== "string") {
    throw new ErroCarrossel(400, "O campo texto e obrigatorio e precisa ser uma string.");
  }
  if (Buffer.byteLength(texto, "utf8") > TAMANHO_MAXIMO_HTML) {
    throw new ErroCarrossel(413, "O carrossel passou do limite de 4 MB.");
  }

  const caminho = join(pastaPeca, "carrossel.html");
  backupUmaVez(caminho);

  // Gravacao atomica: escreve no .tmp e renomeia por cima do arquivo real.
  const tmp = join(pastaPeca, `.carrossel-${process.pid}-${Date.now()}.tmp`);
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

  // Apaga o PNG legado, se houver. A partir daqui a peca e HTML-first.
  for (const sub of SUBPASTAS_LEGADO) {
    const alvo = join(pastaPeca, sub);
    try {
      if (existsSync(alvo) && statSync(alvo).isDirectory()) {
        rmSync(alvo, { recursive: true, force: true });
      }
    } catch {
      // Falha ao apagar uma subpasta legado nao pode reverter o save.
    }
  }
}

// Reduz o nome enviado a uma base segura: so letras, numeros, hifen e sublinhado.
// Vazio vira "img" pra nunca gerar nome em branco.
function baseSegura(nome: string): string {
  const semExt = basename(nome, extname(nome));
  const limpo = semExt.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").slice(0, 60);
  const podado = limpo.replace(/^-+|-+$/g, "");
  return podado.length > 0 ? podado : "img";
}

// Salva uma imagem em <peca>/img/ com nome sanitizado e unico (base + timestamp).
// Aceita conteudoBase64 com ou sem o prefixo data URL. Devolve o caminho relativo
// a pasta da peca, ex "img/fundo-1720900000000.png". Lanca ErroCarrossel invalido.
export function salvarImagem(pastaPeca: string, nome: unknown, conteudoBase64: unknown): string {
  if (typeof nome !== "string" || !nome.trim()) {
    throw new ErroCarrossel(400, "O campo nome e obrigatorio.");
  }
  if (typeof conteudoBase64 !== "string" || !conteudoBase64) {
    throw new ErroCarrossel(400, "O campo conteudoBase64 e obrigatorio.");
  }

  const ext = extname(nome).toLowerCase();
  if (!EXTENSOES_IMAGEM.has(ext)) {
    throw new ErroCarrossel(400, "So aceito imagem (png, jpg, jpeg, webp, gif, svg, avif).");
  }

  // Tira o prefixo data URL, se veio "data:image/png;base64,...".
  const limpo = conteudoBase64.replace(/^data:[^;,]*;base64,/, "");
  let dados: Buffer;
  try {
    dados = Buffer.from(limpo, "base64");
  } catch {
    throw new ErroCarrossel(400, "Conteudo da imagem invalido.");
  }
  if (dados.length === 0) {
    throw new ErroCarrossel(400, "Conteudo da imagem invalido.");
  }
  if (dados.length > TAMANHO_MAXIMO_IMAGEM) {
    throw new ErroCarrossel(413, "A imagem passou do limite de 20 MB.");
  }

  const pastaImg = join(pastaPeca, "img");
  mkdirSync(pastaImg, { recursive: true });

  const nomeArquivo = `${baseSegura(nome)}-${Date.now()}${ext}`;
  writeFileSync(join(pastaImg, nomeArquivo), dados);

  // Caminho relativo com barra normal, pronto pro src no HTML.
  return `img/${nomeArquivo}`;
}
