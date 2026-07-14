import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  adicionarNota as apiAdicionarNota,
  atualizarContato as apiAtualizar,
  criarColuna as apiCriarColuna,
  criarContato as apiCriarContato,
  excluirColuna as apiExcluirColuna,
  excluirContato as apiExcluirContato,
  moverContato as apiMover,
  obterCrm,
  renomearColuna as apiRenomear,
  type Coluna,
  type Contato,
  type DadosContato,
  type EstadoCrm,
} from "../../api/crm";
import { ColunaCrm } from "./ColunaCrm";
import { PainelContato } from "./PainelContato";
import { iniciais } from "./formatos";
import { IconeMais, IconeX } from "../comum/Icones";
import "../../estilos/crm.css";

// Sessao de arrasto em curso. Guardada em ref pra os handlers de janela lerem
// sempre o valor atual, sem re-render.
interface Arrasto {
  contato: Contato;
  colunaOrigem: string;
  x0: number;
  y0: number;
  offX: number;
  offY: number;
  largura: number;
  altura: number;
  moveu: boolean;
}

// Posicao onde o cartao vai cair: coluna e indice na lista.
interface Alvo {
  colunaId: string;
  indice: number;
}

// Casa o contato com a busca por nome, empresa ou tag.
function combina(contato: Contato, termo: string): boolean {
  if (!termo) return true;
  const t = termo.toLowerCase();
  return (
    contato.nome.toLowerCase().includes(t) ||
    (contato.empresa ?? "").toLowerCase().includes(t) ||
    contato.tags.some((tag) => tag.toLowerCase().includes(t))
  );
}

// Tela do CRM: kanban com colunas personalizaveis, cartoes arrastaveis, painel
// de detalhe, busca e total por coluna. Estado proprio via api/crm.
export function TelaCrm() {
  const [estado, setEstado] = useState<EstadoCrm | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [criandoColuna, setCriandoColuna] = useState(false);
  const [nomeColuna, setNomeColuna] = useState("");

  // Arrasto: ref pra logica, estado pra pintar.
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
    [estado]
  );

  // Contatos visiveis por coluna, na ordem do array, filtrados pela busca.
  const porColuna = useMemo(() => {
    const mapa = new Map<string, Contato[]>();
    for (const k of colunas) mapa.set(k.id, []);
    if (estado) {
      for (const c of estado.contatos) {
        if (!combina(c, busca)) continue;
        const lista = mapa.get(c.colunaId);
        if (lista) lista.push(c);
      }
    }
    return mapa;
  }, [estado, colunas, busca]);

  const contatoSelecionado = useMemo(
    () => estado?.contatos.find((c) => c.id === selecionadoId) ?? null,
    [estado, selecionadoId]
  );

  const totalContatos = estado?.contatos.length ?? 0;

  // === Mutacoes ===

  const substituirContato = useCallback((c: Contato) => {
    setEstado((prev) =>
      prev
        ? { ...prev, contatos: prev.contatos.map((x) => (x.id === c.id ? c : x)) }
        : prev
    );
  }, []);

  async function novoContato() {
    const primeira = colunas[0];
    try {
      const c = await apiCriarContato({ nome: "Novo contato", colunaId: primeira?.id });
      setEstado((prev) => (prev ? { ...prev, contatos: [...prev.contatos, c] } : prev));
      setSelecionadoId(c.id);
      setBusca("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Nao deu pra criar o contato.");
    }
  }

  async function atualizar(id: string, dados: DadosContato): Promise<Contato> {
    const c = await apiAtualizar(id, dados);
    substituirContato(c);
    return c;
  }

  async function adicionarNota(id: string, texto: string): Promise<Contato> {
    const c = await apiAdicionarNota(id, texto);
    substituirContato(c);
    return c;
  }

  async function excluirContato(id: string) {
    await apiExcluirContato(id);
    setEstado((prev) =>
      prev ? { ...prev, contatos: prev.contatos.filter((c) => c.id !== id) } : prev
    );
    if (selecionadoId === id) setSelecionadoId(null);
  }

  async function criarColuna() {
    const limpo = nomeColuna.trim();
    if (!limpo) return;
    try {
      const k = await apiCriarColuna(limpo);
      setEstado((prev) => (prev ? { ...prev, colunas: [...prev.colunas, k] } : prev));
      setNomeColuna("");
      setCriandoColuna(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Nao deu pra criar a coluna.");
    }
  }

  async function renomearColuna(id: string, nome: string) {
    const k = await apiRenomear(id, nome);
    setEstado((prev) =>
      prev ? { ...prev, colunas: prev.colunas.map((x) => (x.id === id ? k : x)) } : prev
    );
  }

  async function excluirColuna(id: string) {
    await apiExcluirColuna(id);
    // Os contatos foram movidos no servidor: recarrega pra refletir sem adivinhar.
    await carregar();
  }

  // Move um contato de coluna, otimista, e persiste. Reordena local pra o cartao
  // aparecer na posicao de soltar mesmo antes da resposta.
  function moverContato(contato: Contato, colunaId: string, indice: number) {
    setEstado((prev) => {
      if (!prev) return prev;
      const outros = prev.contatos.filter((c) => c.id !== contato.id);
      const mov: Contato = { ...contato, colunaId };
      const destino = outros
        .map((c, gi) => ({ c, gi }))
        .filter((x) => x.c.colunaId === colunaId);
      let onde: number;
      if (indice >= destino.length) {
        onde = destino.length ? destino[destino.length - 1].gi + 1 : outros.length;
      } else {
        onde = destino[indice].gi;
      }
      outros.splice(onde, 0, mov);
      return { ...prev, contatos: outros };
    });
    if (colunaId !== contato.colunaId) {
      apiMover(contato.id, colunaId).catch(() => void carregar());
    }
  }

  // === Arrasto por pointer events (padrao do canvas) ===

  const aoMover = useCallback((e: PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    const dist = Math.abs(e.clientX - a.x0) + Math.abs(e.clientY - a.y0);
    if (!a.moveu && dist < 6) return;
    if (!a.moveu) {
      a.moveu = true;
      setArrastandoId(a.contato.id);
      document.body.classList.add("crm-arrastando");
    }
    setFantasma({ x: e.clientX - a.offX, y: e.clientY - a.offY, largura: a.largura });

    // Descobre a coluna e o indice sob o ponteiro. O fantasma tem pointer-events
    // none, entao elementFromPoint enxerga a coluna por baixo dele.
    const alvoEl = document.elementFromPoint(e.clientX, e.clientY);
    const drop = alvoEl?.closest("[data-coluna-drop]");
    if (!drop) {
      alvoRef.current = null;
      setAlvo(null);
      return;
    }
    const colunaId = drop.getAttribute("data-coluna-drop") ?? "";
    const cards = Array.from(drop.querySelectorAll("[data-cartao]"));
    let indice = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        indice = i;
        break;
      }
    }
    const novo = { colunaId, indice };
    alvoRef.current = novo;
    setAlvo(novo);
  }, []);

  const aoSoltar = useCallback(() => {
    window.removeEventListener("pointermove", aoMover);
    window.removeEventListener("pointerup", aoSoltar);
    document.body.classList.remove("crm-arrastando");
    const a = arrasto.current;
    arrasto.current = null;
    const dest = alvoRef.current;
    alvoRef.current = null;
    setArrastandoId(null);
    setFantasma(null);
    setAlvo(null);
    if (!a) return;
    if (a.moveu) {
      if (dest) moverContato(a.contato, dest.colunaId, dest.indice);
    } else {
      // Clique parado: abre o detalhe.
      setSelecionadoId(a.contato.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aoMover]);

  const aoDescerCartao = useCallback(
    (contato: Contato, e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      const r = el.getBoundingClientRect();
      arrasto.current = {
        contato,
        colunaOrigem: contato.colunaId,
        x0: e.clientX,
        y0: e.clientY,
        offX: e.clientX - r.left,
        offY: e.clientY - r.top,
        largura: r.width,
        altura: r.height,
        moveu: false,
      };
      window.addEventListener("pointermove", aoMover);
      window.addEventListener("pointerup", aoSoltar);
    },
    [aoMover, aoSoltar]
  );

  // Limpa os listeners se a tela desmontar no meio de um arrasto.
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      document.body.classList.remove("crm-arrastando");
    };
  }, [aoMover, aoSoltar]);

  // === Render ===

  if (carregando) {
    return (
      <section className="tela-fluxo crm-tela">
        <div className="crm-carregando">Carregando o CRM...</div>
      </section>
    );
  }

  if (erro && !estado) {
    return (
      <section className="tela-fluxo crm-tela">
        <div className="crm-erro-cheio">
          <p>{erro}</p>
          <button className="botao botao-neutro" onClick={() => void carregar()} type="button">
            Tentar de novo
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tela-fluxo crm-tela">
      <header className="tela-fluxo-topo crm-topo">
        <div className="crm-topo-titulo">
          <h1>CRM</h1>
          <p className="subtitulo">Seu funil de contatos, do primeiro oi ao fechado.</p>
        </div>
        <div className="crm-topo-acoes">
          <div className="crm-busca">
            <Lupa />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, empresa ou tag"
              aria-label="Buscar contatos"
            />
            {busca && (
              <button
                className="crm-busca-limpar"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                type="button"
              >
                <IconeX className="" />
              </button>
            )}
          </div>
          <button className="botao botao-principal" onClick={() => void novoContato()} type="button">
            <IconeMais className="" />
            Novo contato
          </button>
        </div>
      </header>

      {erro && estado && <div className="crm-erro-faixa">{erro}</div>}

      {totalContatos === 0 && !busca && (
        <div className="crm-hero">
          <p className="crm-hero-titulo">Seu funil esta vazio.</p>
          <p className="crm-hero-texto">
            Cadastre o primeiro contato e arraste ele pelas colunas conforme a conversa anda.
          </p>
          <button className="botao botao-principal" onClick={() => void novoContato()} type="button">
            <IconeMais className="" />
            Criar primeiro contato
          </button>
        </div>
      )}

      <div className="crm-quadro">
        {colunas.map((coluna: Coluna) => {
          const contatos = porColuna.get(coluna.id) ?? [];
          const total = contatos.reduce((s, c) => s + (c.valorEstimado ?? 0), 0);
          return (
            <ColunaCrm
              key={coluna.id}
              coluna={coluna}
              contatos={contatos}
              total={total}
              selecionadoId={selecionadoId}
              arrastandoId={arrastandoId}
              alvoIndice={alvo && alvo.colunaId === coluna.id ? alvo.indice : null}
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
              <input
                autoFocus
                value={nomeColuna}
                maxLength={60}
                onChange={(e) => setNomeColuna(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void criarColuna();
                  if (e.key === "Escape") {
                    setCriandoColuna(false);
                    setNomeColuna("");
                  }
                }}
                placeholder="Nome da coluna"
              />
              <div className="crm-nova-coluna-acoes">
                <button
                  className="botao botao-principal"
                  onClick={() => void criarColuna()}
                  disabled={!nomeColuna.trim()}
                  type="button"
                >
                  Criar
                </button>
                <button
                  className="botao botao-fantasma"
                  onClick={() => {
                    setCriandoColuna(false);
                    setNomeColuna("");
                  }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              className="crm-add-coluna"
              onClick={() => setCriandoColuna(true)}
              type="button"
            >
              <IconeMais className="" />
              Nova coluna
            </button>
          )}
        </div>
      </div>

      {contatoSelecionado && (
        <PainelContato
          key={contatoSelecionado.id}
          contato={contatoSelecionado}
          aoAtualizar={atualizar}
          aoAdicionarNota={adicionarNota}
          aoExcluir={excluirContato}
          aoFechar={() => setSelecionadoId(null)}
        />
      )}

      {fantasma && arrasto.current && (
        <div
          className="crm-fantasma"
          style={{ left: fantasma.x, top: fantasma.y, width: fantasma.largura }}
        >
          <article className="crm-cartao">
            <div className="crm-cartao-topo">
              <span className="crm-avatar" aria-hidden="true">
                {iniciais(arrasto.current.contato.nome)}
              </span>
              <div className="crm-cartao-id">
                <span className="crm-cartao-nome">{arrasto.current.contato.nome}</span>
                {arrasto.current.contato.empresa && (
                  <span className="crm-cartao-empresa">{arrasto.current.contato.empresa}</span>
                )}
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

// Lupa da busca. SVG inline pra nao depender de icone externo.
function Lupa() {
  return (
    <svg className="crm-lupa" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
