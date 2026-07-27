import { useEffect, useState } from "react";
import { corDoTema } from "../editor/tema";

// Le um token de cor do :root e devolve o literal, reagindo a troca de tema.
//
// POR QUE ELE EXISTE: quase tudo no Hub resolve cor em CSS, com var(), e nao
// precisa disto. O caso que precisa e quando o valor vai parar num lugar que o
// var() nao alcanca. O medido aqui foi o marcador de seta do React Flow: ele
// monta o id do <marker> concatenando o valor da cor, e um id com parenteses
// quebra o url(#...) que aponta pra ele. Com "var(--menta)" ali, a seta some
// em silencio, o que foi conferido no navegador.
//
// A troca de tema mexe em data-theme na raiz do documento, entao o observador
// olha esse atributo e recalcula. Sem ele, a cor congela na do tema que estava
// aberto quando o componente montou.
export function useCorDoTema(nome: string, padrao?: string): string {
  const [cor, setCor] = useState(() => corDoTema(nome, padrao));

  useEffect(() => {
    const reler = () => setCor(corDoTema(nome, padrao));
    reler();
    const observador = new MutationObserver(reler);
    observador.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observador.disconnect();
  }, [nome, padrao]);

  return cor;
}
