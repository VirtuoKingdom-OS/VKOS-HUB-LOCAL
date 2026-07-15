// Renderiza um carrossel HTML em imagens PNG 1080x1350 (formato Instagram).
// Uso:  node templates/carrossel/render.js <pasta-do-carrossel>
// Ex:   node templates/carrossel/render.js conteudo/2026-06-30-cinco-erros
//
// Lê <pasta>/carrossel.html, tira um print de cada elemento .slide e salva em
// <pasta>/instagram/slide-01.png, slide-02.png, ...

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const folder = process.argv[2];
if (!folder) {
  console.error('Falta a pasta. Uso: node templates/carrossel/render.js <pasta-do-carrossel>');
  process.exit(1);
}

const abs = path.resolve(folder);
const htmlPath = path.join(abs, 'carrossel.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`Não achei carrossel.html em ${abs}. Gere o carrossel primeiro.`);
  process.exit(1);
}

const outDir = path.join(abs, 'instagram');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 2,
});

await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const slides = await page.$$('.slide');
if (slides.length === 0) {
  console.error('Nenhum slide (.slide) encontrado no HTML.');
  await browser.close();
  process.exit(1);
}

for (let i = 0; i < slides.length; i++) {
  const n = String(i + 1).padStart(2, '0');
  await slides[i].screenshot({ path: path.join(outDir, `slide-${n}.png`) });
  console.log(`slide-${n}.png ok`);
}

await browser.close();
console.log(`Render completo: ${slides.length} imagens em ${outDir}`);
