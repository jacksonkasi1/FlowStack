// Database workflow against an isolated in-memory PostgreSQL (PGlite served
// over the Postgres wire protocol). Exercises the real drizzle-kit migrate.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { verifyPassword } from "better-auth/crypto";
import {
  localMigrations,
  connect,
  migrationStatus,
} from "../scripts/lib/db.mjs";

import { join } from "node:path";

const root = join(import.meta.dir, "..");

const port = 55000 + Math.floor(Math.random() * 4000);
let server: PGLiteSocketServer;
let pg: PGlite;
const url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;

beforeAll(async () => {
  pg = await PGlite.create();
  server = new PGLiteSocketServer({ db: pg, port, host: "127.0.0.1" });
  await server.start();
}, 60000);
afterAll(async () => {
  await server?.stop();
  await pg?.close();
});

// Async on purpose: the PGlite server runs in this process, so a blocking
// spawn would stop it from answering.
function db(
  args: string[],
  env: Record<string, string> = {},
  databaseUrl = url,
) {
  const clean = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !/^(FLOWSTACK_|CI$|NODE_ENV$|DATABASE_URL$|SEED_)/.test(k),
    ),
  );
  const child = spawn("node", ["scripts/db.mjs", ...args], {
    cwd: root,
    env: { ...clean, DATABASE_URL: databaseUrl, ...env },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));
  return new Promise<{ status: number | null; stdout: string; stderr: string }>(
    (resolve) =>
      child.on("close", (status) => resolve({ status, stdout, stderr })),
  );
}

test("status lists every migration as pending on an empty database", async () => {
  const result = await db(["status", "--check"]);
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("PENDING  0000_yellow_mach_iv");
  expect(result.stdout).toContain("7 pending migration(s)");
  expect(result.stdout + result.stderr).not.toContain("postgres:postgres");
}, 30000);

test("production and remote migrations are refused before connecting", async () => {
  const prod = await db(["migrate"], { FLOWSTACK_ENV: "production" });
  expect(prod.status).toBe(1);
  expect(prod.stderr).toContain("Refusing to migrate production outside CI");
  const beta = await db(["migrate"], { FLOWSTACK_ENV: "beta" });
  expect(beta.stderr).toContain("--confirm-env=beta");
});

test("migrate applies everything, then is a no-op when repeated", async () => {
  const first = await db(["migrate"]);
  expect(first.status).toBe(0);
  expect(first.stdout).toContain("Database is up to date");
  const again = await db(["migrate"]);
  expect(again.status).toBe(0);
  expect(again.stdout).toContain("No pending migrations");
  const status = await db(["status", "--check"]);
  expect(status.status).toBe(0);
  expect(status.stdout).toContain("Up to date.");
}, 120000);

test("development seed is idempotent and creates a working credential", async () => {
  const password = "seed-password-for-tests-only";
  const first = await db(["seed"], {
    SEED_USER_PASSWORD: password,
    SEED_USER_EMAIL: "seed@example.com",
  });
  expect(first.status).toBe(0);
  expect(first.stdout).not.toContain(password);
  const again = await db(["seed"], {
    SEED_USER_PASSWORD: password,
    SEED_USER_EMAIL: "seed@example.com",
  });
  expect(again.stdout).toContain("already exists");
  const { rows } = await pg.query<{
    password: string;
    email_verified: boolean;
  }>(
    `select a.password, u.email_verified from "user" u join account a on a.user_id = u.id where u.email = 'seed@example.com'`,
  );
  expect(rows.length).toBe(1);
  expect(rows[0].email_verified).toBe(true);
  expect(await verifyPassword({ hash: rows[0].password, password })).toBe(true);
  const refused = await db(["seed"], { FLOWSTACK_ENV: "production" });
  expect(refused.status).toBe(1);
}, 60000);

test("out-of-order journal timestamps that drizzle would skip are detected", async () => {
  // Simulate a database migrated by an older release up to 0003, whose
  // journal timestamp is newer than 0004 and 0005.
  const fresh = await PGlite.create();
  const port2 = port + 1;
  const server2 = new PGLiteSocketServer({
    db: fresh,
    port: port2,
    host: "127.0.0.1",
  });
  await server2.start();
  try {
    const local = await localMigrations(root);
    await fresh.exec(
      `create schema drizzle; create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`,
    );
    for (const m of local.slice(0, 4))
      await fresh.query(
        `insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)`,
        [m.hash, m.when],
      );
    const sql = connect(
      `postgresql://postgres:postgres@127.0.0.1:${port2}/postgres`,
    );
    try {
      const status = await migrationStatus(sql, root);
      expect(status.pending.map((m) => m.tag)).toEqual([
        "0004_modern_scorpion",
        "0005_awesome_sentinel",
        "0006_chief_pepper_potts",
      ]);
      expect(status.skippedByDrizzle.map((m) => m.tag)).toEqual([
        "0004_modern_scorpion",
        "0005_awesome_sentinel",
      ]);
    } finally {
      await sql.end({ timeout: 1 });
    }
    const refused = await db(
      ["migrate"],
      {},
      `postgresql://postgres:postgres@127.0.0.1:${port2}/postgres`,
    );
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("drizzle would skip");
  } finally {
    await server2.stop();
    await fresh.close();
  }
}, 60000);

test("connection failures are explained without echoing the URL", async () => {
  const result = await db(["status"], {
    DATABASE_URL: "postgresql://someone:hunter2-secret@127.0.0.1:1/x",
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Connection refused");
  expect(result.stderr).not.toContain("hunter2-secret");
  const invalid = await db(["status"], { DATABASE_URL: "mysql://x" });
  expect(invalid.stderr).toContain("must start with postgres://");
});
