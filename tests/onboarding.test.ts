// One-command onboarding (scripts/onboard.mjs, run by `bun run setup` after
// install) in a generated project against an isolated PostgreSQL (PGlite).
import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { generate, sourceRoot } from "../scripts/setup.mjs";

const SECRET = "onboarding-sentinel-auth-secret-0123456789";
let dir: string;
let project: string;
let pg: PGlite;
let server: PGLiteSocketServer;
let dbUrl: string;

function serverEnv(databaseUrl: string) {
  return [
    `BETTER_AUTH_SECRET=${SECRET}`,
    "BETTER_AUTH_URL=http://localhost:8080",
    "FRONTEND_URL=http://localhost:3000",
    `DATABASE_URL=${databaseUrl}`,
    "ZEPTOMAIL_API_KEY=onboarding-zepto-key",
    "EMAIL_FROM_ADDRESS=noreply@example.com",
    "R2_ACCESS_KEY_ID=key",
    "R2_SECRET_ACCESS_KEY=onboarding-r2-secret",
    "R2_ENDPOINT_URL=https://example.r2.cloudflarestorage.com",
    "R2_BUCKET_NAME=bucket",
    "ALLOWED_ORIGINS=http://localhost:3000",
  ].join("\n");
}

async function freshDatabase() {
  await server?.stop();
  await pg?.close();
  pg = await PGlite.create();
  const port = 47000 + Math.floor(Math.random() * 3000);
  server = new PGLiteSocketServer({ db: pg, port, host: "127.0.0.1" });
  await server.start();
  dbUrl = `postgresql://postgres:onboarding-db-password@127.0.0.1:${port}/postgres`;
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "flowstack-onboard-"));
  ({ root: project } = await generate(sourceRoot, join(dir, "onboard-app"), {
    mode: "organization",
    frontend: "react",
  }));
  // Reuse installed dependencies instead of installing again.
  await symlink(
    join(sourceRoot, "node_modules"),
    join(project, "node_modules"),
  );
  await symlink(
    join(sourceRoot, "packages/db/node_modules"),
    join(project, "packages/db/node_modules"),
  );
}, 120000);
afterAll(async () => {
  await server?.stop();
  await pg?.close();
  await rm(dir, { recursive: true, force: true });
});

function onboard(args: string[], env: Record<string, string> = {}) {
  const clean = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) =>
        !/^(FLOWSTACK_|CI$|NODE_ENV$|DATABASE_URL$|CLAUDE|INFISICAL_)/.test(k),
    ),
  );
  const child = spawn(
    "node",
    ["scripts/onboard.mjs", "--non-interactive", ...args],
    {
      cwd: project,
      env: { ...clean, ...env },
    },
  );
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  return new Promise<{ status: number | null; output: string }>((resolve) =>
    child.on("close", (status) => resolve({ status, output })),
  );
}
const appliedCount = async () =>
  (
    await pg
      .query<{ n: number }>(
        "select count(*)::int as n from drizzle.__drizzle_migrations",
      )
      .catch(() => ({ rows: [{ n: 0 }] }))
  ).rows[0].n;

test("placeholders stop before the database and nothing secret is printed", async () => {
  await freshDatabase();
  const result = await onboard([]);
  expect(result.status).toBe(0);
  expect(result.output).toContain("! Secrets");
  expect(result.output).toContain(
    "DATABASE_URL still has the example placeholder",
  );
  expect(result.output).toContain("- Database    waiting for secrets");
  expect(result.output).toContain("Setup is resumable");
  expect(await appliedCount()).toBe(0);
}, 60000);

test("pending migrations are reported but not applied without consent", async () => {
  await freshDatabase();
  await writeFile(join(project, "apps/server/.env"), serverEnv(dbUrl));
  const result = await onboard([]);
  expect(result.output).toContain("✓ Secrets");
  expect(result.output).toContain("✓ Database");
  expect(result.output).toContain("! Migrations  7 pending");
  expect(await appliedCount()).toBe(0);
  for (const value of [
    SECRET,
    "onboarding-db-password",
    "onboarding-r2-secret",
  ])
    expect(result.output).not.toContain(value);
}, 60000);

test("--migrate applies development migrations and finishes ready; rerun is a no-op", async () => {
  const first = await onboard(["--migrate"]);
  expect(first.output).toContain(
    "✓ Migrations  applied; up to date (7 applied)",
  );
  expect(first.output).toContain("✓ Doctor");
  expect(first.output).toContain("Ready. Start developing");
  expect(await appliedCount()).toBe(7);
  const again = await onboard(["--migrate", "--strict"]);
  expect(again.status).toBe(0);
  expect(again.output).toContain("✓ Migrations  up to date (7 applied)");
}, 120000);

test("Infisical projects onboard through injected secrets only", async () => {
  await freshDatabase();
  await rm(join(project, "apps/server/.env"));
  const configPath = join(project, ".flowstack.json");
  const original = await readFile(configPath, "utf8");
  const config = JSON.parse(original);
  config.integrations.infisical = true;
  config.infisical.projectId = "proj-onboard";
  await writeFile(configPath, JSON.stringify(config));
  const stub = join(dir, "infisical");
  const injected = serverEnv(dbUrl)
    .split("\n")
    .map((line) => `export ${line.replace("=", "='")}'`)
    .join("\n");
  await writeFile(
    stub,
    `#!/bin/bash\nif [ "$1" = "--version" ]; then echo "infisical version stub"; exit 0; fi\nwhile [ "$1" != "--" ]; do shift; done; shift\n${injected}\nexec "$@"\n`,
  );
  await chmod(stub, 0o755);
  try {
    const result = await onboard(["--migrate"], { INFISICAL_BIN: stub });
    expect(result.output).toContain(
      '✓ Secrets     Infisical "dev": required names present',
    );
    expect(result.output).toContain("✓ Migrations  applied");
    expect(result.output).toContain("Ready. Start developing");
    expect(await appliedCount()).toBe(7);
    expect(result.output).not.toContain(SECRET);
  } finally {
    await writeFile(configPath, original);
    await writeFile(join(project, "apps/server/.env"), serverEnv(dbUrl));
  }
}, 120000);

test("onboarding refuses any non-development target", async () => {
  const result = await onboard(["--migrate"], { FLOWSTACK_ENV: "production" });
  expect(result.status).toBe(1);
  expect(result.output).toContain("only touches the development environment");
});

test("setup itself has no third-party imports, so it runs before bun install", async () => {
  const seen = new Set<string>();
  const visit = async (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = await readFile(file, "utf8");
    for (const [, spec] of text.matchAll(/^import[^"']*["']([^"']+)["']/gm)) {
      if (spec.startsWith(".")) await visit(join(file, "..", spec));
      else expect(spec.startsWith("node:")).toBe(true);
    }
  };
  await visit(join(sourceRoot, "scripts/setup.mjs"));
  expect(seen.size).toBeGreaterThan(2);
});
