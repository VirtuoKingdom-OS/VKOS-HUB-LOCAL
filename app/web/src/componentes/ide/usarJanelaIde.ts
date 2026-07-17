import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

const CHAVE_JANELA_IDE = "vkos-ide-janela";
const MARGEM = 8;

interface Posicao {
  x: number;
  y: number;
}

interface EstadoPersistido {
  x?: number;
  y?: number;
  minimizada?: boolean;
}

function lerEstadoPersistido(): { pos: Posicao | null; minimizada: boolean } {
  try {
    const estado = JSON.parse(localStorage.getItem(CHAVE_JANELA_IDE) ?? "{}") as EstadoPersistido;
    const pos =
      Number.isFinite(estado.x) && Number.isFinite(estado.y)
        ? { x: Number(estado.x), y: Number(estado.y) }
        : null;
    return { pos, minimizada: estado.minimizada === true };
  } catch {
    return { pos: null, minimizada: false };
  }
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));
}

export function usarJanelaIde() {
  const inicial = useRef(lerEstadoPersistido());
  const painelRef = useRef<HTMLElement>(null);
  const [pos, setPos] = useState<Posicao | null>(inicial.current.pos);
  const [minimizada, setMinimizada] = useState(inicial.current.minimizada);
  const [larguraCamada, setLarguraCamada] = useState(1200);
  const [arrastando, setArrastando] = useState(false);
  const arrastoRef = useRef<{
    pointerId: number;
    deslocamentoX: number;
    deslocamentoY: number;
  } | null>(null);
  const posRef = useRef(pos);
  const minimizadaRef = useRef(minimizada);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    minimizadaRef.current = minimizada;
  }, [minimizada]);

  const compacta = larguraCamada < 760;
  const media = larguraCamada < 1100;
  const estreita = larguraCamada < 440;
  const minimizadaAtiva = minimizada && !compacta;

  const persistir = useCallback((proximaPos: Posicao | null, proximaMinimizada: boolean) => {
    try {
      localStorage.setItem(
        CHAVE_JANELA_IDE,
        JSON.stringify({
          ...(proximaPos ? { x: Math.round(proximaPos.x), y: Math.round(proximaPos.y) } : {}),
          minimizada: proximaMinimizada,
        }),
      );
    } catch {
      // Persistencia e um conforto. A janela continua funcional sem storage.
    }
  }, []);

  const aplicarClamp = useCallback(
    (candidata: Posicao): Posicao => {
      const painel = painelRef.current;
      const camada = painel?.parentElement;
      if (!painel || !camada) return candidata;
      const largura = painel.offsetWidth;
      const altura = painel.offsetHeight;
      return {
        x: limitar(candidata.x, MARGEM, camada.clientWidth - largura - MARGEM),
        y: limitar(candidata.y, MARGEM, camada.clientHeight - altura - MARGEM),
      };
    },
    [],
  );

  const reclamp = useCallback(() => {
    if (!posRef.current || compacta) return;
    const limitada = aplicarClamp(posRef.current);
    posRef.current = limitada;
    setPos(limitada);
    persistir(limitada, minimizadaRef.current);
  }, [aplicarClamp, compacta, persistir]);

  useLayoutEffect(() => {
    const painel = painelRef.current;
    const camada = painel?.parentElement;
    if (!camada) return;
    const medir = () => setLarguraCamada(camada.clientWidth);
    const observador = new ResizeObserver(medir);
    observador.observe(camada);
    medir();
    return () => observador.disconnect();
  }, []);

  useLayoutEffect(() => {
    reclamp();
  }, [reclamp, minimizadaAtiva]);

  useEffect(() => {
    const aoRedimensionar = () => reclamp();
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [reclamp]);

  const aoPointerDown = useCallback(
    (evento: ReactPointerEvent<HTMLElement>) => {
      if (compacta || evento.button !== 0) return;
      if ((evento.target as HTMLElement).closest("button")) return;
      const painel = painelRef.current;
      const camada = painel?.parentElement;
      if (!painel || !camada) return;
      const painelRect = painel.getBoundingClientRect();
      const camadaRect = camada.getBoundingClientRect();
      const atual = posRef.current ?? {
        x: painelRect.left - camadaRect.left,
        y: painelRect.top - camadaRect.top,
      };
      const limitada = aplicarClamp(atual);
      posRef.current = limitada;
      setPos(limitada);
      arrastoRef.current = {
        pointerId: evento.pointerId,
        deslocamentoX: evento.clientX - painelRect.left,
        deslocamentoY: evento.clientY - painelRect.top,
      };
      evento.currentTarget.setPointerCapture(evento.pointerId);
      setArrastando(true);
      evento.preventDefault();
    },
    [aplicarClamp, compacta],
  );

  const aoPointerMove = useCallback(
    (evento: ReactPointerEvent<HTMLElement>) => {
      const arrasto = arrastoRef.current;
      const painel = painelRef.current;
      const camada = painel?.parentElement;
      if (!arrasto || !camada || arrasto.pointerId !== evento.pointerId) return;
      const camadaRect = camada.getBoundingClientRect();
      const proxima = aplicarClamp({
        x: evento.clientX - camadaRect.left - arrasto.deslocamentoX,
        y: evento.clientY - camadaRect.top - arrasto.deslocamentoY,
      });
      posRef.current = proxima;
      setPos(proxima);
    },
    [aplicarClamp],
  );

  const finalizarArrasto = useCallback(
    (evento: ReactPointerEvent<HTMLElement>) => {
      const arrasto = arrastoRef.current;
      if (!arrasto || arrasto.pointerId !== evento.pointerId) return;
      arrastoRef.current = null;
      if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
        evento.currentTarget.releasePointerCapture(evento.pointerId);
      }
      setArrastando(false);
      persistir(posRef.current, minimizadaRef.current);
    },
    [persistir],
  );

  const recentralizar = useCallback(() => {
    if (compacta) return;
    posRef.current = null;
    setPos(null);
    persistir(null, minimizadaRef.current);
  }, [compacta, persistir]);

  const alternarMinimizacao = useCallback(() => {
    if (compacta) return;
    const proxima = !minimizadaRef.current;
    minimizadaRef.current = proxima;
    setMinimizada(proxima);
    persistir(posRef.current, proxima);
  }, [compacta, persistir]);

  const estilo: CSSProperties | undefined =
    pos && !compacta ? { position: "absolute", left: pos.x, top: pos.y } : undefined;

  return {
    painelRef,
    estilo,
    media,
    compacta,
    estreita,
    minimizada: minimizadaAtiva,
    arrastando,
    alternarMinimizacao,
    recentralizar,
    aoPointerDown,
    aoPointerMove,
    aoPointerUp: finalizarArrasto,
    aoPointerCancel: finalizarArrasto,
  };
}
