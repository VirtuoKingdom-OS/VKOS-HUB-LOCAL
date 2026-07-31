import assert from "node:assert/strict";
import test from "node:test";
import { ehRotaDoApp } from "./spa.js";

const NAVEGADOR = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

test("F5 em qualquer tela do Hub recebe a casca do app", () => {
  // O motivo deste arquivo existir: com rota de verdade, recarregar a página
  // bate no servidor. Se ele devolver 404, o Hub não abre.
  for (const rota of [
    "/dashboard",
    "/workspaces",
    "/crm",
    "/conexoes",
    "/mapa",
    "/inicio",
    "/cockpit",
    "/galerias",
    "/fontes",
    "/criar/carrossel",
    "/studio/minha-peca",
    "/site/meu-site",
    "/fluxo/site",
    "/fonte/documento",
  ]) {
    assert.equal(
      ehRotaDoApp({ metodo: "GET", url: rota, aceita: NAVEGADOR }),
      true,
      `${rota} precisa abrir o app`,
    );
  }
});

test("rota de API que não existe continua 404, nunca vira HTML", () => {
  // Devolver a página aqui trocaria um 404 legível por um erro de parse dentro
  // do frontend, longe da causa.
  for (const rota of [
    "/api/nao-existe",
    "/api/crm/interacoes/999",
    "/ws",
    "/pecas/algo",
    "/pecas-edicao/algo",
    "/modelos-html/algo",
    "/assets/index-abc123.js",
  ]) {
    assert.equal(
      ehRotaDoApp({ metodo: "GET", url: rota, aceita: NAVEGADOR }),
      false,
      `${rota} é do servidor, não da interface`,
    );
  }
});

test("arquivo que sumiu continua 404, e não página em branco", () => {
  // Um asset quebrado precisa aparecer quebrado. Servir HTML no lugar de um
  // .js faz o navegador engasgar num erro que não diz nada.
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/logo.png", aceita: NAVEGADOR }), false);
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/algo/estilo.css", aceita: NAVEGADOR }), false);
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/favicon.ico", aceita: NAVEGADOR }), false);
});

test("só navegação recebe a casca: método e Accept mandam", () => {
  assert.equal(ehRotaDoApp({ metodo: "POST", url: "/crm", aceita: NAVEGADOR }), false);
  assert.equal(ehRotaDoApp({ metodo: "DELETE", url: "/crm", aceita: NAVEGADOR }), false);
  assert.equal(ehRotaDoApp({ metodo: "HEAD", url: "/crm", aceita: NAVEGADOR }), true);
  // fetch pedindo JSON não é navegação.
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/crm", aceita: "application/json" }), false);
  // Cliente sem Accept nenhum não é tratado como navegador.
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/crm" }), false);
});

test("query na URL não muda a decisão", () => {
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/crm?aba=funil", aceita: NAVEGADOR }), true);
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/api/crm?x=1", aceita: NAVEGADOR }), false);
});

test("prefixo do servidor só casca no limite do caminho", () => {
  // "/apiario" não é "/api". Cortar por startsWith cru sequestraria a rota.
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/apiario", aceita: NAVEGADOR }), true);
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/pecas-de-teatro", aceita: NAVEGADOR }), true);
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/api", aceita: NAVEGADOR }), false);
  assert.equal(ehRotaDoApp({ metodo: "GET", url: "/api/", aceita: NAVEGADOR }), false);
});
