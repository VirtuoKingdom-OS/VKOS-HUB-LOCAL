import { useCallback, useEffect, useMemo, useState } from "react";
import {
  obterConfig,
  obterProvedores,
  type ConfigApp,
  type OpcaoModeloIA,
  type RespostaProvedores,
} from "../api/cliente";
import type { ProvedorIA } from "../tipos/dominio";

interface EstadoProvedores {
  resposta: RespostaProvedores | null;
  config: ConfigApp | null;
  carregando: boolean;
  erro: string | null;
}

let cache: EstadoProvedores = {
  resposta: null,
  config: null,
  carregando: false,
  erro: null,
};
let carga: Promise<void> | null = null;
const ouvintes = new Set<(estado: EstadoProvedores) => void>();

function publicar(parcial: Partial<EstadoProvedores>) {
  cache = { ...cache, ...parcial };
  for (const ouvinte of ouvintes) ouvinte(cache);
}

export async function recarregarProvedoresIA(): Promise<void> {
  if (carga) return carga;
  publicar({ carregando: true, erro: null });
  carga = Promise.all([obterProvedores(), obterConfig()])
    .then(([resposta, config]) => {
      publicar({ resposta, config, carregando: false });
    })
    .catch((erro: unknown) => {
      publicar({
        carregando: false,
        erro: erro instanceof Error ? erro.message : "Não foi possível carregar os modelos.",
      });
    })
    .finally(() => {
      carga = null;
    });
  return carga;
}

function modeloConfigurado(config: ConfigApp | null, provedor: ProvedorIA): string {
  if (!config) return "";
  if (provedor === "codex") return config.modeloPadraoCodex ?? "";
  return config.modeloPadraoClaude ?? config.modeloPadrao ?? "";
}

export function usarProvedoresIA() {
  const [estado, setEstado] = useState(cache);

  useEffect(() => {
    ouvintes.add(setEstado);
    if (!cache.resposta && !cache.carregando) void recarregarProvedoresIA();
    return () => {
      ouvintes.delete(setEstado);
    };
  }, []);

  const ativo = estado.resposta?.ativo ?? estado.config?.provedorPadrao ?? "claude";
  const provedorAtivo = useMemo(
    () => estado.resposta?.provedores.find((provedor) => provedor.id === ativo),
    [estado.resposta, ativo]
  );
  const modelos: OpcaoModeloIA[] = provedorAtivo?.modelos ?? [];
  const configurado = modeloConfigurado(estado.config, ativo);
  const modeloPadrao = modelos.some((modelo) => modelo.alias === configurado)
    ? configurado
    : modelos[0]?.alias ?? configurado;

  return {
    ativo,
    provedores: estado.resposta?.provedores ?? [],
    modelos,
    modeloPadrao,
    carregando: estado.carregando,
    erro: estado.erro,
    recarregar: useCallback(() => recarregarProvedoresIA(), []),
  };
}
