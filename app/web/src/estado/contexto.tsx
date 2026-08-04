import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as api from "../api/cliente";
import {
  ErroRede,
  type ConfigApp,
  type Custos,
  type EscopoPecaSessao,
  type ModeloIA,
} from "../api/cliente";
import { usarWebSocket } from "../api/websocket";
import type { AvisoCrm } from "../componentes/crm/aovivo";
import type { AvisoMensagens } from "../tipos/mensagens";
import type {
  Ambiente,
  Contexto,
  EstadoVkos,
  EventoClaude,
  MensagemWs,
  ModeloCarrossel,
  Peca,
  Sessao,
  TipoContexto,
  TurnoSessao,
  Workspace,
} from "../tipos/dominio";

// Texto acumulado do streaming de uma sessao.
export interface EstadoStream {
  texto: string;
  // Ja recebeu delta parcial. Evita duplicar quando o evento assistant fecha.
  recebeuDelta: boolean;
  custoUsd?: number;
  // Ferramentas usadas ao vivo pela sessao (rodada 10, VKOS-IDE). Cada entrada
  // vem do evento WS sessao:ferramenta. Guardamos so as ultimas 200.
  ferramentas?: { nome: string; alvo: string }[];
}

interface ValorContexto {
  carregandoInicial: boolean;
  servidorOnline: boolean;
  wsConectado: boolean;
  // Ultimo aviso de mudanca no CRM. A tela do CRM assina por aqui, pelo mesmo
  // WebSocket unico do app: cada aviso e um objeto novo, entao um efeito na tela
  // dispara mesmo quando dois avisos iguais chegam seguidos. Uma segunda
  // conexao WebSocket so pro CRM criaria duas verdades de reconexao.
  avisoCrm: AvisoCrm | null;
  // Ultimo aviso de mudanca nas conversas, pelo mesmo caminho do avisoCrm. A
  // tela do chat assina por aqui e decide sozinha o que reler: o contexto so
  // repassa, porque so a tela sabe qual thread esta aberta e se ha campo sendo
  // editado no painel de contexto.
  avisoMensagens: AvisoMensagens | null;
  // Quantas vezes o observador de arquivos avisou que uma peca mudou em disco.
  //
  // A lista `pecas` nao serve pra isso: o conteudo DENTRO de uma peca muda sem
  // a lista mudar de forma, e uma tela que abre o arquivo da peca (a campanha de
  // anuncio, por exemplo) precisa saber que o arquivo dela e outro agora. Um
  // contador e o sinal mais barato que existe: ele muda a cada aviso, e quem
  // nao liga pra isso simplesmente nao le.
  //
  // O observador tem debounce de 1 segundo. Quem depende deste aviso pra
  // "atualizar sozinho" espera ate um segundo, e isso e de propósito.
  avisoPecas: number;
  avisoAssistente: number;
  ambiente: Ambiente | null;
  estadoVkos: EstadoVkos | null;
  cockpitLiberado: boolean;
  sessoes: Sessao[];
  sessoesCore: Sessao[];
  streams: Record<string, EstadoStream>;
  pecas: Peca[];
  contextos: Contexto[];
  custos: Custos | null;
  // Modelo padrao das sessoes, vindo de GET /api/config.
  modeloPadrao: ModeloIA;
  // Modelos de carrossel do VKOS, cacheados.
  modelosCarrossel: ModeloCarrossel[];
  // Clientes (workspaces). Tudo que a tela mostra e do workspace ativo.
  workspaces: Workspace[];
  workspaceAtivo: string | null;
  // Verdadeiro durante a troca de cliente: dispara o veu de transicao.
  trocandoWorkspace: boolean;
  // Sinal explicito de que a lista de sessoes do workspace atual ja chegou.
  // Vira false ao iniciar uma troca de cliente e true quando recarregarSessoes
  // conclui. A poda de sessoes fantasma do canvas se apoia nele pra nao apagar
  // nos legitimos na janela em que sessoes=[] com o canvas novo ja carregado.
  sessoesProntas: boolean;
  recarregarWorkspaces: () => Promise<void>;
  // Troca iniciada pelo usuario: ativa no backend e recarrega tudo.
  trocarWorkspace: (id: string) => Promise<void>;
  // Registra uma pasta VKOS existente como cliente e ja troca pra ela.
  adicionarCliente: (pasta: string, nome?: string) => Promise<void>;
  // Cria um cliente novo clonando a estrutura do ativo. Devolve os avisos.
  criarCliente: (nome: string) => Promise<string[]>;
  renomearCliente: (id: string, nome: string) => Promise<void>;
  removerCliente: (id: string) => Promise<void>;
  recarregarInicial: () => Promise<void>;
  recarregarSessoesCore: () => Promise<void>;
  recarregarAmbiente: () => Promise<void>;
  definirPastaVkos: (caminho: string) => Promise<EstadoVkos>;
  liberarCockpit: () => void;
  criarSessao: (dados: {
    titulo?: string;
    prompt: string;
    skill?: string;
    modelo?: ModeloIA;
    // Rodada 10 (VKOS-IDE): permissao da sessao. padrao = edita arquivos com
    // cuidado; total = sem freios. Repassada no body pro backend.
    permissao?: "padrao" | "total";
    escopoPeca?: EscopoPecaSessao;
    // "projeto" roda na raiz da instalacao. So o chat da VKOS-IDE usa.
    escopo?: "projeto";
    // Geracao guiada de site: liga o laco de conformidade a peca alvo.
    pastaAlvo?: string;
  }) => Promise<Sessao>;
  enviarMensagem: (id: string, texto: string) => Promise<void>;
  pararSessao: (id: string) => Promise<void>;
  excluirSessao: (id: string) => Promise<void>;
  obterTranscricao: (id: string) => Promise<TurnoSessao[]>;
  recarregarPecas: () => Promise<void>;
  recarregarContextos: () => Promise<void>;
  recarregarCustos: () => Promise<void>;
  // Refaz tudo que o cockpit desenha: sessoes, pecas, contextos, custos,
  // config, modelos de carrossel e o estado do VKOS (skills, cerebro).
  recarregarTudo: () => Promise<void>;
  criarContexto: (nome: string, tipo?: TipoContexto) => Promise<Contexto>;
  atualizarContexto: (
    id: string,
    dados: { nome?: string; texto?: string }
  ) => Promise<Contexto>;
  excluirContexto: (id: string) => Promise<void>;
  anexarArquivos: (id: string, arquivos: File[]) => Promise<Contexto>;
  removerArquivo: (id: string, nome: string) => Promise<void>;
}

const Contexto = createContext<ValorContexto | null>(null);

// Teto de texto acumulado por sessao. Sessao longa (muitos turnos) inflaria a
// aba pra sempre; ao passar disso, cortamos do inicio e guardamos so a cauda.
const MAX_STREAM = 200_000;

// Corta o texto do stream pela cauda quando passa do teto, pra sessao longa nao
// inchar a memoria da aba.
function limitarStream(texto: string): string {
  return texto.length > MAX_STREAM
    ? texto.slice(texto.length - MAX_STREAM)
    : texto;
}

// Aplica um evento cru do claude no texto acumulado da sessao.
function aplicarEvento(
  anterior: EstadoStream | undefined,
  evento: EventoClaude
): EstadoStream {
  const atual: EstadoStream = anterior ?? { texto: "", recebeuDelta: false };
  const tipo = evento.type;

  if (tipo === "stream_event" && evento.event) {
    const e = evento.event;
    if (
      e.type === "content_block_delta" &&
      e.delta &&
      e.delta.type === "text_delta" &&
      typeof e.delta.text === "string"
    ) {
      return {
        ...atual,
        texto: limitarStream(atual.texto + e.delta.text),
        recebeuDelta: true,
      };
    }
    return atual;
  }

  if (tipo === "assistant" && evento.message?.content) {
    // Se ja veio por delta, o assistant so repete. Ignora pra nao duplicar.
    if (atual.recebeuDelta) return atual;
    const texto = evento.message.content
      .filter((bloco) => bloco.type === "text" && typeof bloco.text === "string")
      .map((bloco) => bloco.text)
      .join("");
    if (texto) return { ...atual, texto: limitarStream(atual.texto + texto) };
    return atual;
  }

  if (tipo === "result") {
    const custo =
      typeof evento.total_cost_usd === "number"
        ? evento.total_cost_usd
        : atual.custoUsd;
    let texto = atual.texto;
    if (!texto && typeof evento.result === "string") {
      texto = evento.result;
    }
    return { ...atual, texto, custoUsd: custo };
  }

  return atual;
}

export function ProvedorEstado({ children }: { children: ReactNode }) {
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [servidorOnline, setServidorOnline] = useState(true);
  const [wsConectado, setWsConectado] = useState(false);
  const [ambiente, setAmbiente] = useState<Ambiente | null>(null);
  const [estadoVkos, setEstadoVkos] = useState<EstadoVkos | null>(null);
  const [cockpitLiberado, setCockpitLiberado] = useState(false);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessoesCore, setSessoesCore] = useState<Sessao[]>([]);
  const [streams, setStreams] = useState<Record<string, EstadoStream>>({});
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [contextos, setContextos] = useState<Contexto[]>([]);
  const [custos, setCustos] = useState<Custos | null>(null);
  const [modeloPadrao, setModeloPadrao] = useState<ModeloIA>("");
  const [modelosCarrossel, setModelosCarrossel] = useState<ModeloCarrossel[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceAtivo, setWorkspaceAtivo] = useState<string | null>(null);
  const [trocandoWorkspace, setTrocandoWorkspace] = useState(false);
  const [sessoesProntas, setSessoesProntas] = useState(false);
  const [avisoCrm, setAvisoCrm] = useState<AvisoCrm | null>(null);
  const [avisoMensagens, setAvisoMensagens] = useState<AvisoMensagens | null>(null);
  const [avisoPecas, setAvisoPecas] = useState(0);
  const [avisoAssistente, setAvisoAssistente] = useState(0);
  // Espelho do ativo pra ler dentro de closures do WS sem recriar callbacks e
  // pra reivindicar a troca de forma sincrona (evita recarga dupla).
  const workspaceAtivoRef = useRef<string | null>(null);

  const timerRetentativa = useRef<number | undefined>(undefined);

  const recarregarPecas = useCallback(async () => {
    try {
      const { pecas: lista } = await api.listarPecas();
      setPecas(lista);
    } catch {
      // peca e secundario, nao derruba a tela
    }
  }, []);

  const recarregarSessoes = useCallback(async () => {
    try {
      const { sessoes: lista } = await api.listarSessoes();
      setSessoes(lista);
      // A lista chegou: libera a poda de sessoes fantasma do canvas.
      setSessoesProntas(true);
    } catch {
      // ignora, o websocket reconcilia
    }
  }, []);

  const recarregarSessoesCore = useCallback(async () => {
    try {
      const { sessoes: lista } = await api.listarSessoesCore();
      setSessoesCore(lista);
    } catch {
      // O historico do CORE e secundario para as telas de workspace.
    }
  }, []);

  const recarregarContextos = useCallback(async () => {
    try {
      const { contextos: lista } = await api.listarContextos();
      setContextos(lista);
    } catch {
      // contexto e secundario, nao derruba a tela
    }
  }, []);

  const recarregarCustos = useCallback(async () => {
    try {
      const dados = await api.obterCustos();
      setCustos(dados);
    } catch {
      // custo e secundario, nao derruba a tela
    }
  }, []);

  const recarregarConfig = useCallback(async () => {
    try {
      const [config, provedores] = await Promise.all([
        api.obterConfig(),
        api.obterProvedores(),
      ]);
      const lista = provedores.provedores.find((p) => p.id === provedores.ativo)?.modelos ?? [];
      const configurado =
        provedores.ativo === "codex"
          ? config.modeloPadraoCodex
          : config.modeloPadraoClaude ?? config.modeloPadrao;
      const padrao = lista.some((m) => m.alias === configurado)
        ? configurado
        : lista[0]?.alias;
      if (padrao) setModeloPadrao(padrao);
    } catch {
      // Sem config, o seletor de cada tela tenta carregar a lista diretamente.
    }
  }, []);

  const recarregarModelosCarrossel = useCallback(async () => {
    try {
      const { modelos } = await api.listarModelosCarrossel();
      setModelosCarrossel(modelos);
    } catch {
      // sem modelos, o seletor cai no "deixar a IA escolher"
    }
  }, []);

  const recarregarWorkspaces = useCallback(async () => {
    try {
      const { workspaces: lista, ativo } = await api.listarWorkspaces();
      setWorkspaces(lista);
      setWorkspaceAtivo(ativo);
      workspaceAtivoRef.current = ativo;
    } catch {
      // sem lista de workspaces, o switcher fica vazio (backend antigo)
    }
  }, []);

  const recarregarInicial = useCallback(async () => {
    setCarregandoInicial(true);
    try {
      const [amb, vkos, config] = await Promise.all([
        api.obterAmbiente(),
        api.obterVkos(),
        api.obterConfig(),
      ]);
      setServidorOnline(true);
      setAmbiente(amb);
      setEstadoVkos(vkos);
      // O setup do motor acontece antes do workspace. Depois dele, um cliente
      // existente entra direto com o provedor escolhido, sem exigir Claude.
      const motorPronto = config.provedorPadrao
        ? amb[config.provedorPadrao].instalado
        : false;
      if (motorPronto && vkos.valida) {
        // Carrega os clientes antes de liberar o cockpit pra a key do canvas
        // ja nascer com o workspace ativo (sem remonte extra no boot).
        await recarregarWorkspaces();
        setCockpitLiberado(true);
        await recarregarSessoes();
        await recarregarSessoesCore();
        await recarregarPecas();
        await recarregarContextos();
        await recarregarCustos();
        await recarregarConfig();
        await recarregarModelosCarrossel();
      }
    } catch (erro) {
      if (erro instanceof ErroRede) {
        setServidorOnline(false);
      }
    } finally {
      setCarregandoInicial(false);
    }
  }, [
    recarregarWorkspaces,
    recarregarSessoes,
    recarregarSessoesCore,
    recarregarPecas,
    recarregarContextos,
    recarregarCustos,
    recarregarConfig,
    recarregarModelosCarrossel,
  ]);

  // Refaz tudo que o cockpit desenha, sem passar pelo estado de boot.
  const recarregarTudo = useCallback(async () => {
    await Promise.all([
      recarregarSessoes(),
      recarregarSessoesCore(),
      recarregarPecas(),
      recarregarContextos(),
      recarregarCustos(),
      recarregarConfig(),
      recarregarModelosCarrossel(),
      (async () => {
        try {
          setEstadoVkos(await api.obterVkos());
        } catch {
          // ignora, o estado atual segue valendo
        }
      })(),
    ]);
  }, [
    recarregarSessoes,
    recarregarSessoesCore,
    recarregarPecas,
    recarregarContextos,
    recarregarCustos,
    recarregarConfig,
    recarregarModelosCarrossel,
  ]);

  const recarregarAmbiente = useCallback(async () => {
    const amb = await api.obterAmbiente();
    setServidorOnline(true);
    setAmbiente(amb);
  }, []);

  const definirPastaVkos = useCallback(async (caminho: string) => {
    const novo = await api.definirVkos(caminho);
    setEstadoVkos(novo);
    return novo;
  }, []);

  const liberarCockpit = useCallback(() => {
    setCockpitLiberado(true);
    void recarregarWorkspaces();
    void recarregarSessoes();
    void recarregarSessoesCore();
    void recarregarPecas();
    void recarregarContextos();
  }, [recarregarWorkspaces, recarregarSessoes, recarregarSessoesCore, recarregarPecas, recarregarContextos]);

  const criarSessao = useCallback(
    async (dados: {
      titulo?: string;
      prompt: string;
      skill?: string;
      modelo?: ModeloIA;
      permissao?: "padrao" | "total";
      escopoPeca?: EscopoPecaSessao;
      pastaAlvo?: string;
      escopo?: "projeto";
    }) => {
      // permissao viaja no body por JSON.stringify: api.criarSessao repassa o
      // objeto inteiro, entao o campo novo chega ao backend sem tocar cliente.ts.
      const { sessao } = await api.criarSessao(dados);
      setSessoes((antes) => {
        const semRepetir = antes.filter((s) => s.id !== sessao.id);
        return [...semRepetir, sessao];
      });
      return sessao;
    },
    []
  );

  const enviarMensagem = useCallback(async (id: string, texto: string) => {
    await api.enviarMensagem(id, texto);
  }, []);

  const obterTranscricao = useCallback(async (id: string) => {
    const { turnos } = await api.obterTranscricao(id);
    return turnos;
  }, []);

  const pararSessao = useCallback(async (id: string) => {
    await api.pararSessao(id);
  }, []);

  const excluirSessao = useCallback(async (id: string) => {
    await api.excluirSessao(id);
    setSessoes((antes) => antes.filter((s) => s.id !== id));
    setStreams((antes) => {
      const copia = { ...antes };
      delete copia[id];
      return copia;
    });
  }, []);

  const criarContexto = useCallback(async (nome: string, tipo: TipoContexto = "texto") => {
    const contexto = await api.criarContexto(nome, tipo);
    setContextos((antes) => {
      const semRepetir = antes.filter((c) => c.id !== contexto.id);
      return [...semRepetir, contexto];
    });
    return contexto;
  }, []);

  const atualizarContexto = useCallback(
    async (id: string, dados: { nome?: string; texto?: string }) => {
      const contexto = await api.atualizarContexto(id, dados);
      setContextos((antes) =>
        antes.map((c) => (c.id === id ? { ...c, ...contexto } : c))
      );
      return contexto;
    },
    []
  );

  const excluirContexto = useCallback(async (id: string) => {
    await api.excluirContexto(id);
    setContextos((antes) => antes.filter((c) => c.id !== id));
  }, []);

  const anexarArquivos = useCallback(async (id: string, arquivos: File[]) => {
    const contexto = await api.anexarArquivos(id, arquivos);
    setContextos((antes) =>
      antes.map((c) => (c.id === id ? { ...c, ...contexto } : c))
    );
    return contexto;
  }, []);

  const removerArquivo = useCallback(async (id: string, nome: string) => {
    await api.removerArquivo(id, nome);
    setContextos((antes) =>
      antes.map((c) =>
        c.id === id
          ? { ...c, arquivos: c.arquivos.filter((a) => a.nome !== nome) }
          : c
      )
    );
  }, []);

  // Aplica a troca de cliente localmente: zera os dados do cliente anterior,
  // remonta o cockpit no novo e recarrega tudo. NAO chama ativar no backend: e
  // usada tanto pela troca local (depois do ativar) quanto pelo evento
  // workspace:ativado vindo de outra aba. Reivindica o ativo de forma sincrona
  // (workspaceAtivoRef) antes de qualquer await, pra que a chamada duplicada
  // (o eco do proprio ativar chega pelo WS) vire no-op e nao recarregue de novo.
  const aplicarTrocaLocal = useCallback(
    async (id: string) => {
      if (id === workspaceAtivoRef.current) return;
      workspaceAtivoRef.current = id;
      setTrocandoWorkspace(true);
      // A lista de sessoes do cliente novo ainda nao chegou: trava a poda de
      // sessoes fantasma ate recarregarSessoes concluir, pra ela nao apagar os
      // nos legitimos do canvas recem carregado enquanto sessoes=[].
      setSessoesProntas(false);
      // Zera o que era do cliente anterior antes de remontar o canvas, pra o
      // cockpit novo nunca desenhar pecas ou contextos do cliente antigo.
      setStreams({});
      setPecas([]);
      setContextos([]);
      setSessoes([]);
      // Remonta o cockpit no cliente novo (a key no Shell muda). Desmontar o
      // cockpit antigo cancela o autosave pendente dele, que senao gravaria o
      // canvas do cliente anterior por cima do novo.
      setWorkspaceAtivo(id);
      // Recarrega os dados do novo cliente. O veu cobre a transicao.
      await recarregarTudo();
      await recarregarWorkspaces();
      // Segura o veu por um instante pra o fade nao piscar.
      window.setTimeout(() => setTrocandoWorkspace(false), 260);
    },
    [recarregarTudo, recarregarWorkspaces]
  );

  const trocarWorkspace = useCallback(
    async (id: string) => {
      if (id === workspaceAtivoRef.current) return;
      const r = await api.ativarWorkspace(id);
      // O alvo da acao manda: usa o id do workspace da resposta nova quando ele
      // vem, senao cai no id pedido. aplicarTrocaLocal recarrega a lista.
      await aplicarTrocaLocal(r.workspace?.id ?? id);
    },
    [aplicarTrocaLocal]
  );

  const adicionarCliente = useCallback(
    async (pasta: string, nome?: string) => {
      const r = await api.adicionarWorkspace(pasta, nome);
      // adicionarWorkspace ja ativa no backend; so precisamos aplicar local.
      // Sem workspace na resposta (backend antigo sem o campo), recarrega a
      // lista pra ao menos refletir o cliente novo.
      if (r.workspace) await aplicarTrocaLocal(r.workspace.id);
      else await recarregarWorkspaces();
    },
    [aplicarTrocaLocal, recarregarWorkspaces]
  );

  const criarCliente = useCallback(
    async (nome: string) => {
      const r = await api.criarWorkspaceNovo(nome);
      if (r.workspace) await aplicarTrocaLocal(r.workspace.id);
      else await recarregarWorkspaces();
      return r.avisos;
    },
    [aplicarTrocaLocal, recarregarWorkspaces]
  );

  const renomearCliente = useCallback(
    async (id: string, nome: string) => {
      const r = await api.renomearWorkspace(id, nome);
      // A resposta nova pode trazer a lista inteira: aplica direto. Senao, troca
      // so o registro renomeado pelo workspace da resposta (substitui, nunca
      // espalha o corpo inteiro dentro do registro, que era o bug do rename).
      // Sem nenhum dos dois, recarrega a lista pra o nome aparecer sem F5.
      if (r.workspaces) {
        setWorkspaces(r.workspaces);
        if (r.ativo !== undefined) {
          setWorkspaceAtivo(r.ativo);
          workspaceAtivoRef.current = r.ativo;
        }
      } else if (r.workspace) {
        const w = r.workspace;
        setWorkspaces((antes) => antes.map((x) => (x.id === id ? w : x)));
      } else {
        await recarregarWorkspaces();
      }
    },
    [recarregarWorkspaces]
  );

  const removerCliente = useCallback(async (id: string) => {
    await api.removerWorkspace(id);
    setWorkspaces((antes) => antes.filter((w) => w.id !== id));
  }, []);

  // Distribui mensagens do websocket.
  const aoReceber = useCallback(
    (mensagem: MensagemWs) => {
      // Evento de sessao de outro cliente: ignora em silencio (a sessao dele
      // segue rodando por baixo, so nao aparece nesta tela).
      if (
        (mensagem.tipo === "sessao:evento" || mensagem.tipo === "sessao:status") &&
        mensagem.workspaceId &&
        mensagem.workspaceId !== workspaceAtivoRef.current
      ) {
        return;
      }

      // Outra aba trocou de cliente: aplica a mesma troca aqui.
      if (mensagem.tipo === "workspace:ativado") {
        void aplicarTrocaLocal(mensagem.id);
        return;
      }

      // Ferramenta ao vivo de uma sessao (rodada 10, VKOS-IDE). O tipo nao esta
      // no union MensagemWs (dominio.ts e intocavel nesta rodada), entao lemos
      // cru. Acrescenta a entrada em streams[id].ferramentas, so as ultimas 200.
      const ferramenta = mensagem as unknown as {
        tipo: string;
        id?: string;
        nome?: string;
        alvo?: string;
      };
      if (ferramenta.tipo === "sessao:ferramenta" && ferramenta.id) {
        const idSessao = ferramenta.id;
        const entrada = {
          nome: ferramenta.nome ?? "",
          alvo: ferramenta.alvo ?? "",
        };
        setStreams((antes) => {
          const atual = antes[idSessao] ?? { texto: "", recebeuDelta: false };
          const lista = [...(atual.ferramentas ?? []), entrada].slice(-200);
          return { ...antes, [idSessao]: { ...atual, ferramentas: lista } };
        });
        return;
      }

      if (mensagem.tipo === "sessao:evento") {
        setStreams((antes) => ({
          ...antes,
          [mensagem.id]: aplicarEvento(antes[mensagem.id], mensagem.evento),
        }));
        // Guarda o session_id do claude quando aparece no init.
        const idClaude = mensagem.evento.session_id;
        if (idClaude) {
          const atualizarIdClaude = (antes: Sessao[]) => antes.map((s) =>
            s.id === mensagem.id && !s.sessionIdClaude
              ? { ...s, sessionIdClaude: idClaude }
              : s
          );
          if (mensagem.workspaceId) setSessoes(atualizarIdClaude);
          else setSessoesCore(atualizarIdClaude);
        }
        return;
      }

      if (mensagem.tipo === "sessao:status") {
        const atualizarStatus = (antes: Sessao[]) => {
          const existe = antes.some((s) => s.id === mensagem.id);
          if (!existe) {
            // Sessao desconhecida, busca a lista completa.
            if (mensagem.workspaceId) void recarregarSessoes();
            else void recarregarSessoesCore();
            return antes;
          }
          return antes.map((s) =>
            s.id === mensagem.id
              ? {
                  ...s,
                  status: mensagem.status,
                  erro: mensagem.detalhe ?? s.erro,
                  atualizadaEm: new Date().toISOString(),
                }
              : s
          );
        };
        if (mensagem.workspaceId) setSessoes(atualizarStatus);
        else setSessoesCore(atualizarStatus);
        // Sessao encerrada: busca modelo, tokens e custo finais do backend,
        // e atualiza o total gasto.
        if (
          mensagem.status === "concluida" ||
          mensagem.status === "erro" ||
          mensagem.status === "parada"
        ) {
          if (mensagem.workspaceId) void recarregarSessoes();
          else void recarregarSessoesCore();
          void recarregarCustos();
        }
        return;
      }

      // Laco de conformidade de site: atualiza a fase de conferencia na sessao.
      if (mensagem.tipo === "sessao:conferencia") {
        setSessoes((antes) =>
          antes.map((s) =>
            s.id === mensagem.id ? { ...s, conferenciaSite: mensagem.conferencia } : s
          )
        );
        return;
      }

      if (mensagem.tipo === "pecas:atualizadas") {
        void recarregarPecas();
        setAvisoPecas((n) => n + 1);
      }

      if ((mensagem as unknown as { tipo?: string }).tipo === "assistente:atualizado") {
        setAvisoAssistente((n) => n + 1);
      }

      // O CRM e do CORE: o aviso vale pra qualquer aba, com ou sem cliente
      // aberto. O contexto so repassa; quem decide quando recarregar (e quando
      // NAO recarregar, com a ficha aberta e um campo sendo editado) e a tela.
      if (mensagem.tipo === "crm:atualizado") {
        setAvisoCrm({
          escopo: mensagem.escopo,
          ...(mensagem.contatoId ? { contatoId: mensagem.contatoId } : {}),
          ...(mensagem.origem ? { origem: mensagem.origem } : {}),
        });
      }

      // Mesmo caminho do CRM: o aviso vem sem texto de mensagem, so com escopo
      // e id, e quem decide o que reler e a tela do chat.
      if (mensagem.tipo === "mensagens:atualizadas") {
        setAvisoMensagens({
          tipo: "mensagens:atualizadas",
          escopo: mensagem.escopo,
          ...(mensagem.conversaId ? { conversaId: mensagem.conversaId } : {}),
          ...(mensagem.origem ? { origem: mensagem.origem } : {}),
        });
      }
    },
    [recarregarSessoes, recarregarSessoesCore, recarregarPecas, recarregarCustos, aplicarTrocaLocal]
  );

  // Reconexao do WebSocket: recarrega o estado (sessoes, pecas, contextos,
  // custos, config) e os workspaces pra reconciliar o que se perdeu na queda.
  // Uma reconexao dispara uma recarga, sem loop.
  const aoReconectar = useCallback(() => {
    void recarregarTudo();
    void recarregarSessoesCore();
    void recarregarWorkspaces();
    // O CRM tambem ficou desatualizado em silencio enquanto o socket esteve
    // fora, e nao da pra saber o que passou: o escopo "tudo" manda reler o
    // funil, o ultimo toque e a linha do tempo da ficha que estiver aberta.
    setAvisoCrm({ escopo: "tudo" });
    // O mesmo vale pras conversas. Escopo "thread" sem conversaId quer dizer
    // "nao da pra saber qual mudou": qualquer thread aberta rele, e a lista
    // junto.
    setAvisoMensagens({ tipo: "mensagens:atualizadas", escopo: "thread" });
  }, [recarregarTudo, recarregarSessoesCore, recarregarWorkspaces]);

  usarWebSocket(aoReceber, setWsConectado, aoReconectar, workspaceAtivo);

  // Carga inicial no boot.
  useEffect(() => {
    void recarregarInicial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retentativa automatica quando o servidor esta fora.
  useEffect(() => {
    if (servidorOnline) return;
    timerRetentativa.current = window.setTimeout(() => {
      void recarregarInicial();
    }, 3000);
    return () => {
      if (timerRetentativa.current) {
        window.clearTimeout(timerRetentativa.current);
      }
    };
  }, [servidorOnline, recarregarInicial]);

  const valor: ValorContexto = {
    carregandoInicial,
    servidorOnline,
    wsConectado,
    avisoCrm,
    avisoMensagens,
    avisoPecas,
    avisoAssistente,
    ambiente,
    estadoVkos,
    cockpitLiberado,
    sessoes,
    sessoesCore,
    streams,
    pecas,
    contextos,
    custos,
    modeloPadrao,
    modelosCarrossel,
    workspaces,
    workspaceAtivo,
    trocandoWorkspace,
    sessoesProntas,
    recarregarWorkspaces,
    trocarWorkspace,
    adicionarCliente,
    criarCliente,
    renomearCliente,
    removerCliente,
    recarregarInicial,
    recarregarSessoesCore,
    recarregarAmbiente,
    definirPastaVkos,
    liberarCockpit,
    criarSessao,
    enviarMensagem,
    pararSessao,
    excluirSessao,
    obterTranscricao,
    recarregarPecas,
    recarregarContextos,
    recarregarCustos,
    recarregarTudo,
    criarContexto,
    atualizarContexto,
    excluirContexto,
    anexarArquivos,
    removerArquivo,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarEstado(): ValorContexto {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error("usarEstado precisa estar dentro do ProvedorEstado.");
  }
  return valor;
}
