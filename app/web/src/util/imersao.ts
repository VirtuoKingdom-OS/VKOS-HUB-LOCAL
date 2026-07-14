import { useEffect } from "react";

// Imersao: bloqueia o menu de contexto nativo do navegador e as teclas de
// atalho das ferramentas de desenvolvedor. Nao mexe em copiar, colar nem
// selecionar, o usuario precisa colar conteudo nos nos de contexto.
//
// Fronteira honesta: o DevTools ainda e alcancavel pelo menu do navegador.
// O bloqueio absoluto so vem no shell empacotado, fase futura.
export function usarImersao(): void {
  useEffect(() => {
    const semMenuNativo = (evento: MouseEvent) => {
      evento.preventDefault();
    };

    const semAtalhosDev = (evento: KeyboardEvent) => {
      const tecla = evento.key.toUpperCase();

      // F12 abre o DevTools direto.
      if (tecla === "F12") {
        evento.preventDefault();
        return;
      }
      // Ctrl+Shift+I / J / C abrem o inspetor, o console e o seletor.
      if (evento.ctrlKey && evento.shiftKey && ["I", "J", "C"].includes(tecla)) {
        evento.preventDefault();
        return;
      }
      // Ctrl+U abre o codigo fonte da pagina.
      if (evento.ctrlKey && !evento.shiftKey && tecla === "U") {
        evento.preventDefault();
      }
    };

    document.addEventListener("contextmenu", semMenuNativo);
    document.addEventListener("keydown", semAtalhosDev);
    return () => {
      document.removeEventListener("contextmenu", semMenuNativo);
      document.removeEventListener("keydown", semAtalhosDev);
    };
  }, []);
}
