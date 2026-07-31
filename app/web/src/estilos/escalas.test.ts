// Trava das ESCALAS. Fundacao v2, 2026-07-30.
//
// O que este teste protege: espaco, altura de controle, tipografia, peso,
// raio, movimento, empilhamento, elevacao e opacidade sao escalas fechadas,
// declaradas uma vez na camada base. Antes de existirem, o app tinha 24
// tamanhos de fonte, 42 espacamentos, 117 sombras e 41 duracoes. Nao eram
// escalas, eram decisoes independentes que ninguem mantem coerentes a mao.
//
// As travas que varrem folha usam folhasMigradas(): a folha que ainda nao
// migrou pra fundacao v2 esta listada em PENDENTES, em folhas.ts, e sai de la
// quando a tela dela migrar. Ver docs/planos/redesign-v2/01-pendencias-por-tela.md.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { folhasMigradas, listarArquivos } from "./folhas.js";

const pasta = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(join(pasta, "global.css"), "utf8");
const tema = readFileSync(join(pasta, "visual-hub.css"), "utf8");

function declaracao(css: string, token: string) {
  return css.match(new RegExp(`^\\s*${token}\\s*:\\s*([^;]+);`, "m"))?.[1].trim();
}

const ESPACAMENTO = ["--esp-2", "--esp-4", "--esp-8", "--esp-12", "--esp-16", "--esp-24", "--esp-32", "--esp-48"];
const ALTURA = ["--alt-p", "--alt", "--alt-g"];
const TIPOGRAFIA = ["--txt-micro", "--txt-legenda", "--txt-corpo", "--txt-leitura", "--txt-titulo-p", "--txt-titulo", "--txt-display"];
const RAIO = ["--raio-p", "--raio", "--raio-g", "--raio-gg", "--raio-pilula"];
const MOVIMENTO = ["--mov-rapido", "--mov-padrao", "--mov-lento", "--curva", "--curva-simetrica", "--curva-saida"];
const EMPILHAMENTO = ["--z-base", "--z-fixo", "--z-popover", "--z-camada", "--z-veu", "--z-modal", "--z-aviso"];
const ELEVACAO = ["--sombra-popover", "--sombra-modal", "--sombra-arrasto"];
const PESO = ["--peso-normal", "--peso-medio", "--peso-forte", "--peso-pesado"];
const OPACIDADE = ["--op-plena", "--op-secundaria", "--op-fraca", "--op-apagada", "--op-fantasma"];

test("as escalas existem todas na camada base", () => {
  const todos = [
    ...ESPACAMENTO, ...ALTURA, ...TIPOGRAFIA, ...RAIO, ...MOVIMENTO,
    ...EMPILHAMENTO, ...ELEVACAO, ...PESO, ...OPACIDADE,
  ];
  for (const token of todos) {
    assert.ok(declaracao(base, token), `${token} precisa existir no global.css`);
  }
  // Cada degrau de tipografia vem com entrelinha e tracking proprios. Meio
  // degrau (tamanho sem entrelinha) obriga quem usa a inventar o resto.
  for (const token of TIPOGRAFIA) {
    const nome = token.replace("--txt-", "");
    assert.ok(declaracao(base, `--lh-${nome}`), `--lh-${nome} precisa existir`);
    assert.ok(declaracao(base, `--tr-${nome}`), `--tr-${nome} precisa existir`);
  }
});

test("espacamento e altura de controle derivam de --base", () => {
  // A densidade da interface inteira tem que ser ajustavel num valor so.
  // Medida fixa em componente mata isso em silencio.
  assert.equal(declaracao(base, "--base"), "4px");
  for (const token of [...ESPACAMENTO, ...ALTURA]) {
    const valor = declaracao(base, token)!;
    assert.match(
      valor,
      /var\(--base\)/,
      `${token} vale "${valor}". Trocar --base tem que folgar ou apertar a ` +
        `interface inteira sem tocar em componente nenhum.`
    );
  }
});

test("o menor alvo clicavel do sistema passa no criterio 2.5.8 do WCAG 2.2", () => {
  // --alt-p e a altura do menor controle que existe: acao dentro de linha de
  // lista, botao de barra de ferramenta, chip. O criterio pede 24x24 CSS px.
  const p = declaracao(base, "--alt-p")!;
  const fator = Number(p.match(/\*\s*([\d.]+)\s*\)/)![1]);
  const pixels = 4 * fator;
  assert.ok(pixels >= 24, `--alt-p da ${pixels}px, e o minimo do WCAG 2.2 e 24px`);
});

test("controle dentro do canvas desfaz o zoom, senao o alvo encolhe junto", () => {
  // O EdgeLabelRenderer do React Flow entrega o rotulo DENTRO do viewport
  // transformado: o que se declara ali em px sofre a escala do canvas. Um
  // botao de 24px medido a 70% de zoom da 17px, e a 30% daria 7px, contra os
  // 24 que o criterio 2.5.8 pede. E o inverso do que a folha diz, e nenhuma
  // trava de CSS pega, porque a folha esta certa: quem encolhe e o pai.
  //
  // A regra: quem monta rotulo de aresta le o zoom do canvas (transform[2]) e
  // divide por ele no proprio transform. Bug real, conferido no navegador em
  // 2026-07-31. Ver docs/decisoes/2026-07-31-o-gesto-de-desconectar.md.
  // A trava cobre o rotulo que e ALVO, nao todo rotulo. Texto de anotacao pode
  // acompanhar a escala do grafo, e no Mapa ele acompanha de proposito: o
  // rotulo das ligacoes e legenda do desenho, sem clique, e some junto quando
  // a pessoa se afasta pra ver a topologia. Alvo e outra coisa: ele responde
  // ao dedo e ao ponteiro, e por isso mede em pixel de TELA sempre.
  const fontes = listarArquivos(".tsx").filter((f) => {
    const codigo = readFileSync(f.caminho, "utf8");
    const blocos = codigo.match(
      /<EdgeLabelRenderer>[\s\S]*?<\/EdgeLabelRenderer>/g
    );
    return (blocos ?? []).some((b) => b.includes("<button") || b.includes("onClick"));
  });
  assert.ok(fontes.length > 0, "nenhum alvo em rotulo de aresta: a trava perdeu o alvo");
  for (const fonte of fontes) {
    const codigo = readFileSync(fonte.caminho, "utf8");
    assert.match(
      codigo,
      /transform\[2\]/,
      `${fonte.rotulo} monta rotulo de aresta sem ler o zoom do canvas (transform[2])`
    );
    assert.match(
      codigo,
      /scale\(\$\{[^}]*\/\s*zoom[^}]*\}\)/,
      `${fonte.rotulo} nao divide pelo zoom no transform: o alvo vai encolher com o canvas`
    );
  }
});

test("a entrelinha e px absoluto e par, nunca numero relativo", () => {
  // Numero relativo arredonda diferente em cada tamanho e a grade de 4px
  // deixa de fechar: duas colunas com o mesmo conteudo saem desalinhadas.
  for (const token of TIPOGRAFIA) {
    const lh = declaracao(base, token.replace("--txt-", "--lh-"))!;
    assert.match(lh, /^\d+px$/, `a entrelinha de ${token} tem que ser px absoluto, achei "${lh}"`);
    assert.equal(Number.parseInt(lh, 10) % 2, 0, `a entrelinha de ${token} tem que ser par, achei "${lh}"`);
  }
});

test("a escala de tipografia e crescente e o corpo padrao e 14px", () => {
  const px = TIPOGRAFIA.map((t) => Number.parseInt(declaracao(base, t)!, 10));
  for (let i = 1; i < px.length; i++) {
    assert.ok(px[i] > px[i - 1], `a escala nao e crescente: ${TIPOGRAFIA[i]} nao passa de ${TIPOGRAFIA[i - 1]}`);
  }
  // O padrao do app e 14px, nao 13. Quem usa o Hub nao e desenvolvedor e fica
  // horas aqui. A densidade vem da altura de controle, nunca da letra menor.
  assert.equal(declaracao(base, "--txt-corpo"), "14px");
  assert.match(
    base,
    /body\s*\{[^}]*font-size:\s*var\(--txt-corpo\)/,
    "o body precisa herdar o degrau de corpo da escala"
  );
});

test("sao quatro pesos e so quatro, sem intermediario de fonte variavel", () => {
  assert.deepEqual(
    PESO.map((t) => declaracao(base, t)),
    ["400", "500", "600", "700"]
  );
});

test("nenhuma duracao passa de 280ms", () => {
  // Acima disso a pessoa espera a interface em vez de usar ela.
  for (const token of ["--mov-rapido", "--mov-padrao", "--mov-lento"]) {
    const ms = Number.parseInt(declaracao(base, token)!, 10);
    assert.ok(ms <= 280, `${token} vale ${ms}ms. O teto do Hub e 280ms.`);
  }
});

test("a camada de tema nao redeclara escala, so cor", () => {
  // A camada tema vence a tela por ORDEM DE CAMADA, nao por especificidade.
  // Uma altura de botao declarada la apaga em silencio o tamanho pequeno do
  // design system inteiro, e nenhuma folha de tela consegue trazer de volta.
  const escalas = [
    ...ESPACAMENTO, ...ALTURA, ...TIPOGRAFIA, ...RAIO, ...MOVIMENTO,
    ...PESO, ...OPACIDADE, ...EMPILHAMENTO, ...ELEVACAO,
  ];
  for (const token of escalas) {
    assert.equal(
      declaracao(tema, token),
      undefined,
      `${token} e escala, nao cor. Ele nao pode ser redeclarado no visual-hub.css.`
    );
  }
});

// Apaga um trecho preservando o tamanho, pro indice de cada achado continuar
// apontando pra linha certa do arquivo original.
function apagar(css: string, padrao: RegExp): string {
  return css.replace(padrao, (t) => t.replace(/[^\n]/g, " "));
}
const semComentario = (css: string) => apagar(css, /\/\*[\s\S]*?\*\//g);
const semKeyframes = (css: string) =>
  apagar(css, /@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g);
const linhaDe = (css: string, i: number) => css.slice(0, i).split("\n").length;

test("nenhuma folha escreve fonte abaixo do piso da escala", () => {
  // O piso nao e gosto. Abaixo de 11px, o rotulo em caixa alta com tracking,
  // que e o uso quase unico desse tamanho, para de ser legivel em notebook.
  const piso = Number.parseInt(declaracao(base, "--txt-micro")!, 10);
  assert.equal(piso, 11);

  const infratores: string[] = [];
  for (const folha of folhasMigradas()) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const achado of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      if (Number(achado[1]) < piso) {
        infratores.push(`${folha.rotulo}:${linhaDe(css, achado.index!)} font-size: ${achado[1]}px`);
      }
    }
  }
  assert.deepEqual(infratores, [], `fonte abaixo do piso de ${piso}px. Use um degrau da escala.`);
});

test("nenhuma folha escreve opacidade fora da escala", () => {
  // Opacidade e um dos canais que a pessoa usa pra ranquear o que importa, e
  // vinte e seis niveis nao se distinguem: o que deveria ser hierarquia vira
  // ruido, e a tela parece carregada sem que se consiga apontar o culpado.
  // Livre: 0 e 1 (ligado e desligado) e qualquer valor dentro de @keyframes,
  // que e trajetoria de animacao e nao hierarquia.
  const infratores: string[] = [];
  for (const folha of folhasMigradas()) {
    const css = semKeyframes(semComentario(readFileSync(folha.caminho, "utf8")));
    for (const achado of css.matchAll(/(?<!-)opacity:\s*([0-9.]+)\s*[;}]/g)) {
      const valor = Number(achado[1]);
      if (valor !== 0 && valor !== 1) {
        infratores.push(`${folha.rotulo}:${linhaDe(css, achado.index!)} opacity: ${achado[1]}`);
      }
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `opacidade fora da escala. Use var(--op-secundaria), var(--op-fraca), ` +
      `var(--op-apagada) ou var(--op-fantasma). Se o valor e cor e nao ` +
      `hierarquia, o certo e rgba() com o canal do token.`
  );
});

test("opacidade nao pisa em texto, senao ela fura a trava de contraste", () => {
  // O buraco que este teste tapa: contraste.test.ts mede TOKEN contra TOKEN.
  // Ele nao ve o que a opacidade faz depois, na composicao com o fundo. Um
  // --texto-fraco aprovado em 5,58:1 vira 2,1:1 sob opacity 0.5, e os dois
  // testes continuam verdes enquanto o rotulo some da tela.
  //
  // Isenta um bloco: icone (nome com svg, icone ou seta) ou caixa grafica
  // (largura E altura fixas declaradas). Icone decorativo pode ser atenuado a
  // vontade, porque vem sempre acompanhado do texto que diz a mesma coisa.
  const infratores: string[] = [];
  for (const folha of folhasMigradas()) {
    const css = semKeyframes(semComentario(readFileSync(folha.caminho, "utf8")));
    for (const bloco of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const seletor = bloco[1].trim();
      const corpo = bloco[2];
      if (/\bsvg\b|icone|icon\b|seta/i.test(seletor)) continue;
      if (/(^|[;{\s])width:\s*\d/.test(corpo) && /(^|[;{\s])height:\s*\d/.test(corpo)) continue;

      const temTexto = /color:\s*var\(--texto[a-z-]*\)/.test(corpo);
      const opacidade = corpo.match(/(?<!-)opacity:\s*var\(--op-([a-z]+)\)/);
      if (temTexto && opacidade && opacidade[1] !== "plena") {
        infratores.push(
          `${folha.rotulo}: "${seletor.split("\n").pop()!.trim()}" tem cor de ` +
            `texto junto de opacity: var(--op-${opacidade[1]})`
        );
      }
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `opacidade sobre cor de texto derruba o contraste sem a trava de cor ` +
      `perceber. Use peso, tracking ou um token de cor mais fraco.`
  );
});
