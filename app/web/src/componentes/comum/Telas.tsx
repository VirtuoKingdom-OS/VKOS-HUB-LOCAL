import { IconeAlerta } from "./Icones";

// Marca oficial, usada na sidebar e nas telas de abertura.
export function Marca() {
  return (
    <span className="marca-logo">
      <img src="/logo.png" className="marca-img" alt="" />
      VKOS <span style={{ color: "var(--menta-clara)" }}>HUB</span>
    </span>
  );
}

// Tela de carregamento inicial.
export function Splash() {
  return (
    <div className="tela-central">
      <Marca />
      <div className="giro" />
      <p>Abrindo o cockpit.</p>
    </div>
  );
}

// Tela quando o backend nao responde. Retenta sozinho, com botao manual.
export function ServidorForaDoAr({ aoTentar }: { aoTentar: () => void }) {
  return (
    <div className="tela-central">
      <div
        className="selo pendente"
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,107,107,0.1)",
          color: "var(--alerta)",
        }}
      >
        <IconeAlerta className="" />
      </div>
      <h1>Servidor fora do ar</h1>
      <p>
        Nao conseguimos falar com o VKOS Hub. Verifique se ele esta aberto.
        Vamos tentar de novo sozinhos a cada poucos segundos.
      </p>
      <button className="botao botao-principal" onClick={aoTentar}>
        Tentar agora
      </button>
    </div>
  );
}
