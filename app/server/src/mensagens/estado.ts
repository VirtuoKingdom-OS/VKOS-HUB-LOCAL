// Nucleo das conversas: quem cria, quem grava, quem pagina e quem mantem o
// indice coerente com a thread.
//
// A REGRA QUE DEFINE O PRODUTO: conversa nao existe sem contato. Chegou
// mensagem de numero desconhecido, o Hub cria o contato PRIMEIRO e so entao
// abre a conversa. Sem isso nasce uma segunda caixa de entrada paralela ao
// funil, que e exatamente a doenca que este produto esta curando. Nao existe
// atalho aqui que crie conversa solta.
//
// O canal fica atras de canais/contrato.ts. Este arquivo nao sabe o que e
// WhatsApp: sabe pedir a mensagem montada, ler capacidades e deduplicar.

import { lerEstado, criarContato, lerInteracoes, type Interacao } from "../crm/estado.js";
import { normalizarTelefone } from "../util/telefone.js";
import {
  acharConversaNoIndice,
  anexarMensagens,
  lerConversaCompleta,
  lerIndice,
  salvarIndice,
} from "./armazenamento.js";
import { CANAL_PADRAO, obterCanal } from "./canais/index.js";
import type { PedidoMensagem } from "./canais/contrato.js";
import {
  AUTORES,
  DIRECOES,
  ErroMensagens,
  STATUS_CONVERSA,
  TIPOS_MENSAGEM,
  compararMensagens,
  montarPrevia,
  normalizarAnexos,
  novaChaveIdempotencia,
  novoIdConversa,
  type AutorMensagem,
  type Conversa,
  type DirecaoMensagem,
  type IndiceMensagens,
  type Mensagem,
  type StatusConversa,
  type TipoMensagem,
} from "./modelo.js";

export { ErroMensagens } from "./modelo.js";
export type {
  AnexoMensagem,
  Conversa,
  Mensagem,
  StatusConversa,
  StatusMensagem,
} from "./modelo.js";

// Teto do texto de uma mensagem. O WhatsApp corta em 4096; acima disso nao e
// mensagem, e arquivo colado no campo errado.
const LIMITE_TEXTO = 4096;
// Teto do webhook cru guardado junto. Existe pra uma linha do .jsonl nunca
// virar megabytes por causa de um payload gigante do provedor.
const LIMITE_PAYLOAD_BRUTO = 32_000;
const LIMITE_PAGINA_PADRAO = 50;
const LIMITE_PAGINA_MAXIMO = 200;
const LIMITE_LINHA_DO_TEMPO_PADRAO = 50;
const LIMITE_LINHA_DO_TEMPO_MAXIMO = 300;

// Item da linha do tempo unificada do contato. E uma VIEW: une interacoes e
// mensagens sem duplicar dado nenhum. Cada item carrega o registro original,
// que continua morando so no seu proprio arquivo.
export type ItemLinhaDoTempo =
  | { tipo: "interacao"; em: string; interacao: Interacao }
  | { tipo: "mensagem"; em: string; conversaId: string; mensagem: Mensagem };

// ---------------------------------------------------------------- validacao

function textoObrigatorio(valor: unknown, rotulo: string, limite = 200): string {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new ErroMensagens(`${rotulo} e obrigatorio.`, 400);
  }
  return valor.trim().slice(0, limite);
}

function textoOpcional(valor: unknown, limite = 200): string | undefined {
  if (typeof valor !== "string") return undefined;
  return valor.trim().slice(0, limite) || undefined;
}

function dataOpcional(valor: unknown, rotulo: string): string | undefined {
  if (valor === undefined || valor === null || valor === "") return undefined;
  if (typeof valor !== "string" || Number.isNaN(Date.parse(valor))) {
    throw new ErroMensagens(`${rotulo} precisa ser uma data valida.`, 400);
  }
  return new Date(Date.parse(valor)).toISOString();
}

function inteiroOpcional(valor: unknown, rotulo: string, minimo: number, maximo: number) {
  if (valor === undefined || valor === null || valor === "") return undefined;
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (typeof numero !== "number" || !Number.isFinite(numero)) {
    throw new ErroMensagens(`${rotulo} precisa ser um numero.`, 400);
  }
  return Math.min(maximo, Math.max(minimo, Math.trunc(numero)));
}

// ------------------------------------------------------------------ buscas

function acharContatoOuFalhar(contatoId: string) {
  const contato = lerEstado().contatos.find((item) => item.id === contatoId);
  if (!contato) throw new ErroMensagens("Contato nao encontrado.", 404);
  return contato;
}

function conferirNegocio(negocioId: string): void {
  const existe = lerEstado().negocios.some((item) => item.id === negocioId);
  if (!existe) throw new ErroMensagens("Negocio nao encontrado.", 404);
}

function acharConversaOuFalhar(indice: IndiceMensagens, id: string): Conversa {
  const conversa = acharConversaNoIndice(indice, id);
  if (!conversa) throw new ErroMensagens("Conversa nao encontrada.", 404);
  return conversa;
}

// A ordem da coluna da esquerda: quem falou por ultimo aparece primeiro.
function ordenarConversas(conversas: readonly Conversa[]): Conversa[] {
  return [...conversas].sort(
    (a, b) =>
      Date.parse(b.ultimaMensagemEm ?? b.criadaEm) -
      Date.parse(a.ultimaMensagemEm ?? a.criadaEm),
  );
}

// ------------------------------------------------------------------ leitura

export function listarConversas(filtro?: {
  contatoId?: unknown;
  status?: unknown;
}): Conversa[] {
  const indice = lerIndice();
  let conversas = indice.conversas;
  const contatoId = textoOpcional(filtro?.contatoId);
  if (contatoId) conversas = conversas.filter((item) => item.contatoId === contatoId);
  const status = textoOpcional(filtro?.status);
  if (status) {
    if (!STATUS_CONVERSA.has(status as StatusConversa)) {
      throw new ErroMensagens("Status de conversa invalido.", 400);
    }
    conversas = conversas.filter((item) => item.status === status);
  }
  return ordenarConversas(conversas);
}

export interface PaginaConversa {
  conversa: Conversa;
  mensagens: Mensagem[];
  // Total de mensagens da thread, pra tela saber que existe historico atras.
  total: number;
  // Ha pagina mais antiga depois desta.
  temMais: boolean;
  // Cursor pra pedir a pagina anterior: id da mensagem mais antiga desta
  // pagina. Repassar em "antesDe".
  cursorAnterior?: string;
  // Quantas linhas do arquivo nao deram pra ler. Zero e o normal. Acima disso a
  // thread perdeu mensagem, e a tela pode dizer isso em vez de fingir que esta
  // inteira.
  linhasInvalidas: number;
}

// Abre uma conversa com paginacao. A thread cresce sem teto, entao NUNCA
// devolve tudo: a leitura padrao e a ultima pagina, a mais nova, que e o que a
// tela mostra ao abrir. "antesDe" caminha pra tras no historico.
export function abrirConversa(
  id: string,
  opcoes?: { limite?: unknown; antesDe?: unknown },
): PaginaConversa {
  const indice = lerIndice();
  const conversa = acharConversaOuFalhar(indice, id);
  const limite =
    inteiroOpcional(opcoes?.limite, "Limite", 1, LIMITE_PAGINA_MAXIMO) ??
    LIMITE_PAGINA_PADRAO;
  const { mensagens, linhasInvalidas } = lerConversaCompleta(id);

  let fim = mensagens.length;
  const antesDe = textoOpcional(opcoes?.antesDe, 120);
  if (antesDe) {
    const posicao = mensagens.findIndex((item) => item.id === antesDe);
    // Cursor que nao existe mais (mensagem perdida numa linha corrompida) nao
    // pode virar erro: a tela mostraria a conversa quebrada. Cai na pagina mais
    // nova, que e o comportamento padrao.
    if (posicao >= 0) fim = posicao;
  }
  const inicio = Math.max(0, fim - limite);
  const pagina = mensagens.slice(inicio, fim);
  const resultado: PaginaConversa = {
    conversa,
    mensagens: pagina,
    total: mensagens.length,
    temMais: inicio > 0,
    linhasInvalidas,
  };
  if (pagina.length > 0) resultado.cursorAnterior = pagina[0].id;
  return resultado;
}

// ------------------------------------------------------------------ escrita

// Recalcula os campos derivados da conversa a partir da thread inteira.
//
// Recalcular em vez de incrementar de proposito: a thread ja foi lida pra
// deduplicar, entao o custo e zero, e o indice fica coerente com o arquivo por
// construcao. Contador incremental erra uma vez e mente pra sempre, porque
// nada nunca mais o corrige.
function recalcularConversa(conversa: Conversa, mensagens: readonly Mensagem[]): void {
  const ultima = mensagens[mensagens.length - 1];
  conversa.ultimaMensagemEm = ultima?.enviadaEm;
  conversa.previa = ultima ? montarPrevia(ultima) : "";

  // ultimaEntradaEm e quando o CONTATO falou por ultimo, e e a unica fonte da
  // janela de 24 horas do WhatsApp. Por isso so mensagem de ENTRADA a move.
  // Nota privada nao conta: ela e do dono, nunca do contato, e abrir janela por
  // causa dela seria abrir janela sozinho.
  let ultimaEntradaEm: string | undefined;
  let naoLidas = 0;
  const lidasAte = conversa.lidasAte ? Date.parse(conversa.lidasAte) : null;
  for (const mensagem of mensagens) {
    if (mensagem.direcao !== "entrada" || mensagem.privada) continue;
    ultimaEntradaEm = mensagem.enviadaEm;
    if (lidasAte === null || Date.parse(mensagem.enviadaEm) > lidasAte) naoLidas += 1;
  }
  conversa.ultimaEntradaEm = ultimaEntradaEm;
  conversa.naoLidas = naoLidas;
  conversa.atualizadaEm = new Date().toISOString();
}

// Identificador do contato no canal. Telefone normalizado quando da, senao o
// que o usuario digitou. Vazio e aceito: registro manual de conversa que
// aconteceu pessoalmente nao tem numero nenhum.
function identificadorDoContato(
  corpo: Record<string, unknown>,
  telefone?: string,
  telefoneNormalizado?: string,
): string {
  const informado = textoOpcional(corpo.identificadorExterno, 120);
  const bruto = informado ?? telefoneNormalizado ?? telefone ?? "";
  return normalizarTelefone(bruto) ?? bruto;
}

export interface ResultadoConversa {
  conversa: Conversa;
  // false quando a conversa ja existia. Duas conversas do mesmo contato no
  // mesmo canal seriam duas caixas de entrada pro mesmo cliente.
  criada: boolean;
}

export function criarConversa(corpo: Record<string, unknown>): ResultadoConversa {
  const contatoId = textoObrigatorio(corpo.contatoId, "Contato da conversa", 120);
  const contato = acharContatoOuFalhar(contatoId);
  const canal = obterCanal(textoOpcional(corpo.canal, 40) ?? CANAL_PADRAO);
  const negocioId = textoOpcional(corpo.negocioId, 120);
  if (negocioId) conferirNegocio(negocioId);
  const identificadorExterno = identificadorDoContato(
    corpo,
    contato.telefone,
    contato.telefoneNormalizado,
  );

  const indice = lerIndice();
  const existente = indice.conversas.find(
    (item) =>
      item.contatoId === contatoId &&
      item.canal === canal.id &&
      item.identificadorExterno === identificadorExterno,
  );
  if (existente) return { conversa: existente, criada: false };

  const agora = new Date().toISOString();
  const conversa: Conversa = {
    id: novoIdConversa(),
    contatoId,
    canal: canal.id,
    identificadorExterno,
    status: "aberta",
    previa: "",
    naoLidas: 0,
    criadaEm: agora,
    atualizadaEm: agora,
  };
  if (negocioId) conversa.negocioId = negocioId;
  indice.conversas.push(conversa);
  salvarIndice(indice);
  return { conversa, criada: true };
}

// A costura do webhook, e a prova da regra do produto.
//
// Chegou mensagem de um identificador desconhecido: acha o contato pelo
// telefone normalizado e, se nao existe, CRIA O CONTATO ANTES de abrir a
// conversa. Nao ha caminho aqui que termine com conversa sem contato.
//
// Ja fica pronta pro canal real, mas nao depende dele: o registro manual de
// numero novo usa exatamente o mesmo caminho.
export function garantirConversaPorIdentificador(entrada: {
  canal?: string;
  identificadorExterno: string;
  nomeSugerido?: string;
}): ResultadoConversa & { contatoCriado: boolean } {
  const canal = obterCanal(entrada.canal ?? CANAL_PADRAO);
  const bruto = textoObrigatorio(entrada.identificadorExterno, "Identificador", 120);
  const normalizado = normalizarTelefone(bruto);
  const identificadorExterno = normalizado ?? bruto;

  const estado = lerEstado();
  let contato = normalizado
    ? estado.contatos.find((item) => item.telefoneNormalizado === normalizado)
    : undefined;
  let contatoCriado = false;
  if (!contato) {
    contato = criarContato({
      nome: entrada.nomeSugerido?.trim() || identificadorExterno,
      telefone: bruto,
      origem: canal.rotulo,
    });
    contatoCriado = true;
  }
  const resultado = criarConversa({
    contatoId: contato.id,
    canal: canal.id,
    identificadorExterno,
  });
  return { ...resultado, contatoCriado };
}

// Monta o pedido a partir do corpo cru da requisicao. O canal recebe isto
// pronto: tipos conferidos, datas em ISO, textos aparados.
function normalizarPedido(
  conversaId: string,
  corpo: Record<string, unknown>,
  agora: string,
): PedidoMensagem {
  const direcao = corpo.direcao;
  if (!DIRECOES.has(direcao as DirecaoMensagem)) {
    throw new ErroMensagens('Direcao precisa ser "entrada" ou "saida".', 400);
  }
  const tipoBruto = corpo.tipo ?? "texto";
  if (!TIPOS_MENSAGEM.has(tipoBruto as TipoMensagem)) {
    throw new ErroMensagens("Tipo de mensagem invalido.", 400);
  }
  if (corpo.privada !== undefined && typeof corpo.privada !== "boolean") {
    throw new ErroMensagens("Privada precisa ser verdadeiro ou falso.", 400);
  }
  const autorTipo = corpo.autorTipo;
  if (autorTipo !== undefined && !AUTORES.has(autorTipo as AutorMensagem)) {
    throw new ErroMensagens("Autor invalido.", 400);
  }
  const anexos = normalizarAnexos(corpo.anexos);
  const texto = typeof corpo.texto === "string" ? corpo.texto.slice(0, LIMITE_TEXTO) : "";
  // Mensagem sem texto so vale com anexo. Linha vazia na thread nao e registro
  // de nada e ninguem consegue apagar depois.
  if (!texto.trim() && anexos.length === 0) {
    throw new ErroMensagens("Escreva a mensagem ou anexe um arquivo.", 400);
  }

  const pedido: PedidoMensagem = {
    conversaId,
    direcao: direcao as DirecaoMensagem,
    texto,
    tipo: tipoBruto as TipoMensagem,
    privada: corpo.privada === true,
    chaveIdempotencia:
      textoOpcional(corpo.chaveIdempotencia, 120) ?? novaChaveIdempotencia(),
    anexos,
    agora,
  };
  if (autorTipo !== undefined) pedido.autorTipo = autorTipo as AutorMensagem;
  const enviadaEm = dataOpcional(corpo.enviadaEm, "Data da mensagem");
  if (enviadaEm) pedido.enviadaEm = enviadaEm;
  const idExterno = textoOpcional(corpo.idExterno, 200);
  if (idExterno) pedido.idExterno = idExterno;
  const respondeA = textoOpcional(corpo.respondeA, 120);
  if (respondeA) pedido.respondeA = respondeA;
  if (corpo.payloadBruto !== undefined) {
    const serializado = JSON.stringify(corpo.payloadBruto) ?? "";
    if (serializado.length > LIMITE_PAYLOAD_BRUTO) {
      throw new ErroMensagens("O payload bruto e grande demais pra guardar junto.", 413);
    }
    pedido.payloadBruto = corpo.payloadBruto;
  }
  return pedido;
}

export interface ResultadoMensagem {
  mensagem: Mensagem;
  conversa: Conversa;
  // false quando a mensagem ja estava na thread (mesmo idExterno ou mesma
  // chaveIdempotencia). Nada foi gravado de novo.
  criada: boolean;
}

export function registrarMensagem(
  conversaId: string,
  corpo: Record<string, unknown>,
): ResultadoMensagem {
  const indice = lerIndice();
  const conversa = acharConversaOuFalhar(indice, conversaId);
  const canal = obterCanal(conversa.canal);
  const agora = new Date().toISOString();
  const pedido = normalizarPedido(conversaId, corpo, agora);

  const { mensagens } = lerConversaCompleta(conversaId);

  // Deduplicacao, nesta ordem.
  //
  // idExterno (o wamid) e a identidade da mensagem no provedor: o webhook
  // reenvia o mesmo evento, e sem esta conferencia cada reenvio duplicaria a
  // linha na thread. A conversa e resolvida antes, pelo identificador, entao o
  // mesmo wamid sempre cai neste mesmo arquivo.
  //
  // chaveIdempotencia e a identidade do lado do Hub: o mesmo pedido reenviado
  // (clique duplo, retentativa de rede) nao vira duas mensagens.
  if (pedido.idExterno) {
    const repetida = mensagens.find((item) => item.idExterno === pedido.idExterno);
    if (repetida) return { mensagem: repetida, conversa, criada: false };
  }
  const mesmaChave = mensagens.find(
    (item) => item.chaveIdempotencia === pedido.chaveIdempotencia,
  );
  if (mesmaChave) return { mensagem: mesmaChave, conversa, criada: false };

  const mensagem = canal.montarMensagem(pedido);
  anexarMensagens(conversaId, [mensagem]);

  // A thread na memoria acompanha o arquivo, incluindo a ordem por enviadaEm:
  // registro retroativo entra no lugar certo, nao no fim.
  const atualizadas = [...mensagens, mensagem].sort(compararMensagens);
  // Entrada reabre a conversa. Cliente que respondeu nao pode continuar
  // marcado como resolvido nem adiado: e justamente a linha que o bloco "Sem
  // resposta" da tela do dia procura.
  if (mensagem.direcao === "entrada" && !mensagem.privada) {
    conversa.status = "aberta";
    delete conversa.adiadaAte;
  }
  recalcularConversa(conversa, atualizadas);
  salvarIndice(indice);
  return { mensagem, conversa, criada: true };
}

// Zera o contador de nao lidas e move o cursor de leitura.
//
// Nao reescreve mensagem nenhuma: o arquivo e append-only e "eu ja li" e
// estado do dono, nao da mensagem. O cursor tambem serve pra tela desenhar a
// linha de "novas mensagens" no lugar certo.
export function marcarComoLida(conversaId: string): Conversa {
  const indice = lerIndice();
  const conversa = acharConversaOuFalhar(indice, conversaId);
  const agora = new Date().toISOString();
  conversa.lidasAte = agora;
  conversa.naoLidas = 0;
  conversa.atualizadaEm = agora;
  salvarIndice(indice);
  return conversa;
}

export function atualizarConversa(
  id: string,
  corpo: Record<string, unknown>,
): Conversa {
  const indice = lerIndice();
  const conversa = acharConversaOuFalhar(indice, id);
  if ("status" in corpo) {
    const status = corpo.status;
    if (!STATUS_CONVERSA.has(status as StatusConversa)) {
      throw new ErroMensagens("Status de conversa invalido.", 400);
    }
    conversa.status = status as StatusConversa;
  }
  if ("adiadaAte" in corpo) {
    const adiadaAte = dataOpcional(corpo.adiadaAte, "Data pra retomar");
    if (adiadaAte) conversa.adiadaAte = adiadaAte;
    else delete conversa.adiadaAte;
  }
  // Adiar sem data e o mesmo que perder a conversa: ela sai da lista de abertas
  // e nada nunca mais a traz de volta.
  if (conversa.status === "adiada" && !conversa.adiadaAte) {
    throw new ErroMensagens("Adiar exige a data pra retomar a conversa.", 400);
  }
  if (conversa.status !== "adiada") delete conversa.adiadaAte;
  if ("negocioId" in corpo) {
    const negocioId = textoOpcional(corpo.negocioId, 120);
    if (negocioId) {
      conferirNegocio(negocioId);
      conversa.negocioId = negocioId;
    } else delete conversa.negocioId;
  }
  conversa.atualizadaEm = new Date().toISOString();
  salvarIndice(indice);
  return conversa;
}

// ------------------------------------------------------- linha do tempo

// A linha do tempo do contato: interacoes e mensagens na mesma ordem, mais
// novas primeiro.
//
// E uma VIEW. Nada e copiado de um arquivo pro outro: a interacao continua no
// interacoes.jsonl e a mensagem continua na thread dela. Duplicar aqui criaria
// duas verdades sobre o mesmo fato, e a segunda envelheceria em silencio.
//
// O limite existe porque mensagem cresce sem teto e a ficha mostra o topo da
// lista. A conversa inteira se le pela thread, com paginacao.
export function linhaDoTempoDoContato(
  contatoId: string,
  opcoes?: { limite?: unknown },
): ItemLinhaDoTempo[] {
  acharContatoOuFalhar(contatoId);
  const limite =
    inteiroOpcional(opcoes?.limite, "Limite", 1, LIMITE_LINHA_DO_TEMPO_MAXIMO) ??
    LIMITE_LINHA_DO_TEMPO_PADRAO;

  const itens: ItemLinhaDoTempo[] = lerInteracoes(contatoId).map((interacao) => ({
    tipo: "interacao" as const,
    em: interacao.em,
    interacao,
  }));

  for (const conversa of lerIndice().conversas) {
    if (conversa.contatoId !== contatoId) continue;
    const { mensagens } = lerConversaCompleta(conversa.id);
    // So a cauda de cada conversa: nada alem do limite pode aparecer no
    // resultado final mesmo, entao ler a thread inteira pra jogar fora seria
    // trabalho perdido em conversa longa.
    for (const mensagem of mensagens.slice(-limite)) {
      itens.push({
        tipo: "mensagem",
        em: mensagem.enviadaEm,
        conversaId: conversa.id,
        mensagem,
      });
    }
  }

  itens.sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
  return itens.slice(0, limite);
}
