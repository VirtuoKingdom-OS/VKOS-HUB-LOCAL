import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  auditarSiteEstatico,
  listarArquivosSite,
} from "../../vkos/siteEstatico.js";
import {
  ConversaoInviavel,
  converterParaAstro,
  inspecionarMarcadores,
} from "./conversor.js";
import { resolverModoPublicacao } from "./publicacao.js";

function pastaTeste(): string {
  return mkdtempSync(join(tmpdir(), "vkos-astro-"));
}

function cabeca(titulo: string, descricao: string): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="pt-BR">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<link rel="stylesheet" href="styles.css">',
    `<title>${titulo}</title>`,
    `<meta name="description" content="${descricao}">`,
    "</head>",
  ].join("\n");
}

const NAV = '<nav data-vk-nav><a href="index.html">Inicio</a> <a href="sobre.html">Sobre</a></nav>';
const FOOTER = "<footer data-vk-footer>Rodape compartilhado da VK</footer>";
const SCRIPT = '<script src="app.js"></script>';

function montarSiteMarcado(pasta: string): void {
  writeFileSync(
    join(pasta, "index.html"),
    [
      cabeca("Inicio", "Pagina inicial"),
      "<body>",
      NAV,
      "<main data-vk-pagina><h1>Bem-vindo</h1></main>",
      FOOTER,
      SCRIPT,
      "</body></html>",
    ].join("\n"),
  );
  writeFileSync(
    join(pasta, "sobre.html"),
    [
      cabeca("Sobre", "Quem somos"),
      "<body>",
      NAV,
      "<main data-vk-pagina><h1>Sobre nos</h1></main>",
      FOOTER,
      SCRIPT,
      "</body></html>",
    ].join("\n"),
  );
  writeFileSync(join(pasta, "styles.css"), "body{margin:0}");
  writeFileSync(join(pasta, "app.js"), "console.log('vk');");
}

test("converte site multipagina marcado em projeto Astro completo", async () => {
  const pasta = pastaTeste();
  try {
    montarSiteMarcado(pasta);

    const projeto = await converterParaAstro(pasta);
    assert.deepEqual(projeto.paginas, ["index.html", "sobre.html"]);
    assert.equal(projeto.temSitemap, false);
    assert.ok(projeto.avisos.some((a) => a.includes("sitemap")));

    const raiz = join(pasta, ".astro-build");

    const base = readFileSync(join(raiz, "src", "layouts", "Base.astro"), "utf8");
    assert.match(base, /const \{ titulo, descricao \} = Astro\.props/);
    assert.match(base, /data-vk-nav/);
    assert.match(base, /data-vk-footer/);
    assert.match(base, /<slot \/>/);
    assert.match(base, /<title>\{titulo\}<\/title>/);
    // CSS do head vira caminho publico raiz-absoluto no layout compartilhado.
    assert.match(base, /href="\/styles\.css"/);

    const indexAstro = readFileSync(join(raiz, "src", "pages", "index.astro"), "utf8");
    assert.match(indexAstro, /import Base from "\.\.\/layouts\/Base\.astro"/);
    assert.match(indexAstro, /titulo=\{`Inicio`\}/);
    assert.match(indexAstro, /data-vk-pagina/);

    assert.ok(existsSync(join(raiz, "src", "pages", "sobre.astro")));

    const config = readFileSync(join(raiz, "astro.config.mjs"), "utf8");
    assert.match(config, /output: "static"/);
    assert.match(config, /format: "preserve"/);

    const pkg = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8"));
    assert.equal(pkg.dependencies.astro, "5.18.2");
    assert.equal(pkg.scripts.build, "astro build");

    const netlify = readFileSync(join(raiz, "netlify.toml"), "utf8");
    assert.match(netlify, /publish = "dist"/);
    assert.match(netlify, /npm install && npm run build/);

    assert.ok(existsSync(join(raiz, "public", "styles.css")));
    assert.ok(existsSync(join(raiz, "public", "app.js")));
    const robots = readFileSync(join(raiz, "public", "robots.txt"), "utf8");
    assert.match(robots, /User-agent: \*/);
    // Sem URL publica, o robots nao aponta sitemap.
    assert.doesNotMatch(robots, /Sitemap:/);
    assert.ok(!existsSync(join(raiz, "public", "sitemap.xml")));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("gera sitemap e robots com sitemap quando ha URL publica", async () => {
  const pasta = pastaTeste();
  try {
    montarSiteMarcado(pasta);
    const projeto = await converterParaAstro(pasta, {
      urlPublica: "https://exemplo.netlify.app",
    });
    assert.equal(projeto.temSitemap, true);
    const raiz = join(pasta, ".astro-build");
    const sitemap = readFileSync(join(raiz, "public", "sitemap.xml"), "utf8");
    assert.match(sitemap, /<loc>https:\/\/exemplo\.netlify\.app\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/exemplo\.netlify\.app\/sobre\.html<\/loc>/);
    const robots = readFileSync(join(raiz, "public", "robots.txt"), "utf8");
    assert.match(robots, /Sitemap: https:\/\/exemplo\.netlify\.app\/sitemap\.xml/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("recusa conversao quando faltam os marcadores", async () => {
  const pasta = pastaTeste();
  try {
    writeFileSync(
      join(pasta, "index.html"),
      [cabeca("Inicio", "x"), "<body><h1>Sem marcadores</h1></body></html>"].join("\n"),
    );
    writeFileSync(
      join(pasta, "sobre.html"),
      [cabeca("Sobre", "y"), "<body><h1>Sem marcadores</h1></body></html>"].join("\n"),
    );
    writeFileSync(join(pasta, "styles.css"), "body{margin:0}");

    await assert.rejects(() => converterParaAstro(pasta), ConversaoInviavel);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("recusa conversao quando a navegacao difere entre paginas", async () => {
  const pasta = pastaTeste();
  try {
    montarSiteMarcado(pasta);
    // Reescreve sobre.html com um nav diferente do index.
    writeFileSync(
      join(pasta, "sobre.html"),
      [
        cabeca("Sobre", "Quem somos"),
        "<body>",
        '<nav data-vk-nav><a href="index.html">Home</a></nav>',
        "<main data-vk-pagina><h1>Sobre nos</h1></main>",
        FOOTER,
        SCRIPT,
        "</body></html>",
      ].join("\n"),
    );
    await assert.rejects(() => converterParaAstro(pasta), (erro: unknown) => {
      assert.ok(erro instanceof ConversaoInviavel);
      assert.match((erro as Error).message, /navegacao difere/);
      return true;
    });
    assert.equal(
      resolverModoPublicacao(pasta),
      "html",
      "o diagnostico precisa antecipar o fallback",
    );
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("recusa conversao de site de pagina unica", async () => {
  const pasta = pastaTeste();
  try {
    writeFileSync(
      join(pasta, "index.html"),
      [
        cabeca("Inicio", "x"),
        "<body>",
        NAV,
        "<main data-vk-pagina><h1>Unica</h1></main>",
        FOOTER,
        "</body></html>",
      ].join("\n"),
    );
    writeFileSync(join(pasta, "styles.css"), "body{margin:0}");
    await assert.rejects(() => converterParaAstro(pasta), ConversaoInviavel);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("a pasta .astro-build e ignorada pela auditoria e pela coleta", async () => {
  const pasta = pastaTeste();
  try {
    montarSiteMarcado(pasta);
    await converterParaAstro(pasta);

    // A conversao escreveu .astro-build, mas ela nao pode aparecer na arvore.
    assert.ok(existsSync(join(pasta, ".astro-build")));
    const arquivos = listarArquivosSite(pasta);
    assert.ok(
      !arquivos.some((a) => a.startsWith(".astro-build")),
      `arvore vazou .astro-build: ${arquivos.join(", ")}`,
    );

    const auditoria = auditarSiteEstatico(pasta);
    assert.equal(auditoria.valido, true);
    assert.deepEqual(auditoria.paginas, ["index.html", "sobre.html"]);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("resolverModoPublicacao decide astro e html", () => {
  const marcado = pastaTeste();
  const cru = pastaTeste();
  try {
    montarSiteMarcado(marcado);
    assert.equal(resolverModoPublicacao(marcado), "astro");
    assert.equal(inspecionarMarcadores(marcado), true);

    // Site multipagina sem marcadores fica no modo html.
    writeFileSync(
      join(cru, "index.html"),
      [cabeca("Inicio", "x"), "<body><h1>Sem marcadores</h1></body></html>"].join("\n"),
    );
    writeFileSync(
      join(cru, "sobre.html"),
      [cabeca("Sobre", "y"), "<body><h1>Sem marcadores</h1></body></html>"].join("\n"),
    );
    writeFileSync(join(cru, "styles.css"), "body{margin:0}");
    assert.equal(resolverModoPublicacao(cru), "html");
  } finally {
    rmSync(marcado, { recursive: true, force: true });
    rmSync(cru, { recursive: true, force: true });
  }
});

test("modoPrevisto e html quando a peca tem marcadores mas reprova na auditoria", () => {
  const pasta = pastaTeste();
  try {
    // Marcadores presentes nas duas paginas, mas referencia quebrada: a
    // auditoria estrutural reprova, entao o modo previsto tem que ser html.
    writeFileSync(
      join(pasta, "index.html"),
      [
        cabeca("Inicio", "x"),
        "<body>",
        NAV,
        '<main data-vk-pagina><img src="ausente.png"></main>',
        FOOTER,
        "</body></html>",
      ].join("\n"),
    );
    writeFileSync(
      join(pasta, "sobre.html"),
      [cabeca("Sobre", "y"), "<body>", NAV, "<main data-vk-pagina><h1>Sobre</h1></main>", FOOTER, "</body></html>"].join("\n"),
    );
    writeFileSync(join(pasta, "styles.css"), "body{margin:0}");
    assert.equal(resolverModoPublicacao(pasta), "html");
    assert.equal(inspecionarMarcadores(pasta), false);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("marca scripts com is:inline e aponta o src pro caminho publico", async () => {
  const pasta = pastaTeste();
  try {
    const paginaCom = (titulo: string, desc: string, corpo: string) =>
      [
        cabeca(titulo, desc),
        "<body>",
        NAV,
        `<main data-vk-pagina>${corpo}</main>`,
        FOOTER,
        '<script src="main.js"></script>',
        "</body></html>",
      ].join("\n");
    writeFileSync(join(pasta, "index.html"), paginaCom("Inicio", "Home", "<h1>Bem-vindo</h1>"));
    writeFileSync(join(pasta, "sobre.html"), paginaCom("Sobre", "Sobre", "<h1>Sobre</h1>"));
    writeFileSync(join(pasta, "styles.css"), "body{margin:0}");
    writeFileSync(join(pasta, "main.js"), "console.log('vk');");

    await converterParaAstro(pasta);
    const pagina = readFileSync(
      join(pasta, ".astro-build", "src", "pages", "index.astro"),
      "utf8",
    );
    // O script sai na pagina correspondente, com is:inline e src publico.
    assert.match(pagina, /<script is:inline src="\/main\.js">/);
    // Sem is:inline o Astro tentaria bundlar o src local e o build quebraria.
    assert.doesNotMatch(pagina, /<script src="main\.js"/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("preserva script exclusivo de uma pagina no projeto Astro", async () => {
  const pasta = pastaTeste();
  try {
    montarSiteMarcado(pasta);
    const index = readFileSync(join(pasta, "index.html"), "utf8");
    writeFileSync(
      join(pasta, "index.html"),
      index.replace("</body>", "<script>window.paginaInicial = true;</script>\n</body>"),
    );

    assert.equal(resolverModoPublicacao(pasta), "astro");
    await converterParaAstro(pasta);
    const pagina = readFileSync(
      join(pasta, ".astro-build", "src", "pages", "index.astro"),
      "utf8",
    );
    const base = readFileSync(
      join(pasta, ".astro-build", "src", "layouts", "Base.astro"),
      "utf8",
    );
    assert.match(pagina, /window\.paginaInicial = true/);
    assert.doesNotMatch(base, /window\.paginaInicial = true/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("converte nav com aria-current sem reprovar identidade e limpa o marcador", async () => {
  const pasta = pastaTeste();
  try {
    const navAtiva = (ativa: string) =>
      `<nav data-vk-nav><a href="index.html"${ativa === "index" ? ' aria-current="page"' : ""}>Inicio</a> <a href="sobre.html"${ativa === "sobre" ? ' aria-current="page"' : ""}>Sobre</a></nav>`;
    writeFileSync(
      join(pasta, "index.html"),
      [cabeca("Inicio", "Home"), "<body>", navAtiva("index"), "<main data-vk-pagina><h1>Bem-vindo</h1></main>", FOOTER, "</body></html>"].join("\n"),
    );
    writeFileSync(
      join(pasta, "sobre.html"),
      [cabeca("Sobre", "Sobre"), "<body>", navAtiva("sobre"), "<main data-vk-pagina><h1>Sobre</h1></main>", FOOTER, "</body></html>"].join("\n"),
    );
    writeFileSync(join(pasta, "styles.css"), "body{margin:0}");

    // As navs cruas diferem so pelo aria-current: a conversao nao pode reprovar.
    await converterParaAstro(pasta);
    const base = readFileSync(
      join(pasta, ".astro-build", "src", "layouts", "Base.astro"),
      "utf8",
    );
    assert.doesNotMatch(base, /aria-current/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
