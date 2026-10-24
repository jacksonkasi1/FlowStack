#!/usr/bin/env node
// Starts an isolated full stack for browser tests (Playwright `webServer`):
// PGlite over the Postgres wire protocol, migrations, the production API
// build, a mail catcher (GET /mails) and the selected frontend's production
// build. Nothing external is contacted. Stops everything on SIGTERM/SIGINT.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readProjectConfig } from "../scripts/lib/project-config.mjs";

const root = resolve(import.meta.dirname, "..");
export const PORTS = {
  db: Number(process.env.E2E_DB_PORT || 15432),
  api: Number(process.env.E2E_API_PORT || 18080),
  web: Number(process.env.E2E_WEB_PORT || 14173),
  mail: Number(process.env.E2E_MAIL_PORT || 18025),
};
const config = await readProjectConfig(root);
const frontend = process.env.E2E_FRONTEND || config?.frontend || "react";
const api = `http://localhost:${PORTS.api}`;
const web = `http://localhost:${PORTS.web}`;
const children = [];
const temp = mkdtempSync(join(tmpdir(), "flowstack-e2e-stack-"));

function step(label, cmd, args, env = {}, cwd = root) {
  const result = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
    process.exit(1);
  }
}
function start(cmd, args, env, cwd = root) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "inherit", "inherit"],
  });
  children.push(child);
  return child;
}
function stop() {
  for (const child of children) child.kill("SIGTERM");
  rmSync(temp, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

const pg = await PGlite.create();
await new PGLiteSocketServer({
  db: pg,
  port: PORTS.db,
  host: "127.0.0.1",
}).start();
const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${PORTS.db}/postgres`;
// Migration runs in a child process while this process serves the database.
const migrate = spawn(process.execPath, ["scripts/db.mjs", "migrate"], {
  cwd: root,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    FLOWSTACK_ENV: "",
    NODE_ENV: "",
  },
  stdio: "inherit",
});
if ((await new Promise((r) => migrate.on("close", r))) !== 0) process.exit(1);

const mails = [];
createServer((req, res) => {
  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(mails));
    return;
  }
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const parsed = JSON.parse(body || "{}");
    mails.push({
      to: parsed.to?.[0]?.email_address?.address,
      html: parsed.htmlbody,
    });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ data: [{ code: "EM_101", message: "ok" }] }));
  });
}).listen(PORTS.mail, "127.0.0.1");

step(
  "API build",
  "bun",
  ["build", "src/index.ts", "--target=node", `--outdir=${temp}`],
  { NODE_ENV: "production" },
  join(root, "apps/server"),
);
start(process.execPath, [join(temp, "index.js")], {
  NODE_ENV: "production",
  PORT: String(PORTS.api),
  BETTER_AUTH_URL: api,
  BETTER_AUTH_SECRET: "e2e-browser-auth-secret-at-least-32-chars",
  FRONTEND_URL: web,
  ALLOWED_ORIGINS: web,
  DATABASE_URL: databaseUrl,
  DATABASE_POOL_MAX: "1",
  ZEPTOMAIL_API_KEY: "e2e-not-a-real-key",
  ZEPTO_URL: `http://127.0.0.1:${PORTS.mail}/`,
  EMAIL_FROM_ADDRESS: "noreply@example.com",
  R2_ACCESS_KEY_ID: "e2e",
  R2_SECRET_ACCESS_KEY: "e2e-r2-secret",
  R2_ENDPOINT_URL: "https://e2e.r2.cloudflarestorage.com",
  R2_BUCKET_NAME: "e2e",
});

const app = frontend === "tanstack" ? "apps/tanstack" : "apps/web";
const viteEnv = { VITE_API_BASE_URL: api, VITE_SENTRY_DSN: "" };
step("Frontend build", "bun", ["run", "build"], viteEnv, join(root, app));
if (frontend === "tanstack")
  start(
    process.execPath,
    [".output/server/index.mjs"],
    { ...viteEnv, PORT: String(PORTS.web), HOST: "localhost" },
    join(root, app),
  );
else
  start(
    join(root, app, "node_modules/.bin/vite"),
    [
      "preview",
      "--port",
      String(PORTS.web),
      "--strictPort",
      "--host",
      "localhost",
    ],
    viteEnv,
    join(root, app),
  );

console.log(`E2E stack: ${frontend} ${web}, API ${api}, mail ${PORTS.mail}`);
