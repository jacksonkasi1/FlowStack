// Database connectivity and migration status for doctor and `bun run db:*`.
// Read-only: nothing here changes the database.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

export const MIGRATIONS_DIR = join("packages", "db", "drizzle");

/** Local migrations exactly as drizzle's migrator sees them. */
export async function localMigrations(root) {
  const dir = join(root, MIGRATIONS_DIR);
  const journal = JSON.parse(
    await readFile(join(dir, "meta", "_journal.json"), "utf8"),
  );
  return Promise.all(
    journal.entries.map(async (entry) => {
      const sql = await readFile(join(dir, `${entry.tag}.sql`), "utf8");
      return {
        tag: entry.tag,
        when: entry.when,
        hash: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

/** Explains a connection failure without echoing the connection string. */
export function describeDbError(error) {
  const code = error?.code;
  const messages = {
    ENOTFOUND: "Database host not found. Check the host in DATABASE_URL.",
    ECONNREFUSED:
      "Connection refused. Is PostgreSQL running and is the port correct?",
    ETIMEDOUT:
      "Connection timed out. Check network access, firewall or IP allowlists.",
    CONNECT_TIMEOUT:
      "Connection timed out. Check network access, firewall or IP allowlists.",
    "28P01":
      "Authentication failed. Check the username and password in DATABASE_URL.",
    28000:
      "Connection rejected by pg_hba or SSL settings. Try adding ?sslmode=require.",
    "3D000":
      "Database does not exist. Create it first (e.g. `createdb <name>`).",
    42501:
      "Permission denied. The database user needs CONNECT and schema privileges.",
  };
  return (
    messages[code] ||
    `Could not connect (${code || error?.name || "unknown error"}).`
  );
}

export function parseDatabaseUrl(url) {
  if (!url) return { ok: false, message: "DATABASE_URL is not set" };
  if (!URL.canParse(url))
    return { ok: false, message: "DATABASE_URL is not a valid URL" };
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol))
    return {
      ok: false,
      message: "DATABASE_URL must start with postgres:// or postgresql://",
    };
  return {
    ok: true,
    host: parsed.hostname,
    neon: /\.neon\.tech$/.test(parsed.hostname),
  };
}

export function connect(url, { timeout = 5 } = {}) {
  return postgres(url, {
    max: 1,
    connect_timeout: timeout,
    idle_timeout: 1,
    onnotice: () => {},
    // Never let the driver print connection details on errors.
    debug: false,
  });
}

/**
 * Returns { applied, pending, skippedByDrizzle, unknown } using migration
 * hashes. `skippedByDrizzle` lists pending migrations whose journal timestamp
 * is older than the newest applied one: drizzle's migrator would silently skip
 * them, so they must be resolved by hand.
 */
export async function migrationStatus(sql, root) {
  const local = await localMigrations(root);
  const [{ exists }] = await sql`
    select to_regclass('drizzle.__drizzle_migrations') is not null as exists`;
  const rows = exists
    ? await sql`select hash, created_at from drizzle.__drizzle_migrations`
    : [];
  const appliedHashes = new Set(rows.map((r) => r.hash));
  const newest = rows.reduce(
    (max, r) => Math.max(max, Number(r.created_at)),
    0,
  );
  const applied = local.filter((m) => appliedHashes.has(m.hash));
  const pending = local.filter((m) => !appliedHashes.has(m.hash));
  const localHashes = new Set(local.map((m) => m.hash));
  return {
    applied,
    pending,
    skippedByDrizzle: pending.filter((m) => newest && m.when <= newest),
    unknown: rows.filter((r) => !localHashes.has(r.hash)).length,
  };
}
