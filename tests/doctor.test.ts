import { afterAll, beforeAll, expect, test } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { generate, sourceRoot } from "../scripts/setup.mjs";
import { formatReport, runChecks } from "../scripts/doctor.mjs";

const SENTINELS = {
  BETTER_AUTH_SECRET: "doctor-sentinel-auth-secret-0123456789abcdef",
  R2_SECRET_ACCESS_KEY: "doctor-sentinel-r2-secret-access-key",
  ZEPTOMAIL_API_KEY: "doctor-sentinel-zeptomail-key",
};
let dir: string;
let project: string;
let pg: PGlite;
let server: PGLiteSocketServer;
let dbUrl: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "flowstack-doctor-"));
  ({ root: project } = await generate(sourceRoot, join(dir, "doctor-app"), {
    mode: "organization",
    frontend: "react",
    enable: [],
    disable: [],
  }));
  pg = await PGlite.create();
  const port = 52000 + Math.floor(Math.random() * 3000);
  server = new PGLiteSocketServer({ db: pg, port, host: "127.0.0.1" });
  await server.start();
  dbUrl = `postgresql://postgres:doctor-sentinel-db-password@127.0.0.1:${port}/postgres`;
}, 120000);
afterAll(async () => {
  await server?.stop();
  await pg?.close();
  await rm(dir, { recursive: true, force: true });
});

function baseEnv(extra: Record<string, string> = {}) {
  return {
    PATH: process.env.PATH!,
    HOME: process.env.HOME!,
    ...SENTINELS,
    BETTER_AUTH_URL: "http://localhost:8080",
    FRONTEND_URL: "http://localhost:3000",
    DATABASE_URL: dbUrl,
    EMAIL_FROM_ADDRESS: "noreply@example.com",
    R2_ACCESS_KEY_ID: "doctor-r2-access",
    R2_ENDPOINT_URL: "https://example.r2.cloudflarestorage.com",
    R2_BUCKET_NAME: "bucket",
    ...extra,
  };
}

test("reports every check and never prints secret values", async () => {
  const checks = await runChecks({
    root: project,
    env: baseEnv(),
    timeoutMs: 3000,
  });
  const byName = Object.fromEntries(checks.map((c) => [c.name, c.status]));
  expect(byName["Project Config"]).toBe("PASS");
  expect(byName["Server Env"]).toBe("PASS");
  expect(byName["Database"]).toBe("PASS");
  expect(byName["Migrations"]).toBe("FAIL"); // fresh database: 7 pending
  expect(byName["Infisical CLI"]).toBe("SKIPPED");
  expect(byName["Sentry"]).toBe("SKIPPED");
  expect(byName["Cloudflare R2"]).toBe("PASS");
  expect(byName["Email"]).toBe("PASS");
  const text = formatReport(checks) + JSON.stringify(checks);
  for (const value of [
    ...Object.values(SENTINELS),
    "doctor-sentinel-db-password",
  ])
    expect(text).not.toContain(value);
  expect(formatReport(checks)).toContain("Run bun run db:migrate.");
}, 60000);

test("placeholders and confidential VITE_ names fail with a specific fix", async () => {
  const checks = await runChecks({
    root: project,
    env: baseEnv({
      BETTER_AUTH_SECRET: "your-secret-key-min-32-characters-long-change-this",
      VITE_STRIPE_SECRET_KEY: "pk-should-never-be-public",
    }),
    timeoutMs: 3000,
  });
  const server = checks.find((c) => c.name === "Server Env")!;
  expect(server.status).toBe("FAIL");
  expect(server.detail).toContain(
    "BETTER_AUTH_SECRET still has the example placeholder",
  );
  const frontend = checks.find((c) => c.name === "Frontend Config")!;
  expect(frontend.status).toBe("FAIL");
  expect(frontend.detail).toContain("VITE_STRIPE_SECRET_KEY");
  expect(JSON.stringify(checks)).not.toContain("pk-should-never-be-public");
}, 60000);

test("Infisical access failures are reported, not skipped, and dependent checks wait", async () => {
  const config = join(project, ".flowstack.json");
  const original = await Bun.file(config).text();
  const parsed = JSON.parse(original);
  parsed.integrations.infisical = true;
  parsed.infisical.projectId = "proj-doctor";
  await writeFile(config, JSON.stringify(parsed));
  const stub = join(dir, "infisical");
  await writeFile(
    stub,
    `#!/bin/bash\nif [ "$1" = "--version" ]; then echo "infisical version 9.9.9"; exit 0; fi\nif [ -n "$STUB_OK" ]; then exit 0; fi\necho "error: not logged in" >&2; exit 1\n`,
  );
  await chmod(stub, 0o755);
  const serverEnv = join(project, "apps/server/.env");
  const savedEnv = await Bun.file(serverEnv).text();
  await rm(serverEnv);
  try {
    // Infisical-only project: no local server .env and no process secrets.
    const env = {
      PATH: process.env.PATH!,
      HOME: process.env.HOME!,
      INFISICAL_BIN: stub,
    };
    const failing = await runChecks({ root: project, env, timeoutMs: 3000 });
    const status = (name: string) =>
      failing.find((c) => c.name === name)?.status;
    expect(status("Infisical CLI")).toBe("PASS");
    expect(status("Infisical Access")).toBe("FAIL");
    expect(status("Server Env")).toBe("FAIL");
    expect(status("Database")).toBe("SKIPPED");
    const ok = await runChecks({
      root: project,
      env: { ...env, STUB_OK: "1" },
      timeoutMs: 3000,
    });
    expect(ok.find((c) => c.name === "Infisical Access")?.status).toBe("PASS");
  } finally {
    await writeFile(config, original);
    await writeFile(serverEnv, savedEnv);
  }
}, 60000);
