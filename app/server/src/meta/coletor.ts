import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { bancoDisponivel, exigirBanco } from "../plataforma/banco.js";
import { MODO, PRODUCAO } from "../plataforma/modo.js";
import { gravarJsonAtomico } from "../util/gravarJson.js";
import { listarIdsWorkspaces } from "../workspaces/estado.js";
import { lerCredencialMeta } from "./credencial.js";
import {
  coletarAnunciosGraph,
  coletarFacebookGraph,
  coletarInstagramGraph,
} from "./graph.js";
import {
  caminhoVinculoMeta,
  lerJsonlMeta,
  lerVinculoMeta,
  pastaMeta,
  salvarVinculoMeta,
  temProdutoMeta,
} from "./estado.js";

const RETENCAO = 400;
const INTERVALO_MANUAL = 15 * 60_000;
const pastaApp = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const caminhoMarcador = process.env.VKOS_META_MARCADOR?.trim()
  || join(pastaApp, "dados", "meta-coletor.json");
let fila = Promise.resolve<unknown>(undefined);
const ultimasManuais = new Map<string, number>();

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function gravarJsonl(
  workspaceId: string,
  nome: string,
  novas: Array<Record<string, unknown>>,
  serie?: string,
): void {
  const existentes = lerJsonlMeta<Record<string, unknown>>(workspaceId, nome);
  const unicas = new Map<string, Record<string, unknown>>();
  for (const linha of [...existentes, ...novas]) {
    const chave = serie
      ? `${String(linha[serie] ?? "")}:${String(linha.data ?? "")}`
      : String(linha.data ?? unicas.size);
    unicas.set(chave, linha);
  }
  let linhas = [...unicas.values()];
  if (serie) {
    const grupos = new Map<string, Array<Record<string, unknown>>>();
    for (const linha of linhas) {
      const chave = String(linha[serie] ?? "");
      const grupo = grupos.get(chave) ?? [];
      grupo.push(linha);
      grupos.set(chave, grupo);
    }
    linhas = [...grupos.values()].flatMap((grupo) => grupo.slice(-RETENCAO));
  } else {
    linhas = linhas.slice(-RETENCAO);
  }
  const caminho = join(pastaMeta(workspaceId), nome);
  mkdirSync(dirname(caminho), { recursive: true });
  const temporario = `${caminho}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporario, `${linhas.map((linha) => JSON.stringify(linha)).join("\n")}\n`, "utf8");
  renameSync(temporario, caminho);
}

function valorAcao(valor: unknown): number | null {
  if (!Array.isArray(valor)) return null;
  const item = valor.find((acao) =>
    acao && typeof acao === "object"
    && ["lead", "onsite_conversion.lead_grouped", "purchase"].includes(
      String((acao as Record<string, unknown>).action_type ?? ""),
    ));
  if (!item || typeof item !== "object") return null;
  const numero = Number((item as Record<string, unknown>).value);
  return Number.isFinite(numero) ? numero : null;
}

function numero(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export async function coletarWorkspaceMeta(workspaceId: string): Promise<void> {
  const vinculo = lerVinculoMeta(workspaceId);
  if (!temProdutoMeta(vinculo)) return;
  const { credencial } = await lerCredencialMeta();
  if (!credencial.tokenSistema) throw new Error("A credencial central da Meta nao foi configurada.");

  try {
    if (vinculo.instagramId) {
      const dados = await coletarInstagramGraph(vinculo.instagramId, credencial.tokenSistema);
      gravarJsonl(workspaceId, "instagram-perfil.jsonl", [{
        data: hoje(),
        ...dados.perfil,
      }]);
      gravarJsonAtomico(join(pastaMeta(workspaceId), "instagram-publicacoes.json"), dados.publicacoes);
    }
    if (vinculo.contaAnunciosId) {
      const dados = await coletarAnunciosGraph(vinculo.contaAnunciosId, credencial.tokenSistema);
      const linhas = dados.map((item) => ({
        data: String(item.date_start ?? hoje()),
        campanhaId: String(item.campaign_id ?? ""),
        campanha: String(item.campaign_name ?? "Campanha"),
        gasto: numero(item.spend),
        impressoes: numero(item.impressions),
        alcance: numero(item.reach),
        cliques: numero(item.clicks),
        cpc: numero(item.cpc),
        cpm: numero(item.cpm),
        resultados: valorAcao(item.actions),
        custoResultado: valorAcao(item.cost_per_action_type),
      }));
      gravarJsonl(workspaceId, "anuncios.jsonl", linhas, "campanhaId");
    }
    if (vinculo.paginaId) {
      const dados = await coletarFacebookGraph(vinculo.paginaId, credencial.tokenSistema);
      gravarJsonl(workspaceId, "facebook.jsonl", [{
        data: hoje(),
        ...dados.pagina,
      }]);
      gravarJsonAtomico(join(pastaMeta(workspaceId), "facebook-publicacoes.json"), dados.publicacoes);
    }
    salvarVinculoMeta(workspaceId, {
      ultimaColeta: { quando: new Date().toISOString(), ok: true, erro: null },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha desconhecida na coleta.";
    salvarVinculoMeta(workspaceId, {
      ultimaColeta: { quando: new Date().toISOString(), ok: false, erro: mensagem },
    });
    throw erro;
  }
}

async function idsWorkspaces(): Promise<string[]> {
  if (PRODUCAO && bancoDisponivel) {
    const resultado = await exigirBanco().query(
      "SELECT id::text FROM workspaces WHERE status = 'ativo' ORDER BY criado_em",
    );
    return resultado.rows.map((linha) => String(linha.id));
  }
  return listarIdsWorkspaces();
}

export function enfileirarColetaMeta(workspaceId: string): Promise<void> {
  const tarefa = fila.then(() => coletarWorkspaceMeta(workspaceId));
  fila = tarefa.catch(() => undefined);
  return tarefa;
}

export async function coletarTodosMeta(): Promise<void> {
  for (const id of await idsWorkspaces()) {
    if (!temProdutoMeta(lerVinculoMeta(id))) continue;
    await enfileirarColetaMeta(id).catch(() => undefined);
  }
}

export function coletarAgoraMeta(workspaceId: string): Promise<void> {
  const agora = Date.now();
  const ultima = ultimasManuais.get(workspaceId);
  if (ultima && agora - ultima < INTERVALO_MANUAL) {
    const erro = new Error("Aguarde 15 minutos entre atualizacoes manuais.");
    Object.assign(erro, { statusCode: 429 });
    throw erro;
  }
  ultimasManuais.set(workspaceId, agora);
  return enfileirarColetaMeta(workspaceId);
}

function marcadorDoDia(): boolean {
  try {
    if (!existsSync(caminhoMarcador)) return false;
    const valor = JSON.parse(readFileSync(caminhoMarcador, "utf8")) as { data?: string };
    return valor.data === hoje();
  } catch {
    return false;
  }
}

function proximaExecucao(): number {
  const agora = new Date();
  const proxima = new Date(agora);
  proxima.setHours(6, 0, 0, 0);
  if (proxima <= agora) proxima.setDate(proxima.getDate() + 1);
  return proxima.getTime() - agora.getTime();
}

export function iniciarColetorMeta(): void {
  if (MODO !== "core" || process.env.NODE_ENV === "test") return;
  const agendar = () => {
    const timer = setTimeout(async () => {
      if (!marcadorDoDia()) {
        await coletarTodosMeta();
        mkdirSync(dirname(caminhoMarcador), { recursive: true });
        gravarJsonAtomico(caminhoMarcador, {
          data: hoje(),
          quando: new Date().toISOString(),
        });
      }
      agendar();
    }, proximaExecucao());
    timer.unref();
  };
  agendar();
}

export function vinculoExisteNoDisco(workspaceId: string): boolean {
  return existsSync(caminhoVinculoMeta(workspaceId));
}
