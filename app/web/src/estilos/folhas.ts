// Onde estão todas as folhas de estilo do app.
//
// POR QUE ISTO EXISTE: desde 2026-07-27 a folha de uma tela mora ao lado do
// componente dela (crm.css em componentes/crm/), e não mais numa pasta única.
// Os testes de cascata e de escala varriam `estilos/` com um readdirSync. Se
// eles continuassem assim depois da mudança, passariam a cobrir quatro folhas
// em vez de vinte e uma, e continuariam verdes: um teste que não vê o que devia
// ver é pior que teste nenhum, porque dá a sensação de estar protegido.
//
// Este módulo é a fonte única de "quais são as folhas". Folha nova, em qualquer
// pasta, entra automaticamente nas travas.

import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const pastaEstilos = dirname(fileURLToPath(import.meta.url));
export const raizWeb = join(pastaEstilos, "..");

export interface Folha {
  // Nome do arquivo, ex "crm.css".
  nome: string;
  // Caminho absoluto.
  caminho: string;
  // Caminho relativo à raiz de src, pra mensagem de erro legível.
  rotulo: string;
}

// Todos os arquivos com um sufixo, sob web/src, em qualquer profundidade.
export function listarArquivos(sufixo: string): Folha[] {
  const achadas: Folha[] = [];
  (function andar(pasta: string) {
    for (const item of readdirSync(pasta, { withFileTypes: true })) {
      const caminho = join(pasta, item.name);
      if (item.isDirectory()) {
        andar(caminho);
      } else if (item.name.endsWith(sufixo)) {
        achadas.push({
          nome: item.name,
          caminho,
          rotulo: relative(raizWeb, caminho).split("\\").join("/"),
        });
      }
    }
  })(raizWeb);
  return achadas.sort((a, b) => a.rotulo.localeCompare(b.rotulo));
}

// Todas as folhas .css sob web/src, em qualquer profundidade.
export function listarFolhas(): Folha[] {
  return listarArquivos(".css");
}

// AS FOLHAS QUE AINDA NAO MIGRARAM PRA FUNDACAO v2.
//
// ESTA LISTA ESTA VAZIA DESDE 2026-07-30, e o certo e que ela continue assim.
// A Fase 2 do redesign v2 terminou na varredura final: as 21 folhas do app
// migraram, o estilos/legado.css foi demolido classe por classe e o arquivo
// nao existe mais. As travas de CONTEUDO (escala, densidade, cor por token)
// varrem folhasMigradas(), que agora e o app inteiro.
//
// O MECANISMO CONTINUA AQUI DE PROPOSITO. Ele e a unica forma honesta de
// abrir uma exececao temporaria: quem precisar de uma folha fora das travas
// por uma rodada escreve o nome dela aqui, com a data e o motivo, e o proximo
// que passar ve que a divida existe em vez de descobrir por acidente. Folha
// nesta lista e divida declarada, nao permissao.
export const PENDENTES: string[] = [];

// As folhas que ja seguem a fundacao v2, e por isso respondem por ela.
export function folhasMigradas(): Folha[] {
  return listarFolhas().filter((f) => !PENDENTES.includes(f.nome));
}

// As folhas que os testes leem pelo nome: a base, as primitivas e o tema.
export function folhaPorNome(nome: string): Folha {
  const achada = listarFolhas().find((f) => f.nome === nome);
  if (!achada) throw new Error(`folha ${nome} não encontrada sob web/src`);
  return achada;
}
