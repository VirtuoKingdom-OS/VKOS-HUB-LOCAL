export interface ManifestoFeature {
  id: string;
  nome: string;
  descricao: string;
  telas: string[];
  rotasApi: string[];
  eventosEmitidos: string[];
  eventosConsumidos: string[];
  dependeDe: string[];
  usaIa: boolean;
  disponivelParaCliente: boolean;
}

export const CATALOGO_FEATURES: readonly ManifestoFeature[] = [
  { id: "cockpit", nome: "Cockpit", descricao: "Canvas, sessoes, Cerebro e fontes de dados do workspace.", telas: ["cockpit", "cerebro", "arquivos", "fonte"], rotasApi: ["/api/canvas", "/api/sessoes", "/api/custos", "/api/vkos/cerebro", "/api/vkos/skills", "/api/contextos", "/api/anexos"], eventosEmitidos: ["sessao:concluida", "cerebro:atualizado", "fonte:atualizada"], eventosConsumidos: ["peca:criada"], dependeDe: [], usaIa: true, disponivelParaCliente: true },
  { id: "criador-visual", nome: "Criador visual", descricao: "Carrosseis, stories e Studio.", telas: ["criar:carrossel", "criar:post", "criar:story", "arquivos", "studio"], rotasApi: ["/api/vkos/pecas", "/api/vkos/modelos-carrossel"], eventosEmitidos: ["peca:criada"], eventosConsumidos: ["cerebro:atualizado"], dependeDe: ["cockpit"], usaIa: true, disponivelParaCliente: true },
  { id: "site-guiado", nome: "Site guiado", descricao: "Criacao, Studio e publicacao de sites.", telas: ["criar:site", "fluxo:site", "site"], rotasApi: ["/api/publicacao"], eventosEmitidos: ["peca:criada"], eventosConsumidos: ["cerebro:atualizado"], dependeDe: ["cockpit"], usaIa: true, disponivelParaCliente: true },
  { id: "crm", nome: "CRM", descricao: "Contatos, negocios, funil e interacoes.", telas: ["crm"], rotasApi: ["/api/crm"], eventosEmitidos: ["crm:negocio-atualizado"], eventosConsumidos: [], dependeDe: [], usaIa: false, disponivelParaCliente: true },
  { id: "leads", nome: "Buscar leads", descricao: "Mineracao persistente de leads pela Apify.", telas: ["crm"], rotasApi: ["/api/leads"], eventosEmitidos: ["lead:importado"], eventosConsumidos: [], dependeDe: ["crm"], usaIa: false, disponivelParaCliente: true },
  { id: "calendario", nome: "Calendario", descricao: "Agenda local e sincronizacao opcional.", telas: ["calendario"], rotasApi: ["/api/calendario"], eventosEmitidos: ["calendario:evento-criado"], eventosConsumidos: ["crm:negocio-atualizado"], dependeDe: [], usaIa: false, disponivelParaCliente: true },
  { id: "meta", nome: "Meta", descricao: "Desempenho de Instagram, anuncios e Facebook.", telas: ["meta"], rotasApi: ["/api/meta"], eventosEmitidos: [], eventosConsumidos: [], dependeDe: [], usaIa: false, disponivelParaCliente: true },
  { id: "automacoes", nome: "Automacoes", descricao: "Regras deterministicas sobre o barramento.", telas: ["automacoes"], rotasApi: ["/api/automacoes"], eventosEmitidos: [], eventosConsumidos: ["crm:negocio-atualizado", "peca:criada"], dependeDe: [], usaIa: false, disponivelParaCliente: false },
  { id: "conexoes", nome: "Conexoes", descricao: "Integracoes externas escopadas por workspace.", telas: ["conexoes"], rotasApi: ["/api/conexoes"], eventosEmitidos: ["conexao:alterada"], eventosConsumidos: [], dependeDe: [], usaIa: false, disponivelParaCliente: false },
  { id: "ide", nome: "VKOS-IDE", descricao: "Camada universal de arquivos e conversa.", telas: ["ide"], rotasApi: ["/api/ide"], eventosEmitidos: [], eventosConsumidos: [], dependeDe: ["cockpit"], usaIa: true, disponivelParaCliente: true },
  { id: "admin", nome: "Administracao", descricao: "Modelos, clientes, consumo e auditoria.", telas: ["admin:modelos", "admin:clientes", "admin:auditoria"], rotasApi: ["/api/admin"], eventosEmitidos: ["workspace:features-atualizadas"], eventosConsumidos: [], dependeDe: [], usaIa: false, disponivelParaCliente: false },
] as const;

const POR_ID = new Map(CATALOGO_FEATURES.map((feature) => [feature.id, feature]));

export function featurePorId(id: string): ManifestoFeature | null {
  return POR_ID.get(id) ?? null;
}

export function validarDependencias(ids: Iterable<string>): string[] {
  const ativas = new Set(ids);
  const erros: string[] = [];
  for (const id of ativas) {
    const feature = POR_ID.get(id);
    if (!feature) {
      erros.push(`Feature desconhecida: ${id}.`);
      continue;
    }
    for (const dependencia of feature.dependeDe) {
      if (!ativas.has(dependencia)) {
        erros.push(`${feature.nome} depende de ${POR_ID.get(dependencia)?.nome ?? dependencia}.`);
      }
    }
  }
  return erros;
}

export interface FeatureConfigurada {
  id: string;
  config?: object;
}

const IDS_LEGADOS_NUCLEO = new Set(["cockpit", "cerebro", "fontes"]);

export function normalizarFeaturesLegadas(valor: unknown): FeatureConfigurada[] {
  if (!Array.isArray(valor)) return [];
  const normalizadas = new Map<string, FeatureConfigurada>();
  for (const item of valor) {
    const idBruto = typeof item === "string"
      ? item
      : item && typeof item === "object" && !Array.isArray(item)
        ? (item as { id?: unknown }).id
        : null;
    if (typeof idBruto !== "string") continue;
    const id = IDS_LEGADOS_NUCLEO.has(idBruto) ? "cockpit" : idBruto;
    if (!POR_ID.has(id)) continue;
    const config = item && typeof item === "object" && !Array.isArray(item)
      && (item as { config?: unknown }).config
      && typeof (item as { config?: unknown }).config === "object"
      && !Array.isArray((item as { config?: unknown }).config)
      ? (item as { config: object }).config
      : undefined;
    const anterior = normalizadas.get(id);
    normalizadas.set(id, {
      id,
      ...(anterior?.config || config
        ? { config: { ...(anterior?.config ?? {}), ...(config ?? {}) } }
        : {}),
    });
  }
  return [...normalizadas.values()];
}
