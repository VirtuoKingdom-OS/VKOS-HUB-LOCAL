// Trava das regras de DENSIDADE E DE DISCIPLINA VISUAL. Fundacao v2, 2026-07-30.
//
// POR QUE ESTE ARQUIVO EXISTE, e por que ele e o mais importante do sistema.
//
// O diagnostico que abriu o redesign v2 foi "os mesmos erros se repetindo".
// Regra escrita em documento nao para erro que se repete: a varredura de
// 2026-07-27 achou 66 sombras cruas, 203 pesos 700, 36 caixas altas e 11
// tracejados DEPOIS de as quatro regras ja estarem escritas no CLAUDE.md.
// Sete agentes limparam tela por tela, e a limpeza durou o que durou.
//
// Erro que se repete so morre com trava executavel. E a trava tem que dizer
// ARQUIVO, LINHA, SELETOR e VALOR, porque quem ler isto daqui a tres meses nao
// tem o contexto de hoje.
//
// A LICAO QUE MOLDA O FORMATO: heuristica por nome de classe falha em
// silencio. Aqui nao existe adivinhacao: toda excecao e LISTA BRANCA nomeada,
// com o seletor exato e um comentario dizendo por que ela existe. Se um caso
// legitimo novo aparecer, o teste reprova pedindo pra ser nomeado, e nomear e
// barato.
//
// As travas varrem folhasMigradas(). A folha que ainda nao migrou pra fundacao
// v2 esta em PENDENTES, em folhas.ts, e sai de la quando a tela migrar.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { folhasMigradas } from "./folhas.js";

const pasta = dirname(fileURLToPath(import.meta.url));

// ===========================================================================
// AS LISTAS BRANCAS. Cada linha e um seletor exato e um motivo.
// ===========================================================================

// Os cinco tokens de profundidade do sistema. Sombra existe onde o elemento
// FLUTUA de verdade sobre outro conteudo, e a regua e: flutua o que fica
// parado enquanto o conteudo atras se move. No de grafo acompanha o pan e o
// zoom, entao e conteudo, nao flutua, e nao tem sombra.
const SOMBRAS_AUTORIZADAS = [
  "--sombra-popover", "--sombra-modal", "--sombra-arrasto", "--anel", "--anel-foco",
];

// O glow tambem se escreve em box-shadow, mas ele marca ESTADO, nunca
// profundidade. Sao quatro e so quatro: sessao viva, foco de teclado, acao
// principal da tela e foco de campo invalido.
const GLOWS_AUTORIZADOS = ["--glow-vivo", "--glow-foco", "--glow-acao", "--glow-alerta"];

// CAIXA ALTA: autorizada em UM lugar so, o rotulo que agrupa itens de
// navegacao (CORE, GESTAO, CONTEUDO). Em qualquer outro lugar, caixa alta
// vira frase normal: rotulo de campo, titulo de secao, nome de coluna e
// etiqueta de dado se escrevem como se escreve. Caixa alta adensa a mancha e
// grita; com seis rotulos assim na mesma tela, o olho nao acha o que importa
// porque tudo tem o mesmo volume.
const CAIXA_ALTA_AUTORIZADA = [".rotulo-grupo"];

// PESO 700: so numero e wordmark. Titulo pesa 500, titulo de cartao e nome
// pesam 600, texto corrido nunca passa de 500. Enfase de DADO nao e titulo, e
// e so isso que este peso serve pra dizer.
const PESO_700_AUTORIZADO = [
  // Contagem numerica ao lado de um rotulo de navegacao ou de aba.
  ".contagem",
  // O WORDMARK. "VKOS HUB" na barra lateral, no onboarding e nas duas telas de
  // abertura. Ele nao e titulo: e a assinatura do produto, e ela aparece uma
  // vez por tela, sempre no mesmo canto. Nomeado aqui em 2026-07-30, quando o
  // legado.css foi demolido e a marca ganhou folha propria em
  // componentes/comum/comum.css.
  ".marca-logo",
];

// TRACEJADO: so onde ele significa "solte o arquivo nesta area", ou seja,
// DURANTE um arraste. Estado vazio nao usa tracejado: estado vazio e conteudo
// legitimo, e tracejado le como area de soltar arquivo ou placeholder de obra.
const TRACEJADO_AUTORIZADO: string[] = [
  // A area de soltar imagem dos wizards de criacao, e SO durante o arraste. Em
  // repouso ela tem fio solido de controle, como qualquer alvo clicavel; o
  // tracejado entra no instante em que um arquivo passa por cima, que e o
  // unico lugar do sistema onde ele significa alguma coisa.
  ".criacao-soltar.arrastando",
  // A area de soltar o .md do Cerebro, no cartao de boas-vindas do cockpit.
  // Mesma regra: fio solido de controle em repouso, tracejado so no instante
  // do arraste.
  ".bv-soltar.arrastando",
];

// COR CRUA: os dois unicos arquivos onde um valor de cor literal pode
// aparecer. Fora deles, cor so por token, sem excecao. Foi assim que um verde
// #00c896 que nao era mais o menta do app sobreviveu tres versoes no editor.
const FOLHAS_COM_COR_LITERAL = ["global.css", "visual-hub.css"];

// ===========================================================================
// A LEITURA DO CSS
// ===========================================================================

// Apaga um trecho preservando o tamanho, pro indice de cada achado continuar
// apontando pra linha certa do arquivo original.
function apagar(css: string, padrao: RegExp): string {
  return css.replace(padrao, (trecho) => trecho.replace(/[^\n]/g, " "));
}

// Comentario nao e regra: um exemplo de codigo errado dentro de um comentario
// explicando por que ele e errado nao pode reprovar o teste.
const semComentario = (css: string) => apagar(css, /\/\*[\s\S]*?\*\//g);

// Dentro de @keyframes, box-shadow e opacidade sao trajetoria de animacao,
// nao profundidade nem hierarquia.
const semKeyframes = (css: string) =>
  apagar(css, /@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g);

const linhaDe = (css: string, indice: number) => css.slice(0, indice).split("\n").length;

interface Regra {
  seletor: string;
  corpo: string;
  indice: number;
}

// Cada bloco "seletor { corpo }" da folha. Bloco dentro de @media entra
// normalmente: o motor encontra o de dentro primeiro e o seletor sai limpo.
function regras(css: string): Regra[] {
  const achadas: Regra[] = [];
  for (const bloco of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    achadas.push({
      seletor: bloco[1].trim().replace(/\s*\n\s*/g, " "),
      corpo: bloco[2],
      indice: bloco.index! + bloco[1].length,
    });
  }
  return achadas;
}

// O seletor de um bloco pode listar varios (".a, .b { }"). O bloco so esta
// autorizado quando TODOS os seletores estao na lista: basta um fora pra a
// excecao nao valer, senao juntar um autorizado com um qualquer viraria a
// porta dos fundos.
function todosAutorizados(seletor: string, lista: string[]): boolean {
  const partes = seletor.split(",").map((p) => p.trim()).filter(Boolean);
  if (partes.length === 0) return false;
  return partes.every((parte) => lista.includes(parte));
}

// Quebra o valor de um box-shadow nas virgulas de TOPO, ignorando as de dentro
// de rgba() e de var(). Sem isto, "rgba(0, 0, 0, .2)" viraria quatro sombras.
function sombras(valor: string): string[] {
  const partes: string[] = [];
  let atual = "";
  let profundidade = 0;
  for (const c of valor) {
    if (c === "(") profundidade++;
    else if (c === ")") profundidade--;
    if (c === "," && profundidade === 0) {
      partes.push(atual.trim());
      atual = "";
    } else {
      atual += c;
    }
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes;
}

const folhas = folhasMigradas();

// ===========================================================================
// AS TRAVAS
// ===========================================================================

test("nenhuma folha declara sombra fora dos tokens autorizados", () => {
  // A profundidade vem da escada de superficie mais o fio de --linha. Cartao
  // parado no fluxo nao tem sombra, item de lista nao tem sombra, cabecalho
  // nao tem sombra, no de canvas nao tem sombra. Se o elemento precisa se
  // destacar, ele sobe um degrau de superficie e ganha um fio.
  //
  // UMA EXCECAO: "inset" e FIO, nao profundidade. E uma borda que nao ocupa
  // caixa, e ela existe justamente porque a borda de verdade entraria no
  // calculo do tamanho e o elemento pularia 1px ao mudar de estado.
  //
  // Anel externo de 0px de desfoque NAO entra: "0 0 0 1px" somado a uma border
  // e so uma borda de 2px escrita em duas propriedades.
  const autorizados = [...SOMBRAS_AUTORIZADAS, ...GLOWS_AUTORIZADOS];
  const infratores: string[] = [];

  for (const folha of folhas) {
    const css = semKeyframes(semComentario(readFileSync(folha.caminho, "utf8")));
    for (const regra of regras(css)) {
      for (const achado of regra.corpo.matchAll(/(?<!-)box-shadow:\s*([^;}]+)/g)) {
        const valor = achado[1].trim();
        if (valor === "none") continue;
        for (const sombra of sombras(valor)) {
          if (sombra.startsWith("inset")) continue;
          const token = sombra.match(/^var\(\s*(--[a-z-]+)\s*\)$/)?.[1];
          if (token && autorizados.includes(token)) continue;
          infratores.push(
            `${folha.rotulo}:${linhaDe(css, regra.indice + achado.index!)} ` +
              `"${regra.seletor}" -> box-shadow: ${sombra}`
          );
        }
      }
    }
  }

  assert.deepEqual(
    infratores,
    [],
    `sombra fora dos tokens. Se o elemento FLUTUA sobre outro conteudo, use ` +
      `var(--sombra-popover), var(--sombra-modal) ou var(--sombra-arrasto). Se ` +
      `nao flutua, tire a sombra: a separacao vem de um degrau de --superficie ` +
      `mais o fio de --linha. Se e estado, o token e var(--glow-vivo), ` +
      `var(--glow-foco) ou var(--glow-acao).`
  );
});

test("nao existe token de sombra alem dos tres", () => {
  // Enquanto --sombra-suave, --sombra-media e --sombra-forte existiram, todo
  // componente novo pegava o token errado pelo autocompletar e nenhum teste
  // reclamava. Eram, inclusive, os mais faceis de achar: vinham antes na
  // ordem alfabetica.
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const achado of css.matchAll(/^\s*(--sombra-[a-z-]+)\s*:/gm)) {
      if (!SOMBRAS_AUTORIZADAS.includes(achado[1])) {
        infratores.push(`${folha.rotulo}:${linhaDe(css, achado.index!)} declara ${achado[1]}`);
      }
    }
  }
  assert.deepEqual(infratores, [], `token de sombra fora dos tres autorizados.`);
});

test("anel e border nunca se somam no mesmo elemento", () => {
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semKeyframes(semComentario(readFileSync(folha.caminho, "utf8")));
    for (const regra of regras(css)) {
      const temAnel = /box-shadow:[^;}]*var\(\s*--anel(?:-foco)?\s*\)/.test(regra.corpo);
      const temBorda = /(?<!-)border(?:-[a-z]+)?:\s*(?!0\b|none\b)/.test(regra.corpo);
      if (temAnel && temBorda) {
        infratores.push(`${folha.rotulo}:${linhaDe(css, regra.indice)} "${regra.seletor}"`);
      }
    }
  }
  assert.deepEqual(infratores, [], "anel e border somados viram uma borda de 2px");
});

test("titulo nunca passa do peso 400", () => {
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const regra of regras(css)) {
      if (!/(^|[\s.#>+~,:-])(h[1-3]|titulo)(?=$|[\s.#>+~,:-])/i.test(regra.seletor)) continue;
      for (const achado of regra.corpo.matchAll(
        /font-weight:\s*(500|600|700|[5-9]00|var\(\s*--peso-(?:medio|forte|pesado)\s*\))/g
      )) {
        infratores.push(
          `${folha.rotulo}:${linhaDe(css, regra.indice + achado.index!)} ` +
            `"${regra.seletor}" -> font-weight: ${achado[1]}`
        );
      }
    }
  }
  assert.deepEqual(infratores, [], "titulo usa var(--peso-normal), nunca negrito");
});

test("textura e carvao ficam nas superficies contratadas", () => {
  const lerComponente = (...partes: string[]) =>
    readFileSync(join(pasta, "..", "componentes", ...partes), "utf8");
  const barra = lerComponente("layout", "barra.css");
  const ide = lerComponente("ide", "ide.css");
  const markdown = lerComponente("comum", "markdown.css");
  const mapa = lerComponente("mapa", "mapa.css");
  const canvas = readFileSync(join(pasta, "canvas.css"), "utf8");

  const corpo = (css: string, seletor: string) => {
    const regra = regras(semComentario(css)).find((r) => r.seletor === seletor);
    assert.ok(regra, `seletor ${seletor} precisa existir`);
    return regra.corpo;
  };

  const plano = corpo(barra, ".shell-conteudo");
  assert.match(plano, /background-color:\s*var\(--fundo\)/);
  assert.match(plano, /background-image:\s*radial-gradient\([^}]*var\(--ponto-cor\)/s);
  assert.match(plano, /background-size:\s*var\(--ponto-tamanho\) var\(--ponto-tamanho\)/);
  assert.doesNotMatch(plano, /position:\s*fixed/);
  assert.match(
    corpo(barra, ".shell-conteudo > .tela"),
    /background:\s*inherit/,
    "a tela opaca precisa herdar a textura do plano em vez de cobri-la com fundo liso"
  );

  assert.match(corpo(canvas, ".area-canvas"), /background:\s*var\(--canvas-fundo\)/);
  assert.match(corpo(mapa, ".mapa-rede"), /background:\s*var\(--canvas-fundo\)/);
  assert.match(corpo(barra, ".sidebar-rodape"), /background:\s*var\(--carvao\)/);
  assert.match(corpo(ide, ".ide-chat-conversa"), /background:\s*var\(--carvao\)/);
  assert.match(corpo(ide, ".ide-turno-ia"), /color:\s*var\(--menta-painel\)/);
  assert.match(corpo(markdown, ".md pre"), /background:\s*var\(--carvao\)/);
  assert.match(corpo(markdown, ".md pre"), /color:\s*var\(--sobre-painel\)/);
});

test("cor so por token: nenhuma folha de componente escreve cor literal", () => {
  // ESTA E A TRAVA QUE MAIS IMPORTA. Cor literal e o unico jeito de uma tela
  // ficar fora de um tema sem ninguem perceber: ela funciona no tema em que
  // foi escrita e quebra no outro, em silencio, e so aparece quando alguem
  // troca de tema naquela tela especifica.
  //
  // Pega hex e as funcoes de cor. Nao pega "transparent", "currentColor",
  // "inherit" e "none", que sao ausencia de cor e nao escolha de cor.
  const infratores: string[] = [];
  for (const folha of folhas) {
    if (FOLHAS_COM_COR_LITERAL.includes(folha.nome)) continue;
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    const padrao = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl|oklch|lab|lch|color)\(/g;
    for (const achado of css.matchAll(padrao)) {
      // rgba(var(--token-rgb), 0.2) e o jeito CERTO de compor alpha com o
      // tema: a cor continua vindo do token, so a opacidade e literal.
      const trecho = css.slice(achado.index!, achado.index! + 80);
      if (/^rgba?\(\s*var\(--/.test(trecho)) continue;
      infratores.push(
        `${folha.rotulo}:${linhaDe(css, achado.index!)} -> ${achado[0]}`
      );
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `cor literal em folha de componente. Toda cor vem de token. Se falta um ` +
      `token pro caso, o certo e criar ele no global.css e dar valor nos dois ` +
      `temas, nunca escrever o valor na folha. Pra compor transparencia, use ` +
      `rgba(var(--menta-rgb), 0.2), que acompanha a troca de tema.`
  );
});

test("empilhamento so pela escala de sete niveis", () => {
  // z-index literal e como a galeria de fontes acabou abaixo do modal que
  // deveria cobrir: dois numeros escolhidos em telas diferentes, sem ninguem
  // conseguir comparar os dois.
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const achado of css.matchAll(/z-index:\s*([^;}]+)/g)) {
      const valor = achado[1].trim();
      if (/^var\(--z-[a-z]+\)$/.test(valor) || valor === "auto" || valor === "0") continue;
      infratores.push(`${folha.rotulo}:${linhaDe(css, achado.index!)} -> z-index: ${valor}`);
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `z-index literal. Os sete degraus sao --z-base, --z-fixo, --z-popover, ` +
      `--z-camada, --z-veu, --z-modal e --z-aviso.`
  );
});

test("caixa alta so no rotulo de grupo de navegacao", () => {
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const regra of regras(css)) {
      const achado = regra.corpo.match(/text-transform:\s*uppercase/);
      if (!achado) continue;
      if (todosAutorizados(regra.seletor, CAIXA_ALTA_AUTORIZADA)) continue;
      infratores.push(
        `${folha.rotulo}:${linhaDe(css, regra.indice + regra.corpo.indexOf(achado[0]))} ` +
          `"${regra.seletor}" -> text-transform: uppercase`
      );
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `caixa alta fora do rotulo de grupo. Escreva "Token de API", nao "TOKEN DE ` +
      `API". A lista branca e CAIXA_ALTA_AUTORIZADA, neste arquivo.`
  );
});

test("peso 700 so em numero e wordmark", () => {
  // O teste pega as duas formas de escrever, o literal e o token: as duas
  // chegam no mesmo pixel, entao proibir so uma seria trocar o problema de
  // nome.
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const regra of regras(css)) {
      for (const achado of regra.corpo.matchAll(/font-weight:\s*(700|var\(\s*--peso-pesado\s*\))/g)) {
        if (todosAutorizados(regra.seletor, PESO_700_AUTORIZADO)) continue;
        infratores.push(
          `${folha.rotulo}:${linhaDe(css, regra.indice + achado.index!)} ` +
            `"${regra.seletor}" -> font-weight: ${achado[1]}`
        );
      }
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `peso 700 em texto. Titulo usa var(--peso-medio); titulo de cartao e nome ` +
      `usam var(--peso-forte). Se e mesmo numero ou wordmark, nomeie o seletor ` +
      `em PESO_700_AUTORIZADO, neste arquivo, com o motivo.`
  );
});

test("borda tracejada so no estado de arraste de arquivo", () => {
  // Tracejado le como "solte o arquivo aqui" ou como placeholder de obra.
  // Estado vazio nao e nem uma coisa nem outra: e conteudo legitimo.
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    for (const regra of regras(css)) {
      for (const achado of regra.corpo.matchAll(/(border[a-z-]*)\s*:\s*([^;}]*\bdashed\b[^;}]*)/g)) {
        if (todosAutorizados(regra.seletor, TRACEJADO_AUTORIZADO)) continue;
        infratores.push(
          `${folha.rotulo}:${linhaDe(css, regra.indice + achado.index!)} ` +
            `"${regra.seletor}" -> ${achado[1]}: ${achado[2].trim()}`
        );
      }
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `borda tracejada fora do arraste de arquivo. Estado vazio usa superficie e ` +
      `fio normais. Se for mesmo area de soltar arquivo, nomeie o seletor em ` +
      `TRACEJADO_AUTORIZADO, neste arquivo.`
  );
});

test("a camada de tema nao declara nada alem de token de cor", () => {
  // A camada tema vence a tela por ordem de camada. Qualquer propriedade
  // declarada la e inegociavel pra toda folha de tela do app, pra sempre. Foi
  // assim que o tamanho pequeno de botao do design system deixou de existir.
  const css = semComentario(readFileSync(join(pasta, "visual-hub.css"), "utf8"));
  const infratores: string[] = [];
  for (const regra of regras(css)) {
    for (const linha of regra.corpo.split(";")) {
      const prop = linha.split(":")[0]?.trim();
      if (!prop) continue;
      // Custom property de cor e color-scheme, que E cor. Nada mais.
      if (prop.startsWith("--") || prop === "color-scheme") continue;
      infratores.push(
        `${linhaDe(css, regra.indice)} "${regra.seletor}" -> ${prop}`
      );
    }
  }
  assert.deepEqual(
    infratores,
    [],
    `o visual-hub.css declarou algo que nao e token de cor. Tamanho, peso, ` +
      `raio, espaco, empilhamento e duracao moram no global.css; componente ` +
      `mora em primitivas.css ou na folha da tela.`
  );
});

test("toda animacao de posicao tem substituto pra movimento reduzido", () => {
  // A regra do Hub: movimento reduzido SUBSTITUI, nao apaga. Se a folha anima
  // transform ou position, ela precisa declarar o que acontece no lugar. A
  // rede geral do global.css encurta a duracao, mas nao decide o substituto:
  // quem decide e quem escreveu a animacao.
  const infratores: string[] = [];
  for (const folha of folhas) {
    const css = semComentario(readFileSync(folha.caminho, "utf8"));
    const animaPosicao = /@keyframes[^{]*\{[\s\S]*?transform:/.test(css);
    if (!animaPosicao) continue;
    if (/prefers-reduced-motion/.test(css)) continue;
    infratores.push(folha.rotulo);
  }
  assert.deepEqual(
    infratores,
    [],
    `folha com animacao de posicao e sem bloco @media (prefers-reduced-motion: ` +
      `reduce). O deslocamento some, o feedback de cor e de opacidade fica: ` +
      `quem liga movimento reduzido continua precisando saber que a IA esta ` +
      `trabalhando.`
  );
});
