// Abre a interface do Hub num navegador de verdade, percorre as telas, coleta
// erro de console e tira uma foto de cada uma, nos tres temas.
//
// POR QUE ISTO EXISTE: os cinco portoes de qualidade nao veem um pixel. Eles
// provam que o codigo compila, que a logica esta certa e que o pacote sai. Nada
// neste projeto provava que a tela abre, e nao ha teste de DOM aqui.
//
// Isto nao substitui olhar com o olho. Ele pega a classe de defeito que passa
// batido no verde: tela que nao renderiza, erro de runtime que so aparece no
// navegador, tela sem botao nenhum, e rolagem horizontal no corpo. As fotos
// ficam pra conferencia humana e pra comparar antes e depois de uma mudanca de
// estilo, que e onde a cascata quebra sem avisar.
//
// Uso:
//   node ferramentas/olhar-telas.mjs
//   node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos --tema claro
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

// As telas que abrem por rota direta. Tela que so existe dentro de fluxo (o
// Studio de uma peca, o editor de um site) precisa de dado e fica de fora.
const TELAS = [
  { id: "dashboard", rota: "#/dashboard", nome: "Dashboard" },
  { id: "cockpit", rota: "#/cockpit", nome: "Cockpit" },
  { id: "crm", rota: "#/crm", nome: "CRM" },
  { id: "conexoes", rota: "#/conexoes", nome: "Conexoes" },
  { id: "mapa", rota: "#/mapa", nome: "Mapa" },
  { id: "galerias", rota: "#/galerias", nome: "Galerias" },
  { id: "fontes", rota: "#/fontes", nome: "Fontes" },
  { id: "criar-carrossel", rota: "#/criar/carrossel", nome: "Criar carrossel" },
  { id: "criar-post", rota: "#/criar/post", nome: "Criar post" },
  { id: "criar-site", rota: "#/criar/site", nome: "Criar site" },
  { id: "fluxo-site", rota: "#/fluxo/site", nome: "Site e paginas" },
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

mkdirSync(SAIDA, { recursive: true });
const navegador = await abrirNavegador();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
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

console.log(`\n=== interface em ${BASE}${TEMA ? `, tema ${TEMA}` : ""} ===\n`);

try {
  await aba.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
} catch {
  console.error(`Nao consegui abrir ${BASE}. O servidor esta no ar nessa porta?`);
  await navegador.close();
  process.exit(1);
}
await aplicarTema();
await aba.waitForTimeout(1500);

let telasComAlerta = 0;

for (const tela of TELAS) {
  const antes = problemas.length;
  try {
    await aba.goto(`${BASE}/${tela.rota}`, { waitUntil: "networkidle", timeout: 25000 });
    await aplicarTema();
    await aba.waitForTimeout(1200);

    const visao = await aba.evaluate(() => {
      const texto = (document.body.innerText || "").trim();
      const estilo = getComputedStyle(document.body);
      return {
        caracteres: texto.length,
        primeiraLinha: texto.split("\n").filter(Boolean)[0]?.slice(0, 70) ?? "",
        fundo: estilo.backgroundColor,
        botoes: document.querySelectorAll("button").length,
        // Corpo que rola pro lado quase sempre e layout estourando.
        rolagemHorizontal:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      };
    });

    const sufixo = TEMA ? `-${TEMA}` : "";
    await aba.screenshot({ path: join(SAIDA, `${tela.id}${sufixo}.png`) });

    const alerta = [];
    if (visao.caracteres < 40) alerta.push("QUASE VAZIA");
    if (visao.botoes === 0) alerta.push("SEM BOTAO");
    if (visao.rolagemHorizontal) alerta.push("ROLAGEM HORIZONTAL");
    const novos = problemas.length - antes;
    if (novos > 0) alerta.push(`${novos} ERRO(S) DE CONSOLE`);
    if (alerta.length) telasComAlerta++;

    console.log(
      `  ${alerta.length ? "!!" : "ok"}  ${tela.nome.padEnd(20)} ` +
        `${String(visao.caracteres).padStart(5)} car  ${String(visao.botoes).padStart(3)} btn  ` +
        `${visao.fundo.padEnd(20)} ${alerta.join(", ")}`,
    );
  } catch (erro) {
    telasComAlerta++;
    const motivo = String(erro instanceof Error ? erro.message : erro).split("\n")[0];
    console.log(`  XX  ${tela.nome.padEnd(20)} nao abriu: ${motivo.slice(0, 90)}`);
  }
}

console.log(`\n=== ${problemas.length} erro(s) de console, ${telasComAlerta} tela(s) com alerta ===`);
const vistos = new Set();
for (const p of problemas) {
  const chave = p.texto.slice(0, 120);
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  console.log(`  [${p.tipo}] ${p.texto.slice(0, 220)}`);
}

console.log(`\nfotos em ${SAIDA}`);
await navegador.close();
// Sai com erro quando alguma tela reprovou, pra servir de portao em script.
process.exit(telasComAlerta > 0 ? 1 : 0);
