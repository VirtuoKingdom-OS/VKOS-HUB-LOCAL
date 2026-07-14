// Catalogo fixo de conexoes MCP que o cliente pode ligar. Cada entrada descreve
// um servico externo, os campos de config que ele pede (tokens) e como montar o
// objeto de servidor MCP que o claude CLI aceita em --mcp-config.
//
// As fontes de cada MCP foram conferidas na internet (julho de 2026). Onde o
// caminho oficial exige login OAuth no navegador (nao serve pro nosso spawn
// headless com token fixo), a entrada fica disponivel: false com nota honesta.

// Um campo de config de um servico (ex: o token de acesso).
export interface CampoConexao {
  // Chave dentro do Record de config salvo no disco.
  chave: string;
  // Rotulo curto mostrado no card.
  rotulo: string;
  // Variavel de ambiente ou header de destino do valor. So informativo pro front.
  chaveEnv?: string;
  // Segredo: mascarado na leitura, olho de revelar no front.
  segredo: boolean;
  // Dica curta de onde tirar o valor.
  dica?: string;
}

// Uma entrada do catalogo. montarServidor so existe nas disponiveis.
export interface EntradaCatalogo {
  id: string;
  nome: string;
  descricao: string;
  disponivel: boolean;
  transporte?: "stdio" | "http";
  campos: CampoConexao[];
  // Fonte pesquisada (pacote npm ou endpoint oficial). Documentacao interna.
  fonte?: string;
  // Monta o objeto do servidor MCP com os segredos reais, pro --mcp-config.
  // Devolve null quando falta config obrigatoria.
  montarServidor?: (config: Record<string, string>) => Record<string, unknown> | null;
}

// Entrada sem a funcao nem a fonte: o que a rota GET expoe ao frontend.
export interface EntradaPublica {
  id: string;
  nome: string;
  descricao: string;
  disponivel: boolean;
  transporte?: "stdio" | "http";
  campos: CampoConexao[];
}

// Le com seguranca o token de um campo, ja aparado.
function token(config: Record<string, string>, chave = "token"): string {
  return (config[chave] ?? "").trim();
}

// O catalogo. Ordem fixa: os quatro servicos principais, depois a vitrine da
// fase 7 (meta e google ads).
const CATALOGO: EntradaCatalogo[] = [
  {
    id: "github",
    nome: "GitHub",
    descricao:
      "Repositorios, issues e pull requests. Usa o servidor oficial remoto da GitHub, autenticado por token de acesso pessoal.",
    disponivel: true,
    transporte: "http",
    campos: [
      {
        chave: "token",
        rotulo: "Token de acesso pessoal",
        chaveEnv: "Authorization: Bearer",
        segredo: true,
        dica: "Crie em github.com, Settings, Developer settings, Personal access tokens.",
      },
    ],
    // O pacote npm @modelcontextprotocol/server-github foi arquivado em maio de
    // 2025. O sucessor oficial (github/github-mcp-server) so roda por Docker ou
    // binario Go, mas expoe o endpoint remoto abaixo, que aceita token pessoal
    // no header Authorization e funciona no nosso spawn headless.
    fonte: "github/github-mcp-server, endpoint remoto https://api.githubcopilot.com/mcp/",
    montarServidor: (config) => {
      const t = token(config);
      if (!t) return null;
      return {
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        headers: { Authorization: `Bearer ${t}` },
      };
    },
  },
  {
    id: "netlify",
    nome: "Netlify",
    descricao:
      "Cria, publica e gerencia sites na Netlify. Servidor oficial @netlify/mcp, rodado por npx com token pessoal.",
    disponivel: true,
    transporte: "stdio",
    campos: [
      {
        chave: "token",
        rotulo: "Token de acesso pessoal",
        chaveEnv: "NETLIFY_PERSONAL_ACCESS_TOKEN",
        segredo: true,
        dica: "Crie em app.netlify.com, User settings, Applications, Personal access tokens.",
      },
    ],
    fonte: "@netlify/mcp (npm), netlify/netlify-mcp",
    montarServidor: (config) => {
      const t = token(config);
      if (!t) return null;
      return {
        command: "npx",
        args: ["-y", "@netlify/mcp"],
        env: { NETLIFY_PERSONAL_ACCESS_TOKEN: t },
      };
    },
  },
  // Vercel saiu do catalogo em 2026-07-14 (ordem do Jesse): o servidor oficial
  // (mcp.vercel.com) so entra por OAuth de navegador, sem token fixo, entao nao
  // tem como ligar no nosso spawn headless. Se um dia aceitarem token, volta.
  {
    id: "notion",
    nome: "Notion",
    descricao:
      "Le e escreve paginas e bancos do Notion. Servidor @notionhq/notion-mcp-server, rodado por npx com um token de integracao interna.",
    disponivel: true,
    transporte: "stdio",
    campos: [
      {
        chave: "token",
        rotulo: "Token de integracao interna",
        chaveEnv: "NOTION_TOKEN",
        segredo: true,
        dica: "Crie uma integracao em notion.so/my-integrations e compartilhe suas paginas com ela.",
      },
    ],
    // A Notion recomenda a versao remota por OAuth, mas o pacote local ainda
    // funciona com token de integracao, que serve ao nosso spawn headless.
    fonte: "@notionhq/notion-mcp-server (npm), makenotion/notion-mcp-server",
    montarServidor: (config) => {
      const t = token(config);
      if (!t) return null;
      return {
        command: "npx",
        args: ["-y", "@notionhq/notion-mcp-server"],
        env: { NOTION_TOKEN: t },
      };
    },
  },
  {
    id: "meta",
    nome: "Meta (WhatsApp e Instagram)",
    descricao: "precisa de app e credenciais proprias; entra na fase 7",
    disponivel: false,
    campos: [],
  },
  {
    id: "googleads",
    nome: "Google Ads",
    descricao: "precisa de app e credenciais proprias; entra na fase 7",
    disponivel: false,
    campos: [],
  },
];

// Lista completa do catalogo (uso interno do modulo).
export function listaCatalogo(): EntradaCatalogo[] {
  return CATALOGO;
}

// Acha uma entrada por id, ou null.
export function entradaCatalogo(id: string): EntradaCatalogo | null {
  return CATALOGO.find((e) => e.id === id) ?? null;
}

// Versao serializavel do catalogo, sem a funcao montarServidor nem a fonte.
export function catalogoPublico(): EntradaPublica[] {
  return CATALOGO.map((e) => ({
    id: e.id,
    nome: e.nome,
    descricao: e.descricao,
    disponivel: e.disponivel,
    transporte: e.transporte,
    campos: e.campos,
  }));
}
