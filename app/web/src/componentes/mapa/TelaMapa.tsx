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
import { TelaMapaTelas } from "./TelaMapaTelas";

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

// Percurso de uma skill: so feedback visual sobreposto ao mapa.
interface SkillMapa {
  id: string;
  nome: string;
  resumo: string;
  cor: string;
  percurso: string[];
}

interface MapaSistema {
  versao: number;
  grupos: GrupoMapa[];
  nos: NoMapa[];
  ligacoes: LigacaoMapa[];
  skills?: SkillMapa[];
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
  // Numero do passo quando o no faz parte do percurso da skill selecionada.
  passoSkill?: number;
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
      {typeof data.passoSkill === "number" && (
        <span className="mapa-no-passo" aria-hidden="true">
          {data.passoSkill}
        </span>
      )}
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

// No proprio de uma skill (so na visao completa): um cartao compacto na coluna
// da esquerda, ligado por linhas leves aos nos do seu percurso. No modo discreto
// colapsa pra so um icone, como os nos do sistema.
function NoSkill({ data }: NodeProps) {
  const d = data as {
    nome: string;
    cor: string;
    passos: number;
    discreto?: boolean;
  };
  if (d.discreto) {
    return (
      <div
        className={`mapa-no-skill discreto mapa-cor-${corSegura(d.cor)}`}
        title={d.nome}
      >
        <IconeSkill />
        <Handle
          type="source"
          position={Position.Right}
          className="mapa-handle mapa-handle-saida"
        />
      </div>
    );
  }
  return (
    <div className={`mapa-no-skill mapa-cor-${corSegura(d.cor)}`}>
      <span className="mapa-no-skill-tag">Skill</span>
      <strong>{d.nome}</strong>
      <small>{d.passos} passos</small>
      <Handle
        type="source"
        position={Position.Right}
        className="mapa-handle mapa-handle-saida"
      />
    </div>
  );
}

const TIPOS_NO: NodeTypes = { mapa: NoDoMapa, skill: NoSkill };

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
      {(data as { semPulso?: boolean } | undefined)?.semPulso !== true && (
        <circle className="mapa-pulso" r="3.2">
          <animateMotion dur="3.2s" repeatCount="indefinite" path={caminho} />
        </circle>
      )}
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

// Aresta de percurso de skill: linha colorida, tracejada e animada, por cima do
// mapa base. A cor vem do --mapa-cor da classe mapa-cor-* posta na aresta.
function RotaSkill({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const curvatura = (data as { curvatura?: number } | undefined)?.curvatura ?? 0.34;
  const [caminho] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: curvatura,
  });
  return (
    <>
      <path d={caminho} className="mapa-rota-halo" />
      <path id={id} d={caminho} className="mapa-rota-caminho" />
      <circle className="mapa-rota-pulso" r="4">
        <animateMotion dur="2.4s" repeatCount="indefinite" path={caminho} />
      </circle>
    </>
  );
}

// Ligacao leve entre um no de skill e um no do seu percurso: linha estatica,
// sem pulso nem animacao, pra a visao completa nao pesar.
function LigacaoSkill({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [caminho] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.3,
  });
  return <path id={id} d={caminho} className="mapa-skilllink-caminho" />;
}

const TIPOS_LIGACAO: EdgeTypes = {
  neural: LigacaoNeural,
  rota: RotaSkill,
  skillLink: LigacaoSkill,
};

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
  skills,
  mostrarSkills,
  skillSelId,
  aoSelecionarSkill,
  visaoCompleta,
}: {
  mapa: MapaSistema;
  mostrarTitulos: boolean;
  mostrarDescricoes: boolean;
  modoDiscreto: boolean;
  skills: SkillMapa[];
  mostrarSkills: boolean;
  skillSelId: string | null;
  aoSelecionarSkill: (id: string | null) => void;
  visaoCompleta: boolean;
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const { setCenter, fitView } = useReactFlow();
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

  // Skill em foco (so quando o modo skills esta ligado). Ela guia a atenuacao
  // do mapa e as arestas de rota, no lugar da selecao de no.
  const skillSel = useMemo(
    () => (mostrarSkills && skillSelId ? skills.find((s) => s.id === skillSelId) ?? null : null),
    [mostrarSkills, skillSelId, skills],
  );
  const passosPorNo = useMemo(() => {
    const mapaPassos = new Map<string, number>();
    if (skillSel) {
      skillSel.percurso.forEach((id, i) => {
        if (!mapaPassos.has(id)) mapaPassos.set(id, i + 1);
      });
    }
    return mapaPassos;
  }, [skillSel]);
  const idsRota = useMemo(
    () => (skillSel ? new Set(skillSel.percurso) : null),
    [skillSel],
  );

  // Visao completa: cada skill vira um NO proprio na coluna da esquerda, ligado
  // por linhas leves e estaticas aos nos do seu percurso. Sem rotas animadas,
  // pra nao pesar. A densidade das ligacoes mostra a complexidade do sistema.
  const overlayCompleta = useMemo(() => {
    if (!visaoCompleta || skills.length === 0) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }
    const ys = visual.nodes.map((n) => n.position.y);
    const maxY = ys.length ? Math.max(...ys) : 0;
    // No modo discreto o no vira um circulo menor, entao o x fica mais perto.
    const passoY = (maxY + 126) / (skills.length + 1);
    const xSkill = modoDiscreto ? -180 : -360;
    const nodes: Node[] = skills.map((skill, i) => ({
      id: `skill:${skill.id}`,
      type: "skill",
      position: { x: xSkill, y: Math.round(passoY * (i + 1) - 34) },
      draggable: false,
      data: {
        nome: skill.nome,
        cor: skill.cor,
        passos: Math.max(0, skill.percurso.length - 1),
        discreto: modoDiscreto,
      },
    }));
    const edges: Edge[] = [];
    for (const skill of skills) {
      const vistos = new Set<string>();
      skill.percurso.forEach((nid) => {
        if (vistos.has(nid)) return;
        vistos.add(nid);
        edges.push({
          id: `sl-${skill.id}-${nid}`,
          type: "skillLink",
          source: `skill:${skill.id}`,
          target: nid,
          className: `mapa-skilllink mapa-cor-${corSegura(skill.cor)}`,
          selectable: false,
          focusable: false,
        });
      });
    }
    return { nodes, edges };
  }, [modoDiscreto, skills, visaoCompleta, visual.nodes]);
  const estatisticas = useMemo(() => {
    const passos = skills.reduce((soma, s) => soma + Math.max(0, s.percurso.length - 1), 0);
    return {
      nos: mapa.nos.length,
      ligacoes: mapa.ligacoes.length,
      skills: skills.length,
      passos,
      trafego: mapa.ligacoes.length + passos,
    };
  }, [mapa.ligacoes.length, mapa.nos.length, skills]);

  useEffect(() => {
    if (visaoCompleta) void fitView({ padding: 0.12, duration: 500 });
  }, [fitView, visaoCompleta]);

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
  const nodesVisiveis = useMemo<Node[]>(
    () => {
      const base: Node[] = visual.nodes.map((no) => {
        let className = "";
        if (!visaoCompleta && skillSel) {
          className = idsRota?.has(no.id) ? "mapa-no-rota" : "mapa-no-atenuado";
        } else if (!visaoCompleta && idsVizinhos && !idsVizinhos.has(no.id)) {
          className = "mapa-no-atenuado";
        }
        return {
          ...no,
          className,
          data: {
            ...no.data,
            mostrarTitulo: mostrarTitulos,
            mostrarResumo: mostrarDescricoes,
            passoSkill: skillSel ? passosPorNo.get(no.id) : undefined,
          },
        };
      });
      return [...base, ...overlayCompleta.nodes];
    },
    [idsRota, idsVizinhos, mostrarDescricoes, mostrarTitulos, overlayCompleta.nodes, passosPorNo, skillSel, visaoCompleta, visual.nodes],
  );
  const rotaEdges = useMemo(() => {
    if (!skillSel) return [];
    const arr: Edge[] = [];
    for (let i = 0; i < skillSel.percurso.length - 1; i++) {
      arr.push({
        id: `rota-${skillSel.id}-${i}`,
        type: "rota",
        source: skillSel.percurso[i],
        target: skillSel.percurso[i + 1],
        className: `mapa-rota mapa-cor-${corSegura(skillSel.cor)}`,
        selectable: false,
        focusable: false,
      });
    }
    return arr;
  }, [skillSel]);
  const edgesVisiveis = useMemo(
    () => {
      const base = visual.edges.map((ligacao) => ({
        ...ligacao,
        className: visaoCompleta
          ? "mapa-ligacao mapa-ligacao-fundo"
          : skillSel
            ? "mapa-ligacao mapa-ligacao-atenuada"
            : !selecionadoId
              ? "mapa-ligacao"
              : ligacao.source === selecionadoId || ligacao.target === selecionadoId
                ? "mapa-ligacao mapa-ligacao-ativa"
                : "mapa-ligacao mapa-ligacao-atenuada",
        // Na visao completa as ligacoes base ficam sem pulso pra aliviar.
        data: {
          mostrarRotulo: !modoDiscreto && !skillSel && !visaoCompleta,
          semPulso: visaoCompleta,
        },
      }));
      return [...base, ...rotaEdges, ...overlayCompleta.edges];
    },
    [modoDiscreto, overlayCompleta.edges, rotaEdges, selecionadoId, skillSel, visaoCompleta, visual.edges],
  );

  const abrirNo = useCallback(
    (id: string) => {
      const noVisual = visual.nodes.find((no) => no.id === id);
      if (!noVisual) return;
      // No modo skills a selecao de no nao muda o painel: so centraliza.
      if (!mostrarSkills) setSelecionadoId(id);
      void setCenter(noVisual.position.x + 130, noVisual.position.y + 72, {
        zoom: 0.9,
        duration: 400,
      });
    },
    [mostrarSkills, setCenter, visual.nodes],
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
          onlyRenderVisibleElements
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

        {mostrarSkills && skills.length > 0 && (
          <div className="mapa-skills-barra" role="group" aria-label="Percurso das skills">
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                className={`mapa-skill-chip mapa-cor-${corSegura(skill.cor)}${
                  skillSelId === skill.id ? " ativo" : ""
                }`}
                aria-pressed={skillSelId === skill.id}
                title={skill.resumo}
                onClick={() => aoSelecionarSkill(skillSelId === skill.id ? null : skill.id)}
              >
                <i />
                {skill.nome}
              </button>
            ))}
          </div>
        )}

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
        ) : visaoCompleta ? (
          <>
            <div className="mapa-painel-topo">
              <span className="mapa-painel-grupo mapa-cor-menta">Visão completa</span>
            </div>
            <h2>O sistema inteiro de uma vez</h2>
            <p className="mapa-painel-resumo">
              Todos os nós, todas as ligações e o percurso de cada skill
              sobrepostos. Quanto mais rotas cruzam um nó, mais central ele é.
            </p>
            <div className="mapa-numeros">
              <div className="mapa-numero">
                <b>{estatisticas.nos}</b>
                <small>nós</small>
              </div>
              <div className="mapa-numero">
                <b>{estatisticas.ligacoes}</b>
                <small>ligações</small>
              </div>
              <div className="mapa-numero">
                <b>{estatisticas.skills}</b>
                <small>skills</small>
              </div>
              <div className="mapa-numero">
                <b>{estatisticas.passos}</b>
                <small>passos de skill</small>
              </div>
            </div>
            <div className="mapa-conversas">
              <h3>Skills no mapa</h3>
              <div className="mapa-skills-legenda">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className={`mapa-skills-legenda-item mapa-cor-${corSegura(skill.cor)}`}
                    title={skill.resumo}
                  >
                    <i />
                    <b>{skill.nome}</b>
                    <small>{Math.max(0, skill.percurso.length - 1)} passos</small>
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : mostrarSkills ? (
          skillSel ? (
            <>
              <div className="mapa-painel-topo">
                <span
                  className={`mapa-painel-grupo mapa-cor-${corSegura(skillSel.cor)}`}
                >
                  Percurso da skill
                </span>
                <button
                  className="mapa-painel-fechar"
                  onClick={() => aoSelecionarSkill(null)}
                  aria-label="Limpar percurso"
                  title="Limpar"
                >
                  <IconeX />
                </button>
              </div>
              <h2>{skillSel.nome}</h2>
              <p className="mapa-painel-resumo">{skillSel.resumo}</p>
              <div className="mapa-passos">
                {skillSel.percurso.map((id, i) => {
                  const no = nosPorId.get(id);
                  return (
                    <button
                      key={`${id}-${i}`}
                      className="mapa-passo"
                      onClick={() => abrirNo(id)}
                    >
                      <span
                        className={`mapa-passo-num mapa-cor-${corSegura(skillSel.cor)}`}
                      >
                        {i + 1}
                      </span>
                      <span className="mapa-passo-nome">{no?.nome ?? id}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mapa-painel-vazio">
              <IconeRede />
              <h2>Percurso das skills</h2>
              <p>Escolha uma skill na barra do mapa para ver por onde ela passa.</p>
            </div>
          )
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
  const [mostrarSkills, setMostrarSkills] = useState(false);
  const [skillSelId, setSkillSelId] = useState<string | null>(null);
  const [visaoCompleta, setVisaoCompleta] = useState(false);
  // Segunda visao do Mapa: as telas do app. So aparece quando o backend serve
  // /api/mapa/telas; sem ela, o Mapa continua exatamente como era.
  const [visao, setVisao] = useState<"sistema" | "telas">("sistema");
  const [telasDisponivel, setTelasDisponivel] = useState(false);
  const [estado, setEstado] = useState<"carregando" | "indisponivel" | "erro">(
    "carregando",
  );
  const modoDiscreto = !mostrarTitulos && !mostrarDescricoes;
  const skills = mapa?.skills ?? [];

  useEffect(() => {
    let ativo = true;
    fetch("/api/mapa/telas", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((r: { disponivel?: boolean } | null) => {
        if (ativo) setTelasDisponivel(r?.disponivel === true);
      })
      .catch(() => {
        if (ativo) setTelasDisponivel(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

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
          <h1>{visao === "telas" ? "Mapa de telas" : "Mapa do sistema"}</h1>
          <p className="subtitulo">
            {visao === "telas"
              ? "Todas as telas, rotas e estados do app, com a jornada e a conexão entre cada uma. É um espelho: não muda nada no sistema."
              : "Siga os pulsos e as setas para ver quem alimenta quem, ou ligue o percurso das skills para acompanhar a jornada completa de cada uma."}
          </p>
        </div>
        {mapa && (
          <div className="mapa-topo-acoes">
            {telasDisponivel && (
              <div className="mapa-modos" aria-label="Visão do mapa">
                <button
                  className={visao === "sistema" ? "ativo" : ""}
                  aria-pressed={visao === "sistema"}
                  onClick={() => setVisao("sistema")}
                  type="button"
                >
                  Sistema
                </button>
                <button
                  className={visao === "telas" ? "ativo" : ""}
                  aria-pressed={visao === "telas"}
                  onClick={() => setVisao("telas")}
                  type="button"
                >
                  Telas
                </button>
              </div>
            )}
            {visao === "sistema" && (
            <>
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
            {skills.length > 0 && (
              <div className="mapa-modos" aria-label="Percurso das skills">
                <button
                  className={`mapa-modo-skills${mostrarSkills ? " ativo" : ""}`}
                  aria-pressed={mostrarSkills}
                  onClick={() => {
                    setMostrarSkills((valor) => {
                      const novo = !valor;
                      if (!novo) setSkillSelId(null);
                      if (novo) setVisaoCompleta(false);
                      return novo;
                    });
                  }}
                  type="button"
                >
                  <IconeRota />
                  Percurso das skills
                </button>
                <button
                  className={`mapa-modo-completa${visaoCompleta ? " ativo" : ""}`}
                  aria-pressed={visaoCompleta}
                  onClick={() => {
                    setVisaoCompleta((valor) => {
                      const novo = !valor;
                      if (novo) {
                        setMostrarSkills(false);
                        setSkillSelId(null);
                      }
                      return novo;
                    });
                  }}
                  type="button"
                >
                  <IconeMapaCompleto />
                  Mapa completo
                </button>
              </div>
            )}
            <span className="mapa-total">{mapa.nos.length} nós</span>
            </>
            )}
          </div>
        )}
      </header>

      {visao === "telas" ? (
        <TelaMapaTelas />
      ) : mapa ? (
        <ReactFlowProvider>
          <MapaCarregado
            mapa={mapa}
            mostrarTitulos={mostrarTitulos}
            mostrarDescricoes={mostrarDescricoes}
            modoDiscreto={modoDiscreto}
            skills={skills}
            mostrarSkills={mostrarSkills}
            skillSelId={skillSelId}
            aoSelecionarSkill={setSkillSelId}
            visaoCompleta={visaoCompleta}
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

function IconeSkill() {
  return (
    <svg className="mapa-no-skill-icone" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
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

function IconeRota() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8 17.5c3-1 3-4 1.5-6S8 7 11 6M13.5 6H16a2.5 2.5 0 0 1 0 5h-3" />
    </svg>
  );
}

function IconeMapaCompleto() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8v11l6-3 6 3 6-3V5l-6 3-6-3-6 3z" />
      <path d="M9 5v11M15 8v11" />
    </svg>
  );
}
