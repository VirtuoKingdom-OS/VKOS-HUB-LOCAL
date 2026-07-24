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
  atualizarNegocio as apiAtualizarNegocio,
  atualizarTarefa as apiAtualizarTarefa,
  criarColuna as apiCriarColuna,
  criarContato as apiCriarContato,
  criarNegocio as apiCriarNegocio,
  criarTarefa as apiCriarTarefa,
  excluirColuna as apiExcluirColuna,
  excluirContato as apiExcluirContato,
  excluirNegocio as apiExcluirNegocio,
  excluirTarefa as apiExcluirTarefa,
  moverContato as apiMoverContato,
  obterCrm,
  registrarInteracao as apiRegistrarInteracao,
  renomearColuna as apiRenomearColuna,
  reordenarColunas as apiReordenarColunas,
  type Coluna,
  type Contato,
  type DadosContato,
  type DadosNegocio,
  type DadosTarefa,
  type EstadoCrm,
  type Interacao,
  type Negocio,
  type Tarefa,
  type TipoInteracao,
} from "../../api/crm";
import { ColunaCrm } from "./ColunaCrm";
import { BuscaLeads } from "./BuscaLeads";
import { obterDisponibilidadeLeads } from "../../api/leads";
import { PainelContato } from "./PainelContato";
import { formatarDataHora, formatarDataHoraCurta, formatarReais, iniciais } from "./formatos";
import { IconeMais, IconeX } from "../comum/Icones";
import { Abas } from "../comum/Sistema";
import "../../estilos/crm.css";

type AbaCrm = "hoje" | "quadro" | "contatos" | "leads";
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

function contatoCombina(contato: Contato, termo: string): boolean {
  if (!termo) return true;
  const t = termo.toLowerCase();
  return (
    contato.nome.toLowerCase().includes(t) ||
    (contato.empresa ?? "").toLowerCase().includes(t) ||
    (contato.lead?.categoria ?? "").toLowerCase().includes(t) ||
    contato.tags.some((tag) => tag.toLowerCase().includes(t))
  );
}

function diaLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function TelaCrm() {
  const [estado, setEstado] = useState<EstadoCrm | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<AbaCrm>("hoje");
  const [leadsDisponiveis, setLeadsDisponiveis] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [negocioDestaqueId, setNegocioDestaqueId] = useState<string | null>(null);
  const [criandoColuna, setCriandoColuna] = useState(false);
  const [nomeColuna, setNomeColuna] = useState("");
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

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setEstado(await obterCrm());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Nao deu pra carregar o CRM.");
    } finally {
      setCarregando(false);
    }
  }, []);

  const sincronizarCrm = useCallback(async () => {
    try {
      setEstado(await obterCrm());
    } catch (e) {
      mostrarErro(e, "Os leads entraram, mas não deu pra atualizar o CRM agora.");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    let ativo = true;
    obterDisponibilidadeLeads()
      .then((disponivel) => {
        if (ativo) setLeadsDisponiveis(disponivel);
      })
      .catch(() => {
        if (ativo) setLeadsDisponiveis(false);
      });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!leadsDisponiveis && aba === "leads") setAba("hoje");
  }, [aba, leadsDisponiveis]);

  const colunas = useMemo(
    () => (estado ? [...estado.colunas].sort((a, b) => a.ordem - b.ordem) : []),
    [estado],
  );
  const contatosPorId = useMemo(
    () => new Map((estado?.contatos ?? []).map((contato) => [contato.id, contato])),
    [estado],
  );
  // Valor de cada contato: soma dos negocios (oportunidades) presos a ele.
  const valorPorContato = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const negocio of estado?.negocios ?? []) {
      mapa.set(negocio.contatoId, (mapa.get(negocio.contatoId) ?? 0) + (negocio.valorEstimado ?? 0));
    }
    return mapa;
  }, [estado]);
  // O contato E o cartao: a ordem do array de contatos e a ordem no quadro.
  const contatosPorColuna = useMemo(() => {
    const mapa = new Map<string, Contato[]>();
    for (const coluna of colunas) mapa.set(coluna.id, []);
    for (const contato of estado?.contatos ?? []) {
      if (!contatoCombina(contato, busca)) continue;
      mapa.get(contato.colunaId)?.push(contato);
    }
    return mapa;
  }, [busca, colunas, estado]);
  const contatoSelecionado = estado?.contatos.find((contato) => contato.id === selecionadoId) ?? null;
  const negociosDoSelecionado = estado?.negocios.filter((negocio) => negocio.contatoId === selecionadoId) ?? [];
  const sugestoesContato = useMemo(() => {
    if (!estado || !novoNegocio.aberto || novoNegocio.contatoId) return [];
    const termo = novoNegocio.contatoTexto.trim().toLocaleLowerCase("pt-BR");
    return estado.contatos
      .filter((contato) => {
        if (!termo) return true;
        return contato.nome.toLocaleLowerCase("pt-BR").includes(termo)
          || (contato.empresa ?? "").toLocaleLowerCase("pt-BR").includes(termo);
      })
      .slice(0, 8);
  }, [estado, novoNegocio.aberto, novoNegocio.contatoId, novoNegocio.contatoTexto]);

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
      setEstado((anterior) => anterior ? { ...anterior, contatos: [...anterior.contatos, contato] } : anterior);
      setNovoContatoForm({ aberto: false, nome: "", empresa: "", telefone: "", email: "" });
      setBusca("");
      abrirContato(contato.id);
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar o contato.");
    } finally {
      setSalvandoContato(false);
    }
  }

  async function atualizarContato(id: string, dados: DadosContato): Promise<Contato> {
    try {
      const contato = await apiAtualizarContato(id, dados);
      setEstado((anterior) => anterior ? {
        ...anterior,
        contatos: anterior.contatos.map((item) => item.id === id ? contato : item),
      } : anterior);
      return contato;
    } catch (e) {
      mostrarErro(e, "Nao deu pra atualizar o contato.");
      throw e;
    }
  }

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
      } : anterior);
      setSelecionadoId(null);
    } catch (e) {
      mostrarErro(e, "Nao deu pra excluir o contato.");
      throw e;
    }
  }

  async function registrarInteracao(id: string, tipo: TipoInteracao, texto: string): Promise<Interacao> {
    try {
      const interacao = await apiRegistrarInteracao(id, tipo, texto);
      setEstado((anterior) => anterior ? {
        ...anterior,
        contatos: anterior.contatos.map((contato) => contato.id === id
          ? { ...contato, interacoes: [interacao, ...contato.interacoes], atualizadoEm: interacao.em }
          : contato),
      } : anterior);
      return interacao;
    } catch (e) {
      mostrarErro(e, "Nao deu pra registrar a interacao.");
      throw e;
    }
  }

  async function criarTarefa(id: string, texto: string, prazo?: string): Promise<Tarefa> {
    try {
      const tarefa = await apiCriarTarefa(id, texto, prazo);
      setEstado((anterior) => anterior ? {
        ...anterior,
        contatos: anterior.contatos.map((contato) => contato.id === id
          ? { ...contato, tarefas: [...contato.tarefas, tarefa] }
          : contato),
      } : anterior);
      return tarefa;
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar a tarefa.");
      throw e;
    }
  }

  async function atualizarTarefa(id: string, dados: DadosTarefa): Promise<Tarefa> {
    try {
      const tarefa = await apiAtualizarTarefa(id, dados);
      setEstado((anterior) => anterior ? {
        ...anterior,
        contatos: anterior.contatos.map((contato) => ({
          ...contato,
          tarefas: contato.tarefas.map((item) => item.id === id ? tarefa : item),
        })),
      } : anterior);
      return tarefa;
    } catch (e) {
      mostrarErro(e, "Nao deu pra atualizar a tarefa.");
      throw e;
    }
  }

  async function excluirTarefa(contatoId: string, id: string) {
    try {
      await apiExcluirTarefa(id);
      setEstado((anterior) => anterior ? {
        ...anterior,
        contatos: anterior.contatos.map((contato) => contato.id === contatoId
          ? { ...contato, tarefas: contato.tarefas.filter((item) => item.id !== id) }
          : contato),
      } : anterior);
    } catch (e) {
      mostrarErro(e, "Nao deu pra excluir a tarefa.");
      throw e;
    }
  }

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

  async function atualizarNegocio(id: string, dados: DadosNegocio): Promise<Negocio> {
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
  }

  async function excluirNegocio(id: string) {
    try {
      await apiExcluirNegocio(id);
      setEstado((anterior) => anterior ? { ...anterior, negocios: anterior.negocios.filter((item) => item.id !== id) } : anterior);
      if (negocioDestaqueId === id) setNegocioDestaqueId(null);
    } catch (e) {
      mostrarErro(e, "Nao deu pra excluir o negocio.");
      throw e;
    }
  }

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

  async function renomearColuna(id: string, nome: string) {
    try {
      const coluna = await apiRenomearColuna(id, nome);
      setEstado((anterior) => anterior ? {
        ...anterior,
        colunas: anterior.colunas.map((item) => item.id === id ? coluna : item),
      } : anterior);
    } catch (e) {
      mostrarErro(e, "Nao deu pra renomear a coluna.");
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

  if (carregando) return <section className="tela-fluxo crm-tela"><div className="crm-carregando">Carregando o CRM...</div></section>;
  if (erro && !estado) return (
    <section className="tela-fluxo crm-tela">
      <div className="crm-erro-cheio"><p>{erro}</p><button className="botao botao-neutro" onClick={() => void carregar()} type="button">Tentar de novo</button></div>
    </section>
  );
  if (!estado) return null;

  return (
    <section className="tela-fluxo crm-tela">
      <header className="tela-fluxo-topo crm-topo">
        <div className="crm-topo-titulo">
          <h1>CRM</h1>
          <p className="subtitulo">Relacionamentos, oportunidades e próximos passos em um só lugar.</p>
        </div>
        {aba !== "leads" && (
          <div className="crm-topo-acoes">
            <Busca valor={busca} aoMudar={setBusca} />
            <button className="botao botao-principal" onClick={abrirNovoContato} type="button">
              <IconeMais className="" /> Novo contato
            </button>
          </div>
        )}
      </header>

      <Abas
        className="crm-abas"
        rotulo="Visões do CRM"
        ativa={aba}
        aoMudar={setAba}
        itens={[
          { id: "hoje", nome: "Hoje" },
          { id: "quadro", nome: "Quadro" },
          { id: "contatos", nome: "Contatos" },
          ...(leadsDisponiveis
            ? [{ id: "leads" as const, nome: "Buscar leads" }]
            : []),
        ]}
      />

      {erro && <div className="crm-erro-faixa">{erro}<button onClick={() => setErro(null)} aria-label="Fechar aviso" type="button"><IconeX className="" /></button></div>}

      {aba === "hoje" && (
        <VisaoHoje
          estado={estado}
          colunas={colunas}
          aoAbrirContato={abrirContato}
          aoAbrirQuadro={() => setAba("quadro")}
          aoCriarContato={abrirNovoContato}
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
                total={contatosDaColuna.reduce((soma, contato) => soma + (valorPorContato.get(contato.id) ?? 0), 0)}
                selecionadoId={selecionadoId}
                arrastandoId={arrastandoId}
                alvoIndice={alvo?.colunaId === coluna.id ? alvo.indice : null}
                podeExcluir={colunas.length > 1}
                indice={indice}
                totalColunas={colunas.length}
                aoMoverColuna={(colunaId, direcao) => void moverColuna(colunaId, direcao)}
                aoDescerCartao={aoDescerCartao}
                aoRenomear={renomearColuna}
                aoExcluir={excluirColuna}
              />
            );
          })}
          <div className="crm-coluna crm-coluna-nova">
            {criandoColuna ? (
              <div className="crm-nova-coluna-form">
                <input autoFocus value={nomeColuna} maxLength={60} onChange={(e) => setNomeColuna(e.target.value)} onKeyDown={(e) => {
                  if (e.key === "Enter") void criarColuna();
                  if (e.key === "Escape") setCriandoColuna(false);
                }} placeholder="Nome da coluna" />
                <div className="crm-nova-coluna-acoes">
                  <button className="botao botao-principal" onClick={() => void criarColuna()} disabled={!nomeColuna.trim()} type="button">Criar</button>
                  <button className="botao botao-fantasma" onClick={() => setCriandoColuna(false)} type="button">Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="crm-add-coluna" onClick={() => setCriandoColuna(true)} type="button"><IconeMais className="" /> Nova coluna</button>
            )}
          </div>
        </div>
      )}

      {aba === "contatos" && (
        <ListaContatos estado={estado} colunas={colunas} busca={busca} aoAbrir={abrirContato} />
      )}

      {aba === "leads" && leadsDisponiveis && <BuscaLeads aoImportar={sincronizarCrm} />}

      {contatoSelecionado && (
        <PainelContato
          key={contatoSelecionado.id}
          contato={contatoSelecionado}
          negocios={negociosDoSelecionado}
          colunas={colunas}
          negocioDestaqueId={negocioDestaqueId}
          aoAtualizar={atualizarContato}
          aoMoverEstagio={moverEstagioContato}
          aoRegistrarInteracao={registrarInteracao}
          aoCriarTarefa={criarTarefa}
          aoAtualizarTarefa={atualizarTarefa}
          aoExcluirTarefa={excluirTarefa}
          aoAbrirNovoNegocio={abrirNovoNegocio}
          aoAtualizarNegocio={atualizarNegocio}
          aoExcluirNegocio={excluirNegocio}
          aoExcluir={excluirContato}
          aoFechar={() => { setSelecionadoId(null); setNegocioDestaqueId(null); }}
        />
      )}

      {novoNegocio.aberto && (
        <div className="crm-modal-fundo" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setNovoNegocio((atual) => ({ ...atual, aberto: false })); }}>
          <form className="crm-modal" onSubmit={(e) => { e.preventDefault(); void salvarNovoNegocio(); }}>
            <div className="crm-secao-topo"><div><span className="crm-painel-sobre">Oportunidade</span><h2>Novo negocio</h2></div><button className="crm-painel-fechar" onClick={() => setNovoNegocio((atual) => ({ ...atual, aberto: false }))} aria-label="Fechar" type="button"><IconeX className="" /></button></div>
            <div className="crm-campo crm-autocomplete"><label htmlFor="crm-contato-negocio" className="crm-rotulo">Contato</label><input id="crm-contato-negocio" value={novoNegocio.contatoTexto} onChange={(e) => {
              setNovoNegocio((atual) => ({ ...atual, contatoTexto: e.target.value, contatoId: "" }));
            }} placeholder="Busque ou escreva um nome novo" autoComplete="off" autoFocus required aria-controls="crm-contatos-resultados" aria-expanded={sugestoesContato.length > 0} />
              {sugestoesContato.length > 0 && <div className="crm-autocomplete-lista" id="crm-contatos-resultados" role="listbox" aria-label="Contatos encontrados">{sugestoesContato.map((contato) => <button className="crm-autocomplete-opcao" key={contato.id} onClick={() => setNovoNegocio((atual) => ({ ...atual, contatoId: contato.id, contatoTexto: contato.nome }))} type="button" role="option" aria-selected="false"><span>{contato.nome}</span>{contato.empresa && <small>{contato.empresa}</small>}</button>)}</div>}
              {novoNegocio.contatoId && (() => { const contato = contatosPorId.get(novoNegocio.contatoId); return contato ? <div className="crm-contato-selecionado"><span><b>{contato.nome}</b>{contato.empresa && <small>{contato.empresa}</small>}</span><button onClick={() => setNovoNegocio((atual) => ({ ...atual, contatoId: "", contatoTexto: "" }))} type="button">Trocar</button></div> : null; })()}
              <span className="crm-ajuda">Escolha um resultado. Se apenas escrever um nome, uma ficha nova sera criada.</span></div>
            <label className="crm-campo"><span className="crm-rotulo">Titulo do negocio</span><input value={novoNegocio.titulo} onChange={(e) => setNovoNegocio((atual) => ({ ...atual, titulo: e.target.value }))} placeholder="Ex: Ensaio da equipe" maxLength={200} required /></label>
            <label className="crm-campo"><span className="crm-rotulo">Valor estimado (R$)</span><input value={novoNegocio.valor} onChange={(e) => setNovoNegocio((atual) => ({ ...atual, valor: e.target.value }))} inputMode="decimal" placeholder="Opcional" /></label>
            <div className="crm-modal-acoes"><button className="botao botao-fantasma" onClick={() => setNovoNegocio((atual) => ({ ...atual, aberto: false }))} type="button">Cancelar</button><button className="botao botao-principal" disabled={!novoNegocio.contatoTexto.trim() || !novoNegocio.titulo.trim() || salvandoNegocio} type="submit">{salvandoNegocio ? "Criando..." : "Criar negocio"}</button></div>
          </form>
        </div>
      )}

      {novoContatoForm.aberto && (
        <div className="crm-modal-fundo" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setNovoContatoForm((atual) => ({ ...atual, aberto: false })); }}>
          <form className="crm-modal" onSubmit={(e) => { e.preventDefault(); void salvarNovoContato(); }}>
            <div className="crm-secao-topo"><div><span className="crm-painel-sobre">Ficha nova</span><h2>Novo contato</h2></div><button className="crm-painel-fechar" onClick={() => setNovoContatoForm((atual) => ({ ...atual, aberto: false }))} aria-label="Fechar" type="button"><IconeX className="" /></button></div>
            <label className="crm-campo"><span className="crm-rotulo">Nome</span><input value={novoContatoForm.nome} onChange={(e) => setNovoContatoForm((atual) => ({ ...atual, nome: e.target.value }))} placeholder="Quem e a pessoa ou o negocio" maxLength={200} autoFocus required /></label>
            <label className="crm-campo"><span className="crm-rotulo">Empresa</span><input value={novoContatoForm.empresa} onChange={(e) => setNovoContatoForm((atual) => ({ ...atual, empresa: e.target.value }))} placeholder="Opcional" maxLength={200} /></label>
            <div className="crm-campos-grade">
              <label className="crm-campo"><span className="crm-rotulo">Telefone</span><input type="tel" value={novoContatoForm.telefone} onChange={(e) => setNovoContatoForm((atual) => ({ ...atual, telefone: e.target.value }))} placeholder="Opcional" maxLength={200} /></label>
              <label className="crm-campo"><span className="crm-rotulo">Email</span><input type="email" value={novoContatoForm.email} onChange={(e) => setNovoContatoForm((atual) => ({ ...atual, email: e.target.value }))} placeholder="Opcional" maxLength={200} /></label>
            </div>
            <span className="crm-ajuda">So o nome e obrigatorio. O resto voce completa na ficha quando quiser.</span>
            <div className="crm-modal-acoes"><button className="botao botao-fantasma" onClick={() => setNovoContatoForm((atual) => ({ ...atual, aberto: false }))} type="button">Cancelar</button><button className="botao botao-principal" disabled={!novoContatoForm.nome.trim() || salvandoContato} type="submit">{salvandoContato ? "Criando..." : "Criar contato"}</button></div>
          </form>
        </div>
      )}

      {arrastandoId && arrasto.current && (
        <div
          className="crm-fantasma"
          ref={fantasmaRef}
          style={{
            width: arrasto.current.largura,
            transform: `translate3d(${arrasto.current.x - arrasto.current.offX}px, ${arrasto.current.y - arrasto.current.offY}px, 0)`,
          }}
        >
          <article className="crm-cartao"><div className="crm-cartao-topo"><span className="crm-avatar">{iniciais(arrasto.current.contato.nome)}</span><div className="crm-cartao-id"><span className="crm-cartao-nome">{arrasto.current.contato.nome}</span>{arrasto.current.contato.empresa && arrasto.current.contato.empresa !== arrasto.current.contato.nome && <span className="crm-cartao-empresa">{arrasto.current.contato.empresa}</span>}</div></div></article>
        </div>
      )}
    </section>
  );
}

function Busca({ valor, aoMudar }: { valor: string; aoMudar: (valor: string) => void }) {
  return <div className="crm-busca"><Lupa /><input value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="Buscar no CRM" aria-label="Buscar no CRM" />{valor && <button className="crm-busca-limpar" onClick={() => aoMudar("")} aria-label="Limpar busca" type="button"><IconeX className="" /></button>}</div>;
}

function VisaoHoje({
  estado,
  colunas,
  aoAbrirContato,
  aoAbrirQuadro,
  aoCriarContato,
}: {
  estado: EstadoCrm;
  colunas: Coluna[];
  aoAbrirContato: (id: string) => void;
  aoAbrirQuadro: () => void;
  aoCriarContato: () => void;
}) {
  const agora = new Date();
  const hoje = diaLocal(agora);
  const limiteEsquecido = agora.getTime() - 30 * 24 * 60 * 60 * 1000;
  const followups = estado.contatos.filter((contato) => contato.proximoContato && diaLocal(new Date(contato.proximoContato)) <= hoje).sort((a, b) => new Date(a.proximoContato ?? 0).getTime() - new Date(b.proximoContato ?? 0).getTime());
  const esquecidos = estado.contatos.map((contato) => ({ contato, ultima: contato.interacoes[0]?.em ?? contato.criadoEm })).filter(({ ultima }) => new Date(ultima).getTime() < limiteEsquecido).sort((a, b) => new Date(a.ultima).getTime() - new Date(b.ultima).getTime()).slice(0, 10);
  const tarefas = estado.contatos.flatMap((contato) => contato.tarefas.filter((tarefa) => !tarefa.feita).map((tarefa) => ({ contato, tarefa }))).sort((a, b) => a.tarefa.prazo ? (b.tarefa.prazo ? new Date(a.tarefa.prazo).getTime() - new Date(b.tarefa.prazo).getTime() : -1) : 1);
  const valorDoContato = new Map<string, number>();
  for (const negocio of estado.negocios) valorDoContato.set(negocio.contatoId, (valorDoContato.get(negocio.contatoId) ?? 0) + (negocio.valorEstimado ?? 0));
  const contatosDaColuna = (colunaId: string) => estado.contatos.filter((contato) => contato.colunaId === colunaId);
  const valorDaColuna = (colunaId: string) => contatosDaColuna(colunaId).reduce((soma, contato) => soma + (valorDoContato.get(contato.id) ?? 0), 0);
  const valorTotalFunil = estado.negocios.reduce((soma, negocio) => soma + (negocio.valorEstimado ?? 0), 0);
  const maximo = Math.max(1, ...colunas.map((coluna) => contatosDaColuna(coluna.id).length));

  if (estado.contatos.length === 0) return (
    <div className="crm-hero crm-hero-hoje"><p className="crm-hero-titulo">Seu CRM está pronto para o primeiro contato.</p><p className="crm-hero-texto">Crie uma ficha. Depois você pode ligar negócios, interações, tarefas e próximos passos a ela.</p><button className="botao botao-principal" onClick={aoCriarContato} type="button"><IconeMais className="" /> Criar primeiro contato</button></div>
  );

  return (
    <div className="crm-hoje">
      <section className="crm-hoje-bloco"><div className="crm-hoje-topo"><div><strong>{followups.length}</strong><h2>Follow-ups</h2></div><span>atrasados e de hoje</span></div><div className="crm-hoje-lista">{followups.length === 0 && <p className="crm-vazio-inline">Tudo em dia por aqui.</p>}{followups.map((contato) => { const atrasado = diaLocal(new Date(contato.proximoContato as string)) < hoje; return <button className={atrasado ? "crm-item-hoje atrasado" : "crm-item-hoje"} onClick={() => aoAbrirContato(contato.id)} type="button" key={contato.id}><span><b>{contato.nome}</b>{contato.empresa && <small>{contato.empresa}</small>}</span><time>{atrasado ? "Atrasado: " : "Hoje: "}{formatarDataHoraCurta(contato.proximoContato as string)}</time></button>; })}</div></section>
      <section className="crm-hoje-bloco"><div className="crm-hoje-topo"><div><strong>{esquecidos.length}</strong><h2>Clientes esquecidos</h2></div><span>sem interacao ha 30 dias</span></div><div className="crm-hoje-lista">{esquecidos.length === 0 && <p className="crm-vazio-inline">Ninguem ficou para tras.</p>}{esquecidos.map(({ contato, ultima }) => <button className="crm-item-hoje" onClick={() => aoAbrirContato(contato.id)} type="button" key={contato.id}><span><b>{contato.nome}</b><small>Ultima lembranca</small></span><time>{formatarDataHoraCurta(ultima)}</time></button>)}</div></section>
      <section className="crm-hoje-bloco crm-hoje-funil"><div className="crm-hoje-topo"><div><strong>{estado.contatos.length}</strong><h2>Contatos no funil</h2></div><span>{formatarReais(valorTotalFunil)} no total</span></div><button className="crm-funil-lista" onClick={aoAbrirQuadro} type="button">{colunas.map((coluna) => { const total = contatosDaColuna(coluna.id).length; return <span className="crm-funil-linha" key={coluna.id}><span><b>{coluna.nome}</b><small>{total} {total === 1 ? "contato" : "contatos"} | {formatarReais(valorDaColuna(coluna.id))}</small></span><i style={{ width: `${Math.max(4, total / maximo * 100)}%` }} /></span>; })}</button></section>
      <section className="crm-hoje-bloco"><div className="crm-hoje-topo"><div><strong>{tarefas.length}</strong><h2>Tarefas abertas</h2></div><span>por prazo mais proximo</span></div><div className="crm-hoje-lista">{tarefas.length === 0 && <p className="crm-vazio-inline">Nenhuma tarefa aberta.</p>}{tarefas.slice(0, 10).map(({ contato, tarefa }) => <button className="crm-item-hoje" onClick={() => aoAbrirContato(contato.id)} type="button" key={tarefa.id}><span><b>{tarefa.texto}</b><small>{contato.nome}</small></span><time>{tarefa.prazo ? formatarDataHoraCurta(tarefa.prazo) : "Sem prazo"}</time></button>)}</div></section>
    </div>
  );
}

function ListaContatos({ estado, colunas, busca, aoAbrir }: { estado: EstadoCrm; colunas: Coluna[]; busca: string; aoAbrir: (id: string) => void }) {
  const [tag, setTag] = useState("");
  const [coluna, setColuna] = useState("");
  const [ordem, setOrdem] = useState<Ordenacao>("nome");
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const tags = [...new Set(estado.contatos.flatMap((contato) => contato.tags))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const dados = estado.contatos.map((contato) => {
    const negocios = estado.negocios.filter((negocio) => negocio.contatoId === contato.id);
    return { contato, negocios, ultima: contato.interacoes[0]?.em ?? "", valor: negocios.reduce((soma, negocio) => soma + (negocio.valorEstimado ?? 0), 0) };
  }).filter(({ contato, negocios }) => {
    const termo = busca.toLowerCase();
    const combinaBusca = !termo || contato.nome.toLowerCase().includes(termo) || (contato.empresa ?? "").toLowerCase().includes(termo) || contato.tags.some((item) => item.toLowerCase().includes(termo));
    return combinaBusca && (!tag || contato.tags.includes(tag)) && (!coluna || contato.colunaId === coluna);
  }).sort((a, b) => {
    const resultado = ordem === "nome" ? a.contato.nome.localeCompare(b.contato.nome, "pt-BR") : ordem === "interacao" ? (new Date(a.ultima || 0).getTime() - new Date(b.ultima || 0).getTime()) : a.valor - b.valor;
    return resultado * direcao;
  });

  function ordenar(chave: Ordenacao) {
    if (chave === ordem) setDirecao((atual) => atual === 1 ? -1 : 1);
    else { setOrdem(chave); setDirecao(chave === "nome" ? 1 : -1); }
  }

  return (
    <div className="crm-contatos-visao">
      <div className="crm-filtros"><label><span>Tag</span><select value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Todas</option>{tags.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Estagio do negocio</span><select value={coluna} onChange={(e) => setColuna(e.target.value)}><option value="">Todos</option>{colunas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><span className="crm-resultados">{dados.length} {dados.length === 1 ? "contato" : "contatos"}</span></div>
      <div className="crm-tabela-caixa"><table className="crm-tabela"><thead><tr><th><button onClick={() => ordenar("nome")} type="button">Nome {ordem === "nome" ? (direcao === 1 ? "↑" : "↓") : ""}</button></th><th>Empresa</th><th>Tags</th><th><button onClick={() => ordenar("interacao")} type="button">Ultima interacao {ordem === "interacao" ? (direcao === 1 ? "↑" : "↓") : ""}</button></th><th>Proximo contato</th><th><button onClick={() => ordenar("valor")} type="button">Negocios {ordem === "valor" ? (direcao === 1 ? "↑" : "↓") : ""}</button></th></tr></thead><tbody>{dados.map(({ contato, negocios, ultima, valor }) => <tr onClick={() => aoAbrir(contato.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") aoAbrir(contato.id); }} key={contato.id}><td><span className="crm-tabela-pessoa"><span className="crm-avatar">{iniciais(contato.nome)}</span><b>{contato.nome}</b></span></td><td>{contato.empresa || <span className="crm-vazio-inline">Sem empresa</span>}</td><td><span className="crm-tabela-tags">{contato.tags.slice(0, 3).map((item) => <span className="crm-tag" key={item}>{item}</span>)}</span></td><td>{ultima ? formatarDataHora(ultima) : <span className="crm-vazio-inline">Nunca</span>}</td><td>{contato.proximoContato ? formatarDataHora(contato.proximoContato) : <span className="crm-vazio-inline">Nao definido</span>}</td><td><b>{negocios.length}</b><small>{formatarReais(valor)}</small></td></tr>)}</tbody></table>{dados.length === 0 && <div className="crm-lista-vazia">Nenhum contato encontrado com esses filtros.</div>}</div>
    </div>
  );
}

function Lupa() {
  return <svg className="crm-lupa" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
