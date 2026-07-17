import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import type { Peca } from "../../tipos/dominio";
import { formatarTema, nomePagina } from "../telas/fluxos";
import { IconeLapis, IconeSeta, IconeX } from "../comum/Icones";

// Dimensoes de viewport presetadas. Mobile costuma caber quase inteiro;
// desktop encolhe pra caber na area limitada do painel.
const MOBILE = { largura: 390, altura: 844 };
const DESKTOP = { largura: 1440, altura: 900 };

// Limites do campo custom, pra nao pedir um viewport absurdo.
const MIN_DIM = 240;
const MAX_DIM = 3840;

type Modo = "mobile" | "desktop" | "custom";
interface Dim {
  largura: number;
  altura: number;
}

interface Props {
  // Peca de site a pre-visualizar (pasta identifica a geracao).
  pasta: string;
  // Pagina inicial (url). Sem isto, cai na index/primeira da peca.
  paginaInicial?: string;
  aoFechar: () => void;
}

// Pagina inicial de uma peca de site: a index.html se existir, senao a primeira
// pagina em ordem natural. Reusada pelo contêiner e pela galeria.
export function paginaInicialSite(peca: Peca): string | undefined {
  if (peca.previews.length === 0) return undefined;
  const index = peca.previews.find((u) => /(^|\/)index\.html?($|\?)/i.test(u));
  return index ?? peca.previews[0];
}

// Cache-bust: acrescenta um timestamp pra forcar o iframe a recarregar quando a
// peca e regenerada, sem depender do navegador soltar o cache.
function comCacheBust(url: string, ts: number): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}vk=${ts}`;
}

function limitar(n: number): number {
  if (Number.isNaN(n)) return MIN_DIM;
  return Math.max(MIN_DIM, Math.min(MAX_DIM, Math.round(n)));
}

// Painel de preview do site, ancorado a direita como drawer. Portal pra
// document.body pra escapar do transform do React Flow e cobrir a galeria.
// Renderiza a pagina num iframe na dimensao escolhida, escalado com
// transform: scale() pra caber inteiro na area disponivel.
export function PreviewSite({ pasta, paginaInicial, aoFechar }: Props) {
  const { pecas } = usarEstado();
  const peca = useMemo(() => pecas.find((p) => p.pasta === pasta), [pecas, pasta]);

  const paginas = peca?.previews ?? [];
  const [pagina, setPagina] = useState<string>(
    () => paginaInicial ?? (peca ? paginaInicialSite(peca) : undefined) ?? ""
  );
  const [modo, setModo] = useState<Modo>("desktop");
  const [dim, setDim] = useState<Dim>(DESKTOP);
  const [campoL, setCampoL] = useState(String(DESKTOP.largura));
  const [campoA, setCampoA] = useState(String(DESKTOP.altura));
  const [fator, setFator] = useState(0);
  const [ts, setTs] = useState(() => Date.now());

  const refCorpo = useRef<HTMLDivElement>(null);

  // Se a pagina escolhida sumiu (peca regenerada com outras paginas), volta pra
  // inicial. Se a peca inteira sumiu, fecha o painel.
  useEffect(() => {
    if (!peca) {
      aoFechar();
      return;
    }
    if (pagina && paginas.includes(pagina)) return;
    const nova = paginaInicialSite(peca);
    if (nova) setPagina(nova);
  }, [peca, paginas, pagina, aoFechar]);

  // Atualizacao ao vivo: a lista global de pecas troca de referencia sempre que
  // o backend emite pecas:atualizadas (o estado global recarrega a lista). Fora
  // da primeira renderizacao, cada troca recarrega o iframe via cache-bust.
  const primeiraCarga = useRef(true);
  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    setTs(Date.now());
  }, [pecas]);

  // Recalcula a escala pra pagina caber inteira na area disponivel. Nunca passa
  // de 1 (nao amplia). Roda a cada resize do painel (ResizeObserver).
  useEffect(() => {
    const area = refCorpo.current;
    if (!area) return;
    const recalc = () => {
      const larg = area.clientWidth - 32;
      const alt = area.clientHeight - 32;
      if (larg <= 0 || alt <= 0) return;
      const f = Math.min(larg / dim.largura, alt / dim.altura, 1);
      setFator(f > 0 ? f : 0);
    };
    const ro = new ResizeObserver(recalc);
    ro.observe(area);
    recalc();
    return () => ro.disconnect();
  }, [dim]);

  // Esc fecha o painel. Captura na fase de captura pra chegar antes do canvas.
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar();
      }
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [aoFechar]);

  const aplicarPreset = useCallback((novoModo: Modo, novaDim: Dim) => {
    setModo(novoModo);
    setDim(novaDim);
    setCampoL(String(novaDim.largura));
    setCampoA(String(novaDim.altura));
  }, []);

  const editarCampo = useCallback(
    (qual: "l" | "a", valor: string) => {
      if (qual === "l") setCampoL(valor);
      else setCampoA(valor);
      const l = qual === "l" ? valor : campoL;
      const a = qual === "a" ? valor : campoA;
      const nl = Number(l);
      const na = Number(a);
      if (l.trim() !== "" && a.trim() !== "" && nl > 0 && na > 0) {
        setModo("custom");
        setDim({ largura: limitar(nl), altura: limitar(na) });
      }
    },
    [campoL, campoA]
  );

  if (!peca) return null;

  const tema = formatarTema(peca.tema);
  const pct = Math.round(fator * 100);

  return createPortal(
    <div className="overlay-preview" onMouseDown={aoFechar}>
      <aside className="painel-preview" onMouseDown={(e) => e.stopPropagation()}>
        <header className="topo-preview">
          <div className="linha-titulo-preview">
            <div className="titulo-preview">
              <h2 title={tema}>{tema}</h2>
              {pagina && <span className="sub-preview">{nomePagina(pagina)}</span>}
            </div>
            <button className="fechar" onClick={aoFechar} title="Fechar (Esc)">
              <IconeX className="" />
            </button>
          </div>

          <div className="barra-preview">
            {paginas.length > 1 && (
              <select
                className="select-pagina"
                value={pagina}
                onChange={(e) => setPagina(e.target.value)}
                title="Escolher a página"
              >
                {paginas.map((u) => (
                  <option key={u} value={u}>
                    {nomePagina(u)}
                  </option>
                ))}
              </select>
            )}

            <div className="presets-preview">
              <button
                className={`preset-btn${modo === "mobile" ? " ativo" : ""}`}
                onClick={() => aplicarPreset("mobile", MOBILE)}
              >
                Mobile
              </button>
              <button
                className={`preset-btn${modo === "desktop" ? " ativo" : ""}`}
                onClick={() => aplicarPreset("desktop", DESKTOP)}
              >
                Desktop
              </button>
            </div>

            <div className={`custom-preview${modo === "custom" ? " ativo" : ""}`}>
              <input
                className="campo-dim"
                type="number"
                inputMode="numeric"
                value={campoL}
                onChange={(e) => editarCampo("l", e.target.value)}
                title="Largura (px)"
                aria-label="Largura em pixels"
              />
              <span className="x-dim">x</span>
              <input
                className="campo-dim"
                type="number"
                inputMode="numeric"
                value={campoA}
                onChange={(e) => editarCampo("a", e.target.value)}
                title="Altura (px)"
                aria-label="Altura em pixels"
              />
            </div>

            {pagina && (
              <div className="acoes-preview">
                <button
                  className="abrir-nova-aba editar-site-preview"
                  onClick={() => {
                    aoFechar();
                    window.location.hash = "#/site/" + encodeURIComponent(pasta);
                  }}
                  title="Abrir no editor de site"
                >
                  <IconeLapis className="" />
                  <span>Editar</span>
                </button>
                <a
                  className="abrir-nova-aba"
                  href={pagina}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir em nova aba"
                >
                  <IconeSeta className="" />
                </a>
              </div>
            )}
          </div>
        </header>

        <div className="corpo-preview" ref={refCorpo}>
          {pagina && fator > 0 && (
            <div
              className="moldura-viewport"
              style={{
                width: `${dim.largura * fator}px`,
                height: `${dim.altura * fator}px`,
              }}
            >
              <iframe
                key={pagina}
                className="frame-preview"
                src={comCacheBust(pagina, ts)}
                title={tema}
                sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                style={{
                  width: `${dim.largura}px`,
                  height: `${dim.altura}px`,
                  transform: `scale(${fator})`,
                }}
              />
            </div>
          )}
          {pagina && (
            <span className="selo-dimensao">
              {dim.largura}x{dim.altura}, {pct}%
            </span>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
