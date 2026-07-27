// Migracao e saneamento do arquivo do CRM, de qualquer versao ate a v4.
//
// Duas regras mandam aqui, nesta ordem:
//
// 1. Dado do usuario e sagrado. NADA e descartado em silencio. Onde a v3
//    jogava fora (negocio sem titulo, negocio apontando pra contato que nao
//    existe), agora entra fallback: titulo vira "Sem titulo" e orfao ganha um
//    dono de recuperacao. Cada recuperacao deixa rastro em "recuperados".
// 2. Versao desconhecida nao e adivinhada. Arquivo de uma versao futura devolve
//    null e vai pra quarentena, porque migrar as cegas destroi historico.
//
// A funcao e pura de proposito: interacoes e estagios extraidos saem no
// resultado, e quem grava (estado.ts) decide a ordem de escrita.

import { normalizarTelefone } from "../util/telefone.js";
import {
  ID_CONTATO_RECUPERACAO,
  NOME_CONTATO_RECUPERACAO,
  STATUS_NEGOCIO,
  STATUS_ORCAMENTO,
  TIPOS_COLUNA,
  TIPOS_INTERACAO,
  VERSAO_CRM_ATUAL,
  chaveOrganizacao,
  colunasPadrao,
  gerarId,
  ordenarColunas,
  tipoColunaPeloNome,
  type Coluna,
  type Contato,
  type DadosLead,
  type EstadoCrm,
  type Interacao,
  type Negocio,
  type Orcamento,
  type Organizacao,
  type ParticipanteNegocio,
  type RegistroEstagio,
  type StatusNegocio,
  type StatusOrcamento,
  type Tarefa,
  type TipoColuna,
  type TipoInteracao,
} from "./modelo.js";

export interface ResultadoNormalizacaoCrm {
  estado: EstadoCrm;
  precisaSalvar: boolean;
  // Linhas pro interacoes.jsonl que sairam de dentro dos contatos.
  interacoesExtraidas: Interacao[];
  // Linhas pro estagios.jsonl: uma por contato, com o estagio em que ele estava.
  estagiosExtraidos: RegistroEstagio[];
  // Rastro humano do que foi recuperado em vez de descartado.
  recuperados: string[];
}

// Negocio de recuperacao: recebe orcamento que apontava pra negocio inexistente.
const ID_NEGOCIO_RECUPERACAO = "n-registros-sem-dono";

// Origem tecnica gravada pela mineracao de leads. Na v3 ela morava em "origem",
// que o usuario podia editar, e ao mesmo tempo era chave de deduplicacao.
const ORIGEM_TECNICA = /^([a-z0-9-]+):(.+)$/i;
const ROTULOS_DE_ORIGEM: Record<string, string> = {
  "google-maps": "Google Maps",
};

type Bruto = Record<string, unknown>;

// Contexto mutavel da migracao. Evita passar cinco parametros por funcao.
interface Contexto {
  precisaSalvar: boolean;
  recuperados: string[];
  workspaceOrigemId: string;
  agora: string;
}

function objeto(valor: unknown): Bruto | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Bruto)
    : null;
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function dataValida(valor: unknown, alternativa: string): string {
  return typeof valor === "string" && !Number.isNaN(Date.parse(valor))
    ? valor
    : alternativa;
}

function dataOpcional(valor: unknown): string | undefined {
  return typeof valor === "string" && !Number.isNaN(Date.parse(valor))
    ? valor
    : undefined;
}

function textoOpcional(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  return valor.trim() || undefined;
}

function numeroOpcional(valor: unknown): number | undefined {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= 0
    ? valor
    : undefined;
}

function inteiroOpcional(valor: unknown, minimo: number, maximo: number): number | undefined {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return undefined;
  const inteiro = Math.trunc(valor);
  return inteiro >= minimo && inteiro <= maximo ? inteiro : undefined;
}

function tags(valor: unknown): string[] {
  return lista(valor).filter((tag): tag is string => typeof tag === "string");
}

// ---------------------------------------------------------------- colunas

function saneiaColuna(valor: unknown, indice: number, ctx: Contexto): Coluna | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  if (typeof bruto.id !== "string" || typeof bruto.nome !== "string") return null;
  let tipo: TipoColuna;
  if (TIPOS_COLUNA.has(bruto.tipo as TipoColuna)) {
    tipo = bruto.tipo as TipoColuna;
  } else {
    // Coluna que veio de versao sem "tipo": o nome e a unica pista, e ela so
    // e usada aqui, uma vez. Dai em diante o tipo e dado explicito.
    tipo = tipoColunaPeloNome(bruto.nome);
    ctx.precisaSalvar = true;
  }
  const coluna: Coluna = {
    id: bruto.id,
    nome: bruto.nome,
    ordem:
      typeof bruto.ordem === "number" && Number.isFinite(bruto.ordem)
        ? bruto.ordem
        : indice,
    tipo,
  };
  const dias = inteiroOpcional(bruto.diasParaEsfriar, 1, 3650);
  if (dias !== undefined) coluna.diasParaEsfriar = dias;
  return coluna;
}

// ---------------------------------------------------------- organizacoes

function saneiaOrganizacao(valor: unknown, ctx: Contexto): Organizacao | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  const nome = textoOpcional(bruto.nome);
  if (!nome) return null;
  const criadoEm = dataValida(bruto.criadoEm, ctx.agora);
  const organizacao: Organizacao = {
    id: typeof bruto.id === "string" && bruto.id ? bruto.id : gerarId("o"),
    nome,
    criadoEm,
    atualizadoEm: dataValida(bruto.atualizadoEm, criadoEm),
  };
  const documento = textoOpcional(bruto.documento);
  if (documento) organizacao.documento = documento;
  const site = textoOpcional(bruto.site);
  if (site) organizacao.site = site;
  return organizacao;
}

// Cada string distinta de contato.empresa vira uma Organizacao. A deduplicacao
// e por nome aparado, ignorando caixa: "Acme" e "acme " sao a mesma empresa.
function montarOrganizacoes(
  brutas: unknown,
  contatos: readonly Bruto[],
  ctx: Contexto,
): { organizacoes: Organizacao[]; porChave: Map<string, string> } {
  const organizacoes: Organizacao[] = [];
  const porChave = new Map<string, string>();
  for (const valor of lista(brutas)) {
    const organizacao = saneiaOrganizacao(valor, ctx);
    if (!organizacao) continue;
    const chave = chaveOrganizacao(organizacao.nome);
    if (porChave.has(chave)) continue;
    porChave.set(chave, organizacao.id);
    organizacoes.push(organizacao);
  }
  for (const contato of contatos) {
    const empresa = textoOpcional(contato.empresa);
    if (!empresa) continue;
    const chave = chaveOrganizacao(empresa);
    if (porChave.has(chave)) continue;
    const criadoEm = dataValida(contato.criadoEm, ctx.agora);
    const organizacao: Organizacao = {
      id: gerarId("o"),
      nome: empresa,
      criadoEm,
      atualizadoEm: criadoEm,
    };
    porChave.set(chave, organizacao.id);
    organizacoes.push(organizacao);
    ctx.precisaSalvar = true;
  }
  return { organizacoes, porChave };
}

// -------------------------------------------------------------- contatos

function saneiaLead(valor: unknown): DadosLead | undefined {
  const bruto = objeto(valor);
  if (!bruto) return undefined;
  const saida: DadosLead = {};
  for (const campo of [
    "placeId",
    "categoria",
    "endereco",
    "site",
    "termoBusca",
    "localizacao",
    "capturadoEm",
  ] as const) {
    const texto = textoOpcional(bruto[campo]);
    if (texto) saida[campo] = texto;
  }
  const nota = numeroOpcional(bruto.nota);
  if (nota !== undefined) saida.nota = nota;
  const total = numeroOpcional(bruto.totalAvaliacoes);
  if (total !== undefined) saida.totalAvaliacoes = total;
  return Object.keys(saida).length > 0 ? saida : undefined;
}

// Separa o rotulo humano da chave tecnica. Ate a v3 os dois moravam em
// "origem": o usuario editava o rotulo e quebrava a deduplicacao de lead sem
// receber aviso nenhum.
function separarOrigem(
  bruto: Bruto,
  ctx: Contexto,
): { origem?: string; chaveExterna?: string } {
  const origem = textoOpcional(bruto.origem);
  const chaveExistente = textoOpcional(bruto.chaveExterna);
  if (!origem) {
    return chaveExistente ? { chaveExterna: chaveExistente } : {};
  }
  const casou = ORIGEM_TECNICA.exec(origem);
  if (!casou || !ROTULOS_DE_ORIGEM[casou[1].toLowerCase()]) {
    // Rotulo humano comum: fica onde estava.
    return chaveExistente ? { origem, chaveExterna: chaveExistente } : { origem };
  }
  ctx.precisaSalvar = true;
  return {
    origem: ROTULOS_DE_ORIGEM[casou[1].toLowerCase()],
    chaveExterna: chaveExistente ?? origem,
  };
}

// Fallback em vez de descarte: id ausente ganha id novo, nome ausente vira
// "Sem nome", coluna invalida cai na primeira do funil. So um valor que nem
// objeto e se perde de fato, porque nao ha o que recuperar dele.
function saneiaContato(
  valor: unknown,
  colunasValidas: Set<string>,
  primeiraColuna: string,
  organizacoesPorChave: Map<string, string>,
  organizacoesValidas: Set<string>,
  ctx: Contexto,
): Contato | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  const id = typeof bruto.id === "string" && bruto.id ? bruto.id : gerarId("c");
  const nome =
    typeof bruto.nome === "string" && bruto.nome.trim() ? bruto.nome : "Sem nome";
  let colunaId: string;
  if (typeof bruto.colunaId === "string" && colunasValidas.has(bruto.colunaId)) {
    colunaId = bruto.colunaId;
  } else {
    colunaId = primeiraColuna;
    ctx.precisaSalvar = true;
  }
  const criadoEm = dataValida(bruto.criadoEm, ctx.agora);
  const contato: Contato = {
    id,
    nome,
    colunaId,
    tags: tags(bruto.tags),
    workspaceOrigemId:
      textoOpcional(bruto.workspaceOrigemId) ?? ctx.workspaceOrigemId,
    criadoEm,
    atualizadoEm: dataValida(bruto.atualizadoEm, criadoEm),
  };

  const organizacaoId = textoOpcional(bruto.organizacaoId);
  if (organizacaoId && organizacoesValidas.has(organizacaoId)) {
    contato.organizacaoId = organizacaoId;
  } else {
    const empresa = textoOpcional(bruto.empresa);
    const daEmpresa = empresa
      ? organizacoesPorChave.get(chaveOrganizacao(empresa))
      : undefined;
    if (daEmpresa) contato.organizacaoId = daEmpresa;
    else if (organizacaoId) ctx.precisaSalvar = true;
  }

  const telefone = textoOpcional(bruto.telefone);
  if (telefone) {
    contato.telefone = telefone;
    const normalizado = normalizarTelefone(telefone);
    if (normalizado) contato.telefoneNormalizado = normalizado;
    if (normalizado !== (textoOpcional(bruto.telefoneNormalizado) ?? null)) {
      ctx.precisaSalvar = true;
    }
  }
  const email = textoOpcional(bruto.email);
  if (email) contato.email = email;

  const { origem, chaveExterna } = separarOrigem(bruto, ctx);
  if (origem) contato.origem = origem;
  if (chaveExterna) contato.chaveExterna = chaveExterna;

  const proximoContato = dataOpcional(bruto.proximoContato);
  if (proximoContato) contato.proximoContato = proximoContato;
  const cadencia = inteiroOpcional(bruto.cadenciaDias, 1, 3650);
  if (cadencia !== undefined) contato.cadenciaDias = cadencia;
  const lead = saneiaLead(bruto.lead);
  if (lead) contato.lead = lead;
  if (bruto.arquivado === true) contato.arquivado = true;
  return contato;
}

// ------------------------------------------------ interacoes e tarefas

function saneiaInteracao(
  valor: unknown,
  contatoId: string,
  indice: number,
  ctx: Contexto,
): Interacao | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  if (typeof bruto.texto !== "string") return null;
  const em = dataValida(bruto.em, ctx.agora);
  return {
    // Id estavel quando o original nao tinha: e o que deixa a migracao rodar
    // duas vezes sem duplicar linha no jsonl.
    id: typeof bruto.id === "string" && bruto.id ? bruto.id : `i-${contatoId}-${indice}`,
    contatoId,
    em,
    tipo: TIPOS_INTERACAO.has(bruto.tipo as TipoInteracao)
      ? (bruto.tipo as TipoInteracao)
      : "outro",
    texto: bruto.texto,
    criadaEm: dataValida(bruto.criadaEm, em),
  };
}

function saneiaTarefa(
  valor: unknown,
  contatoId: string | undefined,
  indice: number,
  ctx: Contexto,
): Tarefa | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  if (typeof bruto.texto !== "string") return null;
  const tarefa: Tarefa = {
    id:
      typeof bruto.id === "string" && bruto.id
        ? bruto.id
        : `t-${contatoId ?? "solta"}-${indice}`,
    texto: bruto.texto,
    feita: bruto.feita === true,
    criadaEm: dataValida(bruto.criadaEm, ctx.agora),
  };
  const prazo = dataOpcional(bruto.prazo);
  if (prazo) tarefa.prazo = prazo;
  const dono = contatoId ?? textoOpcional(bruto.contatoId);
  if (dono) tarefa.contatoId = dono;
  const negocioId = textoOpcional(bruto.negocioId);
  if (negocioId) tarefa.negocioId = negocioId;
  return tarefa;
}

// -------------------------------------------------------------- negocios

function saneiaParticipantes(valor: unknown): ParticipanteNegocio[] | undefined {
  const saida: ParticipanteNegocio[] = [];
  for (const item of lista(valor)) {
    const bruto = objeto(item);
    if (!bruto) continue;
    const contatoId = textoOpcional(bruto.contatoId);
    if (!contatoId) continue;
    saida.push({ contatoId, papel: textoOpcional(bruto.papel) ?? "participa" });
  }
  return saida.length > 0 ? saida : undefined;
}

function saneiaNegocio(
  valor: unknown,
  statusPadrao: StatusNegocio,
  ctx: Contexto,
): { negocio: Negocio; contatoIdBruto: string | undefined } | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  const id = typeof bruto.id === "string" && bruto.id ? bruto.id : gerarId("n");
  let titulo = textoOpcional(bruto.titulo);
  if (!titulo) {
    // A v3 descartava o negocio inteiro aqui. Um titulo faltando nao pode
    // custar o valor e a data do negocio.
    titulo = "Sem titulo";
    ctx.recuperados.push(`Negocio "${id}" estava sem titulo e virou "Sem titulo".`);
    ctx.precisaSalvar = true;
  }
  const criadoEm = dataValida(bruto.criadoEm, ctx.agora);
  const negocio: Negocio = {
    id,
    titulo,
    contatoId: "",
    status: STATUS_NEGOCIO.has(bruto.status as StatusNegocio)
      ? (bruto.status as StatusNegocio)
      : statusPadrao,
    criadoEm,
    atualizadoEm: dataValida(bruto.atualizadoEm, criadoEm),
  };
  for (const campo of ["valorEstimado", "valorFechado", "valorMensal"] as const) {
    const numero = numeroOpcional(bruto[campo]);
    if (numero !== undefined) negocio[campo] = numero;
  }
  const fechadoEm = dataOpcional(bruto.fechadoEm);
  if (fechadoEm) negocio.fechadoEm = fechadoEm;
  const proximaAcaoEm = dataOpcional(bruto.proximaAcaoEm);
  if (proximaAcaoEm) negocio.proximaAcaoEm = proximaAcaoEm;
  const proximaAcaoTexto = textoOpcional(bruto.proximaAcaoTexto);
  if (proximaAcaoTexto) negocio.proximaAcaoTexto = proximaAcaoTexto;
  const escopo = textoOpcional(bruto.escopo);
  if (escopo) negocio.escopo = escopo;
  if (bruto.recorrente === true) negocio.recorrente = true;
  const diaDoCiclo = inteiroOpcional(bruto.diaDoCiclo, 1, 31);
  if (diaDoCiclo !== undefined) negocio.diaDoCiclo = diaDoCiclo;
  const participantes = saneiaParticipantes(bruto.participantes);
  if (participantes) negocio.participantes = participantes;
  return { negocio, contatoIdBruto: textoOpcional(bruto.contatoId) };
}

// ------------------------------------------------------------ orcamentos

function saneiaOrcamento(valor: unknown, ctx: Contexto): Orcamento | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  const negocioId = textoOpcional(bruto.negocioId);
  const criadoEm = dataValida(bruto.criadoEm, ctx.agora);
  const orcamento: Orcamento = {
    id: typeof bruto.id === "string" && bruto.id ? bruto.id : gerarId("q"),
    negocioId: negocioId ?? "",
    valor: numeroOpcional(bruto.valor) ?? 0,
    status: STATUS_ORCAMENTO.has(bruto.status as StatusOrcamento)
      ? (bruto.status as StatusOrcamento)
      : "rascunho",
    criadoEm,
    atualizadoEm: dataValida(bruto.atualizadoEm, criadoEm),
  };
  const enviadoEm = dataOpcional(bruto.enviadoEm);
  if (enviadoEm) orcamento.enviadoEm = enviadoEm;
  const validoAte = dataOpcional(bruto.validoAte);
  if (validoAte) orcamento.validoAte = validoAte;
  const arquivo = textoOpcional(bruto.arquivo);
  if (arquivo) orcamento.arquivo = arquivo;
  const link = textoOpcional(bruto.link);
  if (link) orcamento.link = link;
  return orcamento;
}

// ------------------------------------------------------- formas antigas

// v1: o contato carregava colunaId, valorEstimado e "notas". Vira a forma que o
// resto da migracao entende, sem perder nota nem valor.
function contatoDaV1(bruto: Bruto): { contato: Bruto; negocio: Bruto | null } {
  const notas = lista(bruto.notas).map((nota) => {
    const item = objeto(nota);
    return item ? { em: item.em, tipo: "nota", texto: item.texto } : null;
  });
  const contato: Bruto = { ...bruto, interacoes: notas.filter(Boolean), tarefas: [] };
  const valor = numeroOpcional(bruto.valorEstimado);
  if (valor === undefined) return { contato, negocio: null };
  const id = typeof bruto.id === "string" && bruto.id ? bruto.id : "";
  return {
    contato,
    negocio: {
      id: `n-${id || gerarId("c")}`,
      titulo: typeof bruto.nome === "string" ? bruto.nome : "Sem titulo",
      contatoId: id,
      valorEstimado: valor,
      criadoEm: bruto.criadoEm,
      atualizadoEm: bruto.atualizadoEm,
    },
  };
}

// v2: o estagio vivia no negocio. Cada contato herda o estagio do seu negocio
// mais recente; contato sem negocio cai na primeira coluna.
function estagiosDosNegociosV2(
  negocios: unknown,
  colunasValidas: Set<string>,
): Map<string, string> {
  const mapa = new Map<string, { colunaId: string; quando: number }>();
  for (const valor of lista(negocios)) {
    const bruto = objeto(valor);
    if (!bruto) continue;
    if (typeof bruto.contatoId !== "string" || typeof bruto.colunaId !== "string") continue;
    if (!colunasValidas.has(bruto.colunaId)) continue;
    const instante = Date.parse(dataValida(bruto.atualizadoEm, ""));
    const quando = Number.isNaN(instante) ? 0 : instante;
    const anterior = mapa.get(bruto.contatoId);
    if (!anterior || quando >= anterior.quando) {
      mapa.set(bruto.contatoId, { colunaId: bruto.colunaId, quando });
    }
  }
  return new Map([...mapa].map(([id, { colunaId }]) => [id, colunaId]));
}

// ------------------------------------------------------------- principal

export function normalizarEstadoCrm(
  bruto: unknown,
  workspaceOrigemId = "",
): ResultadoNormalizacaoCrm | null {
  const dados = objeto(bruto);
  if (!dados) return null;

  // Guarda contra o pior modo de falha que este arquivo ja teve. Antes, versao
  // desconhecida caia no ramo v1 la embaixo, que le "notas" em vez de
  // "interacoes", forca tarefas vazias e nem olha "negocios". O resultado
  // destruido era gravado por cima do original na mesma leitura, sem quarentena,
  // porque o arquivo era considerado valido.
  //
  // Devolver null joga o arquivo pra quarentena, o mesmo caminho do JSON
  // quebrado. Perder acesso e recuperavel; perder o historico nao e.
  const versao = dados.versao;
  const versaoConhecida =
    typeof versao === "number" && versao >= 1 && versao <= VERSAO_CRM_ATUAL;
  const pareceEstruturaNova =
    Array.isArray(dados.negocios) ||
    Array.isArray(dados.organizacoes) ||
    (Array.isArray(dados.contatos) &&
      dados.contatos.some(
        (contato) => contato && typeof contato === "object" && "interacoes" in (contato as object),
      ));
  if (!versaoConhecida && pareceEstruturaNova) return null;
  if (typeof versao === "number" && versao > VERSAO_CRM_ATUAL) return null;

  const ctx: Contexto = {
    precisaSalvar: versao !== VERSAO_CRM_ATUAL,
    recuperados: [],
    workspaceOrigemId,
    agora: new Date().toISOString(),
  };

  let colunas = lista(dados.colunas)
    .map((valor, indice) => saneiaColuna(valor, indice, ctx))
    .filter((coluna): coluna is Coluna => coluna !== null);
  if (colunas.length === 0) {
    colunas = colunasPadrao();
    ctx.precisaSalvar = true;
  }
  colunas = ordenarColunas(colunas);
  const colunasValidas = new Set(colunas.map((coluna) => coluna.id));
  const colunaPorId = new Map(colunas.map((coluna) => [coluna.id, coluna]));
  const primeiraColuna = colunas[0].id;

  // Formas antigas viram a forma que o resto entende antes de qualquer coisa.
  let contatosBrutos = lista(dados.contatos)
    .map(objeto)
    .filter((contato): contato is Bruto => contato !== null);
  let negociosBrutos = lista(dados.negocios)
    .map(objeto)
    .filter((negocio): negocio is Bruto => negocio !== null);

  if (versao === 1 || versao === undefined) {
    const convertidos = contatosBrutos.map(contatoDaV1);
    contatosBrutos = convertidos.map((item) => item.contato);
    negociosBrutos = convertidos
      .map((item) => item.negocio)
      .filter((negocio): negocio is Bruto => negocio !== null);
  } else if (versao === 2) {
    const estagios = estagiosDosNegociosV2(dados.negocios, colunasValidas);
    contatosBrutos = contatosBrutos.map((contato) => {
      const id = typeof contato.id === "string" ? contato.id : "";
      const jaTem =
        typeof contato.colunaId === "string" && colunasValidas.has(contato.colunaId);
      return jaTem ? contato : { ...contato, colunaId: estagios.get(id) };
    });
  }

  const { organizacoes, porChave } = montarOrganizacoes(
    dados.organizacoes,
    contatosBrutos,
    ctx,
  );
  const organizacoesValidas = new Set(organizacoes.map((item) => item.id));

  // Guarda o par bruto/saneado: a extracao logo abaixo precisa dos dois lados,
  // e casar por indice depois de um filter e o tipo de coisa que quebra calado.
  const pares = contatosBrutos
    .map((bruto) => ({
      bruto,
      contato: saneiaContato(
        bruto,
        colunasValidas,
        primeiraColuna,
        porChave,
        organizacoesValidas,
        ctx,
      ),
    }))
    .filter((par): par is { bruto: Bruto; contato: Contato } => par.contato !== null);
  const contatos = pares.map((par) => par.contato);
  const contatosPorId = new Map(contatos.map((contato) => [contato.id, contato]));

  // Interacoes e tarefas saem de dentro do contato. A v4 nao as guarda mais la,
  // mas a extracao roda em qualquer versao: arquivo editado a mao pode ter
  // sobrado com elas, e sobra de dado do usuario nao se joga fora.
  const interacoesExtraidas: Interacao[] = [];
  const tarefas: Tarefa[] = [];
  for (const { bruto, contato } of pares) {
    const interacoes = lista(bruto.interacoes);
    const tarefasDoContato = lista(bruto.tarefas);
    interacoes.forEach((valor, i) => {
      const interacao = saneiaInteracao(valor, contato.id, i, ctx);
      if (interacao) interacoesExtraidas.push(interacao);
    });
    tarefasDoContato.forEach((valor, i) => {
      const tarefa = saneiaTarefa(valor, contato.id, i, ctx);
      if (tarefa) tarefas.push(tarefa);
    });
    if (interacoes.length > 0 || tarefasDoContato.length > 0) ctx.precisaSalvar = true;
  }
  // Tarefas de topo (v4) entram depois, sem repetir id ja visto.
  const idsDeTarefa = new Set(tarefas.map((tarefa) => tarefa.id));
  lista(dados.tarefas).forEach((valor, indice) => {
    const tarefa = saneiaTarefa(valor, undefined, indice, ctx);
    if (!tarefa || idsDeTarefa.has(tarefa.id)) return;
    idsDeTarefa.add(tarefa.id);
    tarefas.push(tarefa);
  });

  // Contato de recuperacao: so nasce quando alguem precisa dele.
  let recuperacao: Contato | null = contatosPorId.get(ID_CONTATO_RECUPERACAO) ?? null;
  function contatoDeRecuperacao(): Contato {
    if (recuperacao) return recuperacao;
    recuperacao = {
      id: ID_CONTATO_RECUPERACAO,
      nome: NOME_CONTATO_RECUPERACAO,
      colunaId: primeiraColuna,
      tags: [],
      workspaceOrigemId,
      criadoEm: ctx.agora,
      atualizadoEm: ctx.agora,
    };
    contatos.push(recuperacao);
    contatosPorId.set(recuperacao.id, recuperacao);
    ctx.precisaSalvar = true;
    return recuperacao;
  }

  // Status do negocio, quando o arquivo antigo nao tinha o campo: sai do tipo da
  // coluna onde o dono esta. Era o unico sinal de ganho ou perdido que existia
  // na v3, e ignorar ele deixaria todo negocio velho marcado como aberto.
  const statusPeloDono = (id: string | undefined): StatusNegocio => {
    const dono = id ? contatosPorId.get(id) : undefined;
    const coluna = dono ? colunaPorId.get(dono.colunaId) : undefined;
    return coluna?.tipo ?? "aberto";
  };
  const negocios: Negocio[] = [];
  for (const bruto of negociosBrutos) {
    const contatoIdBruto = textoOpcional(bruto.contatoId);
    const saneado = saneiaNegocio(bruto, statusPeloDono(contatoIdBruto), ctx);
    if (!saneado) continue;
    const { negocio, contatoIdBruto: donoBruto } = saneado;
    if (donoBruto && contatosPorId.has(donoBruto)) {
      negocio.contatoId = donoBruto;
    } else {
      // A v3 descartava o negocio orfao. Agora ele ganha um dono de
      // recuperacao, com o id antigo anotado no rastro.
      negocio.contatoId = contatoDeRecuperacao().id;
      ctx.recuperados.push(
        `Negocio "${negocio.id}" apontava pro contato "${donoBruto ?? "(vazio)"}", que nao existe, e foi pro contato "${NOME_CONTATO_RECUPERACAO}".`,
      );
      ctx.precisaSalvar = true;
    }
    if (negocio.participantes) {
      const validos = negocio.participantes.filter((p) => contatosPorId.has(p.contatoId));
      if (validos.length > 0) negocio.participantes = validos;
      else delete negocio.participantes;
    }
    negocios.push(negocio);
  }
  const negociosPorId = new Map(negocios.map((negocio) => [negocio.id, negocio]));

  // Orcamento orfao ganha um negocio de recuperacao, pelo mesmo motivo.
  let negocioRecuperacao: Negocio | null = negociosPorId.get(ID_NEGOCIO_RECUPERACAO) ?? null;
  function negocioDeRecuperacao(): Negocio {
    if (negocioRecuperacao) return negocioRecuperacao;
    negocioRecuperacao = {
      id: ID_NEGOCIO_RECUPERACAO,
      titulo: "Sem titulo",
      contatoId: contatoDeRecuperacao().id,
      status: "aberto",
      criadoEm: ctx.agora,
      atualizadoEm: ctx.agora,
    };
    negocios.push(negocioRecuperacao);
    negociosPorId.set(negocioRecuperacao.id, negocioRecuperacao);
    ctx.precisaSalvar = true;
    return negocioRecuperacao;
  }

  const orcamentos: Orcamento[] = [];
  for (const valor of lista(dados.orcamentos)) {
    const orcamento = saneiaOrcamento(valor, ctx);
    if (!orcamento) continue;
    if (!negociosPorId.has(orcamento.negocioId)) {
      const antigo = orcamento.negocioId || "(vazio)";
      orcamento.negocioId = negocioDeRecuperacao().id;
      ctx.recuperados.push(
        `Orcamento "${orcamento.id}" apontava pro negocio "${antigo}", que nao existe, e foi pro negocio de recuperacao.`,
      );
      ctx.precisaSalvar = true;
    }
    orcamentos.push(orcamento);
  }

  // Tarefa que aponta pra negocio ou contato que sumiu perde so o vinculo, e
  // continua na lista: o texto dela e trabalho do usuario.
  for (const tarefa of tarefas) {
    if (tarefa.contatoId && !contatosPorId.has(tarefa.contatoId)) {
      ctx.recuperados.push(
        `Tarefa "${tarefa.id}" apontava pro contato "${tarefa.contatoId}", que nao existe, e ficou sem vinculo.`,
      );
      delete tarefa.contatoId;
      ctx.precisaSalvar = true;
    }
    if (tarefa.negocioId && !negociosPorId.has(tarefa.negocioId)) {
      ctx.recuperados.push(
        `Tarefa "${tarefa.id}" apontava pro negocio "${tarefa.negocioId}", que nao existe, e ficou sem vinculo.`,
      );
      delete tarefa.negocioId;
      ctx.precisaSalvar = true;
    }
  }

  // Estagio de cada contato. Na migracao nao existe historico de verdade, entao
  // vale a melhor aproximacao honesta: uma linha por contato, com a coluna atual
  // e a data em que a ficha nasceu. Id estavel pra nao duplicar na segunda vez.
  const estagiosExtraidos: RegistroEstagio[] =
    versao === VERSAO_CRM_ATUAL
      ? []
      : contatos.map((contato) => ({
          id: `e-${contato.id}-migracao`,
          contatoId: contato.id,
          colunaId: contato.colunaId,
          colunaNome: colunaPorId.get(contato.colunaId)?.nome ?? "",
          entrouEm: contato.criadoEm,
        }));

  return {
    estado: {
      versao: 4,
      colunas,
      organizacoes,
      contatos,
      negocios,
      orcamentos,
      tarefas,
    },
    precisaSalvar: ctx.precisaSalvar,
    interacoesExtraidas,
    estagiosExtraidos,
    recuperados: ctx.recuperados,
  };
}
