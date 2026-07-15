// Render de um carrossel.html em PNG 1080x1350 (formato Instagram), sob demanda.
// CommonJS puro, spawnado com node pelo server (vkos/render.ts).
//
// Uso:  node render-paginas.cjs <htmlPath> <outDir> [n]
//   sem n  renderiza todas as paginas (.slide)
//   com n  renderiza so a pagina n (1-based)
//
// Salva slide-01.png, slide-02.png... em <outDir>. Mesmo pipeline do
// vkos/templates/carrossel/render.js: viewport 1080x1350, deviceScaleFactor 2.
// O Playwright vem do VKOS ativo, resolvido por VKOS_NODE_MODULES.

const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

const htmlPath = process.argv[2];
const outDir = process.argv[3];
const nArg = process.argv[4];

if (!htmlPath || !outDir) {
  console.error("Uso: node render-paginas.cjs <htmlPath> <outDir> [n]");
  process.exit(1);
}

// node_modules do VKOS ativo chega por env (ou por arg extra, se um dia mudar).
const nodeModules = process.env.VKOS_NODE_MODULES || process.argv[5];

let playwright;
try {
  const alvo = require.resolve("playwright", { paths: [nodeModules] });
  playwright = require(alvo);
} catch (erro) {
  console.error("PLAYWRIGHT_AUSENTE: nao achei o playwright em " + nodeModules);
  process.exit(2);
}

const { chromium } = playwright;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch();
  } catch (erro) {
    console.error("CHROMIUM_AUSENTE: " + (erro && erro.message));
    process.exit(3);
  }

  const page = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2,
  });

  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const slides = await page.$$(".slide");
  if (slides.length === 0) {
    console.error("SEM_SLIDES: nenhum elemento .slide no HTML.");
    await browser.close();
    process.exit(4);
  }

  // Sem n: todas as paginas. Com n: so a pagina n (se estiver na faixa).
  let indices;
  if (nArg) {
    const num = parseInt(nArg, 10);
    indices = num >= 1 && num <= slides.length ? [num - 1] : [];
  } else {
    indices = slides.map((_, i) => i);
  }

  for (const i of indices) {
    const nn = String(i + 1).padStart(2, "0");
    await slides[i].screenshot({ path: path.join(outDir, `slide-${nn}.png`) });
  }

  await browser.close();
})().catch((erro) => {
  console.error("ERRO_RENDER: " + (erro && erro.message ? erro.message : String(erro)));
  process.exit(5);
});
