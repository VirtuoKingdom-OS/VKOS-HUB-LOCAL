// Abre a interface do Hub num navegador de verdade, percorre as telas, coleta
// erro de console, mede responsividade e tira uma foto de cada uma.
//
// POR QUE ISTO EXISTE: os cinco portoes de qualidade nao veem um pixel. Eles
// provam que o codigo compila, que a logica esta certa e que o pacote sai. Nada
// neste projeto provava que a tela abre, e nao ha teste de DOM aqui.
//
// Isto nao substitui olhar com o olho. Ele pega a classe de defeito que passa
// batido no verde: tela que nao renderiza, erro de runtime que so aparece no
// navegador, tela sem botao nenhum, rolagem horizontal, item de menu que a
// pessoa nao alcanca e alvo de toque pequeno demais. As fotos ficam pra
// conferencia humana e pra comparar antes e depois de uma mudanca de estilo,
// que e onde a cascata quebra sem avisar.
//
// A MEDIDA DE ALTURA existe por um defeito real, de 2026-07-27: a barra lateral
// empilhava os dois niveis de navegacao e sobrava 33px pro menu do projeto num
// notebook de 720px. Compilava, passava nos cinco portoes, e a pessoa nao
// conseguia clicar nos proprios itens. Nenhum teste via isso porque nenhum
// teste tinha altura.
//
// Uso:
//   node ferramentas/olhar-telas.mjs
//   node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos --tema claro
//   node ferramentas/olhar-telas.mjs --tamanhos 1366x768,1280x720
//
// Ele NAO sobe o servidor. Suba antes, de preferencia com VKOS_DADOS_TESTE
// apontando pra uma pasta temporaria, pra nao mexer no dado real.

import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pastaRaiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const caminhoPlaywright = join(pastaRaiz, "app", "node_modules", "playwright-core", "index.js");
const { chromium } = (await import(`file://${caminhoPlaywright.replace(/\\/g, "/")}`)).default;

function argumento(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

const PORTA = argumento("porta", "4600");
const BASE = `http://127.0.0.1:${PORTA}`;
const SAIDA = resolve(argumento("saida", join(pastaRaiz, "fotos-telas")));
// Vazio quer dizer o tema padrao do app.
const TEMA = argumento("tema", "");

// Os tamanhos que importam. O 1366x768 e o notebook mais comum do mundo, e o
// 1280x720 e onde a barra lateral quebrou. Sem varrer altura, o defeito volta.
const TAMANHOS = argumento("tamanhos", "1440x900,1366x768,1280x720")
  .split(",")
  .map((t) => {
    const [l, a] = t.split("x").map(Number);
    return { largura: l, altura: a, nome: `${l}x${a}` };
  });

// Piso da escala tipografica, em global.css. Texto renderizado abaixo disso e
// valor fora da escala.
const PISO_FONTE = 11;
// Minimo de alvo de toque do WCAG 2.2, criterio 2.5.8.
const MINIMO_ALVO = 24;

// As telas que abrem por rota direta. Tela que so existe dentro de fluxo (o
// Studio de uma peca, o editor de um site) precisa de dado e fica de fora.
// As rotas sao caminhos de verdade desde 2026-07-27, sem o "#".
// Ver docs/decisoes/2026-07-27-rotas-sem-hash.md.
const TELAS = [
  { id: "dashboard", rota: "dashboard", nome: "Dashboard", nivel: "core" },
  { id: "clientes", rota: "clientes", nome: "Clientes", nivel: "core" },
  { id: "workspaces", rota: "workspaces", nome: "Workspaces", nivel: "core" },
  { id: "crm", rota: "crm", nome: "CRM", nivel: "core" },
  { id: "financas", rota: "financas", nome: "Financas", nivel: "core" },
  { id: "conexoes", rota: "conexoes", nome: "Conexoes", nivel: "core" },
  { id: "mapa", rota: "mapa", nome: "Mapa", nivel: "core" },
  { id: "inicio", rota: "inicio", nome: "Inicio do workspace", nivel: "workspace" },
  { id: "cockpit", rota: "cockpit", nome: "Cockpit", nivel: "workspace" },
  { id: "galerias", rota: "galerias", nome: "Galerias", nivel: "workspace" },
  { id: "fontes", rota: "fontes", nome: "Fontes", nivel: "workspace" },
  { id: "criar-carrossel", rota: "criar/carrossel", nome: "Criar carrossel", nivel: "workspace" },
  { id: "criar-post", rota: "criar/post", nome: "Criar post", nivel: "workspace" },
  { id: "criar-site", rota: "criar/site", nome: "Criar site", nivel: "workspace" },
  { id: "fluxo-site", rota: "fluxo/site", nome: "Site e paginas", nivel: "workspace" },
];

async function abrirNavegador() {
  const canais = process.platform === "win32" ? ["msedge", "chrome"] : ["chrome", "msedge"];
  for (const channel of canais) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      // Tenta o proximo canal.
    }
  }
  throw new Error("Edge ou Chrome nao encontrado. Instale um dos dois pra rodar a conferencia visual.");
}

// Roda dentro da pagina. Devolve tudo que da pra medir de uma vez.
function medirNaPagina({ pisoFonte, minimoAlvo }) {
  const raiz = document.documentElement;
  const largura = raiz.clientWidth;
  const texto = (document.body.innerText || "").trim();

  const nome = (e) => {
    const classe = (e.className.baseVal ?? e.className ?? "").toString().trim().split(/\s+/)[0];
    return `${e.tagName.toLowerCase()}${classe ? `.${classe}` : ""}`;
  };
  // O cockpit fica montado mas fora do desenho quando nao e a tela ativa.
  // Medir o que nao e desenhado geraria alarme falso em toda tela.
  const desenhado = (e) => {
    if (e.closest(".camada-cockpit.oculta")) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.contentVisibility !== "hidden";
  };
  // O canvas do React Flow e infinito de proposito: os nos passam da borda e a
  // pessoa chega neles arrastando. Isso nao e estouro de layout.
  const noCanvas = (e) => !!e.closest(".react-flow");

  const visiveis = [...document.querySelectorAll("body *")].filter(desenhado);

  const estouros = [
    ...new Set(
      visiveis
        .filter((e) => {
          if (noCanvas(e) || getComputedStyle(e).position === "fixed") return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.right > largura + 2;
        })
        .map((e) => `${nome(e)} +${Math.round(e.getBoundingClientRect().right - largura)}px`),
    ),
  ].slice(0, 4);

  const alvos = [
    ...new Set(
      visiveis
        .filter((e) => {
          if (noCanvas(e)) return false;
          if (!e.matches("button, a[href], input:not([type=hidden]), select, [role=button]")) return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.height < minimoAlvo || r.width < minimoAlvo);
        })
        .map((e) => {
          const r = e.getBoundingClientRect();
          return `${nome(e)} ${Math.round(r.width)}x${Math.round(r.height)}`;
        }),
    ),
  ].slice(0, 4);

  const fontes = [
    ...new Set(
      visiveis
        .filter((e) => {
          const temTexto = [...e.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 2,
          );
          return temTexto && Number.parseFloat(getComputedStyle(e).fontSize) < pisoFonte;
        })
        .map((e) => `${nome(e)} ${getComputedStyle(e).fontSize}`),
    ),
  ].slice(0, 4);

  // A barra lateral: nenhum item pode ficar fora do alcance. Item fora da
  // caixa da barra e inalcancavel de verdade; item fora da caixa do menu esta
  // ok se o menu rola.
  const barra = document.querySelector(".sidebar");
  const menu = document.querySelector(".sidebar-nav-rolante");
  let inalcancaveis = [];
  let alturaMenu = null;
  let menuEspremido = false;
  let menuNaoCede = false;
  if (barra) {
    const cx = barra.getBoundingClientRect();
    alturaMenu = menu ? Math.round(menu.getBoundingClientRect().height) : 0;
    inalcancaveis = [
      ...barra.querySelectorAll(".item-nav, .sw-trigger, .sidebar-voltar-core"),
    ]
      .filter((i) => {
        const r = i.getBoundingClientRect();
        return r.bottom > cx.bottom + 1 || r.top < cx.top - 1;
      })
      .map((i) => (i.textContent || "").trim().slice(0, 20));

    if (menu) {
      // Sintoma: o menu virou fresta. Rolar dentro de 120px nao e navegar.
      menuEspremido = menu.scrollHeight > menu.clientHeight + 1 && alturaMenu < 120;

      // Mecanismo: o menu tem que ser QUEM CEDE altura quando falta espaco.
      // Esta e a checagem que pega o defeito antes de haver conteudo bastante
      // pra ele aparecer. Em 2026-07-27 o menu era flex:none e a moldura em
      // volta comia 650px: com pouco conteudo parecia funcionar, e bastava um
      // cliente com mais pecas pra ficar inalcancavel.
      const cs = getComputedStyle(menu);
      menuNaoCede =
        Number.parseFloat(cs.flexGrow) < 1 ||
        Number.parseFloat(cs.flexShrink) < 1 ||
        cs.overflowY === "visible";

      // E o resto da barra tem que NAO ceder, senao a conta se inverte.
      for (const irmao of barra.children) {
        if (irmao === menu || irmao.contains(menu)) continue;
        if (Number.parseFloat(getComputedStyle(irmao).flexGrow) >= 1) {
          menuNaoCede = true;
        }
      }
    }
  }

  return {
    caracteres: texto.length,
    fundo: getComputedStyle(document.body).backgroundColor,
    botoes: document.querySelectorAll("button").length,
    rolagemHorizontal: raiz.scrollWidth > largura + 2,
    estouros,
    alvos,
    fontes,
    inalcancaveis,
    alturaMenu,
    menuEspremido,
    menuNaoCede,
  };
}

mkdirSync(SAIDA, { recursive: true });
const navegador = await abrirNavegador();

let telasComAlerta = 0;
let totalErros = 0;
const vistos = new Set();

for (const tamanho of TAMANHOS) {
  const contexto = await navegador.newContext({
    viewport: { width: tamanho.largura, height: tamanho.altura },
  });
  const aba = await contexto.newPage();

  const problemas = [];
  aba.on("console", (m) => {
    if (m.type() === "error") problemas.push({ tipo: "console", texto: m.text() });
  });
  aba.on("pageerror", (e) => problemas.push({ tipo: "excecao", texto: e.message }));

  async function aplicarTema() {
    if (!TEMA) return;
    await aba.evaluate((t) => document.documentElement.setAttribute("data-theme", t), TEMA);
  }

  console.log(`\n=== ${BASE}, ${tamanho.nome}${TEMA ? `, tema ${TEMA}` : ""} ===\n`);

  try {
    await aba.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    console.error(`Nao consegui abrir ${BASE}. O servidor esta no ar nessa porta?`);
    await navegador.close();
    process.exit(1);
  }
  await aplicarTema();
  await aba.waitForTimeout(1500);

  for (const tela of TELAS) {
    const antes = problemas.length;
    try {
      await aba.goto(`${BASE}/${tela.rota}`, { waitUntil: "networkidle", timeout: 25000 });
      await aplicarTema();
      await aba.waitForTimeout(1200);

      const visao = await aba.evaluate(medirNaPagina, {
        pisoFonte: PISO_FONTE,
        minimoAlvo: MINIMO_ALVO,
      });

      // Uma foto por tela no primeiro tamanho; nos demais so quando reprova.
      const primeiro = tamanho === TAMANHOS[0];
      const sufixo = `${TEMA ? `-${TEMA}` : ""}${primeiro ? "" : `-${tamanho.nome}`}`;

      const alerta = [];
      if (visao.caracteres < 40) alerta.push("QUASE VAZIA");
      if (visao.botoes === 0) alerta.push("SEM BOTAO");
      if (visao.rolagemHorizontal) alerta.push("ROLAGEM HORIZONTAL");
      if (visao.estouros.length) alerta.push(`estoura: ${visao.estouros.join(", ")}`);
      if (visao.inalcancaveis.length) {
        alerta.push(`MENU INALCANCAVEL: ${visao.inalcancaveis.join(", ")}`);
      }
      if (visao.menuEspremido) alerta.push(`MENU ESPREMIDO (${visao.alturaMenu}px)`);
      if (visao.menuNaoCede) alerta.push("MENU NAO CEDE ALTURA (flex errado na barra)");
      if (visao.alvos.length) alerta.push(`alvo < ${MINIMO_ALVO}px: ${visao.alvos.join(", ")}`);
      if (visao.fontes.length) alerta.push(`fonte < ${PISO_FONTE}px: ${visao.fontes.join(", ")}`);
      const novos = problemas.length - antes;
      if (novos > 0) alerta.push(`${novos} ERRO(S) DE CONSOLE`);
      if (alerta.length) telasComAlerta++;

      if (primeiro || alerta.length) {
        await aba.screenshot({ path: join(SAIDA, `${tela.id}${sufixo}.png`) });
      }

      console.log(
        `  ${alerta.length ? "!!" : "ok"}  ${tela.nome.padEnd(20)} ` +
          `${String(visao.caracteres).padStart(5)} car  ${String(visao.botoes).padStart(3)} btn  ` +
          `menu ${String(visao.alturaMenu ?? 0).padStart(3)}px  ${alerta.join(" | ")}`,
      );
    } catch (erro) {
      telasComAlerta++;
      const motivo = String(erro instanceof Error ? erro.message : erro).split("\n")[0];
      console.log(`  XX  ${tela.nome.padEnd(20)} nao abriu: ${motivo.slice(0, 90)}`);
    }
  }

  totalErros += problemas.length;
  for (const p of problemas) {
    const chave = p.texto.slice(0, 120);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    console.log(`  [${p.tipo}] ${p.texto.slice(0, 220)}`);
  }

  await contexto.close();
}

console.log(
  `\n=== ${totalErros} erro(s) de console, ${telasComAlerta} tela(s) com alerta em ` +
    `${TELAS.length} telas x ${TAMANHOS.length} tamanhos ===`,
);
console.log(`\nfotos em ${SAIDA}`);
await navegador.close();
// Sai com erro quando alguma tela reprovou, pra servir de portao em script.
process.exit(telasComAlerta > 0 ? 1 : 0);
