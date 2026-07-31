import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ProvedorEstado } from "./estado/contexto";
// A ORDEM DA CASCATA e garantida pelo "@layer base, externo, tela, tema;" que
// abre toda folha, nao por esta lista: as folhas de tela carregam sob demanda
// e entram depois de todas estas. A ordem aqui so decide o desempate DENTRO
// de uma mesma camada, e e por isso que primitivas vem depois de global
// (camada base) e canvas vem antes das folhas de tela (camada tela).
import "./estilos/externo.css";
import "./estilos/global.css";
import "./estilos/primitivas.css";
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
