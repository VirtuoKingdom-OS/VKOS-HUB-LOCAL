import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { calcularDestinos, type DestinoCamada, type LinhaCamada } from "./camadas";

// Painel de camadas compartilhado entre os editores (carrossel e site). Ele e
// so apresentacao: recebe a lista pronta de camadas do slide ou da secao (do
// mais alto pro mais baixo no empilhamento), a selecao atual e os callbacks.
// Quem monta (Studio, overlay do carrossel, painel do site) traduz as acoes
// pro motor correspondente. Estilos em editor.css, por token, nos 3 temas.
//
// REORDENAR TEM DOIS SIGNIFICADOS, e o painel passa a declarar qual esta em
// uso. Sem essa distincao, era a mesma funcao servindo a dois donos com
// expectativas opostas, e foi dai que saiu o defeito de 2026-07-31: no
// carrossel, subir uma camada movia o texto no eixo Y da pagina.
export type ModoCamadas = "empilhamento" | "fluxo";

export type { DestinoCamada };

export interface ItemCamada {
  // Id estavel do elemento (data-vk).
  id: string;
  // Papel deduzido: "Texto", "Imagem", "Enfeite" ou "Bloco".
  nome: string;
  // Primeiras palavras do conteudo, vazio quando nao ha texto relevante.
  conteudo: string;
  // Detalhe tecnico (tag.classes), vai no title da linha.
  detalhe: string;
  // Recuo do desenho: 0 e filho direto do slide/secao, e dai por diante.
  // E so apresentacao. Quem manda na arvore de verdade e paiId, porque a lista
  // tem PROFUNDIDADE QUALQUER desde 2026-07-31.
  nivel: number;
  // Id do conteiner que abriga este item; null quando e filho direto da pagina.
  paiId: string | null;
  // O item aceita receber outros dentro dele.
  ehConteiner: boolean;
  // Ha alguem acima/abaixo no mesmo pai. So o modo de teclado usa.
  podeSubir: boolean;
  podeDescer: boolean;
}

export interface PropsPainelCamadas {
  itens: ItemCamada[];
  // "empilhamento": reordenar muda quem pinta por cima (carrossel, tela fixa).
  // "fluxo": reordenar muda a ordem na pagina (site, documento que corre).
  modo: ModoCamadas;
  selecionadoId: string | null;
  aoSelecionar: (id: string) => void;
  aoReordenar: (id: string, destino: DestinoCamada) => void;
}

// Distancia que o ponteiro precisa andar pra virar arrasto. Abaixo disso o
// gesto ainda e um clique, e clicar na alca so seleciona.
const LIMIAR_ARRASTO = 4;

export function PainelCamadas({
  itens,
  modo,
  selecionadoId,
  aoSelecionar,
  aoReordenar,
}: PropsPainelCamadas) {
  const refLista = useRef<HTMLUListElement>(null);
  // Id sendo arrastado com o ponteiro, e a fresta onde ele cairia.
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [fresta, setFresta] = useState<number | null>(null);
  // Id em modo de mover PELO TECLADO. Arrasto nao existe pro teclado, e uma
  // lista que so reordena por arrasto e uma lista que parte das pessoas nao
  // consegue reordenar.
  const [movendo, setMovendo] = useState<string | null>(null);

  const linhas = useMemo<LinhaCamada[]>(
    () => itens.map((i) => ({ id: i.id, nivel: i.nivel, paiId: i.paiId })),
    [itens],
  );
  const destinos = useMemo(() => calcularDestinos(linhas), [linhas]);

  // Geometria congelada no inicio do gesto: as linhas nao mudam de lugar
  // enquanto se arrasta, entao medir uma vez basta e evita medir a cada frame.
  const frestasY = useRef<number[]>([]);
  const inicio = useRef<{ x: number; y: number } | null>(null);

  const medirFrestas = useCallback(() => {
    const lista = refLista.current;
    if (!lista) return;
    const cartoes = Array.from(
      lista.querySelectorAll<HTMLElement>("li.camadas-item"),
    );
    const ys = cartoes.map((c) => c.getBoundingClientRect().top);
    const ultimo = cartoes[cartoes.length - 1];
    if (ultimo) ys.push(ultimo.getBoundingClientRect().bottom);
    frestasY.current = ys;
  }, []);

  const frestaMaisPerto = useCallback((y: number) => {
    const ys = frestasY.current;
    if (ys.length === 0) return null;
    let melhor = 0;
    let dist = Infinity;
    ys.forEach((v, i) => {
      const d = Math.abs(v - y);
      if (d < dist) {
        dist = d;
        melhor = i;
      }
    });
    return melhor;
  }, []);

  const encerrarArrasto = useCallback(() => {
    setArrastando(null);
    setFresta(null);
    inicio.current = null;
  }, []);

  const aoMoverPonteiro = useCallback(
    (e: React.PointerEvent, id: string) => {
      const p = inicio.current;
      if (!p) return;
      if (
        arrastando === null &&
        Math.abs(e.clientY - p.y) + Math.abs(e.clientX - p.x) < LIMIAR_ARRASTO
      ) {
        return;
      }
      if (arrastando === null) {
        medirFrestas();
        setArrastando(id);
      }
      setFresta(frestaMaisPerto(e.clientY));
    },
    [arrastando, medirFrestas, frestaMaisPerto],
  );

  const aoSoltarPonteiro = useCallback(() => {
    if (arrastando !== null && fresta !== null && destinos[fresta]) {
      aoReordenar(arrastando, destinos[fresta]);
    }
    encerrarArrasto();
  }, [arrastando, fresta, destinos, aoReordenar, encerrarArrasto]);

  // Esc cancela o arrasto e o modo de mover, sem aplicar nada.
  useEffect(() => {
    if (arrastando === null && movendo === null) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      encerrarArrasto();
      setMovendo(null);
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [arrastando, movendo, encerrarArrasto]);

  // Modo de mover pelo teclado: as setas movem UM passo dentro do mesmo pai.
  const moverUmPasso = useCallback(
    (item: ItemCamada, delta: -1 | 1) => {
      // Irmao e quem divide o mesmo pai. O nivel nao entra na conta: com
      // paiId unico ele seria redundante, e amarrar ao nivel foi o erro que
      // cegou bloco dentro de bloco.
      const irmaos = itens.filter((i) => i.paiId === item.paiId);
      const i = irmaos.findIndex((x) => x.id === item.id);
      const alvo = i + delta;
      if (i < 0 || alvo < 0 || alvo >= irmaos.length) return;
      aoReordenar(item.id, { paiId: item.paiId, indice: alvo });
    },
    [itens, aoReordenar],
  );

  const aoTeclaAlca = useCallback(
    (e: React.KeyboardEvent, item: ItemCamada) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setMovendo((atual) => (atual === item.id ? null : item.id));
        return;
      }
      if (movendo !== item.id) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moverUmPasso(item, -1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moverUmPasso(item, 1);
      }
    },
    [movendo, moverUmPasso],
  );

  if (itens.length === 0) {
    return <p className="painel-vazio">Nenhuma camada visível nesta página.</p>;
  }

  const verbo = modo === "empilhamento" ? "empilhamento" : "ordem na página";

  return (
    <ul className="lista camadas-lista" ref={refLista}>
      {itens.map((item, i) => (
        <li
          key={item.id}
          // O recuo vem do nivel por variavel, e nao por uma classe por nivel:
          // com profundidade qualquer nao da pra ter uma classe pra cada.
          style={{ "--nivel": item.nivel } as CSSProperties}
          className={
            "item-lista camadas-item" +
            (item.id === selecionadoId ? " ativo" : "") +
            (item.id === arrastando ? " arrastando" : "") +
            (item.id === movendo ? " movendo" : "") +
            (fresta === i ? " destino-antes" : "") +
            (fresta === itens.length && i === itens.length - 1 ? " destino-depois" : "")
          }
        >
          {/* A ALCA. Grade de pontinhos na borda do cartao: pegar, arrastar,
              soltar na camada que quiser. Ela e focavel e responde ao teclado,
              porque arrasto nao existe pro teclado nem pro toque assistido. */}
          <button
            type="button"
            className="camadas-alca"
            title={`Arraste pra mudar o ${verbo}. Ou aperte espaço e use as setas.`}
            aria-label={
              movendo === item.id
                ? `Movendo ${item.nome}. Setas movem, Enter confirma, Esc cancela.`
                : `Mover ${item.nome}. Aperte espaço pra mover com as setas.`
            }
            aria-pressed={movendo === item.id}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              inicio.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => aoMoverPonteiro(e, item.id)}
            onPointerUp={aoSoltarPonteiro}
            onPointerCancel={encerrarArrasto}
            onKeyDown={(e) => aoTeclaAlca(e, item)}
          >
            <PontosDeArrasto />
          </button>

          <button
            type="button"
            className="camadas-nome"
            onClick={() => aoSelecionar(item.id)}
            title={item.detalhe}
            aria-current={item.id === selecionadoId ? "true" : undefined}
          >
            <span className="camadas-papel">{item.nome}</span>
            {item.conteudo && <span className="camadas-conteudo">{item.conteudo}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

// A grade de pontinhos. Seis pontos em duas colunas: e a forma que virou
// convencao de "pegue aqui e arraste" em lista reordenavel.
function PontosDeArrasto() {
  return (
    <svg viewBox="0 0 10 16" aria-hidden="true" focusable="false">
      {[3, 8, 13].map((y) => (
        <g key={y}>
          <circle cx="3" cy={y} r="1.3" />
          <circle cx="7" cy={y} r="1.3" />
        </g>
      ))}
    </svg>
  );
}
