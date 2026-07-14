import { usarEstado } from "./estado/contexto";
import { usarImersao } from "./util/imersao";
import { ServidorForaDoAr, Splash } from "./componentes/comum/Telas";
import { Onboarding } from "./componentes/onboarding/Onboarding";
import { Shell } from "./componentes/layout/Shell";

export function App() {
  usarImersao();
  const {
    carregandoInicial,
    servidorOnline,
    cockpitLiberado,
    recarregarInicial,
  } = usarEstado();

  if (!servidorOnline) {
    return <ServidorForaDoAr aoTentar={() => void recarregarInicial()} />;
  }

  if (carregandoInicial) {
    return <Splash />;
  }

  if (!cockpitLiberado) {
    return <Onboarding />;
  }

  return <Shell />;
}
