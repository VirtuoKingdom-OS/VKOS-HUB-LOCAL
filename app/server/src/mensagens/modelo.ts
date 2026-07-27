// Modelo das conversas e mensagens do CRM: tipos, guardas e helpers puros.
//
// Fica separado do armazenamento e das rotas pra todo mundo falar do mesmo
// vocabulario sem criar ciclo de import, igual crm/modelo.ts.
//
// Os campos sao os que a integracao real de WhatsApp exige, e nascem agora
// mesmo com so o canal manual implementado. Eles custam quase nada hoje e
// custariam migracao de historico de conversa depois, que e o dado que ninguem
// pode perder. Cada campo abaixo tem o motivo escrito ao lado.

import { randomUUID } from "node:crypto";

export class ErroMensagens extends Error {
  status: number;

  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroMensagens";
    this.status = status;
  }
}

// Versao do indice de conversas. Sobe quando o formato do indice mudar.
export const VERSAO_MENSAGENS_ATUAL = 1;

// Canal por onde a conversa acontece. So "manual" esta implementado (ver
// canais/manual.ts). "whatsapp" ja existe no tipo porque o modelo foi desenhado
// pra ele, mas nao esta registrado: pedir esse canal responde erro.
export type IdCanal = "manual" | "whatsapp";

export type DirecaoMensagem = "entrada" | "saida";

// Qual linha e verdade do provedor e qual e memoria do usuario. Uma mensagem
// "manual" foi digitada por quem usa o Hub, contando o que aconteceu por fora.
// Uma mensagem "api" veio do provedor e pode ser conferida contra ele.
export type OrigemMensagem = "manual" | "api";

export type TipoMensagem =
  | "texto"
  | "imagem"
  | "audio"
  | "video"
  | "documento"
  | "localizacao"
  | "contato"
  | "template"
  | "outro";

// Ciclo de vida do envio. Entrada nasce em "entregue": ela chegou, e nao tem
// ciclo de envio nenhum. O que "eu ja li" nao mora aqui, mora no cursor da
// conversa (ver lidasAte), porque marcar lida nao pode reescrever o historico.
export type StatusMensagem =
  | "rascunho"
  | "na-fila"
  | "enviada"
  | "entregue"
  | "lida"
  | "falhou";

export type AutorMensagem = "contato" | "usuario" | "sistema";

export type StatusConversa = "aberta" | "aguardando" | "resolvida" | "adiada";

export const DIRECOES = new Set<DirecaoMensagem>(["entrada", "saida"]);
export const ORIGENS = new Set<OrigemMensagem>(["manual", "api"]);
export const TIPOS_MENSAGEM = new Set<TipoMensagem>([
  "texto",
  "imagem",
  "audio",
  "video",
  "documento",
  "localizacao",
  "contato",
  "template",
  "outro",
]);
export const STATUS_MENSAGEM = new Set<StatusMensagem>([
  "rascunho",
  "na-fila",
  "enviada",
  "entregue",
  "lida",
  "falhou",
]);
export const AUTORES = new Set<AutorMensagem>(["contato", "usuario", "sistema"]);
export const STATUS_CONVERSA = new Set<StatusConversa>([
  "aberta",
  "aguardando",
  "resolvida",
  "adiada",
]);

// Anexo de mensagem.
//
// caminhoLocal e SEMPRE um caminho de arquivo na maquina, NUNCA uma URL. A URL
// de download da Meta vale 5 minutos e o identificador da midia vale 7 dias:
// guardar URL e garantir midia quebrada. O arquivo e baixado e guardado no
// momento em que o webhook chega, e o que fica no historico e o caminho dele.
export interface AnexoMensagem {
  id: string;
  tipo: TipoMensagem;
  nome: string;
  caminhoLocal: string;
  mime?: string;
  tamanho?: number;
  // Identificador da midia no provedor. So pra rastreio: expira e nao serve
  // pra buscar o arquivo de novo depois.
  idExternoMidia?: string;
}

export interface Mensagem {
  // UUID local, SEMPRE. Nunca vem do provedor: sem id proprio antes de existir
  // resposta do provedor, envio otimista e impossivel.
  id: string;
  conversaId: string;
  direcao: DirecaoMensagem;
  canal: string;
  origem: OrigemMensagem;
  tipo: TipoMensagem;
  texto: string;
  // Nota interna. Nunca sai pro contato, em canal nenhum.
  privada: boolean;
  status: StatusMensagem;
  erroCodigo?: string;
  erroTexto?: string;
  // O wamid do provedor. Unico dentro da conversa quando presente: sem essa
  // unicidade, um reenvio do webhook duplica a thread.
  idExterno?: string;
  // Chave do lado do Hub. Reenviar o mesmo pedido com a mesma chave nao cria
  // uma segunda mensagem.
  chaveIdempotencia: string;
  respondeA?: string;
  autorTipo: AutorMensagem;
  // Quando aconteceu no mundo real, separado de criadaEm. Registro manual
  // retroativo ("respondi ontem") depende dessa separacao, e a thread e
  // ordenada por este campo.
  enviadaEm: string;
  entregueEm?: string;
  lidaEm?: string;
  // Quando a linha entrou no arquivo. Nunca retroativo.
  criadaEm: string;
  // O webhook cru, como chegou. Todo campo que este modelo nao previu continua
  // recuperavel a partir daqui, sem migrar nada.
  payloadBruto?: unknown;
  anexos: AnexoMensagem[];
}

export interface Conversa {
  id: string;
  // Obrigatorio. Conversa nao existe sem contato: e o que impede uma segunda
  // caixa de entrada paralela ao funil.
  contatoId: string;
  negocioId?: string;
  canal: string;
  // Como o contato e identificado no canal: telefone E.164 no WhatsApp, e o
  // mesmo no manual quando existe.
  identificadorExterno: string;
  status: StatusConversa;
  adiadaAte?: string;
  // Quando o CONTATO falou por ultimo. E a unica fonte da janela de 24 horas do
  // WhatsApp. So se move com mensagem de direcao "entrada".
  ultimaEntradaEm?: string;
  ultimaMensagemEm?: string;
  previa: string;
  naoLidas: number;
  // Cursor de leitura das entradas: ate quando o dono ja leu. Fica na conversa,
  // e nao em cada mensagem, porque marcar lida nao pode reescrever historico
  // append-only.
  lidasAte?: string;
  criadaEm: string;
  atualizadaEm: string;
}

export interface IndiceMensagens {
  versao: number;
  conversas: Conversa[];
}

// ------------------------------------------------------------------ ids

export function novoIdMensagem(): string {
  return randomUUID();
}

export function novoIdConversa(): string {
  return `cv-${randomUUID()}`;
}

export function novaChaveIdempotencia(): string {
  return randomUUID();
}

// Id que pode virar nome de arquivo sem sair da pasta. Todo id que chega pela
// URL passa por aqui ANTES de tocar o disco: sem isso, "../../crm" vira leitura
// fora da pasta de conversas.
const ID_SEGURO = /^[A-Za-z0-9_-]{1,120}$/;

export function ehIdSeguro(valor: unknown): valor is string {
  return typeof valor === "string" && ID_SEGURO.test(valor);
}

// ---------------------------------------------------------------- guardas

function ehTexto(valor: unknown): boolean {
  return typeof valor === "string" && valor.length > 0;
}

function ehData(valor: unknown): boolean {
  return typeof valor === "string" && !Number.isNaN(Date.parse(valor));
}

// Guarda da leitura do .jsonl. Confere o que o resto do codigo usa pra montar a
// thread: sem isso a linha nao e mensagem, e uma linha que nao e mensagem some
// sozinha em vez de derrubar a conversa inteira.
//
// A leitura e mais tolerante que a escrita de proposito: canal e tipo entram
// como string livre aqui, entao uma conversa gravada por uma versao futura do
// Hub continua legivel em vez de sumir da tela.
export function ehMensagem(valor: unknown): boolean {
  if (!valor || typeof valor !== "object") return false;
  const linha = valor as Record<string, unknown>;
  return (
    ehTexto(linha.id) &&
    ehTexto(linha.conversaId) &&
    DIRECOES.has(linha.direcao as DirecaoMensagem) &&
    ehTexto(linha.canal) &&
    typeof linha.texto === "string" &&
    ehTexto(linha.tipo) &&
    ehTexto(linha.status) &&
    ehData(linha.enviadaEm) &&
    ehData(linha.criadaEm) &&
    Array.isArray(linha.anexos)
  );
}

export function ehConversa(valor: unknown): boolean {
  if (!valor || typeof valor !== "object") return false;
  const linha = valor as Record<string, unknown>;
  return (
    ehIdSeguro(linha.id) &&
    ehTexto(linha.contatoId) &&
    ehTexto(linha.canal) &&
    STATUS_CONVERSA.has(linha.status as StatusConversa) &&
    typeof linha.naoLidas === "number"
  );
}

export function ehIndiceMensagens(valor: unknown): boolean {
  if (!valor || typeof valor !== "object") return false;
  const bruto = valor as Record<string, unknown>;
  return typeof bruto.versao === "number" && Array.isArray(bruto.conversas);
}

// ---------------------------------------------------------------- anexos

// Qualquer coisa com esquema e "://" na frente. Serve pra barrar URL onde tem
// que haver caminho de arquivo.
export function pareceUrl(valor: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(valor.trim());
}

// Normaliza a lista de anexos e faz valer a regra que nao se negocia:
// caminhoLocal e caminho de arquivo, NUNCA URL. A URL de download da Meta morre
// em 5 minutos; gravar ela no historico e gravar um link quebrado.
export function normalizarAnexos(valor: unknown): AnexoMensagem[] {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) {
    throw new ErroMensagens("Anexos precisa ser uma lista.", 400);
  }
  const saida: AnexoMensagem[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") {
      throw new ErroMensagens("Anexo invalido.", 400);
    }
    const bruto = item as Record<string, unknown>;
    const caminhoLocal =
      typeof bruto.caminhoLocal === "string" ? bruto.caminhoLocal.trim() : "";
    if (!caminhoLocal) {
      throw new ErroMensagens("Anexo precisa de caminhoLocal.", 400);
    }
    if (pareceUrl(caminhoLocal)) {
      throw new ErroMensagens(
        "Anexo guarda caminho de arquivo local, nunca URL: a URL da midia expira e o anexo fica quebrado.",
        400,
      );
    }
    const tipo = bruto.tipo;
    const anexo: AnexoMensagem = {
      id: typeof bruto.id === "string" && bruto.id ? bruto.id : randomUUID(),
      tipo: TIPOS_MENSAGEM.has(tipo as TipoMensagem) ? (tipo as TipoMensagem) : "outro",
      nome:
        typeof bruto.nome === "string" && bruto.nome.trim()
          ? bruto.nome.trim().slice(0, 200)
          : caminhoLocal.split(/[\\/]/).pop() ?? "anexo",
      caminhoLocal,
    };
    if (typeof bruto.mime === "string" && bruto.mime.trim()) {
      anexo.mime = bruto.mime.trim().slice(0, 100);
    }
    if (typeof bruto.tamanho === "number" && Number.isFinite(bruto.tamanho)) {
      anexo.tamanho = bruto.tamanho;
    }
    if (typeof bruto.idExternoMidia === "string" && bruto.idExternoMidia.trim()) {
      anexo.idExternoMidia = bruto.idExternoMidia.trim().slice(0, 200);
    }
    saida.push(anexo);
  }
  return saida;
}

// ---------------------------------------------------------------- previa

const LIMITE_PREVIA = 140;

// Trecho curto da ultima mensagem, pra coluna da esquerda nao precisar abrir
// arquivo nenhum. Mensagem sem texto e descrita pelo primeiro anexo, senao a
// lista mostraria linha vazia depois de um audio.
export function montarPrevia(mensagem: Mensagem): string {
  const texto = mensagem.texto.replace(/\s+/g, " ").trim();
  if (texto) return texto.slice(0, LIMITE_PREVIA);
  const anexo = mensagem.anexos[0];
  if (anexo) return `[${anexo.tipo}]`;
  if (mensagem.tipo !== "texto") return `[${mensagem.tipo}]`;
  return "";
}

// Ordem da thread: pelo que aconteceu no mundo real. Empate cai no que entrou
// no arquivo primeiro, entao registro retroativo entra no lugar certo sem
// embaralhar o que ja estava la.
export function compararMensagens(a: Mensagem, b: Mensagem): number {
  return Date.parse(a.enviadaEm) - Date.parse(b.enviadaEm)
    || Date.parse(a.criadaEm) - Date.parse(b.criadaEm);
}
