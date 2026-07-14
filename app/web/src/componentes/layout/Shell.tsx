import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { Cockpit } from "../cockpit/Cockpit";
import { Sidebar, type ItemFluxo, type ItemFonte } from "./Sidebar";
import { TelaFluxo } from "../telas/TelaFluxo";
import { TelaFonte } from "../telas/TelaFonte";
import { ORDEM_TIPOS } from "../telas/fluxos";
import { ORDEM_TIPOS_FONTE } from "../telas/fontes";
import type { TipoContexto, TipoPeca } from "../../tipos/dominio";

// Telas do hub (IDE, Conexoes, CRM) entram por import dinamico: cada uma so
// pesa no bundle quando aberta pela primeira vez, como o terminal fazia.
const TelaIde = lazy(() =>
  import("../ide").then((m) => ({ default: m.TelaIde }))
);
const TelaConexoes = lazy(() =>
  import("../conexoes").then((m) => ({ default: m.TelaConexoes }))
);
const TelaCrm = lazy(() =>
  import("../crm").then((m) => ({ default: m.TelaCrm }))
);

// Telas fixas do hub: sempre existem, independem de peca ou contexto.
const TELAS_FIXAS = new Set(["ide", "conexoes", "crm"]);

// Rota por hash, sem biblioteca: "#/" e o cockpit, "#/fluxo/<tipo>" e uma tela
// de fluxo, "#/fonte/<tipo>" uma tela de fonte, "#/ide" e cia sao as telas
// fixas do hub. O F5 mantem a tela aberta e o voltar do navegador funciona.
function telaParaHash(tela: string): string {
  if (tela.startsWith("fluxo:")) return `#/fluxo/${tela.slice("fluxo:".length)}`;
  if (tela.startsWith("fonte:")) return `#/fonte/${tela.slice("fonte:".length)}`;
  if (TELAS_FIXAS.has(tela)) return `#/${tela}`;
  return "#/";
}

function hashParaTela(hash: string): string {
  const caminho = hash.replace(/^#\/?/, "");
  if (caminho.startsWith("fluxo/")) return `fluxo:${caminho.slice("fluxo/".length)}`;
  if (caminho.startsWith("fonte/")) return `fonte:${caminho.slice("fonte/".length)}`;
  if (TELAS_FIXAS.has(caminho)) return caminho;
  return "cockpit";
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

  // Voltar/avancar do navegador mudam o hash: a tela acompanha.
  useEffect(() => {
    const aoMudarHash = () => setTela(hashParaTela(window.location.hash));
    window.addEventListener("hashchange", aoMudarHash);
    return () => window.removeEventListener("hashchange", aoMudarHash);
  }, []);

  // Navegar pela sidebar atualiza o estado e grava o hash (vira historico).
  const navegar = useCallback((proxima: string) => {
    setTela(proxima);
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

  // Tela fixa do hub pedida (IDE, Conexoes, CRM): sempre valida.
  const telaFixa = TELAS_FIXAS.has(tela) ? tela : null;

  const telaAtiva = fluxoAtivo
    ? `fluxo:${fluxoAtivo}`
    : fonteAtiva
      ? `fonte:${fonteAtiva}`
      : telaFixa ?? "cockpit";

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
    <div className="shell">
      <Sidebar
        itensFluxo={itensFluxo}
        itensFonte={itensFonte}
        telaAtiva={telaAtiva}
        aoNavegar={navegar}
      />
      <div className="shell-conteudo">
        <div className="camada-cockpit">
          {/* A key por workspace remonta o cockpit na troca de cliente: o React
              Flow zera e recarrega o canvas do cliente novo do zero. */}
          <Cockpit key={workspaceAtivo ?? "sem-workspace"} />
        </div>
        {fluxoAtivo && <TelaFluxo key={fluxoAtivo} tipo={fluxoAtivo} />}
        {!fluxoAtivo && fonteAtiva && (
          <TelaFonte key={fonteAtiva} tipo={fonteAtiva} />
        )}
        {/* Telas fixas do hub, com key por workspace: trocar de cliente
            remonta a tela com os dados do cliente novo. */}
        {!fluxoAtivo && !fonteAtiva && telaFixa && (
          <Suspense
            fallback={<div className="tela-hub-carregando">Abrindo...</div>}
          >
            {telaFixa === "ide" && <TelaIde key={`ide-${workspaceAtivo}`} />}
            {telaFixa === "conexoes" && (
              <TelaConexoes key={`cx-${workspaceAtivo}`} />
            )}
            {telaFixa === "crm" && <TelaCrm key={`crm-${workspaceAtivo}`} />}
          </Suspense>
        )}
        {/* Veu de transicao: cobre o conteudo durante a troca pra nao piscar
            dados do cliente anterior. */}
        <div className={`veu-troca${trocandoWorkspace ? " ativo" : ""}`} />
      </div>
    </div>
  );
}
