import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  atualizarContato as apiAtualizarContato,
  atualizarColuna as apiAtualizarColuna,
  atualizarNegocio as apiAtualizarNegocio,
  atualizarOrcamento as apiAtualizarOrcamento,
  atualizarTarefa as apiAtualizarTarefa,
  criarColuna as apiCriarColuna,
  criarContato as apiCriarContato,
  criarNegocio as apiCriarNegocio,
  criarOrcamento as apiCriarOrcamento,
  criarTarefa as apiCriarTarefa,
  excluirColuna as apiExcluirColuna,
  excluirContato as apiExcluirContato,
  excluirNegocio as apiExcluirNegocio,
  excluirOrcamento as apiExcluirOrcamento,
  excluirTarefa as apiExcluirTarefa,
  moverContato as apiMoverContato,
  obterCrm,
  obterUltimasInteracoes,
  registrarInteracao as apiRegistrarInteracao,
  renomearColuna as apiRenomearColuna,
  reordenarColunas as apiReordenarColunas,
  type Coluna,
  type Contato,
  type DadosColuna,
  type DadosContato,
  type DadosNegocio,
  type DadosOrcamento,
  type DadosTarefa,
  type EstadoCrm,
  type Interacao,
  type Negocio,
  type Orcamento,
  type Tarefa,
  type TipoInteracao,
} from "../../api/crm";
import { ID_DESTA_ABA, gravando } from "../../api/aba";
import { usarEstado } from "../../estado/contexto";
import { ColunaCrm } from "./ColunaCrm";
import { BuscaLeads } from "./BuscaLeads";
import { LeadsFormulario } from "./LeadsFormulario";
import { PainelContato } from "./PainelContato";
import { TelaConversas } from "./TelaConversas";
import { VisaoHoje, type AcoesDoDia } from "./VisaoHoje";
import { criarSincronizador, relerLinhaDoTempo, type Recarga } from "./aovivo";
import {
  contatoCombina,
  precisaResolverFollowUp,
  proximoContatoAposInteracao,
  valorDoNegocio,
  type ItemDia,
} from "./logica";
import { formatarDataHora, formatarReais, iniciais } from "./formatos";
import { IconeAlerta, IconeMais, IconeX } from "../comum/Icones";
import "./crm.css";

// O chat mora DENTRO do CRM, como aba, e nao como tela propria na barra
// lateral. Conversa nao existe sem contato, e uma caixa de entrada em outro
// canto da navegacao viraria exatamente a segunda caixa de entrada paralela ao
// funil que este modulo existe pra curar.
type AbaCrm =
  | "hoje"
  | "conversas"
  | "quadro"
  | "contatos"
  | "formulario"
  | "leads";

// "Formulário" vem logo depois de "Hoje", por pedido do Jesse em 2026-07-30:
// quem preencheu o formulário levantou a mão sozinho, então é a primeira coisa
// a olhar depois do dia. "Buscar leads" fica no fim: é a porta outbound, a que
// eu aciono quando quero, não a que me chama. As duas terminam no mesmo lugar,
// criando Contato.
const ROTULO_ABA: Record<AbaCrm, string> = {
  hoje: "Hoje",
  conversas: "Conversas",
  quadro: "Quadro",
  contatos: "Contatos",
  formulario: "Formulário",
  leads: "Buscar leads",
};
type Ordenacao = "nome" | "interacao" | "valor";

interface Arrasto {
  contato: Contato;
  x0: number;
  y0: number;
  offX: number;
  offY: number;
  largura: number;
  altura: number;
  x: number;
  y: number;
  moveu: boolean;
}

interface Alvo {
  colunaId: string;
  indice: number;
}

// De quanto em quanto tempo o CRM ao vivo tenta aplicar a recarga guardada.
// Vale como espera curta entre um aviso e a leitura (uma rajada de gravacoes
// vira uma leitura so) e como nova tentativa enquanto a aba estiver ocupada
// digitando ou gravando.
const ESPERA_RECARGA = 250;

// A pessoa esta escrevendo dentro do CRM agora. Select e botao nao contam: o
// que nao pode ser atropelado e texto digitado e ainda nao gravado.
function editandoNoCrm(tela: HTMLElement | null): boolean {
  const ativo = document.activeElement;
  if (!tela || !(ativo instanceof HTMLElement)) return false;
  if (!tela.contains(ativo)) return false;
  return ativo.tagName === "INPUT" || ativo.tagName === "TEXTAREA" || ativo.isContentEditable;
}

export function TelaCrm() {
  const { avisoCrm, avisoMensagens } = usarEstado();
  const [estado, setEstado] = useState<EstadoCrm | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<AbaCrm>("hoje");
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [negocioDestaqueId, setNegocioDestaqueId] = useState<string | null>(null);
  const [criandoColuna, setCriandoColuna] = useState(false);
  const [nomeColuna, setNomeColuna] = useState("");
  // Ultima interacao por contato. A linha do tempo saiu do contato pro
  // interacoes.jsonl e o servidor so entrega interacao POR CONTATO, entao o
  // mapa nasce com um palpite (o carimbo de atualizacao do contato) e vai sendo
  // corrigido conforme as fichas sao abertas e interacoes sao registradas.
  const [ultimaInteracao, setUltimaInteracao] = useState<Map<string, string>>(new Map());
  const [novoNegocio, setNovoNegocio] = useState<{
    aberto: boolean;
    contatoId: string;
    contatoTexto: string;
    titulo: string;
    valor: string;
  }>({ aberto: false, contatoId: "", contatoTexto: "", titulo: "", valor: "" });
  const [salvandoNegocio, setSalvandoNegocio] = useState(false);
  const [novoContatoForm, setNovoContatoForm] = useState<{
    aberto: boolean;
    nome: string;
    empresa: string;
    telefone: string;
    email: string;
  }>({ aberto: false, nome: "", empresa: "", telefone: "", email: "" });
  const [salvandoContato, setSalvandoContato] = useState(false);

  const arrasto = useRef<Arrasto | null>(null);
  const alvoRef = useRef<Alvo | null>(null);
  const quadroRef = useRef<HTMLDivElement>(null);
  const fantasmaRef = useRef<HTMLDivElement>(null);
  const rolagemRef = useRef<number | null>(null);
  const desligarRef = useRef<() => void>(() => {});
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  // O mapa de ultimo toque e util, nao essencial: sem ele a tela ainda abre,
  // so o bloco "Esfriando" volta a chutar. Por isso ele falha calado, sem
  // derrubar o carregamento do funil inteiro.
  const carregarUltimasInteracoes = useCallback(async () => {
    try {
      setUltimaInteracao(await obterUltimasInteracoes());
    } catch {
      // Segue com o que ja estiver em memoria.
    }
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setEstado(await obterCrm());
      void carregarUltimasInteracoes();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Nao deu pra carregar o CRM.");
    } finally {
      setCarregando(false);
    }
  }, [carregarUltimasInteracoes]);

  const sincronizarCrm = useCallback(async () => {
    try {
      setEstado(await obterCrm());
      void carregarUltimasInteracoes();
    } catch (e) {
      mostrarErro(e, "Os leads entraram, mas não deu pra atualizar o CRM agora.");
    }
  }, [carregarUltimasInteracoes]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // ------------------------------------------------------------ ao vivo

  // O CRM assina o WebSocket unico do app pelo contexto (usarEstado), o mesmo
  // caminho das outras telas. As regras de quando aplicar a recarga estao em
  // aovivo.ts, que e onde elas podem ser provadas sem DOM.
  const sincronizador = useMemo(() => criarSincronizador(ID_DESTA_ABA), []);
  const telaRef = useRef<HTMLElement>(null);
  const relogioRef = useRef<number | null>(null);
  const passoRef = useRef<() => void>(() => {});
  const selecionadoRef = useRef<string | null>(null);
  selecionadoRef.current = selecionadoId;
  // Muda quando a linha do tempo da ficha aberta precisa ser relida. A ficha
  // observa este numero; ele nao remonta o painel, so refaz o fetch de dentro.
  const [versaoLinhaDoTempo, setVersaoLinhaDoTempo] = useState(0);

  // Recarga de fundo. NUNCA passa por setCarregando: o estado de carregamento
  // troca a tela inteira pelo aviso "Carregando o CRM...", o que desmontaria a
  // ficha aberta e levaria junto tudo que estivesse digitado nela. Erro aqui
  // tambem nao vira faixa vermelha: isto e sincronizacao de fundo, e a proxima
  // acao do usuario mostra o erro de verdade se o servidor estiver fora.
  const aplicarRecarga = useCallback(async (recarga: Recarga) => {
    const tarefas: Promise<unknown>[] = [];
    if (recarga.funil) {
      tarefas.push(obterCrm().then(setEstado).catch(() => undefined));
    }
    if (recarga.ultimasInteracoes) tarefas.push(carregarUltimasInteracoes());
    if (relerLinhaDoTempo(recarga, selecionadoRef.current)) {
      setVersaoLinhaDoTempo((atual) => atual + 1);
    }
    await Promise.all(tarefas);
  }, [carregarUltimasInteracoes]);

  const agendarRecarga = useCallback(() => {
    if (relogioRef.current !== null) return;
    relogioRef.current = window.setTimeout(() => {
      relogioRef.current = null;
      passoRef.current();
    }, ESPERA_RECARGA);
  }, []);

  const passo = useCallback(() => {
    const recarga = sincronizador.tomar({
      editando: editandoNoCrm(telaRef.current),
      gravando: gravando(),
    });
    // Adiado: a pendencia continua guardada e a tela tenta de novo quando o
    // campo liberar. Nada se perde, e nada atropela o que esta sendo escrito.
    if (!recarga) {
      if (sincronizador.pendente()) agendarRecarga();
      return;
    }
    void aplicarRecarga(recarga);
  }, [agendarRecarga, aplicarRecarga, sincronizador]);

  useEffect(() => {
    passoRef.current = passo;
  }, [passo]);

  // O aviso que ja estava no contexto quando a tela montou nao vale: o
  // carregar() da montagem acabou de trazer tudo.
  const avisoDaMontagem = useRef(avisoCrm);
  useEffect(() => {
    if (!avisoCrm || avisoCrm === avisoDaMontagem.current) return;
    sincronizador.receber(avisoCrm);
    agendarRecarga();
  }, [agendarRecarga, avisoCrm, sincronizador]);

  useEffect(() => () => {
    if (relogioRef.current !== null) window.clearTimeout(relogioRef.current);
  }, []);

  const colunas = useMemo(
    () => (estado ? [...estado.colunas].sort((a, b) => a.ordem - b.ordem) : []),
    [estado],
  );
  const contatosPorId = useMemo(
    () => new Map((estado?.contatos ?? []).map((contato) => [contato.id, contato])),
    [estado],
  );
  const organizacaoPorId = useMemo(
    () => new Map((estado?.organizacoes ?? []).map((item) => [item.id, item.nome])),
    [estado],
  );
  const nomeOrganizacao = useCallback(
    (contato: Contato): string =>
      (contato.organizacaoId ? organizacaoPorId.get(contato.organizacaoId) : undefined) ?? "",
    [organizacaoPorId],
  );
  // Valor de cada contato: soma dos negocios (oportunidades) presos a ele.
  const valorPorContato = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const negocio of estado?.negocios ?? []) {
      mapa.set(negocio.contatoId, (mapa.get(negocio.contatoId) ?? 0) + valorDoNegocio(negocio));
    }
    return mapa;
  }, [estado]);
  // Palpite inicial de "ultimo toque" por contato, pro apodrecimento ter de
  // onde partir antes de a ficha ser aberta.
  const ultimaInteracaoOuCarimbo = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const contato of estado?.contatos ?? []) {
      mapa.set(contato.id, ultimaInteracao.get(contato.id) ?? contato.atualizadoEm);
    }
    return mapa;
  }, [estado, ultimaInteracao]);
  // O contato E o cartao: a ordem do array de contatos e a ordem no quadro.
  const contatosPorColuna = useMemo(() => {
    const mapa = new Map<string, Contato[]>();
    for (const coluna of colunas) mapa.set(coluna.id, []);
    for (const contato of estado?.contatos ?? []) {
      if (!contatoCombina(contato, busca, nomeOrganizacao(contato))) continue;
      mapa.get(contato.colunaId)?.push(contato);
    }
    return mapa;
  }, [busca, colunas, estado, nomeOrganizacao]);
  const contatoSelecionado = estado?.contatos.find((contato) => contato.id === selecionadoId) ?? null;
  const negociosDoSelecionado = estado?.negocios.filter((negocio) => negocio.contatoId === selecionadoId) ?? [];
  const tarefasDoSelecionado = useMemo(() => {
    if (!estado || !selecionadoId) return [];
    const dosNegocios = new Set(
      estado.negocios.filter((negocio) => negocio.contatoId === selecionadoId).map((n) => n.id),
    );
    return estado.tarefas.filter(
      (tarefa) => tarefa.contatoId === selecionadoId
        || (tarefa.negocioId ? dosNegocios.has(tarefa.negocioId) : false),
    );
  }, [estado, selecionadoId]);
  const orcamentosDoSelecionado = useMemo(() => {
    if (!estado || !selecionadoId) return [];
    const dosNegocios = new Set(
      estado.negocios.filter((negocio) => negocio.contatoId === selecionadoId).map((n) => n.id),
    );
    return estado.orcamentos.filter((orcamento) => dosNegocios.has(orcamento.negocioId));
  }, [estado, selecionadoId]);
  const sugestoesContato = useMemo(() => {
    if (!estado || !novoNegocio.aberto || novoNegocio.contatoId) return [];
    const termo = novoNegocio.contatoTexto.trim();
    return estado.contatos
      .filter((contato) => contatoCombina(contato, termo, nomeOrganizacao(contato)))
      .slice(0, 8);
  }, [estado, nomeOrganizacao, novoNegocio.aberto, novoNegocio.contatoId, novoNegocio.contatoTexto]);

  function mostrarErro(e: unknown, fallback: string) {
    setErro(e instanceof Error ? e.message : fallback);
  }

  function abrirContato(id: string, destaque: string | null = null) {
    setSelecionadoId(id);
    setNegocioDestaqueId(destaque);
  }

  function abrirNovoContato() {
    setNovoContatoForm({ aberto: true, nome: "", empresa: "", telefone: "", email: "" });
  }

  const anotarUltimaInteracao = useCallback((contatoId: string, em: string | undefined) => {
    if (!em) return;
    setUltimaInteracao((anterior) => {
      if (anterior.get(contatoId) === em) return anterior;
      const proximo = new Map(anterior);
      proximo.set(contatoId, em);
      return proximo;
    });
  }, []);

  async function salvarNovoContato() {
    const nome = novoContatoForm.nome.trim();
    if (!nome || salvandoContato) return;
    setSalvandoContato(true);
    try {
      const contato = await apiCriarContato({
        nome,
        ...(novoContatoForm.empresa.trim() ? { empresa: novoContatoForm.empresa.trim() } : {}),
        ...(novoContatoForm.telefone.trim() ? { telefone: novoContatoForm.telefone.trim() } : {}),
        ...(novoContatoForm.email.trim() ? { email: novoContatoForm.email.trim() } : {}),
      });
      // O contato pode ter criado uma organizacao nova no servidor, entao a
      // lista de organizacoes precisa vir de novo pra empresa aparecer no card.
      await sincronizarCrm();
      setNovoContatoForm({ aberto: false, nome: "", empresa: "", telefone: "", email: "" });
      setBusca("");
      abrirContato(contato.id);
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar o contato.");
    } finally {
      setSalvandoContato(false);
    }
  }

  const atualizarContato = useCallback(async (id: string, dados: DadosContato): Promise<Contato> => {
    try {
      const contato = await apiAtualizarContato(id, dados);
      setEstado((anterior) => anterior ? {
        ...anterior,
        contatos: anterior.contatos.map((item) => item.id === id ? contato : item),
      } : anterior);
      // "empresa" vira organizacao no servidor: sem recarregar, o nome novo nao
      // apareceria em lugar nenhum da tela.
      if ("empresa" in dados) void sincronizarCrm();
      return contato;
    } catch (e) {
      mostrarErro(e, "Nao deu pra atualizar o contato.");
      throw e;
    }
  }, [sincronizarCrm]);

  async function moverEstagioContato(id: string, colunaId: string) {
    try {
      const contato = await apiMoverContato(id, colunaId);
      setEstado((anterior) => anterior ? {
        ...anterior,
        contatos: anterior.contatos.map((item) => item.id === id ? contato : item),
      } : anterior);
    } catch (e) {
      mostrarErro(e, "Nao deu pra mover o contato de estagio.");
    }
  }

  async function excluirContato(id: string) {
    try {
      await apiExcluirContato(id);
      setEstado((anterior) => anterior ? {
        ...anterior,
        contatos: anterior.contatos.filter((item) => item.id !== id),
        negocios: anterior.negocios.filter((item) => item.contatoId !== id),
        tarefas: anterior.tarefas.filter((item) => item.contatoId !== id),
      } : anterior);
      setSelecionadoId(null);
    } catch (e) {
      mostrarErro(e, "Nao deu pra excluir o contato.");
      throw e;
    }
  }

  // Registrar interacao RESOLVE o follow-up do contato. Antes nada limpava o
  // proximoContato, entao o nome ficava "Atrasado" pra sempre e a tela do dia
  // virava ruido. Com cadencia definida, o follow-up renasce na data seguinte.
  const registrarInteracao = useCallback(async (
    id: string,
    tipo: TipoInteracao,
    texto: string,
  ): Promise<Interacao> => {
    try {
      const interacao = await apiRegistrarInteracao(id, tipo, texto);
      anotarUltimaInteracao(id, interacao.em);
      const contato = contatosPorId.get(id);
      if (contato && precisaResolverFollowUp(contato)) {
        await atualizarContato(id, {
          proximoContato: proximoContatoAposInteracao(contato, new Date()),
        });
      }
      return interacao;
    } catch (e) {
      mostrarErro(e, "Nao deu pra registrar a interacao.");
      throw e;
    }
  }, [anotarUltimaInteracao, atualizarContato, contatosPorId]);

  const criarTarefa = useCallback(async (
    contatoId: string,
    texto: string,
    prazo?: string,
  ): Promise<Tarefa> => {
    try {
      const tarefa = await apiCriarTarefa({ texto, contatoId, ...(prazo ? { prazo } : {}) });
      setEstado((anterior) => anterior ? { ...anterior, tarefas: [...anterior.tarefas, tarefa] } : anterior);
      return tarefa;
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar a tarefa.");
      throw e;
    }
  }, []);

  const atualizarTarefa = useCallback(async (id: string, dados: DadosTarefa): Promise<Tarefa> => {
    try {
      const tarefa = await apiAtualizarTarefa(id, dados);
      setEstado((anterior) => anterior ? {
        ...anterior,
        tarefas: anterior.tarefas.map((item) => item.id === id ? tarefa : item),
      } : anterior);
      return tarefa;
    } catch (e) {
      mostrarErro(e, "Nao deu pra atualizar a tarefa.");
      throw e;
    }
  }, []);

  const excluirTarefa = useCallback(async (id: string) => {
    try {
      await apiExcluirTarefa(id);
      setEstado((anterior) => anterior ? {
        ...anterior,
        tarefas: anterior.tarefas.filter((item) => item.id !== id),
      } : anterior);
    } catch (e) {
      mostrarErro(e, "Nao deu pra excluir a tarefa.");
      throw e;
    }
  }, []);

  function abrirNovoNegocio(contatoId = "") {
    const contato = contatosPorId.get(contatoId);
    setNovoNegocio({
      aberto: true,
      contatoId,
      contatoTexto: contato?.nome ?? "",
      titulo: "",
      valor: "",
    });
  }

  async function salvarNovoNegocio() {
    const nome = novoNegocio.contatoTexto.trim();
    const titulo = novoNegocio.titulo.trim();
    if (!nome || !titulo || salvandoNegocio) return;
    setSalvandoNegocio(true);
    try {
      let contato = contatosPorId.get(novoNegocio.contatoId);
      if (!contato) {
        contato = await apiCriarContato({ nome });
        const criado = contato;
        setEstado((anterior) => anterior ? { ...anterior, contatos: [...anterior.contatos, criado] } : anterior);
      }
      const numero = Number(novoNegocio.valor.replace(",", "."));
      const negocio = await apiCriarNegocio({
        titulo,
        contatoId: contato.id,
        status: "aberto",
        ...(novoNegocio.valor.trim() && Number.isFinite(numero) && numero >= 0 ? { valorEstimado: numero } : {}),
      });
      setEstado((anterior) => anterior ? { ...anterior, negocios: [...anterior.negocios, negocio] } : anterior);
      setNovoNegocio({ aberto: false, contatoId: "", contatoTexto: "", titulo: "", valor: "" });
      setAba("quadro");
      abrirContato(contato.id, negocio.id);
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar o negocio.");
    } finally {
      setSalvandoNegocio(false);
    }
  }

  const atualizarNegocio = useCallback(async (id: string, dados: DadosNegocio): Promise<Negocio> => {
    try {
      const negocio = await apiAtualizarNegocio(id, dados);
      setEstado((anterior) => anterior ? {
        ...anterior,
        negocios: anterior.negocios.map((item) => item.id === id ? negocio : item),
      } : anterior);
      return negocio;
    } catch (e) {
      mostrarErro(e, "Nao deu pra atualizar o negocio.");
      throw e;
    }
  }, []);

  // useCallback porque esta funcao entra no pacote de acoes que o painel de
  // contexto do chat recebe memoizado.
  const excluirNegocio = useCallback(async (id: string) => {
    try {
      await apiExcluirNegocio(id);
      setEstado((anterior) => anterior ? {
        ...anterior,
        negocios: anterior.negocios.filter((item) => item.id !== id),
        orcamentos: anterior.orcamentos.filter((item) => item.negocioId !== id),
      } : anterior);
      setNegocioDestaqueId((atual) => (atual === id ? null : atual));
    } catch (e) {
      mostrarErro(e, "Nao deu pra excluir o negocio.");
      throw e;
    }
  }, []);

  const criarOrcamento = useCallback(async (
    negocioId: string,
    valor: number,
    validoAte?: string,
  ): Promise<Orcamento> => {
    try {
      const orcamento = await apiCriarOrcamento({
        negocioId,
        valor,
        ...(validoAte ? { validoAte } : {}),
      });
      setEstado((anterior) => anterior ? { ...anterior, orcamentos: [...anterior.orcamentos, orcamento] } : anterior);
      return orcamento;
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar o orcamento.");
      throw e;
    }
  }, []);

  const atualizarOrcamento = useCallback(async (id: string, dados: DadosOrcamento): Promise<Orcamento> => {
    try {
      const orcamento = await apiAtualizarOrcamento(id, dados);
      setEstado((anterior) => anterior ? {
        ...anterior,
        orcamentos: anterior.orcamentos.map((item) => item.id === id ? orcamento : item),
      } : anterior);
      return orcamento;
    } catch (e) {
      mostrarErro(e, "Nao deu pra atualizar o orcamento.");
      throw e;
    }
  }, []);

  const excluirOrcamento = useCallback(async (id: string) => {
    try {
      await apiExcluirOrcamento(id);
      setEstado((anterior) => anterior ? {
        ...anterior,
        orcamentos: anterior.orcamentos.filter((item) => item.id !== id),
      } : anterior);
    } catch (e) {
      mostrarErro(e, "Nao deu pra excluir o orcamento.");
      throw e;
    }
  }, []);

  async function criarColuna() {
    const limpo = nomeColuna.trim();
    if (!limpo) return;
    try {
      const coluna = await apiCriarColuna(limpo);
      setEstado((anterior) => anterior ? { ...anterior, colunas: [...anterior.colunas, coluna] } : anterior);
      setNomeColuna("");
      setCriandoColuna(false);
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar a coluna.");
    }
  }

  async function moverColuna(id: string, direcao: -1 | 1) {
    const indice = colunas.findIndex((coluna) => coluna.id === id);
    const destino = indice + direcao;
    if (indice < 0 || destino < 0 || destino >= colunas.length) return;
    const ordem = colunas.map((coluna) => coluna.id);
    [ordem[indice], ordem[destino]] = [ordem[destino], ordem[indice]];
    setEstado((anterior) => anterior ? {
      ...anterior,
      colunas: anterior.colunas.map((coluna) => ({ ...coluna, ordem: ordem.indexOf(coluna.id) })),
    } : anterior);
    try {
      await apiReordenarColunas(ordem);
    } catch (e) {
      mostrarErro(e, "Nao deu pra mover a coluna.");
      await carregar();
    }
  }

  function guardarColuna(coluna: Coluna) {
    setEstado((anterior) => anterior ? {
      ...anterior,
      colunas: anterior.colunas.map((item) => item.id === coluna.id ? coluna : item),
    } : anterior);
  }

  async function renomearColuna(id: string, nome: string) {
    try {
      guardarColuna(await apiRenomearColuna(id, nome));
    } catch (e) {
      mostrarErro(e, "Nao deu pra renomear a coluna.");
    }
  }

  // Tipo do estagio e limite de esfriamento. Sao os dois campos que fazem o
  // funil saber o que e ganho e o apodrecimento saber quando ligar.
  async function ajustarColuna(id: string, dados: DadosColuna) {
    try {
      guardarColuna(await apiAtualizarColuna(id, dados));
    } catch (e) {
      mostrarErro(e, "Nao deu pra ajustar a coluna.");
    }
  }

  async function excluirColuna(id: string) {
    try {
      await apiExcluirColuna(id);
      await carregar();
    } catch (e) {
      mostrarErro(e, "Nao deu pra excluir a coluna.");
    }
  }

  // ------------------------------------------------------ acoes do chat

  // Negocio criado de dentro da conversa. So titulo e contato: o resto se
  // preenche no proprio painel de contexto, sem tirar a pessoa do chat.
  const criarNegocioRapido = useCallback(async (
    contatoId: string,
    titulo: string,
  ): Promise<Negocio> => {
    try {
      const negocio = await apiCriarNegocio({ titulo, contatoId, status: "aberto" });
      setEstado((anterior) => anterior ? { ...anterior, negocios: [...anterior.negocios, negocio] } : anterior);
      return negocio;
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar o negocio.");
      throw e;
    }
  }, []);

  // As mesmas acoes de negocio e orcamento da ficha do contato, passadas pro
  // painel de contexto. Uma segunda implementacao divergiria da ficha.
  const acoesNegocioDoChat = useMemo(() => ({
    aoAtualizar: atualizarNegocio,
    aoExcluir: excluirNegocio,
    aoCriarOrcamento: criarOrcamento,
    aoAtualizarOrcamento: atualizarOrcamento,
    aoExcluirOrcamento: excluirOrcamento,
  }), [atualizarNegocio, atualizarOrcamento, criarOrcamento, excluirNegocio, excluirOrcamento]);

  // ------------------------------------------------ acoes da tela do dia

  const acoesDoDia: AcoesDoDia = useMemo(() => ({
    aoAbrirContato: (id: string) => abrirContato(id),
    aoAbrirQuadro: () => setAba("quadro"),
    aoCriarContato: abrirNovoContato,
    aoConcluirTarefa: async (tarefaId: string) => {
      await atualizarTarefa(tarefaId, { feita: true });
    },
    aoRegistrarContato: async (item: ItemDia) => {
      if (!item.contatoId) return;
      await registrarInteracao(item.contatoId, "outro", "Contato registrado pela tela do dia.");
      // A proxima acao do negocio tambem fecha: ela era o que colocou a linha
      // na tela, e deixa-la marcada repetiria o item amanha.
      if (item.negocioId && item.tipo === "followup") {
        await atualizarNegocio(item.negocioId, { proximaAcaoEm: null });
      }
    },
    aoAdiar: async (item: ItemDia, quando: string) => {
      if (item.tarefaId) return void await atualizarTarefa(item.tarefaId, { prazo: quando });
      if (item.orcamentoId) return void await atualizarOrcamento(item.orcamentoId, { validoAte: quando });
      if (item.negocioId) return void await atualizarNegocio(item.negocioId, { proximaAcaoEm: quando });
      if (item.contatoId) await atualizarContato(item.contatoId, { proximoContato: quando });
    },
  }), [atualizarContato, atualizarNegocio, atualizarOrcamento, atualizarTarefa, registrarInteracao]);

  // Reordena localmente e persiste. A regra de insercao e a mesma do servidor
  // (posicionarNoFunil), senao a tela e o disco discordam depois de recarregar.
  const moverContatoLocal = useCallback((contato: Contato, colunaId: string, indice: number) => {
    setEstado((anterior) => {
      if (!anterior) return anterior;
      const movido = { ...contato, colunaId };
      const outros = anterior.contatos.filter((item) => item.id !== contato.id);
      const daColuna = outros
        .map((item, global) => ({ item, global }))
        .filter(({ item }) => item.colunaId === colunaId);
      const posicao = Math.max(0, Math.min(indice, daColuna.length));
      const onde = posicao >= daColuna.length
        ? (daColuna.length ? daColuna[daColuna.length - 1].global + 1 : outros.length)
        : daColuna[posicao].global;
      outros.splice(onde, 0, movido);
      return { ...anterior, contatos: outros };
    });
    // Reordenar dentro da mesma coluna tambem vai pro disco: antes so a troca
    // de coluna era salva e a posicao voltava ao recarregar a tela.
    apiMoverContato(contato.id, colunaId, indice).catch(() => void carregar());
  }, [carregar]);

  // Mover cartao pelo teclado, sem mouse: seta pra lado troca de coluna, seta
  // pra cima e pra baixo reordena dentro da coluna.
  const moverPorTeclado = useCallback((contato: Contato, eixo: "coluna" | "posicao", passo: -1 | 1) => {
    const daColuna = contatosPorColuna.get(contato.colunaId) ?? [];
    const posicao = daColuna.findIndex((item) => item.id === contato.id);
    if (eixo === "posicao") {
      const destino = posicao + passo;
      if (posicao < 0 || destino < 0 || destino >= daColuna.length) return;
      moverContatoLocal(contato, contato.colunaId, destino);
      return;
    }
    const indiceColuna = colunas.findIndex((coluna) => coluna.id === contato.colunaId);
    const destino = indiceColuna + passo;
    if (indiceColuna < 0 || destino < 0 || destino >= colunas.length) return;
    moverContatoLocal(contato, colunas[destino].id, (contatosPorColuna.get(colunas[destino].id) ?? []).length);
  }, [colunas, contatosPorColuna, moverContatoLocal]);

  const definirAlvo = useCallback((proximo: Alvo | null) => {
    const atual = alvoRef.current;
    if (atual?.colunaId === proximo?.colunaId && atual?.indice === proximo?.indice) return;
    alvoRef.current = proximo;
    setAlvo(proximo);
  }, []);

  // Onde o cartao cairia agora. O cartao arrastado fica de fora da contagem:
  // ele continua no DOM, e conta-lo empurrava todos os indices em um.
  const recalcularAlvo = useCallback((x: number, y: number) => {
    const atual = arrasto.current;
    if (!atual) return;
    const drop = document.elementFromPoint(x, y)?.closest("[data-coluna-drop]");
    if (!drop) return definirAlvo(null);
    const cartoes = Array.from(drop.querySelectorAll("[data-cartao]"))
      .filter((cartao) => cartao.getAttribute("data-cartao") !== atual.contato.id);
    let indice = cartoes.length;
    for (let i = 0; i < cartoes.length; i++) {
      const retangulo = cartoes[i].getBoundingClientRect();
      if (y < retangulo.top + retangulo.height / 2) {
        indice = i;
        break;
      }
    }
    definirAlvo({ colunaId: drop.getAttribute("data-coluna-drop") ?? "", indice });
  }, [definirAlvo]);

  // Enquanto o ponteiro fica perto da borda, o quadro anda sozinho, pra dar
  // pra soltar numa coluna que esta fora da tela.
  const lacoRolagem = useCallback(() => {
    const atual = arrasto.current;
    const quadro = quadroRef.current;
    if (!atual?.moveu || !quadro) {
      rolagemRef.current = null;
      return;
    }
    const caixa = quadro.getBoundingClientRect();
    const zona = 110;
    let passo = 0;
    if (atual.x < caixa.left + zona) passo = -Math.ceil((caixa.left + zona - atual.x) / 5);
    else if (atual.x > caixa.right - zona) passo = Math.ceil((atual.x - (caixa.right - zona)) / 5);
    if (passo) {
      const antes = quadro.scrollLeft;
      quadro.scrollLeft = Math.max(0, Math.min(quadro.scrollWidth - quadro.clientWidth, antes + passo));
      // O quadro andou embaixo do ponteiro parado: o alvo mudou sem mousemove.
      if (quadro.scrollLeft !== antes) recalcularAlvo(atual.x, atual.y);
    }
    rolagemRef.current = requestAnimationFrame(lacoRolagem);
  }, [recalcularAlvo]);

  const aoMover = useCallback((e: PointerEvent) => {
    const atual = arrasto.current;
    if (!atual) return;
    atual.x = e.clientX;
    atual.y = e.clientY;
    const distancia = Math.abs(e.clientX - atual.x0) + Math.abs(e.clientY - atual.y0);
    if (!atual.moveu && distancia < 6) return;
    if (!atual.moveu) {
      atual.moveu = true;
      document.body.classList.add("crm-arrastando");
      document.body.style.setProperty("--crm-altura-arrasto", `${atual.altura}px`);
      setArrastandoId(atual.contato.id);
      if (rolagemRef.current === null) rolagemRef.current = requestAnimationFrame(lacoRolagem);
    }
    // O fantasma anda escrevendo direto no no. Guardar a posicao em estado
    // redesenhava o quadro inteiro a cada pointermove, e era isso que fazia o
    // cartao arrastar atrasado do ponteiro.
    const no = fantasmaRef.current;
    if (no) {
      no.style.transform = `translate3d(${e.clientX - atual.offX}px, ${e.clientY - atual.offY}px, 0)`;
    }
    recalcularAlvo(e.clientX, e.clientY);
  }, [lacoRolagem, recalcularAlvo]);

  const encerrarArrasto = useCallback((aplicar: boolean) => {
    desligarRef.current();
    desligarRef.current = () => {};
    if (rolagemRef.current !== null) {
      cancelAnimationFrame(rolagemRef.current);
      rolagemRef.current = null;
    }
    document.body.classList.remove("crm-arrastando");
    document.body.style.removeProperty("--crm-altura-arrasto");
    const atual = arrasto.current;
    const destino = alvoRef.current;
    arrasto.current = null;
    alvoRef.current = null;
    setArrastandoId(null);
    setAlvo(null);
    if (!atual) return;
    if (!atual.moveu) {
      if (aplicar) abrirContato(atual.contato.id);
      return;
    }
    if (aplicar && destino) moverContatoLocal(atual.contato, destino.colunaId, destino.indice);
  }, [moverContatoLocal]);

  const aoSoltar = useCallback(() => encerrarArrasto(true), [encerrarArrasto]);
  // Menu de contexto, gesto do sistema ou toque cancelado: desfaz sem mover.
  const aoCancelar = useCallback(() => encerrarArrasto(false), [encerrarArrasto]);

  const aoDescerCartao = useCallback((contato: Contato, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const retangulo = (e.currentTarget as HTMLElement).getBoundingClientRect();
    arrasto.current = {
      contato,
      x0: e.clientX,
      y0: e.clientY,
      offX: e.clientX - retangulo.left,
      offY: e.clientY - retangulo.top,
      largura: retangulo.width,
      altura: retangulo.height,
      x: e.clientX,
      y: e.clientY,
      moveu: false,
    };
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoCancelar);
    desligarRef.current = () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoCancelar);
    };
  }, [aoCancelar, aoMover, aoSoltar]);

  useEffect(() => () => {
    desligarRef.current();
    if (rolagemRef.current !== null) cancelAnimationFrame(rolagemRef.current);
    document.body.classList.remove("crm-arrastando");
    document.body.style.removeProperty("--crm-altura-arrasto");
  }, []);

  // Area de conteudo carregando usa ESQUELETO, nunca giro: um giro no meio da
  // tela nao diz nada sobre o que esta chegando.
  if (carregando) {
    return (
      <section className="tela crm-tela">
        <header className="tela-topo">
          <div className="tela-topo-texto">
            <h1>CRM</h1>
            <p>Contatos, negócios e próximos passos.</p>
          </div>
        </header>
        <div className="tela-corpo" aria-busy="true">
          <span className="so-leitor">Carregando o CRM</span>
          <div className="lista" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="item-lista" key={i}>
                <span className="esqueleto crm-esqueleto-linha" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (erro && !estado) return (
    <section className="tela crm-tela">
      <div className="tela-corpo">
        <div className="vazio">
          <h2>Não deu pra abrir o CRM.</h2>
          <p>{erro}</p>
          <button className="botao botao-principal" onClick={() => void carregar()} type="button">Tentar de novo</button>
        </div>
      </div>
    </section>
  );
  if (!estado) return null;

  const arrastado = arrasto.current;

  return (
    <section className="tela crm-tela" ref={telaRef}>
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1>CRM</h1>
          <p>Contatos, negócios e próximos passos.</p>
        </div>
        {/* As duas portas de entrada de lead trazem busca e ações próprias:
            a do topo filtraria uma lista que nem está na tela. */}
        {aba !== "leads" && aba !== "formulario" && (
          <div className="tela-topo-acoes">
            {/* A busca so aparece onde ela filtra alguma coisa. Na tela do dia
                ela existia sem fazer nada. */}
            {aba !== "hoje" && <Busca valor={busca} aoMudar={setBusca} />}
            <button className="botao botao-principal" onClick={abrirNovoContato} type="button">
              <IconeMais className="" /> Novo contato
            </button>
          </div>
        )}
      </header>

      <nav className="abas crm-abas" role="tablist" aria-label="Visões do CRM">
        {(["hoje", "formulario", "conversas", "quadro", "contatos", "leads"] as AbaCrm[]).map((item) => (
          <button className="aba" onClick={() => setAba(item)} type="button" role="tab" aria-selected={aba === item} key={item}>
            {ROTULO_ABA[item]}
          </button>
        ))}
      </nav>

      {erro && (
        <div className="crm-faixa-erro">
          <div className="faixa faixa-alerta" role="alert">
            <IconeAlerta className="" />
            <div className="faixa-texto">{erro}</div>
            <div className="faixa-acoes">
              <button className="botao botao-p botao-icone botao-fantasma" onClick={() => setErro(null)} aria-label="Fechar aviso" type="button"><IconeX className="" /></button>
            </div>
          </div>
        </div>
      )}

      {aba === "hoje" && (
        <VisaoHoje
          estado={estado}
          colunas={colunas}
          ultimaInteracaoPorContato={ultimaInteracaoOuCarimbo}
          acoes={acoesDoDia}
        />
      )}

      {aba === "conversas" && (
        <TelaConversas
          estado={estado}
          colunas={colunas}
          nomeOrganizacao={nomeOrganizacao}
          avisoMensagens={avisoMensagens}
          acoesNegocio={acoesNegocioDoChat}
          aoAtualizarContato={atualizarContato}
          aoMoverEstagio={moverEstagioContato}
          aoCriarNegocio={criarNegocioRapido}
          aoAbrirFicha={(contatoId) => abrirContato(contatoId)}
        />
      )}

      {aba === "quadro" && (
        <div className="crm-quadro" ref={quadroRef}>
          {colunas.map((coluna, indice) => {
            const contatosDaColuna = contatosPorColuna.get(coluna.id) ?? [];
            return (
              <ColunaCrm
                key={coluna.id}
                coluna={coluna}
                contatos={contatosDaColuna}
                valorDe={(contatoId) => valorPorContato.get(contatoId) ?? 0}
                resumoDe={nomeOrganizacao}
                total={contatosDaColuna.reduce((soma, contato) => soma + (valorPorContato.get(contato.id) ?? 0), 0)}
                selecionadoId={selecionadoId}
                arrastandoId={arrastandoId}
                alvoIndice={alvo?.colunaId === coluna.id ? alvo.indice : null}
                podeExcluir={colunas.length > 1}
                indice={indice}
                totalColunas={colunas.length}
                aoMoverColuna={(colunaId, direcao) => void moverColuna(colunaId, direcao)}
                aoDescerCartao={aoDescerCartao}
                aoAbrirCartao={(contato) => abrirContato(contato.id)}
                aoMoverPorTeclado={moverPorTeclado}
                aoRenomear={renomearColuna}
                aoAjustar={ajustarColuna}
                aoExcluir={excluirColuna}
              />
            );
          })}
          <div className="crm-coluna crm-coluna-nova">
            {criandoColuna ? (
              <div className="crm-nova-coluna-form">
                <input className="campo campo-p" autoFocus value={nomeColuna} maxLength={60} onChange={(e) => setNomeColuna(e.target.value)} onKeyDown={(e) => {
                  if (e.key === "Enter") void criarColuna();
                  if (e.key === "Escape") setCriandoColuna(false);
                }} placeholder="Nome da coluna" aria-label="Nome da coluna nova" />
                <div className="crm-nova-coluna-acoes">
                  <button className="botao botao-p botao-neutro" onClick={() => void criarColuna()} disabled={!nomeColuna.trim()} type="button">Criar</button>
                  <button className="botao botao-p botao-fantasma" onClick={() => setCriandoColuna(false)} type="button">Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="botao botao-p botao-fantasma crm-add-coluna" onClick={() => setCriandoColuna(true)} type="button"><IconeMais className="" /> Nova coluna</button>
            )}
          </div>
        </div>
      )}

      {aba === "contatos" && (
        <ListaContatos
          estado={estado}
          colunas={colunas}
          busca={busca}
          nomeOrganizacao={nomeOrganizacao}
          ultimaInteracaoPorContato={ultimaInteracaoOuCarimbo}
          aoAbrir={abrirContato}
        />
      )}

      {aba === "formulario" && <LeadsFormulario aoImportar={sincronizarCrm} />}

      {aba === "leads" && <BuscaLeads aoImportar={sincronizarCrm} />}

      {contatoSelecionado && (
        <PainelContato
          key={contatoSelecionado.id}
          contato={contatoSelecionado}
          nomeOrganizacao={nomeOrganizacao(contatoSelecionado)}
          negocios={negociosDoSelecionado}
          tarefas={tarefasDoSelecionado}
          orcamentos={orcamentosDoSelecionado}
          colunas={colunas}
          negocioDestaqueId={negocioDestaqueId}
          versaoLinhaDoTempo={versaoLinhaDoTempo}
          aoAtualizar={atualizarContato}
          aoMoverEstagio={moverEstagioContato}
          aoRegistrarInteracao={registrarInteracao}
          aoSaberUltimaInteracao={anotarUltimaInteracao}
          aoCriarTarefa={criarTarefa}
          aoAtualizarTarefa={atualizarTarefa}
          aoExcluirTarefa={excluirTarefa}
          aoAbrirNovoNegocio={abrirNovoNegocio}
          aoAtualizarNegocio={atualizarNegocio}
          aoExcluirNegocio={excluirNegocio}
          aoCriarOrcamento={criarOrcamento}
          aoAtualizarOrcamento={atualizarOrcamento}
          aoExcluirOrcamento={excluirOrcamento}
          aoExcluir={excluirContato}
          aoFechar={() => { setSelecionadoId(null); setNegocioDestaqueId(null); }}
        />
      )}

      {novoNegocio.aberto && (
        <ModalCrm
          titulo="Novo negócio"
          sobre="Oportunidade"
          temConteudo={!!(novoNegocio.contatoTexto.trim() || novoNegocio.titulo.trim() || novoNegocio.valor.trim())}
          aoFechar={() => setNovoNegocio((atual) => ({ ...atual, aberto: false }))}
          aoEnviar={() => void salvarNovoNegocio()}
          rodape={
            <button className="botao botao-principal" disabled={!novoNegocio.contatoTexto.trim() || !novoNegocio.titulo.trim() || salvandoNegocio} aria-busy={salvandoNegocio || undefined} type="submit">
              Criar negócio
            </button>
          }
        >
          <div className="grupo-campo crm-autocomplete">
            <label htmlFor="crm-contato-negocio" className="rotulo">Contato</label>
            <input className="campo" id="crm-contato-negocio" value={novoNegocio.contatoTexto} onChange={(e) => {
              setNovoNegocio((atual) => ({ ...atual, contatoTexto: e.target.value, contatoId: "" }));
            }} placeholder="Busque ou escreva um nome novo" autoComplete="off" autoFocus required aria-controls="crm-contatos-resultados" aria-expanded={sugestoesContato.length > 0} />
            {sugestoesContato.length > 0 && (
              <div className="popover crm-autocomplete-lista" id="crm-contatos-resultados" role="listbox" aria-label="Contatos encontrados">
                {sugestoesContato.map((contato) => (
                  <button className="menu-item" key={contato.id} onClick={() => setNovoNegocio((atual) => ({ ...atual, contatoId: contato.id, contatoTexto: contato.nome }))} type="button" role="option" aria-selected="false">
                    <span className="item-lista-texto">
                      <span className="item-lista-titulo">{contato.nome}</span>
                      {nomeOrganizacao(contato) && <span className="item-lista-meta">{nomeOrganizacao(contato)}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {novoNegocio.contatoId && (() => {
              const contato = contatosPorId.get(novoNegocio.contatoId);
              if (!contato) return null;
              return (
                <div className="crm-contato-escolhido">
                  <span className="item-lista-texto">
                    <span className="item-lista-titulo">{contato.nome}</span>
                    {nomeOrganizacao(contato) && <span className="item-lista-meta">{nomeOrganizacao(contato)}</span>}
                  </span>
                  <button className="botao botao-p botao-fantasma" onClick={() => setNovoNegocio((atual) => ({ ...atual, contatoId: "", contatoTexto: "" }))} type="button">Trocar</button>
                </div>
              );
            })()}
            <span className="dica">Escolha um resultado. Se apenas escrever um nome, uma ficha nova será criada.</span>
          </div>
          <label className="grupo-campo"><span className="rotulo">Título do negócio</span><input className="campo" value={novoNegocio.titulo} onChange={(e) => setNovoNegocio((atual) => ({ ...atual, titulo: e.target.value }))} placeholder="Ex: Ensaio da equipe" maxLength={200} required /></label>
          <label className="grupo-campo"><span className="rotulo">Valor estimado (R$)</span><input className="campo" value={novoNegocio.valor} onChange={(e) => setNovoNegocio((atual) => ({ ...atual, valor: e.target.value }))} inputMode="decimal" placeholder="Opcional" /></label>
        </ModalCrm>
      )}

      {novoContatoForm.aberto && (
        <ModalCrm
          titulo="Novo contato"
          sobre="Ficha nova"
          temConteudo={!!(novoContatoForm.nome.trim() || novoContatoForm.empresa.trim() || novoContatoForm.telefone.trim() || novoContatoForm.email.trim())}
          aoFechar={() => setNovoContatoForm((atual) => ({ ...atual, aberto: false }))}
          aoEnviar={() => void salvarNovoContato()}
          rodape={
            <button className="botao botao-principal" disabled={!novoContatoForm.nome.trim() || salvandoContato} aria-busy={salvandoContato || undefined} type="submit">
              Criar contato
            </button>
          }
        >
          <label className="grupo-campo"><span className="rotulo">Nome</span><input className="campo" value={novoContatoForm.nome} onChange={(e) => setNovoContatoForm((atual) => ({ ...atual, nome: e.target.value }))} placeholder="Quem é a pessoa ou o negócio" maxLength={200} autoFocus required /></label>
          <label className="grupo-campo"><span className="rotulo">Empresa</span><input className="campo" value={novoContatoForm.empresa} onChange={(e) => setNovoContatoForm((atual) => ({ ...atual, empresa: e.target.value }))} placeholder="Opcional" maxLength={200} /></label>
          <div className="crm-campos-grade">
            <label className="grupo-campo"><span className="rotulo">Telefone</span><input className="campo" type="tel" value={novoContatoForm.telefone} onChange={(e) => setNovoContatoForm((atual) => ({ ...atual, telefone: e.target.value }))} placeholder="Opcional" maxLength={200} /></label>
            <label className="grupo-campo"><span className="rotulo">Email</span><input className="campo" type="email" value={novoContatoForm.email} onChange={(e) => setNovoContatoForm((atual) => ({ ...atual, email: e.target.value }))} placeholder="Opcional" maxLength={200} /></label>
          </div>
          <span className="dica">Só o nome é obrigatório. O resto você completa na ficha quando quiser.</span>
        </ModalCrm>
      )}

      {arrastandoId && arrastado && (
        <div
          className="crm-fantasma"
          ref={fantasmaRef}
          style={{
            width: arrastado.largura,
            transform: `translate3d(${arrastado.x - arrastado.offX}px, ${arrastado.y - arrastado.offY}px, 0)`,
          }}
        >
          <article className="cartao crm-cartao">
            <div className="crm-cartao-topo">
              <span className="crm-avatar">{iniciais(arrastado.contato.nome)}</span>
              <div className="crm-cartao-id">
                <span className="crm-cartao-nome">{arrastado.contato.nome}</span>
                {nomeOrganizacao(arrastado.contato) && <span className="crm-cartao-empresa">{nomeOrganizacao(arrastado.contato)}</span>}
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

// Modal do CRM. O clique no fundo so fecha quando nao ha nada digitado: antes
// ele descartava o formulario inteiro sem avisar.
function ModalCrm({
  titulo,
  sobre,
  temConteudo,
  children,
  rodape,
  aoFechar,
  aoEnviar,
}: {
  titulo: string;
  sobre: string;
  temConteudo: boolean;
  children: React.ReactNode;
  rodape: React.ReactNode;
  aoFechar: () => void;
  aoEnviar: () => void;
}) {
  const [avisando, setAvisando] = useState(false);

  const tentarFechar = useCallback(() => {
    if (!temConteudo) return aoFechar();
    setAvisando(true);
  }, [aoFechar, temConteudo]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") tentarFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [tentarFechar]);

  return (
    <div className="veu-modal" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) tentarFechar(); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={titulo} onSubmit={(e) => { e.preventDefault(); aoEnviar(); }}>
        <div className="modal-topo">
          <div className="crm-modal-titulo">
            <span className="rotulo">{sobre}</span>
            <h2>{titulo}</h2>
          </div>
          <button className="botao botao-p botao-icone botao-fantasma" onClick={tentarFechar} aria-label="Fechar" type="button"><IconeX className="" /></button>
        </div>
        <div className="modal-corpo">
          {children}
          {avisando && (
            <div className="faixa faixa-aviso crm-modal-aviso" role="alert">
              <IconeAlerta className="" />
              <div className="faixa-texto">Você digitou algo. Descartar mesmo assim?</div>
              <div className="faixa-acoes">
                <button className="botao botao-p botao-fantasma" onClick={() => setAvisando(false)} type="button">Continuar editando</button>
                <button className="botao botao-p botao-neutro" onClick={aoFechar} type="button">Descartar</button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-rodape">
          <button className="botao botao-fantasma" onClick={tentarFechar} type="button">Cancelar</button>
          {rodape}
        </div>
      </form>
    </div>
  );
}

function Busca({ valor, aoMudar }: { valor: string; aoMudar: (valor: string) => void }) {
  return (
    <div className="campo-com-icone crm-busca">
      <Lupa />
      <input className="campo" value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="Nome, telefone, email ou empresa" aria-label="Buscar no CRM" />
      {valor && <button className="botao botao-p botao-icone botao-fantasma crm-busca-limpar" onClick={() => aoMudar("")} aria-label="Limpar busca" type="button"><IconeX className="" /></button>}
    </div>
  );
}

function ListaContatos({
  estado,
  colunas,
  busca,
  nomeOrganizacao,
  ultimaInteracaoPorContato,
  aoAbrir,
}: {
  estado: EstadoCrm;
  colunas: Coluna[];
  busca: string;
  nomeOrganizacao: (contato: Contato) => string;
  ultimaInteracaoPorContato: Map<string, string>;
  aoAbrir: (id: string) => void;
}) {
  const [tag, setTag] = useState("");
  const [coluna, setColuna] = useState("");
  const [ordem, setOrdem] = useState<Ordenacao>("nome");
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const tags = [...new Set(estado.contatos.flatMap((contato) => contato.tags))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const dados = estado.contatos.map((contato) => {
    const negocios = estado.negocios.filter((negocio) => negocio.contatoId === contato.id);
    return {
      contato,
      negocios,
      empresa: nomeOrganizacao(contato),
      ultima: ultimaInteracaoPorContato.get(contato.id) ?? "",
      valor: negocios.reduce((soma, negocio) => soma + valorDoNegocio(negocio), 0),
    };
  }).filter(({ contato, empresa }) => (
    contatoCombina(contato, busca, empresa)
    && (!tag || contato.tags.includes(tag))
    && (!coluna || contato.colunaId === coluna)
  )).sort((a, b) => {
    const resultado = ordem === "nome"
      ? a.contato.nome.localeCompare(b.contato.nome, "pt-BR")
      : ordem === "interacao"
        ? (new Date(a.ultima || 0).getTime() - new Date(b.ultima || 0).getTime())
        : a.valor - b.valor;
    return resultado * direcao;
  });

  function ordenar(chave: Ordenacao) {
    if (chave === ordem) setDirecao((atual) => atual === 1 ? -1 : 1);
    else { setOrdem(chave); setDirecao(chave === "nome" ? 1 : -1); }
  }

  return (
    <div className="tela-corpo crm-contatos">
      <div className="barra-ferramentas">
        <label className="crm-filtro">
          <span className="rotulo">Tag</span>
          <select className="campo campo-p" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Todas</option>{tags.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="crm-filtro">
          <span className="rotulo">Estágio no funil</span>
          <select className="campo campo-p" value={coluna} onChange={(e) => setColuna(e.target.value)}><option value="">Todos</option>{colunas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
        </label>
        <span className="barra-ferramentas-espaco" />
        <span className="crm-resultados">{dados.length} {dados.length === 1 ? "contato" : "contatos"}</span>
      </div>
      {dados.length === 0 ? (
        <div className="vazio">
          <h2>Nenhum contato com esses filtros.</h2>
          <p>Afrouxe a busca do topo ou volte a tag e o estágio para Todos.</p>
        </div>
      ) : (
        <div className="crm-tabela-caixa">
          <table className="tabela crm-tabela">
            <thead>
              <tr>
                <th><button className="crm-ordenar" onClick={() => ordenar("nome")} type="button">Nome {ordem === "nome" ? (direcao === 1 ? "↑" : "↓") : ""}</button></th>
                <th>Empresa</th>
                <th>Tags</th>
                <th><button className="crm-ordenar" onClick={() => ordenar("interacao")} type="button">Último toque {ordem === "interacao" ? (direcao === 1 ? "↑" : "↓") : ""}</button></th>
                <th>Próximo contato</th>
                <th className="num"><button className="crm-ordenar" onClick={() => ordenar("valor")} type="button">Negócios {ordem === "valor" ? (direcao === 1 ? "↑" : "↓") : ""}</button></th>
              </tr>
            </thead>
            <tbody>
              {dados.map(({ contato, negocios, empresa, ultima, valor }) => (
                <tr onClick={() => aoAbrir(contato.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") aoAbrir(contato.id); }} key={contato.id}>
                  <td><span className="crm-tabela-pessoa"><span className="crm-avatar">{iniciais(contato.nome)}</span><b>{contato.nome}</b></span></td>
                  <td>{empresa || <span className="crm-vazio-inline">Sem empresa</span>}</td>
                  <td><span className="crm-tabela-tags">{contato.tags.slice(0, 3).map((item) => <span className="selo" key={item}>{item}</span>)}</span></td>
                  <td>{ultima ? formatarDataHora(ultima) : <span className="crm-vazio-inline">Nunca</span>}</td>
                  <td>{contato.proximoContato ? formatarDataHora(contato.proximoContato) : <span className="crm-vazio-inline">Não definido</span>}</td>
                  <td className="num"><span className="crm-tabela-negocios"><b>{negocios.length}</b><small>{formatarReais(valor)}</small></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Lupa() {
  return <svg className="crm-lupa" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
