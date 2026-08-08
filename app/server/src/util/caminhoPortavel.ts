// Caminho portavel: o Hub roda confinado na pasta dele.
//
// O registro de workspaces e o config.json guardavam caminho ABSOLUTO. Mover a
// pasta do Hub de lugar quebrava tudo de uma vez: cada projeto continuava
// apontando pro endereco velho, que nao existia mais, e a tela abria sem
// projeto nenhum. Aconteceu em 2026-08-08, na mudanca do Hub pra dentro do
// repositorio de projetos.
//
// A regra: pasta DENTRO da raiz do Hub vai pro disco relativa a ela, e volta
// absoluta na leitura. Pasta de fora continua absoluta, porque relativa ali nao
// diria nada. Com isso a pasta do Hub inteira pode ser copiada, movida ou
// renomeada sem ninguem editar arquivo de dado.
//
// Modulo folha: so depende de node path/url, nunca de outro modulo do servidor.

import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Este modulo mora em src/util (dev) ou dist/util (build). Subir tres niveis
// chega na pasta app nos dois casos, e mais um chega na raiz do Hub, onde ficam
// o app/, o vkos/ e o workspaces/.
const pastaApp = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const raizHub = resolve(pastaApp, "..");

export function raizDoHub(): string {
  return raizHub;
}

// Barra normal sempre, e sem barra no fim. E a mesma forma canonica do
// normalizarPasta do registro: os dois lados precisam bater, senao a comparacao
// de pastas passa a errar no Windows, onde o resolve() devolve barra invertida.
function comBarraNormal(caminho: string): string {
  return caminho.split(sep).join("/").replace(/\/+$/, "");
}

// O relative() devolve ".." pra quem esta acima da raiz e um caminho absoluto
// pra quem esta em outro drive do Windows. Os dois casos sao "fora do Hub".
function dentroDoHub(rel: string): boolean {
  return rel.length > 0 && !rel.startsWith("..") && !isAbsolute(rel);
}

// A forma que vai pro disco: relativa quando cabe dentro do Hub.
export function paraDisco(caminho: string): string {
  const absoluto = resolve(caminho);
  const rel = relative(raizHub, absoluto);
  return comBarraNormal(dentroDoHub(rel) ? rel : absoluto);
}

// A forma que o resto do servidor usa: sempre absoluta e canonica.
export function doDisco(gravado: string): string {
  return comBarraNormal(isAbsolute(gravado) ? resolve(gravado) : resolve(raizHub, gravado));
}
