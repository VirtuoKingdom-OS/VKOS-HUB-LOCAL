import { useEffect, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { INFO_STATUS } from "../../config/status";
import { ROTULO_TIPO } from "../telas/fluxos";
import { Marca } from "../comum/Telas";
import { IconeAlerta } from "../comum/Icones";
import { SeletorWorkspace } from "./SeletorWorkspace";
import type { TipoContexto, TipoPeca } from "../../tipos/dominio";

// Tipos de peca que a galeria unificada reune (imagem).
const TIPOS_GALERIA: TipoPeca[] = ["carrossel", "post", "stories"];

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
  // "dashboard", "workspaces", "crm", "conexoes", "mapa" (CORE) ou "inicio",
  // "cockpit", "galerias", "fontes", "fluxo:<tipo>", "fonte:<tipo>",
  // "studio:<pasta>" (workspace).
  telaAtiva: string;
  aoNavegar: (tela: string) => void;
  ideAberta: boolean;
  aoAlternarIde: () => void;
  mapaDisponivel: boolean;
}

// Menu lateral fixo, em DOIS NIVEIS desde 2026-07-27.
//
// Em cima o CORE, o nivel do dono: Dashboard, Workspaces, CRM e Conexoes. Nada
// ali muda quando se troca de workspace.
//
// Embaixo o WORKSPACE aberto, com o seletor logo abaixo do rotulo da secao. Foi
// de proposito: o seletor dentro da secao mostra na hora que trocar de workspace
// so mexe no que esta abaixo dele, e nao no Hub inteiro.
export function Sidebar({
  itensFluxo,
  itensFonte,
  telaAtiva,
  aoNavegar,
  ideAberta,
  aoAlternarIde,
  mapaDisponivel,
}: Props) {
  const { ambiente, wsConectado, sessoes, estadoVkos, custos, workspaces } =
    usarEstado();

  const ativas = sessoes.filter((s) => INFO_STATUS[s.status].ativa).length;
  const claudeOk = ambiente?.claude.instalado ?? false;
  const nomePasta = estadoVkos?.pasta
    ? estadoVkos.pasta.split(/[\\/]/).filter(Boolean).pop() ?? estadoVkos.pasta
    : "sem pasta";

  // Secao "Conteudo": a galeria unificada soma as pecas de imagem (carrossel,
  // post, stories); o item so aparece quando ha alguma. O "Site e paginas"
  // aparece so quando existe peca de site e leva ao fluxo de site.
  const galeriasTotal = itensFluxo
    .filter((i) => TIPOS_GALERIA.includes(i.tipo))
    .reduce((soma, i) => soma + i.total, 0);
  const itemSite = itensFluxo.find((i) => i.tipo === "site");
  const temConteudo = galeriasTotal > 0 || !!itemSite;
  const totalFontes = itensFonte.reduce((soma, item) => soma + item.total, 0);

  const totalGasto = custos?.totalUsd ?? 0;
  // Total geral somando todos os clientes, quando o backend manda o campo.
  const temTotalGeral = typeof custos?.totalGeralUsd === "number";
  const totalGeral = custos?.totalGeralUsd ?? 0;
  const custoEstimado = custos?.estimado === true;
  const totalGeralEstimado = custos?.totalGeralEstimado === true;
  // Quebra honesta da entrada acumulada, quando o backend manda os campos novos.
  const temDetalheEntrada = typeof custos?.tokensEntradaNova === "number";
  // Cache de escrita e cache de leitura têm preços bem diferentes (a escrita
  // custa mais que a entrada nova, a leitura custa uma fração dela). Somar os
  // dois num número só escondia essa diferença, então cada um aparece sozinho.
  const cacheEscrita = custos?.tokensCacheEscrita ?? 0;
  const cacheLeitura = custos?.tokensCacheLeitura ?? 0;
  // Turnos que gastaram sem o Hub saber quanto. Enquanto houver, o total é um
  // piso, e a tela diz isso em vez de mostrar um número com cara de exato.
  const turnosSemCusto = custos?.turnosSemCusto ?? 0;
  const totalEhPiso = custos?.piso === true;
  const totalGeralEhPiso = custos?.totalGeralPiso === true;
  const dicaTokens = custos
    ? temDetalheEntrada
      ? `${(custos.tokensEntradaNova ?? 0).toLocaleString("pt-BR")} de entrada nova, ` +
        `${cacheEscrita.toLocaleString("pt-BR")} de cache gravado, ` +
        `${cacheLeitura.toLocaleString("pt-BR")} de cache lido, ` +
        `${custos.tokensSaida.toLocaleString("pt-BR")} de saída em ` +
        `${custos.totalSessoes} sessões`
      : `${custos.tokensEntrada.toLocaleString("pt-BR")} tokens de entrada, ` +
        `${custos.tokensSaida.toLocaleString("pt-BR")} de saída em ` +
        `${custos.totalSessoes} sessões`
    : "Nenhuma sessão concluída ainda";

  return (
    <aside className="sidebar">
      <div className="sidebar-marca-bloco">
        <div className="sidebar-marca">
          <Marca />
          <BotaoTema />
        </div>
        <span
          className="sidebar-marca-beta"
          title="Versão em testes: alguns fluxos ainda podem apresentar erros."
        >
          Versão Beta
          <IconeAlerta className="sidebar-marca-beta-icone" />
        </span>
      </div>

      {/* Duas navegacoes, uma por nivel. Elas sao separadas por um motivo
          concreto, nao so visual: a de baixo rola (overflow-y), e um filho
          que rola recorta o popover do seletor de workspace. Com o seletor
          FORA dela, o painel dele volta a poder passar da borda da sidebar,
          como sempre passou. */}
      <nav className="sidebar-nav sidebar-nav-core">
        <div className="sidebar-secao sidebar-secao-nivel">
          <span className="rotulo-secao">Core</span>
        </div>
        <button
          className={`item-nav${telaAtiva === "dashboard" ? " ativo" : ""}`}
          aria-current={telaAtiva === "dashboard" ? "page" : undefined}
          onClick={() => aoNavegar("dashboard")}
        >
          <IconeDashboard />
          <span className="item-nav-rotulo">Dashboard</span>
        </button>
        <button
          className={`item-nav${telaAtiva === "workspaces" ? " ativo" : ""}`}
          aria-current={telaAtiva === "workspaces" ? "page" : undefined}
          onClick={() => aoNavegar("workspaces")}
        >
          <IconeWorkspaces />
          <span className="item-nav-rotulo">Workspaces</span>
          {workspaces.length > 0 && (
            <span className="item-nav-contagem">{workspaces.length}</span>
          )}
        </button>
        <button
          className={`item-nav${telaAtiva === "crm" ? " ativo" : ""}`}
          aria-current={telaAtiva === "crm" ? "page" : undefined}
          onClick={() => aoNavegar("crm")}
        >
          <IconeCrm />
          <span className="item-nav-rotulo">CRM</span>
        </button>
        <button
          className={`item-nav${telaAtiva === "conexoes" ? " ativo" : ""}`}
          aria-current={telaAtiva === "conexoes" ? "page" : undefined}
          onClick={() => aoNavegar("conexoes")}
        >
          <IconeConexoes />
          <span className="item-nav-rotulo">Conexões</span>
        </button>
        {mapaDisponivel && (
          <button
            className={`item-nav${telaAtiva === "mapa" ? " ativo" : ""}`}
            aria-current={telaAtiva === "mapa" ? "page" : undefined}
            onClick={() => aoNavegar("mapa")}
          >
            <IconeMapa />
            <span className="item-nav-rotulo">Mapa</span>
          </button>
        )}

      </nav>

      <div className="sidebar-secao sidebar-secao-nivel">
        <span className="rotulo-secao">Workspace</span>
      </div>
      <SeletorWorkspace />

      <nav className="sidebar-nav sidebar-nav-workspace">
        <button
          className={`item-nav${telaAtiva === "inicio" ? " ativo" : ""}`}
          aria-current={telaAtiva === "inicio" ? "page" : undefined}
          onClick={() => aoNavegar("inicio")}
        >
          <IconeInicio />
          <span className="item-nav-rotulo">Início</span>
        </button>
        <button
          className={`item-nav${telaAtiva === "cockpit" ? " ativo" : ""}`}
          aria-current={telaAtiva === "cockpit" ? "page" : undefined}
          onClick={() => aoNavegar("cockpit")}
        >
          <IconeCockpit className="" />
          <span className="item-nav-rotulo">Cockpit</span>
        </button>

        {temConteudo && (
          <>
            <div className="sidebar-secao sidebar-subsecao">
              <span className="rotulo-secao">Conteúdo</span>
            </div>
            {galeriasTotal > 0 && (
              <button
                className={`item-nav${telaAtiva === "galerias" ? " ativo" : ""}`}
                aria-current={telaAtiva === "galerias" ? "page" : undefined}
                onClick={() => aoNavegar("galerias")}
              >
                <IconeGalerias />
                <span className="item-nav-rotulo">Galerias</span>
                <span className="item-nav-contagem">{galeriasTotal}</span>
              </button>
            )}
            {itemSite && (
              <button
                className={`item-nav${telaAtiva === "fluxo:site" ? " ativo" : ""}`}
                aria-current={telaAtiva === "fluxo:site" ? "page" : undefined}
                onClick={() => aoNavegar("fluxo:site")}
              >
                <IconeSitePagina />
                <span className="item-nav-rotulo">{ROTULO_TIPO.site}</span>
                <span className="item-nav-contagem">{itemSite.total}</span>
              </button>
            )}
          </>
        )}

        {itensFonte.length > 0 && (
          <>
            <div className="sidebar-secao sidebar-subsecao">
              <span className="rotulo-secao">Fontes de dados</span>
            </div>
            <button
              className={`item-nav${
                telaAtiva === "fontes" || telaAtiva.startsWith("fonte:")
                  ? " ativo"
                  : ""
              }`}
              aria-current={
                telaAtiva === "fontes" || telaAtiva.startsWith("fonte:")
                  ? "page"
                  : undefined
              }
              onClick={() => aoNavegar("fontes")}
            >
              <IconeFontes />
              <span className="item-nav-rotulo">Fontes de dados</span>
              <span className="item-nav-contagem">{totalFontes}</span>
            </button>
          </>
        )}

        {/* A VKOS-IDE fica sempre por ultimo, ancorada no fim da navegacao
            (margin-top:auto) e separada por uma borda, acima do rodape. */}
        <div className="sidebar-nav-fim">
          <button
            className={`item-nav${ideAberta ? " ativo" : ""}`}
            onClick={aoAlternarIde}
            aria-pressed={ideAberta}
          >
            <IconeIde />
            <span className="item-nav-rotulo">VKOS-IDE</span>
          </button>
        </div>
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
              ? `Geral (todos os workspaces, incluindo os já removidos): ${
                  totalGeralEhPiso ? "no mínimo " : ""
                }${totalGeralEstimado ? "~" : ""}$${totalGeral.toFixed(2)}. ${dicaTokens}`
              : dicaTokens
          }
        >
          <div className="rodape-custo-linha">
            <span className="rodape-custo-rotulo">Gasto deste workspace</span>
            <span className="rodape-custo-valor">
              {totalEhPiso ? "≥ " : ""}
              {custoEstimado ? "~" : ""}${totalGasto.toFixed(2)}
            </span>
          </div>
          {custoEstimado && (
            <div className="rodape-custo-detalhe">valor aproximado, estimado por tabela de preços</div>
          )}
          {totalEhPiso && (
            <div className="rodape-custo-alerta">
              {turnosSemCusto === 1
                ? "1 turno gastou sem preço conhecido. O valor real é maior."
                : `${turnosSemCusto} turnos gastaram sem preço conhecido. O valor real é maior.`}
            </div>
          )}
          {temTotalGeral && (
            <div className="rodape-custo-detalhe">
              Geral, todos os workspaces: {totalGeralEhPiso ? "≥ " : ""}
              {totalGeralEstimado ? "~" : ""}${totalGeral.toFixed(2)}
              {totalGeralEstimado ? ", aproximado" : ""}
            </div>
          )}
          {temDetalheEntrada && (
            <div className="rodape-custo-detalhe">
              {fmtTokens(custos?.tokensEntradaNova)} novos,{" "}
              <span className="tok-cache">{fmtTokens(cacheEscrita)} cache gravado</span>,{" "}
              <span className="tok-cache">{fmtTokens(cacheLeitura)} cache lido</span>,{" "}
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

// Icones das telas fixas do hub, inline como o do Cockpit.
function IconeFontes() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
    </svg>
  );
}

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

// Mapa: tres pontos ligados, uma rede lida sem alterar o sistema.
function IconeMapa() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="m10.8 7.2-4.5 8.6M13.2 7.2l4.5 8.6M7.5 18h9" />
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

// Dashboard: grade de blocos, a porta de entrada simplificada.
function IconeDashboard() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="5" rx="1.5" />
      <rect x="13" y="11" width="7" height="9" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// Workspaces: pilha de cartoes, a lista de projetos do dono.
function IconeWorkspaces() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M3 13h18" />
    </svg>
  );
}

// Inicio do workspace: uma casa, a tela de trabalho do projeto aberto.
function IconeInicio() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 10.5 8-6.5 8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" />
      <path d="M9.5 20.5v-6h5v6" />
    </svg>
  );
}

// Galerias: pilha de quadros, a galeria unificada de imagem.
function IconeGalerias() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3.5" width="13" height="13" rx="2" />
      <path d="m10 12 2.2-2.2 2.3 2.3 1.7-1.6L20 13" />
      <path d="M4 7.5v11A2 2 0 0 0 6 20.5h11" />
    </svg>
  );
}

// Site e paginas: janela de navegador com a barra superior.
function IconeSitePagina() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M7 7h.01M10 7h.01" />
    </svg>
  );
}
