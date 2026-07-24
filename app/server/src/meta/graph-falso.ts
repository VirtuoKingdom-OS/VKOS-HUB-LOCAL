import { createServer, type Server } from "node:http";

const permissoes = [
  "instagram_basic",
  "instagram_manage_insights",
  "ads_read",
  "pages_read_engagement",
  "read_insights",
  "business_management",
];

function insights(nomes: string[]) {
  return {
    data: nomes.map((name, indice) => ({
      name,
      values: [{ value: 1200 + indice * 137 }],
    })),
  };
}

function responder(caminho: string, parametros: URLSearchParams): {
  status?: number;
  corpo: unknown;
} {
  if (parametros.get("access_token") === "token-invalido") {
    return { status: 401, corpo: { error: { code: 190, message: "Invalid token" } } };
  }
  if (parametros.get("access_token") === "sem-permissao") {
    return { status: 403, corpo: { error: { code: 10, message: "Permission denied" } } };
  }
  if (parametros.get("access_token") === "limite") {
    return { status: 429, corpo: { error: { code: 4, message: "Rate limit" } } };
  }
  if (caminho === "me") return { corpo: { id: "sistema-1", name: "VirtuoKingdom Sistema" } };
  if (caminho === "me/permissions") {
    return { corpo: { data: permissoes.map((permission) => ({ permission, status: "granted" })) } };
  }
  if (caminho.endsWith("/owned_instagram_accounts")) {
    return { corpo: { data: [{ id: "178400000001", name: "Virtuo Cliente", username: "virtuocliente" }] } };
  }
  if (caminho.endsWith("/client_instagram_accounts")) return { corpo: { data: [] } };
  if (caminho.endsWith("/owned_ad_accounts")) {
    return { corpo: { data: [{ id: "act_123456789", name: "Anuncios Cliente" }] } };
  }
  if (caminho.endsWith("/client_ad_accounts")) return { corpo: { data: [] } };
  if (caminho.endsWith("/owned_pages")) {
    return { corpo: { data: [{ id: "102900000001", name: "Pagina Cliente" }] } };
  }
  if (caminho.endsWith("/client_pages")) return { corpo: { data: [] } };
  if (caminho === "business-1") return { corpo: { id: "business-1", name: "VirtuoKingdom" } };

  if (caminho === "178400000001") {
    return { corpo: { id: caminho, name: "Virtuo Cliente", username: "virtuocliente", followers_count: 8450 } };
  }
  if (caminho === "178400000001/insights") {
    return { corpo: insights((parametros.get("metric") ?? "").split(",")) };
  }
  if (caminho === "178400000001/media") {
    return {
      corpo: {
        data: Array.from({ length: 6 }, (_, indice) => ({
          id: `ig-post-${indice + 1}`,
          caption: `Conteudo de demonstracao ${indice + 1}`,
          media_type: indice % 2 ? "VIDEO" : "IMAGE",
          media_product_type: indice % 2 ? "REELS" : "FEED",
          timestamp: new Date(Date.now() - indice * 86_400_000).toISOString(),
          permalink: "https://www.instagram.com/",
          like_count: 260 - indice * 18,
          comments_count: 31 - indice,
        })),
      },
    };
  }
  if (/^ig-post-\d+\/insights$/.test(caminho)) {
    return { corpo: insights((parametros.get("metric") ?? "").split(",")) };
  }
  if (caminho === "act_123456789/insights") {
    return {
      corpo: {
        data: Array.from({ length: 37 }, (_, indice) => ({
          campaign_id: indice % 2 ? "campanha-2" : "campanha-1",
          campaign_name: indice % 2 ? "Reconhecimento" : "Captacao",
          date_start: new Date(Date.now() - indice * 86_400_000).toISOString().slice(0, 10),
          spend: (38 + indice / 10).toFixed(2),
          impressions: String(5400 + indice * 70),
          reach: String(3900 + indice * 50),
          clicks: String(240 + indice),
          cpc: "0.18",
          cpm: "7.42",
          actions: [{ action_type: "lead", value: String(8 + indice % 5) }],
          cost_per_action_type: [{ action_type: "lead", value: "4.82" }],
        })),
      },
    };
  }
  if (caminho === "102900000001") {
    return { corpo: { id: caminho, name: "Pagina Cliente", followers_count: 12300 } };
  }
  if (caminho === "102900000001/insights") {
    return { corpo: insights((parametros.get("metric") ?? "").split(",")) };
  }
  if (caminho === "102900000001/posts") {
    return {
      corpo: {
        data: Array.from({ length: 5 }, (_, indice) => ({
          id: `fb-post-${indice + 1}`,
          message: `Publicacao da Pagina ${indice + 1}`,
          created_time: new Date(Date.now() - indice * 86_400_000).toISOString(),
          permalink_url: "https://www.facebook.com/",
        })),
      },
    };
  }
  if (/^fb-post-\d+\/insights$/.test(caminho)) {
    return { corpo: insights((parametros.get("metric") ?? "").split(",")) };
  }
  return { status: 404, corpo: { error: { code: 100, message: "Unknown object" } } };
}

export async function iniciarGraphFalso(porta = 0): Promise<{
  servidor: Server;
  base: string;
  fechar: () => Promise<void>;
}> {
  const servidor = createServer((requisicao, resposta) => {
    const url = new URL(requisicao.url ?? "/", "http://127.0.0.1");
    const caminho = url.pathname.replace(/^\/(?:v\d+\.\d+\/)?/, "");
    const resultado = responder(caminho, url.searchParams);
    resposta.statusCode = resultado.status ?? 200;
    resposta.setHeader("Content-Type", "application/json");
    resposta.end(JSON.stringify(resultado.corpo));
  });
  await new Promise<void>((resolver) => servidor.listen(porta, "127.0.0.1", resolver));
  const endereco = servidor.address();
  if (!endereco || typeof endereco === "string") throw new Error("Graph falso nao iniciou.");
  return {
    servidor,
    base: `http://127.0.0.1:${endereco.port}/v25.0`,
    fechar: () => new Promise<void>((resolver, rejeitar) =>
      servidor.close((erro) => erro ? rejeitar(erro) : resolver())),
  };
}
