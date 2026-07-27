// Fusao das conexoes por workspace num estado unico, no nivel CORE.
//
// Ate aqui cada cliente tinha o seu app/dados/workspaces/<id>/conexoes.json.
// Isso descrevia errado o que a conexao e: a conta da Apify e do DONO do Hub,
// nao do cliente atendido. Agora o estado mora em app/dados/conexoes.json e
// este modulo sobe o que ficou pra tras.
//
// Mesmo desenho da fusao do CRM (crm/fusao.ts), porque o problema e o mesmo:
//
// - Roda uma vez so: a fusao so e tentada quando o conexoes.json do CORE ainda
//   nao existe.
// - Ordem determinstica (ids ordenados), senao o resultado muda a cada execucao
//   e nao da pra testar.
// - Grava o destino ANTES de renomear a origem. Uma queda no meio repete a
//   fusao sem duplicar nada.
// - A origem nunca e apagada: vira "<nome>.migrado-para-core-<carimbo>", por
//   rename, com os bytes intactos.
//
// UMA DIFERENCA IMPORTANTE PRO CRM: aqui mora segredo (o token da Apify). Por
// isso nenhum VALOR de config entra no rastro de conflito. O rastro diz qual
// servidor bateu, qual chave divergiu e em que arquivo o valor perdedor
// continua em disco. Quem precisar do outro token abre o arquivo preservado.

import { existsSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

import { anexarJsonlSemRepetir } from "../util/jsonl.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import {
  lerConexoesDeArquivo,
  type EstadoConexoes,
  type EstadoServidor,
} from "./arquivo.js";

export const NOME_ARQUIVO_CONEXOES = "conexoes.json";
// Servidor que existia em mais de um cliente com config diferente. So anotacao:
// nada e escolhido em silencio (ver anotarConflitos).
export const NOME_CONFLITOS = "conflitos-da-fusao.jsonl";

export interface ResultadoFusaoConexoes {
  estado: EstadoConexoes;
  // Ids dos workspaces que entraram na fusao, na ordem em que foram lidos.
  workspaces: string[];
  // Quantos conflitos de config foram anotados pro dono decidir.
  conflitos: number;
}

// Linha do conflitos-da-fusao.jsonl. NUNCA carrega valor de config, segredo ou
// nao: o arquivo de rastro fica ao lado do estado e nao pode virar uma segunda
// copia do token. Id determinstico: repetir a fusao depois de uma queda nao
// duplica a linha.
interface ConflitoConexao {
  id: string;
  em: string;
  servidor: string;
  // Quem venceu: o primeiro cliente em ordem de id que tinha esse servidor.
  workspaceVencedor: string;
  workspacePerdedor: string;
  // Nome das chaves de config que divergiram. Sem os valores.
  chavesDivergentes: string[];
  // true quando o "habilitado" tambem divergiu.
  habilitadoDivergente: boolean;
  // Onde o valor perdedor continua em disco, inteiro. E daqui que se recupera
  // o outro token, nao desta linha.
  arquivoPreservado: string;
}

// Carimbo AAAA-MM-DDTHH-mm-ss. O ":" do ISO nao vale em nome de arquivo no
// Windows, entao vira "-". Mesma forma da quarentena e da fusao do CRM.
function carimbo(): string {
  return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

// Ids de workspace que tem conexoes.json, em ordem estavel.
export function workspacesComConexoes(pastaWorkspaces: string): string[] {
  if (!existsSync(pastaWorkspaces)) return [];
  return readdirSync(pastaWorkspaces, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .filter((id) => existsSync(join(pastaWorkspaces, id, NOME_ARQUIVO_CONEXOES)))
    .sort();
}

// Chaves de config que divergem entre dois servidores. Compara os valores, mas
// devolve so os nomes.
function chavesDivergentes(a: EstadoServidor, b: EstadoServidor): string[] {
  const chaves = new Set([...Object.keys(a.config), ...Object.keys(b.config)]);
  const saida: string[] = [];
  for (const chave of [...chaves].sort()) {
    if ((a.config[chave] ?? "") !== (b.config[chave] ?? "")) saida.push(chave);
  }
  return saida;
}

// Renomeia o conexoes.json de origem. Rename preserva os bytes e tira o arquivo
// do caminho da proxima fusao.
//
// O TOKEN CONTINUA DENTRO, de proposito. Reescrever o arquivo pra apagar o
// segredo destruiria justamente o original que a regra "nunca apagar" protege,
// e o token nao se reconstitui de lugar nenhum se a gravacao no CORE tiver
// saido errada. O rename tambem nao espalha nada: o segredo fica exatamente
// onde ja estava, na pasta de dados daquele cliente, que continua sendo apagada
// por inteiro quando o cliente e removido do registro.
function marcarOrigemComoMigrada(pasta: string, sufixo: string): string | null {
  const origem = join(pasta, NOME_ARQUIVO_CONEXOES);
  if (!existsSync(origem)) return null;
  const destino = `${origem}.${sufixo}`;
  try {
    renameSync(origem, destino);
    return destino;
  } catch (erro) {
    console.error(`[conexoes] nao deu pra renomear "${origem}" depois da fusao:`, erro);
    return null;
  }
}

// Funde todos os conexoes.json de app/dados/workspaces/*/ num estado so, grava
// na pasta de destino e marca as origens. Devolve null quando nao ha nada pra
// fundir: ai quem chamou comeca com o estado vazio.
export function fundirConexoesDosWorkspaces(
  pastaWorkspaces: string,
  pastaDestino: string,
): ResultadoFusaoConexoes | null {
  const ids = workspacesComConexoes(pastaWorkspaces);
  if (ids.length === 0) return null;

  const agora = new Date().toISOString();
  const sufixo = `migrado-para-core-${carimbo()}`;
  const servidores: Record<string, EstadoServidor> = {};
  // Qual cliente colocou cada servidor no estado final. O primeiro vence.
  const donoDo = new Map<string, string>();
  const conflitos: ConflitoConexao[] = [];
  const lidos: string[] = [];

  for (const workspaceId of ids) {
    const pasta = join(pastaWorkspaces, workspaceId);
    let estado: EstadoConexoes;
    try {
      estado = lerConexoesDeArquivo(join(pasta, NOME_ARQUIVO_CONEXOES));
    } catch (erro) {
      // Arquivo ilegivel ja foi pra quarentena por lerConexoesDeArquivo. Ele
      // fica onde esta, sem rename, e a fusao segue com os outros.
      console.error(
        `[conexoes] o conexoes.json do workspace "${workspaceId}" ficou de fora da fusao:`,
        erro,
      );
      continue;
    }
    lidos.push(workspaceId);

    for (const [servidorId, servidor] of Object.entries(estado.servidores)) {
      const vencedor = servidores[servidorId];
      if (!vencedor) {
        servidores[servidorId] = { habilitado: servidor.habilitado, config: { ...servidor.config } };
        donoDo.set(servidorId, workspaceId);
        continue;
      }
      // Ja existe. NAO escolhe sozinho em silencio: o primeiro fica, e a outra
      // informacao continua viva no arquivo preservado da origem, com a linha
      // de rastro apontando pra ele.
      const divergentes = chavesDivergentes(vencedor, servidor);
      const habilitadoDivergente = vencedor.habilitado !== servidor.habilitado;
      if (divergentes.length === 0 && !habilitadoDivergente) continue;
      conflitos.push({
        id: `${servidorId}+${donoDo.get(servidorId) ?? ""}+${workspaceId}`,
        em: agora,
        servidor: servidorId,
        workspaceVencedor: donoDo.get(servidorId) ?? "",
        workspacePerdedor: workspaceId,
        chavesDivergentes: divergentes,
        habilitadoDivergente,
        arquivoPreservado: `${join(pasta, NOME_ARQUIVO_CONEXOES)}.${sufixo}`,
      });
    }
  }

  if (lidos.length === 0) return null;

  const estadoFinal: EstadoConexoes = { servidores };

  // Rastro primeiro, conexoes.json depois. A ordem inversa perderia o rastro de
  // vez numa queda no meio, e o guarda da fusao e a existencia do destino.
  anexarJsonlSemRepetir(
    join(pastaDestino, NOME_CONFLITOS),
    conflitos,
    (item) => item.id,
    (valor) => typeof (valor as ConflitoConexao)?.id === "string",
  );
  gravarJsonAtomico(join(pastaDestino, NOME_ARQUIVO_CONEXOES), estadoFinal);

  for (const workspaceId of lidos) {
    marcarOrigemComoMigrada(join(pastaWorkspaces, workspaceId), sufixo);
  }

  return { estado: estadoFinal, workspaces: lidos, conflitos: conflitos.length };
}
