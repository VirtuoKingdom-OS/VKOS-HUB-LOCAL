// A peca de anuncio na lista de pecas, com o veredito da forma junto.
//
// A classificacao chama a peca de "anuncio" so por existir um anuncio.json na
// raiz, SEM olhar o conteudo, e isso e o certo: campanha quebrada continua
// sendo campanha, e manda-la pra "texto" faria a tela do anuncio nunca abrir
// justo no caso em que o dono precisa ver o problema. O que nao pode acontecer
// e a peca chegar na tela sem dizer se a forma passou: era assim ate a Fase 5
// do fluxo de anuncios, e um JSON corrompido virava campanha pronta.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lerPecas } from "./pecas.js";

// Peca minima que passa no schema, em texto, pra este teste nao depender do
// modelo inteiro escrito na mao duas vezes.
const CAMPANHA_VALIDA = {
  versao: 1,
  plataforma: "google-busca",
  geradoEm: "2026-07-31T10:00:00.000Z",
  estrategia: {
    objetivo: "Agendar avaliações",
    oferta: "Avaliação gratuita",
    publico: "Adultos em São Paulo",
    dorPrincipal: "Dor nas costas",
    provas: ["12 anos de clínica"],
    destino: { tipo: "whatsapp", url: "https://wa.me/5511999999999", observacao: "" },
    localizacoes: ["São Paulo, SP"],
    idioma: "pt-BR",
  },
  campanha: {
    nome: "Busca, avaliação",
    tipo: "busca",
    grupos: [
      {
        id: "avaliacao",
        nome: "Avaliação",
        tema: "Avaliação",
        palavrasChave: [{ texto: "fisioterapia sp", correspondencia: "frase", motivo: "Alta" }],
        anuncios: [
          {
            titulos: ["Fisioterapia em SP", "Avaliação gratuita", "Agende hoje"],
            descricoes: ["Perto de você, com hora marcada.", "Fale no WhatsApp."],
            caminhos: ["fisioterapia"],
            urlFinal: "https://exemplo.com.br",
          },
        ],
      },
    ],
  },
  negativas: [],
  recursos: { sitelinks: [], frasesDestaque: [], snippets: [], chamada: "" },
  orcamento: { diarioBrl: 50, cpcAlvoBrl: 3.5, cliquesEstimadosMes: "300", observacao: "" },
  conversoes: [],
  publicacao: [],
};

function montarVkos(): string {
  const raiz = mkdtempSync(join(tmpdir(), "vkos-pecas-anuncio-"));

  const boa = join(raiz, "conteudo", "2026-07-31-anuncio-boa");
  mkdirSync(boa, { recursive: true });
  writeFileSync(join(boa, "anuncio.json"), JSON.stringify(CAMPANHA_VALIDA), "utf8");

  // Quebrada de um jeito que o olho nao pega: titulos veio como texto.
  const quebrada = join(raiz, "conteudo", "2026-07-31-anuncio-quebrada");
  mkdirSync(quebrada, { recursive: true });
  const ruim = structuredClone(CAMPANHA_VALIDA) as typeof CAMPANHA_VALIDA;
  (ruim.campanha.grupos[0].anuncios[0] as unknown as { titulos: unknown }).titulos = "Um só";
  writeFileSync(join(quebrada, "anuncio.json"), JSON.stringify(ruim), "utf8");

  // Nem JSON e.
  const ilegivel = join(raiz, "conteudo", "2026-07-31-anuncio-ilegivel");
  mkdirSync(ilegivel, { recursive: true });
  writeFileSync(join(ilegivel, "anuncio.json"), "{ isto nao fecha", "utf8");

  // Um site ao lado, pra provar que o campo novo e so de anuncio.
  const site = join(raiz, "conteudo", "2026-07-31-site-estudio");
  mkdirSync(site, { recursive: true });
  writeFileSync(join(site, "index.html"), "<!doctype html><title>a</title>", "utf8");

  return raiz;
}

test("toda peca de anuncio chega na lista com o veredito da forma", () => {
  const raiz = montarVkos();
  try {
    const pecas = lerPecas(raiz);
    const porPasta = new Map(pecas.map((p) => [p.pasta, p]));

    const boa = porPasta.get("2026-07-31-anuncio-boa");
    assert.equal(boa?.tipo, "anuncio");
    assert.deepEqual(boa?.anuncio, { valido: true });

    // A peca quebrada CONTINUA sendo anuncio, e por isso a tela abre nela.
    const quebrada = porPasta.get("2026-07-31-anuncio-quebrada");
    assert.equal(quebrada?.tipo, "anuncio");
    assert.equal(quebrada?.anuncio?.valido, false);
    // O erro diz qual campo, e nao so "deu errado".
    assert.match(String(quebrada?.anuncio?.erro), /titulos/);

    const ilegivel = porPasta.get("2026-07-31-anuncio-ilegivel");
    assert.equal(ilegivel?.tipo, "anuncio");
    assert.equal(ilegivel?.anuncio?.valido, false);
    assert.match(String(ilegivel?.anuncio?.erro), /JSON válido/);

    // Peca de site nao carrega o campo do anuncio, e vice-versa.
    const site = porPasta.get("2026-07-31-site-estudio");
    assert.equal(site?.tipo, "site");
    assert.equal(site?.anuncio, undefined);
    assert.equal(boa?.site, undefined);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
