import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pasta = dirname(fileURLToPath(import.meta.url));
const ORDEM = "@layer base, externo, tela, tema;";
const CAMADA_DE: Record<string, string> = { "global.css": "base", "visual-hub.css": "tema" };

const folhas = readdirSync(pasta).filter((f) => f.endsWith(".css"));

function semComentario(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const css = readFileSync(join(pasta, "visual-hub.css"), "utf8");

test("galeria de fontes fica acima dos fluxos que podem abri-la", () => {
  const regra = css.match(/\.galeria-fontes-camada\s*\{[^}]+\}/)?.[0];

  assert.ok(regra, "a galeria precisa de uma regra de camada própria");
  assert.match(regra, /z-index:\s*var\(--z-modal\)/);
  assert.doesNotMatch(css, /\.overlay-cerebro,\s*\.galeria-fontes-camada\s*\{/);
});

test("toda folha declara a ordem das camadas antes de qualquer regra", () => {
  assert.ok(folhas.length >= 18, `esperava 18 folhas ou mais, achei ${folhas.length}`);
  for (const nome of folhas) {
    const texto = semComentario(readFileSync(join(pasta, nome), "utf8")).trim();
    assert.ok(
      texto.startsWith(ORDEM),
      `${nome} precisa comecar com "${ORDEM}". A primeira folha que o navegador ` +
        `ler e a que fixa a ordem, e o bundler nao garante qual vem primeiro.`
    );
  }
});

test("cada folha declara tudo que tem dentro da camada dela", () => {
  for (const nome of folhas) {
    if (nome === "externo.css") continue;
    const camada = CAMADA_DE[nome] ?? "tela";
    const texto = semComentario(readFileSync(join(pasta, nome), "utf8"));
    const corpo = texto.slice(texto.indexOf(ORDEM) + ORDEM.length).trim();
    const abertura = `@layer ${camada} {`;
    assert.ok(corpo.startsWith(abertura), `${nome} precisa abrir com "${abertura}"`);

    // O bloco da camada so pode fechar no fim do arquivo. Se fechar antes,
    // sobrou regra fora da camada, e regra fora de camada vence todas elas.
    let profundidade = 0;
    let fechouEm = -1;
    for (let i = abertura.length - 1; i < corpo.length; i++) {
      if (corpo[i] === "{") profundidade++;
      else if (corpo[i] === "}") {
        profundidade--;
        if (profundidade === 0) {
          fechouEm = i;
          break;
        }
      }
    }
    assert.equal(
      corpo.slice(fechouEm + 1).trim(),
      "",
      `${nome} tem regra fora de "@layer ${camada}". Estilo sem camada vence toda camada.`
    );
  }
});

test("o CSS do React Flow entra pela camada externo", () => {
  const externo = readFileSync(join(pasta, "externo.css"), "utf8");
  assert.match(externo, /@import\s+"@xyflow\/react\/dist\/style\.css"\s+layer\(externo\);/);

  const main = readFileSync(join(pasta, "..", "main.tsx"), "utf8");
  assert.match(main, /import "\.\/estilos\/externo\.css";/);
  assert.doesNotMatch(
    main,
    /@xyflow\/react\/dist\/style\.css/,
    "o CSS do React Flow so entra por externo.css, senao volta a ficar sem camada"
  );
});
