// Cliente REST das conexoes MCP. Fetch proprio, erros no formato { erro }.
// Todas as chamadas passam pelo proxy do Vite (mesma origem).

// Um campo de config de um servico (ex: o token).
export interface CampoConexao {
  chave: string;
  rotulo: string;
  chaveEnv?: string;
  segredo: boolean;
  dica?: string;
}

// Uma entrada do catalogo, como o backend a expoe (sem funcao, sem segredo real).
export interface EntradaConexao {
  id: string;
  nome: string;
  descricao: string;
  disponivel: boolean;
  transporte?: "stdio" | "http";
  campos: CampoConexao[];
}

// Estado de um servidor: ligado ou nao, config com os segredos mascarados.
// contaEmail e conectado so vem no Google Calendar (fluxo OAuth): contaEmail e a
// conta autorizada (legivel), conectado sinaliza que ha refresh token salvo.
export interface EstadoServidor {
  habilitado: boolean;
  config: Record<string, string>;
  contaEmail?: string;
  conectado?: boolean;
}

// A resposta do GET: catalogo mais o estado do workspace ativo.
export interface RespostaConexoes {
  catalogo: EntradaConexao[];
  estado: { servidores: Record<string, EstadoServidor> };
}

// Erro de rede: servidor fora do ar.
export class ErroRedeConexoes extends Error {
  constructor(mensagem = "Servidor fora do ar.") {
    super(mensagem);
    this.name = "ErroRedeConexoes";
  }
}

// Erro de resposta do servidor (status fora do 2xx), com a mensagem { erro }.
export class ErroConexoes extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroConexoes";
    this.status = status;
  }
}

async function pedir<T>(url: string, opcoes?: RequestInit): Promise<T> {
  let resposta: Response;
  const cabecalhos = opcoes?.body
    ? { "Content-Type": "application/json", ...(opcoes.headers ?? {}) }
    : opcoes?.headers;
  try {
    resposta = await fetch(url, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new ErroRedeConexoes();
  }

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo?.erro) mensagem = corpo.erro;
    } catch {
      // corpo sem json, mantem a mensagem padrao
    }
    throw new ErroConexoes(mensagem, resposta.status);
  }

  return (await resposta.json()) as T;
}

// Catalogo mais o estado do workspace ativo (segredos mascarados).
export function obterConexoes(): Promise<RespostaConexoes> {
  return pedir<RespostaConexoes>("/api/conexoes");
}

// Liga ou desliga um servidor e salva a config. Devolve o estado novo mascarado.
export function salvarConexao(
  id: string,
  dados: { habilitado: boolean; config?: Record<string, string> }
): Promise<{ servidor: EstadoServidor }> {
  return pedir<{ servidor: EstadoServidor }>(`/api/conexoes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

// Confirma no servico remoto que o token salvo e aceito. O segredo nunca volta
// para o navegador: o backend usa diretamente a copia local do workspace.
export function testarConexao(
  id: string
): Promise<{ ok: boolean; conta?: string }> {
  return pedir<{ ok: boolean; conta?: string }>(
    `/api/conexoes/${encodeURIComponent(id)}/testar`,
    { method: "POST" }
  );
}

// Inicia o fluxo OAuth do Google Calendar: o backend abre o navegador na tela de
// consentimento e so responde quando o usuario autoriza (ou no timeout honesto).
// A chamada pode levar minutos: sem timeout do lado do front, quem corta e o
// backend (3 min). Devolve a conta conectada. Erro chega no formato { erro }.
export function conectarGoogleCalendar(): Promise<{ contaEmail: string }> {
  return pedir<{ contaEmail: string }>("/api/conexoes/googlecalendar/conectar", {
    method: "POST",
  });
}

// Desconecta o Google Calendar: revoga o token no Google e limpa o refresh token
// e a conta salvos, mantendo Client ID e Client Secret pra reconectar sem recolar.
export function desconectarGoogleCalendar(): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>("/api/conexoes/googlecalendar/desconectar", {
    method: "POST",
  });
}
