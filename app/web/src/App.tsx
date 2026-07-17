import { useCallback, useEffect, useState } from "react";
import { usarEstado } from "./estado/contexto";
import { usarImersao } from "./util/imersao";
import { ServidorForaDoAr, Splash } from "./componentes/comum/Telas";
import { Onboarding } from "./componentes/onboarding/Onboarding";
import { Shell } from "./componentes/layout/Shell";
import { TelaSetup } from "./componentes/setup/TelaSetup";
import {
  atualizarConfig,
  obterConfig,
  type ConfigApp,
} from "./api/cliente";
import type { ProvedorIA } from "./tipos/dominio";

export function App() {
  usarImersao();
  const {
    carregandoInicial,
    servidorOnline,
    cockpitLiberado,
    recarregarInicial,
  } = usarEstado();
  const [config, setConfig] = useState<ConfigApp | null>(null);
  const [configCarregada, setConfigCarregada] = useState(false);
  const [hash, setHash] = useState(window.location.hash);

  const carregarConfig = useCallback(async () => {
    setConfigCarregada(false);
    try {
      setConfig(await obterConfig());
    } catch {
      setConfig(null);
    } finally {
      setConfigCarregada(true);
    }
  }, []);

  useEffect(() => {
    const aoMudarHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", aoMudarHash);
    return () => window.removeEventListener("hashchange", aoMudarHash);
  }, []);

  useEffect(() => {
    if (servidorOnline && !carregandoInicial) void carregarConfig();
  }, [servidorOnline, carregandoInicial, carregarConfig]);

  useEffect(() => {
    if (
      configCarregada &&
      config &&
      !config.provedorPadrao &&
      !/^#\/setup(?:$|\/)/.test(hash)
    ) {
      history.replaceState(null, "", "#/setup");
      setHash("#/setup");
    }
  }, [configCarregada, config, hash]);

  if (!servidorOnline) {
    return <ServidorForaDoAr aoTentar={() => void recarregarInicial()} />;
  }

  if (carregandoInicial) {
    return <Splash />;
  }

  if (!configCarregada) {
    return <Splash />;
  }
  if (!config) {
    return <ServidorForaDoAr aoTentar={() => void carregarConfig()} />;
  }

  const primeiraExecucao = !config.provedorPadrao;
  const setupAberto = /^#\/setup(?:$|\/)/.test(hash);

  if (primeiraExecucao || setupAberto) {
    return (
      <TelaSetup
        primeiraExecucao={primeiraExecucao}
        provedorAtual={config.provedorPadrao}
        aoConcluir={async (provedor: ProvedorIA) => {
          // O motor so vira padrao neste gesto final. Nenhuma etapa anterior
          // grava escolha parcial na config.
          const atualizada = await atualizarConfig({ provedorPadrao: provedor });
          setConfig(atualizada);
          const destino = primeiraExecucao ? "#/dashboard" : "#/conexoes";
          history.replaceState(null, "", destino);
          setHash(destino);
          await recarregarInicial();
        }}
      />
    );
  }

  if (!cockpitLiberado) {
    return <Onboarding />;
  }

  return <Shell />;
}
