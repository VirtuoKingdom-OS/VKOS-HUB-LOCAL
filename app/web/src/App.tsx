import { useCallback, useEffect, useState } from "react";
import { usarEstado } from "./estado/contexto";
import { usarImersao } from "./util/imersao";
import { ServidorForaDoAr, Splash } from "./componentes/comum/Telas";
import { Onboarding } from "./componentes/onboarding/Onboarding";
import { Shell } from "./componentes/layout/Shell";
import { ShellGestao } from "./componentes/gestao/ShellGestao";
import { TelaAcesso } from "./componentes/acesso/TelaAcesso";
import { LimiteErro } from "./componentes/comum/Sistema";
import {
  basePrefixoWorkspace,
  EVENTO_NAVEGACAO,
  idDoCaminhoWorkspace,
} from "./componentes/layout/rotas";
import {
  ErroApi,
  obterEstadoAutenticacao,
  obterSessaoWeb,
  type EstadoAutenticacao,
  type SessaoWeb,
} from "./api/cliente";

export function App() {
  return (
    <LimiteErro contexto="aplicativo">
      <ConteudoApp />
    </LimiteErro>
  );
}

function ConteudoApp() {
  usarImersao();
  const {
    carregandoInicial,
    servidorOnline,
    cockpitLiberado,
    recarregarInicial,
  } = usarEstado();
  const [estadoAuth, setEstadoAuth] = useState<EstadoAutenticacao | null>(null);
  const [sessaoWeb, setSessaoWeb] = useState<SessaoWeb | null>(null);
  const [authCarregada, setAuthCarregada] = useState(false);
  const [erroAuth, setErroAuth] = useState(false);

  const carregarAuth = useCallback(async () => {
    setAuthCarregada(false);
    setErroAuth(false);
    try {
      const estado = await obterEstadoAutenticacao();
      setEstadoAuth(estado);
      if (!estado.precisaBootstrap) {
        try {
          setSessaoWeb(await obterSessaoWeb());
        } catch (erro) {
          if (!(erro instanceof ErroApi) || erro.status !== 401 || estado.obrigatoria) throw erro;
          setSessaoWeb(null);
        }
      }
    } catch {
      setEstadoAuth(null);
      setErroAuth(true);
    } finally {
      setAuthCarregada(true);
    }
  }, []);

  useEffect(() => {
    void carregarAuth();
  }, [carregarAuth]);

  if (!authCarregada) return <Splash />;

  if (erroAuth || !estadoAuth) {
    return <ServidorForaDoAr aoTentar={() => void carregarAuth()} />;
  }

  if (estadoAuth.obrigatoria && !sessaoWeb) {
    return (
      <TelaAcesso
        estado={estadoAuth}
        aoEntrar={(sessao) => {
          setSessaoWeb(sessao);
          void recarregarInicial();
        }}
      />
    );
  }
  if (!servidorOnline) {
    return <ServidorForaDoAr aoTentar={() => void recarregarInicial()} />;
  }

  if (carregandoInicial) {
    return <Splash />;
  }

  if (!sessaoWeb) {
    return <ServidorForaDoAr aoTentar={() => void carregarAuth()} />;
  }

  // O onboarding de criação é conceito de workspace, não do CORE. O operador
  // vai direto pro painel de gestão; o empty state de workspace é tratado
  // dentro da própria experiência de workspace.
  if (!cockpitLiberado && sessaoWeb.usuario.papel !== "operador") {
    return <Onboarding />;
  }

  return <Raiz sessao={sessaoWeb} />;
}

// Decide o shell pela URL: cliente sempre na experiencia de workspace; operador
// no painel de gestao (CORE), ou na experiencia de workspace quando entra num
// workspace por /w/<id>. A troca acompanha a navegacao sem recarregar a pagina.
function Raiz({ sessao }: { sessao: SessaoWeb }) {
  const { workspaces } = usarEstado();
  const ehOperador = sessao.usuario.papel === "operador";
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const aoNavegar = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", aoNavegar);
    window.addEventListener(EVENTO_NAVEGACAO, aoNavegar);
    return () => {
      window.removeEventListener("popstate", aoNavegar);
      window.removeEventListener(EVENTO_NAVEGACAO, aoNavegar);
    };
  }, []);

  if (!ehOperador) return <Shell sessao={sessao} />;

  const idWorkspace = idDoCaminhoWorkspace(pathname);
  if (idWorkspace) {
    const nome = workspaces.find((w) => w.id === idWorkspace)?.nome ?? "Workspace do cliente";
    return (
      <Shell
        sessao={sessao}
        base={basePrefixoWorkspace(idWorkspace)}
        nomeWorkspace={nome}
        aoSair={() => {
          history.pushState(null, "", "/");
          window.dispatchEvent(new Event(EVENTO_NAVEGACAO));
        }}
      />
    );
  }
  return <ShellGestao sessao={sessao} />;
}
