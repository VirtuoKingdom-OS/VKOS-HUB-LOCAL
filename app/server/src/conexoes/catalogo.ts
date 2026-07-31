// Catalogo fixo de conexoes MCP que o cliente pode ligar. Cada entrada descreve
// um servico externo, os campos de config que ele pede (tokens) e como montar o
// objeto de servidor MCP que o claude CLI aceita em --mcp-config.
//
// As fontes de cada MCP foram conferidas na internet (julho de 2026).

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

// O catalogo. Ordem fixa dos servicos que funcionam nesta versao.
//
// GitHub, Netlify e Notion sairam em 2026-07-26. GitHub e Netlify eram o
// transporte da publicacao integrada de site, que virou exportacao local (ver
// docs/decisoes/2026-07-26-fim-da-publicacao-integrada.md). Notion saiu junto por
// nao alimentar nenhum fluxo do Hub. Vercel ja tinha saido em 2026-07-14: o
// servidor oficial so entra por OAuth de navegador, sem token fixo.
const CATALOGO: EntradaCatalogo[] = [
  {
    id: "apify",
    nome: "Apify (busca de leads)",
    descricao: "Busca negócios no Google Maps com telefone, site e avaliações.",
    disponivel: true,
    transporte: "http",
    campos: [
      {
        chave: "token",
        rotulo: "Token de API",
        segredo: true,
        dica: "Encontre em console.apify.com, em Settings, Integrations",
      },
    ],
    fonte: "Apify REST API v2, Actor compass/crawler-google-places",
  },
  {
    id: "supabase",
    nome: "Formulário do site (Supabase)",
    descricao:
      "Lê quem preencheu o formulário do seu site. A chave fica só nesta máquina.",
    disponivel: true,
    transporte: "http",
    campos: [
      {
        chave: "url",
        rotulo: "URL do projeto",
        segredo: false,
        dica: "No Supabase, em Settings, API, o campo Project URL",
      },
      {
        chave: "chaveServico",
        rotulo: "Chave service_role",
        segredo: true,
        dica: "No mesmo lugar, atrás do botão Reveal. Nunca use a chave anon aqui: ela não lê nada.",
      },
    ],
    fonte: "Supabase PostgREST, tabela public.leads",
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
