import { useEffect, useState, type ReactNode } from "react";

// Botao de exclusao com confirmacao em dois cliques, no padrao do app (ver
// BotaoExcluirPeca). O primeiro clique arma e mostra um balao CLICAVEL de
// confirmar; o segundo executa. O desarme e por TEMPO (4s), nunca por sair com o
// mouse: sair nao pode cancelar a intencao. O botao NUNCA muda de tamanho ao
// armar, senao o layout desloca e o segundo clique erra o alvo.
export function BotaoConfirmar({
  aoConfirmar,
  titulo,
  aviso,
  className = "",
  children,
}: {
  aoConfirmar: () => void | Promise<void>;
  titulo: string;
  aviso: string;
  className?: string;
  children: ReactNode;
}) {
  const [armado, setArmado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Armou e nao confirmou: desarma sozinho depois de 4 segundos.
  useEffect(() => {
    if (!armado) return;
    const timer = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(timer);
  }, [armado]);

  async function aoClicar(e: React.MouseEvent) {
    e.stopPropagation();
    if (ocupado) return;
    if (!armado) {
      setArmado(true);
      return;
    }
    setOcupado(true);
    try {
      await aoConfirmar();
    } catch {
      setOcupado(false);
      setArmado(false);
    }
  }

  return (
    <button
      className={`crm-botao-excluir${armado ? " armado" : ""}${ocupado ? " ocupado" : ""} ${className}`}
      onClick={aoClicar}
      onPointerDown={(e) => e.stopPropagation()}
      title={armado ? "Clique de novo pra confirmar" : titulo}
      type="button"
    >
      {children}
      {(armado || ocupado) && (
        <span className="crm-aviso-confirmar">{ocupado ? "Aguarde..." : aviso}</span>
      )}
    </button>
  );
}
