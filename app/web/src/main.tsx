import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ProvedorEstado } from "./estado/contexto";
import "./estilos/externo.css";
import "./estilos/global.css";
import "./estilos/canvas.css";
import "./estilos/visual-hub.css";

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
