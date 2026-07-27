// Fusao dos CRMs por workspace num CRM unico, no nivel CORE.
//
// O CRM e o funil comercial do dono do Hub, nao do cliente. Ate aqui ele vivia
// em app/dados/workspaces/<id>/crm.json e sumia quando nao havia cliente aberto.
// Agora mora em app/dados/crm/. Este modulo sobe o que ficou pra tras.
//
// Roda uma vez so: a fusao so e tentada quando o crm.json do CORE ainda nao
// existe. No fim, cada arquivo de origem vira "<nome>.migrado-para-core-
// <carimbo>", por rename, com os bytes intactos. Nada e apagado, nunca.
//
// A ordem de escrita e a mesma do resto do CRM: historico primeiro, crm.json
// depois. Se o processo cair no meio, a proxima leitura repete a fusao e o
// "sem repetir" evita linha duplicada.

import { existsSync, readFileSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

import { anexarJsonl, anexarJsonlSemRepetir } from "../util/jsonl.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  NOME_ESTAGIOS,
  NOME_INTERACOES,
  anexarEstagiosSemRepetir,
  anexarInteracoesSemRepetir,
  lerEstagiosDaPasta,
  lerInteracoesDaPasta,
} from "./historico.js";
import { normalizarEstadoCrm } from "./migracao.js";
import {
  ordenarColunas,
  type Coluna,
  type Contato,
  type EstadoCrm,
  type Interacao,
  type Negocio,
  type Orcamento,
  type Organizacao,
  type RegistroEstagio,
  type Tarefa,
} from "./modelo.js";

export const NOME_ARQUIVO_CRM = "crm.json";
// Rastro do que a migracao e a fusao recuperaram em vez de descartar. Fica ao
// lado do crm.json pra o usuario ter onde olhar quando algo aparecer fora do
// lugar.
export const NOME_RECUPERACOES = "recuperacoes.jsonl";
// Contato que parece repetido depois da fusao. So anotacao: nada e fundido
// sozinho aqui (ver anotarSuspeitas).
export const NOME_DUPLICATAS = "duplicatas-da-fusao.jsonl";

// Arquivos que sobem do workspace pro CORE e sao renomeados na origem.
const ARQUIVOS_DE_ORIGEM = [
  NOME_ARQUIVO_CRM,
  NOME_INTERACOES,
  NOME_ESTAGIOS,
  NOME_RECUPERACOES,
];

export interface ResultadoFusao {
  estado: EstadoCrm;
  // Ids dos workspaces que entraram na fusao, na ordem em que foram lidos.
  workspaces: string[];
  // Quantas suspeitas de contato repetido foram anotadas pro usuario decidir.
  suspeitas: number;
}

// Linha do duplicatas-da-fusao.jsonl. Id determinstico: repetir a fusao depois
// de uma queda nao duplica a linha.
interface SuspeitaDuplicata {
  id: string;
  em: string;
  oQueBateu: "telefone" | "chaveExterna";
  valor: string;
  contatoA: string;
  nomeA: string;
  workspaceA: string;
  contatoB: string;
  nomeB: string;
  workspaceB: string;
}

// Carimbo AAAA-MM-DDTHH-mm-ss. O ":" do ISO nao vale em nome de arquivo no
// Windows, entao vira "-". Mesma forma da quarentena.
function carimbo(): string {
  return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

// Chave de fusao de coluna: minusculo, sem acento, sem espaco nas pontas.
// A decomposicao NFD separa a letra do acento, e o \p{Diacritic} tira so o
// acento: "Não iniciados" e "nao iniciados" viram a mesma chave.
export function chaveColuna(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

// Ids de workspace que tem crm.json, em ordem estavel. Sem ordem determinstica
// o resultado da fusao muda a cada execucao e nao da pra testar.
export function workspacesComCrm(pastaWorkspaces: string): string[] {
  if (!existsSync(pastaWorkspaces)) return [];
  return readdirSync(pastaWorkspaces, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .filter((id) => existsSync(join(pastaWorkspaces, id, NOME_ARQUIVO_CRM)))
    .sort();
}

// Reserva um id. Ids nascem de tempo mais aleatorio, entao colisao entre
// workspaces e improvavel, mas ela nao pode passar em silencio: o segundo ganha
// sufixo do workspace de origem, que e determinstico e rastreavel.
function idLivre(id: string, usados: Set<string>, workspaceId: string): string {
  if (!usados.has(id)) {
    usados.add(id);
    return id;
  }
  let novo = `${id}--${workspaceId}`;
  let n = 2;
  while (usados.has(novo)) {
    novo = `${id}--${workspaceId}-${n}`;
    n += 1;
  }
  usados.add(novo);
  return novo;
}

// Le e normaliza o crm.json de um workspace. Arquivo ilegivel ou de versao
// desconhecida devolve null: ele fica onde esta, sem rename, e a fusao segue
// com os outros. Quem chamou anota o caso pro usuario.
function lerOrigem(pasta: string, workspaceId: string) {
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(join(pasta, NOME_ARQUIVO_CRM), "utf8"));
  } catch {
    return null;
  }
  return normalizarEstadoCrm(bruto, workspaceId);
}

// Anota suspeita de contato repetido, sem fundir nada.
//
// O mesmo cliente pode existir em dois workspaces com o mesmo telefone ou a
// mesma chaveExterna. Fundir automaticamente destroi dado e nao tem volta: some
// nome, tag, negocio e interacao de um dos lados, e o usuario nem fica sabendo.
// Manter os dois custa uma linha repetida no quadro, que ele resolve em dois
// cliques. Por isso os dois contatos continuam vivos e cada suspeita vira uma
// linha aqui, pra ele decidir depois.
function anotarSuspeitas(contatos: readonly Contato[], em: string): SuspeitaDuplicata[] {
  const suspeitas: SuspeitaDuplicata[] = [];
  const chaves = [
    ["telefone", (c: Contato) => c.telefoneNormalizado],
    ["chaveExterna", (c: Contato) => c.chaveExterna],
  ] as const;
  for (const [oQueBateu, valorDe] of chaves) {
    const grupos = new Map<string, Contato[]>();
    for (const contato of contatos) {
      const valor = valorDe(contato);
      if (!valor) continue;
      const grupo = grupos.get(valor);
      if (grupo) grupo.push(contato);
      else grupos.set(valor, [contato]);
    }
    for (const [valor, grupo] of grupos) {
      if (grupo.length < 2) continue;
      const [primeiro, ...resto] = grupo;
      for (const outro of resto) {
        suspeitas.push({
          id: `${primeiro.id}+${outro.id}+${oQueBateu}`,
          em,
          oQueBateu,
          valor,
          contatoA: primeiro.id,
          nomeA: primeiro.nome,
          workspaceA: primeiro.workspaceOrigemId,
          contatoB: outro.id,
          nomeB: outro.nome,
          workspaceB: outro.workspaceOrigemId,
        });
      }
    }
  }
  return suspeitas;
}

// Renomeia os arquivos de origem de um workspace. Rename preserva os bytes e
// tira o arquivo do caminho da proxima fusao. Falha aqui nao derruba nada: o
// dado ja esta no CORE e a fusao nao repete, porque o guarda dela e a existencia
// do crm.json do CORE.
function marcarOrigemComoMigrada(pasta: string, sufixo: string): void {
  for (const nome of ARQUIVOS_DE_ORIGEM) {
    const origem = join(pasta, nome);
    if (!existsSync(origem)) continue;
    try {
      renameSync(origem, `${origem}.${sufixo}`);
    } catch (erro) {
      console.error(`[crm] nao deu pra renomear "${origem}" depois da fusao:`, erro);
    }
  }
}

// Funde todos os crm.json de app/dados/workspaces/*/ num estado so, grava tudo
// na pasta de destino e marca as origens. Devolve null quando nao ha nada pra
// fundir: ai quem chamou semeia o estado inicial.
export function fundirCrmsDosWorkspaces(
  pastaWorkspaces: string,
  pastaDestino: string,
): ResultadoFusao | null {
  const ids = workspacesComCrm(pastaWorkspaces);
  if (ids.length === 0) return null;

  const agora = new Date().toISOString();
  const colunas: Coluna[] = [];
  const organizacoes: Organizacao[] = [];
  const contatos: Contato[] = [];
  const negocios: Negocio[] = [];
  const orcamentos: Orcamento[] = [];
  const tarefas: Tarefa[] = [];
  const interacoes: Interacao[] = [];
  const estagios: RegistroEstagio[] = [];
  const recuperados: string[] = [];

  // Coluna funde por nome normalizado: a primeira ocorrencia vence e mantem o
  // id. As outras viram apelido dela neste mapa, e todo contato que apontava pro
  // id perdedor e remapeado pro vencedor. Sem isso o funil inteiro perde o
  // sentido, porque o contato cai numa coluna que nao existe.
  const colunaPorNome = new Map<string, string>();
  const idsColuna = new Set<string>();
  const idsOrganizacao = new Set<string>();
  const idsContato = new Set<string>();
  const idsNegocio = new Set<string>();
  const idsOrcamento = new Set<string>();
  const idsTarefa = new Set<string>();
  const idsInteracao = new Set<string>();
  const idsEstagio = new Set<string>();
  const fundidos: string[] = [];

  for (const workspaceId of ids) {
    const pasta = join(pastaWorkspaces, workspaceId);
    const resultado = lerOrigem(pasta, workspaceId);
    if (!resultado) {
      recuperados.push(
        `O crm.json do workspace "${workspaceId}" nao pode ser lido e ficou de fora da fusao. O arquivo continua na pasta dele.`,
      );
      continue;
    }
    const origem = resultado.estado;
    fundidos.push(workspaceId);

    const apelidoColuna = new Map<string, string>();
    for (const coluna of ordenarColunas(origem.colunas)) {
      const chave = chaveColuna(coluna.nome);
      const vencedora = colunaPorNome.get(chave);
      if (vencedora) {
        apelidoColuna.set(coluna.id, vencedora);
        continue;
      }
      const id = idLivre(coluna.id, idsColuna, workspaceId);
      colunas.push({ ...coluna, id });
      colunaPorNome.set(chave, id);
      apelidoColuna.set(coluna.id, id);
    }
    const colunaPadrao = colunas[0].id;
    const paraColuna = (id: string): string => apelidoColuna.get(id) ?? colunaPadrao;

    // Organizacao NAO funde por nome, pelo mesmo motivo do contato: duas
    // empresas de nome parecido em clientes diferentes podem ser duas empresas.
    const paraOrganizacao = new Map<string, string>();
    for (const organizacao of origem.organizacoes) {
      const id = idLivre(organizacao.id, idsOrganizacao, workspaceId);
      paraOrganizacao.set(organizacao.id, id);
      organizacoes.push({ ...organizacao, id });
    }

    const paraContato = new Map<string, string>();
    for (const contato of origem.contatos) {
      const id = idLivre(contato.id, idsContato, workspaceId);
      paraContato.set(contato.id, id);
      const novo: Contato = {
        ...contato,
        id,
        colunaId: paraColuna(contato.colunaId),
        // Procedencia preservada. A tela usa isto pra mostrar de onde o contato
        // veio, entao ela nunca pode nascer vazia na fusao.
        workspaceOrigemId: contato.workspaceOrigemId || workspaceId,
      };
      if (novo.organizacaoId) {
        const organizacaoId = paraOrganizacao.get(novo.organizacaoId);
        if (organizacaoId) novo.organizacaoId = organizacaoId;
        else delete novo.organizacaoId;
      }
      contatos.push(novo);
    }

    const paraNegocio = new Map<string, string>();
    for (const negocio of origem.negocios) {
      const id = idLivre(negocio.id, idsNegocio, workspaceId);
      paraNegocio.set(negocio.id, id);
      const novo: Negocio = {
        ...negocio,
        id,
        contatoId: paraContato.get(negocio.contatoId) ?? negocio.contatoId,
      };
      if (novo.participantes) {
        novo.participantes = novo.participantes.map((participante) => ({
          ...participante,
          contatoId: paraContato.get(participante.contatoId) ?? participante.contatoId,
        }));
      }
      negocios.push(novo);
    }

    for (const orcamento of origem.orcamentos) {
      orcamentos.push({
        ...orcamento,
        id: idLivre(orcamento.id, idsOrcamento, workspaceId),
        negocioId: paraNegocio.get(orcamento.negocioId) ?? orcamento.negocioId,
      });
    }

    for (const tarefa of origem.tarefas) {
      const nova: Tarefa = { ...tarefa, id: idLivre(tarefa.id, idsTarefa, workspaceId) };
      if (nova.contatoId) nova.contatoId = paraContato.get(nova.contatoId) ?? nova.contatoId;
      if (nova.negocioId) nova.negocioId = paraNegocio.get(nova.negocioId) ?? nova.negocioId;
      tarefas.push(nova);
    }

    // Historico: o que ja estava no jsonl do workspace mais o que a normalizacao
    // acabou de tirar de dentro dos contatos (arquivo de versao antiga).
    //
    // Linha que aponta pra contato que nao existe mais fica com o id original de
    // proposito: excluir contato nunca apagou historico, e quem passou pelo
    // funil tem valor proprio.
    for (const interacao of [...lerInteracoesDaPasta(pasta), ...resultado.interacoesExtraidas]) {
      interacoes.push({
        ...interacao,
        id: idLivre(interacao.id, idsInteracao, workspaceId),
        contatoId: paraContato.get(interacao.contatoId) ?? interacao.contatoId,
      });
    }
    for (const estagio of [...lerEstagiosDaPasta(pasta), ...resultado.estagiosExtraidos]) {
      estagios.push({
        ...estagio,
        id: idLivre(estagio.id, idsEstagio, workspaceId),
        contatoId: paraContato.get(estagio.contatoId) ?? estagio.contatoId,
        // A coluna e a mesma, so mudou de id na fusao. O colunaNome da linha
        // continua sendo o do momento da transicao, entao nada do passado muda.
        colunaId: apelidoColuna.get(estagio.colunaId) ?? estagio.colunaId,
      });
    }

    for (const mensagem of resultado.recuperados) {
      recuperados.push(`Workspace "${workspaceId}": ${mensagem}`);
    }
  }

  if (fundidos.length === 0 && recuperados.length === 0) return null;

  // A ordem das colunas e recalculada em sequencia no fim: cada workspace trouxe
  // a sua numeracao e elas nao valem mais depois da fusao.
  colunas.forEach((coluna, ordem) => {
    coluna.ordem = ordem;
  });

  const estado: EstadoCrm = {
    versao: 4,
    colunas,
    organizacoes,
    contatos,
    negocios,
    orcamentos,
    tarefas,
  };

  const suspeitas = anotarSuspeitas(contatos, agora);

  // Historico e rastro primeiro, crm.json depois. A ordem inversa perderia o
  // historico de vez numa queda no meio.
  anexarInteracoesSemRepetir(pastaDestino, interacoes);
  anexarEstagiosSemRepetir(pastaDestino, estagios);
  anexarJsonlSemRepetir(
    join(pastaDestino, NOME_DUPLICATAS),
    suspeitas,
    (item) => item.id,
    (valor) => typeof (valor as SuspeitaDuplicata)?.id === "string",
  );
  if (recuperados.length > 0) {
    anexarJsonl(
      join(pastaDestino, NOME_RECUPERACOES),
      recuperados.map((mensagem) => ({ em: agora, mensagem })),
    );
  }
  gravarJsonAtomico(join(pastaDestino, NOME_ARQUIVO_CRM), estado);

  const sufixo = `migrado-para-core-${carimbo()}`;
  for (const workspaceId of fundidos) {
    marcarOrigemComoMigrada(join(pastaWorkspaces, workspaceId), sufixo);
  }

  return { estado, workspaces: fundidos, suspeitas: suspeitas.length };
}
