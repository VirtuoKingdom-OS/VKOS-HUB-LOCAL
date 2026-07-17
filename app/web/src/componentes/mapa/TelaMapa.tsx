import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
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

interface GrupoMapa {
  id: string;
  nome: string;
  cor: string;
}

interface NoMapa {
  id: string;
  grupo: string;
  nome: string;
  resumo: string;
  descricao: string;
  conversaCom: string[];
}

interface LigacaoMapa {
  de: string;
  para: string;
  rotulo: string;
}

interface MapaSistema {
  versao: number;
  grupos: GrupoMapa[];
  nos: NoMapa[];
  ligacoes: LigacaoMapa[];
}

interface RespostaMapa {
  disponivel: boolean;
  mapa?: MapaSistema;
}

type DadosNoVisual = {
  nome: string;
  resumo: string;
  grupo: string;
  cor: string;
  mostrarTitulo: boolean;
  mostrarResumo: boolean;
} & Record<string, unknown>;

type NoVisual = Node<DadosNoVisual, "mapa">;

const CORES_PERMITIDAS = new Set([
  "menta",
  "amarelo",
  "alerta",
  "suave",
  "fraco",
]);

function corSegura(cor: string): string {
  return CORES_PERMITIDAS.has(cor) ? cor : "suave";
}

function NoDoMapa({ data, selected }: NodeProps<NoVisual>) {
  const discreto = !data.mostrarTitulo && !data.mostrarResumo;
  return (
    <div
      className={`mapa-no mapa-cor-${corSegura(data.cor)}${
        selected ? " selecionado" : ""
      }${!data.mostrarTitulo ? " sem-titulo" : ""}${
        !data.mostrarResumo ? " sem-resumo" : ""
      }${discreto ? " discreto" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="mapa-handle mapa-handle-entrada"
      />
      {!discreto && <span className="mapa-no-grupo">{data.grupo}</span>}
      {data.mostrarTitulo && <strong>{data.nome}</strong>}
      {data.mostrarResumo && <p>{data.resumo}</p>}
      {discreto && <IconeNeuronio />}
      <Handle
        type="source"
        position={Position.Right}
        className="mapa-handle mapa-handle-saida"
      />
    </div>
  );
}

const TIPOS_NO: NodeTypes = { mapa: NoDoMapa };

function LigacaoNeural({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
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
    curvature: 0.34,
  });

  return (
    <>
      <path d={caminho} className="mapa-ligacao-halo" />
      <path
        id={id}
        d={caminho}
        className="mapa-ligacao-caminho"
        markerEnd={markerEnd as string}
      />
      <circle className="mapa-pulso" r="3.2">
        <animateMotion dur="3.2s" repeatCount="indefinite" path={caminho} />
      </circle>
      {label && (data as { mostrarRotulo?: boolean } | undefined)?.mostrarRotulo !== false && (
        <EdgeLabelRenderer>
          <span
            className="mapa-ligacao-rotulo nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${rotuloX}px, ${rotuloY}px)` }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const TIPOS_LIGACAO: EdgeTypes = { neural: LigacaoNeural };

function ehMapa(valor: unknown): valor is MapaSistema {
  if (!valor || typeof valor !== "object") return false;
  const mapa = valor as Partial<MapaSistema>;
  return (
    mapa.versao === 1 &&
    Array.isArray(mapa.grupos) &&
    Array.isArray(mapa.nos) &&
    Array.isArray(mapa.ligacoes)
  );
}

function montarVisual(mapa: MapaSistema): {
  nodes: NoVisual[];
  edges: Edge[];
} {
  const gruposPorId = new Map(mapa.grupos.map((grupo) => [grupo.id, grupo]));
  const nosPorGrupo = new Map<string, NoMapa[]>();
  for (const grupo of mapa.grupos) nosPorGrupo.set(grupo.id, []);
  for (const no of mapa.nos) nosPorGrupo.get(no.grupo)?.push(no);

  const maiorColuna = Math.max(
    1,
    ...mapa.grupos.map((grupo) => nosPorGrupo.get(grupo.id)?.length ?? 0),
  );

  const nodes: NoVisual[] = [];
  mapa.grupos.forEach((grupo, coluna) => {
    const nosDoGrupo = nosPorGrupo.get(grupo.id) ?? [];
    const recuo = (maiorColuna - nosDoGrupo.length) * 92;
    nosDoGrupo.forEach((no, linha) => {
      nodes.push({
        id: no.id,
        type: "mapa",
        position: { x: coluna * 340, y: recuo + linha * 184 },
        data: {
          nome: no.nome,
          resumo: no.resumo,
          grupo: gruposPorId.get(no.grupo)?.nome ?? no.grupo,
          cor: grupo.cor,
          mostrarTitulo: true,
          mostrarResumo: true,
        },
      });
    });
  });

  const edges: Edge[] = mapa.ligacoes.map((ligacao, indice) => ({
    id: `mapa-${indice}-${ligacao.de}-${ligacao.para}`,
    type: "neural",
    source: ligacao.de,
    target: ligacao.para,
    label: ligacao.rotulo,
    className: "mapa-ligacao",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "var(--borda-forte)",
    },
  }));

  return { nodes, edges };
}

function MapaCarregado({
  mapa,
  mostrarTitulos,
  mostrarDescricoes,
  modoDiscreto,
}: {
  mapa: MapaSistema;
  mostrarTitulos: boolean;
  mostrarDescricoes: boolean;
  modoDiscreto: boolean;
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const { setCenter } = useReactFlow();
  const visual = useMemo(() => montarVisual(mapa), [mapa]);
  const nosPorId = useMemo(
    () => new Map(mapa.nos.map((no) => [no.id, no])),
    [mapa.nos],
  );
  const selecionado = selecionadoId ? nosPorId.get(selecionadoId) ?? null : null;
  const gruposPorId = useMemo(
    () => new Map(mapa.grupos.map((grupo) => [grupo.id, grupo])),
    [mapa.grupos],
  );
  const ligacoesDoSelecionado = useMemo(() => {
    if (!selecionadoId) return { recebe: [], envia: [] };
    return {
      recebe: mapa.ligacoes.filter((ligacao) => ligacao.para === selecionadoId),
      envia: mapa.ligacoes.filter((ligacao) => ligacao.de === selecionadoId),
    };
  }, [mapa.ligacoes, selecionadoId]);
  const idsVizinhos = useMemo(() => {
    if (!selecionadoId) return null;
    return new Set([
      selecionadoId,
      ...ligacoesDoSelecionado.recebe.map((ligacao) => ligacao.de),
      ...ligacoesDoSelecionado.envia.map((ligacao) => ligacao.para),
    ]);
  }, [ligacoesDoSelecionado, selecionadoId]);
  const nodesVisiveis = useMemo(
    () => visual.nodes.map((no) => ({
      ...no,
      className: idsVizinhos && !idsVizinhos.has(no.id) ? "mapa-no-atenuado" : "",
      data: {
        ...no.data,
        mostrarTitulo: mostrarTitulos,
        mostrarResumo: mostrarDescricoes,
      },
    })),
    [idsVizinhos, mostrarDescricoes, mostrarTitulos, visual.nodes],
  );
  const edgesVisiveis = useMemo(
    () => visual.edges.map((ligacao) => ({
      ...ligacao,
      className: !selecionadoId
        ? "mapa-ligacao"
        : ligacao.source === selecionadoId || ligacao.target === selecionadoId
          ? "mapa-ligacao mapa-ligacao-ativa"
          : "mapa-ligacao mapa-ligacao-atenuada",
      data: { mostrarRotulo: !modoDiscreto },
    })),
    [modoDiscreto, selecionadoId, visual.edges],
  );

  const abrirNo = useCallback(
    (id: string) => {
      const noVisual = visual.nodes.find((no) => no.id === id);
      if (!noVisual) return;
      setSelecionadoId(id);
      void setCenter(noVisual.position.x + 130, noVisual.position.y + 72, {
        zoom: 0.9,
        duration: 0,
      });
    },
    [setCenter, visual.nodes],
  );

  return (
    <div className="mapa-corpo">
      <section className="mapa-rede" aria-label="Rede do mapa">
        <ReactFlow
          nodes={nodesVisiveis}
          edges={edgesVisiveis}
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
          fitViewOptions={{ padding: 0.16, minZoom: 0.38, maxZoom: 0.9 }}
          minZoom={0.25}
          maxZoom={1.35}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={26}
            size={1}
            color="var(--pontos-canvas)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>

        <div
          className={`mapa-legenda${modoDiscreto ? " discreta" : ""}`}
          aria-label={modoDiscreto ? "Cores dos grupos protegidos" : "Legenda dos grupos"}
        >
          {mapa.grupos.map((grupo) => (
            <span
              className={`mapa-legenda-item mapa-cor-${corSegura(grupo.cor)}`}
              key={grupo.id}
              title={modoDiscreto ? undefined : grupo.nome}
            >
              <i />
              {!modoDiscreto && grupo.nome}
            </span>
          ))}
        </div>
      </section>

      <aside className="mapa-painel" aria-live="polite">
        {modoDiscreto ? (
          <div className="mapa-painel-vazio mapa-painel-protegido">
            <IconeRede />
            <h2>Modo discreto</h2>
            <p>Os detalhes da arquitetura estão protegidos nesta visualização.</p>
          </div>
        ) : selecionado ? (
          <>
            <div className="mapa-painel-topo">
              <span
                className={`mapa-painel-grupo mapa-cor-${corSegura(
                  gruposPorId.get(selecionado.grupo)?.cor ?? "suave",
                )}`}
              >
                {gruposPorId.get(selecionado.grupo)?.nome ?? selecionado.grupo}
              </span>
              <button
                className="mapa-painel-fechar"
                onClick={() => setSelecionadoId(null)}
                aria-label="Fechar explicação"
                title="Fechar"
              >
                <IconeX />
              </button>
            </div>
            <h2>{selecionado.nome}</h2>
            <p className="mapa-painel-resumo">{selecionado.resumo}</p>
            <p className="mapa-painel-descricao">{selecionado.descricao}</p>

            <LigacoesDoNo
              titulo="Recebe de"
              ligacoes={ligacoesDoSelecionado.recebe.map((ligacao) => ({
                id: ligacao.de,
                rotulo: ligacao.rotulo,
              }))}
              nosPorId={nosPorId}
              sentido="entrada"
              aoAbrir={abrirNo}
            />
            <LigacoesDoNo
              titulo="Envia para"
              ligacoes={ligacoesDoSelecionado.envia.map((ligacao) => ({
                id: ligacao.para,
                rotulo: ligacao.rotulo,
              }))}
              nosPorId={nosPorId}
              sentido="saida"
              aoAbrir={abrirNo}
            />
          </>
        ) : (
          <div className="mapa-painel-vazio">
            <IconeRede />
            <h2>Escolha um nó</h2>
            <p>Clique em uma parte do mapa para entender seu papel e suas ligações.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function LigacoesDoNo({
  titulo,
  ligacoes,
  nosPorId,
  sentido,
  aoAbrir,
}: {
  titulo: string;
  ligacoes: { id: string; rotulo: string }[];
  nosPorId: Map<string, NoMapa>;
  sentido: "entrada" | "saida";
  aoAbrir: (id: string) => void;
}) {
  if (ligacoes.length === 0) return null;
  return (
    <div className="mapa-conversas">
      <h3>{titulo}</h3>
      <div className="mapa-conversas-lista">
        {ligacoes.map((ligacao) => {
          const no = nosPorId.get(ligacao.id);
          if (!no) return null;
          return (
            <button key={`${sentido}-${ligacao.id}`} onClick={() => aoAbrir(ligacao.id)}>
              {sentido === "entrada" && <IconeSetaEntrada />}
              <span>
                <b>{no.nome}</b>
                <small>{ligacao.rotulo}</small>
              </span>
              {sentido === "saida" && <IconeSeta />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TelaMapa() {
  const [mapa, setMapa] = useState<MapaSistema | null>(null);
  const [mostrarTitulos, setMostrarTitulos] = useState(true);
  const [mostrarDescricoes, setMostrarDescricoes] = useState(true);
  const [estado, setEstado] = useState<"carregando" | "indisponivel" | "erro">(
    "carregando",
  );
  const modoDiscreto = !mostrarTitulos && !mostrarDescricoes;

  useEffect(() => {
    let ativo = true;
    fetch("/api/mapa", { cache: "no-store" })
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error("Não foi possível abrir o mapa.");
        return (await resposta.json()) as RespostaMapa;
      })
      .then((resposta) => {
        if (!ativo) return;
        if (!resposta.disponivel) {
          setEstado("indisponivel");
          return;
        }
        if (!ehMapa(resposta.mapa)) {
          setEstado("erro");
          return;
        }
        setMapa(resposta.mapa);
      })
      .catch(() => {
        if (ativo) setEstado("erro");
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="tela-fluxo tela-mapa">
      <header className="tela-fluxo-topo mapa-topo">
        <div>
          <h1>Mapa do sistema</h1>
          <p className="subtitulo">
            Siga os pulsos e as setas para ver quem alimenta quem.
          </p>
        </div>
        {mapa && (
          <div className="mapa-topo-acoes">
            <div className="mapa-modos" aria-label="Modos de visualização">
              <button
                className={mostrarTitulos ? "ativo" : ""}
                aria-pressed={mostrarTitulos}
                onClick={() => setMostrarTitulos((valor) => !valor)}
                type="button"
              >
                Títulos
              </button>
              <button
                className={mostrarDescricoes ? "ativo" : ""}
                aria-pressed={mostrarDescricoes}
                onClick={() => setMostrarDescricoes((valor) => !valor)}
                type="button"
              >
                Descrições
              </button>
              <button
                className={`mapa-modo-discreto${modoDiscreto ? " ativo" : ""}`}
                aria-pressed={modoDiscreto}
                onClick={() => {
                  const mostrarTudo = modoDiscreto;
                  setMostrarTitulos(mostrarTudo);
                  setMostrarDescricoes(mostrarTudo);
                }}
                type="button"
              >
                <IconeOlhoProtegido />
                Modo discreto
              </button>
            </div>
            <span className="mapa-total">{mapa.nos.length} nós</span>
          </div>
        )}
      </header>

      {mapa ? (
        <ReactFlowProvider>
          <MapaCarregado
            mapa={mapa}
            mostrarTitulos={mostrarTitulos}
            mostrarDescricoes={mostrarDescricoes}
            modoDiscreto={modoDiscreto}
          />
        </ReactFlowProvider>
      ) : (
        <div className="mapa-estado">
          {estado === "carregando" && <div className="giro" />}
          {estado === "indisponivel" && (
            <>
              <h2>Mapa indisponível</h2>
              <p>Esta instalação não inclui um mapa para visualizar.</p>
            </>
          )}
          {estado === "erro" && (
            <>
              <h2>Não foi possível abrir o mapa</h2>
              <p>Tente recarregar a página.</p>
            </>
          )}
        </div>
      )}
    </div>
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

function IconeRede() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="m10.8 7.2-4.5 8.6M13.2 7.2l4.5 8.6M7.5 18h9" />
    </svg>
  );
}

function IconeNeuronio() {
  return (
    <svg className="mapa-no-neuronio" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="7" />
      <circle cx="24" cy="24" r="15" />
      <path d="M24 2v7M24 39v7M2 24h7M39 24h7M8.5 8.5l5 5M34.5 34.5l5 5M39.5 8.5l-5 5M13.5 34.5l-5 5" />
    </svg>
  );
}

function IconeOlhoProtegido() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18M10.7 10.8a2 2 0 0 0 2.6 2.5M9.9 4.4A10.5 10.5 0 0 1 12 4c5.5 0 9 5 9 5a16 16 0 0 1-2.2 2.7M6.6 6.6A15.8 15.8 0 0 0 3 9s3.5 5 9 5c.7 0 1.4-.1 2-.2" />
    </svg>
  );
}
