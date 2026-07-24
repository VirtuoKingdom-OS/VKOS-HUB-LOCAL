import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { lazyRecarregavel } from "../../util/carregarModulo";
import { flushSync } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { ProvedorGeracao, type TipoGeracao } from "../../estado/geracao";
import { GeracaoFlutuante } from "../criacao/GeracaoFlutuante";
import { Cockpit } from "../cockpit/Cockpit";
import { Sidebar, type ItemFluxo, type ItemFonte } from "./Sidebar";
import { TelaFluxo } from "../telas/TelaFluxo";
import { TelaFonte } from "../telas/TelaFonte";
import { TelaArquivos } from "../telas/TelaArquivos";
import { TelaDashboard } from "../dashboard/TelaDashboard";
import { ORDEM_TIPOS } from "../telas/fluxos";
import { ORDEM_TIPOS_FONTE } from "../telas/fontes";
import type { TipoContexto, TipoPeca } from "../../tipos/dominio";
import {
  caminhoParaTela,
  comBase,
  destinoAposCriacao,
  EVENTO_ABRIR_CRIACAO,
  EVENTO_NAVEGACAO,
  retornoSeguroDaCriacao,
  semBase,
  telaParaCaminho,
  TELAS_FIXAS,
  tipoCriacaoDaTela,
} from "./rotas";
import { LimiteErro } from "../comum/Sistema";
import { EstadoVazio } from "../comum/Sistema";
import { obterFeaturesAtivas, type SessaoWeb } from "../../api/cliente";
import {
  primeiraTelaDisponivel,
  telaPermitida,
  temTelaDisponivel,
} from "./permissoes";

// Telas do hub (Conexoes, CRM, Studio) entram por import dinamico: cada
// uma so pesa no bundle quando aberta pela primeira vez, como o terminal fazia.
const TelaIde = lazyRecarregavel(() =>
  import("../ide").then((m) => ({ default: m.TelaIde }))
);
const TelaConexoes = lazyRecarregavel(() =>
  import("../conexoes").then((m) => ({ default: m.TelaConexoes }))
);
const TelaAutomacoes = lazyRecarregavel(() =>
  import("../automacoes/TelaAutomacoes").then((m) => ({
    default: m.TelaAutomacoes,
  }))
);
const TelaCerebro = lazyRecarregavel(() =>
  import("../cerebro").then((m) => ({ default: m.TelaCerebro }))
);
const TelaCrm = lazyRecarregavel(() =>
  import("../crm").then((m) => ({ default: m.TelaCrm }))
);
const TelaCalendario = lazyRecarregavel(() =>
  import("../calendario/TelaCalendario").then((m) => ({
    default: m.TelaCalendario,
  }))
);
const TelaMeta = lazyRecarregavel(() =>
  import("../meta").then((m) => ({ default: m.TelaMeta }))
);
const TelaMapa = lazyRecarregavel(() =>
  import("../mapa").then((m) => ({ default: m.TelaMapa }))
);
const TelaAdmin = lazyRecarregavel(() =>
  import("../admin/TelaAdmin").then((m) => ({ default: m.TelaAdmin }))
);
const TelaStudio = lazyRecarregavel(() =>
  import("../studio/TelaStudio").then((m) => ({ default: m.TelaStudio }))
);
// TelaSite ja exporta default: import dinamico direto, sem remapear.
const TelaSite = lazyRecarregavel(() => import("../site/TelaSite"));
const AssistenteCriacao = lazyRecarregavel(() =>
  import("../criacao/AssistenteCriacao").then((modulo) => ({
    default: modulo.AssistenteCriacao,
  }))
);

// Layout raiz do app depois do onboarding: menu lateral e area de conteudo.
// O Cockpit fica sempre montado por baixo, as telas de fluxo e fonte cobrem por cima.
export function Shell({
  sessao,
  base = "",
  nomeWorkspace,
  aoSair,
}: {
  sessao: SessaoWeb;
  base?: string;
  nomeWorkspace?: string;
  aoSair?: () => void;
}) {
  const { pecas, contextos, workspaceAtivo, trocandoWorkspace, carregandoInicial } =
    usarEstado();
  // A tela nasce da URL: F5 numa tela de fluxo volta pra mesma tela. Sob um
  // workspace do operador (base /w/<id>), a base sai antes de resolver a tela.
  const [tela, setTela] = useState<string>(() =>
    semBase(base, window.location.pathname) === "/ide"
      ? "dashboard"
      : caminhoParaTela(semBase(base, window.location.pathname))
  );
  const [ideAberta, setIdeAberta] = useState(
    () => semBase(base, window.location.pathname) === "/ide"
  );
  const [ideJaAberta, setIdeJaAberta] = useState(ideAberta);
  const [mapaDisponivel, setMapaDisponivel] = useState(false);
  const [featuresAtivas, setFeaturesAtivas] = useState<Set<string>>(
    () => new Set(sessao.features),
  );
  const ehOperador = sessao.usuario.papel === "operador";

  const recarregarFeatures = useCallback(async () => {
    try {
      const resposta = await obterFeaturesAtivas();
      setFeaturesAtivas(new Set(resposta.features));
    } catch {
      // Mantem o ultimo catalogo valido enquanto a conexao se recupera.
    }
  }, []);

  useEffect(() => {
    void recarregarFeatures();
    window.addEventListener("popstate", recarregarFeatures);
    window.addEventListener(EVENTO_NAVEGACAO, recarregarFeatures);
    window.addEventListener("vkos:features-atualizadas", recarregarFeatures);
    return () => {
      window.removeEventListener("popstate", recarregarFeatures);
      window.removeEventListener(EVENTO_NAVEGACAO, recarregarFeatures);
      window.removeEventListener("vkos:features-atualizadas", recarregarFeatures);
    };
  }, [workspaceAtivo, recarregarFeatures]);

  // O dado interno vive fora do app. Se ele nao estiver nesta instalacao, o
  // item simplesmente nao entra na navegacao.
  useEffect(() => {
    let ativo = true;
    if (!ehOperador) {
      setMapaDisponivel(false);
      return;
    }
    fetch("/api/mapa", { cache: "no-store" })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((resposta: { disponivel?: boolean } | null) => {
        if (ativo) setMapaDisponivel(resposta?.disponivel === true);
      })
      .catch(() => {
        if (ativo) setMapaDisponivel(false);
      });
    return () => {
      ativo = false;
    };
  }, [ehOperador]);

  // Compatibilidade de entrada direta: abre a camada, mas limpa a rota antiga.
  // Assim um F5 futuro volta para a tela real, sem tratar a IDE como pagina.
  useEffect(() => {
    if (semBase(base, window.location.pathname) !== "/ide") return;
    history.replaceState(null, "", comBase(base, telaParaCaminho(tela)));
    // A tela inicial para a rota legada e sempre o Dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voltar/avancar e navegacoes internas mudam o caminho: a tela acompanha. O flushSync
  // commita a troca ANTES do proximo paint: sem ele, com a thread ocupada (o
  // canvas do cockpit animando), o navegador pintava frames com o hash novo e o
  // cockpit ainda visivel, o "fantasma" na saida do cockpit.
  useEffect(() => {
    const aoNavegar = () => {
      if (semBase(base, window.location.pathname) === "/ide") {
        flushSync(() => {
          setIdeJaAberta(true);
          setIdeAberta(true);
        });
        history.replaceState(null, "", comBase(base, telaParaCaminho(tela)));
        return;
      }
      flushSync(() => {
        setIdeAberta(false);
        setTela(caminhoParaTela(semBase(base, window.location.pathname)));
      });
    };
    window.addEventListener("popstate", aoNavegar);
    window.addEventListener(EVENTO_NAVEGACAO, aoNavegar);
    return () => {
      window.removeEventListener("popstate", aoNavegar);
      window.removeEventListener(EVENTO_NAVEGACAO, aoNavegar);
    };
  }, [tela, base]);

  const alternarIde = useCallback(() => {
    setIdeJaAberta(true);
    setIdeAberta((aberta) => !aberta);
  }, []);

  // Navegar pela sidebar atualiza o estado e grava o caminho (vira historico).
  // Mesmo flushSync da navegacao: a tela nova commita antes do paint.
  const navegar = useCallback((proxima: string) => {
    flushSync(() => {
      setIdeAberta(false);
      setTela(proxima);
    });
    const caminho = comBase(base, telaParaCaminho(proxima));
    if (window.location.pathname !== caminho) {
      history.pushState(null, "", caminho);
      window.dispatchEvent(new Event(EVENTO_NAVEGACAO));
    }
  }, [base]);

  // Substitui a entrada corrente. Usado ao cancelar ou concluir uma criacao,
  // para o botao Voltar nunca reabrir um assistente encerrado.
  const substituirTela = useCallback((proxima: string) => {
    flushSync(() => {
      setIdeAberta(false);
      setTela(proxima);
    });
    history.replaceState(null, "", comBase(base, telaParaCaminho(proxima)));
  }, [base]);

  // Itens de fluxo derivados das pecas: um por tipo presente, com contagem.
  const itensFluxo = useMemo<ItemFluxo[]>(() => {
    const contagem = new Map<TipoPeca, number>();
    for (const peca of pecas) {
      contagem.set(peca.tipo, (contagem.get(peca.tipo) ?? 0) + 1);
    }
    return ORDEM_TIPOS.filter((t) => contagem.has(t)).map((t) => ({
      tipo: t,
      total: contagem.get(t) ?? 0,
    }));
  }, [pecas]);

  // Itens de fonte derivados dos contextos: um por tipo presente, com contagem.
  const itensFonte = useMemo<ItemFonte[]>(() => {
    const contagem = new Map<TipoContexto, number>();
    for (const contexto of contextos) {
      contagem.set(contexto.tipo, (contagem.get(contexto.tipo) ?? 0) + 1);
    }
    return ORDEM_TIPOS_FONTE.filter((t) => contagem.has(t)).map((t) => ({
      tipo: t,
      total: contagem.get(t) ?? 0,
    }));
  }, [contextos]);

  const telaPedida = telaPermitida(tela, featuresAtivas, ehOperador)
    ? tela
    : primeiraTelaDisponivel(featuresAtivas);

  // Tipo do fluxo aberto, se ainda existir peca desse tipo. Some, volta ao cockpit.
  const tipoFluxo = telaPedida.startsWith("fluxo:")
    ? (telaPedida.slice("fluxo:".length) as TipoPeca)
    : null;
  const fluxoAtivo =
    tipoFluxo && itensFluxo.some((i) => i.tipo === tipoFluxo)
      ? tipoFluxo
      : null;

  // Tipo da fonte aberta, se ainda existir contexto desse tipo.
  const tipoFonte = telaPedida.startsWith("fonte:")
    ? (telaPedida.slice("fonte:".length) as TipoContexto)
    : null;
  const fonteAtiva =
    tipoFonte && itensFonte.some((i) => i.tipo === tipoFonte)
      ? tipoFonte
      : null;

  // Tela fixa do hub pedida (Dashboard, Cerebro, Arquivos, CRM e Conexoes):
  // sempre valida. A sub-aba de fontes dos Arquivos e um id proprio
  // (arquivos:fontes) que renderiza a mesma TelaArquivos.
  const telaFixa = TELAS_FIXAS.has(telaPedida)
    ? telaPedida
    : telaPedida === "arquivos:fontes"
      ? "arquivos"
      : null;
  const abaArquivos = telaPedida === "arquivos:fontes" ? "fontes" : "criacoes";

  // Studio de uma peca: o segmento URL-encoded da pasta. A validade da peca e
  // checada dentro da propria TelaStudio, nao aqui: o studio e sempre uma rota
  // valida do ponto de vista do Shell (mostra erro claro se a peca nao existe).
  const paramStudio = telaPedida.startsWith("studio:")
    ? telaPedida.slice("studio:".length)
    : null;

  // Tela do site de uma peca: mesmo padrao do studio, o segmento URL-encoded da
  // pasta. A validade da peca e checada dentro da propria TelaSite, nao aqui.
  const paramSite = telaPedida.startsWith("site:")
    ? telaPedida.slice("site:".length)
    : null;

  // Criacao guiada e uma rota de verdade. Assim F5, Voltar e entrada vinda de
  // qualquer tela mantêm URL e interface na mesma verdade.
  const tipoCriacao = tipoCriacaoDaTela(telaPedida);

  const telaAtiva = tipoCriacao
    ? `criar:${tipoCriacao}`
    : fluxoAtivo
      ? `fluxo:${fluxoAtivo}`
      : fonteAtiva
        ? `fonte:${fonteAtiva}`
        : paramStudio
          ? `studio:${paramStudio}`
          : paramSite
            ? `site:${paramSite}`
            : telaFixa
              // A sub-aba de fontes preserva o proprio id, senao o efeito de
              // canonicalizacao da URL a resetaria pra sub-aba de criacoes.
              ? (telaPedida === "arquivos:fontes" ? "arquivos:fontes" : telaFixa)
              : telaPedida === "cockpit"
                ? "cockpit"
                : "dashboard";

  const abrirCriacao = useCallback((tipo: TipoGeracao) => {
    const proxima = `criar:${tipo}`;
    if (telaAtiva === proxima) return;
    const retorno = tipoCriacao ? "dashboard" : telaAtiva;
    flushSync(() => {
      setIdeAberta(false);
      setTela(proxima);
    });
    history.pushState(
      { vkosRetornoTela: retorno },
      "",
      comBase(base, telaParaCaminho(proxima)),
    );
  }, [telaAtiva, tipoCriacao, base]);

  const cancelarCriacao = useCallback(() => {
    const estado = history.state as { vkosRetornoTela?: unknown } | null;
    substituirTela(retornoSeguroDaCriacao(estado?.vkosRetornoTela));
  }, [substituirTela]);

  const concluirCriacao = useCallback((pasta: string) => {
    substituirTela(destinoAposCriacao(tipoCriacao ?? "carrossel", pasta));
  }, [substituirTela, tipoCriacao]);

  // Abre o wizard a partir de fora do Shell (o cockpit vazio pede sem navegar
  // sozinho). O wizard cuida da escolha de identidade quando o Cerebro esta em
  // branco, entao aqui so abrimos a criacao do tipo pedido.
  useEffect(() => {
    const aoAbrir = (evento: Event) => {
      const tipo = (evento as CustomEvent<{ tipo?: TipoGeracao }>).detail?.tipo;
      abrirCriacao(tipo ?? "carrossel");
    };
    window.addEventListener(EVENTO_ABRIR_CRIACAO, aoAbrir);
    return () => window.removeEventListener(EVENTO_ABRIR_CRIACAO, aoAbrir);
  }, [abrirCriacao]);

  // A URL nunca mente: se a tela pedida no caminho nao existe mais (tipo sem
  // peca, workspace trocado), o estado e o caminho resetam JUNTOS pra tela real.
  // So depois da carga inicial e fora da troca de workspace, senao resetaria
  // no vazio temporario do boot e mataria o F5 na tela certa.
  useEffect(() => {
    if (carregandoInicial || trocandoWorkspace) return;
    if (telaAtiva !== tela) {
      setTela(telaAtiva);
      const caminho = comBase(base, telaParaCaminho(telaAtiva));
      if (window.location.pathname !== caminho) {
        history.replaceState(null, "", caminho);
      }
    }
  }, [carregandoInicial, trocandoWorkspace, telaAtiva, tela, base]);

  return (
    <ProvedorGeracao>
      <div className="shell">
      <Sidebar
        itensFluxo={itensFluxo}
        itensFonte={itensFonte}
        telaAtiva={tipoCriacao ? "dashboard" : telaAtiva}
        aoNavegar={navegar}
        ideAberta={ideAberta}
        aoAlternarIde={alternarIde}
        mapaDisponivel={mapaDisponivel}
        ehOperador={ehOperador}
        featuresAtivas={featuresAtivas}
        ocultarGestao={Boolean(base)}
      />
      <div className={`shell-conteudo${nomeWorkspace ? " com-contexto" : ""}`}>
        {nomeWorkspace && (
          <div className="barra-contexto-workspace">
            <span className="barra-contexto-rotulo">
              Workspace: <strong>{nomeWorkspace}</strong>
            </span>
            <button type="button" className="barra-contexto-sair" onClick={aoSair}>
              Voltar ao painel
            </button>
          </div>
        )}
        <div className="shell-camadas">
        <LimiteErro key={telaAtiva} contexto={`tela ${telaAtiva}`} tela>
        <div
          className={`camada-cockpit${telaAtiva === "cockpit" ? "" : " oculta"}`}
          inert={telaAtiva !== "cockpit"}
          aria-hidden={telaAtiva !== "cockpit"}
        >
          {/* A key por workspace remonta o cockpit na troca de cliente: o React
              Flow zera e recarrega o canvas do cliente novo do zero. Oculto
              quando outra tela esta ativa, pra nao vazar por baixo (fantasma). */}
          {(ehOperador || featuresAtivas.has("cockpit")) && (
            <Cockpit key={workspaceAtivo ?? "sem-workspace"} />
          )}
        </div>
        {!ehOperador && !temTelaDisponivel(featuresAtivas) && (
          <section className="tela-fluxo shell-workspace-preparando">
            <EstadoVazio
              titulo="Seu workspace está sendo preparado"
              mensagem="As ferramentas contratadas aparecerão aqui assim que a configuração for concluída."
            />
          </section>
        )}
        {fluxoAtivo && <TelaFluxo key={fluxoAtivo} tipo={fluxoAtivo} />}
        {!fluxoAtivo && fonteAtiva && (
          <TelaFonte
            key={fonteAtiva}
            tipo={fonteAtiva}
            aoVoltar={() => navegar("arquivos:fontes")}
          />
        )}
        {/* Telas fixas leves, sempre no bundle principal: o Dashboard e a porta
            de entrada e a Galeria/Em breve sao telas simples. Key por workspace:
            trocar de cliente remonta a tela com os dados do cliente novo. */}
        {(telaFixa === "dashboard" || tipoCriacao) && (
          <TelaDashboard
            key={`dash-${workspaceAtivo}`}
            aoCriar={abrirCriacao}
          />
        )}
        {telaFixa === "arquivos" && (
          <TelaArquivos
            key={`arq-${workspaceAtivo}`}
            aba={abaArquivos}
            itensFonte={itensFonte}
            aoNavegar={navegar}
            temCriacoes={ehOperador || featuresAtivas.has("criador-visual")}
            temFontes={ehOperador || featuresAtivas.has("cockpit")}
          />
        )}
        {/* Telas fixas pesadas, por import dinamico. */}
        {(telaFixa === "conexoes" ||
          telaFixa === "automacoes" ||
          telaFixa === "calendario" ||
          telaFixa === "meta" ||
          telaFixa === "cerebro" ||
          telaFixa === "mapa" ||
          telaFixa === "crm" ||
          telaFixa === "admin") && (
          <Suspense
            fallback={<div className="tela-hub-carregando">Abrindo...</div>}
          >
            {telaFixa === "cerebro" && (
              <TelaCerebro key={`cer-${workspaceAtivo}`} />
            )}
            {telaFixa === "conexoes" && (
              <TelaConexoes key={`cx-${workspaceAtivo}`} />
            )}
            {telaFixa === "automacoes" && (
              <TelaAutomacoes key={`aut-${workspaceAtivo}`} />
            )}
            {telaFixa === "calendario" && (
              <TelaCalendario key={`cal-${workspaceAtivo}`} />
            )}
            {telaFixa === "meta" && (
              <TelaMeta key={`meta-${workspaceAtivo}`} ehOperador={ehOperador} />
            )}
            {telaFixa === "crm" && <TelaCrm key={`crm-${workspaceAtivo}`} />}
            {telaFixa === "mapa" && <TelaMapa />}
            {telaFixa === "admin" && <TelaAdmin />}
          </Suspense>
        )}
        {/* Studio de uma peca: cobre por cima como as demais telas. A pasta vai
            decodificada por prop; a TelaStudio valida a peca e mostra erro se
            nao existir. */}
        {paramStudio && (
          <Suspense
            fallback={<div className="tela-hub-carregando">Abrindo o estúdio...</div>}
          >
            <TelaStudio
              key={`studio-${workspaceAtivo}-${paramStudio}`}
              pasta={decodeURIComponent(paramStudio)}
            />
          </Suspense>
        )}
        {/* Tela do site de uma peca: cobre por cima como o studio. A pasta vai
            decodificada por prop; a TelaSite valida a peca e mostra erro se
            nao existir. */}
        {paramSite && (
          <Suspense
            fallback={<div className="tela-hub-carregando">Abrindo o site...</div>}
          >
            <TelaSite
              key={`site-${workspaceAtivo}-${paramSite}`}
              pasta={decodeURIComponent(paramSite)}
            />
          </Suspense>
        )}
        {tipoCriacao && (
          <Suspense
            fallback={
              <div className="dash-overlay-wizard">
                <div className="dash-wizard-carregando">
                  <div className="giro" />
                </div>
              </div>
            }
          >
            <AssistenteCriacao
              tipo={tipoCriacao}
              aoConcluir={concluirCriacao}
              aoCancelar={cancelarCriacao}
              aoAbrirDestino={substituirTela}
            />
          </Suspense>
        )}
        {ideJaAberta && (
          <div className={`camada-ide${ideAberta ? " aberta" : ""}`}>
            <Suspense
              fallback={<div className="tela-hub-carregando">Abrindo a IDE...</div>}
            >
              <TelaIde
                key={`ide-${workspaceAtivo}`}
                aoFechar={() => setIdeAberta(false)}
              />
            </Suspense>
          </div>
        )}
        </LimiteErro>
        {/* Veu de transicao: cobre o conteudo durante a troca pra nao piscar
            dados do cliente anterior. */}
        <div className={`veu-troca${trocandoWorkspace ? " ativo" : ""}`} />
        </div>
      </div>
      {/* Mini card da geracao minimizada: aparece por cima quando o wizard
          esta fechado mas a geracao segue viva. */}
      <GeracaoFlutuante />
      </div>
    </ProvedorGeracao>
  );
}
