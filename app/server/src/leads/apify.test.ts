import assert from "node:assert/strict";
import test from "node:test";

import { salvarConexoes } from "../conexoes/estado.js";
import { montarConfigMcp } from "../conexoes/mcp.js";
import {
  apagarPastaDadosWorkspace,
  pastaDadosWorkspace,
} from "../workspaces/estado.js";
import {
  buscarLeads,
  ErroLeads,
  LIMITE_RESULTADOS,
  normalizarRespostaApify,
} from "./apify.js";

const fixtureApifyDocumentado = [{
  title: "Kim's Island",
  categoryName: "Chinese restaurant",
  address: "175 Main St, Staten Island, NY 10307",
  website: "http://kimsislandsi.com/",
  phone: "(718) 356-5168",
  phoneUnformatted: "+17183565168",
  totalScore: 4.5,
  placeId: "ChIJJQz5EZzKw4kRCZ95UajbyGw",
  reviewsCount: 91,
  scrapedAt: "2024-11-28T12:28:50.519Z",
  emails: ["contato@kimsislandsi.com"],
}];

// A normalização de telefone virou regra única do Hub, em util/telefone.ts.
// Os casos dela estão em util/telefone.test.ts.

test("normaliza o JSON documentado do Actor para o contrato de leads", () => {
  assert.deepEqual(normalizarRespostaApify(fixtureApifyDocumentado), [{
    nome: "Kim's Island",
    endereco: "175 Main St, Staten Island, NY 10307",
    telefone: "(718) 356-5168",
    site: "http://kimsislandsi.com/",
    email: "contato@kimsislandsi.com",
    categoria: "Chinese restaurant",
    nota: 4.5,
    totalAvaliacoes: 91,
    placeId: "ChIJJQz5EZzKw4kRCZ95UajbyGw",
  }]);
});

test("buscarLeads exige uma conexão Apify habilitada", async () => {
  const workspaceId = `w-teste-leads-sem-conexao-${Math.random().toString(36).slice(2, 8)}`;
  await assert.rejects(
    () => buscarLeads(workspaceId, "padaria em Belo Horizonte"),
    (erro: unknown) =>
      erro instanceof ErroLeads
      && erro.statusHttp === 400
      && /Conecte a Apify/i.test(erro.message),
  );
});

test("conexão Apify nunca entra na configuração MCP", () => {
  const workspaceId = `w-teste-leads-sem-mcp-${Math.random().toString(36).slice(2, 8)}`;
  salvarConexoes(workspaceId, {
    servidores: {
      apify: { habilitado: true, config: { token: "token-teste" } },
    },
  });
  try {
    assert.equal(montarConfigMcp(workspaceId), null);
  } finally {
    apagarPastaDadosWorkspace(workspaceId);
  }
});

test("busca usa o endpoint síncrono com teto, idioma e token só no header", async () => {
  const workspaceId = `w-teste-leads-apify-${Math.random().toString(36).slice(2, 8)}`;
  salvarConexoes(workspaceId, {
    servidores: {
      apify: { habilitado: true, config: { token: "apify_api_token_secreto" } },
    },
  });

  try {
    const fetchFalso = (async (entrada: string | URL | Request, init?: RequestInit) => {
      const url = String(entrada);
      assert.match(url, /run-sync-get-dataset-items/);
      assert.match(url, new RegExp(`maxItems=${LIMITE_RESULTADOS}`));
      assert.equal(url.includes("apify_api_token_secreto"), false);
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer apify_api_token_secreto");
      const corpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.deepEqual(corpo.searchStringsArray, ["padaria em Belo Horizonte"]);
      assert.equal(corpo.maxCrawledPlacesPerSearch, LIMITE_RESULTADOS);
      assert.equal(corpo.language, "pt-BR");
      assert.equal(corpo.locationQuery, "Belo Horizonte, MG");
      assert.equal(corpo.scrapeContacts, true);
      assert.equal(corpo.maximumLeadsEnrichmentRecords, 0);
      return new Response(JSON.stringify(fixtureApifyDocumentado), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const leads = await buscarLeads(
      workspaceId,
      "padaria em Belo Horizonte",
      { localizacao: "Belo Horizonte, MG", limite: 40, buscarEmails: true },
      fetchFalso,
    );
    assert.equal(leads.length, 1);
    assert.equal(leads[0].placeId, "ChIJJQz5EZzKw4kRCZ95UajbyGw");
  } finally {
    apagarPastaDadosWorkspace(workspaceId);
    assert.equal(pastaDadosWorkspace(workspaceId).includes(workspaceId), true);
  }
});

test("traduz falta de crédito da Apify sem devolver a mensagem crua", async () => {
  const workspaceId = `w-teste-leads-credito-${Math.random().toString(36).slice(2, 8)}`;
  salvarConexoes(workspaceId, {
    servidores: {
      apify: { habilitado: true, config: { token: "token-teste" } },
    },
  });

  try {
    const fetchFalso = (async () => new Response(JSON.stringify({
      error: {
        type: "not-enough-usage-to-run-paid-actor",
        message: "Not enough usage available for token-teste",
      },
    }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

    await assert.rejects(
      () => buscarLeads(workspaceId, "clinica em Contagem", {}, fetchFalso),
      (erro: unknown) =>
        erro instanceof ErroLeads
        && erro.statusHttp === 502
        && erro.message === "Sua conta Apify está sem crédito.",
    );
  } finally {
    apagarPastaDadosWorkspace(workspaceId);
  }
});
