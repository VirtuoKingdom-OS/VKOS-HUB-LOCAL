import { useEffect, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { INFO_STATUS } from "../../config/status";
import { ROTULO_TIPO } from "../telas/fluxos";
import { Marca } from "../comum/Telas";
import { IconeAnuncio, IconeSeta } from "../comum/Icones";
import { SeletorWorkspace } from "./SeletorWorkspace";
import type { TipoContexto, TipoPeca } from "../../tipos/dominio";
import "./barra.css";

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
  // Qual dos dois niveis esta aberto. Decide a barra inteira.
  nivel: "core" | "workspace";
  aoNavegar: (tela: string) => void;
  ideAberta: boolean;
  aoAlternarIde: () => void;
  mapaDisponivel: boolean;
}

// Menu lateral fixo, com UM NIVEL DE CADA VEZ desde 2026-07-27.
//
// Ate esta rodada os dois niveis ficavam empilhados na mesma barra. Media-se
// 650px de moldura fixa antes de sobrar espaco pro menu do projeto: num
// notebook de 768px o menu do workspace virava uma fresta de 81px, e num de
// 720px, 33px. A pessoa nao conseguia chegar nos proprios itens.
//
// Agora o CORE e o WORKSPACE sao dois modos. No CORE aparecem so as cinco areas
// do dono e a porta pro projeto aberto. Dentro de um projeto aparece so o
// projeto, com a volta pro CORE no topo. Ver docs/decisoes/2026-07-27-um-nivel-por-vez.md.
//
// O seletor de workspace fica FORA da area que rola de proposito: um ancestral
// com overflow recorta o popover dele.
export function Sidebar({
  itensFluxo,
  itensFonte,
  telaAtiva,
  nivel,
  aoNavegar,
  ideAberta,
  aoAlternarIde,
  mapaDisponivel,
}: Props) {
  const {
    ambiente,
    wsConectado,
    sessoes,
    estadoVkos,
    custos,
    workspaces,
  } = usarEstado();

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
  // Anuncio nao entra na galeria unificada: ela e de peca de IMAGEM, e campanha
  // de Google Ads nao tem miniatura. Sem item proprio aqui, o dono so voltava
  // numa campanha pelo cartao de recentes ou digitando o endereco.
  const itemAnuncio = itensFluxo.find((i) => i.tipo === "anuncio");
  const temConteudo = galeriasTotal > 0 || !!itemSite || !!itemAnuncio;
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

  // A quebra por tipo de token e o total geral saíram das linhas soltas do
  // rodapé e entraram aqui, na dica. Não é informação a menos: é a mesma
  // informação, a um passar de mouse, num rodapé que precisava caber num
  // notebook. O total geral também continua inteiro no Dashboard do CORE.
  const dicaDoRodape = [
    custoEstimado ? "Valor aproximado, estimado por tabela de preços." : "",
    temTotalGeral
      ? `Geral (todos os workspaces, inclusive os já removidos): ${
          totalGeralEhPiso ? "no mínimo " : ""
        }${totalGeralEstimado ? "~" : ""}$${totalGeral.toFixed(2)}.`
      : "",
    dicaTokens,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={`sidebar sidebar-nivel-${nivel}`}>
      <div className="sidebar-marca-bloco">
        <div className="sidebar-marca">
          <Marca />
          <BotaoTema />
        </div>
        {/* O triangulo de alerta saiu daqui pela regra 7 do contrato: ele marca
            o que e alerta, e "Versão Beta" e nota permanente, nao evento. Um
            triangulo fixo no canto de toda tela ensina a ignorar triangulo, e
            ai o de verdade nao e mais lido. O texto e a dica continuam. */}
        <span
          className="sidebar-marca-beta"
          title="Versão em testes: alguns fluxos ainda podem apresentar erros."
        >
          Versão Beta
        </span>
      </div>

      {nivel === "core" ? (
        <NavegacaoCore
          telaAtiva={telaAtiva}
          aoNavegar={aoNavegar}
          totalWorkspaces={workspaces.length}
          mapaDisponivel={mapaDisponivel}
          ideAberta={ideAberta}
          aoAlternarIde={aoAlternarIde}
        />
      ) : (
        <NavegacaoWorkspace
          telaAtiva={telaAtiva}
          aoNavegar={aoNavegar}
          galeriasTotal={galeriasTotal}
          itemSite={itemSite}
          itemAnuncio={itemAnuncio}
          temConteudo={temConteudo}
          temFontes={itensFonte.length > 0}
          totalFontes={totalFontes}
        />
      )}

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
          {/* O menta so pinta a contagem quando ha sessao viva. Verde fixo com
              zero rodando e cor dizendo o contrario do numero ao lado. */}
          <span
            className={`rodape-sessoes${ativas > 0 ? " vivo" : ""}`}
            title="Sessões ativas no limite de 5"
          >
            {ativas} / {LIMITE_SESSOES}
          </span>
        </div>

        {/* O gasto do projeto so aparece dentro do projeto. No CORE quem manda
            e o Dashboard, que mostra o total de todos os workspaces com muito
            mais contexto do que caberia aqui. */}
        {nivel === "workspace" && (
          /* Um dado forte por bloco (regra 5 do contrato). O valor vem
             primeiro, com tratamento de numero, e o rotulo corre depois dele
             como frase normal. Antes era o contrario: "GASTO DESTE WORKSPACE"
             em caixa alta a esquerda e o numero a direita, e numa barra de
             248px o rotulo quebrava em duas linhas com o valor pendurado no
             alto. A pasta perdeu a caixa monoespacada: e um dado que ninguem
             edita, entao nao pode ter peso de campo. */
          <div className="rodape-projeto" title={dicaDoRodape}>
            <p className="rodape-projeto-linha">
              <span className="rodape-projeto-valor">
                {totalEhPiso ? "≥ " : ""}
                {custoEstimado ? "~" : ""}${totalGasto.toFixed(2)}
              </span>
              <span className="rodape-projeto-rotulo">gasto neste workspace</span>
            </p>
            {/* O alerta de piso nunca sai. Ele e o que impede o numero de
                parecer exato quando nao e. */}
            {totalEhPiso && (
              <p className="rodape-projeto-ressalva">
                {turnosSemCusto === 1
                  ? "1 turno gastou sem preço conhecido. O valor real é maior."
                  : `${turnosSemCusto} turnos gastaram sem preço conhecido. O valor real é maior.`}
              </p>
            )}
            <p className="rodape-projeto-pasta" title={estadoVkos?.pasta ?? ""}>
              {nomePasta}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

// A barra do CORE: as areas do dono, em tres grupos por funcao. Nada aqui muda
// quando se troca de workspace. Entra-se no projeto pela tela Workspaces.
//
// Os grupos existem porque a lista cresceu e uma pilha de sete itens iguais nao
// diz o que e o que: CORE e onde se olha o negocio, GESTAO e onde se toca em
// cliente e dinheiro, SISTEMA e a maquina do Hub. O separador e o mesmo fio do
// rotulo de nivel, que ja nasceu sutil de proposito, entao nenhum grupo ganha
// peso visual sobre o outro.
function NavegacaoCore({
  telaAtiva,
  aoNavegar,
  totalWorkspaces,
  mapaDisponivel,
  ideAberta,
  aoAlternarIde,
}: {
  telaAtiva: string;
  aoNavegar: (tela: string) => void;
  totalWorkspaces: number;
  mapaDisponivel: boolean;
  ideAberta: boolean;
  aoAlternarIde: () => void;
}) {
  return (
    <nav className="sidebar-nav sidebar-nav-rolante">
      <div className="sidebar-secao">
        <span className="rotulo-grupo">Core</span>
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
        className={`item-nav${telaAtiva === "assistente" ? " ativo" : ""}`}
        aria-current={telaAtiva === "assistente" ? "page" : undefined}
        onClick={() => aoNavegar("assistente")}
      >
        <IconeAssistente />
        <span className="item-nav-rotulo">Assistente</span>
      </button>
      <button
        className={`item-nav${telaAtiva === "clientes" ? " ativo" : ""}`}
        aria-current={telaAtiva === "clientes" ? "page" : undefined}
        onClick={() => aoNavegar("clientes")}
      >
        <IconeClientes />
        <span className="item-nav-rotulo">Clientes</span>
      </button>
      <button
        className={`item-nav${telaAtiva === "workspaces" ? " ativo" : ""}`}
        aria-current={telaAtiva === "workspaces" ? "page" : undefined}
        onClick={() => aoNavegar("workspaces")}
      >
        <IconeWorkspaces />
        <span className="item-nav-rotulo">Workspaces</span>
        {totalWorkspaces > 0 && (
          <span className="contagem">{totalWorkspaces}</span>
        )}
      </button>

      <div className="sidebar-secao">
        <span className="rotulo-grupo">Gestão</span>
      </div>
      <button
        className={`item-nav${telaAtiva === "crm" ? " ativo" : ""}`}
        aria-current={telaAtiva === "crm" ? "page" : undefined}
        onClick={() => aoNavegar("crm")}
      >
        <IconeCrm />
        <span className="item-nav-rotulo">CRM</span>
      </button>
      <button
        className={`item-nav${telaAtiva === "financas" ? " ativo" : ""}`}
        aria-current={telaAtiva === "financas" ? "page" : undefined}
        onClick={() => aoNavegar("financas")}
      >
        <IconeFinancas />
        <span className="item-nav-rotulo">Finanças</span>
      </button>

      <div className="sidebar-secao">
        <span className="rotulo-grupo">Sistema</span>
      </div>
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

      {/* A VKOS-IDE fica no pe da barra do CORE, ancorada no fim da navegacao
          (margin-top:auto) e separada por uma borda, acima do rodape. Ela e
          ferramenta do dono, nao item de projeto: por isso vive so aqui. */}
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
  );
}

// A barra do workspace: so o projeto aberto. A volta pro CORE fica no topo,
// antes de qualquer coisa, porque sair do projeto e o gesto mais importante
// desta barra.
function NavegacaoWorkspace({
  telaAtiva,
  aoNavegar,
  galeriasTotal,
  itemSite,
  itemAnuncio,
  temConteudo,
  temFontes,
  totalFontes,
}: {
  telaAtiva: string;
  aoNavegar: (tela: string) => void;
  galeriasTotal: number;
  itemSite: ItemFluxo | undefined;
  itemAnuncio: ItemFluxo | undefined;
  temConteudo: boolean;
  temFontes: boolean;
  totalFontes: number;
}) {
  return (
    <>
      <button className="sidebar-voltar-core" onClick={() => aoNavegar("dashboard")}>
        <IconeSeta className="sidebar-voltar-seta" />
        <span>Core</span>
      </button>

      {/* Fora da area que rola: o popover do seletor precisa poder passar da
          borda da barra, e um ancestral com overflow recorta ele. */}
      <SeletorWorkspace />

      <nav className="sidebar-nav sidebar-nav-rolante">
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
              <span className="rotulo-grupo">Conteúdo</span>
            </div>
            {galeriasTotal > 0 && (
              <button
                className={`item-nav${telaAtiva === "galerias" ? " ativo" : ""}`}
                aria-current={telaAtiva === "galerias" ? "page" : undefined}
                onClick={() => aoNavegar("galerias")}
              >
                <IconeGalerias />
                <span className="item-nav-rotulo">Galerias</span>
                <span className="contagem">{galeriasTotal}</span>
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
                <span className="contagem">{itemSite.total}</span>
              </button>
            )}
            {itemAnuncio && (
              <button
                className={`item-nav${telaAtiva === "fluxo:anuncio" ? " ativo" : ""}`}
                aria-current={telaAtiva === "fluxo:anuncio" ? "page" : undefined}
                onClick={() => aoNavegar("fluxo:anuncio")}
              >
                <IconeAnuncio className="" />
                <span className="item-nav-rotulo">{ROTULO_TIPO.anuncio}</span>
                <span className="contagem">{itemAnuncio.total}</span>
              </button>
            )}
          </>
        )}

        {temFontes && (
          <>
            <div className="sidebar-secao sidebar-subsecao">
              <span className="rotulo-grupo">Fontes de dados</span>
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
              <span className="contagem">{totalFontes}</span>
            </button>
          </>
        )}

      </nav>
    </>
  );
}

// Dois temas: "escuro", o padrao da identidade, e "claro".
// O Dark VKOS se aposentou junto com a identidade antiga; um "vkos" salvo
// migra pro escuro no index.html, antes do bundle carregar. O tema vive em
// data-theme na raiz e persiste no localStorage; o index.html reaplica o
// salvo antes do bundle, entao nao ha flash na abertura.
type Tema = "claro" | "escuro";

const OPCOES_TEMA: { id: Tema; nome: string }[] = [
  { id: "escuro", nome: "Escuro" },
  { id: "claro", nome: "Claro" },
];

function lerTema(): Tema {
  const t = document.documentElement.dataset.theme;
  return t === "claro" ? "claro" : "escuro";
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
      {/* O botao e o menu vestem as primitivas: .botao e .popover mais .menu.
          A folha da casca so ancora o popover no canto do botao. */}
      <button
        className="botao botao-fantasma botao-icone botao-p"
        onClick={() => setAberto((v) => !v)}
        title="Trocar o tema"
        aria-label="Trocar o tema"
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        {tema === "claro" ? <IconeSol /> : <IconeLua />}
      </button>
      {aberto && (
        <div className="popover barra-tema-menu" role="menu">
          <div className="menu">
            {OPCOES_TEMA.map((opcao) => (
              <button
                key={opcao.id}
                className="menu-item"
                onClick={() => escolher(opcao.id)}
                role="menuitemradio"
                aria-checked={tema === opcao.id}
              >
                {opcao.nome}
                {tema === opcao.id && <IconeCheck />}
              </button>
            ))}
          </div>
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

// Clientes: uma ficha, com a pessoa de um lado e os dados do outro.
//
// A primeira versao eram duas pessoas lado a lado, e na barra ficou quase
// identica ao icone do CRM, que tambem e feito de duas pessoas. Dois itens
// vizinhos com a mesma silhueta obrigam a ler o rotulo pra saber qual e qual, e
// ai o icone virou enfeite. A ficha diz cadastro, que e o que a tela vai ser, e
// nao se confunde com o funil.
function IconeClientes() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <circle cx="8.5" cy="10.5" r="2" />
      <path d="M5.5 16c.5-1.7 1.6-2.5 3-2.5s2.5.8 3 2.5" />
      <path d="M14.8 10h3.7M14.8 13.5h2.7" />
    </svg>
  );
}

// Financas: uma nota com a cifra. Dinheiro que entra e sai, nao grafico: o
// grafico ja e a linguagem do gasto com IA no Dashboard.
function IconeFinancas() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 10v4M18 10v4" />
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

function IconeAssistente() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 4v-4H7.5A2.5 2.5 0 0 1 5 12.5Z" />
      <path d="M9 9h6M9 12h3" />
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
