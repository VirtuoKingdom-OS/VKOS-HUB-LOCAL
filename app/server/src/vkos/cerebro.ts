// Leitura do Cerebro do VKOS: o cerebro/cerebro.md, a identidade do negocio.
// Heuristica de preenchido: um Cerebro em branco ainda tem os marcadores de
// campo vazio (o lapis). Um preenchido nao tem nenhum.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// Marcador de campo em branco usado no template do Cerebro.
const MARCADOR_VAZIO = "✍️";

// Teto de gravacao do Cerebro: 512 KB. Vale pra bytes utf8.
const TAMANHO_MAXIMO = 512 * 1024;

// Erro de negocio com status HTTP, pra virar resposta clara nas rotas.
export class ErroCerebro extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// Caminho do cerebro.md dentro de uma pasta de VKOS.
function caminhoCerebro(pastaVkos: string): string {
  return join(pastaVkos, "cerebro", "cerebro.md");
}

export interface CerebroLido {
  caminho: string;
  conteudo: string;
  preenchido: boolean;
}

// UM CEREBRO ESTA PREENCHIDO QUANDO NENHUM BLOCO DELE ESTA VAZIO.
//
// A regra anterior era `!conteudo.includes(MARCADOR_VAZIO)`: um unico lapis em
// qualquer lugar do arquivo derrubava o Cerebro inteiro. Ela quebrou em uso
// real (Mãe Pixel, 2026-07-31): 12 KB escritos, os 13 blocos com conteudo, e
// um bullet dentro do bloco 12 com "✍️ [a definir]" porque o link ainda nao
// existia. O Hub dizia "Ainda em branco" e o portao das skills de geracao
// continuava fechado.
//
// O defeito era de contrato, nao de digitacao: quem ESCREVE e quem LE
// discordavam. O proprio /instalar manda deixar o marcador quando a pessoa nao
// sabe responder ("marque como 'a definir' e siga. Nao trave a instalacao num
// campo so"), ou seja, a skill produz de proposito exatamente o que o leitor
// tratava como "nem comecou".
//
// A leitura certa e por BLOCO. Um bloco sem nenhuma linha de conteudo e um
// bloco que a entrevista nao cobriu. Um bloco com paragrafo, lista e um
// detalhe pendente e um bloco respondido, com um detalhe pendente.
//
// Linha que carrega o marcador nao conta como conteudo, mesmo tendo rotulo
// junto ("- **Hub central:** ✍️ [a definir]" e um campo em aberto, nao uma
// resposta). Isso deixa a regra conservadora na direcao segura: na duvida ela
// diz que falta, e nunca libera geracao em cima de identidade vazia.
export function cerebroPreenchido(conteudo: string): boolean {
  // Arquivo vazio nunca esta preenchido. Parece obvio, e a regra antiga errava
  // aqui: "" nao contem o marcador, entao ela respondia SIM. Nao aparecia
  // porque lerCerebro trata o arquivo ausente antes de chegar nesta funcao,
  // mas um arquivo que existe e esta vazio (gravacao truncada) passava.
  if (!conteudo.trim()) return false;

  const blocos = blocosDoCerebro(conteudo);
  // Sem nenhum bloco reconhecivel, cai na regra antiga. Cobre Cerebro escrito
  // a mao fora do template, que nao tem "## " nenhum: nesse caso o unico sinal
  // disponivel continua sendo a ausencia de marcador.
  if (blocos.length === 0) return !conteudo.includes(MARCADOR_VAZIO);
  return blocos.every((bloco) => temConteudo(bloco));
}

// Corpo de cada bloco "## ..." do Cerebro, na ordem. O preambulo (o que vem
// antes do primeiro "##", debaixo do titulo H1) NAO entra: ele e area de
// titulo, e num Cerebro preenchido de verdade costuma estar vazio mesmo.
function blocosDoCerebro(conteudo: string): string[] {
  const blocos: string[] = [];
  let atual: string[] | null = null;
  for (const linha of conteudo.split("\n")) {
    if (/^##\s+\S/.test(linha)) {
      if (atual) blocos.push(atual.join("\n"));
      atual = [];
    } else if (atual) {
      atual.push(linha);
    }
  }
  if (atual) blocos.push(atual.join("\n"));
  return blocos;
}

// O bloco tem ao menos uma linha de resposta? Nao conta linha em branco,
// separador horizontal, nem linha que carrega o marcador de campo vazio.
function temConteudo(bloco: string): boolean {
  return bloco.split("\n").some((linha) => {
    const limpa = linha.trim();
    if (!limpa) return false;
    if (/^[-*_]{3,}$/.test(limpa)) return false;
    if (limpa.includes(MARCADOR_VAZIO)) return false;
    return true;
  });
}

// Le o cerebro/cerebro.md da pasta do VKOS. Se o arquivo nao existir, devolve
// conteudo vazio e preenchido false, sem quebrar.
export function lerCerebro(pastaVkos: string): CerebroLido {
  const caminho = caminhoCerebro(pastaVkos);
  if (!existsSync(caminho)) {
    return { caminho, conteudo: "", preenchido: false };
  }
  const conteudo = readFileSync(caminho, "utf8");
  return { caminho, conteudo, preenchido: cerebroPreenchido(conteudo) };
}

// Leitura completa do Cerebro pra API: texto, caminho e mtime do arquivo.
// Devolve null se o arquivo nao existe (a rota responde 404).
export interface CerebroCompleto {
  texto: string;
  caminho: string;
  atualizadoEm: string;
}

export function lerCerebroCompleto(pastaVkos: string): CerebroCompleto | null {
  const caminho = caminhoCerebro(pastaVkos);
  if (!existsSync(caminho)) return null;
  const texto = readFileSync(caminho, "utf8");
  const estat = statSync(caminho);
  return { texto, caminho, atualizadoEm: estat.mtime.toISOString() };
}

// Backup unico por boot do servidor. So a primeira gravacao da sessao do servidor
// preserva o original, nao toda gravacao.
let backupFeito = false;

// Carimbo AAAA-MM-DD-HHmm em hora local, pro nome do arquivo de backup.
function carimboAgora(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// Faz UM backup do Cerebro original antes da primeira gravacao do servidor.
// O Cerebro e o coracao do negocio: se o backup falhar, aborta a gravacao pra
// nunca sobrescrever o original sem uma copia de seguranca.
function backupUmaVez(caminho: string, pastaCerebro: string): void {
  if (backupFeito) return;
  if (!existsSync(caminho)) {
    // Nao ha original pra preservar. Marca feito pra nao tentar de novo.
    backupFeito = true;
    return;
  }
  const destino = join(pastaCerebro, `.backup-cerebro-${carimboAgora()}.md`);
  copyFileSync(caminho, destino);
  backupFeito = true;
}

// Grava o Cerebro de forma atomica: valida, faz o backup unico, escreve num .tmp
// e renomeia por cima. Lanca ErroCerebro em validacao (400 texto, 413 tamanho).
export function gravarCerebro(pastaVkos: string, texto: unknown): CerebroCompleto {
  if (typeof texto !== "string") {
    throw new ErroCerebro(400, "O campo texto e obrigatorio e precisa ser uma string.");
  }
  if (Buffer.byteLength(texto, "utf8") > TAMANHO_MAXIMO) {
    throw new ErroCerebro(413, "O Cerebro passou do limite de 512 KB.");
  }

  const caminho = caminhoCerebro(pastaVkos);
  const pastaCerebro = join(pastaVkos, "cerebro");
  mkdirSync(pastaCerebro, { recursive: true });

  backupUmaVez(caminho, pastaCerebro);

  // Gravacao atomica: escreve no .tmp e renomeia por cima do arquivo real.
  const tmp = join(pastaCerebro, `.cerebro-${process.pid}-${Date.now()}.tmp`);
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

  const estat = statSync(caminho);
  return { texto, caminho, atualizadoEm: estat.mtime.toISOString() };
}
