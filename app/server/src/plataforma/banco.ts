import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
function lerUrlBanco(): string | undefined {
  const arquivo = process.env.DATABASE_URL_FILE?.trim();
  if (arquivo) return readFileSync(arquivo, "utf8").trim();
  return process.env.DATABASE_URL?.trim();
}

const url = lerUrlBanco();

export const bancoDisponivel = Boolean(url);
export const banco = url
  ? new Pool({ connectionString: url, max: Number(process.env.PG_POOL_MAX ?? 10) })
  : null;

export function exigirBanco(): pg.Pool {
  if (!banco) throw new Error("DATABASE_URL nao configurada.");
  return banco;
}

export async function migrarBanco(): Promise<void> {
  if (!banco) return;
  const pastaModulo = dirname(fileURLToPath(import.meta.url));
  const pastaServer = resolve(pastaModulo, "..", "..");
  const pastaMigracoes = join(pastaServer, "migrations");
  const cliente = await banco.connect();
  try {
    // CORE e Hub sobem juntos no Compose. O lock de sessão impede que ambos
    // tentem criar a mesma extensão ou tabela no primeiro boot do banco.
    await cliente.query("SELECT pg_advisory_lock(hashtext('vkos_migracoes'))");
    await cliente.query("CREATE TABLE IF NOT EXISTS _migracoes (nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())");
    for (const nome of readdirSync(pastaMigracoes).filter((item) => item.endsWith(".sql")).sort()) {
      const aplicada = await cliente.query("SELECT 1 FROM _migracoes WHERE nome = $1", [nome]);
      if (aplicada.rowCount) continue;
      try {
        await cliente.query("BEGIN");
        await cliente.query(readFileSync(join(pastaMigracoes, nome), "utf8"));
        await cliente.query("INSERT INTO _migracoes (nome) VALUES ($1)", [nome]);
        await cliente.query("COMMIT");
      } catch (erro) {
        await cliente.query("ROLLBACK");
        throw erro;
      }
    }
  } finally {
    await cliente.query("SELECT pg_advisory_unlock(hashtext('vkos_migracoes'))").catch(() => undefined);
    cliente.release();
  }
}

export async function fecharBanco(): Promise<void> {
  await banco?.end();
}
