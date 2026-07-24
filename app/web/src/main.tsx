import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ProvedorEstado } from "./estado/contexto";
import { caminhoDoHashLegado } from "./componentes/layout/rotas";
import "@xyflow/react/dist/style.css";
import "./estilos/global.css";
import "./estilos/canvas.css";
import "./estilos/visual-hub.css";

const caminhoLegado = caminhoDoHashLegado(window.location.hash);
if (caminhoLegado) {
  history.replaceState(null, "", caminhoLegado);
}

const raiz = document.getElementById("raiz");
if (!raiz) {
  throw new Error("Elemento raiz nao encontrado.");
}

createRoot(raiz).render(
  <StrictMode>
    <ProvedorEstado>
      <App />
    </ProvedorEstado>
  </StrictMode>
);
