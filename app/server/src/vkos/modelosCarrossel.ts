// OS MODELOS VISUAIS DE CARROSSEL QUE UM WORKSPACE TEM.
//
// Eles são arquivos: `templates/carrossel/modelo-<id>.html` dentro da pasta do
// VKOS. O id que o prompt usa é o pedaço do meio, e a regra de nome é a inversa
// exata da que `promptCarrossel.ts` aplica pra montar o caminho: `modelo.html`
// é o `dark`, e `modelo-vkos09.html` é o `vkos09`.
//
// POR QUE ISTO EXISTE. O Assistente pode mandar um `estilo` em cada tarefa do
// lote, mas ele não tinha como saber quais existem, então nunca mandava. Duas
// peças do mesmo lote caíam no mesmo modelo escolhido pela skill, e o dono
// recebia dois carrosséis com a mesma cara. Listar o catálogo no briefing é o
// que transforma "escolha um estilo" numa instrução executável.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// O nome do arquivo sem prefixo nem extensão. `modelo.html` é o modelo padrão,
// que o prompt chama de `dark`.
function idDoArquivo(nome: string): string | null {
  const minusculo = nome.toLowerCase();
  if (minusculo === "modelo.html") return "dark";
  const casou = /^modelo-([a-z0-9-]+)\.html$/.exec(minusculo);
  return casou ? casou[1] : null;
}

export function listarModelosCarrossel(pastaVkos: string): string[] {
  const pasta = join(pastaVkos, "templates", "carrossel");
  if (!existsSync(pasta)) return [];
  try {
    return readdirSync(pasta)
      .map(idDoArquivo)
      .filter((id): id is string => id !== null)
      .sort();
  } catch {
    // Catálogo ilegível não pode derrubar o briefing inteiro: sem lista, o
    // assistente volta a deixar a escolha com a skill, que é o que ele já fazia.
    return [];
  }
}
