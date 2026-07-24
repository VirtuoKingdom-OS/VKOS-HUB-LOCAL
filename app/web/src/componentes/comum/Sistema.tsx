import {
  Component,
  type ButtonHTMLAttributes,
  type ErrorInfo,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { IconeAlerta } from "./Icones";
import "../../estilos/comum.css";

type VarianteBotao = "primario" | "neutro" | "sutil" | "perigo";

export function Botao({
  variante = "neutro",
  ocupado = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  ocupado?: boolean;
}) {
  return (
    <button
      className={`comum-botao comum-botao-${variante} ${className}`.trim()}
      disabled={disabled || ocupado}
      aria-busy={ocupado || undefined}
      {...props}
    >
      {ocupado && <span className="comum-giro" aria-hidden="true" />}
      {children}
    </button>
  );
}

interface RotuloCampo {
  rotulo: string;
  ajuda?: string;
  erro?: string;
}

function MolduraCampo({
  rotulo,
  ajuda,
  erro,
  children,
}: RotuloCampo & { children: ReactNode }) {
  return (
    <label className={`comum-campo${erro ? " com-erro" : ""}`}>
      <span>{rotulo}</span>
      {children}
      {(erro || ajuda) && <small>{erro || ajuda}</small>}
    </label>
  );
}

export function Campo({
  rotulo,
  ajuda,
  erro,
  ...props
}: RotuloCampo & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <MolduraCampo rotulo={rotulo} ajuda={ajuda} erro={erro}>
      <input aria-invalid={Boolean(erro)} {...props} />
    </MolduraCampo>
  );
}

export function AreaTexto({
  rotulo,
  ajuda,
  erro,
  ...props
}: RotuloCampo & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <MolduraCampo rotulo={rotulo} ajuda={ajuda} erro={erro}>
      <textarea aria-invalid={Boolean(erro)} {...props} />
    </MolduraCampo>
  );
}

export function Selecao({
  rotulo,
  ajuda,
  erro,
  children,
  ...props
}: RotuloCampo & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <MolduraCampo rotulo={rotulo} ajuda={ajuda} erro={erro}>
      <select aria-invalid={Boolean(erro)} {...props}>{children}</select>
    </MolduraCampo>
  );
}

export function Interruptor({
  ativo,
  aoMudar,
  rotulo,
  descricao,
  desabilitado = false,
}: {
  ativo: boolean;
  aoMudar: (ativo: boolean) => void;
  rotulo: string;
  descricao?: string;
  desabilitado?: boolean;
}) {
  return (
    <label className={`comum-interruptor${desabilitado ? " desabilitado" : ""}`}>
      <span className="comum-interruptor-texto">
        <strong>{rotulo}</strong>
        {descricao && <small>{descricao}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={ativo}
        disabled={desabilitado}
        onChange={(evento) => aoMudar(evento.target.checked)}
      />
      <span className="comum-interruptor-trilho" aria-hidden="true"><i /></span>
    </label>
  );
}

export function Cartao({
  children,
  className = "",
  flutuante = false,
}: {
  children: ReactNode;
  className?: string;
  flutuante?: boolean;
}) {
  return (
    <section className={`comum-cartao${flutuante ? " flutuante" : ""} ${className}`.trim()}>
      {children}
    </section>
  );
}

export function Abas<T extends string>({
  itens,
  ativa,
  aoMudar,
  rotulo,
  className = "",
}: {
  itens: Array<{ id: T; nome: string; contagem?: number }>;
  ativa: T;
  aoMudar: (id: T) => void;
  rotulo: string;
  className?: string;
}) {
  return (
    <div className={`comum-abas ${className}`.trim()} role="tablist" aria-label={rotulo}>
      {itens.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={ativa === item.id}
          className={ativa === item.id ? "ativa" : ""}
          onClick={() => aoMudar(item.id)}
        >
          {item.nome}
          {item.contagem !== undefined && <span>{item.contagem}</span>}
        </button>
      ))}
    </div>
  );
}

type TipoAviso = "informacao" | "sucesso" | "atencao" | "erro";

export function Aviso({
  tipo = "informacao",
  children,
  className = "",
}: {
  tipo?: TipoAviso;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`comum-aviso comum-aviso-${tipo} ${className}`.trim()} role={tipo === "erro" ? "alert" : "status"}>
      <IconeAlerta className="" />
      <div>{children}</div>
    </div>
  );
}

export function EstadoVazio({
  titulo,
  mensagem,
  acao,
}: {
  titulo: string;
  mensagem: string;
  acao?: ReactNode;
}) {
  return (
    <div className="comum-estado comum-estado-vazio">
      <span className="comum-estado-simbolo" aria-hidden="true" />
      <h2>{titulo}</h2>
      <p>{mensagem}</p>
      {acao}
    </div>
  );
}

export function EstadoCarregando({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="comum-carregando" aria-label="Carregando" aria-busy="true">
      {Array.from({ length: linhas }, (_, indice) => (
        <span key={indice} style={{ width: `${96 - (indice % 3) * 13}%` }} />
      ))}
    </div>
  );
}

export function EstadoErro({
  titulo = "Esta tela encontrou um problema",
  mensagem = "O restante do VKOS continua funcionando. Tente abrir esta tela novamente.",
  aoTentar,
}: {
  titulo?: string;
  mensagem?: string;
  aoTentar?: () => void;
}) {
  return (
    <div className="comum-estado comum-estado-erro" role="alert">
      <IconeAlerta className="" />
      <h2>{titulo}</h2>
      <p>{mensagem}</p>
      {aoTentar && <Botao variante="primario" onClick={aoTentar}>Tentar de novo</Botao>}
    </div>
  );
}

interface PropsLimiteErro {
  children: ReactNode;
  contexto?: string;
  aoTentar?: () => void;
  tela?: boolean;
}

interface EstadoLimiteErro {
  falhou: boolean;
}

export class LimiteErro extends Component<PropsLimiteErro, EstadoLimiteErro> {
  state: EstadoLimiteErro = { falhou: false };

  static getDerivedStateFromError(): EstadoLimiteErro {
    return { falhou: true };
  }

  componentDidCatch(erro: Error, informacao: ErrorInfo) {
    console.error(`Falha isolada em ${this.props.contexto ?? "VKOS"}.`, erro, informacao);
  }

  private tentar = () => {
    this.setState({ falhou: false });
    this.props.aoTentar?.();
  };

  render() {
    if (!this.state.falhou) return this.props.children;
    const conteudo = <EstadoErro aoTentar={this.tentar} />;
    return this.props.tela ? <section className="tela-fluxo comum-tela-erro">{conteudo}</section> : conteudo;
  }
}
