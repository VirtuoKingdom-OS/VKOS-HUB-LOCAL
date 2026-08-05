// Trava de contraste da paleta, nos dois temas. Fundacao v2, 2026-07-30.
//
// POR QUE ISTO EXISTE: cor aprovada no olho foi como o botao principal chegou
// a 3,69:1 no rotulo e a borda de campo a 1,55:1. Contraste nao se mede no
// olho, se mede com a formula.
//
// A formula e a do WCAG 2.2: luminancia relativa com o canal linearizado, e
// (L1 + 0,05) / (L2 + 0,05). Ver https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
//
// POR QUE WCAG 2 E NAO APCA: o APCA e mais fiel a percepcao, mas em 2026 ele
// ainda nao e criterio normativo em lugar nenhum e nao tem piso oficial por
// tamanho de texto. A conformidade que se cobra do produto continua sendo a do
// WCAG 2.2, entao e ela que a trava mede.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";

import { folhaPorNome } from "./folhas.js";

const css = readFileSync(folhaPorNome("visual-hub.css").caminho, "utf8");
const pastaEstilos = dirname(folhaPorNome("visual-hub.css").caminho);

const TEMAS = ["claro", "escuro"] as const;

const PALETA_ESPERADA = {
  claro: {
    "--chassi": "#e8e5da", "--fundo": "#f0eee6", "--superficie": "#faf9f5",
    "--superficie-alta": "#dfdbcc", "--superficie-flutuante": "#faf9f5", "--papel": "#ffffff",
    "--carvao": "#151515", "--linha": "#d8d3c4", "--linha-forte": "#7d7768",
    "--texto": "#0a0a0a", "--texto-suave": "#3b3b3b", "--texto-fraco": "#5a5750",
    "--texto-rotulo": "#6e6a60", "--sobre-painel": "#f0eee6", "--apoio-painel": "#a8a49a",
    "--menta-painel": "#7ed9b2", "--menta": "#0f6b4a", "--menta-viva": "#1f8a63",
    "--menta-tenue": "#dcefe4", "--menta-linha": "#0f6b4a", "--sobre-menta": "#f0eee6",
    "--acao": "#0a0a0a", "--acao-hover": "#1f1f1f", "--sobre-acao": "#f0eee6",
    "--alerta": "#9b2c20", "--sobre-alerta": "#f0eee6", "--alerta-tenue": "#f7e3e0",
    "--alerta-linha": "#9b2c20", "--aviso": "#7a5310", "--aviso-tenue": "#f4ebd8",
    "--aviso-linha": "#7a5310", "--neutro-tenue": "#dfdbcc", "--canvas-fundo": "#e8e5da",
    "--pontos-canvas": "#c7c1b0", "--ligacao": "#655f52", "--ligacao-viva": "#0f6b4a",
    "--menta-rgb": "15, 107, 74", "--menta-viva-rgb": "31, 138, 99", "--acao-rgb": "10, 10, 10",
    "--scrim-rgb": "10, 10, 10", "--alerta-rgb": "155, 44, 32", "--aviso-rgb": "122, 83, 16",
    "--fundo-rgb": "240, 238, 230", "--superficie-rgb": "250, 249, 245", "--texto-rgb": "10, 10, 10",
    "--suave-rgb": "59, 59, 59", "--fraco-rgb": "90, 87, 80", "--linha-forte-rgb": "125, 119, 104",
    "--veu": "rgba(var(--scrim-rgb), 0.4)",
  },
  escuro: {
    "--chassi": "#050505", "--fundo": "#0a0a0a", "--superficie": "#171717",
    "--superficie-alta": "#2a2a2a", "--superficie-flutuante": "#1c1c1c", "--papel": "#ffffff",
    "--carvao": "#000000", "--linha": "#2e2e2e", "--linha-forte": "#7b776e",
    "--texto": "#f0eee6", "--texto-suave": "#c9c6bc", "--texto-fraco": "#a5a199",
    "--texto-rotulo": "#8b8781", "--sobre-painel": "#f0eee6", "--apoio-painel": "#a5a199",
    "--menta-painel": "#7ed9b2", "--menta": "#7ed9b2", "--menta-viva": "#7ed9b2",
    "--menta-tenue": "#16302a", "--menta-linha": "#7ed9b2", "--sobre-menta": "#0a0a0a",
    "--acao": "#f0eee6", "--acao-hover": "#ffffff", "--sobre-acao": "#0a0a0a",
    "--alerta": "#ff8f80", "--sobre-alerta": "#2a0d0d", "--alerta-tenue": "#3a1b1b",
    "--alerta-linha": "#ff8f80", "--aviso": "#e8c06a", "--aviso-tenue": "#332a12",
    "--aviso-linha": "#e8c06a", "--neutro-tenue": "#2a2a2a", "--canvas-fundo": "#050505",
    "--pontos-canvas": "#262626", "--ligacao": "#7b776e", "--ligacao-viva": "#7ed9b2",
    "--menta-rgb": "126, 217, 178", "--menta-viva-rgb": "126, 217, 178", "--acao-rgb": "240, 238, 230",
    "--scrim-rgb": "0, 0, 0", "--alerta-rgb": "255, 143, 128", "--aviso-rgb": "232, 192, 106",
    "--fundo-rgb": "10, 10, 10", "--superficie-rgb": "23, 23, 23", "--texto-rgb": "240, 238, 230",
    "--suave-rgb": "201, 198, 188", "--fraco-rgb": "165, 161, 153", "--linha-forte-rgb": "123, 119, 110",
    "--veu": "rgba(0, 0, 0, 0.66)",
  },
} as const;

function tokensDoTema(tema: string): Map<string, string> {
  const marca = `:root[data-theme="${tema}"] {`;
  const inicio = css.indexOf(marca);
  assert.ok(inicio >= 0, `o tema ${tema} precisa existir no visual-hub.css`);
  const fim = css.indexOf("\n}", inicio);
  const bloco = css.slice(inicio, fim);
  const mapa = new Map<string, string>();
  for (const m of bloco.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    mapa.set(m[1], m[2].trim());
  }
  return mapa;
}

function paraRgb(valor: string): [number, number, number] {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(valor);
  assert.ok(hex, `esperava um hex de 6 digitos, achei "${valor}"`);
  const n = Number.parseInt(hex[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminancia(cor: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = paraRgb(cor);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function razao(frente: string, fundo: string): number {
  const a = luminancia(frente);
  const b = luminancia(fundo);
  const [claro, escuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (escuro + 0.05);
}

// OS PARES CRITICOS.
//
// 4,5 vem do criterio 1.4.3 (texto normal). 3 vem do 1.4.11, que vale onde a
// cor E o unico indicador de um controle ou de um grafico com significado.
//
// TODO TEXTO E MEDIDO CONTRA OS QUATRO PLANOS EM QUE ELE PODE CAIR, nao so
// contra um. A falha classica do sistema anterior foi aprovar --texto-fraco
// sobre --superficie e esquecer que a mesma linha, no hover, vira
// --superficie-alta e perde meio ponto de razao.
const PLANOS = ["--chassi", "--fundo", "--superficie", "--superficie-alta"];

const PARES: { frente: string; fundo: string; minimo: number; oque: string }[] = [
  ...PLANOS.map((p) => ({ frente: "--texto", fundo: p, minimo: 4.5, oque: "conteudo" })),
  ...PLANOS.map((p) => ({ frente: "--texto-suave", fundo: p, minimo: 4.5, oque: "descricao" })),
  ...PLANOS.map((p) => ({ frente: "--texto-fraco", fundo: p, minimo: 4.5, oque: "metadado" })),
  { frente: "--texto", fundo: "--superficie-flutuante", minimo: 4.5, oque: "texto em popover" },
  { frente: "--texto-suave", fundo: "--superficie-flutuante", minimo: 4.5, oque: "descricao em popover" },

  // O rotulo de grupo e o UNICO texto autorizado abaixo de 4,5:1. Ele vive no
  // patamar de contorno (3:1), porque e etiqueta redundante de gaveta: quem
  // nao a le continua lendo os proprios itens do menu. Nenhum outro token de
  // texto pode citar este par como precedente.
  { frente: "--texto-rotulo", fundo: "--chassi", minimo: 3, oque: "rotulo de grupo na barra" },
  { frente: "--texto-rotulo", fundo: "--superficie", minimo: 3, oque: "rotulo de grupo em painel" },

  // Menta como TEXTO usa o corte legivel, nos tres planos onde ela aparece.
  { frente: "--menta", fundo: "--fundo", minimo: 4.5, oque: "menta sobre o trabalho" },
  { frente: "--menta", fundo: "--chassi", minimo: 4.5, oque: "menta sobre a moldura" },
  { frente: "--menta", fundo: "--superficie", minimo: 4.5, oque: "menta em painel" },
  { frente: "--menta", fundo: "--superficie-alta", minimo: 4.5, oque: "menta em linha selecionada" },
  // Selo preenchido tem fundo PROPRIO: medir a tinta contra a superficie do
  // painel daria um numero que ninguem enxerga na tela.
  { frente: "--menta", fundo: "--menta-tenue", minimo: 4.5, oque: "selo vivo" },
  { frente: "--sobre-menta", fundo: "--menta", minimo: 4.5, oque: "rotulo sobre menta cheio" },
  { frente: "--menta-linha", fundo: "--superficie", minimo: 3, oque: "contorno de campo em foco" },

  // --menta-viva e GRAFICO, nunca texto: ponto de sessao rodando, barra de
  // progresso, contorno de conexao ligada. Piso de 3:1 pelo 1.4.11, contra os
  // dois planos onde ele aparece. E este par que obriga o Claro a NAO usar o
  // #2fd4a7 da marca, que ali da 1,7:1.
  { frente: "--menta-viva", fundo: "--chassi", minimo: 3, oque: "ponto de sessao viva na barra" },
  { frente: "--menta-viva", fundo: "--fundo", minimo: 3, oque: "sinal vivo sobre o trabalho" },
  { frente: "--menta-viva", fundo: "--superficie-alta", minimo: 3, oque: "barra de progresso" },

  // A acao principal: o rotulo dela e o texto mais importante da tela, e o
  // preenchimento precisa se destacar do plano onde o botao se apoia.
  { frente: "--sobre-acao", fundo: "--acao", minimo: 4.5, oque: "rotulo do botao principal" },
  { frente: "--sobre-acao", fundo: "--acao-hover", minimo: 4.5, oque: "rotulo do botao principal no hover" },
  { frente: "--acao", fundo: "--superficie", minimo: 3, oque: "botao principal contra o painel" },
  { frente: "--acao", fundo: "--fundo", minimo: 3, oque: "botao principal contra o trabalho" },
  // O marcador de aba ativa e de linha aberta e desenhado em --acao. Ele e o
  // unico indicador de qual aba esta aberta, entao vale o 1.4.11.
  { frente: "--acao", fundo: "--superficie-alta", minimo: 3, oque: "marcador de aba e de linha ativa" },

  // Semantica. O botao de excluir e onde ler errado apaga alguma coisa.
  { frente: "--sobre-alerta", fundo: "--alerta", minimo: 4.5, oque: "rotulo do botao de excluir" },
  { frente: "--alerta", fundo: "--superficie", minimo: 4.5, oque: "texto de erro" },
  { frente: "--alerta", fundo: "--fundo", minimo: 4.5, oque: "texto de erro sobre o trabalho" },
  { frente: "--alerta", fundo: "--alerta-tenue", minimo: 4.5, oque: "faixa e selo de erro" },
  { frente: "--aviso", fundo: "--superficie", minimo: 4.5, oque: "texto de aviso" },
  { frente: "--aviso", fundo: "--fundo", minimo: 4.5, oque: "texto de aviso sobre o trabalho" },
  { frente: "--aviso", fundo: "--superficie-alta", minimo: 4.5, oque: "texto de aviso em linha selecionada" },
  { frente: "--aviso", fundo: "--aviso-tenue", minimo: 4.5, oque: "faixa e selo de aviso" },
  { frente: "--texto-suave", fundo: "--neutro-tenue", minimo: 4.5, oque: "selo neutro e contagem" },

  // O contorno de controle, contra TODO plano em que ele se apoia. Campo,
  // botao neutro, caixa de selecao e trilho de interruptor usam este token.
  ...PLANOS.map((p) => ({ frente: "--linha-forte", fundo: p, minimo: 3, oque: "contorno de controle" })),

  // O canvas de grafo. A aresta carrega significado (qual sessao alimenta
  // qual), entao ela e "graphical object" pelo 1.4.11 e deve 3:1. O contorno
  // do no tambem: no canvas nao existe sombra, e e o fio que separa o no do
  // plano. A GRADE DE PONTOS NAO ENTRA nesta lista de proposito: ela e
  // referencia espacial e nao carrega informacao, e ela fica de proposito
  // entre 1,3:1 e 1,4:1, que e onde React Flow, tldraw e n8n a colocam.
  { frente: "--ligacao", fundo: "--canvas-fundo", minimo: 3, oque: "aresta em repouso" },
  { frente: "--ligacao-viva", fundo: "--canvas-fundo", minimo: 3, oque: "aresta sendo arrastada" },
  { frente: "--linha-forte", fundo: "--canvas-fundo", minimo: 3, oque: "contorno do no de grafo" },
  { frente: "--texto", fundo: "--canvas-fundo", minimo: 4.5, oque: "rotulo solto sobre o canvas" },

  // O carvao e uma ilha escura nos dois temas. Os tres papeis dele nao giram
  // com a pagina e precisam permanecer legiveis no terminal e no rodape.
  { frente: "--sobre-painel", fundo: "--carvao", minimo: 4.5, oque: "texto sobre o carvao" },
  { frente: "--apoio-painel", fundo: "--carvao", minimo: 4.5, oque: "apoio sobre o carvao" },
  { frente: "--menta-painel", fundo: "--carvao", minimo: 4.5, oque: "menta da marca sobre o carvao" },
];

test("a paleta identidade v3 usa os valores calibrados nos dois temas", () => {
  for (const tema of TEMAS) {
    const tokens = tokensDoTema(tema);
    for (const [token, valor] of Object.entries(PALETA_ESPERADA[tema])) {
      assert.equal(tokens.get(token), valor, `${token} esta fora do contrato no tema ${tema}`);
    }
  }
});

test("o escuro e o padrao em todas as reservas fora da folha de tema", () => {
  const index = readFileSync(join(pastaEstilos, "..", "..", "index.html"), "utf8");
  const sidebar = readFileSync(join(pastaEstilos, "..", "componentes", "layout", "Sidebar.tsx"), "utf8");
  const temaEditor = readFileSync(join(pastaEstilos, "..", "componentes", "editor", "tema.ts"), "utf8");
  const motor = readFileSync(join(pastaEstilos, "..", "componentes", "editor", "motor.ts"), "utf8");
  const studio = readFileSync(join(pastaEstilos, "..", "componentes", "studio", "TelaStudio.tsx"), "utf8");

  assert.match(css, /:root\[data-theme="claro"\]\s*\{/);
  assert.match(css, /:root,\s*:root\[data-theme="escuro"\]\s*\{/);
  assert.match(index, /content="dark light"/);
  assert.match(index, /var tema = "escuro"/);
  assert.ok(sidebar.indexOf('{ id: "escuro"') < sidebar.indexOf('{ id: "claro"'));
  assert.match(sidebar, /return t === "claro" \? "claro" : "escuro"/);
  assert.match(temaEditor, /MENTA_PADRAO = "#7ed9b2"/);
  assert.match(motor, /canaisRgb\(menta\) \|\| "126, 217, 178"/);
  assert.match(studio, /corDoTema\("--fundo", "#0a0a0a"\)/);
});

for (const tema of TEMAS) {
  test(`contraste do tema ${tema}: os ${PARES.length} pares criticos passam`, () => {
    const tokens = tokensDoTema(tema);
    const falhas: string[] = [];
    for (const par of PARES) {
      const frente = tokens.get(par.frente);
      const fundo = tokens.get(par.fundo);
      assert.ok(frente, `${par.frente} precisa ter valor no tema ${tema}`);
      assert.ok(fundo, `${par.fundo} precisa ter valor no tema ${tema}`);
      const r = razao(frente, fundo);
      if (r < par.minimo) {
        falhas.push(
          `${par.frente} sobre ${par.fundo} deu ${r.toFixed(2)}:1, ` +
            `precisa de ${par.minimo}:1 (${par.oque})`
        );
      }
    }
    assert.deepEqual(falhas, [], `\n  ${falhas.join("\n  ")}\n`);
  });
}

test("a borda de controle e a de decoracao nao podem ter a mesma cor", () => {
  // Se as duas apontarem pro mesmo valor, alguem juntou os dois trabalhos de
  // novo e o campo volta a 1,55:1.
  for (const tema of TEMAS) {
    const tokens = tokensDoTema(tema);
    assert.notEqual(
      tokens.get("--linha"),
      tokens.get("--linha-forte"),
      `no tema ${tema} a --linha e a --linha-forte ficaram iguais`
    );
  }
});

test("a escada de superficie tem quatro degraus distintos e na ordem certa", () => {
  // A profundidade do Hub vem daqui, nao de sombra. Se dois degraus tiverem o
  // mesmo valor, um painel para de se destacar do plano em que ele se apoia e
  // a unica saida vira sombra, que e o que este sistema nao usa.
  for (const tema of TEMAS) {
    const tokens = tokensDoTema(tema);
    const escada = ["--chassi", "--fundo", "--superficie", "--superficie-alta"];
    const valores = escada.map((t) => tokens.get(t)!);
    assert.equal(
      new Set(valores).size,
      escada.length,
      `no tema ${tema} dois degraus da escada de superficie sao a mesma cor: ${valores.join(", ")}`
    );
    // O chassi e sempre o degrau mais recuado: mais escuro que o trabalho no
    // Claro, mais escuro ainda no Escuro. Nos dois casos ele e o mais escuro.
    const luzes = escada.map((t) => luminancia(tokens.get(t)!));
    assert.ok(
      luzes[0] < luzes[1],
      `no tema ${tema} o --chassi precisa ser mais recuado que o --fundo`
    );
  }
});

test("os dois temas declaram exatamente o mesmo conjunto de tokens", () => {
  // Token que existe num tema so cai no valor do :root do global.css, que e o
  // valor do Claro. Num tema escuro, isso e uma cor clara aparecendo do nada,
  // e a falha e silenciosa: nada quebra, so fica errado.
  const [a, b] = TEMAS.map((t) => [...tokensDoTema(t).keys()].sort());
  const soNoClaro = a.filter((t) => !b.includes(t) && t !== "color-scheme");
  const soNoEscuro = b.filter((t) => !a.includes(t) && t !== "color-scheme");
  assert.deepEqual(soNoClaro, [], "tokens declarados so no tema Claro");
  assert.deepEqual(soNoEscuro, [], "tokens declarados so no tema Escuro");
});
