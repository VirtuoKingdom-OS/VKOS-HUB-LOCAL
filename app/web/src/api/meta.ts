export interface UltimaColetaMeta {
  quando: string;
  ok: boolean;
  erro: string | null;
}

export interface VinculoMeta {
  instagramId?: string;
  contaAnunciosId?: string;
  paginaId?: string;
  vinculadoEm?: string;
  ultimaColeta?: UltimaColetaMeta;
}

export interface EstadoMeta {
  vinculo: VinculoMeta;
  produtos: { instagram: boolean; anuncios: boolean; facebook: boolean };
}

export interface AtivoMeta {
  id: string;
  nome: string;
  usuario?: string;
}

export interface AtivosMeta {
  instagram: AtivoMeta[];
  anuncios: AtivoMeta[];
  paginas: AtivoMeta[];
}

export interface EstadoCredencialMeta {
  configurada: boolean;
  config: {
    appId: string;
    appSecret: string;
    businessId: string;
    tokenSistema: string;
  };
  ultimoTeste: {
    quando: string;
    ok: boolean;
    diagnosticos: Array<{ item: string; ok: boolean; mensagem: string }>;
  } | null;
}

async function pedir<T>(url: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: opcoes?.body
      ? { "Content-Type": "application/json", ...(opcoes.headers ?? {}) }
      : opcoes?.headers,
  });
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({})) as { erro?: string };
    throw new Error(corpo.erro ?? `Erro ${resposta.status}`);
  }
  return resposta.json() as Promise<T>;
}

export const obterEstadoMeta = () => pedir<EstadoMeta>("/api/meta/estado");
export const obterInstagramMeta = () => pedir<{
  serie: Array<Record<string, unknown>>;
  publicacoes: Array<Record<string, unknown>>;
}>("/api/meta/instagram");
export const obterAnunciosMeta = () => pedir<{
  serie: Array<Record<string, unknown>>;
}>("/api/meta/anuncios");
export const obterFacebookMeta = () => pedir<{
  serie: Array<Record<string, unknown>>;
  publicacoes: Array<Record<string, unknown>>;
}>("/api/meta/facebook");
export const obterCredencialMeta = () =>
  pedir<EstadoCredencialMeta>("/api/admin/meta/credencial");
export const testarCredencialMeta = () =>
  pedir<EstadoCredencialMeta["ultimoTeste"]>("/api/admin/meta/testar", { method: "POST" });
export const obterAtivosMeta = () =>
  pedir<AtivosMeta>("/api/admin/meta/ativos");
export const obterVinculoMeta = (workspaceId: string) =>
  pedir<{ vinculo: VinculoMeta }>(
    `/api/admin/meta/vinculo/${encodeURIComponent(workspaceId)}`,
  );
export const salvarVinculoMeta = (workspaceId: string, vinculo: VinculoMeta) =>
  pedir<{ vinculo: VinculoMeta }>(
    `/api/admin/meta/vinculo/${encodeURIComponent(workspaceId)}`,
    { method: "PUT", body: JSON.stringify(vinculo) },
  );
export const coletarMetaAgora = (workspaceId: string) =>
  pedir<{ ok: true; vinculo: VinculoMeta }>(
    `/api/admin/meta/coletar/${encodeURIComponent(workspaceId)}`,
    { method: "POST" },
  );
