import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ProvedorEstado } from "./estado/contexto";
import "@xyflow/react/dist/style.css";
import "./estilos/global.css";
import "./estilos/canvas.css";

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
