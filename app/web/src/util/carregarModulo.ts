// Carregamento resiliente de telas lazy. Cada tela pesada entra por import
// dinamico, e o Vite gera um arquivo com hash de conteudo no nome. Depois de um
// deploy novo os hashes mudam: uma aba que ficou aberta ainda tem o index.html
// antigo e, ao navegar pra uma tela lazy, pede um chunk que nao existe mais. O
// import rejeita e a tela cairia no limite de erro sem saida.
//
// A correcao: quando o import falha, recarrega a pagina UMA vez pra buscar o
// index.html novo e os hashes atuais. Uma flag em sessionStorage evita loop se a
// falha for real (rede fora, bug de verdade): na segunda vez o erro sobe pro
// limite de erro normalmente.

import { lazy, type ComponentType } from "react";

const CHAVE_RECARGA = "vkos-chunk-recarga";

function jaRecarregou(): boolean {
  try {
    return sessionStorage.getItem(CHAVE_RECARGA) === "1";
  } catch {
    return false;
  }
}

function marcarRecarga(valor: boolean): void {
  try {
    if (valor) sessionStorage.setItem(CHAVE_RECARGA, "1");
    else sessionStorage.removeItem(CHAVE_RECARGA);
  } catch {
    // Sem sessionStorage a recarga ainda acontece, so nao ha trava anti-loop.
  }
}

// Envolve uma fabrica de import dinamico com a recarga automatica de chunk.
export function importarComRecarga<T extends ComponentType<unknown>>(
  fabrica: () => Promise<{ default: T }>,
): Promise<{ default: T }> {
  return fabrica().then(
    (modulo) => {
      // Sucesso: limpa a trava pra uma futura falha poder recarregar de novo.
      marcarRecarga(false);
      return modulo;
    },
    (erro: unknown) => {
      if (!jaRecarregou()) {
        marcarRecarga(true);
        window.location.reload();
        // A pagina esta recarregando: devolve uma promise que nunca resolve pra
        // nao piscar o limite de erro no intervalo ate o reload assumir.
        return new Promise<{ default: T }>(() => {});
      }
      // Ja recarregamos uma vez e ainda falha: e erro de verdade, deixa subir.
      throw erro;
    },
  );
}

// Igual ao React.lazy, mas com a recarga automatica de chunk embutida. Use no
// lugar de lazy() em toda tela carregada por import dinamico.
export function lazyRecarregavel<T extends ComponentType<any>>(
  fabrica: () => Promise<{ default: T }>,
) {
  return lazy(() => importarComRecarga(fabrica));
}
