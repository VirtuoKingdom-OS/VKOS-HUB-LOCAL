import { IconeAlerta } from "./Icones";
import "./comum.css";

// Marca oficial, usada na sidebar e nas telas de abertura.
export function Marca() {
  return (
    <span className="marca-logo">
      <img src="/logo.png" className="marca-img" alt="" />
      {/* O wordmark e monocromatico: o menta so fala do que esta vivo, e nome
          de produto nao e estado. A cor da marca continua no logo ao lado. */}
      VKOS HUB
    </span>
  );
}

// Tela de carregamento inicial.
export function Splash() {
  return (
    <div className="tela-central">
      <Marca />
      <div className="girinho" role="status" aria-label="Carregando" />
      <p>Abrindo o cockpit.</p>
    </div>
  );
}

// Tela quando o backend nao responde. Retenta sozinho, com botao manual.
export function ServidorForaDoAr({ aoTentar }: { aoTentar: () => void }) {
  return (
    <div className="tela-central">
      <div className="aviso-central" aria-hidden="true">
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
