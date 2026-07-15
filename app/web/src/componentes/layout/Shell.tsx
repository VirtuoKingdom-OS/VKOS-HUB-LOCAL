import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { ProvedorGeracao } from "../../estado/geracao";
import { GeracaoFlutuante } from "../criacao/GeracaoFlutuante";
import { Cockpit } from "../cockpit/Cockpit";
import { Sidebar, type ItemFluxo, type ItemFonte } from "./Sidebar";
import { TelaFluxo } from "../telas/TelaFluxo";
import { TelaFonte } from "../telas/TelaFonte";
import { TelaDashboard } from "../dashboard/TelaDashboard";
import { TelaGalerias } from "../telas/TelaGalerias";
import { TelaEmBreve } from "../embreve/TelaEmBreve";
import { ORDEM_TIPOS } from "../telas/fluxos";
import { ORDEM_TIPOS_FONTE } from "../telas/fontes";
import type { TipoContexto, TipoPeca } from "../../tipos/dominio";

// Telas do hub (IDE, Conexoes, CRM, Studio) entram por import dinamico: cada
// uma so pesa no bundle quando aberta pela primeira vez, como o terminal fazia.
const TelaIde = lazy(() =>
  import("../ide").then((m) => ({ default: m.TelaIde }))
);
const TelaConexoes = lazy(() =>
  import("../conexoes").then((m) => ({ default: m.TelaConexoes }))
);
const TelaAutomacoes = lazy(() =>
  import("../automacoes/TelaAutomacoes").then((m) => ({
    default: m.TelaAutomacoes,
  }))
);
const TelaCrm = lazy(() =>
  import("../crm").then((m) => ({ default: m.TelaCrm }))
);
const TelaCalendario = lazy(() =>
  import("../calendario/TelaCalendario").then((m) => ({
    default: m.TelaCalendario,
  }))
);
const TelaStudio = lazy(() =>
  import("../studio/TelaStudio").then((m) => ({ default: m.TelaStudio }))
);
// TelaSite ja exporta default: import dinamico direto, sem remapear.
const TelaSite = lazy(() => import("../site/TelaSite"));

// Telas fixas do hub: sempre existem, independem de peca ou contexto. O Cockpit
// e a camada base (sempre montada por baixo), entao nao entra neste conjunto.
// O Dashboard e a tela padrao: "#/" resolve pra ele.
const TELAS_FIXAS = new Set([
  "dashboard",
  "galerias",
  "whatsapp",
  "instagram",
  "crm",
  "calendario",
  "conexoes",
  "automacoes",
  "ide",
]);

// Rota por hash, sem biblioteca: "#/" e "#/dashboard" abrem o Dashboard,
// "#/cockpit" o cockpit, "#/fluxo/<tipo>" uma tela de fluxo, "#/fonte/<tipo>"
// uma tela de fonte, "#/studio/<pasta>" o estudio de uma peca, e as demais sao
// telas fixas do hub. O F5 mantem a tela aberta e o voltar do navegador funciona.
function telaParaHash(tela: string): string {
  if (tela.startsWith("fluxo:")) return `#/fluxo/${tela.slice("fluxo:".length)}`;
  if (tela.startsWith("fonte:")) return `#/fonte/${tela.slice("fonte:".length)}`;
  // O segmento do studio ja viaja URL-encoded dentro da string da tela.
  if (tela.startsWith("studio:")) return `#/studio/${tela.slice("studio:".length)}`;
  // O site segue o mesmo padrao do studio: pasta URL-encoded no segmento.
  if (tela.startsWith("site:")) return `#/site/${tela.slice("site:".length)}`;
  if (tela === "cockpit") return "#/cockpit";
  if (TELAS_FIXAS.has(tela)) return `#/${tela}`;
  return "#/dashboard";
}

function hashParaTela(hash: string): string {
  const caminho = hash.replace(/^#\/?/, "");
  if (caminho.startsWith("fluxo/")) return `fluxo:${caminho.slice("fluxo/".length)}`;
  if (caminho.startsWith("fonte/")) return `fonte:${caminho.slice("fonte/".length)}`;
  if (caminho.startsWith("studio/")) return `studio:${caminho.slice("studio/".length)}`;
  if (caminho.startsWith("site/")) return `site:${caminho.slice("site/".length)}`;
  if (caminho === "cockpit") return "cockpit";
  if (TELAS_FIXAS.has(caminho)) return caminho;
  // "#/" legado e qualquer rota desconhecida caem no Dashboard, a porta padrao.
  return "dashboard";
}

// Layout raiz do app depois do onboarding: menu lateral e area de conteudo.
// O Cockpit fica sempre montado por baixo, as telas de fluxo e fonte cobrem por cima.
export function Shell() {
  const { pecas, contextos, workspaceAtivo, trocandoWorkspace, carregandoInicial } =
    usarEstado();
  // A tela nasce da URL: F5 numa tela de fluxo volta pra mesma tela.
  const [tela, setTela] = useState<string>(() =>
    hashParaTela(window.location.hash)
  );

  // Voltar/avancar do navegador mudam o hash: a tela acompanha. O flushSync
  // commita a troca ANTES do proximo paint: sem ele, com a thread ocupada (o
  // canvas do cockpit animando), o navegador pintava frames com o hash novo e o
  // cockpit ainda visivel, o "fantasma" na saida do cockpit.
  useEffect(() => {
    const aoMudarHash = () =>
      flushSync(() => setTela(hashParaTela(window.location.hash)));
    window.addEventListener("hashchange", aoMudarHash);
    return () => window.removeEventListener("hashchange", aoMudarHash);
  }, []);

  // Navegar pela sidebar atualiza o estado e grava o hash (vira historico).
  // Mesmo flushSync do hashchange: a tela nova commita antes do paint.
  const navegar = useCallback((proxima: string) => {
    flushSync(() => setTela(proxima));
    const hash = telaParaHash(proxima);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
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

  // Tela fixa do hub pedida (Dashboard, Galerias, WhatsApp, Instagram, CRM,
  // Conexoes, IDE): sempre valida.
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

  const telaAtiva = fluxoAtivo
    ? `fluxo:${fluxoAtivo}`
    : fonteAtiva
      ? `fonte:${fonteAtiva}`
      : paramStudio
        ? `studio:${paramStudio}`
        : paramSite
          ? `site:${paramSite}`
          : telaFixa
            ? telaFixa
            : tela === "cockpit"
              ? "cockpit"
              : "dashboard";

  // A URL nunca mente: se a tela pedida no hash nao existe mais (tipo sem
  // peca, workspace trocado), o estado e o hash resetam JUNTOS pra tela real.
  // So depois da carga inicial e fora da troca de workspace, senao resetaria
  // no vazio temporario do boot e mataria o F5 na tela certa.
  useEffect(() => {
    if (carregandoInicial || trocandoWorkspace) return;
    if (telaAtiva !== tela) {
      setTela(telaAtiva);
      const hash = telaParaHash(telaAtiva);
      if (window.location.hash !== hash) {
        history.replaceState(null, "", hash);
      }
    }
  }, [carregandoInicial, trocandoWorkspace, telaAtiva, tela]);

  return (
    <ProvedorGeracao>
      <div className="shell">
      <Sidebar
        itensFluxo={itensFluxo}
        itensFonte={itensFonte}
        telaAtiva={telaAtiva}
        aoNavegar={navegar}
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
          <TelaFonte key={fonteAtiva} tipo={fonteAtiva} />
        )}
        {/* Telas fixas leves, sempre no bundle principal: o Dashboard e a porta
            de entrada e a Galeria/Em breve sao telas simples. Key por workspace:
            trocar de cliente remonta a tela com os dados do cliente novo. */}
        {telaFixa === "dashboard" && (
          <TelaDashboard key={`dash-${workspaceAtivo}`} />
        )}
        {telaFixa === "galerias" && (
          <TelaGalerias key={`gal-${workspaceAtivo}`} />
        )}
        {telaFixa === "whatsapp" && <TelaEmBreve tipo="whatsapp" />}
        {telaFixa === "instagram" && <TelaEmBreve tipo="instagram" />}
        {/* Telas fixas pesadas, por import dinamico. */}
        {(telaFixa === "ide" ||
          telaFixa === "conexoes" ||
          telaFixa === "automacoes" ||
          telaFixa === "calendario" ||
          telaFixa === "crm") && (
          <Suspense
            fallback={<div className="tela-hub-carregando">Abrindo...</div>}
          >
            {telaFixa === "ide" && <TelaIde key={`ide-${workspaceAtivo}`} />}
            {telaFixa === "conexoes" && (
              <TelaConexoes key={`cx-${workspaceAtivo}`} />
            )}
            {telaFixa === "automacoes" && (
              <TelaAutomacoes key={`aut-${workspaceAtivo}`} />
            )}
            {telaFixa === "calendario" && (
              <TelaCalendario key={`cal-${workspaceAtivo}`} />
            )}
            {telaFixa === "crm" && <TelaCrm key={`crm-${workspaceAtivo}`} />}
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
