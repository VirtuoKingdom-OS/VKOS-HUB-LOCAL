import { useEffect, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { INFO_STATUS } from "../../config/status";
import { ROTULO_TIPO } from "../telas/fluxos";
import { ROTULO_FONTE } from "../telas/fontes";
import { Marca } from "../comum/Telas";
import { SeletorWorkspace } from "./SeletorWorkspace";
import type { TipoContexto, TipoPeca } from "../../tipos/dominio";
import {
  IconeCarrossel,
  IconeGaleria,
  IconePost,
  IconeSite,
  IconeStories,
} from "../comum/Icones";
import { IconeImagens, IconeLinks, IconeTextos } from "../telas/icones";

const LIMITE_SESSOES = 5;

export interface ItemFluxo {
  tipo: TipoPeca;
  total: number;
}

export interface ItemFonte {
  tipo: TipoContexto;
  total: number;
}

interface Props {
  itensFluxo: ItemFluxo[];
  itensFonte: ItemFonte[];
  // "cockpit", "fluxo:<tipo>" ou "fonte:<tipo>".
  telaAtiva: string;
  aoNavegar: (tela: string) => void;
}

// Menu lateral fixo: marca, Cockpit, fluxos, fontes e rodape de status.
export function Sidebar({ itensFluxo, itensFonte, telaAtiva, aoNavegar }: Props) {
  const { ambiente, wsConectado, sessoes, estadoVkos, custos } = usarEstado();

  const ativas = sessoes.filter((s) => INFO_STATUS[s.status].ativa).length;
  const claudeOk = ambiente?.claude.instalado ?? false;
  const nomePasta = estadoVkos?.pasta
    ? estadoVkos.pasta.split(/[\\/]/).filter(Boolean).pop() ?? estadoVkos.pasta
    : "sem pasta";

  const totalGasto = custos?.totalUsd ?? 0;
  // Total geral somando todos os clientes, quando o backend manda o campo.
  const temTotalGeral = typeof custos?.totalGeralUsd === "number";
  const totalGeral = custos?.totalGeralUsd ?? 0;
  // Quebra honesta da entrada acumulada, quando o backend manda os campos novos.
  const temDetalheEntrada = typeof custos?.tokensEntradaNova === "number";
  const cacheAcum =
    (custos?.tokensCacheEscrita ?? 0) + (custos?.tokensCacheLeitura ?? 0);
  const dicaTokens = custos
    ? temDetalheEntrada
      ? `${(custos.tokensEntradaNova ?? 0).toLocaleString("pt-BR")} de entrada nova, ` +
        `${cacheAcum.toLocaleString("pt-BR")} de cache, ` +
        `${custos.tokensSaida.toLocaleString("pt-BR")} de saída em ` +
        `${custos.totalSessoes} sessões`
      : `${custos.tokensEntrada.toLocaleString("pt-BR")} tokens de entrada, ` +
        `${custos.tokensSaida.toLocaleString("pt-BR")} de saída em ` +
        `${custos.totalSessoes} sessões`
    : "Nenhuma sessão concluída ainda";

  return (
    <aside className="sidebar">
      <div className="sidebar-marca">
        <Marca />
        <BotaoTema />
      </div>

      <SeletorWorkspace />

      <nav className="sidebar-nav">
        <button
          className={`item-nav${telaAtiva === "cockpit" ? " ativo" : ""}`}
          onClick={() => aoNavegar("cockpit")}
        >
          <IconeCockpit className="" />
          <span className="item-nav-rotulo">Cockpit</span>
        </button>
        <button
          className={`item-nav${telaAtiva === "ide" ? " ativo" : ""}`}
          onClick={() => aoNavegar("ide")}
        >
          <IconeIde />
          <span className="item-nav-rotulo">VKOS-IDE</span>
        </button>
        <button
          className={`item-nav${telaAtiva === "crm" ? " ativo" : ""}`}
          onClick={() => aoNavegar("crm")}
        >
          <IconeCrm />
          <span className="item-nav-rotulo">CRM</span>
        </button>
        <button
          className={`item-nav${telaAtiva === "conexoes" ? " ativo" : ""}`}
          onClick={() => aoNavegar("conexoes")}
        >
          <IconeConexoes />
          <span className="item-nav-rotulo">Conexões</span>
        </button>

        {itensFluxo.length > 0 && (
          <>
            <div className="sidebar-secao">
              <span className="rotulo-secao">Fluxos</span>
            </div>
            {itensFluxo.map((item) => {
              const alvo = `fluxo:${item.tipo}`;
              return (
                <button
                  key={item.tipo}
                  className={`item-nav${telaAtiva === alvo ? " ativo" : ""}`}
                  onClick={() => aoNavegar(alvo)}
                >
                  {iconeTipo(item.tipo)}
                  <span className="item-nav-rotulo">
                    {ROTULO_TIPO[item.tipo]}
                  </span>
                  <span className="item-nav-contagem">{item.total}</span>
                </button>
              );
            })}
          </>
        )}

        {itensFonte.length > 0 && (
          <>
            <div className="sidebar-secao">
              <span className="rotulo-secao">Fontes de dados</span>
            </div>
            {itensFonte.map((item) => {
              const alvo = `fonte:${item.tipo}`;
              return (
                <button
                  key={item.tipo}
                  className={`item-nav${telaAtiva === alvo ? " ativo" : ""}`}
                  onClick={() => aoNavegar(alvo)}
                >
                  {iconeFonte(item.tipo)}
                  <span className="item-nav-rotulo">
                    {ROTULO_FONTE[item.tipo]}
                  </span>
                  <span className="item-nav-contagem">{item.total}</span>
                </button>
              );
            })}
          </>
        )}
      </nav>

      <div className="sidebar-rodape">
        <div className="rodape-linha" title={claudeOk ? "Claude pronto" : "Claude fora"}>
          <span className={`ponto-luz ${claudeOk ? "on" : "off"}`} />
          <span>Claude {claudeOk ? "pronto" : "fora"}</span>
        </div>
        <div
          className="rodape-linha"
          title={wsConectado ? "Conectado ao vivo" : "Reconectando"}
        >
          <span className={`ponto-luz ${wsConectado ? "on" : "off"}`} />
          <span>{wsConectado ? "Ao vivo" : "Reconectando"}</span>
          <span className="rodape-sessoes" title="Sessões ativas no limite de 5">
            {ativas} / {LIMITE_SESSOES}
          </span>
        </div>
        <div
          className="rodape-custo"
          title={
            temTotalGeral
              ? `Geral (todos os clientes): $${totalGeral.toFixed(2)}. ${dicaTokens}`
              : dicaTokens
          }
        >
          <div className="rodape-custo-linha">
            <span className="rodape-custo-rotulo">Gasto do cliente</span>
            <span className="rodape-custo-valor">${totalGasto.toFixed(2)}</span>
          </div>
          {temTotalGeral && (
            <div className="rodape-custo-detalhe">
              Geral, todos os clientes: ${totalGeral.toFixed(2)}
            </div>
          )}
          {temDetalheEntrada && (
            <div className="rodape-custo-detalhe">
              {fmtTokens(custos?.tokensEntradaNova)} novos,{" "}
              <span className="tok-cache">{fmtTokens(cacheAcum)} cache</span>,{" "}
              {fmtTokens(custos?.tokensSaida)} saída
            </div>
          )}
        </div>
        <div className="rodape-pasta" title={estadoVkos?.pasta ?? ""}>
          {nomePasta}
        </div>
      </div>
    </aside>
  );
}

// Tres temas: "claro", "escuro" (o dark padrao novo) e "vkos" (o dark
// original da VK). O tema vive em data-theme na raiz do documento e persiste
// no localStorage; o index.html reaplica o salvo antes do bundle carregar,
// entao nao ha flash na abertura. O clique abre um mini popover ancorado com
// as tres opcoes; fecha ao clicar fora ou apertar Esc.
type Tema = "claro" | "escuro" | "vkos";

const OPCOES_TEMA: { id: Tema; nome: string }[] = [
  { id: "claro", nome: "Claro" },
  { id: "escuro", nome: "Escuro" },
  { id: "vkos", nome: "Dark VKOS" },
];

function lerTema(): Tema {
  const t = document.documentElement.dataset.theme;
  return t === "claro" || t === "escuro" || t === "vkos" ? t : "escuro";
}

function BotaoTema() {
  const [tema, setTema] = useState<Tema>(lerTema);
  const [aberto, setAberto] = useState(false);
  const refCaixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (refCaixa.current && !refCaixa.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTecla);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTecla);
    };
  }, [aberto]);

  const escolher = (novo: Tema) => {
    setTema(novo);
    document.documentElement.dataset.theme = novo;
    try {
      localStorage.setItem("vkos-tema", novo);
    } catch {
      // sem localStorage, o tema so nao persiste
    }
    setAberto(false);
  };

  return (
    <div className="tema-caixa" ref={refCaixa}>
      <button
        className="botao-tema"
        onClick={() => setAberto((v) => !v)}
        title="Trocar o tema"
        aria-label="Trocar o tema"
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        {tema === "claro" ? <IconeSol /> : <IconeLua />}
      </button>
      {aberto && (
        <div className="tema-menu" role="menu">
          {OPCOES_TEMA.map((opcao) => (
            <button
              key={opcao.id}
              className={`tema-menu-item${tema === opcao.id ? " ativo" : ""}`}
              onClick={() => escolher(opcao.id)}
              role="menuitemradio"
              aria-checked={tema === opcao.id}
            >
              <span className="tema-menu-nome">{opcao.nome}</span>
              {tema === opcao.id && <IconeCheck />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconeCheck() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconeSol() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

// Formata contagem de tokens com sufixo k pro rodape compacto.
function fmtTokens(n?: number): string {
  if (typeof n !== "number" || !isFinite(n)) return "0";
  if (Math.abs(n) < 1000) return String(n);
  const v = n / 1000;
  const texto = v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, "");
  return `${texto}k`;
}

// Icone do item de fluxo conforme o tipo da peca.
function iconeTipo(tipo: TipoPeca) {
  if (tipo === "carrossel") return <IconeCarrossel className="" />;
  if (tipo === "stories") return <IconeStories className="" />;
  if (tipo === "site") return <IconeSite className="" />;
  if (tipo === "texto") return <IconePost className="" />;
  return <IconeGaleria className="" />;
}

// Icone do item de fonte conforme o tipo do contexto.
function iconeFonte(tipo: TipoContexto) {
  if (tipo === "imagens") return <IconeImagens className="" />;
  if (tipo === "links") return <IconeLinks className="" />;
  return <IconeTextos className="" />;
}

// Icones das telas fixas do hub, inline como o do Cockpit.
function IconeIde() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" />
    </svg>
  );
}

function IconeCrm() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.7-3 2.9-4.5 5.5-4.5S13.8 16 14.5 19" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 14.6c2.3.2 3.9 1.5 4.5 3.9" />
    </svg>
  );
}

function IconeConexoes() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7v4M15 7v4M7 11h10v2a5 5 0 0 1-10 0v-2ZM12 18v3" />
    </svg>
  );
}

// Icone proprio do Cockpit (o canvas). Inline pra nao depender do modulo cockpit.
function IconeCockpit({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </svg>
  );
}
