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
  moverNegocio as apiMoverNegocio,
  obterCrm,
  registrarInteracao as apiRegistrarInteracao,
  renomearColuna as apiRenomearColuna,
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
import { PainelContato } from "./PainelContato";
import { formatarDataHora, formatarDataHoraCurta, formatarReais, iniciais } from "./formatos";
import { IconeMais, IconeX } from "../comum/Icones";
import "../../estilos/crm.css";

type AbaCrm = "hoje" | "quadro" | "contatos";
type Ordenacao = "nome" | "interacao" | "valor";

interface Arrasto {
  negocio: Negocio;
  x0: number;
  y0: number;
  offX: number;
  offY: number;
  largura: number;
  moveu: boolean;
}

interface Alvo {
  colunaId: string;
  indice: number;
}

function textoCombina(contato: Contato | undefined, negocio: Negocio, termo: string): boolean {
  if (!termo) return true;
  const t = termo.toLowerCase();
  return (
    negocio.titulo.toLowerCase().includes(t) ||
    (contato?.nome ?? "").toLowerCase().includes(t) ||
    (contato?.empresa ?? "").toLowerCase().includes(t) ||
    (contato?.tags ?? []).some((tag) => tag.toLowerCase().includes(t))
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

  const arrasto = useRef<Arrasto | null>(null);
  const alvoRef = useRef<Alvo | null>(null);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [fantasma, setFantasma] = useState<{ x: number; y: number; largura: number } | null>(null);
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

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const colunas = useMemo(
    () => (estado ? [...estado.colunas].sort((a, b) => a.ordem - b.ordem) : []),
    [estado],
  );
  const contatosPorId = useMemo(
    () => new Map((estado?.contatos ?? []).map((contato) => [contato.id, contato])),
    [estado],
  );
  const porColuna = useMemo(() => {
    const mapa = new Map<string, Negocio[]>();
    for (const coluna of colunas) mapa.set(coluna.id, []);
    for (const negocio of estado?.negocios ?? []) {
      if (!textoCombina(contatosPorId.get(negocio.contatoId), negocio, busca)) continue;
      mapa.get(negocio.colunaId)?.push(negocio);
    }
    return mapa;
  }, [busca, colunas, contatosPorId, estado]);
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

  async function novoContato() {
    try {
      const contato = await apiCriarContato({ nome: "Novo contato" });
      setEstado((anterior) => anterior ? { ...anterior, contatos: [...anterior.contatos, contato] } : anterior);
      setBusca("");
      abrirContato(contato.id);
    } catch (e) {
      mostrarErro(e, "Nao deu pra criar o contato.");
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
      const somenteMover = Object.keys(dados).length === 1 && typeof dados.colunaId === "string";
      const negocio = somenteMover
        ? await apiMoverNegocio(id, dados.colunaId as string)
        : await apiAtualizarNegocio(id, dados);
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

  const moverNegocioLocal = useCallback((negocio: Negocio, colunaId: string, indice: number) => {
    setEstado((anterior) => {
      if (!anterior) return anterior;
      const outros = anterior.negocios.filter((item) => item.id !== negocio.id);
      const movido = { ...negocio, colunaId };
      const destino = outros.map((item, global) => ({ item, global })).filter(({ item }) => item.colunaId === colunaId);
      const onde = indice >= destino.length
        ? (destino.length ? destino[destino.length - 1].global + 1 : outros.length)
        : destino[indice].global;
      outros.splice(onde, 0, movido);
      return { ...anterior, negocios: outros };
    });
    if (colunaId !== negocio.colunaId) apiMoverNegocio(negocio.id, colunaId).catch(() => void carregar());
  }, [carregar]);

  const aoMover = useCallback((e: PointerEvent) => {
    const atual = arrasto.current;
    if (!atual) return;
    const distancia = Math.abs(e.clientX - atual.x0) + Math.abs(e.clientY - atual.y0);
    if (!atual.moveu && distancia < 6) return;
    if (!atual.moveu) {
      atual.moveu = true;
      setArrastandoId(atual.negocio.id);
      document.body.classList.add("crm-arrastando");
    }
    setFantasma({ x: e.clientX - atual.offX, y: e.clientY - atual.offY, largura: atual.largura });
    const elemento = document.elementFromPoint(e.clientX, e.clientY);
    const drop = elemento?.closest("[data-coluna-drop]");
    if (!drop) {
      alvoRef.current = null;
      return setAlvo(null);
    }
    const colunaId = drop.getAttribute("data-coluna-drop") ?? "";
    const cartoes = Array.from(drop.querySelectorAll("[data-cartao]"));
    let indice = cartoes.length;
    for (let i = 0; i < cartoes.length; i++) {
      const retangulo = cartoes[i].getBoundingClientRect();
      if (e.clientY < retangulo.top + retangulo.height / 2) {
        indice = i;
        break;
      }
    }
    const proximo = { colunaId, indice };
    alvoRef.current = proximo;
    setAlvo(proximo);
  }, []);

  const aoSoltar = useCallback(() => {
    window.removeEventListener("pointermove", aoMover);
    window.removeEventListener("pointerup", aoSoltar);
    document.body.classList.remove("crm-arrastando");
    const atual = arrasto.current;
    const destino = alvoRef.current;
    arrasto.current = null;
    alvoRef.current = null;
    setArrastandoId(null);
    setFantasma(null);
    setAlvo(null);
    if (!atual) return;
    if (atual.moveu) {
      if (destino) moverNegocioLocal(atual.negocio, destino.colunaId, destino.indice);
    } else {
      abrirContato(atual.negocio.contatoId, atual.negocio.id);
    }
  }, [aoMover, moverNegocioLocal]);

  const aoDescerCartao = useCallback((negocio: Negocio, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const retangulo = (e.currentTarget as HTMLElement).getBoundingClientRect();
    arrasto.current = {
      negocio,
      x0: e.clientX,
      y0: e.clientY,
      offX: e.clientX - retangulo.left,
      offY: e.clientY - retangulo.top,
      largura: retangulo.width,
      moveu: false,
    };
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
  }, [aoMover, aoSoltar]);

  useEffect(() => () => {
    window.removeEventListener("pointermove", aoMover);
    window.removeEventListener("pointerup", aoSoltar);
    document.body.classList.remove("crm-arrastando");
  }, [aoMover, aoSoltar]);

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
          <p className="subtitulo">Relacionamentos, oportunidades e proximos passos em um so lugar.</p>
        </div>
        <div className="crm-topo-acoes">
          <Busca valor={busca} aoMudar={setBusca} />
          <button className="botao botao-principal" onClick={() => aba === "quadro" ? abrirNovoNegocio() : void novoContato()} type="button">
            <IconeMais className="" /> {aba === "quadro" ? "Novo negocio" : "Novo contato"}
          </button>
        </div>
      </header>

      <nav className="crm-abas" aria-label="Visoes do CRM">
        {(["hoje", "quadro", "contatos"] as AbaCrm[]).map((item) => (
          <button className={aba === item ? "ativa" : ""} onClick={() => setAba(item)} type="button" key={item}>
            {item === "hoje" ? "Hoje" : item === "quadro" ? "Quadro" : "Contatos"}
          </button>
        ))}
      </nav>

      {erro && <div className="crm-erro-faixa">{erro}<button onClick={() => setErro(null)} aria-label="Fechar aviso" type="button"><IconeX className="" /></button></div>}

      {aba === "hoje" && (
        <VisaoHoje
          estado={estado}
          colunas={colunas}
          aoAbrirContato={abrirContato}
          aoAbrirQuadro={() => setAba("quadro")}
          aoCriarContato={() => void novoContato()}
        />
      )}

      {aba === "quadro" && (
        <div className="crm-quadro">
          {colunas.map((coluna) => {
            const negocios = porColuna.get(coluna.id) ?? [];
            return (
              <ColunaCrm
                key={coluna.id}
                coluna={coluna}
                negocios={negocios}
                contatos={contatosPorId}
                total={negocios.reduce((soma, negocio) => soma + (negocio.valorEstimado ?? 0), 0)}
                selecionadoId={negocioDestaqueId}
                arrastandoId={arrastandoId}
                alvoIndice={alvo?.colunaId === coluna.id ? alvo.indice : null}
                podeExcluir={colunas.length > 1}
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

      {contatoSelecionado && (
        <PainelContato
          key={contatoSelecionado.id}
          contato={contatoSelecionado}
          negocios={negociosDoSelecionado}
          colunas={colunas}
          negocioDestaqueId={negocioDestaqueId}
          aoAtualizar={atualizarContato}
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

      {fantasma && arrasto.current && (
        <div className="crm-fantasma" style={{ left: fantasma.x, top: fantasma.y, width: fantasma.largura }}>
          <article className="crm-cartao"><div className="crm-cartao-topo"><span className="crm-avatar">{iniciais(contatosPorId.get(arrasto.current.negocio.contatoId)?.nome ?? arrasto.current.negocio.titulo)}</span><div className="crm-cartao-id"><span className="crm-cartao-nome">{arrasto.current.negocio.titulo}</span><span className="crm-cartao-empresa">{contatosPorId.get(arrasto.current.negocio.contatoId)?.nome}</span></div></div></article>
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
  const maximo = Math.max(1, ...colunas.map((coluna) => estado.negocios.filter((negocio) => negocio.colunaId === coluna.id).length));

  if (estado.contatos.length === 0) return (
    <div className="crm-hero crm-hero-hoje"><p className="crm-hero-titulo">Seu CRM esta pronto para o primeiro contato.</p><p className="crm-hero-texto">Crie uma ficha. Depois voce pode ligar negocios, interacoes, tarefas e proximos passos a ela.</p><button className="botao botao-principal" onClick={aoCriarContato} type="button"><IconeMais className="" /> Criar primeiro contato</button></div>
  );

  return (
    <div className="crm-hoje">
      <section className="crm-hoje-bloco"><div className="crm-hoje-topo"><div><strong>{followups.length}</strong><h2>Follow-ups</h2></div><span>atrasados e de hoje</span></div><div className="crm-hoje-lista">{followups.length === 0 && <p className="crm-vazio-inline">Tudo em dia por aqui.</p>}{followups.map((contato) => { const atrasado = diaLocal(new Date(contato.proximoContato as string)) < hoje; return <button className={atrasado ? "crm-item-hoje atrasado" : "crm-item-hoje"} onClick={() => aoAbrirContato(contato.id)} type="button" key={contato.id}><span><b>{contato.nome}</b>{contato.empresa && <small>{contato.empresa}</small>}</span><time>{atrasado ? "Atrasado: " : "Hoje: "}{formatarDataHoraCurta(contato.proximoContato as string)}</time></button>; })}</div></section>
      <section className="crm-hoje-bloco"><div className="crm-hoje-topo"><div><strong>{esquecidos.length}</strong><h2>Clientes esquecidos</h2></div><span>sem interacao ha 30 dias</span></div><div className="crm-hoje-lista">{esquecidos.length === 0 && <p className="crm-vazio-inline">Ninguem ficou para tras.</p>}{esquecidos.map(({ contato, ultima }) => <button className="crm-item-hoje" onClick={() => aoAbrirContato(contato.id)} type="button" key={contato.id}><span><b>{contato.nome}</b><small>Ultima lembranca</small></span><time>{formatarDataHoraCurta(ultima)}</time></button>)}</div></section>
      <section className="crm-hoje-bloco crm-hoje-funil"><div className="crm-hoje-topo"><div><strong>{estado.negocios.length}</strong><h2>Negocios no funil</h2></div><span>{formatarReais(estado.negocios.reduce((soma, negocio) => soma + (negocio.valorEstimado ?? 0), 0))} no total</span></div><button className="crm-funil-lista" onClick={aoAbrirQuadro} type="button">{colunas.map((coluna) => { const negocios = estado.negocios.filter((negocio) => negocio.colunaId === coluna.id); return <span className="crm-funil-linha" key={coluna.id}><span><b>{coluna.nome}</b><small>{negocios.length} {negocios.length === 1 ? "negocio" : "negocios"} | {formatarReais(negocios.reduce((soma, negocio) => soma + (negocio.valorEstimado ?? 0), 0))}</small></span><i style={{ width: `${Math.max(4, negocios.length / maximo * 100)}%` }} /></span>; })}</button></section>
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
    return combinaBusca && (!tag || contato.tags.includes(tag)) && (!coluna || negocios.some((negocio) => negocio.colunaId === coluna));
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
