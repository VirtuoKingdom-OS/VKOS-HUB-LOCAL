import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import * as api from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { lerBase64 } from "../../util/arquivo";
import { mensagemDeErro } from "../../util/erros";
import { FLUXOS_VISIVEIS, acharFluxo } from "../../config/fluxos";
import { irParaTela } from "../layout/rotas";
import type { TipoContexto } from "../../tipos/dominio";
import { PopoverFluxos } from "./PopoverFluxos";
import { CerimoniaCerebro } from "./CerimoniaCerebro";
import { ehDocumentoDeCerebro, type DocumentoCerebro } from "./cerebroDocumento";
import { NoCerebro } from "./NoCerebro";
import { NoSessao } from "./NoSessao";
import { NoContexto } from "./NoContexto";
import { NoContainer } from "./NoContainer";
import { ArestaCockpit } from "./ArestaCockpit";
import { PainelCerebro } from "./PainelCerebro";
import { MenuContexto, type ItemMenu } from "../comum/MenuContexto";
import { useCorDoTema } from "../comum/useCorDoTema";
import { Confirmacao, type DadosConfirmacao } from "../comum/Confirmacao";
import { CanvasContexto, type ApiCanvas } from "./canvasContexto";
import { IconeRecarregar } from "./iconesCockpit";
import {
  IconeAlvo,
  IconeArquivo,
  IconeDuplicar,
  IconeFluxo,
  IconeGaleria,
  IconeLapis,
  IconeLixeira,
  IconeMais,
  IconeOlho,
  IconeParar,
  IconeRaio,
  IconeX,
} from "../comum/Icones";

const tiposNo: NodeTypes = {
  cerebro: NoCerebro,
  sessao: NoSessao,
  contexto: NoContexto,
  container: NoContainer,
};

// Troca a aresta PADRAO do React Flow pela nossa. Nenhuma aresta do canvas
// declara type, entao todas caem em "default" e todas ganham a faixa de acerto
// larga e o corte no meio do caminho, sem tocar nas fabricas nem no formato do
// canvas.json (que nunca gravou o tipo da aresta).
const tiposAresta: EdgeTypes = {
  default: ArestaCockpit,
};

// Tipo de peca (o contêiner) que corresponde ao fluxo de uma sessao. Os ids de
// fluxo batem com os tipos de peca. Fluxo sem contêiner conhecido devolve null.
function tipoDoFluxo(idFluxo?: string): string | null {
  switch (idFluxo) {
    case "carrossel":
      return "carrossel";
    case "post":
      return "post";
    case "stories":
      return "stories";
    case "site":
      return "site";
    default:
      return null;
  }
}

// Id do no contêiner de um tipo de peca.
function idContainer(tipo: string): string {
  return `cont-${tipo}`;
}

const POSICAO_CEREBRO = { x: 120, y: 280 };

// Formato do canvas.json. O backend guarda cru, sem interpretar.
// Versao 2: cada no pode ter dimensoes. Versao 1 (sem dimensoes) ainda carrega,
// os nos caem no tamanho padrao.
// Versao 3 (rodada 7): topologia em arvore. Os nos "geracao" viram itens do
// contêiner do tipo; entram nos "container". As arestas cerebro-geracao e o
// campo geracoesOcultas ficam obsoletos: a migracao os descarta ao carregar.
interface Dimensoes {
  largura: number;
  altura: number;
}
interface NoSalvo {
  id: string;
  tipo: string;
  posicao: { x: number; y: number };
  dados: Record<string, unknown>;
  dimensoes?: Dimensoes;
}
interface ArestaSalva {
  id: string;
  source: string;
  target: string;
  classe?: string;
  animada?: boolean;
}
interface CanvasSalvo {
  versao: number;
  nos: NoSalvo[];
  arestas: ArestaSalva[];
  // Arestas que o usuario desconectou de proposito. Guardamos os ids pra que a
  // sincronizacao nao as recrie (a aresta da sessao pro contêiner renasce a
  // cada sync). Persistir isso e o que faz a desconexao "colar".
  arestasRemovidas?: string[];
  // Campo legado (ate a versao 2): pastas de geracao ocultas. Obsoleto na
  // arvore. A migracao ignora e nao regrava.
  geracoesOcultas?: string[];
}

// Tamanho inicial de um no de contexto por tipo, quando nao ha nada salvo.
function dimPadrao(tipo: TipoContexto): Dimensoes {
  return tipo === "imagens"
    ? { largura: 320, altura: 300 }
    : { largura: 300, altura: 240 };
}

// Tamanho estimado de um no ja no canvas, pra checar colisao. Usa a medida real
// do React Flow quando existe, senao um padrao generoso por tipo.
function tamanhoDoNo(n: Node): { largura: number; altura: number } {
  const medido = (n as { measured?: { width?: number; height?: number } }).measured;
  const largura =
    medido?.width ?? (typeof n.width === "number" ? n.width : 300);
  const altura =
    medido?.height ?? (typeof n.height === "number" ? n.height : 220);
  return { largura, altura };
}

// A partir de uma posicao desejada, acha uma vaga que nao sobreponha nenhum no
// existente. Se colide, desloca em espiral (passos de 40px) ate achar espaco.
// Evita nascer nos novos em cima dos que ja estao no canvas.
function posicaoLivre(
  desejada: { x: number; y: number },
  novo: { largura: number; altura: number },
  nos: Node[]
): { x: number; y: number } {
  const margem = 24;
  const rects = nos.map((n) => {
    const t = tamanhoDoNo(n);
    return { x: n.position.x, y: n.position.y, w: t.largura, h: t.altura };
  });
  const colide = (x: number, y: number) =>
    rects.some(
      (r) =>
        x < r.x + r.w + margem &&
        x + novo.largura + margem > r.x &&
        y < r.y + r.h + margem &&
        y + novo.altura + margem > r.y
    );
  if (!colide(desejada.x, desejada.y)) return desejada;

  const passo = 40;
  // Espiral quadrada ao redor da posicao desejada.
  for (let raio = 1; raio <= 60; raio++) {
    for (let dx = -raio; dx <= raio; dx++) {
      for (let dy = -raio; dy <= raio; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== raio) continue;
        const x = desejada.x + dx * passo;
        const y = desejada.y + dy * passo;
        if (!colide(x, y)) return { x, y };
      }
    }
  }
  return desejada;
}

// Le as dimensoes atuais de um no (o NodeResizer grava em width/height).
function dimDoNo(n: Node): Dimensoes | undefined {
  if (typeof n.width === "number" && typeof n.height === "number") {
    return { largura: n.width, altura: n.height };
  }
  return undefined;
}

// Campos do rascunho do no de sessao que valem a pena persistir.
const CAMPOS_SESSAO = [
  "idFluxo",
  "titulo",
  "tema",
  "detalhes",
  "idSub",
  "idSessao",
  "modelo",
  "modeloCarrossel",
  "formato",
  "proporcao",
  "anexos",
  "etapas",
] as const;

// A aresta do Cerebro pra uma sessao. Ela nasce PARADA: acromatica e sem
// marcha. O menta e a animacao entram so enquanto aquela sessao esta mesmo
// rodando, que e o que a fundacao v2 pede do menta (ele diz o que esta vivo,
// e nada mais). Quem liga e desliga isso e o efeito de vida, mais abaixo.
//
// A cor vai como LITERAL, nao como var(): o React Flow monta o id do <marker>
// concatenando o valor da cor, e um id com parenteses corta o url(#...) que
// aponta pra ele, entao a seta some em silencio. Conferido no navegador. O
// literal vem do token por useCorDoTema, que reage a troca de tema.
function arestaCerebro(idSessao: string, cor: string, viva = false): Edge {
  return {
    id: `aresta-${idSessao}`,
    source: "cerebro",
    target: idSessao,
    animated: viva,
    className: viva ? "aresta-viva" : "aresta-cerebro",
    markerEnd: { type: MarkerType.ArrowClosed, color: cor },
  };
}

function arestaContexto(idNoContexto: string, idNoSessao: string): Edge {
  return {
    id: `arestac-${idNoContexto}-${idNoSessao}`,
    source: idNoContexto,
    target: idNoSessao,
    animated: false,
    className: "aresta-contexto",
  };
}

// Aresta da sessao pro contêiner do tipo que ela gera (carrossel pro contêiner
// de carrosséis, etc). E o segundo nivel da arvore: cerebro -> sessao ->
// contêiner. Discreta, sem animacao.
function idArestaContainer(idNoSessao: string, idNoContainer: string): string {
  return `arestacont-${idNoSessao}-${idNoContainer}`;
}
function arestaSessaoContainer(idNoSessao: string, idNoContainer: string): Edge {
  return {
    id: idArestaContainer(idNoSessao, idNoContainer),
    source: idNoSessao,
    target: idNoContainer,
    animated: false,
    className: "aresta-container",
  };
}

// Poda ids de aresta desconectada cujo source ou target nao existe mais entre
// os nos (ex: a sessao foi removida). Sem isso arestasRemovidas so cresce, nunca
// encolhe, e o canvas.json incha com lixo. Os ids codificam os nos das pontas,
// entao decidimos pela presenca deles no canvas. Formato desconhecido: preserva.
function podarRemovidas(removidas: string[], nodes: Node[]): string[] {
  const existe = new Set(nodes.map((n) => n.id));
  return removidas.filter((idAresta) => {
    if (idAresta.startsWith("arestacont-")) {
      // arestacont-<idSessao>-cont-<tipo>
      const resto = idAresta.slice("arestacont-".length);
      const corte = resto.lastIndexOf("-cont-");
      if (corte === -1) return true;
      return existe.has(resto.slice(0, corte)) && existe.has(resto.slice(corte + 1));
    }
    if (idAresta.startsWith("arestac-")) {
      // arestac-<idNoContexto>-<idNoSessao> (o no de sessao comeca em "sessao-")
      const resto = idAresta.slice("arestac-".length);
      const corte = resto.lastIndexOf("-sessao-");
      if (corte === -1) return true;
      return existe.has(resto.slice(0, corte)) && existe.has(resto.slice(corte + 1));
    }
    if (idAresta.startsWith("arestat-cerebro-")) {
      // Legado: aresta de terminal (fluxo removido em 2026-07-13). Descarta.
      return false;
    }
    if (idAresta.startsWith("aresta-")) {
      // aresta-<idSessao>: aresta viva cerebro -> sessao
      return existe.has(idAresta.slice("aresta-".length));
    }
    return true;
  });
}

// Serializa nos e arestas pro canvas.json, sem funcoes nem campos transitorios.
function serializar(
  nodes: Node[],
  edges: Edge[],
  arestasRemovidas: string[]
): CanvasSalvo {
  const nos: NoSalvo[] = [];
  for (const n of nodes) {
    const dimensoes = dimDoNo(n);
    if (n.type === "sessao") {
      const dados: Record<string, unknown> = {};
      for (const campo of CAMPOS_SESSAO) {
        const valor = (n.data as Record<string, unknown>)[campo];
        if (valor !== undefined) dados[campo] = valor;
      }
      nos.push({ id: n.id, tipo: "sessao", posicao: n.position, dados });
    } else if (n.type === "contexto") {
      nos.push({
        id: n.id,
        tipo: "contexto",
        posicao: n.position,
        dados: { idContexto: (n.data as { idContexto: string }).idContexto },
        ...(dimensoes ? { dimensoes } : {}),
      });
    } else if (n.type === "container") {
      nos.push({
        id: n.id,
        tipo: "container",
        posicao: n.position,
        dados: { tipoPeca: (n.data as { tipoPeca: string }).tipoPeca },
      });
    } else if (n.type === "cerebro") {
      nos.push({ id: n.id, tipo: "cerebro", posicao: n.position, dados: {} });
    }
  }
  // As arestas sessao->contêiner nao vao pro disco: sao derivadas e o sync as
  // reconstroi. A desconexao delas vive em arestasRemovidas.
  const arestas: ArestaSalva[] = edges
    .filter((e) => e.className !== "aresta-container")
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      classe: e.className,
      animada: e.animated,
    }));
  return {
    versao: 3,
    nos,
    arestas,
    arestasRemovidas: podarRemovidas(arestasRemovidas, nodes),
  };
}

function CanvasCockpit() {
  const estado = usarEstado();
  const { contextos, pecas } = estado;
  const { screenToFlowPosition, fitView, getNode, getNodes } = useReactFlow();

  const refArea = useRef<HTMLDivElement>(null);

  const [cerebroAberto, setCerebroAberto] = useState(false);
  const abrirCerebro = useCallback(() => setCerebroAberto(true), []);

  // Popover de fluxos. Abre ao clicar no no do Cerebro. Ele se ancora sozinho
  // ao no, lendo o DOM e reprojetando a cada pan e zoom.
  const [popoverAberto, setPopoverAberto] = useState(false);
  const abrirPopoverFluxos = useCallback(() => setPopoverAberto(true), []);

  // Cerimonia do Cerebro: a entrevista guiada de cliente novo. E a porta de
  // entrada quando o Cerebro esta vazio: clicar no no do Cerebro abre ela em
  // vez do popover de fluxos.
  const [cerimoniaAberta, setCerimoniaAberta] = useState(false);
  const abrirCerimonia = useCallback(() => setCerimoniaAberta(true), []);

  // A terceira porta do Cerebro: um .md que a pessoa ja tinha escrito. Ele sobe
  // pro workspace e semeia a cerimonia, que passa a ler em vez de perguntar do
  // zero. Guardamos o documento aqui, e nao dentro da cerimonia, porque quem
  // recebe o arquivo e o cartao de boas-vindas, que vive neste componente.
  const [documentoCerebro, setDocumentoCerebro] =
    useState<DocumentoCerebro | null>(null);
  const [enviandoDocumento, setEnviandoDocumento] = useState(false);
  const [erroDocumento, setErroDocumento] = useState<string | null>(null);
  const [arrastandoDocumento, setArrastandoDocumento] = useState(false);
  const refArquivoCerebro = useRef<HTMLInputElement>(null);

  const receberDocumentoCerebro = useCallback(async (arquivo: File | undefined) => {
    if (!arquivo || enviandoDocumento) return;
    // So .md. Aceitar txt ou pdf aqui seria prometer um processamento que a
    // cerimonia nao faz: o /instalar le markdown do workspace, e um pdf
    // chegaria como binario ilegivel no meio da entrevista.
    if (!ehDocumentoDeCerebro(arquivo.name)) {
      setErroDocumento("Por enquanto o Cérebro só nasce de arquivo .md.");
      return;
    }
    setEnviandoDocumento(true);
    setErroDocumento(null);
    try {
      const conteudoBase64 = await lerBase64(arquivo);
      const { caminhoRelativo } = await api.enviarAnexo({
        nome: arquivo.name,
        conteudoBase64,
      });
      setDocumentoCerebro({ caminho: caminhoRelativo, nome: arquivo.name });
      setCerimoniaAberta(true);
    } catch (e) {
      setErroDocumento(mensagemDeErro(e));
    } finally {
      setEnviandoDocumento(false);
    }
  }, [enviandoDocumento]);
  const cerebroPreenchidoAgora = estado.estadoVkos?.cerebroPreenchido ?? false;
  // O callback do no do Cerebro le o estado FRESCO por um ref, com identidade
  // estavel. Guardar o closure direto no data do no ja causou bug real: a
  // restauracao assincrona do canvas (boot da troca de cliente) sobrescrevia o
  // no com o closure velho do cliente anterior, e o Cerebro vazio abria o
  // popover em vez da cerimonia.
  const refCerebroPreenchido = useRef(cerebroPreenchidoAgora);
  refCerebroPreenchido.current = cerebroPreenchidoAgora;
  const aoClicarCerebro = useCallback(() => {
    if (!refCerebroPreenchido.current) setCerimoniaAberta(true);
    else setPopoverAberto(true);
  }, []);

  // Boot do canvas: fica verdadeiro so quando o primeiro carregamento termina.
  const [canvasCarregado, setCanvasCarregado] = useState(false);
  const [recarregando, setRecarregando] = useState(false);
  // Conta cada restauracao do canvas. A poda de sessoes orfas ouve este contador
  // pra rodar depois que os nos salvos voltam, sem depender da ordem de carga.
  const [restauracoes, setRestauracoes] = useState(0);

  const [nodes, setNodes, aoMudarNos] = useNodesState<Node>([
    {
      id: "cerebro",
      type: "cerebro",
      position: POSICAO_CEREBRO,
      data: { aoClicar: aoClicarCerebro },
      draggable: true,
      deletable: false,
    },
  ]);
  const [edges, setEdges, aoMudarArestas] = useEdgesState<Edge>([]);

  // As duas cores de aresta, como literal. Elas so existem aqui porque o
  // marcador de seta do React Flow nao aceita var(). Ver comum/useCorDoTema.
  const corLigacao = useCorDoTema("--ligacao");
  const corLigacaoViva = useCorDoTema("--ligacao-viva");

  // Quais sessoes estao trabalhando AGORA. E daqui que sai o unico menta do
  // canvas: a linha entre o Cerebro e a sessao que ele esta alimentando.
  const sessoesVivas = useMemo(
    () =>
      new Set(
        estado.sessoes
          .filter(
            (s) =>
              s.status === "rodando" ||
              s.status === "iniciando" ||
              s.status === "fila"
          )
          .map((s) => s.id)
      ),
    [estado.sessoes]
  );

  // Efeito de vida das arestas do Cerebro. Ele tambem e o que conserta a cor
  // depois de uma troca de tema: as arestas ja no canvas guardam o literal
  // antigo no markerEnd e ficariam na cor do tema anterior.
  //
  // Ele depende de nodes (uma sessao nova precisa acender), entao roda tambem
  // durante o arrasto. Por isso devolve a MESMA referencia quando nada mudou:
  // sem isso, cada frame de arrasto viraria re-render e autosave.
  useEffect(() => {
    setEdges((atuais) => {
      let mudou = false;
      const proximas = atuais.map((a) => {
        if (a.source !== "cerebro") return a;
        const no = nodes.find((n) => n.id === a.target);
        const idSessao = (no?.data as { idSessao?: string } | undefined)?.idSessao;
        const viva = Boolean(idSessao && sessoesVivas.has(idSessao));
        const cor = viva ? corLigacaoViva : corLigacao;
        const classe = viva ? "aresta-viva" : "aresta-cerebro";
        const corAtual = (a.markerEnd as { color?: string } | undefined)?.color;
        if (a.className === classe && a.animated === viva && corAtual === cor) {
          return a;
        }
        mudou = true;
        return {
          ...a,
          animated: viva,
          className: classe,
          markerEnd: { type: MarkerType.ArrowClosed, color: cor },
        };
      });
      return mudou ? proximas : atuais;
    });
  }, [nodes, sessoesVivas, corLigacao, corLigacaoViva, setEdges]);

  const contador = useRef(0);
  const prontoParaSalvar = useRef(false);
  // Enquadramento de boot: roda o fitView UMA vez, depois do primeiro sync.
  const enquadrouBoot = useRef(false);
  const timerCanvas = useRef<number | undefined>(undefined);
  const layoutContextos = useRef<
    Map<string, { posicao: { x: number; y: number }; dimensoes?: Dimensoes }>
  >(new Map());
  // Posicao salva dos nos contêiner, por id, pra restaurar no sync.
  const layoutContainers = useRef<Map<string, { x: number; y: number }>>(new Map());
  // Colocacao e conexao de nos de contexto que ainda vao nascer.
  const pendentes = useRef<
    Map<string, { posicao: { x: number; y: number }; conectarA?: string }>
  >(new Map());

  const [menu, setMenu] = useState<{ x: number; y: number; itens: ItemMenu[] } | null>(
    null
  );
  const [confirmacao, setConfirmacao] = useState<DadosConfirmacao | null>(null);

  // Desconexoes que precisam sobreviver ao sync e ao reload: ids de aresta que
  // o usuario cortou. O sync nao as recria enquanto estiverem aqui.
  const [arestasRemovidas, setArestasRemovidas] = useState<string[]>([]);

  // Le o canvas salvo e reconstroi cerebro, sessoes e arestas.
  // Os nos de contexto e contêiner nascem dos syncs (a lista de pecas e a fonte
  // da verdade), aqui so guardamos a posicao deles.
  // Migracao (versao 2 -> 3): nos "geracao" e arestas "aresta-geracao" somem
  // (viram itens do contêiner), geracoesOcultas e ignorado. E idempotente:
  // carregar um canvas ja migrado nao duplica nada, pois os contêineres derivam
  // do tipo das pecas e sao unicos por tipo.
  const carregarCanvas = useCallback(async () => {
    const salvo = await api.obterCanvas<Partial<CanvasSalvo>>();
    if (!salvo || !Array.isArray(salvo.nos)) return;

    // Restaura a lista de desconexoes antes das arestas e nos.
    const removidas = Array.isArray(salvo.arestasRemovidas)
      ? salvo.arestasRemovidas
      : [];
    setArestasRemovidas(removidas);
    const setRemovidas = new Set(removidas);

    const cerebroSalvo = salvo.nos.find((n) => n.tipo === "cerebro");
    const sessoesSalvas = salvo.nos
      .filter((n) => n.tipo === "sessao")
      .map<Node>((n) => ({
        id: n.id,
        type: "sessao",
        position: n.posicao,
        data: { ...n.dados },
      }));

    layoutContextos.current = new Map(
      salvo.nos
        .filter((n) => n.tipo === "contexto")
        .map((n) => [n.id, { posicao: n.posicao, dimensoes: n.dimensoes }])
    );
    layoutContainers.current = new Map(
      salvo.nos.filter((n) => n.tipo === "container").map((n) => [n.id, n.posicao])
    );

    // Preserva os nos de contexto e contêiner ja presentes: eles nascem da lista
    // viva (contextos e pecas), nao do canvas.json. Sem isso, quando o sync
    // ganha a corrida e cria esses nos ANTES da restauracao, este setNodes os
    // apagaria e nada os recriaria (a lista viva nao muda de novo).
    // Mas REAPLICA a posicao e as dimensoes salvas neles: quando o sync ganha a
    // corrida, esses nos nasceram em posicao calculada (a espiral de colisao),
    // que varia a cada boot. Sem reaplicar, o layout salvo nunca volta e os
    // contêineres "pulam" de lugar a cada reload.
    setNodes((atuais) => {
      const derivados = atuais
        .filter((n) => n.type === "contexto" || n.type === "container")
        .map((n) => {
          if (n.type === "container") {
            const pos = layoutContainers.current.get(n.id);
            return pos ? { ...n, position: pos } : n;
          }
          const salvoCtx = layoutContextos.current.get(n.id);
          if (!salvoCtx) return n;
          return {
            ...n,
            position: salvoCtx.posicao,
            ...(salvoCtx.dimensoes
              ? {
                  width: salvoCtx.dimensoes.largura,
                  height: salvoCtx.dimensoes.altura,
                }
              : {}),
          };
        });
      return [
        {
          id: "cerebro",
          type: "cerebro",
          position: cerebroSalvo?.posicao ?? POSICAO_CEREBRO,
          data: { aoClicar: aoClicarCerebro },
          draggable: true,
          deletable: false,
        },
        ...sessoesSalvas,
        ...derivados,
      ];
    });

    const arestas = (salvo.arestas ?? [])
      // Aresta que o usuario desconectou nao volta.
      .filter((a) => !setRemovidas.has(a.id))
      .map<Edge | null>((a) => {
        if (a.classe?.includes("aresta-contexto")) {
          return arestaContexto(a.source, a.target);
        }
        // Migracao: arestas cerebro->geracao (versao 2), as arestas derivadas
        // sessao->contêiner e as de terminal (fluxo removido em 2026-07-13)
        // nao voltam do disco. As derivadas o sync (re)constroi.
        if (
          a.classe?.includes("aresta-geracao") ||
          a.classe?.includes("aresta-container") ||
          a.classe?.includes("aresta-terminal")
        ) {
          return null;
        }
        return arestaCerebro(a.target, corLigacao);
      })
      .filter((e): e is Edge => e !== null);
    setEdges(arestas);
    // Sinaliza que os nos salvos voltaram, pra poda de sessoes orfas rodar.
    setRestauracoes((n) => n + 1);
  }, [aoClicarCerebro, setNodes, setEdges]);

  // Boot: carrega o canvas salvo uma vez. So libera o autosave depois.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await carregarCanvas();
      } catch {
        // sem canvas salvo, segue com o padrao
      } finally {
        if (vivo) {
          prontoParaSalvar.current = true;
          setCanvasCarregado(true);
        }
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enquadra a visao em todos os nos, com folga confortavel. Espera um frame
  // pra os nos ja estarem medidos antes de calcular o zoom.
  const enquadrar = useCallback(() => {
    window.setTimeout(() => {
      // Piso de zoom mais alto (0.7) e padding menor: abre o canvas mais perto,
      // pra os controles e alvos nascerem em tamanho usavel em vez de minusculos.
      void fitView({ padding: 0.12, duration: 400, minZoom: 0.7, maxZoom: 1 });
    }, 90);
  }, [fitView]);

  // Recarrega tudo: refaz o estado (sessoes, pecas, contextos, custos, etc) e
  // re-sincroniza os nos a partir do canvas salvo. Re-enquadra a visao no fim.
  const recarregarTudo = useCallback(async () => {
    setRecarregando(true);
    try {
      await carregarCanvas();
      await estado.recarregarTudo();
    } catch {
      // best effort, nao trava a interface
    } finally {
      setRecarregando(false);
      enquadrar();
    }
  }, [carregarCanvas, estado, enquadrar]);

  // Enquadramento de boot: depois do primeiro sync completo (canvas restaurado
  // + contextos e geracoes ja criados), roda o fitView UMA vez.
  useEffect(() => {
    if (enquadrouBoot.current) return;
    if (!canvasCarregado || estado.carregandoInicial) return;
    enquadrouBoot.current = true;
    enquadrar();
  }, [canvasCarregado, estado.carregandoInicial, enquadrar]);

  // Mantem o callback vivo no no do Cerebro (funcoes nao sao serializadas).
  // Depende do aoClicarCerebro de verdade: ele muda quando o cerebroPreenchido
  // do cliente ativo muda, e o no precisa do closure NOVO (bug real de QA: com
  // a dependencia errada, trocar de cliente deixava o callback do cliente
  // anterior e o Cerebro vazio abria o popover em vez da cerimonia).
  useEffect(() => {
    setNodes((ns) =>
      ns.map((n) =>
        n.type === "cerebro" ? { ...n, data: { aoClicar: aoClicarCerebro } } : n
      )
    );
  }, [aoClicarCerebro, setNodes]);

  // Sincroniza os nos de contexto com a lista de contextos do estado.
  // Remove orfaos, cria os que faltam e liga as pendencias de conexao.
  useEffect(() => {
    const idsContexto = new Set(contextos.map((c) => c.id));

    setNodes((atuais) => {
      const semOrfaos = atuais.filter(
        (n) =>
          n.type !== "contexto" ||
          idsContexto.has((n.data as { idContexto: string }).idContexto)
      );
      const jaTem = new Set(
        semOrfaos
          .filter((n) => n.type === "contexto")
          .map((n) => (n.data as { idContexto: string }).idContexto)
      );
      const faltantes = contextos.filter((c) => !jaTem.has(c.id));
      if (faltantes.length === 0 && semOrfaos.length === atuais.length) {
        return atuais;
      }
      let contagem = jaTem.size;
      const novos = faltantes.map<Node>((c) => {
        const idNo = `ctx-${c.id}`;
        const pend = pendentes.current.get(c.id);
        const salvo = layoutContextos.current.get(idNo);
        const pos =
          pend?.posicao ??
          salvo?.posicao ??
          {
            x: POSICAO_CEREBRO.x - 60 + (contagem % 3) * 300,
            y: POSICAO_CEREBRO.y + 280 + Math.floor(contagem / 3) * 260,
          };
        contagem += 1;
        const dim = salvo?.dimensoes ?? dimPadrao(c.tipo);
        return {
          id: idNo,
          type: "contexto",
          position: pos,
          width: dim.largura,
          height: dim.altura,
          data: { idContexto: c.id },
        };
      });
      return [...semOrfaos, ...novos];
    });

    // Remove arestas que apontam pra nos de contexto que sumiram.
    const idsNoValidos = new Set(contextos.map((c) => `ctx-${c.id}`));
    setEdges((atuais) =>
      atuais.filter((e) => !e.source.startsWith("ctx-") || idsNoValidos.has(e.source))
    );

    // Liga as pendencias de conexao (anexo do composer).
    for (const [idContexto, pend] of pendentes.current.entries()) {
      if (idsContexto.has(idContexto) && pend.conectarA) {
        const idNo = `ctx-${idContexto}`;
        const alvo = pend.conectarA;
        setEdges((atuais) => {
          if (atuais.some((e) => e.source === idNo && e.target === alvo)) {
            return atuais;
          }
          return [...atuais, arestaContexto(idNo, alvo)];
        });
      }
    }
    // Limpa as pendencias que ja viraram no.
    for (const idContexto of Array.from(pendentes.current.keys())) {
      if (idsContexto.has(idContexto)) pendentes.current.delete(idContexto);
    }
  }, [contextos, setNodes, setEdges]);

  // Sincroniza os nos contêiner com os tipos de peca existentes. Um tipo com
  // pelo menos uma geracao ganha um contêiner; tipo que zerou perde o seu. Ha
  // um contêiner por tipo (id unico cont-<tipo>), entao isto e idempotente:
  // rodar de novo com as mesmas pecas nao cria nada. A posicao persiste no
  // canvas. As gerações em si vivem dentro do no, lidas da lista de pecas.
  useEffect(() => {
    const tiposComPeca = Array.from(new Set(pecas.map((p) => p.tipo)));
    const idsValidos = new Set(tiposComPeca.map((t) => idContainer(t)));

    setNodes((atuais) => {
      const semOrfaos = atuais.filter(
        (n) => n.type !== "container" || idsValidos.has(n.id)
      );
      const jaTem = new Set(
        semOrfaos.filter((n) => n.type === "container").map((n) => n.id)
      );
      const faltantes = tiposComPeca.filter((t) => !jaTem.has(idContainer(t)));
      if (faltantes.length === 0 && semOrfaos.length === atuais.length) {
        return atuais;
      }
      // Contêiner novo nasce na coluna da direita, sem sobrepor os que ja estao.
      let contagem = jaTem.size;
      const novos = faltantes.map<Node>((tipo) => {
        const idNo = idContainer(tipo);
        const salvo = layoutContainers.current.get(idNo);
        // Altura real de um contêiner cheio chega a ~420 (4 miniaturas + botao).
        // Espacamento menor que isso empilha um no em cima do outro e o de cima
        // rouba os cliques do de baixo. 460 de passo + 440 de colisao dao folga.
        const desejada = salvo ?? {
          x: POSICAO_CEREBRO.x + 1120,
          y: 40 + contagem * 460,
        };
        contagem += 1;
        const pos = salvo
          ? desejada
          : posicaoLivre(desejada, { largura: 240, altura: 440 }, semOrfaos);
        return {
          id: idNo,
          type: "container",
          position: pos,
          data: { tipoPeca: tipo },
        };
      });
      return [...semOrfaos, ...novos];
    });

    // Remove arestas orfas que apontam pra um contêiner que deixou de existir.
    setEdges((atuais) => {
      const proximo = atuais.filter(
        (e) => e.className !== "aresta-container" || idsValidos.has(e.target)
      );
      return proximo.length === atuais.length ? atuais : proximo;
    });
  }, [pecas, setNodes, setEdges]);

  // Arestas sessao -> contêiner: o segundo nivel da arvore. Cada no de sessao
  // liga no contêiner do tipo que ela gera, se esse contêiner existir. Contêiner
  // sem nenhuma sessao viva do tipo fica sem aresta de entrada (nao liga no
  // Cerebro). Nao recria as que o usuario desconectou. Depende de nodes pra
  // reagir a sessao nova, mas so troca o estado quando o conjunto muda de fato,
  // entao arrastar um no nao provoca churn nem autosave.
  useEffect(() => {
    const removidas = new Set(arestasRemovidas);
    const tiposComContainer = new Set<string>(pecas.map((p) => p.tipo));

    // Pares (sessao, contêiner) desejados agora.
    const desejadas: Array<{ idSessao: string; idCont: string }> = [];
    for (const n of nodes) {
      if (n.type !== "sessao") continue;
      const tipo = tipoDoFluxo((n.data as { idFluxo?: string }).idFluxo);
      if (!tipo || !tiposComContainer.has(tipo)) continue;
      const idCont = idContainer(tipo);
      const idAresta = idArestaContainer(n.id, idCont);
      if (removidas.has(idAresta)) continue;
      desejadas.push({ idSessao: n.id, idCont });
    }
    const idsDesejados = new Set(
      desejadas.map((d) => idArestaContainer(d.idSessao, d.idCont))
    );

    setEdges((atuais) => {
      const outras = atuais.filter((e) => e.className !== "aresta-container");
      const containerAtuais = atuais.filter(
        (e) => e.className === "aresta-container"
      );
      const igualQtde = containerAtuais.length === idsDesejados.size;
      const todasPresentes = containerAtuais.every((e) => idsDesejados.has(e.id));
      // Nada mudou no conjunto: devolve a mesma referencia (sem re-render).
      if (igualQtde && todasPresentes) return atuais;
      const novas = desejadas.map((d) =>
        arestaSessaoContainer(d.idSessao, d.idCont)
      );
      return [...outras, ...novas];
    });
  }, [nodes, pecas, arestasRemovidas, setEdges]);

  // Descarta nos de sessao fantasma: no restaurado do canvas com idSessao que
  // nao existe mais no backend (sessao apagada) sai do canvas. So roda depois
  // que a lista de sessoes chegou (fim do carregamento inicial), senao pruna
  // enquanto a lista ainda esta vazia. No composer (sem idSessao) fica vivo.
  useEffect(() => {
    if (estado.carregandoInicial) return;
    // Blindagem contra a corrida da troca de cliente: enquanto trocandoWorkspace
    // e a lista de sessoes do workspace novo ainda nao chegou (sessoesProntas
    // false), NAO poda. Senao a janela em que sessoes=[] com o canvas novo ja
    // carregado apagaria nos legitimos, e o autosave persistiria a perda.
    if (estado.trocandoWorkspace && !estado.sessoesProntas) return;
    const idsSessao = new Set(estado.sessoes.map((s) => s.id));

    const orfaos = new Set<string>();
    setNodes((atuais) => {
      const filtrados = atuais.filter((n) => {
        if (n.type !== "sessao") return true;
        const idSessao = (n.data as { idSessao?: string }).idSessao;
        if (!idSessao) return true; // composer ainda nao disparado, mantem
        const ok = idsSessao.has(idSessao);
        if (!ok) orfaos.add(n.id);
        return ok;
      });
      return filtrados.length === atuais.length ? atuais : filtrados;
    });

    if (orfaos.size > 0) {
      setEdges((atuais) =>
        atuais.filter((e) => !orfaos.has(e.source) && !orfaos.has(e.target))
      );
    }
  }, [
    estado.sessoes,
    estado.carregandoInicial,
    estado.trocandoWorkspace,
    estado.sessoesProntas,
    restauracoes,
    setNodes,
    setEdges,
  ]);

  // Autosave do canvas com debounce de 1s a cada mudanca.
  useEffect(() => {
    if (!prontoParaSalvar.current) return;
    if (timerCanvas.current) window.clearTimeout(timerCanvas.current);
    // workspaceId capturado AGORA, no momento do agendamento, nao na hora do
    // fetch. Se o cliente trocar antes de o save sair, o servidor devolve 409 e
    // o cliente descarta em silencio: nunca grava o canvas de um cliente sobre
    // o de outro (fecha a corrida de gravar o canvas do cliente A no B).
    const wsAgendado = estado.workspaceAtivo;
    timerCanvas.current = window.setTimeout(() => {
      void api
        .salvarCanvas(serializar(nodes, edges, arestasRemovidas), wsAgendado)
        .catch(() => {
          // salvar o layout e best effort, nao incomoda o usuario
        });
    }, 1000);
    return () => {
      if (timerCanvas.current) window.clearTimeout(timerCanvas.current);
    };
  }, [nodes, edges, arestasRemovidas, estado.workspaceAtivo]);

  const criarNoFluxo = useCallback(
    (idFluxo: string, posicao?: { x: number; y: number }) => {
      // Fluxo que so nasce completo pelo assistente sai do canvas e vai pra
      // rota de criacao. Nenhum no e criado aqui.
      const assistente = acharFluxo(idFluxo)?.abreAssistente;
      if (assistente) {
        irParaTela(`criar:${assistente}`);
        return;
      }

      const indice = contador.current;
      contador.current += 1;
      const id = `sessao-${Date.now()}-${indice}`;
      const coluna = Math.floor(indice / 4);
      const linha = indice % 4;
      const alvo =
        posicao ?? {
          x: POSICAO_CEREBRO.x + 420 + coluna * 380,
          y: 60 + linha * 250,
        };
      const pos = posicaoLivre(alvo, { largura: 340, altura: 420 }, getNodes());

      setNodes((atuais) => [
        ...atuais,
        { id, type: "sessao", position: pos, data: { idFluxo } },
      ]);
      setEdges((atuais) => [...atuais, arestaCerebro(id, corLigacao)]);
    },
    [setNodes, setEdges, getNodes]
  );

  // Cria um no de contexto ja conectado a uma sessao (anexo do composer).
  const criarContextoConectado = useCallback<ApiCanvas["criarContextoConectado"]>(
    async (idNoSessao, nomeSugerido, arquivos, tipo) => {
      const noSessao = getNode(idNoSessao);
      const base = noSessao?.position ?? POSICAO_CEREBRO;
      const posicao = posicaoLivre(
        { x: base.x - 380, y: base.y + 60 },
        dimPadrao(tipo),
        getNodes()
      );
      const nome = nomeSugerido.trim() || "Materiais da tarefa";
      const contexto = await estado.criarContexto(nome, tipo);
      pendentes.current.set(contexto.id, { posicao, conectarA: idNoSessao });
      if (arquivos.length > 0) {
        await estado.anexarArquivos(contexto.id, arquivos);
      }
      return contexto.id;
    },
    [getNode, getNodes, estado]
  );

  // Corta uma aresta e marca o corte pra sobreviver ao sync e ao reload.
  // Fica antes do apiCanvas porque ele entrega esta funcao pras arestas: o
  // botao de corte no meio do caminho chama daqui.
  const desconectarAresta = useCallback((idAresta: string) => {
    setEdges((es) => es.filter((e) => e.id !== idAresta));
    setArestasRemovidas((prev) =>
      prev.includes(idAresta) ? prev : [...prev, idAresta]
    );
  }, [setEdges]);

  const apiCanvas = useMemo<ApiCanvas>(
    () => ({ criarContextoConectado, desconectarAresta }),
    [criarContextoConectado, desconectarAresta]
  );

  const criarContextoTipado = useCallback(
    async (posicao: { x: number; y: number }, tipo: TipoContexto) => {
      const nome =
        tipo === "imagens"
          ? "Referências de imagens"
          : tipo === "links"
          ? "Links de referência"
          : "Bloco de notas";
      const livre = posicaoLivre(posicao, dimPadrao(tipo), getNodes());
      const contexto = await estado.criarContexto(nome, tipo);
      pendentes.current.set(contexto.id, { posicao: livre });
    },
    [estado, getNodes]
  );

  // Abre a galeria de um no contêiner pelo menu de botao direito.
  const abrirGaleriaContainer = useCallback(
    (idNo: string) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === idNo ? { ...n, data: { ...n.data, abrirGaleria: true } } : n
        )
      );
    },
    [setNodes]
  );

  const duplicarSessao = useCallback(
    (no: Node) => {
      const indice = contador.current;
      contador.current += 1;
      const id = `sessao-${Date.now()}-${indice}`;
      const dadosLimpos: Record<string, unknown> = {};
      for (const campo of CAMPOS_SESSAO) {
        if (campo === "idSessao") continue;
        const valor = (no.data as Record<string, unknown>)[campo];
        if (valor !== undefined) dadosLimpos[campo] = valor;
      }
      const pos = { x: no.position.x + 40, y: no.position.y + 40 };
      setNodes((atuais) => [
        ...atuais,
        { id, type: "sessao", position: pos, data: dadosLimpos },
      ]);
      setEdges((atuais) => [...atuais, arestaCerebro(id, corLigacao)]);
    },
    [setNodes, setEdges]
  );

  const marcarEditando = useCallback(
    (idNo: string) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === idNo ? { ...n, data: { ...n.data, editando: true } } : n
        )
      );
    },
    [setNodes]
  );

  const expandirNo = useCallback(
    (idNo: string) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === idNo ? { ...n, data: { ...n.data, expandido: true } } : n
        )
      );
    },
    [setNodes]
  );

  const removerNo = useCallback(
    (idNo: string) => {
      setNodes((ns) => ns.filter((n) => n.id !== idNo));
      setEdges((es) => es.filter((e) => e.source !== idNo && e.target !== idNo));
    },
    [setNodes, setEdges]
  );

  const excluirNoSessao = useCallback(
    async (no: Node) => {
      const idSessao = (no.data as { idSessao?: string }).idSessao;
      if (idSessao) {
        try {
          await estado.excluirSessao(idSessao);
        } catch {
          // segue removendo do canvas mesmo se o backend reclamar
        }
      }
      removerNo(no.id);
    },
    [estado, removerNo]
  );

  const excluirNoContexto = useCallback(
    async (no: Node) => {
      const idContexto = (no.data as { idContexto?: string }).idContexto;
      if (idContexto) {
        try {
          await estado.excluirContexto(idContexto);
        } catch {
          // o sync remove o no quando a lista atualiza
        }
      }
    },
    [estado]
  );

  const fecharMenu = useCallback(() => setMenu(null), []);

  // Marca a moldura do canvas durante o arrasto de um no. O css pausa as
  // animacoes continuas (dash das arestas, pulso do Cerebro) e tira o glow
  // das arestas nesse intervalo, pra cada frame do arrasto pintar mais rapido.
  // Direto no classList, sem estado: nao provoca re-render no inicio do gesto.
  const aoComecarArrasto = useCallback(() => {
    refArea.current?.classList.add("arrastando");
  }, []);
  const aoTerminarArrasto = useCallback(() => {
    refArea.current?.classList.remove("arrastando");
  }, []);

  // Liga um no de contexto a uma sessao ao arrastar entre os handles.
  // A MESMA regra que o onConnect aplica, mas entregue ao React Flow ANTES do
  // gesto terminar. Sem isto o canvas deixava a pessoa puxar a linha ate um
  // alvo que ele ia recusar, e recusava calado: o gesto acabava, nada
  // acontecia e ninguem dizia por que. Com isto a alca invalida nao acende, a
  // linha em voo se marca como invalida e o onConnect nem chega a ser chamado.
  const conexaoValida = useCallback(
    (conexao: Connection | Edge) => {
      const origem = conexao.source;
      const destino = conexao.target;
      if (!origem || !destino) return false;
      if (!origem.startsWith("ctx-")) return false;
      return getNode(destino)?.type === "sessao";
    },
    [getNode]
  );

  const aoConectar = useCallback(
    (conexao: Connection) => {
      if (!conexao.source || !conexao.target) return;
      if (!conexao.source.startsWith("ctx-")) return;
      const alvo = getNode(conexao.target);
      if (!alvo || alvo.type !== "sessao") return;
      const nova = arestaContexto(conexao.source, conexao.target);
      // Reconectar apaga a marca de "desconectada", senao o reload a cortaria.
      setArestasRemovidas((prev) => prev.filter((x) => x !== nova.id));
      setEdges((atuais) => {
        if (
          atuais.some(
            (e) => e.source === conexao.source && e.target === conexao.target
          )
        ) {
          return atuais;
        }
        return [...atuais, nova];
      });
    },
    [getNode, setEdges]
  );

  // Monta os itens do menu conforme o alvo do clique direito.
  const menuDaSessao = useCallback(
    (no: Node): ItemMenu[] => {
      const idSessao = (no.data as { idSessao?: string }).idSessao;
      const sessao = idSessao
        ? estado.sessoes.find((s) => s.id === idSessao)
        : undefined;
      const rodando =
        sessao?.status === "rodando" ||
        sessao?.status === "iniciando" ||
        sessao?.status === "fila";
      const itens: ItemMenu[] = [
        {
          id: "renomear",
          rotulo: "Renomear",
          icone: <IconeLapis className="" />,
          aoClicar: () => marcarEditando(no.id),
        },
        {
          id: "duplicar",
          rotulo: "Duplicar",
          icone: <IconeDuplicar className="" />,
          aoClicar: () => duplicarSessao(no),
        },
      ];
      if (rodando) {
        itens.push({
          id: "parar",
          rotulo: "Parar",
          icone: <IconeParar className="" />,
          aoClicar: () => {
            if (idSessao) void estado.pararSessao(idSessao);
          },
        });
      }
      itens.push({ id: "sep", separador: true });
      if (idSessao) {
        // Sessao ja disparada: apaga no backend (DELETE) e tira do canvas.
        // Confirmacao inline no proprio menu, sem modal.
        itens.push({
          id: "apagar",
          rotulo: "Remover fluxo",
          icone: <IconeLixeira className="" />,
          destrutivo: true,
          confirmar: true,
          rotuloConfirmar: "Confirmar? As peças ficam salvas",
          aoClicar: () => void excluirNoSessao(no),
        });
      } else {
        // Composer ainda nao disparado: so tira o no do canvas.
        itens.push({
          id: "fechar-composer",
          rotulo: "Fechar composer",
          icone: <IconeX className="" />,
          destrutivo: true,
          aoClicar: () => removerNo(no.id),
        });
      }
      return itens;
    },
    [estado, marcarEditando, duplicarSessao, excluirNoSessao, removerNo]
  );

  const menuDoContexto = useCallback(
    (no: Node): ItemMenu[] => [
      {
        id: "tela-cheia",
        rotulo: "Abrir em tela cheia",
        icone: <IconeOlho className="" />,
        aoClicar: () => expandirNo(no.id),
      },
      {
        id: "renomear",
        rotulo: "Renomear",
        icone: <IconeLapis className="" />,
        aoClicar: () => marcarEditando(no.id),
      },
      { id: "sep", separador: true },
      {
        id: "remover-fonte",
        rotulo: "Remover fonte",
        icone: <IconeLixeira className="" />,
        destrutivo: true,
        aoClicar: () =>
          setConfirmacao({
            titulo: "Excluir este contexto?",
            mensagem:
              "O contexto sai do canvas e os arquivos anexados a ele são apagados. Não dá pra desfazer.",
            rotuloConfirmar: "Excluir contexto",
            aoConfirmar: () => void excluirNoContexto(no),
          }),
      },
    ],
    [expandirNo, marcarEditando, excluirNoContexto]
  );

  const menuDoCerebro = useCallback(
    (): ItemMenu[] => [
      {
        id: "ver",
        rotulo: "Ver Cérebro",
        icone: <IconeOlho className="" />,
        aoClicar: abrirCerebro,
      },
      {
        id: "abrir-fluxos",
        rotulo: "Abrir fluxos",
        icone: <IconeRaio className="" />,
        aoClicar: abrirPopoverFluxos,
      },
    ],
    [abrirCerebro, abrirPopoverFluxos]
  );

  const menuDoContainer = useCallback(
    (no: Node): ItemMenu[] => [
      {
        id: "abrir-galeria",
        rotulo: "Abrir galeria",
        icone: <IconeGaleria className="" />,
        aoClicar: () => abrirGaleriaContainer(no.id),
      },
    ],
    [abrirGaleriaContainer]
  );

  // Menu da aresta: por enquanto so desconectar.
  const menuDaAresta = useCallback(
    (aresta: Edge): ItemMenu[] => [
      {
        id: "desconectar",
        rotulo: "Desconectar",
        icone: <IconeX className="" />,
        destrutivo: true,
        aoClicar: () => desconectarAresta(aresta.id),
      },
    ],
    [desconectarAresta]
  );

  const menuDaTela = useCallback(
    (clientX: number, clientY: number): ItemMenu[] => {
      const posFlow = screenToFlowPosition({ x: clientX, y: clientY });
      return [
        {
          id: "novo-bloco-notas",
          rotulo: "Novo bloco de notas",
          icone: <IconeMais className="" />,
          aoClicar: () => void criarContextoTipado(posFlow, "texto"),
        },
        {
          id: "nova-referencia-imagens",
          rotulo: "Nova referência de imagens",
          icone: <IconeMais className="" />,
          aoClicar: () => void criarContextoTipado(posFlow, "imagens"),
        },
        {
          id: "nova-lista-links",
          rotulo: "Nova lista de links",
          icone: <IconeMais className="" />,
          aoClicar: () => void criarContextoTipado(posFlow, "links"),
        },
        {
          id: "novo-fluxo",
          rotulo: "Novo fluxo",
          icone: <IconeRaio className="" />,
          submenu: FLUXOS_VISIVEIS.map((f) => ({
            id: `fluxo-${f.id}`,
            rotulo: f.rotulo,
            icone: <IconeFluxo id={f.id} className="" />,
            aoClicar: () => criarNoFluxo(f.id, posFlow),
          })),
        },
        { id: "sep", separador: true },
        {
          id: "centralizar",
          rotulo: "Centralizar visão",
          icone: <IconeAlvo className="" />,
          aoClicar: () => void fitView({ padding: 0.3, duration: 400 }),
        },
      ];
    },
    [screenToFlowPosition, criarContextoTipado, criarNoFluxo, fitView]
  );

  // Estado de boas-vindas: workspace sem nenhuma peca e sem nenhuma sessao (nem
  // composer no canvas). Se o Cerebro esta em branco, o convite e preencher o
  // Cerebro; se ja esta pronto, o convite e criar o primeiro fluxo. Discreto,
  // some assim que houver qualquer geracao ou fluxo, e nunca aparece no meio do
  // boot ou da troca de cliente (evita piscar).
  const cerebroPreenchido = estado.estadoVkos?.cerebroPreenchido ?? false;
  const temSessaoNoCanvas = nodes.some((n) => n.type === "sessao");
  const mostrarBoasVindas =
    canvasCarregado &&
    !estado.carregandoInicial &&
    !estado.trocandoWorkspace &&
    !cerebroAberto &&
    !popoverAberto &&
    !cerimoniaAberta &&
    pecas.length === 0 &&
    estado.sessoes.length === 0 &&
    !temSessaoNoCanvas;

  return (
    <CanvasContexto.Provider value={apiCanvas}>
      <div className="area-canvas" ref={refArea}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={tiposNo}
          edgeTypes={tiposAresta}
          onNodesChange={aoMudarNos}
          onEdgesChange={aoMudarArestas}
          onConnect={aoConectar}
          isValidConnection={conexaoValida}
          /* O ima de soltar a linha, em unidades do CANVAS e nao da tela: com
             o canvas afastado ele encolhe junto. 90 deixa o gesto confortavel
             no zoom de trabalho e ainda generoso quando se afasta. */
          connectionRadius={90}
          onNodeDragStart={aoComecarArrasto}
          onNodeDragStop={aoTerminarArrasto}
          onSelectionDragStart={aoComecarArrasto}
          onSelectionDragStop={aoTerminarArrasto}
          onNodeContextMenu={(evento, no) => {
            evento.preventDefault();
            let itens: ItemMenu[] = [];
            if (no.type === "sessao") itens = menuDaSessao(no);
            else if (no.type === "contexto") itens = menuDoContexto(no);
            else if (no.type === "container") itens = menuDoContainer(no);
            else if (no.type === "cerebro") itens = menuDoCerebro();
            if (itens.length > 0) {
              setMenu({ x: evento.clientX, y: evento.clientY, itens });
            }
          }}
          onEdgeContextMenu={(evento, aresta) => {
            evento.preventDefault();
            const itens = menuDaAresta(aresta);
            if (itens.length > 0) {
              setMenu({ x: evento.clientX, y: evento.clientY, itens });
            }
          }}
          onPaneContextMenu={(evento) => {
            evento.preventDefault();
            setMenu({
              x: evento.clientX,
              y: evento.clientY,
              itens: menuDaTela(evento.clientX, evento.clientY),
            });
          }}
          fitView
          fitViewOptions={{ padding: 0.12, minZoom: 0.7, maxZoom: 1 }}
          minZoom={0.3}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
        >
          {/* O ponto do fundo tinha "#1a2621" fixo e ignorava o token
              --pontos-canvas, entao o canvas ficava esverdeado nos tres
              temas. Como var(), ele acompanha o tema. */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--pontos-canvas)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>

        {/* Botao de recarregar, fixo na moldura do canvas (fora do mundo
            infinito). Gira enquanto refaz o estado e re-sincroniza os nos. */}
        <button
          className={`botao-recarregar${recarregando ? " girando" : ""}`}
          onClick={() => void recarregarTudo()}
          disabled={recarregando}
          title="Recarregar o cockpit"
          aria-label="Recarregar o cockpit"
        >
          <IconeRecarregar className="" />
        </button>

        {/* Indicador discreto de boot: some quando o primeiro sync termina. */}
        {(!canvasCarregado || estado.carregandoInicial) && (
          <div className="boot-canvas" role="status">
            {/* O ponto que pulsa e o das primitivas: com movimento reduzido
                ele vira fade em vez de sumir, entao continua dizendo que o
                Hub esta trabalhando. */}
            <span className="ponto-vivo" />
            Carregando o cockpit
          </div>
        )}

        {/* Boas-vindas do cockpit vazio: convite humano em vez de tela fria. */}
        {mostrarBoasVindas && (
          <div className="boas-vindas-canvas">
            <div className="bv-cartao">
              {!cerebroPreenchido ? (
                <>
                  <h3 className="bv-titulo">Este workspace ainda não tem nada</h3>
                  <p className="bv-texto">
                    Tudo começa pelo Cérebro: a identidade do negócio que todas
                    as gerações vão usar. A entrevista guiada monta ele com
                    você, uma pergunta de cada vez.
                  </p>
                  <button
                    className="botao botao-principal bv-botao"
                    onClick={abrirCerimonia}
                  >
                    <IconeRaio className="" />
                    Começar a entrevista
                  </button>
                  <button className="botao botao-fantasma" onClick={abrirCerebro}>
                    <IconeLapis className="" />
                    Prefiro escrever à mão
                  </button>

                  {/* A terceira porta. Ela nasce de um fato: muita gente chega
                      com o negócio já escrito, e responder 13 blocos de novo é
                      trabalho repetido. Fica embaixo das outras duas porque é a
                      que menos gente tem em mãos, não porque é a pior: pra quem
                      tem o arquivo, é a mais rápida das três. */}
                  <div className="bv-divisor">
                    <span>ou</span>
                  </div>

                  <div
                    className={`bv-soltar${arrastandoDocumento ? " arrastando" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label="Enviar um arquivo .md com a identidade do negócio"
                    aria-busy={enviandoDocumento}
                    onClick={() => refArquivoCerebro.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        refArquivoCerebro.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setArrastandoDocumento(true);
                    }}
                    onDragLeave={(e) => {
                      e.stopPropagation();
                      setArrastandoDocumento(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setArrastandoDocumento(false);
                      void receberDocumentoCerebro(e.dataTransfer.files?.[0]);
                    }}
                  >
                    <IconeArquivo className="bv-soltar-icone" />
                    <span className="bv-soltar-titulo">
                      {enviandoDocumento
                        ? "Enviando o documento..."
                        : arrastandoDocumento
                          ? "Solte o arquivo aqui"
                          : "Já tenho tudo escrito num .md"}
                    </span>
                    <span className="bv-soltar-dica">
                      {arrastandoDocumento
                        ? "Por enquanto só arquivo .md."
                        : "Arraste o arquivo aqui, ou clique pra escolher. O Hub lê, monta o Cérebro e só pergunta o que faltar."}
                    </span>
                  </div>

                  {erroDocumento && (
                    <span className="bv-erro" role="alert">
                      {erroDocumento}
                    </span>
                  )}

                  <input
                    ref={refArquivoCerebro}
                    type="file"
                    hidden
                    accept=".md,text/markdown"
                    onChange={(e) => {
                      void receberDocumentoCerebro(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </>
              ) : (
                <>
                  <h3 className="bv-titulo">O Cérebro está pronto</h3>
                  <p className="bv-texto">
                    Agora crie o primeiro fluxo: uma sessão de IA que gera a
                    partir do Cérebro deste workspace.
                  </p>
                  <button
                    className="botao botao-principal bv-botao"
                    onClick={abrirPopoverFluxos}
                  >
                    <IconeRaio className="" />
                    Criar o primeiro fluxo
                  </button>
                  <span className="bv-dica">
                    Dica: clicar no nó Cérebro também abre os fluxos.
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {popoverAberto && (
          <PopoverFluxos
            refArea={refArea}
            aoEscolher={(idFluxo) => criarNoFluxo(idFluxo)}
            aoFechar={() => setPopoverAberto(false)}
          />
        )}

        {cerebroAberto && <PainelCerebro aoFechar={() => setCerebroAberto(false)} />}

        {cerimoniaAberta && (
          <CerimoniaCerebro
            documento={documentoCerebro}
            aoFechar={() => {
              setCerimoniaAberta(false);
              // O documento e semente de UMA cerimonia. Mantê-lo depois de
              // fechar faria a proxima abertura tentar semear de novo por cima
              // de uma entrevista que ja existe. O arquivo continua no
              // workspace, entao nada se perde.
              setDocumentoCerebro(null);
            }}
            aoCriarFluxo={() => {
              setCerimoniaAberta(false);
              setDocumentoCerebro(null);
              abrirPopoverFluxos();
            }}
          />
        )}

        {menu && (
          <MenuContexto
            x={menu.x}
            y={menu.y}
            itens={menu.itens}
            aoFechar={fecharMenu}
          />
        )}

        {confirmacao && (
          <Confirmacao
            dados={confirmacao}
            aoFechar={() => setConfirmacao(null)}
          />
        )}
      </div>
    </CanvasContexto.Provider>
  );
}

export function Cockpit() {
  // A barra superior antiga saiu: o shell (sidebar) mostra marca e status agora.
  return (
    <div className="cockpit">
      <ReactFlowProvider>
        <CanvasCockpit />
      </ReactFlowProvider>
    </div>
  );
}
