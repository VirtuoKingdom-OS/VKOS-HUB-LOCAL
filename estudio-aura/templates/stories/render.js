// Renderiza um conjunto de stories HTML em imagens PNG 1080x1920 (formato Story do Instagram).
// Uso:  node templates/stories/render.js <pasta-dos-stories>
// Ex:   node templates/stories/render.js conteudo/2026-06-30-cinco-erros
//
// Lê <pasta>/stories.html, tira um print de cada elemento .story e salva em
// <pasta>/instagram-stories/story-01.png, story-02.png, ...
// Antes de printar, remove as guias de área segura (.safe-guide) — elas só existem pra você
// enxergar o limite enquanto monta, e NÃO devem sair na imagem final.

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const folder = process.argv[2];
if (!folder) {
  console.error('Falta a pasta. Uso: node templates/stories/render.js <pasta-dos-stories>');
  process.exit(1);
}

const abs = path.resolve(folder);
const htmlPath = path.join(abs, 'stories.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`Não achei stories.html em ${abs}. Gere os stories primeiro.`);
  process.exit(1);
}

const outDir = path.join(abs, 'instagram-stories');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 2,
});

await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

// Remove as guias de área segura antes de printar (são só pra montar, não saem na arte).
await page.$$eval('.safe-guide', (els) => els.forEach((e) => e.remove()));

const stories = await page.$$('.story');
if (stories.length === 0) {
  console.error('Nenhuma tela de story (.story) encontrada no HTML.');
  await browser.close();
  process.exit(1);
}

for (let i = 0; i < stories.length; i++) {
  const n = String(i + 1).padStart(2, '0');
  await stories[i].screenshot({ path: path.join(outDir, `story-${n}.png`) });
  console.log(`story-${n}.png ok`);
}

await browser.close();
console.log(`Render completo: ${stories.length} imagens em ${outDir}`);
