import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "../../estilos/mapa.css";
import { usarEstado } from "../../estado/contexto";
import { navegarParaCaminho, telaParaCaminho } from "../layout/rotas";
import type { Contexto, Peca, TipoPeca } from "../../tipos/dominio";

// ===== Mapa de Telas: espelho visual do app, sem efeito no sistema. =====
// O dado vem de /api/mapa/telas (interno/mapa-telas.json). Cada no e uma tela,
// rota ou estado; o botao Abrir navega pelo History API, o mesmo caminho do Voltar do
// navegador. Nada aqui muda o comportamento real de navegacao.

interface ZonaTela {
  id: string;
  nome: string;
  cor: string;
}

interface TelaMapa {
  id: string;
  zona: string;
  nome: string;
  rota: string;
  destino: string | null;
  resumo: string;
  descricao: string;
  estados: string[];
  esqueleto: string;
}

interface LigacaoTela {
  de: string;
  para: string;
  gesto: string;
}

interface JornadaTela {
  id: string;
  nome: string;
  resumo: string;
  cor: string;
  passos: string[];
}

interface MapaTelas {
  versao: number;
  zonas: ZonaTela[];
  telas: TelaMapa[];
  ligacoes: LigacaoTela[];
  jornadas: JornadaTela[];
}

interface RespostaMapaTelas {
  disponivel: boolean;
  mapa?: MapaTelas;
}

const CORES_PERMITIDAS = new Set(["menta", "amarelo", "alerta", "suave", "fraco"]);

function corSegura(cor: string): string {
  return CORES_PERMITIDAS.has(cor) ? cor : "suave";
}

// Largura da coluna de zona e altura entre telas na mesma zona. O cartao real
// passa de 350px de altura com resumo e estados; o espacamento fica bem acima
// disso pra sobrar respiro mesmo na zona mais cheia (Hub, 8 telas).
const LARGURA_ZONA = 480;
const ALTURA_TELA = 420;

// Tipos de peca de imagem (Studio) e de site (Tela do Site).
const TIPOS_IMAGEM: TipoPeca[] = ["carrossel", "post", "stories"];

type Resolucao = { caminho: string } | { motivo: string };

// A peca mais recente de um conjunto de tipos, pra resolver os destinos @.
function pecaMaisRecente(pecas: Peca[], tipos: TipoPeca[]): Peca | null {
  const candidatas = pecas.filter((p) => tipos.includes(p.tipo));
  if (candidatas.length === 0) return null;
  return candidatas
    .slice()
    .sort((a, b) =>
      (b.criadoEm ?? b.data ?? "").localeCompare(a.criadoEm ?? a.data ?? ""),
    )[0];
}

// Converte o destino do dado em um caminho navegavel. Destinos @ dependem do
// cliente ativo: sem candidato, devolve um motivo pra desabilitar o botao.
function resolverDestino(
  destino: string,
  pecas: Peca[],
  contextos: Contexto[],
): Resolucao {
  if (destino === "ide") return { caminho: "/ide" };

  if (destino.startsWith("studio:@")) {
    const peca = pecaMaisRecente(pecas, TIPOS_IMAGEM);
    if (!peca) return { motivo: "Nenhuma peça de imagem neste cliente ainda." };
    return { caminho: `/studio/${encodeURIComponent(peca.pasta)}` };
  }
  if (destino.startsWith("site:@")) {
    const peca = pecaMaisRecente(pecas, ["site"]);
    if (!peca) return { motivo: "Nenhum site neste cliente ainda." };
    return { caminho: `/site/${encodeURIComponent(peca.pasta)}` };
  }
  if (destino.startsWith("fonte:@")) {
    const fonte = contextos[0];
    if (!fonte) return { motivo: "Nenhuma fonte de dados neste cliente ainda." };
    return { caminho: `/fonte/${fonte.tipo}` };
  }

  return { caminho: telaParaCaminho(destino) };
}

function abrir(caminho: string): void {
  navegarParaCaminho(caminho);
}

type DadosNoTela = {
  nome: string;
  rota: string;
  resumo: string;
  esqueleto: string;
  zonaNome: string;
  cor: string;
  estados: string[];
  abrirCaminho: string | null;
  abrirMotivo: string | null;
  passo?: number;
} & Record<string, unknown>;

// Mini esqueleto da tela, desenhado em CSS por token. Nao e screenshot: e um
// diagrama do layout, tema-aware de graca. Chave desconhecida cai no generico.
function EsqueletoTela({ tipo }: { tipo: string }) {
  const bloco = (chave: string) => <span className={`esq-bloco esq-${chave}`} />;
  let conteudo: React.ReactNode;
  switch (tipo) {
    case "splash":
      conteudo = <span className="esq-alvo" />;
      break;
    case "wizard":
      conteudo = (
        <>
          <div className="esq-passos">{bloco("p")}{bloco("p")}{bloco("p")}{bloco("p")}</div>
          {bloco("campo")}
          {bloco("campo")}
          <div className="esq-rodape">{bloco("botao")}</div>
        </>
      );
      break;
    case "dashboard":
      conteudo = (
        <>
          {bloco("topo")}
          <div className="esq-grade2">{bloco("card")}{bloco("card")}{bloco("card")}{bloco("card")}</div>
        </>
      );
      break;
    case "canvas":
      conteudo = (
        <div className="esq-canvas">
          <span className="esq-no" />
          <span className="esq-no esq-no-2" />
        </div>
      );
      break;
    case "kanban":
      conteudo = (
        <div className="esq-colunas">
          <div className="esq-coluna">{bloco("card-mini")}{bloco("card-mini")}</div>
          <div className="esq-coluna">{bloco("card-mini")}</div>
          <div className="esq-coluna">{bloco("card-mini")}{bloco("card-mini")}</div>
        </div>
      );
      break;
    case "grade":
      conteudo = <div className="esq-grade2">{bloco("card")}{bloco("card")}{bloco("card")}{bloco("card")}</div>;
      break;
    case "galeria":
      conteudo = <div className="esq-grade3">{bloco("tile")}{bloco("tile")}{bloco("tile")}{bloco("tile")}{bloco("tile")}{bloco("tile")}</div>;
      break;
    case "calendario":
      conteudo = <div className="esq-mes">{Array.from({ length: 14 }).map((_, i) => <span key={i} className="esq-dia" />)}</div>;
      break;
    case "mapa":
      conteudo = (
        <div className="esq-mapa">
          <span className="esq-mno" /><span className="esq-mlinha" /><span className="esq-mno esq-mno-2" />
        </div>
      );
      break;
    case "terminal":
      conteudo = (
        <div className="esq-terminal">{bloco("term")}{bloco("term")}{bloco("term-curto")}</div>
      );
      break;
    case "editor":
      conteudo = (
        <div className="esq-editor">
          <span className="esq-editor-canvas" />
          <span className="esq-editor-painel" />
        </div>
      );
      break;
    case "split":
      conteudo = (
        <div className="esq-split">
          <span className="esq-split-preview" />
          <span className="esq-split-painel" />
        </div>
      );
      break;
    case "lista":
    default:
      conteudo = (
        <>
          {bloco("linha")}
          {bloco("linha")}
          {bloco("linha-curta")}
        </>
      );
      break;
  }
  return <div className={`mapa-esq mapa-esq-${tipo}`} aria-hidden="true">{conteudo}</div>;
}

function NoTela({ data, selected }: NodeProps<Node<DadosNoTela, "tela">>) {
  const estados = data.estados.slice(0, 4);
  const resto = data.estados.length - estados.length;
  return (
    <div
      className={`mapa-no-tela mapa-cor-${corSegura(data.cor)}${
        selected ? " selecionado" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} className="mapa-handle mapa-handle-entrada" />
      {typeof data.passo === "number" && (
        <span className="mapa-no-passo" aria-hidden="true">{data.passo}</span>
      )}
      <span className="mapa-no-tela-zona">{data.zonaNome}</span>
      <EsqueletoTela tipo={data.esqueleto} />
      <strong className="mapa-no-tela-nome">{data.nome}</strong>
      <code className="mapa-no-tela-rota">{data.rota}</code>
      <p className="mapa-no-tela-resumo">{data.resumo}</p>
      {estados.length > 0 && (
        <div className="mapa-no-tela-estados">
          {estados.map((e) => (
            <span key={e} className="mapa-no-tela-estado">{e}</span>
          ))}
          {resto > 0 && <span className="mapa-no-tela-estado mapa-no-tela-mais">+{resto}</span>}
        </div>
      )}
      {data.abrirCaminho ? (
        <button
          type="button"
          className="mapa-no-tela-abrir"
          onClick={(evento) => {
            evento.stopPropagation();
            abrir(data.abrirCaminho as string);
          }}
        >
          Abrir <IconeAbrir />
        </button>
      ) : data.abrirMotivo ? (
        <button
          type="button"
          className="mapa-no-tela-abrir desabilitado"
          disabled
          title={data.abrirMotivo}
        >
          Indisponível
        </button>
      ) : null}
      <Handle type="source" position={Position.Right} className="mapa-handle mapa-handle-saida" />
    </div>
  );
}

const TIPOS_NO: NodeTypes = { tela: NoTela };

// Aresta com o gesto que causa a navegacao. Estatica, sem animacao nem filtro:
// o mapa de telas nasce leve.
function LigacaoGesto({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
}: EdgeProps) {
  const [caminho, rotuloX, rotuloY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.3,
  });
  const mostrarRotulo = (data as { mostrarRotulo?: boolean } | undefined)?.mostrarRotulo !== false;
  return (
    <>
      <path id={id} d={caminho} className="mapa-gesto-caminho" />
      {label && mostrarRotulo && (
        <EdgeLabelRenderer>
          <span
            className="mapa-gesto-rotulo nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${rotuloX}px, ${rotuloY}px)` }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const TIPOS_LIGACAO: EdgeTypes = { gesto: LigacaoGesto };

function ehMapaTelas(valor: unknown): valor is MapaTelas {
  if (!valor || typeof valor !== "object") return false;
  const mapa = valor as Partial<MapaTelas>;
  return (
    mapa.versao === 1 &&
    Array.isArray(mapa.zonas) &&
    Array.isArray(mapa.telas) &&
    Array.isArray(mapa.ligacoes) &&
    Array.isArray(mapa.jornadas)
  );
}

function MapaTelasCarregado({ mapa }: { mapa: MapaTelas }) {
  const { pecas, contextos } = usarEstado();
  const { setCenter } = useReactFlow();
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [jornadaSelId, setJornadaSelId] = useState<string | null>(null);

  const telasPorId = useMemo(
    () => new Map(mapa.telas.map((t) => [t.id, t])),
    [mapa.telas],
  );
  const zonasPorId = useMemo(
    () => new Map(mapa.zonas.map((z) => [z.id, z])),
    [mapa.zonas],
  );

  // Posicao base de cada tela: zona vira coluna, ordem dentro da zona vira linha.
  const posicoes = useMemo(() => {
    const mapaPos = new Map<string, { x: number; y: number }>();
    mapa.zonas.forEach((zona, coluna) => {
      const daZona = mapa.telas.filter((t) => t.zona === zona.id);
      daZona.forEach((tela, linha) => {
        mapaPos.set(tela.id, { x: coluna * LARGURA_ZONA, y: linha * ALTURA_TELA });
      });
    });
    return mapaPos;
  }, [mapa.telas, mapa.zonas]);

  const jornada = useMemo(
    () => (jornadaSelId ? mapa.jornadas.find((j) => j.id === jornadaSelId) ?? null : null),
    [jornadaSelId, mapa.jornadas],
  );
  // Numero do passo por tela (primeira ocorrencia) e pares consecutivos do caminho.
  const passosPorTela = useMemo(() => {
    const m = new Map<string, number>();
    if (jornada) {
      jornada.passos.forEach((id, i) => {
        if (!m.has(id)) m.set(id, i + 1);
      });
    }
    return m;
  }, [jornada]);
  const paresJornada = useMemo(() => {
    const s = new Set<string>();
    if (jornada) {
      for (let i = 0; i < jornada.passos.length - 1; i++) {
        s.add(`${jornada.passos[i]}->${jornada.passos[i + 1]}`);
      }
    }
    return s;
  }, [jornada]);

  const selecionada = selecionadoId ? telasPorId.get(selecionadoId) ?? null : null;

  const nodes = useMemo<Node[]>(() => {
    return mapa.telas.map((tela) => {
      const zona = zonasPorId.get(tela.zona);
      const cor = zona?.cor ?? "suave";
      const pos = posicoes.get(tela.id) ?? { x: 0, y: 0 };
      let abrirCaminho: string | null = null;
      let abrirMotivo: string | null = null;
      if (tela.destino !== null) {
        const r = resolverDestino(tela.destino, pecas, contextos);
        if ("caminho" in r) abrirCaminho = r.caminho;
        else abrirMotivo = r.motivo;
      }
      const passo = jornada ? passosPorTela.get(tela.id) : undefined;
      const atenuado = jornada && passo === undefined;
      return {
        id: tela.id,
        type: "tela",
        position: pos,
        className: atenuado ? "mapa-no-atenuado" : "",
        data: {
          nome: tela.nome,
          rota: tela.rota,
          resumo: tela.resumo,
          esqueleto: tela.esqueleto,
          zonaNome: zona?.nome ?? tela.zona,
          cor,
          estados: tela.estados,
          abrirCaminho,
          abrirMotivo,
          passo,
        } satisfies DadosNoTela,
      } satisfies Node<DadosNoTela, "tela">;
    });
  }, [mapa.telas, zonasPorId, posicoes, pecas, contextos, jornada, passosPorTela]);

  const edges = useMemo<Edge[]>(() => {
    return mapa.ligacoes.map((ligacao, indice) => {
      const naJornada = paresJornada.has(`${ligacao.de}->${ligacao.para}`);
      const atenuada = jornada && !naJornada;
      return {
        id: `gesto-${indice}-${ligacao.de}-${ligacao.para}`,
        type: "gesto",
        source: ligacao.de,
        target: ligacao.para,
        label: ligacao.gesto,
        className: `mapa-gesto${naJornada ? " mapa-gesto-ativa" : ""}${
          atenuada ? " mapa-gesto-atenuada" : ""
        }`,
        selectable: false,
        focusable: false,
        data: { mostrarRotulo: !jornada || naJornada },
      } satisfies Edge;
    });
  }, [mapa.ligacoes, jornada, paresJornada]);

  const centralizar = useCallback(
    (id: string) => {
      const pos = posicoes.get(id);
      if (!pos) return;
      void setCenter(pos.x + 150, pos.y + 130, { zoom: 0.85, duration: 400 });
    },
    [posicoes, setCenter],
  );

  const abrirNo = useCallback(
    (id: string) => {
      setSelecionadoId(id);
      centralizar(id);
    },
    [centralizar],
  );

  return (
    <div className="mapa-corpo">
      <section className="mapa-rede" aria-label="Rede de telas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={TIPOS_NO}
          edgeTypes={TIPOS_LIGACAO}
          onNodeClick={(_evento, no) => abrirNo(no.id)}
          elementsSelectable={false}
          nodesConnectable={false}
          nodesDraggable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.18, minZoom: 0.3, maxZoom: 0.9 }}
          minZoom={0.2}
          maxZoom={1.3}
          onlyRenderVisibleElements
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="var(--pontos-canvas)" />
          <Controls showInteractive={false} />
        </ReactFlow>

        {mapa.jornadas.length > 0 && (
          <div className="mapa-skills-barra" role="group" aria-label="Jornadas">
            {mapa.jornadas.map((j) => (
              <button
                key={j.id}
                type="button"
                className={`mapa-skill-chip mapa-cor-${corSegura(j.cor)}${
                  jornadaSelId === j.id ? " ativo" : ""
                }`}
                aria-pressed={jornadaSelId === j.id}
                title={j.resumo}
                onClick={() => setJornadaSelId(jornadaSelId === j.id ? null : j.id)}
              >
                <i />
                {j.nome}
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="mapa-painel" aria-live="polite">
        {jornada ? (
          <>
            <div className="mapa-painel-topo">
              <span className={`mapa-painel-grupo mapa-cor-${corSegura(jornada.cor)}`}>Jornada</span>
              <button
                className="mapa-painel-fechar"
                onClick={() => setJornadaSelId(null)}
                aria-label="Limpar jornada"
                title="Limpar"
              >
                <IconeX />
              </button>
            </div>
            <h2>{jornada.nome}</h2>
            <p className="mapa-painel-resumo">{jornada.resumo}</p>
            <div className="mapa-passos">
              {jornada.passos.map((id, i) => {
                const tela = telasPorId.get(id);
                return (
                  <button
                    key={`${id}-${i}`}
                    className="mapa-passo"
                    onClick={() => abrirNo(id)}
                  >
                    <span className={`mapa-passo-num mapa-cor-${corSegura(jornada.cor)}`}>{i + 1}</span>
                    <span className="mapa-passo-nome">{tela?.nome ?? id}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : selecionada ? (
          <DetalheTela
            tela={selecionada}
            zona={zonasPorId.get(selecionada.zona) ?? null}
            entra={mapa.ligacoes.filter((l) => l.para === selecionada.id)}
            sai={mapa.ligacoes.filter((l) => l.de === selecionada.id)}
            telasPorId={telasPorId}
            pecas={pecas}
            contextos={contextos}
            aoAbrirNo={abrirNo}
            aoFechar={() => setSelecionadoId(null)}
          />
        ) : (
          <div className="mapa-painel-vazio">
            <IconeTelas />
            <h2>Todas as telas do app</h2>
            <p>Clique num cartão para ver a tela em detalhe, ou ligue uma jornada na barra do mapa.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function DetalheTela({
  tela,
  zona,
  entra,
  sai,
  telasPorId,
  pecas,
  contextos,
  aoAbrirNo,
  aoFechar,
}: {
  tela: TelaMapa;
  zona: ZonaTela | null;
  entra: LigacaoTela[];
  sai: LigacaoTela[];
  telasPorId: Map<string, TelaMapa>;
  pecas: Peca[];
  contextos: Contexto[];
  aoAbrirNo: (id: string) => void;
  aoFechar: () => void;
}) {
  const resolucao =
    tela.destino !== null ? resolverDestino(tela.destino, pecas, contextos) : null;
  const caminho = resolucao && "caminho" in resolucao ? resolucao.caminho : null;
  const motivo = resolucao && "motivo" in resolucao ? resolucao.motivo : null;
  return (
    <>
      <div className="mapa-painel-topo">
        <span className={`mapa-painel-grupo mapa-cor-${corSegura(zona?.cor ?? "suave")}`}>
          {zona?.nome ?? tela.zona}
        </span>
        <button className="mapa-painel-fechar" onClick={aoFechar} aria-label="Fechar" title="Fechar">
          <IconeX />
        </button>
      </div>
      <h2>{tela.nome}</h2>
      <code className="mapa-painel-rota">{tela.rota}</code>
      <p className="mapa-painel-resumo">{tela.resumo}</p>
      <p className="mapa-painel-descricao">{tela.descricao}</p>

      {caminho && (
        <button type="button" className="mapa-abrir-grande" onClick={() => abrir(caminho)}>
          Abrir esta tela <IconeAbrir />
        </button>
      )}
      {!caminho && motivo && <p className="mapa-abrir-aviso">{motivo}</p>}
      {tela.destino === null && (
        <p className="mapa-abrir-aviso">Este é um estado, não uma tela navegável direto.</p>
      )}

      {tela.estados.length > 0 && (
        <div className="mapa-conversas">
          <h3>Estados internos</h3>
          <div className="mapa-no-tela-estados no-painel">
            {tela.estados.map((e) => (
              <span key={e} className="mapa-no-tela-estado">{e}</span>
            ))}
          </div>
        </div>
      )}

      <LigacoesDaTela titulo="Chega por aqui" ligacoes={entra} campo="de" telasPorId={telasPorId} aoAbrir={aoAbrirNo} />
      <LigacoesDaTela titulo="Sai por aqui" ligacoes={sai} campo="para" telasPorId={telasPorId} aoAbrir={aoAbrirNo} />
    </>
  );
}

function LigacoesDaTela({
  titulo,
  ligacoes,
  campo,
  telasPorId,
  aoAbrir,
}: {
  titulo: string;
  ligacoes: LigacaoTela[];
  campo: "de" | "para";
  telasPorId: Map<string, TelaMapa>;
  aoAbrir: (id: string) => void;
}) {
  if (ligacoes.length === 0) return null;
  return (
    <div className="mapa-conversas">
      <h3>{titulo}</h3>
      <div className="mapa-conversas-lista">
        {ligacoes.map((l, i) => {
          const id = l[campo];
          const tela = telasPorId.get(id);
          if (!tela) return null;
          return (
            <button key={`${campo}-${id}-${i}`} onClick={() => aoAbrir(id)}>
              {campo === "de" && <IconeSetaEntrada />}
              <span>
                <b>{tela.nome}</b>
                <small>{l.gesto}</small>
              </span>
              {campo === "para" && <IconeSeta />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TelaMapaTelas() {
  const [mapa, setMapa] = useState<MapaTelas | null>(null);
  const [estado, setEstado] = useState<"carregando" | "indisponivel" | "erro">("carregando");

  useEffect(() => {
    let ativo = true;
    fetch("/api/mapa/telas", { cache: "no-store" })
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error("Não foi possível abrir o mapa de telas.");
        return (await resposta.json()) as RespostaMapaTelas;
      })
      .then((resposta) => {
        if (!ativo) return;
        if (!resposta.disponivel) return setEstado("indisponivel");
        if (!ehMapaTelas(resposta.mapa)) return setEstado("erro");
        setMapa(resposta.mapa);
      })
      .catch(() => {
        if (ativo) setEstado("erro");
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (mapa) {
    return (
      <ReactFlowProvider>
        <MapaTelasCarregado mapa={mapa} />
      </ReactFlowProvider>
    );
  }
  return (
    <div className="mapa-estado">
      {estado === "carregando" && <div className="giro" />}
      {estado === "indisponivel" && (
        <>
          <h2>Mapa de telas indisponível</h2>
          <p>Esta instalação não inclui o mapa de telas.</p>
        </>
      )}
      {estado === "erro" && (
        <>
          <h2>Não foi possível abrir o mapa de telas</h2>
          <p>Tente recarregar a página.</p>
        </>
      )}
    </div>
  );
}

function IconeAbrir() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

function IconeX() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function IconeSeta() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconeSetaEntrada() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconeTelas() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="8" height="7" rx="1.5" />
      <rect x="13" y="4" width="8" height="7" rx="1.5" />
      <rect x="3" y="14" width="8" height="6" rx="1.5" />
      <rect x="13" y="14" width="8" height="6" rx="1.5" />
    </svg>
  );
}
