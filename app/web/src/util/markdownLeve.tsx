import type { ReactNode } from "react";

// Render leve de markdown, sem lib externa e sem dangerouslySetInnerHTML.
// Reconhece titulos (#, ##, ###), listas (- item) e negrito (**texto**).
// O que nao reconhecer vira paragrafo normal (texto puro, sempre escapado
// pelo proprio React).

function renderizarInline(linha: string, chave: string): ReactNode[] {
  const partes = linha.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return partes.map((parte, i) => {
    const negrito = /^\*\*([^*]+)\*\*$/.exec(parte);
    if (negrito) {
      return <strong key={`${chave}-b-${i}`}>{negrito[1]}</strong>;
    }
    return <span key={`${chave}-t-${i}`}>{parte}</span>;
  });
}

export function renderizarMarkdownLeve(texto: string): ReactNode[] {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const blocos: ReactNode[] = [];
  let listaAtual: string[] = [];
  let contador = 0;

  const fecharLista = () => {
    if (listaAtual.length === 0) return;
    const chaveLista = `ul-${contador++}`;
    blocos.push(
      <ul key={chaveLista}>
        {listaAtual.map((item, i) => (
          <li key={`${chaveLista}-li-${i}`}>{renderizarInline(item, `${chaveLista}-${i}`)}</li>
        ))}
      </ul>
    );
    listaAtual = [];
  };

  for (const bruta of linhas) {
    const linha = bruta.trimEnd();
    const itemLista = /^\s*[-*]\s+(.*)$/.exec(linha);
    if (itemLista) {
      listaAtual.push(itemLista[1]);
      continue;
    }
    fecharLista();

    if (!linha.trim()) continue;

    const h3 = /^###\s+(.*)$/.exec(linha);
    const h2 = /^##\s+(.*)$/.exec(linha);
    const h1 = /^#\s+(.*)$/.exec(linha);
    const chave = `b-${contador++}`;
    if (h3) {
      blocos.push(<h3 key={chave}>{renderizarInline(h3[1], chave)}</h3>);
      continue;
    }
    if (h2) {
      blocos.push(<h2 key={chave}>{renderizarInline(h2[1], chave)}</h2>);
      continue;
    }
    if (h1) {
      blocos.push(<h1 key={chave}>{renderizarInline(h1[1], chave)}</h1>);
      continue;
    }
    blocos.push(<p key={chave}>{renderizarInline(linha, chave)}</p>);
  }
  fecharLista();

  return blocos;
}
