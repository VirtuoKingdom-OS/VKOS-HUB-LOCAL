import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import {
  CATALOGO_FEATURES,
  normalizarFeaturesLegadas,
  validarDependencias,
} from "../features/catalogo.js";
import { exigirBanco } from "./banco.js";
import { contextoAtual } from "./contexto.js";
import { hashToken } from "./identidade.js";
import {
  desfazerWorkspaceNovo,
  materializarWorkspace,
  pastaDoWorkspace,
  resolverSemente,
} from "./provisionamento.js";
import { cifrar, mascarar } from "./cofre.js";
import { transmitir } from "../ws.js";
import {
  obterEstadoMotores,
  testarMotorWorkspace,
} from "./motorRemoto.js";
import {
  estadoClaudeCore,
  testarClaudeCore,
} from "./claudeCore.js";
import {
  motivoBloqueioMotor,
  motorInicialDoModelo,
  type MotorWorkspace,
} from "./regrasMotores.js";
import {
  lerHtmlSemente,
  lerModeloBanco,
  listarBanco,
  listarOriginais,
  removerModeloBanco,
  restaurarModeloBanco,
  salvarModeloBanco,
  TIPOS_MODELO_BANCO,
  type TipoModeloBanco,
} from "../vkos/bancoModelos.js";
import { workspacePorId } from "../workspaces/estado.js";

const MOTORES_SELECIONAVEIS = new Set(["claude_team", "gemini"]);
const IDS_FEATURES = new Set(CATALOGO_FEATURES.map((feature) => feature.id));
// Logo aceita data URL de imagem, ja rebaixada no cliente. Teto generoso pra um
// PNG de 256 px em base64, mas fecha a porta pra payload gigante no banco.
const LIMITE_LOGO = 400_000;
const LOGO_PREFIXO = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export function ehLogoValida(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length <= LIMITE_LOGO && LOGO_PREFIXO.test(valor);
}
const UUID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PASTA_PECA_VALIDA = /^[a-z0-9][a-z0-9_-]*$/i;

export function normalizarSlug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function gerarSlugUnico(nome: string, ocupados: Iterable<string>): string {
  const base = normalizarSlug(nome) || "workspace";
  const usados = new Set(ocupados);
  if (!usados.has(base)) return base;
  let sufixo = 2;
  while (usados.has(`${base}-${sufixo}`)) sufixo += 1;
  return `${base}-${sufixo}`;
}

function usuarioAtual(): string {
  const id = contextoAtual()?.usuario?.id;
  if (!id) throw new Error("Operador nao autenticado.");
  return id;
}

async function auditar(
  requisicao: FastifyRequest,
  acao: string,
  alvo: string,
  workspaceId: string | null,
  detalhes: object = {},
) {
  await exigirBanco().query(
    "INSERT INTO auditoria (usuario_id, workspace_id, acao, alvo, detalhes_json, ip) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      usuarioAtual(),
      workspaceId,
      acao,
      alvo,
      JSON.stringify(detalhes),
      requisicao.ip,
    ],
  );
}

function lerFeatures(valor: unknown): Array<{ id: string; config?: object }> {
  if (!Array.isArray(valor)) throw new Error("Informe as features do modelo.");
  const unicas = new Map<string, { id: string; config?: object }>();
  for (const item of valor) {
    const id = typeof item === "string" ? item : (item as { id?: unknown })?.id;
    if (typeof id !== "string" || !IDS_FEATURES.has(id) || id === "admin")
      throw new Error(`Feature invalida: ${String(id)}.`);
    const config =
      typeof item === "object" && item && !Array.isArray(item)
        ? (item as { config?: object }).config
        : undefined;
    unicas.set(id, { id, config });
  }
  const features = [...unicas.values()];
  const erros = validarDependencias(features.map((feature) => feature.id));
  if (erros.length) throw new Error(erros.join(" "));
  return features;
}

type OrigemHtmlBanco =
  | { modo: "colar"; html: unknown }
  | { modo: "peca"; workspaceId: unknown; pasta: unknown };

function pastaWorkspaceBanco(workspaceId: string): string | null {
  const local = workspacePorId(workspaceId)?.pasta;
  if (local && existsSync(local)) return local;
  if (!UUID_VALIDO.test(workspaceId)) return null;
  const nuvem = pastaDoWorkspace(workspaceId);
  return existsSync(nuvem) ? nuvem : null;
}

function htmlDaOrigemBanco(origem: OrigemHtmlBanco): string {
  if (origem.modo === "colar") {
    if (typeof origem.html !== "string") throw new Error("Cole o HTML do modelo.");
    return origem.html;
  }
  const workspaceId =
    typeof origem.workspaceId === "string" ? origem.workspaceId : "";
  const pasta = typeof origem.pasta === "string" ? origem.pasta : "";
  if (!workspaceId || !PASTA_PECA_VALIDA.test(pasta)) {
    throw new Error("Workspace ou peça inválida.");
  }
  const workspace = pastaWorkspaceBanco(workspaceId);
  if (!workspace) throw new Error("Workspace não encontrado.");
  const arquivo = join(workspace, "conteudo", pasta, "carrossel.html");
  if (!existsSync(arquivo)) throw new Error("A peça ainda não tem carrossel.html.");
  return readFileSync(arquivo, "utf8");
}

// Estado de fabrica de um original sem sobrescrita: metadados do catalogo da
// semente e HTML do arquivo original. Null quando o id nao e um original.
function baseDeFabrica(id: string): {
  nome: string;
  descricao: string;
  tipo: TipoModeloBanco;
  pedeImagem: boolean;
  html: string;
} | null {
  const original = listarOriginais().find((item) => item.id === id);
  if (!original) return null;
  const html = lerHtmlSemente(id);
  if (html === null) return null;
  return {
    nome: original.nome,
    descricao: original.descricao,
    tipo: original.tipo,
    pedeImagem: original.pedeImagem,
    html,
  };
}

function tipoBanco(valor: unknown): TipoModeloBanco {
  if (
    typeof valor !== "string"
    || !(TIPOS_MODELO_BANCO as readonly string[]).includes(valor)
  ) {
    throw new Error("Tipo de modelo inválido.");
  }
  return valor as TipoModeloBanco;
}

export const rotasAdmin: FastifyPluginAsync = async (app) => {
  app.get("/admin/features", async () => ({ features: CATALOGO_FEATURES }));
  app.get("/admin/meu-claude", async (requisicao) =>
    estadoClaudeCore(
      (requisicao.query as { atualizar?: string }).atualizar === "1",
    )
  );
  app.post("/admin/meu-claude/testar", async (_requisicao, resposta) => {
    try {
      return await testarClaudeCore();
    } catch (erro) {
      return resposta.code(409).send({
        erro: erro instanceof Error
          ? erro.message
          : "O teste do Claude falhou.",
      });
    }
  });
  app.get("/admin/motores", async (_requisicao, resposta) => {
    try {
      return await obterEstadoMotores();
    } catch (erro) {
      return resposta.code(503).send({
        erro: erro instanceof Error
          ? erro.message
          : "O serviço de IA está indisponível.",
      });
    }
  });

  // Dois grupos: os originais da semente (com o estado da sobrescrita) e os
  // modelos proprios criados no banco (prefixo b-).
  app.get("/admin/banco-modelos", async () => ({
    originais: listarOriginais(),
    proprios: listarBanco().filter((modelo) => modelo.id.startsWith("b-")),
  }));

  app.post("/admin/banco-modelos", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as Record<string, unknown>;
    const origem = corpo.origemHtml as OrigemHtmlBanco | undefined;
    if (!origem || (origem.modo !== "colar" && origem.modo !== "peca")) {
      return resposta.code(400).send({ erro: "Escolha a origem do HTML." });
    }
    try {
      const resultado = salvarModeloBanco({
        nome: typeof corpo.nome === "string" ? corpo.nome : "",
        descricao: typeof corpo.descricao === "string" ? corpo.descricao : "",
        tipo: tipoBanco(corpo.tipo),
        pedeImagem: corpo.pedeImagem === true,
        html: htmlDaOrigemBanco(origem),
      });
      return resposta.code(201).send(resultado);
    } catch (erro) {
      return resposta.code(400).send({
        erro: erro instanceof Error ? erro.message : "Não foi possível salvar o modelo.",
      });
    }
  });

  app.put("/admin/banco-modelos/:id", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    // Copy-on-write dos originais: editar um original sem sobrescrita parte do
    // estado de fabrica (metadados do catalogo, HTML da semente) e o salvar
    // cria a entrada no banco com o mesmo id.
    const atual = lerModeloBanco(id) ?? baseDeFabrica(id);
    if (!atual) return resposta.code(404).send({ erro: "Modelo não encontrado." });
    const corpo = (requisicao.body ?? {}) as Record<string, unknown>;
    const origem = corpo.origemHtml as OrigemHtmlBanco | undefined;
    try {
      return salvarModeloBanco({
        id,
        nome: typeof corpo.nome === "string" ? corpo.nome : atual.nome,
        descricao:
          typeof corpo.descricao === "string" ? corpo.descricao : atual.descricao,
        tipo: corpo.tipo === undefined ? atual.tipo : tipoBanco(corpo.tipo),
        pedeImagem:
          typeof corpo.pedeImagem === "boolean"
            ? corpo.pedeImagem
            : atual.pedeImagem,
        html: origem ? htmlDaOrigemBanco(origem) : atual.html,
      });
    } catch (erro) {
      return resposta.code(400).send({
        erro: erro instanceof Error ? erro.message : "Não foi possível atualizar o modelo.",
      });
    }
  });

  app.delete("/admin/banco-modelos/:id", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    try {
      if (!removerModeloBanco(id)) {
        return resposta.code(404).send({ erro: "Modelo não encontrado." });
      }
      return { ok: true };
    } catch (erro) {
      return resposta.code(400).send({
        erro: erro instanceof Error ? erro.message : "Id de modelo inválido.",
      });
    }
  });

  // Restaurar original: regrava a sobrescrita com o conteudo de fabrica. A
  // entrada continua no banco pra atualizacao no uso convergir o parque de
  // volta pra versao da semente.
  app.post("/admin/banco-modelos/:id/restaurar", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    try {
      return { modelo: restaurarModeloBanco(id) };
    } catch (erro) {
      return resposta.code(400).send({
        erro: erro instanceof Error ? erro.message : "Não foi possível restaurar o modelo.",
      });
    }
  });

  // Materializa o HTML vigente de um modelo como peca temporaria no workspace
  // do Estudio, pro Jesse refinar no Studio e salvar de volta no banco.
  app.post("/admin/banco-modelos/:id/abrir-studio", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    if (!/^[a-z0-9-]+$/.test(id)) {
      return resposta.code(404).send({ erro: "Modelo não encontrado." });
    }
    const corpo = (requisicao.body ?? {}) as { workspaceId?: unknown };
    const workspaceId =
      typeof corpo.workspaceId === "string" ? corpo.workspaceId : "";
    const workspace = workspaceId ? pastaWorkspaceBanco(workspaceId) : null;
    if (!workspace) {
      return resposta
        .code(400)
        .send({ erro: "Ative um workspace do Estúdio para editar o modelo." });
    }
    const html = lerModeloBanco(id)?.html ?? lerHtmlSemente(id);
    if (html === null) {
      return resposta.code(404).send({ erro: "Modelo não encontrado." });
    }
    const data = new Date().toISOString().slice(0, 10);
    const base = `${data}-edicao-modelo-${id}`;
    let pasta = base;
    let indice = 2;
    while (existsSync(join(workspace, "conteudo", pasta))) {
      pasta = `${base}-${indice}`;
      indice += 1;
    }
    const destino = join(workspace, "conteudo", pasta);
    mkdirSync(destino, { recursive: true });
    writeFileSync(join(destino, "carrossel.html"), html, "utf8");
    transmitir({ tipo: "pecas:atualizadas" });
    return resposta.code(201).send({ pasta });
  });

  app.get("/admin/modelos", async () => {
    const resultado = await exigirBanco().query(
      "SELECT * FROM modelos_workspace ORDER BY criado_em DESC",
    );
    return {
      modelos: resultado.rows.map((modelo) => ({
        ...modelo,
        features_json: normalizarFeaturesLegadas(modelo.features_json),
      })),
    };
  });

  app.post("/admin/modelos", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as Record<string, unknown>;
    const nome =
      typeof corpo.nome === "string" ? corpo.nome.trim().slice(0, 100) : "";
    const descricao =
      typeof corpo.descricao === "string"
        ? corpo.descricao.trim().slice(0, 500)
        : "";
    const motor =
      typeof corpo.motorPadrao === "string" ? corpo.motorPadrao : "gemini";
    if (!nome || !MOTORES_SELECIONAVEIS.has(motor))
      return resposta.code(400).send({ erro: "Nome ou motor invalido." });
    let features;
    try {
      features = lerFeatures(corpo.features);
    } catch (erro) {
      return resposta.code(400).send({ erro: (erro as Error).message });
    }
    const semente = corpo.semente === "vkos2" ? "vkos2" : null;
    const resultado = await exigirBanco().query(
      "INSERT INTO modelos_workspace (nome, descricao, features_json, motor_padrao, pasta_semente) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nome, descricao, JSON.stringify(features), motor, semente],
    );
    await auditar(
      requisicao,
      "modelo.criado",
      `modelo:${resultado.rows[0].id}`,
      null,
    );
    return resposta.code(201).send({ modelo: resultado.rows[0] });
  });

  app.get("/admin/workspaces", async () => {
    const resultado = await exigirBanco().query(
      `SELECT w.*,
              COALESCE((SELECT sum(c.custo_estimado) FROM consumo_ia c WHERE c.workspace_id = w.id AND c.criado_em >= date_trunc('month', now())), 0)::float AS consumo_mes,
              COALESCE((SELECT jsonb_agg(fw.feature_id) FROM features_workspace fw WHERE fw.workspace_id = w.id AND fw.ativa = true), '[]'::jsonb) AS features_ativas,
              COALESCE((SELECT jsonb_agg(json_build_object('email', u.email, 'papel', m.papel) ORDER BY m.papel, u.email) FROM membros_workspace m JOIN usuarios u ON u.id = m.usuario_id WHERE m.workspace_id = w.id), '[]'::jsonb) AS membros_resumo,
              COALESCE((SELECT l.orcamento_mensal FROM limites_workspace l WHERE l.workspace_id = w.id), 0)::float AS orcamento_mensal,
              COALESCE((SELECT l.acao_ao_estourar FROM limites_workspace l WHERE l.workspace_id = w.id), 'avisar') AS acao_ao_estourar,
              EXISTS(SELECT 1 FROM credenciais c WHERE c.workspace_id = w.id AND c.tipo = 'claude_team') AS claude_credencial_configurada,
              COALESCE((SELECT c.status FROM credenciais c WHERE c.workspace_id = w.id AND c.tipo = 'claude_team'), 'ausente') AS claude_credencial_status,
              (SELECT c.testada_em FROM credenciais c WHERE c.workspace_id = w.id AND c.tipo = 'claude_team') AS claude_credencial_testada_em
         FROM workspaces w
        ORDER BY w.criado_em DESC`,
    );
    return { workspaces: resultado.rows };
  });

  app.post("/admin/workspaces", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as {
      nome?: unknown;
      modeloId?: unknown;
    };
    const nome =
      typeof corpo.nome === "string" ? corpo.nome.trim().slice(0, 100) : "";
    const modeloId = typeof corpo.modeloId === "string" ? corpo.modeloId : "";
    const slugs = await exigirBanco().query("SELECT slug FROM workspaces");
    const slugFinal = gerarSlugUnico(nome, slugs.rows.map((item) => item.slug));
    if (!nome || !modeloId || !slugFinal)
      return resposta
        .code(400)
        .send({ erro: "Nome e modelo sao obrigatorios." });
    const db = exigirBanco();
    const modelo = await db.query(
      "SELECT * FROM modelos_workspace WHERE id = $1",
      [modeloId],
    );
    if (!modelo.rowCount)
      return resposta.code(404).send({ erro: "Modelo nao encontrado." });
    const id = randomUUID();
    const motorInicial = motorInicialDoModelo(
      modelo.rows[0].motor_padrao as MotorWorkspace,
    );
    let pasta: string | null = null;
    let confirmado = false;
    try {
      pasta = materializarWorkspace(
        id,
        resolverSemente(modelo.rows[0].pasta_semente),
      );
      const cliente = await db.connect();
      try {
        await cliente.query("BEGIN");
        await cliente.query(
          "INSERT INTO workspaces (id, nome, slug, modelo_origem_id, motor, pasta) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, nome, slugFinal, modeloId, motorInicial, pasta],
        );
        for (const feature of normalizarFeaturesLegadas(
          modelo.rows[0].features_json,
        )) {
          await cliente.query(
            "INSERT INTO features_workspace (workspace_id, feature_id, ativa, config_json) VALUES ($1, $2, true, $3)",
            [id, feature.id, JSON.stringify(feature.config ?? {})],
          );
        }
        await cliente.query(
          "INSERT INTO limites_workspace (workspace_id, orcamento_mensal, acao_ao_estourar) VALUES ($1, 0, 'avisar')",
          [id],
        );
        await cliente.query("COMMIT");
        confirmado = true;
      } catch (erro) {
        await cliente.query("ROLLBACK");
        throw erro;
      } finally {
        cliente.release();
      }
    } catch (erro) {
      if (pasta && !confirmado) desfazerWorkspaceNovo(id);
      if ((erro as { code?: string }).code === "23505")
        return resposta.code(409).send({ erro: "Esse slug ja esta em uso." });
      throw erro;
    }
    await auditar(requisicao, "workspace.criado", `workspace:${id}`, id, {
      modeloId,
    });
    return resposta
      .code(201)
      .send({
        workspace: {
          id,
          nome,
          slug: slugFinal,
          pasta,
          motor: motorInicial,
        },
      });
  });

  app.patch("/admin/workspaces/:id", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const corpo = (requisicao.body ?? {}) as {
      motor?: unknown;
      status?: unknown;
      orcamentoMensal?: unknown;
      acaoAoEstourar?: unknown;
      logo?: unknown;
    };
    const db = exigirBanco();
    const existente = await db.query("SELECT 1 FROM workspaces WHERE id = $1", [
      id,
    ]);
    if (!existente.rowCount)
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    if ("logo" in corpo) {
      if (corpo.logo === null || corpo.logo === "") {
        await db.query("UPDATE workspaces SET logo = NULL WHERE id = $1", [id]);
        await auditar(requisicao, "workspace.logo_removida", `workspace:${id}`, id);
      } else if (ehLogoValida(corpo.logo)) {
        await db.query("UPDATE workspaces SET logo = $1 WHERE id = $2", [corpo.logo, id]);
        await auditar(requisicao, "workspace.logo_alterada", `workspace:${id}`, id);
      } else {
        return resposta.code(400).send({ erro: "Logo invalida ou grande demais." });
      }
    }
    if (typeof corpo.motor === "string") {
      if (!MOTORES_SELECIONAVEIS.has(corpo.motor))
        return resposta.code(400).send({ erro: "Motor invalido." });
      if (corpo.motor === "claude_team") {
        const credencial = await db.query(
          "SELECT status FROM credenciais WHERE workspace_id = $1 AND tipo = 'claude_team'",
          [id],
        );
        const motivo = motivoBloqueioMotor("claude_team", {
          claudeCredencialStatus: credencial.rows[0]?.status,
        });
        if (motivo) {
          return resposta.code(409).send({ erro: motivo });
        }
      }
      await db.query("UPDATE workspaces SET motor = $1 WHERE id = $2", [
        corpo.motor,
        id,
      ]);
      await auditar(
        requisicao,
        "workspace.motor_alterado",
        `workspace:${id}`,
        id,
        { motor: corpo.motor },
      );
    }
    if (corpo.status === "ativo" || corpo.status === "suspenso") {
      await db.query("UPDATE workspaces SET status = $1 WHERE id = $2", [
        corpo.status,
        id,
      ]);
      if (corpo.status === "suspenso")
        await db.query("DELETE FROM sessoes_web WHERE workspace_id = $1", [id]);
      await auditar(
        requisicao,
        `workspace.${corpo.status}`,
        `workspace:${id}`,
        id,
      );
    }
    if (
      typeof corpo.orcamentoMensal === "number" &&
      Number.isFinite(corpo.orcamentoMensal) &&
      (corpo.acaoAoEstourar === "avisar" || corpo.acaoAoEstourar === "cortar")
    ) {
      await db.query(
        "UPDATE limites_workspace SET orcamento_mensal = $1, acao_ao_estourar = $2 WHERE workspace_id = $3",
        [Math.max(0, corpo.orcamentoMensal), corpo.acaoAoEstourar, id],
      );
      await auditar(
        requisicao,
        "workspace.limite_alterado",
        `workspace:${id}`,
        id,
      );
    }
    const workspace = await db.query("SELECT * FROM workspaces WHERE id = $1", [
      id,
    ]);
    return { workspace: workspace.rows[0] };
  });

  app.put(
    "/admin/workspaces/:id/features/:featureId",
    async (requisicao, resposta) => {
      const { id, featureId } = requisicao.params as {
        id: string;
        featureId: string;
      };
      const ativa = (requisicao.body as { ativa?: unknown } | null)?.ativa;
      if (
        typeof ativa !== "boolean" ||
        !IDS_FEATURES.has(featureId) ||
        featureId === "admin"
      )
        return resposta.code(400).send({ erro: "Feature ou estado invalido." });
      const db = exigirBanco();
      if (
        !(await db.query("SELECT 1 FROM workspaces WHERE id = $1", [id]))
          .rowCount
      )
        return resposta.code(404).send({ erro: "Workspace nao encontrado." });
      if (ativa) {
        const atuais = await db.query(
          "SELECT feature_id FROM features_workspace WHERE workspace_id = $1 AND ativa = true",
          [id],
        );
        const erros = validarDependencias([
          ...atuais.rows.map((item) => item.feature_id),
          featureId,
        ]);
        if (erros.length)
          return resposta.code(409).send({ erro: erros.join(" ") });
      } else {
        const dependentes = CATALOGO_FEATURES.filter((feature) =>
          feature.dependeDe.includes(featureId),
        );
        const bloqueios = await db.query(
          "SELECT feature_id FROM features_workspace WHERE workspace_id = $1 AND ativa = true AND feature_id = ANY($2::text[])",
          [id, dependentes.map((item) => item.id)],
        );
        if (bloqueios.rowCount)
          return resposta
            .code(409)
            .send({
              erro: `Desligue antes: ${bloqueios.rows.map((item) => item.feature_id).join(", ")}.`,
            });
      }
      await db.query(
        "INSERT INTO features_workspace (workspace_id, feature_id, ativa) VALUES ($1, $2, $3) ON CONFLICT (workspace_id, feature_id) DO UPDATE SET ativa = EXCLUDED.ativa",
        [id, featureId, ativa],
      );
      await auditar(
        requisicao,
        "workspace.feature_alterada",
        `workspace:${id}`,
        id,
        { featureId, ativa },
      );
      transmitir({ tipo: "workspace:features-atualizadas", workspaceId: id });
      return { ok: true, featureId, ativa };
    },
  );

  app.post("/admin/workspaces/:id/convites", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const corpo = (requisicao.body ?? {}) as {
      email?: unknown;
      papel?: unknown;
    };
    const email =
      typeof corpo.email === "string"
        ? corpo.email.trim().toLowerCase().slice(0, 254)
        : "";
    const papel = corpo.papel === "dono" ? "dono" : "membro";
    if (!email.includes("@"))
      return resposta.code(400).send({ erro: "Email invalido." });
    if (
      !(
        await exigirBanco().query("SELECT 1 FROM workspaces WHERE id = $1", [
          id,
        ])
      ).rowCount
    )
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    const token = randomBytes(32).toString("base64url");
    await exigirBanco().query(
      "INSERT INTO convites (token_hash, workspace_id, email, papel, expira_em) VALUES ($1, $2, $3, $4, now() + interval '72 hours')",
      [hashToken(token), id, email, papel],
    );
    await auditar(requisicao, "convite.criado", `workspace:${id}`, id, {
      email,
      papel,
    });
    const base = (process.env.APP_URL ?? "http://localhost:5173").replace(
      /\/$/,
      "",
    );
    return resposta
      .code(201)
      .send({
        convite: {
          email,
          expiraEm: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          url: `${base}/entrar?token=${encodeURIComponent(token)}`,
        },
      });
  });

  app.get("/admin/workspaces/:id/convites", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    if (!UUID_VALIDO.test(id)) {
      return resposta.code(400).send({ erro: "Workspace invalido." });
    }
    const db = exigirBanco();
    if (!(await db.query("SELECT 1 FROM workspaces WHERE id = $1", [id])).rowCount) {
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    }
    const resultado = await db.query(
      `SELECT id, email, papel, expira_em, usado_em, criado_em,
              CASE
                WHEN usado_em IS NOT NULL THEN 'usado'
                WHEN expira_em <= now() THEN 'expirado'
                ELSE 'pendente'
              END AS estado
         FROM convites
        WHERE workspace_id = $1
        ORDER BY criado_em DESC
        LIMIT 100`,
      [id],
    );
    return { convites: resultado.rows };
  });

  app.delete(
    "/admin/workspaces/:id/convites/:conviteId",
    async (requisicao, resposta) => {
      const { id, conviteId } = requisicao.params as {
        id: string;
        conviteId: string;
      };
      if (!UUID_VALIDO.test(id) || !UUID_VALIDO.test(conviteId)) {
        return resposta.code(400).send({ erro: "Convite invalido." });
      }
      const removido = await exigirBanco().query(
        `DELETE FROM convites
          WHERE id = $1 AND workspace_id = $2 AND usado_em IS NULL
          RETURNING email`,
        [conviteId, id],
      );
      if (!removido.rowCount) {
        return resposta.code(404).send({
          erro: "Convite pendente nao encontrado.",
        });
      }
      await auditar(
        requisicao,
        "convite.revogado",
        `workspace:${id}`,
        id,
        { email: removido.rows[0].email },
      );
      return { ok: true };
    },
  );

  app.get("/admin/workspaces/:id/membros", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    if (!UUID_VALIDO.test(id)) {
      return resposta.code(400).send({ erro: "Workspace invalido." });
    }
    const db = exigirBanco();
    if (!(await db.query("SELECT 1 FROM workspaces WHERE id = $1", [id])).rowCount) {
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    }
    const resultado = await db.query(
      `SELECT u.id AS usuario_id, u.email, u.status, m.papel,
              max(s.ultimo_uso) AS ultimo_acesso
         FROM membros_workspace m
         JOIN usuarios u ON u.id = m.usuario_id
         LEFT JOIN sessoes_web s
           ON s.usuario_id = u.id AND s.workspace_id = m.workspace_id
        WHERE m.workspace_id = $1
        GROUP BY u.id, u.email, u.status, m.papel
        ORDER BY u.email`,
      [id],
    );
    return { membros: resultado.rows };
  });

  app.delete(
    "/admin/workspaces/:id/membros/:usuarioId",
    async (requisicao, resposta) => {
      const { id, usuarioId } = requisicao.params as {
        id: string;
        usuarioId: string;
      };
      if (!UUID_VALIDO.test(id) || !UUID_VALIDO.test(usuarioId)) {
        return resposta.code(400).send({ erro: "Membro invalido." });
      }
      const db = exigirBanco();
      const membro = await db.query(
        `SELECT u.email
           FROM membros_workspace m
           JOIN usuarios u ON u.id = m.usuario_id
          WHERE m.workspace_id = $1 AND m.usuario_id = $2`,
        [id, usuarioId],
      );
      if (!membro.rowCount) {
        return resposta.code(404).send({ erro: "Membro nao encontrado." });
      }
      const cliente = await db.connect();
      try {
        await cliente.query("BEGIN");
        await cliente.query(
          "DELETE FROM sessoes_web WHERE workspace_id = $1 AND usuario_id = $2",
          [id, usuarioId],
        );
        await cliente.query(
          "DELETE FROM membros_workspace WHERE workspace_id = $1 AND usuario_id = $2",
          [id, usuarioId],
        );
        await cliente.query("COMMIT");
      } catch (erro) {
        await cliente.query("ROLLBACK");
        throw erro;
      } finally {
        cliente.release();
      }
      await auditar(
        requisicao,
        "workspace.membro_removido",
        `workspace:${id}`,
        id,
        { usuarioId, email: membro.rows[0].email },
      );
      return { ok: true };
    },
  );

  app.put("/admin/workspaces/:id/credencial", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const corpo = (requisicao.body ?? {}) as {
      tipo?: unknown;
      valor?: unknown;
      consentimento?: unknown;
    };
    if (corpo.tipo !== "claude_team" && corpo.tipo !== "apify")
      return resposta.code(400).send({ erro: "Tipo de credencial invalido." });
    if (typeof corpo.valor !== "string" || corpo.valor.trim().length < 12)
      return resposta.code(400).send({ erro: "Credencial invalida." });
    if (corpo.tipo === "claude_team" && corpo.consentimento !== true)
      return resposta
        .code(400)
        .send({ erro: "Registre o consentimento do cliente." });
    if (
      !(
        await exigirBanco().query("SELECT 1 FROM workspaces WHERE id = $1", [
          id,
        ])
      ).rowCount
    )
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    const tipoPersistido = corpo.tipo === "apify" ? "conexao_externa" : corpo.tipo;
    const valorPersistido = corpo.tipo === "apify"
      ? JSON.stringify({ apify: corpo.valor.trim() })
      : corpo.valor.trim();
    const cifrada = cifrar(valorPersistido);
    await exigirBanco().query(
      `INSERT INTO credenciais (workspace_id, tipo, valor_cifrado, status, testada_em, erro_codigo)
       VALUES ($1, $2, $3, $4, NULL, NULL)
       ON CONFLICT (workspace_id, tipo) DO UPDATE
       SET valor_cifrado = EXCLUDED.valor_cifrado,
           criado_em = now(),
           status = EXCLUDED.status,
           testada_em = NULL,
           erro_codigo = NULL`,
      [
        id,
        tipoPersistido,
        cifrada,
        corpo.tipo === "claude_team" ? "nao_testada" : "valida",
      ],
    );
    if (corpo.tipo === "claude_team") {
      await exigirBanco().query(
        "UPDATE workspaces SET motor_estado = 'nao_testado', motor_testado_em = NULL, motor_erro_codigo = NULL WHERE id = $1",
        [id],
      );
    }
    await auditar(requisicao, "credencial.rotacionada", `workspace:${id}`, id, {
      tipo: corpo.tipo,
      consentimento: corpo.consentimento === true,
    });
    return {
      ok: true,
      tipo: corpo.tipo,
      mascara: mascarar(corpo.valor.trim()),
    };
  });

  app.post(
    "/admin/workspaces/:id/testar-motor",
    async (requisicao, resposta) => {
      const { id } = requisicao.params as { id: string };
      const motor = (requisicao.body as { motor?: unknown } | null)?.motor;
      if (motor !== "gemini" && motor !== "claude_team") {
        return resposta.code(400).send({ erro: "Motor inválido." });
      }
      if (
        !(
          await exigirBanco().query(
            "SELECT 1 FROM workspaces WHERE id = $1",
            [id],
          )
        ).rowCount
      ) {
        return resposta.code(404).send({ erro: "Workspace não encontrado." });
      }
      try {
        const teste = await testarMotorWorkspace(id, motor);
        await auditar(
          requisicao,
          "workspace.motor_testado",
          `workspace:${id}`,
          id,
          {
            motor,
            modelo: teste.modelo,
            custoEstimado: teste.custoEstimado,
          },
        );
        return teste;
      } catch (erro) {
        await auditar(
          requisicao,
          "workspace.motor_teste_falhou",
          `workspace:${id}`,
          id,
          { motor },
        );
        const status = (erro as { status?: number }).status;
        return resposta.code(status === 401 ? 409 : 503).send({
          erro: erro instanceof Error
            ? erro.message
            : "O teste do motor falhou.",
        });
      }
    },
  );

  app.post("/admin/workspaces/:id/derrubar-sessoes", async (requisicao) => {
    const { id } = requisicao.params as { id: string };
    const resultado = await exigirBanco().query(
      "DELETE FROM sessoes_web WHERE workspace_id = $1",
      [id],
    );
    await auditar(
      requisicao,
      "workspace.sessoes_derrubadas",
      `workspace:${id}`,
      id,
      { total: resultado.rowCount },
    );
    return { ok: true, total: resultado.rowCount };
  });

  app.post("/admin/workspaces/:id/abrir", async (requisicao, resposta) => {
    const { id } = requisicao.params as { id: string };
    const token = requisicao.cookies.vkos_sessao;
    if (!token) return resposta.code(401).send({ erro: "Sessao ausente." });
    if (
      !(
        await exigirBanco().query("SELECT 1 FROM workspaces WHERE id = $1", [
          id,
        ])
      ).rowCount
    )
      return resposta.code(404).send({ erro: "Workspace nao encontrado." });
    await exigirBanco().query(
      "UPDATE sessoes_web SET workspace_id = $1 WHERE token_hash = $2",
      [id, hashToken(token)],
    );
    await auditar(
      requisicao,
      "workspace.aberto_como_operador",
      `workspace:${id}`,
      id,
    );
    return { ok: true };
  });

  app.get("/admin/auditoria", async (requisicao) => {
    const workspaceId = (requisicao.query as { workspaceId?: string })
      .workspaceId;
    const resultado = workspaceId
      ? await exigirBanco().query(
          "SELECT * FROM auditoria WHERE workspace_id = $1 ORDER BY criado_em DESC LIMIT 300",
          [workspaceId],
        )
      : await exigirBanco().query(
          "SELECT * FROM auditoria ORDER BY criado_em DESC LIMIT 300",
        );
    return { eventos: resultado.rows };
  });
};
