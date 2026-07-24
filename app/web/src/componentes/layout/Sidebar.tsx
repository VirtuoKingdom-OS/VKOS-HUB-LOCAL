import { useEffect, useRef, useState } from "react";
import {
  atualizarConfig,
  obterConfig,
} from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { INFO_STATUS } from "../../config/status";
import { ROTULO_TIPO } from "../telas/fluxos";
import { Marca } from "../comum/Telas";
import { IconeAlerta, IconeCerebro, IconeMeta } from "../comum/Icones";
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
  // "dashboard", "cockpit", "galerias", "fontes", "crm", "conexoes",
  // "automacoes", "fluxo:<tipo>", "fonte:<tipo>" ou
  // "studio:<pasta>".
  telaAtiva: string;
  aoNavegar: (tela: string) => void;
  ideAberta: boolean;
  aoAlternarIde: () => void;
  mapaDisponivel: boolean;
  ehOperador: boolean;
  featuresAtivas: ReadonlySet<string>;
  // Quando o operador entra num workspace pelo CORE, os itens de gestao
  // (Conexoes, Automacoes, Mapa, Administracao) somem: ali ele opera o
  // workspace como o cliente operaria, a gestao vive no painel do CORE.
  ocultarGestao?: boolean;
}

// Menu lateral fixo: marca, navegacao do hub, secao de conteudo condicional,
// fontes de dados, a VKOS-IDE ancorada no fim e o rodape de status.
export function Sidebar({
  itensFluxo,
  itensFonte,
  telaAtiva,
  aoNavegar,
  ideAberta,
  aoAlternarIde,
  mapaDisponivel,
  ehOperador,
  featuresAtivas,
  ocultarGestao = false,
}: Props) {
  const mostrarGestao = ehOperador && !ocultarGestao;
  const { ambiente, wsConectado, sessoes, estadoVkos, custos, workspaceAtivo } =
    usarEstado();
  const temFeature = (id: string) => ehOperador || featuresAtivas.has(id);

  const ativas = sessoes.filter((s) => INFO_STATUS[s.status].ativa).length;
  const claudeOk = ambiente?.claude.instalado ?? false;
  const nomePasta = estadoVkos?.pasta
    ? (estadoVkos.pasta.split(/[\\/]/).filter(Boolean).pop() ??
      estadoVkos.pasta)
    : "sem pasta";

  // Secao "Conteudo": a galeria unificada soma as pecas de imagem (carrossel,
  // post, stories); o item so aparece quando ha alguma. O "Site e paginas"
  // aparece so quando existe peca de site e leva ao fluxo de site.
  const galeriasTotal = itensFluxo
    .filter((i) => TIPOS_GALERIA.includes(i.tipo))
    .reduce((soma, i) => soma + i.total, 0);
  const itemSite = itensFluxo.find((i) => i.tipo === "site");
  const totalFontes = itensFonte.reduce((soma, item) => soma + item.total, 0);
  // O item Arquivos une as criacoes visuais e as fontes de dados. Cada lado so
  // conta (e so faz o item aparecer) quando a feature dele esta ligada.
  const contagemCriacoes = temFeature("criador-visual") ? galeriasTotal : 0;
  const contagemFontes = temFeature("cockpit") ? totalFontes : 0;
  const totalArquivos = contagemCriacoes + contagemFontes;
  const temArquivos = totalArquivos > 0;

  const totalGasto = custos?.totalUsd ?? 0;
  // Total geral somando todos os clientes, quando o backend manda o campo.
  const temTotalGeral = typeof custos?.totalGeralUsd === "number";
  const totalGeral = custos?.totalGeralUsd ?? 0;
  const custoEstimado = custos?.estimado === true;
  const totalGeralEstimado = custos?.totalGeralEstimado === true;
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

      <nav className="sidebar-nav">
        <button
          hidden={!temFeature("criador-visual") && !temFeature("site-guiado")}
          className={`item-nav${telaAtiva === "dashboard" ? " ativo" : ""}`}
          aria-current={telaAtiva === "dashboard" ? "page" : undefined}
          onClick={() => aoNavegar("dashboard")}
        >
          <IconeDashboard />
          <span className="item-nav-rotulo">Dashboard</span>
        </button>
        <button
          hidden={!temFeature("cockpit")}
          className={`item-nav${telaAtiva === "cockpit" ? " ativo" : ""}`}
          aria-current={telaAtiva === "cockpit" ? "page" : undefined}
          onClick={() => aoNavegar("cockpit")}
        >
          <IconeCockpit className="" />
          <span className="item-nav-rotulo">Cockpit</span>
        </button>
        <button
          hidden={!temFeature("cockpit")}
          className={`item-nav${telaAtiva === "cerebro" ? " ativo" : ""}`}
          aria-current={telaAtiva === "cerebro" ? "page" : undefined}
          onClick={() => aoNavegar("cerebro")}
          title={
            estadoVkos && !estadoVkos.cerebroPreenchido
              ? "O Cérebro ainda tem seções em branco"
              : undefined
          }
        >
          <IconeCerebro className="item-nav-icone-cerebro" />
          <span className="item-nav-rotulo">Cérebro</span>
          {estadoVkos && !estadoVkos.cerebroPreenchido && (
            <span className="item-nav-atencao" aria-hidden="true" />
          )}
        </button>
        <button
          hidden={!temFeature("crm")}
          className={`item-nav${telaAtiva === "crm" ? " ativo" : ""}`}
          aria-current={telaAtiva === "crm" ? "page" : undefined}
          onClick={() => aoNavegar("crm")}
        >
          <IconeCrm />
          <span className="item-nav-rotulo">CRM</span>
        </button>
        <button
          hidden={!temFeature("calendario")}
          className={`item-nav${telaAtiva === "calendario" ? " ativo" : ""}`}
          aria-current={telaAtiva === "calendario" ? "page" : undefined}
          onClick={() => aoNavegar("calendario")}
        >
          <IconeCalendario />
          <span className="item-nav-rotulo">Calendário</span>
        </button>
        <button
          hidden={!temFeature("meta")}
          className={`item-nav${telaAtiva === "meta" ? " ativo" : ""}`}
          aria-current={telaAtiva === "meta" ? "page" : undefined}
          onClick={() => aoNavegar("meta")}
        >
          <IconeMeta />
          <span className="item-nav-rotulo">Meta</span>
        </button>
        {/* Conexões saiu do workspace: são contas do operador e agora vivem no
            Sistema do painel de gestão (decisão de 2026-07-23). */}
        <button
          hidden={!mostrarGestao}
          className={`item-nav${telaAtiva === "automacoes" ? " ativo" : ""}`}
          aria-current={telaAtiva === "automacoes" ? "page" : undefined}
          onClick={() => aoNavegar("automacoes")}
        >
          <IconeAutomacoes />
          <span className="item-nav-rotulo">Automações</span>
        </button>
        {mostrarGestao && mapaDisponivel && (
          <button
            className={`item-nav${telaAtiva === "mapa" ? " ativo" : ""}`}
            aria-current={telaAtiva === "mapa" ? "page" : undefined}
            onClick={() => aoNavegar("mapa")}
          >
            <IconeMapa />
            <span className="item-nav-rotulo">Mapa</span>
          </button>
        )}
        {mostrarGestao && (
          <button
            className={`item-nav${telaAtiva === "admin" ? " ativo" : ""}`}
            aria-current={telaAtiva === "admin" ? "page" : undefined}
            onClick={() => aoNavegar("admin")}
          >
            <IconeAdmin />
              <span className="item-nav-rotulo">Administração</span>
          </button>
        )}

        {(temArquivos || (itemSite && temFeature("site-guiado"))) && (
          <>
            <div className="sidebar-secao">
              <span className="rotulo-secao">Conteúdo</span>
            </div>
            {temArquivos && (
              <button
                className={`item-nav${
                  telaAtiva.startsWith("arquivos") || telaAtiva.startsWith("fonte:")
                    ? " ativo"
                    : ""
                }`}
                aria-current={
                  telaAtiva.startsWith("arquivos") || telaAtiva.startsWith("fonte:")
                    ? "page"
                    : undefined
                }
                onClick={() => aoNavegar("arquivos")}
              >
                <IconeGalerias />
                <span className="item-nav-rotulo">Arquivos</span>
                <span className="item-nav-contagem">{totalArquivos}</span>
              </button>
            )}
            {itemSite && temFeature("site-guiado") && (
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

        {/* A VKOS-IDE fica sempre por ultimo, ancorada no fim da navegacao
            (margin-top:auto) e separada por uma borda, acima do rodape. */}
        {temFeature("ide") && (
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
        )}
      </nav>

      <div className="sidebar-rodape">
        <div
          className="rodape-linha"
          title={claudeOk ? "Claude pronto" : "Claude fora"}
        >
          <span className={`ponto-luz ${claudeOk ? "on" : "off"}`} />
          <span>Claude {claudeOk ? "pronto" : "fora"}</span>
        </div>
        <div
          className="rodape-linha"
          title={wsConectado ? "Conectado ao vivo" : "Reconectando"}
        >
          <span className={`ponto-luz ${wsConectado ? "on" : "off"}`} />
          <span>{wsConectado ? "Ao vivo" : "Reconectando"}</span>
          <span
            className="rodape-sessoes"
            title="Sessões ativas no limite de 5"
          >
            {ativas} / {LIMITE_SESSOES}
          </span>
        </div>
        <LinhaModoEnxuto />
        <div
          className="rodape-custo"
          title={
            temTotalGeral
              ? `Geral (todos os clientes): ${totalGeralEstimado ? "~" : ""}$${totalGeral.toFixed(2)}. ${dicaTokens}`
              : dicaTokens
          }
        >
          <div className="rodape-custo-linha">
            <span className="rodape-custo-rotulo">Gasto do cliente</span>
            <span className="rodape-custo-valor">
              {custoEstimado ? "~" : ""}${totalGasto.toFixed(2)}
            </span>
          </div>
          {custoEstimado && (
            <div className="rodape-custo-detalhe">
              valor aproximado, estimado por tabela de preços
            </div>
          )}
          {temTotalGeral && (
            <div className="rodape-custo-detalhe">
              Geral, todos os clientes: {totalGeralEstimado ? "~" : ""}$
              {totalGeral.toFixed(2)}
              {totalGeralEstimado ? ", aproximado" : ""}
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

const TITLE_MODO_ENXUTO =
  "Sessões novas recebem a regra de economia: respostas mais diretas, " +
  "menos tokens. Pode mudar o estilo dos resultados. Não afeta a geração " +
  "guiada de site e carrossel.";

// Toggle do Modo enxuto, vizinho do gasto do cliente. Estado vem do GET
// /api/config; a gravacao e otimista no PUT, com rollback em erro.
function LinhaModoEnxuto() {
  const [ligado, setLigado] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    obterConfig()
      .then((config) => {
        if (!vivo) return;
        setLigado(config.modoEnxuto === true);
        setPronto(true);
      })
      .catch(() => {
        // Servidor fora: o toggle fica desabilitado ate a proxima montagem.
      });
    return () => {
      vivo = false;
    };
  }, []);

  const alternar = (valor: boolean) => {
    const anterior = ligado;
    setLigado(valor);
    atualizarConfig({ modoEnxuto: valor }).catch(() => setLigado(anterior));
  };

  return (
    <div className="rodape-enxuto" title={TITLE_MODO_ENXUTO}>
      <span className="rodape-enxuto-rotulo">Modo enxuto</span>
      <label className="enxuto-switch">
        <input
          type="checkbox"
          checked={ligado}
          disabled={!pronto}
          onChange={(e) => alternar(e.target.checked)}
          aria-label="Modo enxuto"
        />
        <span className="enxuto-switch-trilho">
          <span className="enxuto-switch-bola" />
        </span>
      </label>
    </div>
  );
}

// Dois temas: "claro" off-white e "escuro" (o padrao). O tema vive em
// data-theme na raiz do documento e persiste
// no localStorage; o index.html reaplica o salvo antes do bundle carregar,
// entao nao ha flash na abertura. O clique abre um mini popover ancorado com
// as tres opcoes; fecha ao clicar fora ou apertar Esc.
type Tema = "claro" | "escuro";

const OPCOES_TEMA: { id: Tema; nome: string }[] = [
  { id: "claro", nome: "Claro" },
  { id: "escuro", nome: "Escuro" },
];

function lerTema(): Tema {
  const t = document.documentElement.dataset.theme;
  if (t === "vkos") {
    try { localStorage.setItem("vkos-tema", "escuro"); } catch { /* sem persistencia */ }
    return "escuro";
  }
  return t === "claro" || t === "escuro" ? t : "escuro";
}

export function BotaoTema() {
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
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconeSol() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

// Formata contagem de tokens com sufixo k pro rodape compacto.
function fmtTokens(n?: number): string {
  if (typeof n !== "number" || !isFinite(n)) return "0";
  if (Math.abs(n) < 1000) return String(n);
  const v = n / 1000;
  const texto =
    v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, "");
  return `${texto}k`;
}

// Icones das telas fixas do hub, inline como o do Cockpit.
function IconeFontes() {
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
    >
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
    </svg>
  );
}

function IconeIde() {
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
    >
      <path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" />
    </svg>
  );
}

function IconeCrm() {
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
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.7-3 2.9-4.5 5.5-4.5S13.8 16 14.5 19" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 14.6c2.3.2 3.9 1.5 4.5 3.9" />
    </svg>
  );
}

// Calendario: folha de agenda com a barra do topo e os furos.
function IconeCalendario() {
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
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

// Automacoes: um raio, a regra que dispara sozinha.
function IconeAutomacoes() {
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
    >
      <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
    </svg>
  );
}

// Mapa: tres pontos ligados, uma rede lida sem alterar o sistema.
function IconeMapa() {
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
    >
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="m10.8 7.2-4.5 8.6M13.2 7.2l4.5 8.6M7.5 18h9" />
    </svg>
  );
}

function IconeAdmin() {
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
    >
      <path d="M4 6h16M7 12h10M9 18h6" />
      <circle cx="6" cy="6" r="2" fill="var(--superficie)" />
      <circle cx="15" cy="12" r="2" fill="var(--superficie)" />
      <circle cx="11" cy="18" r="2" fill="var(--superficie)" />
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
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="5" rx="1.5" />
      <rect x="13" y="11" width="7" height="9" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// Galerias: pilha de quadros, a galeria unificada de imagem.
function IconeGalerias() {
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
    >
      <rect x="7" y="3.5" width="13" height="13" rx="2" />
      <path d="m10 12 2.2-2.2 2.3 2.3 1.7-1.6L20 13" />
      <path d="M4 7.5v11A2 2 0 0 0 6 20.5h11" />
    </svg>
  );
}

// Site e paginas: janela de navegador com a barra superior.
function IconeSitePagina() {
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
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M7 7h.01M10 7h.01" />
    </svg>
  );
}
