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
import { Botao } from "../comum/Botao";
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
import { irParaPeca, irParaTela } from "../layout/rotas";
import "./dashboard.css";

// Tipo de conteudo visual que o seletor oferece.
type TipoConteudoVisual = "carrossel" | "post" | "story";

interface Props {
  aoCriar: (tipo: TipoGeracao) => void;
}

// Vai pro Studio de uma peca (pasta URL-encoded no caminho).
function irParaStudio(pasta: string) {
  irParaPeca("studio", pasta);
}

// Vai pra tela de um site (pasta URL-encoded no caminho).
function irParaSite(pasta: string) {
  irParaPeca("site", pasta);
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
  irParaTela("galerias");
}

// Tela de trabalho do workspace aberto: cabecalho com o nome do projeto e a
// acao principal, o que esta sendo gerado agora, as criacoes recentes e pra
// onde ir depois.
//
// REDESENHADA na Fase 2 do redesign v2 (2026-07-30). O que mudou, e por que:
//
// 1. A SAUDACAO DE 30px SAIU. Ela custava uma faixa inteira de tela pra dizer o
//    nome do workspace e fazer uma pergunta que os dois botoes ja respondem. O
//    cabecalho agora e a linha de 56px das primitivas, com o nome do projeto e
//    a acao principal no mesmo lugar de todas as outras telas do Hub.
// 2. OS DOIS CARTOES DE CRIAR VIRARAM DOIS BOTOES. Eram dois blocos de 92px
//    com caixa de icone, titulo, subtitulo e seta pra disparar duas rotas.
//    "Criar conteudo" e a acao principal; "Site guiado" e a neutra ao lado.
// 3. A GERACAO EM CURSO GANHOU VOZ PROPRIA. Antes ela virava um subtitulo
//    dentro do cartao, que so se lia depois de procurar. Agora e uma faixa com
//    o ponto vivo: e o unico menta desta tela, e ele diz exatamente o que o
//    menta deve dizer.
// 4. OS ATALHOS VIRARAM LISTA. Dois cartoes de 56px pra dois destinos de
//    navegacao viraram duas linhas de lista, o formato de dado padrao do Hub.
export function TelaWorkspace({ aoCriar }: Props) {
  const { pecas, workspaces, workspaceAtivo, estadoVkos } = usarEstado();
  const { ativa } = usarGeracao();
  // Seletor de tipo (Carrossel/Post/Story) abre antes da rota do assistente.
  const [seletorAberto, setSeletorAberto] = useState(false);

  // Nome do workspace aberto: prefere o rotulo do registro, cai no da pasta.
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

  const escolherTipo = useCallback(
    (tipo: TipoConteudoVisual) => {
      if (restaurarGeracaoAtiva()) return;
      setSeletorAberto(false);
      aoCriar(tipo);
    },
    [restaurarGeracaoAtiva, aoCriar]
  );

  // Esc fecha o seletor. Sem isto, a unica saida era clicar no veu, que nao
  // existe pra quem navega por teclado.
  useEffect(() => {
    if (!seletorAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSeletorAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [seletorAberto]);

  const rotuloGeracao = (tipo: TipoGeracao) =>
    tipo === "site"
      ? "site"
      : tipo === "story"
        ? "story"
        : tipo === "post"
          ? "post"
          : "carrossel";

  // A linha do cabecalho diz o que aconteceu, e cala quando nao ha nada a
  // dizer: repetir "vamos criar algo hoje" abaixo do nome do projeto custa
  // altura e nao informa.
  const linhaContexto =
    criadasSemana === 0
      ? "Nenhuma peça criada nos últimos dias."
      : criadasSemana === 1
        ? "1 peça criada nos últimos dias."
        : `${criadasSemana} peças criadas nos últimos dias.`;

  return (
    <section className="tela tela-inicio">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1 title={nomeWorkspace}>{nomeWorkspace}</h1>
          <p>{linhaContexto}</p>
        </div>
        <div className="tela-topo-acoes">
          <Botao onClick={abrirSiteGuiado}>Site guiado</Botao>
          <Botao variante="principal" onClick={abrirConteudoVisual}>
            Criar conteúdo
          </Botao>
        </div>
      </header>

      <div className="tela-corpo">
        {/* O unico menta da tela, e ele diz o que o menta deve dizer: isto
            esta acontecendo agora. */}
        {ativa && (
          <div className="faixa faixa-boa inicio-faixa-viva" role="status">
            <span className="ponto-vivo" />
            <div className="faixa-texto">
              Um {rotuloGeracao(ativa.tipo)} está sendo gerado agora.
            </div>
            <div className="faixa-acoes">
              <Botao tamanho="p" onClick={() => aoCriar(ativa.tipo)}>
                Acompanhar
              </Botao>
            </div>
          </div>
        )}

        <section className="secao">
          <div className="secao-topo">
            <h2>Criações recentes</h2>
            {recentes.length > 0 && (
              <Botao
                variante="fantasma"
                tamanho="p"
                onClick={() => {
                  irParaTela("galerias");
                }}
              >
                Ver galerias
                <IconeSeta className="inicio-seta" />
              </Botao>
            )}
          </div>

          {recentes.length === 0 ? (
            <div className="vazio">
              <IconeGaleria className="" />
              <h2>Nada criado ainda</h2>
              <p>
                Cada carrossel, post, story ou site que você criar aparece aqui,
                pronto pra abrir e editar.
              </p>
              <Botao onClick={abrirConteudoVisual}>Criar a primeira peça</Botao>
            </div>
          ) : (
            <div className="inicio-tira">
              {recentes.map((peca) => (
                <button
                  key={peca.pasta}
                  className="cartao cartao-alvo inicio-peca"
                  onClick={() => abrirPeca(peca)}
                  title={formatarTema(peca.tema)}
                  type="button"
                >
                  <MiniaturaPeca peca={peca} />
                  <span className="inicio-peca-titulo">
                    {formatarTema(peca.tema)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="secao">
          <div className="secao-topo">
            <h2>Ir para</h2>
          </div>
          <div className="lista">
            <button
              className="item-lista"
              onClick={() => {
                irParaTela("cockpit");
              }}
              type="button"
            >
              <IconeCockpitMini />
              <span className="item-lista-texto">
                <span className="item-lista-titulo">Cockpit</span>
                <span className="item-lista-meta">
                  Modo avançado, canvas completo
                </span>
              </span>
              <IconeSeta className="inicio-seta" />
            </button>
            <button
              className="item-lista"
              onClick={() => {
                irParaTela("galerias");
              }}
              type="button"
            >
              <IconeGaleria className="inicio-icone-lista" />
              <span className="item-lista-texto">
                <span className="item-lista-titulo">Galerias</span>
                <span className="item-lista-meta">
                  Todas as peças de imagem
                </span>
              </span>
              <IconeSeta className="inicio-seta" />
            </button>
          </div>
        </section>
      </div>

      {seletorAberto && (
        <div className="veu-modal" onClick={() => setSeletorAberto(false)}>
          <div
            className="modal inicio-seletor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inicio-seletor-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-topo">
              <h2 id="inicio-seletor-titulo">O que vamos criar?</h2>
              <Botao
                variante="fantasma"
                tamanho="p"
                soIcone
                aria-label="Fechar"
                onClick={() => setSeletorAberto(false)}
              >
                <IconeX />
              </Botao>
            </div>
            <div className="modal-corpo">
              <div className="lista">
                <LinhaTipo
                  titulo="Carrossel"
                  descricao="Várias páginas em sequência, pra ensinar ou contar algo."
                  Icone={IconeCarrossel}
                  onClick={() => escolherTipo("carrossel")}
                />
                <LinhaTipo
                  titulo="Post"
                  descricao="Uma imagem só, pronta pro feed."
                  Icone={IconePost}
                  onClick={() => escolherTipo("post")}
                />
                <LinhaTipo
                  titulo="Story"
                  descricao="Vertical, feito pros stories do Instagram."
                  Icone={IconeStories}
                  onClick={() => escolherTipo("story")}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Uma linha do seletor "O que vamos criar?". Lista densa em vez de tres
// cartoes: o formato de dado padrao do Hub, e aqui o registro nao tem imagem.
function LinhaTipo({
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
    <button className="item-lista" onClick={onClick} type="button">
      <Icone className="inicio-icone-lista" />
      <span className="item-lista-texto">
        <span className="item-lista-titulo">{titulo}</span>
        <span className="item-lista-meta">{descricao}</span>
      </span>
      <IconeSeta className="inicio-seta" />
    </button>
  );
}

// Miniatura de uma peca na tira de recentes: site usa o MiniaturaSite vivo do
// cockpit (proporcao de tela, nao de poster); peca fonteHtml vira um
// mini-iframe da capa escalado; peca legada mostra a imagem; sem previa, um
// icone do tipo.
function MiniaturaPeca({ peca }: { peca: Peca }) {
  if (peca.tipo === "site") {
    const pagina = paginaInicialSite(peca);
    if (!pagina) {
      return (
        <div className="inicio-peca-thumb vazia">
          <IconeFluxo id={peca.tipo} className="" />
        </div>
      );
    }
    return (
      <div className="inicio-peca-thumb inicio-peca-thumb-site">
        <MiniaturaSite url={pagina} titulo={formatarTema(peca.tema)} />
      </div>
    );
  }
  const url = peca.previews[0];
  if (!url) {
    return (
      <div className="inicio-peca-thumb vazia">
        <IconeFluxo id={peca.tipo} className="" />
      </div>
    );
  }
  if (peca.fonteHtml) {
    return <MiniPagina url={url} />;
  }
  return (
    <div className="inicio-peca-thumb">
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
    <div className="inicio-peca-thumb" ref={refCaixa}>
      {visivel && (
        <iframe
          ref={refIframe}
          className="inicio-peca-frame"
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
    <svg
      className="inicio-icone-lista"
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </svg>
  );
}

// X do cabecalho do seletor.
function IconeX() {
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
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
