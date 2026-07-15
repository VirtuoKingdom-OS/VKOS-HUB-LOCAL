// OAuth do Google para o Google Calendar. Fluxo loopback de app instalado
// (Desktop): o backend abre a tela de consentimento no navegador padrao, sobe um
// listener HTTP temporario numa porta efemera de 127.0.0.1, recebe o code, troca
// por tokens com PKCE e guarda { clientId, clientSecret, refreshToken, contaEmail }
// no conexoes.json do workspace, pelo modulo conexoes/estado.ts existente.
//
// Os segredos vivem SO em app/dados/workspaces/<id>/conexoes.json, como todos os
// segredos do hub. Nada sobe pra lugar nenhum.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";

import { lerConexoes, salvarConexoes } from "../conexoes/estado.js";
import { definirSincronizarGoogle } from "../calendario/eventosLocais.js";

// Id da conexao no catalogo e no conexoes.json.
export const ID_CONEXAO_GOOGLE = "googlecalendar";

// Escopo minimo: eventos do calendario, mais openid e email pra capturar a conta
// conectada pelo id_token. O prompt=consent forca o Google a devolver refresh_token.
const ESCOPO = "https://www.googleapis.com/auth/calendar.events openid email";

// Endpoints do Google. Mutaveis SO pra teste (mock local do endpoint de token),
// via configurarEndpointsInternos. Em producao ficam nos valores oficiais.
const endpoints = {
  autorizacao: "https://accounts.google.com/o/oauth2/v2/auth",
  token: "https://oauth2.googleapis.com/token",
  revogacao: "https://oauth2.googleapis.com/revoke",
};

// Timeout do gesto de autorizacao no navegador: 3 minutos.
const TIMEOUT_CALLBACK_MS = 3 * 60 * 1000;

// Margem de seguranca do cache de access token: renova 60s antes de expirar.
const MARGEM_EXPIRACAO_MS = 60 * 1000;

// Erro de dominio do OAuth: carrega o status HTTP que a rota deve responder.
export class ErroOAuth extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroOAuth";
    this.status = status;
  }
}

// Tokens que o endpoint de token do Google devolve. Nem todo campo vem sempre.
interface RespostaToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
}

// Config da conexao googlecalendar de um workspace.
type ConfigGoogle = {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  contaEmail?: string;
};

// Le a config da conexao googlecalendar do workspace.
function lerConfigGoogle(workspaceId: string): ConfigGoogle {
  const bruto = lerConexoes(workspaceId).servidores[ID_CONEXAO_GOOGLE]?.config ?? {};
  return bruto as ConfigGoogle;
}

// Mescla campos na config da conexao googlecalendar, preservando o resto e o
// estado de habilitado. Escrita atomica pelo modulo de estado das conexoes.
function salvarConfigGoogle(
  workspaceId: string,
  patch: Record<string, string>,
  habilitado?: boolean,
): void {
  const estado = lerConexoes(workspaceId);
  const atual = estado.servidores[ID_CONEXAO_GOOGLE] ?? { habilitado: false, config: {} };
  estado.servidores[ID_CONEXAO_GOOGLE] = {
    habilitado: habilitado ?? atual.habilitado,
    config: { ...atual.config, ...patch },
  };
  salvarConexoes(workspaceId, estado);
}

// PKCE S256: gera o verifier aleatorio e o challenge (sha256 em base64url).
function gerarPkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

// Base64url sem padding, do jeito que o OAuth pede.
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Decodifica o payload de um JWT sem validar assinatura (id_token vem do proprio
// Google pelo canal https local, entao aqui so lemos o email). Nunca lanca.
function emailDoIdToken(idToken: string | undefined): string {
  if (!idToken) return "";
  try {
    const partes = idToken.split(".");
    if (partes.length < 2) return "";
    const payload = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : "";
  } catch {
    return "";
  }
}

// Abre a URL no navegador padrao do Windows, sem travar nem herdar stdio.
// NAO usar "cmd /c start <url>": o cmd corta a URL no primeiro "&" (trata como
// separador de comando), o Google recebia so o client_id e respondia
// "Required parameter is missing: response_type". O rundll32 recebe a URL como
// argumento puro, sem shell no meio, entao os "&" chegam inteiros.
function abrirNavegadorWindows(url: string): void {
  const filho = spawn("rundll32", ["url.dll,FileProtocolHandler", url], {
    detached: true,
    stdio: "ignore",
  });
  filho.unref();
}

// Troca o code de autorizacao pelos tokens (troca inicial, com PKCE). Exposta
// pra teste com mock. Nao persiste nada.
export async function trocarCodePorTokens(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<RespostaToken> {
  const corpo = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code_verifier: params.codeVerifier,
  });
  return postToken(corpo);
}

// Troca o refresh token por um access token novo. Exposta pra teste com mock.
export async function renovarAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<RespostaToken> {
  const corpo = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  return postToken(corpo);
}

// POST no endpoint de token, urlencoded. Traduz erro do Google em ErroOAuth.
async function postToken(corpo: URLSearchParams): Promise<RespostaToken> {
  let resposta: Response;
  try {
    resposta = await fetch(endpoints.token, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: corpo.toString(),
    });
  } catch {
    throw new ErroOAuth("Nao foi possivel falar com o Google. Confira a conexao de internet.", 502);
  }
  const dados = (await resposta.json().catch(() => ({}))) as RespostaToken;
  if (!resposta.ok || dados.error) {
    const detalhe = dados.error_description || dados.error || `HTTP ${resposta.status}`;
    throw new ErroOAuth(`O Google recusou a troca de tokens: ${detalhe}`, 400);
  }
  return dados;
}

// Revoga um refresh token no Google. Tolerante: token ja invalido nao e erro.
export async function revogarToken(token: string): Promise<void> {
  if (!token) return;
  try {
    await fetch(endpoints.revogacao, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
    });
  } catch {
    // Revogacao best effort: se o Google estiver fora, ainda limpamos o local.
  }
}

// Ganchos internos do fluxo de conectar. Producao usa os padroes (navegador real
// e persistencia no conexoes.json). O teste com mock injeta os tres.
interface GanchosConectar {
  abrirNavegador?: (url: string) => void;
  lerCredenciais?: () => { clientId: string; clientSecret: string } | null;
  salvarTokens?: (dados: { refreshToken: string; contaEmail: string }) => void;
}

// Inicia o fluxo completo de conexao e resolve quando o callback chegar. Exige
// clientId e clientSecret ja salvos (o PUT generico salva antes do conectar).
// Devolve o e-mail da conta conectada.
export async function iniciarConexao(
  workspaceId: string,
  ganchos: GanchosConectar = {},
): Promise<{ contaEmail: string }> {
  const credenciais =
    (ganchos.lerCredenciais ?? (() => credenciaisDoWorkspace(workspaceId)))();
  if (!credenciais) {
    throw new ErroOAuth(
      "Salve o Client ID e o Client Secret do Google antes de conectar.",
      400,
    );
  }

  const { verifier, challenge } = gerarPkce();
  const estadoCsrf = base64url(randomBytes(16));

  const { code, redirectUri } = await aguardarCallback(estadoCsrf, (redirect) => {
    const url = montarUrlAutorizacao({
      clientId: credenciais.clientId,
      redirectUri: redirect,
      challenge,
      estado: estadoCsrf,
    });
    (ganchos.abrirNavegador ?? abrirNavegadorWindows)(url);
  });

  const tokens = await trocarCodePorTokens({
    clientId: credenciais.clientId,
    clientSecret: credenciais.clientSecret,
    code,
    redirectUri,
    codeVerifier: verifier,
  });

  if (!tokens.refresh_token) {
    throw new ErroOAuth(
      "O Google nao devolveu o token de renovacao. Revogue o acesso do app na conta Google e conecte de novo.",
      400,
    );
  }

  const contaEmail = emailDoIdToken(tokens.id_token);
  const salvar =
    ganchos.salvarTokens ??
    ((dados: { refreshToken: string; contaEmail: string }) =>
      salvarConfigGoogle(
        workspaceId,
        { refreshToken: dados.refreshToken, contaEmail: dados.contaEmail },
        true,
      ));
  salvar({ refreshToken: tokens.refresh_token, contaEmail });

  // Access token novo ja entra no cache pra primeira chamada nao gastar um refresh.
  if (tokens.access_token && tokens.expires_in) {
    cacheAccessToken.set(workspaceId, {
      token: tokens.access_token,
      expiraEm: Date.now() + tokens.expires_in * 1000,
    });
  }

  return { contaEmail };
}

// Le clientId e clientSecret salvos do workspace, ou null se faltar algum.
function credenciaisDoWorkspace(
  workspaceId: string,
): { clientId: string; clientSecret: string } | null {
  const cfg = lerConfigGoogle(workspaceId);
  const clientId = (cfg.clientId ?? "").trim();
  const clientSecret = (cfg.clientSecret ?? "").trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// Monta a URL de consentimento do Google com PKCE e access_type offline.
function montarUrlAutorizacao(params: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  estado: string;
}): string {
  const q = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: ESCOPO,
    code_challenge: params.challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
    state: params.estado,
  });
  return `${endpoints.autorizacao}?${q.toString()}`;
}

// Sobe o listener loopback numa porta efemera, dispara o abrir do navegador com a
// redirect_uri real e resolve com o code quando o Google redirecionar de volta.
function aguardarCallback(
  estadoCsrf: string,
  aoOuvir: (redirectUri: string) => void,
): Promise<{ code: string; redirectUri: string }> {
  return new Promise((resolve, reject) => {
    const servidor = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") {
        res.statusCode = 404;
        res.end();
        return;
      }
      const code = url.searchParams.get("code");
      const erro = url.searchParams.get("error");
      const estado = url.searchParams.get("state");

      res.setHeader("content-type", "text/html; charset=utf-8");
      if (erro || !code || estado !== estadoCsrf) {
        res.statusCode = 400;
        res.end(paginaRetorno(false));
        encerrar();
        reject(
          new ErroOAuth(
            erro
              ? `Autorizacao negada no navegador: ${erro}`
              : "Retorno do Google invalido. Tente conectar de novo.",
            400,
          ),
        );
        return;
      }
      res.statusCode = 200;
      res.end(paginaRetorno(true));
      encerrar();
      resolve({ code, redirectUri });
    });

    let redirectUri = "";
    let temporizador: NodeJS.Timeout;

    function encerrar(): void {
      clearTimeout(temporizador);
      servidor.close();
    }

    servidor.on("error", (e) => {
      clearTimeout(temporizador);
      reject(new ErroOAuth(`Nao foi possivel abrir o listener local: ${e.message}`, 500));
    });

    servidor.listen(0, "127.0.0.1", () => {
      const endereco = servidor.address();
      if (!endereco || typeof endereco === "string") {
        encerrar();
        reject(new ErroOAuth("Nao foi possivel resolver a porta local.", 500));
        return;
      }
      redirectUri = `http://127.0.0.1:${endereco.port}/callback`;
      temporizador = setTimeout(() => {
        encerrar();
        reject(
          new ErroOAuth(
            "Tempo esgotado esperando a autorizacao no navegador. Tente conectar de novo.",
            408,
          ),
        );
      }, TIMEOUT_CALLBACK_MS);
      aoOuvir(redirectUri);
    });
  });
}

// Pagina simples de retorno mostrada no navegador depois do consentimento.
function paginaRetorno(ok: boolean): string {
  const titulo = ok ? "Conectado" : "Nao deu certo";
  const texto = ok
    ? "Conectado. Levando voce pro Calendario..."
    : "Nao foi possivel conectar. Volte pro VKOS Hub e tente de novo.";
  // No sucesso, a aba se redireciona sozinha pro Calendario do hub (porta 4600,
  // a que serve o app compilado). O link manual fica de reserva.
  const redirecionar = ok
    ? `<meta http-equiv="refresh" content="1;url=http://localhost:4600/#/calendario">`
    : "";
  const linkReserva = ok
    ? `<p style="margin-top:12px"><a href="http://localhost:4600/#/calendario" style="color:#00C896">Abrir o Calendario</a></p>`
    : "";
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${redirecionar}
<title>${titulo}</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#14161a; color:#e8eaed; font-family:system-ui, sans-serif; }
  .cartao { text-align:center; padding:40px 48px; }
  .marca { color:#00C896; font-size:14px; letter-spacing:2px; text-transform:uppercase; margin-bottom:16px; }
  h1 { font-size:22px; font-weight:600; margin:0 0 8px; }
  p { color:#a8adb4; margin:0; }
</style></head>
<body><div class="cartao"><div class="marca">VKOS Hub</div><h1>${titulo}</h1><p>${texto}</p>${linkReserva}</div></body></html>`;
}

// Cache em memoria de access token por workspace, com a expiracao.
const cacheAccessToken = new Map<string, { token: string; expiraEm: number }>();

// Devolve um access token valido pro workspace. Usa o cache ate 60s antes de
// expirar; senao troca o refresh token por um novo. Lanca ErroOAuth se a conexao
// nao esta configurada (sem refresh token).
export async function tokenDeAcesso(workspaceId: string): Promise<string> {
  const cache = cacheAccessToken.get(workspaceId);
  if (cache && cache.expiraEm - MARGEM_EXPIRACAO_MS > Date.now()) {
    return cache.token;
  }

  const cfg = lerConfigGoogle(workspaceId);
  const clientId = (cfg.clientId ?? "").trim();
  const clientSecret = (cfg.clientSecret ?? "").trim();
  const refreshToken = (cfg.refreshToken ?? "").trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new ErroOAuth(
      "A conexao com o Google Calendar nao esta configurada. Conecte na tela Conexoes.",
      401,
    );
  }

  const tokens = await renovarAccessToken({ clientId, clientSecret, refreshToken });
  if (!tokens.access_token) {
    throw new ErroOAuth(
      "A conexao com o Google nao esta ativa (expirou ou nunca foi conectada). Conecte na tela Conexoes.",
      401,
    );
  }
  const expiraEm = Date.now() + (tokens.expires_in ?? 3600) * 1000;
  cacheAccessToken.set(workspaceId, { token: tokens.access_token, expiraEm });
  return tokens.access_token;
}

// Desconecta: revoga o refresh token no Google e volta a conexao ao ZERO. Limpa a
// config INTEIRA da conexao googlecalendar (clientId, clientSecret, refreshToken e
// contaEmail somem) e marca habilitado false. Tambem desliga a sincronizacao do
// calendario com o Google, se estava ligada. Reconectar depois pede as chaves de
// novo, de proposito: desconectar e nao deixar rastro.
export async function desconectar(workspaceId: string): Promise<void> {
  const cfg = lerConfigGoogle(workspaceId);
  const refreshToken = (cfg.refreshToken ?? "").trim();
  await revogarToken(refreshToken);
  cacheAccessToken.delete(workspaceId);
  // Zera a config da conexao googlecalendar por inteiro.
  const estado = lerConexoes(workspaceId);
  estado.servidores[ID_CONEXAO_GOOGLE] = { habilitado: false, config: {} };
  salvarConexoes(workspaceId, estado);
  // Desliga a sincronizacao do calendario com o Google (se estava ligada).
  definirSincronizarGoogle(workspaceId, false);
}

// SO PARA TESTE: aponta os endpoints do OAuth pra um servidor mock local. Nunca
// chamada em producao.
export function configurarEndpointsInternos(novos: Partial<typeof endpoints>): void {
  Object.assign(endpoints, novos);
}
