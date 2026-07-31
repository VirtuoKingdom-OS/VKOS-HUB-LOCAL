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
import { CAMINHO_SETUP, EVENTO_ROTA, rotaAtual } from "./componentes/layout/rotas";

// O setup esta aberto? Ele e a unica coisa que substitui o Hub inteiro, entao
// a decisao e por caminho, nao por tela.
function ehCaminhoDoSetup(rota: string): boolean {
  return rota === CAMINHO_SETUP || rota.startsWith(`${CAMINHO_SETUP}/`);
}

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
  const [rota, setRota] = useState(rotaAtual);

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
    const aoMudarRota = () => setRota(rotaAtual());
    window.addEventListener("popstate", aoMudarRota);
    window.addEventListener(EVENTO_ROTA, aoMudarRota);
    return () => {
      window.removeEventListener("popstate", aoMudarRota);
      window.removeEventListener(EVENTO_ROTA, aoMudarRota);
    };
  }, []);

  useEffect(() => {
    if (servidorOnline && !carregandoInicial) void carregarConfig();
  }, [servidorOnline, carregandoInicial, carregarConfig]);

  useEffect(() => {
    if (
      configCarregada &&
      config &&
      !config.provedorPadrao &&
      !ehCaminhoDoSetup(rota)
    ) {
      history.replaceState(null, "", CAMINHO_SETUP);
      setRota(CAMINHO_SETUP);
    }
  }, [configCarregada, config, rota]);

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
  const setupAberto = ehCaminhoDoSetup(rota);

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
          const destino = primeiraExecucao ? "/dashboard" : "/conexoes";
          history.replaceState(null, "", destino);
          setRota(destino);
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
