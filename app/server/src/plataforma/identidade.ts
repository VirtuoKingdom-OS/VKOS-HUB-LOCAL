import { createHash, randomBytes, randomUUID } from "node:crypto";
import argon2 from "argon2";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import { bancoDisponivel, exigirBanco } from "./banco.js";
import { CATALOGO_FEATURES } from "../features/catalogo.js";
import { MODO, PRODUCAO } from "./modo.js";
import { gerarSegredoTotp, segundoFatorValido, uriTotp, validarTotp } from "./totp.js";
import { contextoAtual } from "./contexto.js";

export const COOKIE_SESSAO = "vkos_sessao";
export const ID_OPERADOR_LOCAL = "00000000-0000-4000-8000-000000000001";
const TEMPO_CORE_MS = 12 * 60 * 60 * 1000;
const TEMPO_HUB_MS = 7 * 24 * 60 * 60 * 1000;
const HASH_SENTINELA = argon2.hash(randomBytes(32).toString("hex"), {
  type: argon2.argon2id,
});

function normalizarEmail(valor: unknown): string {
  return typeof valor === "string"
    ? valor.trim().toLowerCase().slice(0, 254)
    : "";
}

function senhaValida(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length >= 12 && valor.length <= 200;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function novoToken(): string {
  return randomBytes(32).toString("base64url");
}

function opcoesCookie(expiraEm: Date) {
  return {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    expires: expiraEm,
  };
}

async function auditar(
  requisicao: FastifyRequest,
  acao: string,
  alvo: string,
  usuarioId: string | null,
  detalhes: object = {},
): Promise<void> {
  await exigirBanco().query(
    "INSERT INTO auditoria (usuario_id, acao, alvo, detalhes_json, ip) VALUES ($1, $2, $3, $4, $5)",
    [usuarioId, acao, alvo, JSON.stringify(detalhes), requisicao.ip],
  );
}

async function criarSessao(
  usuarioId: string,
): Promise<{ token: string; expiraEm: Date }> {
  const db = exigirBanco();
  const token = novoToken();
  const duracao = MODO === "core" ? TEMPO_CORE_MS : TEMPO_HUB_MS;
  const expiraEm = new Date(Date.now() + duracao);
  const membro = await db.query(
    "SELECT workspace_id FROM membros_workspace WHERE usuario_id = $1 ORDER BY papel = 'dono' DESC, workspace_id LIMIT 1",
    [usuarioId],
  );
  await db.query(
    "INSERT INTO sessoes_web (token_hash, usuario_id, workspace_id, modo, expira_em) VALUES ($1, $2, $3, $4, $5)",
    [
      hashToken(token),
      usuarioId,
      membro.rows[0]?.workspace_id ?? null,
      MODO,
      expiraEm,
    ],
  );
  return { token, expiraEm };
}

export async function garantirOperadorLocal(): Promise<void> {
  if (MODO !== "core" || PRODUCAO || !bancoDisponivel) return;
  await exigirBanco().query(
    `INSERT INTO usuarios (id, email, hash_senha, papel, totp_secret)
     VALUES ($1, 'local@vkos.internal', 'acesso-local-sem-senha', 'operador', NULL)
     ON CONFLICT (id) DO NOTHING`,
    [ID_OPERADOR_LOCAL],
  );
}

async function enviarRedefinicao(email: string, token: string): Promise<void> {
  const base = process.env.RESET_URL_BASE?.replace(/\/$/, "");
  const webhook = process.env.EMAIL_WEBHOOK_URL?.trim();
  if (!base || !webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tipo: "redefinir_senha",
      email,
      url: `${base}/redefinir-senha?token=${encodeURIComponent(token)}`,
    }),
  });
}

export const rotasIdentidade: FastifyPluginAsync = async (app) => {
  app.get("/auth/estado", async () => {
    if (MODO === "core" && !PRODUCAO)
      return {
        precisaBootstrap: false,
        modo: MODO,
        obrigatoria: false,
        totpAtivo: false,
      };
    if (!bancoDisponivel)
      return { precisaBootstrap: false, modo: MODO, obrigatoria: false, totpAtivo: false };
    const total = await exigirBanco().query(
      "SELECT count(*)::int AS total, bool_or(totp_secret IS NOT NULL) AS totp_ativo FROM usuarios WHERE papel = 'operador'",
    );
    return {
      precisaBootstrap: total.rows[0].total === 0,
      modo: MODO,
      obrigatoria: true,
      totpAtivo: total.rows[0].totp_ativo === true,
    };
  });

  app.get("/auth/me", async (_requisicao, resposta) => {
    const contexto = contextoAtual();
    if (!contexto?.usuario)
      return resposta.code(401).send({ erro: "autenticacao necessaria" });
    return {
      usuario: contexto.usuario,
      workspaceId: contexto.workspaceId,
      features: [...contexto.features],
      modo: MODO,
      totpAtivo: contexto.usuario.papel === "operador" && bancoDisponivel
        ? (await exigirBanco().query("SELECT totp_secret IS NOT NULL AS ativo FROM usuarios WHERE id = $1", [contexto.usuario.id])).rows[0]?.ativo === true
        : false,
    };
  });

  app.post("/auth/bootstrap", async (requisicao, resposta) => {
    if (MODO !== "core")
      return resposta.code(404).send({ erro: "rota nao encontrada" });
    const db = exigirBanco();
    const existente = await db.query(
      "SELECT 1 FROM usuarios WHERE papel = 'operador' LIMIT 1",
    );
    if (existente.rowCount)
      return resposta.code(409).send({ erro: "Operador ja configurado." });
    const corpo = (requisicao.body ?? {}) as {
      email?: unknown;
      senha?: unknown;
    };
    const email = normalizarEmail(corpo.email);
    if (!email.includes("@") || !senhaValida(corpo.senha)) {
      return resposta
        .code(400)
        .send({
          erro: "Informe email valido e senha com pelo menos 12 caracteres.",
        });
    }
    const hashSenha = await argon2.hash(corpo.senha, { type: argon2.argon2id });
    const id = randomUUID();
    await db.query(
      "INSERT INTO usuarios (id, email, hash_senha, papel, totp_secret) VALUES ($1, $2, $3, 'operador', NULL)",
      [id, email, hashSenha],
    );
    await auditar(requisicao, "operador.bootstrap", `usuario:${id}`, id);
    const sessao = await criarSessao(id);
    resposta.setCookie(COOKIE_SESSAO, sessao.token, opcoesCookie(sessao.expiraEm));
    return resposta.code(201).send({
      usuario: { id, email, papel: "operador" },
      workspaceId: null,
      features: CATALOGO_FEATURES.map((feature) => feature.id),
      modo: MODO,
      totpAtivo: false,
    });
  });

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (requisicao, resposta) => {
      const corpo = (requisicao.body ?? {}) as {
        email?: unknown;
        senha?: unknown;
        codigoTotp?: unknown;
      };
      const email = normalizarEmail(corpo.email);
      const db = exigirBanco();
      const consulta = await db.query(
        "SELECT id, email, hash_senha, papel, totp_secret, status, bloqueado_ate FROM usuarios WHERE email = $1",
        [email],
      );
      const usuario = consulta.rows[0];
      if (
        !usuario ||
        usuario.status !== "ativo" ||
        (usuario.papel === "operador") !== (MODO === "core")
      ) {
        await argon2.verify(
          await HASH_SENTINELA,
          typeof corpo.senha === "string" ? corpo.senha : "",
        );
        await auditar(
          requisicao,
          "login.falha",
          `email:${email || "invalido"}`,
          null,
          { motivo: "credenciais" },
        );
        return resposta
          .code(401)
          .send({ erro: "Email, senha ou codigo invalidos." });
      }
      if (
        usuario.bloqueado_ate &&
        new Date(usuario.bloqueado_ate).getTime() > Date.now()
      ) {
        await auditar(
          requisicao,
          "login.falha",
          `usuario:${usuario.id}`,
          usuario.id,
          { motivo: "bloqueado" },
        );
        return resposta
          .code(429)
          .send({ erro: "Acesso bloqueado por 15 minutos." });
      }
      const senhaOk =
        senhaValida(corpo.senha) &&
        (await argon2.verify(usuario.hash_senha, corpo.senha));
      const totpOk = segundoFatorValido(
        usuario.papel,
        usuario.totp_secret,
        corpo.codigoTotp,
      );
      if (!senhaOk || !totpOk) {
        await db.query(
          "UPDATE usuarios SET falhas_login = falhas_login + 1, bloqueado_ate = CASE WHEN falhas_login + 1 >= 5 THEN now() + interval '15 minutes' ELSE bloqueado_ate END WHERE id = $1",
          [usuario.id],
        );
        await auditar(
          requisicao,
          "login.falha",
          `usuario:${usuario.id}`,
          usuario.id,
          { motivo: "credenciais" },
        );
        return resposta
          .code(401)
          .send({ erro: "Email, senha ou codigo invalidos." });
      }
      await db.query(
        "UPDATE usuarios SET falhas_login = 0, bloqueado_ate = NULL WHERE id = $1",
        [usuario.id],
      );
      const sessao = await criarSessao(usuario.id);
      resposta.setCookie(
        COOKIE_SESSAO,
        sessao.token,
        opcoesCookie(sessao.expiraEm),
      );
      await auditar(
        requisicao,
        "login.sucesso",
        `usuario:${usuario.id}`,
        usuario.id,
      );
      return {
        usuario: { id: usuario.id, email: usuario.email, papel: usuario.papel },
        workspaceId: null,
        features: usuario.papel === "operador" ? CATALOGO_FEATURES.map((feature) => feature.id) : [...(contextoAtual()?.features ?? [])],
        modo: MODO,
        totpAtivo: Boolean(usuario.totp_secret),
      };
    },
  );

  app.post("/auth/totp/iniciar", async (_requisicao, resposta) => {
    const contexto = contextoAtual();
    if (MODO !== "core" || contexto?.usuario?.papel !== "operador")
      return resposta.code(404).send({ erro: "rota nao encontrada" });
    const segredo = gerarSegredoTotp();
    return {
      segredoTotp: segredo,
      uriTotp: uriTotp(segredo, contexto.usuario.email),
    };
  });

  app.post("/auth/totp/confirmar", async (requisicao, resposta) => {
    const contexto = contextoAtual();
    const corpo = (requisicao.body ?? {}) as { segredoTotp?: unknown; codigoTotp?: unknown };
    if (MODO !== "core" || contexto?.usuario?.papel !== "operador")
      return resposta.code(404).send({ erro: "rota nao encontrada" });
    if (
      typeof corpo.segredoTotp !== "string" ||
      typeof corpo.codigoTotp !== "string" ||
      !validarTotp(corpo.segredoTotp, corpo.codigoTotp)
    ) return resposta.code(400).send({ erro: "Codigo de verificacao invalido." });
    await exigirBanco().query("UPDATE usuarios SET totp_secret = $1 WHERE id = $2", [corpo.segredoTotp, contexto.usuario.id]);
    await auditar(requisicao, "operador.totp_ativado", `usuario:${contexto.usuario.id}`, contexto.usuario.id);
    return { ok: true, totpAtivo: true };
  });

  app.delete("/auth/totp", async (requisicao, resposta) => {
    const contexto = contextoAtual();
    if (MODO !== "core" || contexto?.usuario?.papel !== "operador")
      return resposta.code(404).send({ erro: "rota nao encontrada" });
    await exigirBanco().query("UPDATE usuarios SET totp_secret = NULL WHERE id = $1", [contexto.usuario.id]);
    await auditar(requisicao, "operador.totp_desativado", `usuario:${contexto.usuario.id}`, contexto.usuario.id);
    return { ok: true, totpAtivo: false };
  });

  app.post("/auth/logout", async (requisicao, resposta) => {
    const token = requisicao.cookies[COOKIE_SESSAO];
    if (token)
      await exigirBanco().query(
        "DELETE FROM sessoes_web WHERE token_hash = $1",
        [hashToken(token)],
      );
    resposta.clearCookie(COOKIE_SESSAO, { path: "/" });
    return { ok: true };
  });

  app.post("/auth/aceitar-convite", async (requisicao, resposta) => {
    if (MODO !== "hub")
      return resposta.code(404).send({ erro: "rota nao encontrada" });
    const corpo = (requisicao.body ?? {}) as {
      token?: unknown;
      senha?: unknown;
    };
    if (typeof corpo.token !== "string" || !senhaValida(corpo.senha)) {
      return resposta
        .code(400)
        .send({
          erro: "Convite invalido ou senha com menos de 12 caracteres.",
        });
    }
    const db = exigirBanco();
    const tokenHash = hashToken(corpo.token);
    const hashSenha = await argon2.hash(corpo.senha, { type: argon2.argon2id });
    const cliente = await db.connect();
    try {
      await cliente.query("BEGIN");
      const convite = await cliente.query(
        "SELECT workspace_id, email, papel FROM convites WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > now() FOR UPDATE",
        [tokenHash],
      );
      if (!convite.rowCount) {
        await cliente.query("ROLLBACK");
        return resposta
          .code(410)
          .send({ erro: "Convite expirado ou ja usado." });
      }
      const existente = await cliente.query(
        "SELECT id, email, papel, status FROM usuarios WHERE email = $1 FOR UPDATE",
        [convite.rows[0].email],
      );
      let usuario: { id: string; email: string };
      if (existente.rowCount) {
        const atual = contextoAtual()?.usuario;
        const cadastrado = existente.rows[0];
        if (
          !atual ||
          atual.id !== cadastrado.id ||
          cadastrado.papel !== "cliente" ||
          cadastrado.status !== "ativo"
        ) {
          await cliente.query("ROLLBACK");
          return resposta
            .code(409)
            .send({
              erro: "Este email ja possui conta. Entre nela antes de aceitar o convite.",
            });
        }
        usuario = cadastrado;
      } else {
        const criado = await cliente.query(
          "INSERT INTO usuarios (email, hash_senha, papel) VALUES ($1, $2, 'cliente') RETURNING id, email",
          [convite.rows[0].email, hashSenha],
        );
        usuario = criado.rows[0];
      }
      await cliente.query(
        "INSERT INTO membros_workspace (usuario_id, workspace_id, papel) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [usuario.id, convite.rows[0].workspace_id, convite.rows[0].papel],
      );
      await cliente.query(
        "UPDATE convites SET usado_em = now() WHERE token_hash = $1",
        [tokenHash],
      );
      await cliente.query("COMMIT");
      await auditar(
        requisicao,
        "convite.aceito",
        `workspace:${convite.rows[0].workspace_id}`,
        usuario.id,
      );
      return resposta.code(201).send({ ok: true });
    } catch (erro) {
      await cliente.query("ROLLBACK");
      throw erro;
    } finally {
      cliente.release();
    }
  });

  app.post(
    "/auth/solicitar-redefinicao",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (requisicao) => {
      const email = normalizarEmail(
        (requisicao.body as { email?: unknown } | null)?.email,
      );
      const db = exigirBanco();
      const usuario = await db.query(
        "SELECT id FROM usuarios WHERE email = $1 AND status = 'ativo'",
        [email],
      );
      if (usuario.rowCount) {
        const token = novoToken();
        await db.query(
          "INSERT INTO redefinicoes_senha (token_hash, usuario_id, expira_em) VALUES ($1, $2, now() + interval '1 hour')",
          [hashToken(token), usuario.rows[0].id],
        );
        await enviarRedefinicao(email, token);
      }
      return { ok: true };
    },
  );

  app.post("/auth/redefinir-senha", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as {
      token?: unknown;
      senha?: unknown;
    };
    if (typeof corpo.token !== "string" || !senhaValida(corpo.senha))
      return resposta.code(400).send({ erro: "Dados invalidos." });
    const db = exigirBanco();
    const redefinicao = await db.query(
      "SELECT usuario_id FROM redefinicoes_senha WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > now()",
      [hashToken(corpo.token)],
    );
    if (!redefinicao.rowCount)
      return resposta.code(410).send({ erro: "Link expirado ou ja usado." });
    const hashSenha = await argon2.hash(corpo.senha, { type: argon2.argon2id });
    const cliente = await db.connect();
    try {
      await cliente.query("BEGIN");
      await cliente.query(
        "UPDATE usuarios SET hash_senha = $1, falhas_login = 0, bloqueado_ate = NULL WHERE id = $2",
        [hashSenha, redefinicao.rows[0].usuario_id],
      );
      await cliente.query(
        "UPDATE redefinicoes_senha SET usado_em = now() WHERE token_hash = $1",
        [hashToken(corpo.token)],
      );
      await cliente.query("DELETE FROM sessoes_web WHERE usuario_id = $1", [
        redefinicao.rows[0].usuario_id,
      ]);
      await cliente.query("COMMIT");
    } catch (erro) {
      await cliente.query("ROLLBACK");
      throw erro;
    } finally {
      cliente.release();
    }
    return { ok: true };
  });
};
