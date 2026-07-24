import { createHmac } from "node:crypto";

const core = process.env.CORE_URL ?? "http://127.0.0.1:4600";
const hub = process.env.HUB_URL ?? "http://127.0.0.1:4601";
const execucao = Date.now();
const emailOperador = process.env.SMOKE_OPERADOR_EMAIL ?? "operador-smoke@vkos.local";
const senhaOperador = process.env.SMOKE_OPERADOR_SENHA ?? "Teste-VKOS-3-seguro";
const emailCliente = process.env.SMOKE_CLIENTE_EMAIL ?? `cliente-smoke+${execucao}@vkos.local`;
const senhaCliente = process.env.SMOKE_CLIENTE_SENHA ?? "Cliente-VKOS-3-seguro";

function base32(segredo) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const caractere of segredo) bits += alfabeto.indexOf(caractere).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(segredo) {
  const contador = Math.floor(Date.now() / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(contador));
  const hash = createHmac("sha1", base32(segredo)).update(buffer).digest();
  const deslocamento = hash.at(-1) & 15;
  return String((hash.readUInt32BE(deslocamento) & 0x7fffffff) % 1000000).padStart(6, "0");
}

async function chamar(base, caminho, { cookie, metodo = "GET", corpo } = {}) {
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await resposta.json().catch(() => ({}));
  return { status: resposta.status, dados, cookie: resposta.headers.get("set-cookie")?.split(";")[0] };
}

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

const estado = await chamar(core, "/api/auth/estado");
exigir(estado.status === 200, `Estado de autenticacao falhou: ${JSON.stringify(estado.dados)}`);
const coreLocal = estado.dados.obrigatoria === false;
let segredo = process.env.SMOKE_TOTP_SECRET;
if (!coreLocal && estado.dados.precisaBootstrap) {
  const bootstrap = await chamar(core, "/api/auth/bootstrap", { metodo: "POST", corpo: { email: emailOperador, senha: senhaOperador } });
  exigir(bootstrap.status === 201, `Bootstrap falhou: ${JSON.stringify(bootstrap.dados)}`);
  exigir(bootstrap.cookie, "Bootstrap nao abriu a sessao do operador.");
  await chamar(core, "/api/auth/logout", { cookie: bootstrap.cookie, metodo: "POST" });
}

let loginCore = { status: 200, cookie: undefined, dados: { modo: "local" } };
if (!coreLocal) {
  if (estado.dados.totpAtivo) {
    exigir(segredo, "Informe SMOKE_TOTP_SECRET porque o operador esta com TOTP ativo.");
    loginCore = await chamar(core, "/api/auth/login", { metodo: "POST", corpo: { email: emailOperador, senha: senhaOperador, codigoTotp: totp(segredo) } });
  } else {
    loginCore = await chamar(core, "/api/auth/login", { metodo: "POST", corpo: { email: emailOperador, senha: senhaOperador } });
  }
  exigir(loginCore.status === 200 && loginCore.cookie, `Login CORE falhou: ${JSON.stringify(loginCore.dados)}`);
}

let totpOpcionalValidado = coreLocal || Boolean(estado.dados.totpAtivo);
if (!coreLocal && !estado.dados.totpAtivo) {
  const iniciarTotp = await chamar(core, "/api/auth/totp/iniciar", { cookie: loginCore.cookie, metodo: "POST" });
  exigir(iniciarTotp.status === 200 && iniciarTotp.dados.segredoTotp, `Inicio TOTP falhou: ${JSON.stringify(iniciarTotp.dados)}`);
  segredo = iniciarTotp.dados.segredoTotp;
  const confirmarTotp = await chamar(core, "/api/auth/totp/confirmar", {
    cookie: loginCore.cookie,
    metodo: "POST",
    corpo: { segredoTotp: segredo, codigoTotp: totp(segredo) },
  });
  exigir(confirmarTotp.status === 200, `Confirmacao TOTP falhou: ${JSON.stringify(confirmarTotp.dados)}`);
  await chamar(core, "/api/auth/logout", { cookie: loginCore.cookie, metodo: "POST" });
  loginCore = await chamar(core, "/api/auth/login", {
    metodo: "POST",
    corpo: { email: emailOperador, senha: senhaOperador, codigoTotp: totp(segredo) },
  });
  exigir(loginCore.status === 200 && loginCore.cookie, `Login CORE com TOTP falhou: ${JSON.stringify(loginCore.dados)}`);
  const desativarTotp = await chamar(core, "/api/auth/totp", { cookie: loginCore.cookie, metodo: "DELETE" });
  exigir(desativarTotp.status === 200, `Desativacao TOTP falhou: ${JSON.stringify(desativarTotp.dados)}`);
  totpOpcionalValidado = true;
}

const modelo = await chamar(core, "/api/admin/modelos", {
  cookie: loginCore.cookie,
  metodo: "POST",
  corpo: { nome: `Smoke ${execucao}`, descricao: "Modelo do ensaio automatizado", motorPadrao: process.env.SMOKE_MOTOR ?? "gemini", semente: "vkos2", features: ["cockpit", "crm"] },
});
exigir(modelo.status === 201, `Modelo falhou: ${JSON.stringify(modelo.dados)}`);
exigir(modelo.dados.modelo.motor_padrao === (process.env.SMOKE_MOTOR ?? "gemini"), "Modelo nao preservou o motor solicitado.");

const workspace = await chamar(core, "/api/admin/workspaces", {
  cookie: loginCore.cookie,
  metodo: "POST",
  corpo: { nome: `Cliente Smoke ${execucao}`, modeloId: modelo.dados.modelo.id },
});
exigir(workspace.status === 201, `Workspace falhou: ${JSON.stringify(workspace.dados)}`);
exigir(workspace.dados.workspace.motor === "gemini", "Workspace novo nao nasceu com Gemini.");
const workspaceId = workspace.dados.workspace.id;

const convite = await chamar(core, `/api/admin/workspaces/${workspaceId}/convites`, { cookie: loginCore.cookie, metodo: "POST", corpo: { email: emailCliente } });
exigir(convite.status === 201, `Convite falhou: ${JSON.stringify(convite.dados)}`);
const emailRevogacao = `revogar-smoke+${execucao}@vkos.local`;
const conviteRevogacao = await chamar(core, `/api/admin/workspaces/${workspaceId}/convites`, {
  cookie: loginCore.cookie,
  metodo: "POST",
  corpo: { email: emailRevogacao },
});
exigir(conviteRevogacao.status === 201, `Segundo convite falhou: ${JSON.stringify(conviteRevogacao.dados)}`);
let listaConvites = await chamar(core, `/api/admin/workspaces/${workspaceId}/convites`, { cookie: loginCore.cookie });
exigir(listaConvites.status === 200, `Lista de convites falhou: ${JSON.stringify(listaConvites.dados)}`);
const conviteParaRevogar = listaConvites.dados.convites.find((item) => item.email === emailRevogacao);
exigir(conviteParaRevogar?.id && conviteParaRevogar.estado === "pendente", "Convite pendente nao apareceu na listagem.");
const revogacao = await chamar(core, `/api/admin/workspaces/${workspaceId}/convites/${conviteParaRevogar.id}`, {
  cookie: loginCore.cookie,
  metodo: "DELETE",
});
exigir(revogacao.status === 200, `Revogacao falhou: ${JSON.stringify(revogacao.dados)}`);
listaConvites = await chamar(core, `/api/admin/workspaces/${workspaceId}/convites`, { cookie: loginCore.cookie });
exigir(!listaConvites.dados.convites.some((item) => item.email === emailRevogacao), "Convite revogado permaneceu na listagem.");

const token = new URL(convite.dados.convite.url).searchParams.get("token");
exigir(token, "Convite nao devolveu token.");
const aceite = await chamar(hub, "/api/auth/aceitar-convite", { metodo: "POST", corpo: { token: decodeURIComponent(token), senha: senhaCliente } });
exigir(aceite.status === 201, `Aceite falhou: ${JSON.stringify(aceite.dados)}`);

const listaMembros = await chamar(core, `/api/admin/workspaces/${workspaceId}/membros`, { cookie: loginCore.cookie });
exigir(listaMembros.status === 200, `Lista de membros falhou: ${JSON.stringify(listaMembros.dados)}`);
const membroCliente = listaMembros.dados.membros.find((item) => item.email === emailCliente);
exigir(membroCliente?.usuario_id, "Cliente que aceitou o convite nao apareceu entre os membros.");

const loginHub = await chamar(hub, "/api/auth/login", { metodo: "POST", corpo: { email: emailCliente, senha: senhaCliente } });
exigir(loginHub.status === 200 && loginHub.cookie, `Login cliente falhou: ${JSON.stringify(loginHub.dados)}`);
const crmAntes = await chamar(hub, "/api/crm", { cookie: loginHub.cookie });
exigir(crmAntes.status !== 401 && crmAntes.status !== 404, "CRM ativo nao ficou acessivel ao cliente.");

const desligar = await chamar(core, `/api/admin/workspaces/${workspaceId}/features/crm`, { cookie: loginCore.cookie, metodo: "PUT", corpo: { ativa: false } });
exigir(desligar.status === 200, `Flag falhou: ${JSON.stringify(desligar.dados)}`);
const crmDepois = await chamar(hub, "/api/crm", { cookie: loginHub.cookie });
exigir(crmDepois.status === 404, `Feature desligada respondeu ${crmDepois.status}, esperado 404.`);

const removerMembro = await chamar(core, `/api/admin/workspaces/${workspaceId}/membros/${membroCliente.usuario_id}`, {
  cookie: loginCore.cookie,
  metodo: "DELETE",
});
exigir(removerMembro.status === 200, `Remocao de membro falhou: ${JSON.stringify(removerMembro.dados)}`);
const crmSemMembro = await chamar(hub, "/api/crm", { cookie: loginHub.cookie });
exigir([401, 404].includes(crmSemMembro.status), `Sessao removida respondeu ${crmSemMembro.status}, esperado 401 ou 404.`);

console.log(JSON.stringify({
  ok: true,
  modeloId: modelo.dados.modelo.id,
  workspaceId,
  motorPadrao: "gemini",
  isolamentoFeature: true,
  acessoAdmin: true,
  coreLocalSemLogin: coreLocal,
  totpOpcionalValidado,
}));
