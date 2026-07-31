// Trava da ORDEM DA CASCATA. Fundacao v2, 2026-07-30.
//
// O PROBLEMA QUE ELA RESOLVE: as folhas de tela carregam sob demanda, por
// import dinamico de rota. Qual folha o navegador le primeiro depende de qual
// tela o usuario abriu primeiro, e sem ordem declarada a cascata muda de
// resultado conforme o caminho que a pessoa fez pelo app. Isso e um bug que
// nao reproduz.
//
// A SOLUCAO: quatro camadas declaradas com @layer, e a declaracao REPETIDA no
// topo de toda folha. A primeira que o navegador ler e a que fixa a ordem, e
// como toda folha comeca com a mesma linha, tanto faz qual chega primeiro.
//
// Ela vale pra TODA folha, migrada ou nao: a ordem das camadas nao e assunto
// de estetica, e o que faz o app ser o mesmo app em toda maquina.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { folhaPorNome, listarFolhas, raizWeb } from "./folhas.js";

const ORDEM = "@layer base, externo, tela, tema;";

// Quem mora em qual camada. Tudo que nao esta aqui e folha de tela.
const CAMADA_DE: Record<string, string> = {
  // O reset, as escalas e o contrato de nome dos tokens.
  "global.css": "base",
  // Os componentes compartilhados. Camada base tambem, de proposito: assim uma
  // folha de tela (@layer tela) consegue sobrescrever uma primitiva sem
  // !important, e a excecao fica VISIVEL, na folha da tela, com nome e motivo.
  "primitivas.css": "base",
  // O valor de cada token de cor por tema.
  "visual-hub.css": "tema",
};

const folhas = listarFolhas();

function semComentario(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

test("toda folha declara a ordem das camadas antes de qualquer regra", () => {
  assert.ok(folhas.length >= 20, `esperava 20 folhas ou mais, achei ${folhas.length}`);
  for (const folha of folhas) {
    const texto = semComentario(readFileSync(folha.caminho, "utf8")).trim();
    assert.ok(
      texto.startsWith(ORDEM),
      `${folha.rotulo} precisa comecar com "${ORDEM}". A primeira folha que o ` +
        `navegador ler e a que fixa a ordem, e as telas carregam sob demanda.`
    );
  }
});

test("cada folha declara tudo que tem dentro da camada dela", () => {
  for (const folha of folhas) {
    if (folha.nome === "externo.css") continue;
    const camada = CAMADA_DE[folha.nome] ?? "tela";
    const texto = semComentario(readFileSync(folha.caminho, "utf8"));
    const corpo = texto.slice(texto.indexOf(ORDEM) + ORDEM.length).trim();
    const abertura = `@layer ${camada} {`;
    assert.ok(corpo.startsWith(abertura), `${folha.rotulo} precisa abrir com "${abertura}"`);

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
      `${folha.rotulo} tem regra fora de "@layer ${camada}". Estilo sem camada vence toda camada.`
    );
  }
});

test("o CSS do React Flow entra pela camada externo", () => {
  const externo = readFileSync(folhaPorNome("externo.css").caminho, "utf8");
  assert.match(externo, /@import\s+"@xyflow\/react\/dist\/style\.css"\s+layer\(externo\);/);

  const main = readFileSync(join(raizWeb, "main.tsx"), "utf8");
  assert.match(main, /import "\.\/estilos\/externo\.css";/);
  assert.doesNotMatch(
    main,
    /@xyflow\/react\/dist\/style\.css/,
    "o CSS do React Flow so entra por externo.css, senao volta a ficar sem camada"
  );
});

test("a fundacao inteira e importada de main.tsx, na ordem certa", () => {
  // Camada resolve a disputa ENTRE camadas. Dentro de uma camada, quem vence e
  // quem vem depois, e o par que importa e primitivas depois de global: as
  // duas moram em base, e a primitiva precisa vencer o padrao de elemento.
  const main = readFileSync(join(raizWeb, "main.tsx"), "utf8");
  const ordem = ["externo.css", "global.css", "primitivas.css", "canvas.css", "visual-hub.css"];
  const posicoes = ordem.map((f) => {
    const i = main.indexOf(`./estilos/${f}`);
    assert.ok(i >= 0, `main.tsx precisa importar ${f}`);
    return i;
  });
  for (let i = 1; i < posicoes.length; i++) {
    assert.ok(
      posicoes[i] > posicoes[i - 1],
      `em main.tsx, ${ordem[i]} precisa ser importado depois de ${ordem[i - 1]}`
    );
  }
});

test("a pasta estilos guarda so o contrato da cascata", () => {
  // estilos/ nao e deposito de CSS do app: e a fundacao. Folha de tela mora ao
  // lado do componente que ela veste. O legado.css saiu desta lista em
  // 2026-07-30, na varredura final da Fase 2: ele foi demolido classe por
  // classe e o arquivo nao existe mais.
  //
  // O canvas.css e a unica folha de tela que continua aqui, e por um motivo
  // concreto: ele veste o canvas de grafo, que o Cockpit e o Mapa compartilham,
  // e ele e quem sobrescreve as variaveis --xy-* do React Flow, importado na
  // camada externo pelo externo.css ao lado.
  const naPastaEstilos = folhas
    .filter((f) => f.rotulo.startsWith("estilos/"))
    .map((f) => f.nome)
    .sort();
  assert.deepEqual(
    naPastaEstilos,
    ["canvas.css", "externo.css", "global.css", "primitivas.css", "visual-hub.css"],
    "folha de tela mora ao lado do componente dela, nao em estilos/"
  );
});

test("nenhuma folha usa token que nao existe", () => {
  // ISTO E BUG DE EXECUCAO, NAO ESTILO, e por isso a trava varre TODA folha,
  // migrada ou nao. Um var(--x) que nao aponta pra lugar nenhum invalida a
  // declaracao inteira em silencio: dentro de um shorthand de background, a
  // area fica sem fundo e nada no console avisa. Foi o que quase aconteceu com
  // --pontos-fundo, --grao e --vidro quando a textura saiu do sistema.
  //
  // A trava tambem e a rede do contrato de nome: token nao some sem o
  // consumidor ir junto. Nome orfao reprova aqui.
  const declarados = new Set<string>();
  for (const folha of folhas) {
    const css = readFileSync(folha.caminho, "utf8");
    for (const m of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) declarados.add(m[1]);
  }

  const orfaos: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*[,)]/g)) {
      if (!declarados.has(m[1])) {
        const linha = css.slice(0, m.index!).split("\n").length;
        orfaos.push(`${folha.rotulo}:${linha} usa ${m[1]}, que ninguem declara`);
      }
    }
  }
  assert.deepEqual(
    [...new Set(orfaos)],
    [],
    `token usado e nunca declarado. Declare no global.css e de valor nos DOIS ` +
      `temas, ou troque o uso pelo token que substituiu ele.`
  );
});

test("primitiva mora em primitivas.css, e nao espalhada pela fundacao", () => {
  // O erro que se repetia: o botao morava partido entre global.css e
  // visual-hub.css, e a metade do tema apagava a metade da base. Componente
  // compartilhado tem um arquivo so.
  const global = semComentario(readFileSync(folhaPorNome("global.css").caminho, "utf8"));
  const primitivas = semComentario(readFileSync(folhaPorNome("primitivas.css").caminho, "utf8"));
  assert.doesNotMatch(global, /\.botao\s*[,{]/, "o botao mora em primitivas.css");
  assert.match(primitivas, /\.botao\s*\{/, "primitivas.css precisa declarar o botao");
});

test("nenhuma folha limita a largura de svg por seletor de elemento", () => {
  // ISTO APAGOU OS DOIS CANVAS DO APP, e sem erro nenhum.
  //
  // O reset de midia trazia "img, svg, video, canvas { max-width: 100% }". O
  // React Flow desenha cada aresta num <svg> sem width, filho de um <div>
  // .react-flow__edges que e position:absolute e tem largura ZERO de proposito:
  // a aresta escapa pelo overflow visible, em coordenadas de canvas. Com svg no
  // seletor, aquele max-width virava 100% de zero, o svg ficava com 0 de
  // largura e NENHUMA aresta era pintada.
  //
  // O sintoma nao ajudava: as arestas existiam no DOM, tinham geometria certa,
  // respondiam ao hit-test e a medicao de estilo dizia stroke visivel. Nem
  // stroke vermelho de 10px aparecia. Levou uma investigacao inteira, e o
  // usuario passou por duas respostas erradas antes desta.
  //
  // Regra: svg cuida do proprio tamanho. Imagem e video seguem contidos.
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const bloco of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const seletores = bloco[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // So o seletor de ELEMENTO nu pega o svg do React Flow. ".icone svg" e
      // legitimo: ali quem escreve conhece a caixa.
      if (!seletores.includes("svg")) continue;
      if (!/max-width|width\s*:/.test(bloco[2])) continue;
      const linha = css.slice(0, bloco.index!).split("\n").length;
      infratores.push(`${folha.rotulo}:${linha} "${bloco[1].trim()}" limita a largura de svg`);
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `svg no seletor de elemento com limite de largura apaga as arestas do ` +
      `React Flow. Tire o svg da lista, ou escopo a regra numa classe.`
  );
});
