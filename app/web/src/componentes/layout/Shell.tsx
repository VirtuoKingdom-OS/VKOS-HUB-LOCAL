import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { ProvedorGeracao, type TipoGeracao } from "../../estado/geracao";
import { GeracaoFlutuante } from "../criacao/GeracaoFlutuante";
import { Cockpit } from "../cockpit/Cockpit";
import { Sidebar, type ItemFluxo, type ItemFonte } from "./Sidebar";
import { TelaFluxo } from "../telas/TelaFluxo";
import { TelaFonte } from "../telas/TelaFonte";
import { TelaFontes } from "../telas/TelaFontes";
import { TelaWorkspace } from "../workspace/TelaWorkspace";
import { TelaCore } from "../core/TelaCore";
import { TelaGalerias } from "../telas/TelaGalerias";
import { ORDEM_TIPOS } from "../telas/fluxos";
import { ORDEM_TIPOS_FONTE } from "../telas/fontes";
import type { TipoContexto, TipoPeca } from "../../tipos/dominio";
import {
  destinoAposCriacao,
  enderecoUsaHashAntigo,
  EVENTO_ROTA,
  nivelDaTela,
  retornoSeguroDaCriacao,
  telaDoEndereco,
  telaParaCaminho,
  TELAS_FIXAS,
  tipoCriacaoDaTela,
} from "./rotas";

// A IDE ja foi uma rota. Hoje e uma camada por cima de qualquer tela, mas
// endereco velho ainda pode chegar apontando pra ela.
function enderecoPedeIde(): boolean {
  const bruto = window.location.hash || window.location.pathname;
  return bruto.replace(/^[#/]+/, "").replace(/\/+$/, "") === "ide";
}

// Telas do hub (Conexoes, CRM, Studio) entram por import dinamico: cada
// uma so pesa no bundle quando aberta pela primeira vez, como o terminal fazia.
const TelaIde = lazy(() =>
  import("../ide").then((m) => ({ default: m.TelaIde }))
);
const TelaConexoes = lazy(() =>
  import("../conexoes").then((m) => ({ default: m.TelaConexoes }))
);
const TelaCrm = lazy(() =>
  import("../crm").then((m) => ({ default: m.TelaCrm }))
);
const TelaMapa = lazy(() =>
  import("../mapa").then((m) => ({ default: m.TelaMapa }))
);
const TelaAssistente = lazy(() =>
  import("../assistente").then((m) => ({ default: m.TelaAssistente }))
);
const TelaWorkspaces = lazy(() =>
  import("../core").then((m) => ({ default: m.TelaWorkspaces }))
);
const TelaEmDefinicao = lazy(() =>
  import("../core").then((m) => ({ default: m.TelaEmDefinicao }))
);
const TelaStudio = lazy(() =>
  import("../studio/TelaStudio").then((m) => ({ default: m.TelaStudio }))
);
// TelaSite ja exporta default: import dinamico direto, sem remapear.
const TelaSite = lazy(() => import("../site/TelaSite"));
// A pagina da campanha de anuncio, mesmo padrao da TelaSite.
const TelaAnuncio = lazy(() => import("../anuncios/TelaAnuncio"));
const AssistenteCriacao = lazy(() =>
  import("../criacao/AssistenteCriacao").then((modulo) => ({
    default: modulo.AssistenteCriacao,
  }))
);

// Layout raiz do app depois do onboarding: menu lateral e area de conteudo.
// O Cockpit fica sempre montado por baixo, as telas de fluxo e fonte cobrem por cima.
export function Shell() {
  const { pecas, contextos, workspaceAtivo, trocandoWorkspace, carregandoInicial } =
    usarEstado();
  // A tela nasce da URL: F5 numa tela de fluxo volta pra mesma tela.
  const [tela, setTela] = useState<string>(() =>
    enderecoPedeIde() ? "dashboard" : telaDoEndereco()
  );
  const [ideAberta, setIdeAberta] = useState(enderecoPedeIde);
  const [ideJaAberta, setIdeJaAberta] = useState(ideAberta);
  const [mapaDisponivel, setMapaDisponivel] = useState(false);

  // O dado interno vive fora do app. Se ele nao estiver nesta instalacao, o
  // item simplesmente nao entra na navegacao.
  useEffect(() => {
    let ativo = true;
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
  }, []);

  // Compatibilidade de entrada direta. Dois casos, os dois reescrevem a barra
  // de endereco uma vez so: a IDE, que ja foi rota e hoje e camada; e o
  // endereco antigo com hash (/#/crm), que precisa virar /crm sem o usuario
  // perceber. Quem tinha favorito salvo continua caindo na tela certa.
  useEffect(() => {
    if (enderecoPedeIde() || enderecoUsaHashAntigo()) {
      history.replaceState(null, "", telaParaCaminho(tela));
    }
    // Roda uma vez, na entrada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voltar/avancar do navegador trocam o caminho: a tela acompanha. O
  // EVENTO_ROTA cobre a navegacao feita por codigo de fora do Shell, porque
  // pushState nao dispara evento nenhum sozinho.
  //
  // O flushSync commita a troca ANTES do proximo paint: sem ele, com a thread
  // ocupada (o canvas do cockpit animando), o navegador pintava frames com a
  // rota nova e o cockpit ainda visivel, o "fantasma" na saida do cockpit.
  useEffect(() => {
    const aoMudarRota = () => {
      if (enderecoPedeIde()) {
        flushSync(() => {
          setIdeJaAberta(true);
          setIdeAberta(true);
        });
        history.replaceState(null, "", telaParaCaminho(tela));
        return;
      }
      flushSync(() => {
        setIdeAberta(false);
        setTela(telaDoEndereco());
      });
    };
    window.addEventListener("popstate", aoMudarRota);
    window.addEventListener(EVENTO_ROTA, aoMudarRota);
    return () => {
      window.removeEventListener("popstate", aoMudarRota);
      window.removeEventListener(EVENTO_ROTA, aoMudarRota);
    };
  }, [tela]);

  const alternarIde = useCallback(() => {
    setIdeJaAberta(true);
    setIdeAberta((aberta) => !aberta);
  }, []);

  // Navegar pela sidebar atualiza o estado e grava o caminho (vira historico).
  // Mesmo flushSync do popstate: a tela nova commita antes do paint.
  const navegar = useCallback((proxima: string) => {
    flushSync(() => {
      setIdeAberta(false);
      setTela(proxima);
    });
    const caminho = telaParaCaminho(proxima);
    if (window.location.pathname !== caminho) {
      history.pushState(null, "", caminho);
    }
  }, []);

  // Substitui a entrada corrente. Usado ao cancelar ou concluir uma criacao,
  // para o botao Voltar nunca reabrir um assistente encerrado.
  const substituirTela = useCallback((proxima: string) => {
    flushSync(() => {
      setIdeAberta(false);
      setTela(proxima);
    });
    history.replaceState(null, "", telaParaCaminho(proxima));
  }, []);

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

  // Tipo do fluxo aberto, se ainda existir peca desse tipo. Some, volta ao cockpit.
  const tipoFluxo = tela.startsWith("fluxo:")
    ? (tela.slice("fluxo:".length) as TipoPeca)
    : null;
  const fluxoAtivo =
    tipoFluxo && itensFluxo.some((i) => i.tipo === tipoFluxo)
      ? tipoFluxo
      : null;

  // Tipo da fonte aberta, se ainda existir contexto desse tipo.
  const tipoFonte = tela.startsWith("fonte:")
    ? (tela.slice("fonte:".length) as TipoContexto)
    : null;
  const fonteAtiva =
    tipoFonte && itensFonte.some((i) => i.tipo === tipoFonte)
      ? tipoFonte
      : null;

  // Tela fixa pedida, dos dois niveis (CORE e workspace): sempre valida.
  const telaFixa = TELAS_FIXAS.has(tela) ? tela : null;

  // Studio de uma peca: o segmento URL-encoded da pasta. A validade da peca e
  // checada dentro da propria TelaStudio, nao aqui: o studio e sempre uma rota
  // valida do ponto de vista do Shell (mostra erro claro se a peca nao existe).
  const paramStudio = tela.startsWith("studio:")
    ? tela.slice("studio:".length)
    : null;

  // Tela do site de uma peca: mesmo padrao do studio, o segmento URL-encoded da
  // pasta. A validade da peca e checada dentro da propria TelaSite, nao aqui.
  const paramSite = tela.startsWith("site:")
    ? tela.slice("site:".length)
    : null;

  // Pagina da campanha de anuncio: mesmo padrao do studio e do site. A validade
  // da peca e checada dentro da propria TelaAnuncio, que mostra estado honesto
  // quando a peca sumiu ou quando o anuncio.json esta fora do formato.
  const paramAnuncio = tela.startsWith("anuncio:")
    ? tela.slice("anuncio:".length)
    : null;

  // Criacao guiada e uma rota de verdade. Assim F5, Voltar e entrada vinda de
  // qualquer tela mantêm URL e interface na mesma verdade.
  const tipoCriacao = tipoCriacaoDaTela(tela);

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
            : paramAnuncio
              ? `anuncio:${paramAnuncio}`
              : telaFixa
                ? telaFixa
                : "dashboard";

  const abrirCriacao = useCallback((tipo: TipoGeracao) => {
    const proxima = `criar:${tipo}`;
    if (telaAtiva === proxima) return;
    const retorno = tipoCriacao ? "inicio" : telaAtiva;
    flushSync(() => {
      setIdeAberta(false);
      setTela(proxima);
    });
    history.pushState(
      { vkosRetornoTela: retorno },
      "",
      telaParaCaminho(proxima),
    );
  }, [telaAtiva, tipoCriacao]);

  const cancelarCriacao = useCallback(() => {
    const estado = history.state as { vkosRetornoTela?: unknown } | null;
    substituirTela(retornoSeguroDaCriacao(estado?.vkosRetornoTela));
  }, [substituirTela]);

  const concluirCriacao = useCallback((pasta: string) => {
    substituirTela(destinoAposCriacao(tipoCriacao ?? "carrossel", pasta));
  }, [substituirTela, tipoCriacao]);

  // A URL nunca mente: se a tela pedida no hash nao existe mais (tipo sem
  // peca, workspace trocado), o estado e o hash resetam JUNTOS pra tela real.
  // So depois da carga inicial e fora da troca de workspace, senao resetaria
  // no vazio temporario do boot e mataria o F5 na tela certa.
  useEffect(() => {
    if (carregandoInicial || trocandoWorkspace) return;
    if (telaAtiva !== tela) {
      setTela(telaAtiva);
      const caminho = telaParaCaminho(telaAtiva);
      if (window.location.pathname !== caminho) {
        history.replaceState(null, "", caminho);
      }
    }
  }, [carregandoInicial, trocandoWorkspace, telaAtiva, tela]);

  return (
    <ProvedorGeracao>
      <div className={`shell${telaFixa === "assistente" ? " shell-assistente" : ""}`}>
      <Sidebar
        itensFluxo={itensFluxo}
        itensFonte={itensFonte}
        telaAtiva={tipoCriacao ? "inicio" : telaAtiva}
        // A barra segue a tela: as cinco areas do dono no CORE, so o projeto
        // dentro de um projeto. Estar criando peca conta como estar no projeto.
        nivel={tipoCriacao ? "workspace" : nivelDaTela(telaAtiva)}
        aoNavegar={navegar}
        ideAberta={ideAberta}
        aoAlternarIde={alternarIde}
        mapaDisponivel={mapaDisponivel}
      />
      <div className="shell-conteudo">
        <div
          className={`camada-cockpit${telaAtiva === "cockpit" ? "" : " oculta"}`}
        >
          {/* A key por workspace remonta o cockpit na troca de cliente: o React
              Flow zera e recarrega o canvas do cliente novo do zero. Oculto
              quando outra tela esta ativa, pra nao vazar por baixo (fantasma). */}
          <Cockpit key={workspaceAtivo ?? "sem-workspace"} />
        </div>
        {fluxoAtivo && <TelaFluxo key={fluxoAtivo} tipo={fluxoAtivo} />}
        {!fluxoAtivo && fonteAtiva && (
          <TelaFonte
            key={fonteAtiva}
            tipo={fonteAtiva}
            aoVoltar={() => navegar("fontes")}
          />
        )}
        {/* Dashboard do CORE: o nivel de cima. Sem key por workspace de
            proposito, porque nada nele e do workspace aberto. */}
        {telaFixa === "dashboard" && <TelaCore aoNavegar={navegar} />}
        {telaFixa === "assistente" && (
          <Suspense
            fallback={<div className="tela-hub-carregando">Abrindo o Assistente...</div>}
          >
            <TelaAssistente />
          </Suspense>
        )}
        {/* Tela de trabalho do workspace aberto. Continua sendo a base do
            assistente de criacao: criar peca e trabalho de projeto. Key por
            workspace: trocar remonta com os dados do novo. */}
        {(telaFixa === "inicio" || tipoCriacao) && (
          <TelaWorkspace
            key={`inicio-${workspaceAtivo}`}
            aoCriar={abrirCriacao}
          />
        )}
        {telaFixa === "galerias" && (
          <TelaGalerias key={`gal-${workspaceAtivo}`} />
        )}
        {telaFixa === "fontes" && (
          <TelaFontes
            key={`fontes-${workspaceAtivo}`}
            itens={itensFonte}
            aoNavegar={navegar}
          />
        )}
        {/* Telas fixas pesadas, por import dinamico. */}
        {(telaFixa === "conexoes" ||
          telaFixa === "mapa" ||
          telaFixa === "workspaces" ||
          telaFixa === "clientes" ||
          telaFixa === "financas" ||
          telaFixa === "crm") && (
          <Suspense
            fallback={<div className="tela-hub-carregando">Abrindo...</div>}
          >
            {/* Conexoes subiu pro CORE junto com o CRM: a conta e do dono, nao
                do cliente. Sem key por workspace, porque trocar de cliente nao
                muda nada aqui. */}
            {telaFixa === "conexoes" && <TelaConexoes />}
            {telaFixa === "workspaces" && <TelaWorkspaces aoNavegar={navegar} />}
            {/* O CRM nao leva key por workspace: o funil e do dono do Hub, o
                mesmo em qualquer cliente. Remontar na troca so jogaria fora o
                que estava aberto na tela, sem trazer dado novo nenhum. */}
            {telaFixa === "crm" && <TelaCrm />}
            {telaFixa === "mapa" && <TelaMapa />}
            {/* Clientes e Financas ja tem porta na barra, mas o conteudo delas
                ainda nao foi definido. Ficam navegaveis e dizem isso na cara,
                em vez de mostrar dado inventado. */}
            {/* O contexto diz o ESCOPO da tela, a promessa diz o FUTURO dela.
                Antes os dois diziam a mesma coisa com palavras diferentes
                ("Quem você atende" e "a lista de clientes do seu negócio"), e
                subtítulo que reformula o título é ruído com custo de altura
                (regra 6 do contrato). */}
            {telaFixa === "clientes" && (
              <TelaEmDefinicao
                titulo="Clientes"
                contexto="O nível de cima do Hub: esta lista não muda quando você troca de workspace."
                promessa="Vai morar aqui a lista de quem você atende. O que ela mostra de cada um ainda está sendo definido."
              />
            )}
            {telaFixa === "financas" && (
              <TelaEmDefinicao
                titulo="Finanças"
                contexto="O dinheiro do negócio. Não confundir com o gasto com IA, que fica no Dashboard."
                promessa="Vai morar aqui o que entra e o que sai. O que ela controla ainda está sendo definido."
              />
            )}
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
        {/* Pagina da campanha de anuncio: cobre por cima como as demais. */}
        {paramAnuncio && (
          <Suspense
            fallback={<div className="tela-hub-carregando">Abrindo a campanha...</div>}
          >
            <TelaAnuncio
              key={`anuncio-${workspaceAtivo}-${paramAnuncio}`}
              pasta={decodeURIComponent(paramAnuncio)}
            />
          </Suspense>
        )}
        {tipoCriacao && (
          <Suspense
            fallback={
              <div className="dash-overlay-wizard">
                <div className="dash-wizard-carregando">
                  <div className="girinho" role="status" aria-label="Abrindo" />
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
        {/* Veu de transicao: cobre o conteudo durante a troca pra nao piscar
            dados do cliente anterior. */}
        <div className={`veu-troca${trocandoWorkspace ? " ativo" : ""}`} />
      </div>
      {/* Mini card da geracao minimizada: aparece por cima quando o wizard
          esta fechado mas a geracao segue viva. */}
      <GeracaoFlutuante />
      </div>
    </ProvedorGeracao>
  );
}
