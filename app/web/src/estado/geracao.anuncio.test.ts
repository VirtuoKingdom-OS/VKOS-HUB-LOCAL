// O criterio de campanha pronta e o veredito de campanha quebrada.
//
// O buraco que estes testes fecham: antes da Fase 5 do fluxo de anuncios, uma
// pasta com anuncio.json na raiz virava peca de anuncio SO PELO NOME DO
// ARQUIVO, e a geracao chamava isso de pronto. Um JSON corrompido era anunciado
// como campanha pronta, o flutuante mandava o dono pra tela, e a tela mostrava
// um 422. Agora quem decide e o veredito de forma que o servidor calcula.

import assert from "node:assert/strict";
import test from "node:test";

import {
  ERRO_CAMPANHA_SEM_DETALHE,
  MENSAGEM_CONFERENCIA_DEMOROU_ANUNCIO,
  erroDaCampanha,
  pecaEstaPronta,
  rotuloConferencia,
} from "./geracao";
import type { Peca } from "../tipos/dominio";

const PASTA = "2026-07-31-anuncio-combo";

function pecaAnuncio(anuncio: Peca["anuncio"]): Peca {
  return {
    pasta: PASTA,
    data: "2026-07-31",
    tema: "anuncio-combo",
    tipo: "anuncio",
    arquivos: [`${PASTA}/anuncio.json`],
    previews: [],
    anuncio,
  };
}

const ERRO_DO_SERVIDOR =
  "O anúncio não está no formato esperado. campanha.grupos[0].anuncios[0].titulos: esperava lista, veio texto.";

// ------------------------------------------------------------ peca pronta

test("campanha com forma valida esta pronta", () => {
  assert.equal(pecaEstaPronta("anuncio", pecaAnuncio({ valido: true }), undefined), true);
});

// O CORACAO DA CORRECAO. Se esta linha virar true, o dono volta a ser mandado
// pra uma tela que so sabe mostrar 422.
test("campanha com forma quebrada NAO esta pronta", () => {
  assert.equal(
    pecaEstaPronta("anuncio", pecaAnuncio({ valido: false, erro: ERRO_DO_SERVIDOR }), undefined),
    false,
  );
});

test("peca de anuncio sem veredito nenhum nao esta pronta", () => {
  // O servidor sempre manda o campo em peca de anuncio. Faltar quer dizer que
  // alguem esta olhando um dado velho, e dado velho nao vira "pode abrir".
  assert.equal(pecaEstaPronta("anuncio", pecaAnuncio(undefined), undefined), false);
});

test("peca ausente nunca esta pronta, em nenhum tipo", () => {
  assert.equal(pecaEstaPronta("anuncio", undefined, undefined), false);
  assert.equal(pecaEstaPronta("site", undefined, undefined), false);
  assert.equal(pecaEstaPronta("carrossel", undefined, undefined), false);
});

// O laco do site continua exatamente como era. Estes tres casos sao o
// comportamento de antes desta fase, escritos aqui pra ele nao escorregar.
test("o criterio do site nao mudou", () => {
  const site: Peca = {
    pasta: "2026-07-31-site-estudio",
    data: "2026-07-31",
    tema: "site-estudio",
    tipo: "site",
    arquivos: [],
    previews: [],
    site: { valido: true, erros: [], avisos: [] },
  };
  // Sem laco (sessao antiga), o site pronto continua pronto.
  assert.equal(pecaEstaPronta("site", site, undefined), true);
  // Com o laco rodando, ainda nao.
  assert.equal(pecaEstaPronta("site", site, { estado: "conferindo", volta: 0 }), false);
  assert.equal(pecaEstaPronta("site", site, { estado: "corrigindo", volta: 1 }), false);
  // Terminado, pode abrir, mesmo com pendencias: o site existe.
  assert.equal(pecaEstaPronta("site", site, { estado: "aprovada", volta: 0 }), true);
  assert.equal(pecaEstaPronta("site", site, { estado: "pendencias", volta: 2 }), true);
});

test("carrossel continua exigindo HTML com pagina dentro", () => {
  const base: Peca = {
    pasta: "2026-07-31-carrossel",
    data: "2026-07-31",
    tema: "carrossel",
    tipo: "carrossel",
    arquivos: [],
    previews: [],
  };
  assert.equal(pecaEstaPronta("carrossel", base, undefined), false);
  assert.equal(
    pecaEstaPronta("carrossel", { ...base, fonteHtml: true, paginas: 7 }, undefined),
    true,
  );
});

// --------------------------------------------------------- o veredito honesto

test("depois do laco parar, a campanha quebrada devolve o erro literal", () => {
  assert.equal(
    erroDaCampanha({
      tipo: "anuncio",
      peca: pecaAnuncio({ valido: false, erro: ERRO_DO_SERVIDOR }),
      conferencia: { estado: "pendencias", volta: 2 },
      status: "concluida",
    }),
    ERRO_DO_SERVIDOR,
  );
});

// Enquanto o laco confere ou corrige, o arquivo em disco ainda pode virar
// valido na proxima volta. Acusar aqui seria interromper a IA no meio da frase.
test("durante as voltas do laco nao ha veredito nenhum", () => {
  for (const estado of ["conferindo", "corrigindo"] as const) {
    assert.equal(
      erroDaCampanha({
        tipo: "anuncio",
        peca: pecaAnuncio({ valido: false, erro: ERRO_DO_SERVIDOR }),
        conferencia: { estado, volta: 1 },
        status: "concluida",
      }),
      null,
      `${estado} nao pode virar veredito`,
    );
  }
});

test("sessao que morreu no meio tambem fecha o veredito, sem esperar volta", () => {
  for (const status of ["erro", "parada"] as const) {
    assert.equal(
      erroDaCampanha({
        tipo: "anuncio",
        peca: pecaAnuncio({ valido: false, erro: ERRO_DO_SERVIDOR }),
        conferencia: undefined,
        status,
      }),
      ERRO_DO_SERVIDOR,
    );
  }
});

test("sessao ainda rodando nao vira veredito", () => {
  assert.equal(
    erroDaCampanha({
      tipo: "anuncio",
      peca: pecaAnuncio({ valido: false, erro: ERRO_DO_SERVIDOR }),
      conferencia: undefined,
      status: "rodando",
    }),
    null,
  );
});

test("campanha valida nao tem veredito de erro", () => {
  assert.equal(
    erroDaCampanha({
      tipo: "anuncio",
      peca: pecaAnuncio({ valido: true }),
      conferencia: { estado: "aprovada", volta: 0 },
      status: "concluida",
    }),
    null,
  );
});

test("invalido sem detalhe ainda diz alguma coisa, nunca fica mudo", () => {
  assert.equal(
    erroDaCampanha({
      tipo: "anuncio",
      peca: pecaAnuncio({ valido: false }),
      conferencia: { estado: "pendencias", volta: 2 },
      status: "concluida",
    }),
    ERRO_CAMPANHA_SEM_DETALHE,
  );
});

test("site e carrossel nunca passam por este veredito", () => {
  assert.equal(
    erroDaCampanha({
      tipo: "site",
      peca: pecaAnuncio({ valido: false, erro: ERRO_DO_SERVIDOR }),
      conferencia: undefined,
      status: "concluida",
    }),
    null,
  );
});

// -------------------------------------------------------------- os rotulos

// O laco do anuncio usa o MESMO campo de conferencia do laco do site. Sem
// rotulo proprio, o flutuante diria "Conferindo o site" enquanto o Hub confere
// uma campanha de Google Ads.
test("o rotulo da conferencia fala da campanha, e nao do site", () => {
  assert.equal(
    rotuloConferencia({ estado: "conferindo", volta: 0 }, false, "anuncio"),
    "Conferindo a campanha",
  );
  assert.equal(
    rotuloConferencia({ estado: "corrigindo", volta: 2 }, false, "anuncio"),
    "Corrigindo a campanha (volta 2 de 2)",
  );
  assert.equal(
    rotuloConferencia({ estado: "conferindo", volta: 0 }, true, "anuncio"),
    MENSAGEM_CONFERENCIA_DEMOROU_ANUNCIO,
  );
  assert.equal(rotuloConferencia({ estado: "aprovada", volta: 1 }, false, "anuncio"), null);
});
