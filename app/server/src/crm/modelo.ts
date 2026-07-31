// Modelo do CRM v4: tipos, defaults e helpers puros.
//
// Fica separado do estado pra migracao, historico e rotas falarem do mesmo
// vocabulario sem criar ciclo de import.
//
// O que mudou da v3 pra v4, e por que:
// - Coluna ganhou "tipo": o funil mentia, porque ganho, perdido e aberto
//   somavam no mesmo numero. Nome de coluna e texto livre, semantica nao pode
//   depender dele.
// - Organizacao virou entidade. Antes "empresa" era uma string solta repetida
//   em cada contato, sem como agrupar nem corrigir num lugar so.
// - Contato PERDEU interacoes[] e tarefas[]. Elas cresciam sem teto dentro do
//   arquivo de todo mundo, entao cada registro reescrevia a base inteira. As
//   interacoes foram pro interacoes.jsonl (ver historico.ts).
// - "origem" voltou a ser so rotulo humano e a chave tecnica saiu pra
//   "chaveExterna". Antes eram o mesmo campo: editar o rotulo quebrava a
//   deduplicacao de lead em silencio.
// - telefoneNormalizado persiste o E.164 (ver util/telefone.ts).
// - Negocio ganhou status, proxima acao, escopo e recorrencia.
// - Orcamento nasceu: o momento mais caro do ciclo nao cabia num titulo.
// - Tarefa saiu de dentro do contato e virou lista de topo, pra poder apontar
//   pro negocio tambem.

export class ErroCrm extends Error {
  status: number;

  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroCrm";
    this.status = status;
  }
}

// Versao mais nova que este codigo entende. Arquivo acima disso nao e migravel
// pra tras: veio de uma versao futura do Hub e pode ter dado que este codigo
// nem sabe ler.
export const VERSAO_CRM_ATUAL = 4;

export type TipoColuna = "aberto" | "ganho" | "perdido";
export type TipoInteracao = "nota" | "ligacao" | "mensagem" | "reuniao" | "outro";
export type StatusNegocio = "aberto" | "ganho" | "perdido";
export type StatusOrcamento =
  | "rascunho"
  | "enviado"
  | "aceito"
  | "recusado"
  | "expirado";

export interface Coluna {
  id: string;
  nome: string;
  ordem: number;
  // Semantica do estagio, independente do nome que o usuario escreveu.
  tipo: TipoColuna;
  // Sem contato ha mais dias que isto, o cartao esta esfriando.
  diasParaEsfriar?: number;
}

export interface Organizacao {
  id: string;
  nome: string;
  documento?: string;
  site?: string;
  criadoEm: string;
  atualizadoEm: string;
}

// Retrato do lead de origem (mineracao no Google Maps). So leitura: preserva o
// que a lista de busca mostrava, pra ficha nao nascer pobre depois de importar.
export interface DadosLead {
  placeId?: string;
  categoria?: string;
  endereco?: string;
  site?: string;
  nota?: number;
  totalAvaliacoes?: number;
  termoBusca?: string;
  localizacao?: string;
  capturadoEm?: string;
}

// Retrato de quem chegou pelo formulario do site. So leitura, igual ao
// DadosLead, e separado dele de proposito: sao duas origens com perguntas
// diferentes, e espremer as duas num tipo so deixaria os dois vagos.
//
// gatilho e tentativas aceitam texto longo (2000, o mesmo teto do formulario)
// porque sao a resposta aberta que mais serve na hora de ligar pra pessoa.
// Cortar em 300 como o resto transformaria o melhor campo em reticencias.
//
// O utm do formulario nao entra: e atribuicao de campanha, quase sempre vazia, e
// origem mais referrer ja contam de onde a pessoa veio.
export interface DadosFormulario {
  leadId?: string;
  recebidoEm?: string;
  negocio?: string;
  faturamento?: string;
  papelMarketing?: string;
  dores?: string[];
  gatilho?: string;
  tentativas?: string;
  decisao?: string;
  investimento?: string;
  horario?: string;
  // Calculada pelo banco do site a partir de decisao, faturamento e
  // investimento. Texto solto aqui de proposito: o CRM nao precisa conhecer o
  // vocabulario do formulario, e a regra pode mudar la sem migrar nada aqui.
  temperatura?: string;
  origem?: string;
  referrer?: string;
}

export interface Contato {
  id: string;
  nome: string;
  // Estagio do contato no funil. Todo contato mora numa coluna desde que nasce.
  colunaId: string;
  organizacaoId?: string;
  telefone?: string;
  // E.164 derivado do telefone. Persistido pra servir de chave de busca e de
  // deduplicacao sem recalcular a cada comparacao.
  telefoneNormalizado?: string;
  email?: string;
  // Rotulo humano, editavel a vontade. Nunca e chave de nada.
  origem?: string;
  // Chave tecnica da origem externa, ex "google-maps:<placeId>". Nao aparece
  // pro usuario editar.
  chaveExterna?: string;
  tags: string[];
  proximoContato?: string;
  // "Falar de novo a cada N dias".
  cadenciaDias?: number;
  // Procedencia do registro, pra fusao dos workspaces no escopo CORE.
  workspaceOrigemId: string;
  lead?: DadosLead;
  formulario?: DadosFormulario;
  arquivado?: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ParticipanteNegocio {
  contatoId: string;
  // Papel livre: decide, aprova, paga.
  papel: string;
}

// Valor/oportunidade preso a um contato. Nao tem estagio proprio: quem caminha
// no funil e o contato.
export interface Negocio {
  id: string;
  titulo: string;
  contatoId: string;
  status: StatusNegocio;
  participantes?: ParticipanteNegocio[];
  valorEstimado?: number;
  valorFechado?: number;
  fechadoEm?: string;
  proximaAcaoEm?: string;
  proximaAcaoTexto?: string;
  escopo?: string;
  recorrente?: boolean;
  valorMensal?: number;
  diaDoCiclo?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Orcamento {
  id: string;
  negocioId: string;
  valor: number;
  status: StatusOrcamento;
  enviadoEm?: string;
  validoAte?: string;
  arquivo?: string;
  link?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Tarefa {
  id: string;
  texto: string;
  prazo?: string;
  feita: boolean;
  contatoId?: string;
  negocioId?: string;
  criadaEm: string;
}

// Linha do interacoes.jsonl. Nao mora mais dentro do contato.
export interface Interacao {
  id: string;
  contatoId: string;
  // Quando aconteceu no mundo real. Registro retroativo depende de ser separado
  // do criadaEm.
  em: string;
  tipo: TipoInteracao;
  texto: string;
  criadaEm: string;
}

// Linha do estagios.jsonl: uma por entrada de contato em coluna.
export interface RegistroEstagio {
  id: string;
  contatoId: string;
  colunaId: string;
  // Nome da coluna no momento da transicao. Renomear ou excluir a coluna depois
  // nao pode apagar o que o historico dizia.
  colunaNome: string;
  entrouEm: string;
}

export interface EstadoCrm {
  versao: 4;
  colunas: Coluna[];
  organizacoes: Organizacao[];
  contatos: Contato[];
  negocios: Negocio[];
  orcamentos: Orcamento[];
  tarefas: Tarefa[];
}

export const TIPOS_INTERACAO = new Set<TipoInteracao>([
  "nota",
  "ligacao",
  "mensagem",
  "reuniao",
  "outro",
]);

export const TIPOS_COLUNA = new Set<TipoColuna>(["aberto", "ganho", "perdido"]);

export const STATUS_NEGOCIO = new Set<StatusNegocio>(["aberto", "ganho", "perdido"]);

export const STATUS_ORCAMENTO = new Set<StatusOrcamento>([
  "rascunho",
  "enviado",
  "aceito",
  "recusado",
  "expirado",
]);

// Funil que nasce com o workspace. O tipo vem junto: as tres primeiras sao
// aberto, "Fechado" e ganho e "Perdido" e perdido.
export const COLUNAS_PADRAO: ReadonlyArray<{ nome: string; tipo: TipoColuna }> = [
  { nome: "Não iniciados", tipo: "aberto" },
  { nome: "Conversando", tipo: "aberto" },
  { nome: "Proposta enviada", tipo: "aberto" },
  { nome: "Fechado", tipo: "ganho" },
  { nome: "Perdido", tipo: "perdido" },
];

// Contato de recuperacao: recebe negocio que apontava pra contato inexistente.
// Id fixo pra migracao rodar duas vezes sem criar dois donos.
export const ID_CONTATO_RECUPERACAO = "c-registros-sem-dono";
export const NOME_CONTATO_RECUPERACAO = "Registros sem dono";

export function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function colunasPadrao(): Coluna[] {
  return COLUNAS_PADRAO.map((coluna, ordem) => ({
    id: gerarId("k"),
    nome: coluna.nome,
    ordem,
    tipo: coluna.tipo,
  }));
}

export function ordenarColunas(colunas: Coluna[]): Coluna[] {
  return [...colunas].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
}

// Adivinha o tipo de uma coluna que veio de uma versao sem o campo. Nome e a
// unica pista que existe no arquivo antigo, entao ela e usada uma vez, na
// migracao, e nunca mais: dai em diante o tipo e dado explicito.
export function tipoColunaPeloNome(nome: string): TipoColuna {
  if (/perd|descart|recus|sem interesse/i.test(nome)) return "perdido";
  if (/fechad|ganh|vendid|cliente|concluid/i.test(nome)) return "ganho";
  return "aberto";
}

// Chave de deduplicacao de organizacao: nome aparado, sem diferenca de caixa.
export function chaveOrganizacao(nome: string): string {
  return nome.trim().toLocaleLowerCase("pt-BR");
}

const TETO_TEXTO_FORMULARIO = 300;
// gatilho e tentativas sao resposta aberta longa. Ver DadosFormulario.
const TETO_TEXTO_LONGO = 2000;
const TETO_DORES = 12;

// Saneia o retrato do formulario. Mora aqui, e nao em estado.ts nem em
// migracao.ts, porque o contato e reconstruido campo a campo NOS DOIS: criar
// ficha passa por um, e toda leitura do crm.json passa pelo outro. Campo que so
// um dos dois conhece e gravado e depois descartado em silencio na leitura
// seguinte. O saneiaDadosLead ainda vive duplicado nos dois arquivos; este nasce
// num lugar so pra nao repetir a armadilha.
export function saneiaDadosFormulario(valor: unknown): DadosFormulario | undefined {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return undefined;
  const bruto = valor as Record<string, unknown>;
  const saida: DadosFormulario = {};

  const texto = (v: unknown, teto: number): string | undefined => {
    if (typeof v !== "string") return undefined;
    const limpo = v.trim().slice(0, teto);
    return limpo || undefined;
  };

  for (const campo of [
    "leadId",
    "recebidoEm",
    "negocio",
    "faturamento",
    "papelMarketing",
    "decisao",
    "investimento",
    "horario",
    "temperatura",
    "origem",
    "referrer",
  ] as const) {
    const limpo = texto(bruto[campo], TETO_TEXTO_FORMULARIO);
    if (limpo) saida[campo] = limpo;
  }

  for (const campo of ["gatilho", "tentativas"] as const) {
    const limpo = texto(bruto[campo], TETO_TEXTO_LONGO);
    if (limpo) saida[campo] = limpo;
  }

  if (Array.isArray(bruto.dores)) {
    const dores = bruto.dores
      .map((dor) => texto(dor, TETO_TEXTO_FORMULARIO))
      .filter((dor): dor is string => Boolean(dor))
      .slice(0, TETO_DORES);
    if (dores.length > 0) saida.dores = dores;
  }

  return Object.keys(saida).length > 0 ? saida : undefined;
}
