import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { usarEstado } from "../../estado/contexto";
import type { Peca } from "../../tipos/dominio";
import { formatarTema } from "../telas/fluxos";
import { GaleriaContainer } from "./GaleriaContainer";
import { MiniaturaSite } from "./MiniaturaSite";
import { PreviewSite, paginaInicialSite } from "./PreviewSite";
import {
  IconeCarrossel,
  IconeGaleria,
  IconePost,
  IconeSeta,
  IconeSite,
  IconeStories,
} from "../comum/Icones";

// Dados do no contêiner. Leve e serializavel: so o tipo cru da peca. As
// gerações vem da lista global de pecas, filtradas por este tipo.
export interface DadosContainer extends Record<string, unknown> {
  tipoPeca: string;
  // Ligado pelo menu de botao direito pra abrir a galeria.
  abrirGaleria?: boolean;
}

// Extensoes de imagem, pra pegar a capa de cada peca.
const REGEX_IMAGEM = /\.(png|jpe?g|webp|gif|svg)$/i;

// Rotulo no plural por tipo. Fallback pro proprio tipo capitalizado.
const ROTULO: Record<string, string> = {
  carrossel: "Carrosséis",
  post: "Posts",
  stories: "Stories",
  site: "Sites",
  texto: "Posts e textos",
  outro: "Outros",
};

function rotuloTipo(tipo: string): string {
  return ROTULO[tipo] ?? tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

function iconeTipo(tipo: string) {
  switch (tipo) {
    case "carrossel":
      return <IconeCarrossel className="" />;
    case "post":
    case "texto":
      return <IconePost className="" />;
    case "stories":
      return <IconeStories className="" />;
    case "site":
      return <IconeSite className="" />;
    default:
      return <IconeGaleria className="" />;
  }
}

// Capa de uma peca: a primeira previa que for imagem, se houver.
function capa(peca: Peca): string | null {
  return (peca.previews ?? []).find((u) => REGEX_IMAGEM.test(u)) ?? null;
}

// Quantas miniaturas cabem no corpo compacto. O objetivo e economizar espaco.
const MAX_MINIS = 4;

// No contêiner: agrupa todas as gerações de um tipo (carrosséis, posts, etc)
// numa peca compacta. Uma entrada por geração, nunca por pagina. Clicar abre a
// galeria com todas as gerações do tipo pra ver, baixar e ampliar.
function NoContainerInterno({ id, data }: NodeProps) {
  const dados = data as unknown as DadosContainer;
  const tipo = dados.tipoPeca;
  const ehSite = tipo === "site";
  const { pecas } = usarEstado();
  const { setNodes } = useReactFlow();
  const [galeria, setGaleria] = useState(false);
  // Peca de site aberta no painel de preview (null = fechado).
  const [preview, setPreview] = useState<string | null>(null);

  // Clique com detecao de movimento: um arrasto que termina em cima de um
  // elemento clicavel dispara "click" no soltar, e a galeria abria em tela
  // cheia sem o usuario pedir. Guardamos onde o botao do mouse desceu e so
  // tratamos como clique se ele soltou praticamente no mesmo lugar.
  const pontoDesceu = useRef<{ x: number; y: number } | null>(null);
  const aoDescer = useCallback((e: ReactPointerEvent) => {
    pontoDesceu.current = { x: e.clientX, y: e.clientY };
  }, []);
  const cliqueLimpo = useCallback((e: ReactMouseEvent): boolean => {
    const p = pontoDesceu.current;
    if (!p) return true;
    return Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) < 6;
  }, []);

  // Vive: as pecas do tipo saem da lista global. Geracao nova entra na hora.
  const itens = useMemo(() => pecas.filter((p) => p.tipo === tipo), [pecas, tipo]);

  // O menu de botao direito liga abrirGaleria. Abre a galeria e limpa o flag.
  useEffect(() => {
    if (dados.abrirGaleria) {
      setGaleria(true);
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, abrirGaleria: false } } : n
        )
      );
    }
  }, [dados.abrirGaleria, id, setNodes]);

  const abrir = useCallback(() => setGaleria(true), []);
  const fechar = useCallback(() => setGaleria(false), []);

  const minis = itens.slice(0, MAX_MINIS);

  return (
    <div className={`no-container tipo-${tipo}`}>
      {/* Ancora, nao alca: o contêiner recebe a aresta automatica da sessao que
          gerou as pecas. Nada se liga nele a mao. */}
      <Handle type="target" position={Position.Left} isConnectable={false} />

      {/* Cabecalho faz os dois: arrastar move o no (area sem nodrag) e o
          clique parado abre a galeria (a guarda de movimento separa os
          gestos, um arrasto que solta aqui nao dispara a abertura). */}
      <div
        className="cabeca-container"
        title="Clique pra abrir a galeria. Arraste pra mover."
        onPointerDown={aoDescer}
        onClick={(e) => {
          if (cliqueLimpo(e)) abrir();
        }}
      >
        <span className="icone-container">{iconeTipo(tipo)}</span>
        <span className="nome-container">{rotuloTipo(tipo)}</span>
        <span className="contagem-container">{itens.length}</span>
      </div>

      <div className="corpo-container">
        {minis.length === 0 ? (
          <div className="container-vazio">Sem gerações ainda</div>
        ) : (
          <div className={`grade-minis${ehSite ? " sites" : ""}`}>
            {minis.map((peca) => {
              const tema = formatarTema(peca.tema);
              // Site: miniatura viva da propria pagina; clicar abre o preview no
              // painel lateral, com um botao de abrir em nova aba do lado.
              if (ehSite) {
                const pagina = paginaInicialSite(peca);
                return (
                  <div key={peca.pasta} className="mini-container site nodrag">
                    <button
                      className="mini-capa-btn"
                      onPointerDown={aoDescer}
                      onClick={(e) => {
                        if (cliqueLimpo(e)) setPreview(peca.pasta);
                      }}
                      title={`Pré-visualizar ${tema}`}
                    >
                      <span className="mini-capa site">
                        {pagina ? (
                          <MiniaturaSite url={pagina} titulo={tema} />
                        ) : (
                          <span className="mini-sem-img">{iconeTipo(tipo)}</span>
                        )}
                      </span>
                    </button>
                    <span className="mini-rodape">
                      <span className="mini-nome">{tema}</span>
                      {pagina && (
                        <a
                          className="mini-abrir"
                          href={pagina}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Abrir em nova aba"
                        >
                          <IconeSeta className="" />
                        </a>
                      )}
                    </span>
                  </div>
                );
              }
              const url = capa(peca);
              return (
                <button
                  key={peca.pasta}
                  className="mini-container nodrag"
                  onPointerDown={aoDescer}
                  onClick={(e) => {
                    if (cliqueLimpo(e)) abrir();
                  }}
                  title={tema}
                >
                  <span className="mini-capa">
                    {url ? (
                      <img src={url} alt={tema} loading="lazy" draggable={false} />
                    ) : (
                      <span className="mini-sem-img">{iconeTipo(tipo)}</span>
                    )}
                  </span>
                  <span className="mini-nome">{tema}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {itens.length > 0 && (
        <button className="ver-tudo-container nodrag" onClick={abrir}>
          <IconeGaleria className="" />
          Ver tudo ({itens.length})
        </button>
      )}

      {galeria && <GaleriaContainer tipo={tipo} aoFechar={fechar} />}

      {preview && (
        <PreviewSite pasta={preview} aoFechar={() => setPreview(null)} />
      )}
    </div>
  );
}

// Memoizado: arrastar outros nos do canvas nao re-renderiza o contêiner (e as
// miniaturas e iframes de site dentro dele).
export const NoContainer = memo(NoContainerInterno);
