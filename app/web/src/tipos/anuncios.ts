// Ponte de tipos da peca de anuncio entre o web e o servidor.
//
// O schema mora em app/server/src/anuncios/, e este arquivo NAO redeclara nada
// dele: reexporta por "export type", que o esbuild do Vite apaga inteiro. Nenhum
// arquivo do servidor entra no bundle do navegador. E o mesmo desenho de
// tipos/crm.ts e tipos/mensagens.ts, e o unico ponto do web que atravessa a
// fronteira pro contrato do anuncio.

export type {
  AnuncioResponsivo,
  Campanha,
  Conversao,
  Destino,
  Estrategia,
  GrupoAnuncio,
  Orcamento,
  PalavraChave,
  PalavraNegativa,
  PassoPublicacao,
  PecaAnuncio,
  Recursos,
  Sitelink,
  Snippet,
} from "../../../server/src/anuncios/modelo";

export type { Violacao } from "../../../server/src/anuncios/limites";

import type { LIMITES_GOOGLE } from "../../../server/src/anuncios/limites";

type LimitesDoServidor = typeof LIMITES_GOOGLE;

// O maximo de caracteres de cada campo, que a tela mostra ao lado do contador.
//
// A CONFERENCIA continua sendo do servidor: quem diz que um campo estourou e a
// lista de violacoes que vem no GET, nunca esta tabela. Ela existe so pra
// escrever "21/30" num campo que esta dentro do limite, que e informacao de
// rotina e nao vira violacao nenhuma.
//
// O tipo abaixo e o que impede a copia de envelhecer: cada chave e cada valor
// tem que bater com o LIMITES_GOOGLE do servidor, no literal. Trocar 30 por 32
// la e esquecer daqui vira erro de compilacao no "npm run checar -w web", e nao
// um contador mentindo na tela do dono.
export const MAX_CARACTERES: {
  [Campo in keyof LimitesDoServidor]: LimitesDoServidor[Campo]["maxCaracteres"];
} = {
  titulos: 30,
  descricoes: 90,
  caminhos: 15,
  sitelinks: 25,
  descricoesSitelink: 35,
  frasesDestaque: 25,
  valoresSnippet: 25,
};

// Conta por ponto de codigo visivel, igual ao contarCaracteres do servidor
// (app/server/src/anuncios/limites.ts). Acento composto e emoji ocupam duas
// unidades no .length de UTF-16 e contam UMA no painel do Google: contar pelo
// .length acusaria estouro que nao existe.
export function contarCaracteres(texto: string): number {
  return Array.from(texto).length;
}
