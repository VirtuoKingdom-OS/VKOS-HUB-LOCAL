import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { usarEstado } from "../../estado/contexto";
import { usarGeracao, type TipoGeracao } from "../../estado/geracao";
import type { Peca } from "../../tipos/dominio";
import { formatarTema } from "../telas/fluxos";
import {
  IconeCarrossel,
  IconeFluxo,
  IconeGaleria,
  IconePost,
  IconeSeta,
  IconeSite,
  IconeStories,
} from "../comum/Icones";
import { MiniaturaSite } from "../cockpit/MiniaturaSite";
import { paginaInicialSite } from "../cockpit/PreviewSite";
import "../../estilos/dashboard.css";

// Tipo de conteudo visual que o seletor oferece.
type TipoConteudoVisual = "carrossel" | "post" | "story";

interface Props {
  aoCriar: (tipo: TipoGeracao) => void;
}

// Vai pro Studio de uma peca (pasta URL-encoded no hash).
function irParaStudio(pasta: string) {
  window.location.hash = "#/studio/" + encodeURIComponent(pasta);
}

// Vai pra tela de um site (pasta URL-encoded no hash).
function irParaSite(pasta: string) {
  window.location.hash = "#/site/" + encodeURIComponent(pasta);
}

// Rota de abertura de uma peca a partir do card de recentes: fonteHtml pronta
// abre o Studio; site vai pra tela do site; peca legada abre a galeria.
function abrirPeca(peca: Peca) {
  if (peca.fonteHtml && (peca.paginas ?? 0) > 0) {
    irParaStudio(peca.pasta);
    return;
  }
  if (peca.tipo === "site") {
    irParaSite(peca.pasta);
    return;
  }
  window.location.hash = "#/galerias";
}

// Porta de entrada simplificada: saudacao, criacao guiada de carrossel, cards
// "em breve", criacoes recentes e atalhos discretos pro modo avancado.
export function TelaDashboard({ aoCriar }: Props) {
  const { pecas, workspaces, workspaceAtivo, estadoVkos } = usarEstado();
  const { ativa } = usarGeracao();
  // Seletor de tipo (Carrossel/Post/Story) abre antes da rota do assistente.
  const [seletorAberto, setSeletorAberto] = useState(false);

  // Nome do cliente ativo: prefere o rotulo do workspace, cai no nome da pasta.
  const nomeWorkspace = useMemo(() => {
    const ws = workspaces.find((w) => w.id === workspaceAtivo);
    if (ws?.nome) return ws.nome;
    if (estadoVkos?.pasta) {
      return (
        estadoVkos.pasta.split(/[\\/]/).filter(Boolean).pop() ?? "seu negócio"
      );
    }
    return "seu negócio";
  }, [workspaces, workspaceAtivo, estadoVkos]);

  // Pecas criadas nos ultimos 7 dias, pra linha de contexto do cabecalho.
  const criadasSemana = useMemo(() => {
    const agora = Date.now();
    const seteDias = 7 * 24 * 60 * 60 * 1000;
    return pecas.filter((p) => {
      const t = Date.parse(p.data);
      return !Number.isNaN(t) && agora - t <= seteDias && agora - t >= -seteDias;
    }).length;
  }, [pecas]);

  // Ultimas pecas, mais novas primeiro (a pasta comeca com a data AAAA-MM-DD).
  const recentes = useMemo(
    () =>
      [...pecas]
        .sort((a, b) => (a.pasta < b.pasta ? 1 : a.pasta > b.pasta ? -1 : 0))
        .slice(0, 8),
    [pecas]
  );

  const restaurarGeracaoAtiva = useCallback((): boolean => {
    if (!ativa) return false;
    setSeletorAberto(false);
    aoCriar(ativa.tipo);
    return true;
  }, [ativa, aoCriar]);

  const abrirConteudoVisual = useCallback(() => {
    if (!restaurarGeracaoAtiva()) setSeletorAberto(true);
  }, [restaurarGeracaoAtiva]);

  const abrirSiteGuiado = useCallback(() => {
    if (!restaurarGeracaoAtiva()) aoCriar("site");
  }, [restaurarGeracaoAtiva, aoCriar]);

  const escolherTipo = useCallback((tipo: TipoConteudoVisual) => {
    if (restaurarGeracaoAtiva()) return;
    setSeletorAberto(false);
    aoCriar(tipo);
  }, [restaurarGeracaoAtiva, aoCriar]);

  const rotuloGeracao = (tipo: TipoGeracao) =>
    tipo === "site" ? "site" : tipo === "story" ? "story" : tipo === "post" ? "post" : "carrossel";

  const linhaContexto =
    criadasSemana > 0
      ? criadasSemana === 1
        ? "1 peça criada nos últimos dias."
        : `${criadasSemana} peças criadas nos últimos dias.`
      : "Vamos criar algo hoje?";

  return (
    <section className="tela-dashboard">
      <div className="dashboard-scroll">
        <header className="dashboard-cabecalho">
          <h1>
            Olá, <span className="dash-nome">{nomeWorkspace}</span>. O que
            vamos criar hoje?
          </h1>
          <p className="dashboard-contexto">{linhaContexto}</p>
        </header>

        <div className="dashboard-criar">
          <button
            className="dash-hero"
            onClick={abrirConteudoVisual}
            type="button"
          >
            <span className="dash-hero-icone">
              <IconeCarrossel className="" />
            </span>
            <span className="dash-hero-texto">
              <span className="dash-hero-titulo">Criar Conteúdo Visual</span>
              <span className="dash-hero-sub">
                {ativa
                  ? `Há um ${rotuloGeracao(ativa.tipo)} em geração. Clique para acompanhar.`
                  : "Carrossel, post ou story, guiado por perguntas simples."}
              </span>
            </span>
            <span className="dash-hero-seta">
              <IconeSeta className="" />
            </span>
          </button>

          <button
            className="dash-hero dash-hero-secundario dash-hero-ativo"
            onClick={abrirSiteGuiado}
            type="button"
          >
            <span className="dash-hero-icone">
              <IconeSite className="" />
            </span>
            <span className="dash-hero-texto">
              <span className="dash-hero-titulo">Site Guiado</span>
              <span className="dash-hero-sub">
                {ativa
                  ? `Uma criação já está em andamento. Clique para acompanhar.`
                  : "Um site inteiro, passo a passo, direto do Cérebro."}
              </span>
            </span>
            <span className="dash-hero-seta">
              <IconeSeta className="" />
            </span>
          </button>
        </div>

        <section className="dashboard-recentes">
          <div className="recentes-topo">
            <h2>Criações recentes</h2>
            {recentes.length > 0 && (
              <button
                className="recentes-vertodas"
                onClick={() => {
                  window.location.hash = "#/galerias";
                }}
                type="button"
              >
                Ver galerias
                <IconeSeta className="" />
              </button>
            )}
          </div>

          {recentes.length === 0 ? (
            <div className="recentes-vazio">
              <IconeGaleria className="" style={{ width: 34, height: 34 }} />
              <p>Nada por aqui ainda. Crie seu primeiro conteúdo.</p>
              <button
                className="botao botao-principal"
                onClick={abrirConteudoVisual}
                type="button"
              >
                Criar conteúdo
              </button>
            </div>
          ) : (
            <div className="recentes-tira">
              {recentes.map((peca) => (
                <button
                  key={peca.pasta}
                  className="recente-item"
                  onClick={() => abrirPeca(peca)}
                  title={formatarTema(peca.tema)}
                  type="button"
                >
                  <MiniaturaPeca peca={peca} />
                  <span className="recente-titulo">
                    {formatarTema(peca.tema)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="dashboard-atalhos">
          <button
            className="dash-atalho"
            onClick={() => {
              window.location.hash = "#/cockpit";
            }}
            type="button"
          >
            <IconeCockpitMini />
            <span>
              <strong>Cockpit</strong>
              <em>Modo avançado, canvas completo</em>
            </span>
          </button>
          <button
            className="dash-atalho"
            onClick={() => {
              window.location.hash = "#/galerias";
            }}
            type="button"
          >
            <IconeGaleria className="" />
            <span>
              <strong>Galerias</strong>
              <em>Todas as peças de imagem</em>
            </span>
          </button>
        </div>
      </div>

      {seletorAberto && (
        <div
          className="dash-overlay-wizard"
          onClick={() => setSeletorAberto(false)}
        >
          <div
            className="dash-seletor"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="dash-seletor-titulo">O que vamos criar?</h2>
            <div className="dash-seletor-grade">
              <CardTipo
                titulo="Carrossel"
                descricao="Várias páginas em sequência, ideal pra ensinar ou contar algo."
                Icone={IconeCarrossel}
                onClick={() => escolherTipo("carrossel")}
              />
              <CardTipo
                titulo="Post"
                descricao="Uma imagem só, pronta pro feed."
                Icone={IconePost}
                onClick={() => escolherTipo("post")}
              />
              <CardTipo
                titulo="Story"
                descricao="Vertical, feito pros stories do Instagram."
                Icone={IconeStories}
                onClick={() => escolherTipo("story")}
              />
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

// Card de um tipo no seletor "O que vamos criar?". Escolher abre a rota do
// assistente com o tipo correspondente.
function CardTipo({
  titulo,
  descricao,
  Icone,
  onClick,
}: {
  titulo: string;
  descricao: string;
  Icone: (p: { className?: string }) => ReactElement;
  onClick: () => void;
}) {
  return (
    <button className="dash-seletor-card" onClick={onClick} type="button">
      <span className="dash-seletor-card-icone">
        <Icone className="" />
      </span>
      <span className="dash-seletor-card-titulo">{titulo}</span>
      <span className="dash-seletor-card-descricao">{descricao}</span>
    </button>
  );
}

// Miniatura de uma peca no carrossel de recentes: site usa o MiniaturaSite
// vivo do cockpit (rodada 17, proporcao de tela, nao de poster); peca
// fonteHtml vira um mini-iframe da capa escalado (mesmo principio do
// CartaoPeca da rodada 12); peca legada mostra a imagem; sem previa, um
// icone do tipo.
function MiniaturaPeca({ peca }: { peca: Peca }) {
  if (peca.tipo === "site") {
    const pagina = paginaInicialSite(peca);
    if (!pagina) {
      return (
        <div className="recente-thumb vazia">
          <IconeFluxo id={peca.tipo} className="" />
        </div>
      );
    }
    return (
      <div className="recente-thumb recente-thumb-site">
        <MiniaturaSite url={pagina} titulo={formatarTema(peca.tema)} />
      </div>
    );
  }
  const url = peca.previews[0];
  if (!url) {
    return (
      <div className="recente-thumb vazia">
        <IconeFluxo id={peca.tipo} className="" />
      </div>
    );
  }
  if (peca.fonteHtml) {
    return <MiniPagina url={url} />;
  }
  return (
    <div className="recente-thumb">
      <img src={url} loading="lazy" decoding="async" alt="" />
    </div>
  );
}

// Mini-iframe da capa de uma peca fonteHtml: monta perto da tela, le o tamanho
// real do slide e escala com transform pra caber na moldura. Sem interacao (o
// botao em volta e o alvo do clique).
function MiniPagina({ url }: { url: string }) {
  const refCaixa = useRef<HTMLDivElement>(null);
  const refIframe = useRef<HTMLIFrameElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [dims, setDims] = useState<{ largura: number; altura: number } | null>(
    null
  );
  const [fator, setFator] = useState(0);

  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setVisivel(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(caixa);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa || !dims) return;
    const medir = () => {
      const f = caixa.clientWidth / dims.largura;
      setFator(f > 0 ? f : 0);
    };
    const ro = new ResizeObserver(medir);
    ro.observe(caixa);
    medir();
    return () => ro.disconnect();
  }, [dims]);

  function aoCarregar() {
    const doc = refIframe.current?.contentDocument;
    if (!doc?.body) return;
    setDims({ largura: doc.body.scrollWidth, altura: doc.body.scrollHeight });
  }

  return (
    <div className="recente-thumb" ref={refCaixa}>
      {visivel && (
        <iframe
          ref={refIframe}
          className="recente-thumb-frame"
          src={url}
          title=""
          tabIndex={-1}
          aria-hidden="true"
          onLoad={aoCarregar}
          style={
            dims && fator > 0
              ? {
                  width: `${dims.largura}px`,
                  height: `${dims.altura}px`,
                  transform: `scale(${fator})`,
                }
              : { opacity: 0 }
          }
        />
      )}
    </div>
  );
}

// Icone do Cockpit em miniatura pro atalho (o mesmo tracado do da sidebar).
function IconeCockpitMini() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </svg>
  );
}
