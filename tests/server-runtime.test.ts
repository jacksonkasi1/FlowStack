// Builds the API exactly as production does and runs it with Node.js, with
// and without Sentry. Sentry events go to a local fake ingest server, so
// this proves wiring and privacy, not delivery to sentry.io (see
// `bun run sentry:verify` for the live check).
import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { gunzipSync } from "node:zlib";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TEMPLATE_FEATURES } from "../packages/config/src/config/preset";

const root = join(import.meta.dir, "..");
const SECRET_COOKIE = "session-cookie-value-must-not-leak";
const SECRET_BEARER = "bearer-token-value-must-not-leak";
const SECRET_QUERY = "query-token-value-must-not-leak";
let outdir: string;
let ingest: Server;
let ingestPort: number;
const envelopes: string[] = [];

beforeAll(async () => {
  outdir = await mkdtemp(join(tmpdir(), "flowstack-server-"));
  // Same as `bun run build`: Bun inlines process.env.NODE_ENV at build time.
  const build = spawnSync(
    "bun",
    ["../../scripts/build-server.mjs", "--outdir", outdir],
    {
      cwd: join(root, "apps/server"),
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production" },
    },
  );
  if (build.status !== 0) throw new Error(build.stderr);
  ingest = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      let body = Buffer.concat(chunks);
      if (req.headers["content-encoding"] === "gzip") body = gunzipSync(body);
      envelopes.push(body.toString());
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => ingest.listen(0, "127.0.0.1", resolve));
  ingestPort = (ingest.address() as { port: number }).port;
}, 120000);
afterAll(async () => {
  ingest?.close();
  await rm(outdir, { recursive: true, force: true });
});

async function startServer(port: number, extra: Record<string, string>) {
  const logs: string[] = [];
  const child: ChildProcess = spawn("node", [join(outdir, "index.js")], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "development",
      PORT: String(port),
      BETTER_AUTH_URL: `http://localhost:${port}`,
      BETTER_AUTH_SECRET: "runtime-test-secret-at-least-32-characters",
      FRONTEND_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://u:p@127.0.0.1:1/unreachable",
      R2_ACCESS_KEY_ID: "test",
      R2_SECRET_ACCESS_KEY: "test",
      R2_ENDPOINT_URL: "http://127.0.0.1:1",
      R2_BUCKET_NAME: "test",
      ...extra,
    },
  });
  child.stdout?.on("data", (d) => logs.push(String(d)));
  child.stderr?.on("data", (d) => logs.push(String(d)));
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error(`Server exited: ${logs.join("")}`);
    try {
      await fetch(`http://127.0.0.1:${port}/health/live`);
      return { child, logs };
    } catch {
      await Bun.sleep(100);
    }
  }
  child.kill();
  throw new Error(`Server did not start: ${logs.join("")}`);
}

async function stop(child: ChildProcess) {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

test("health endpoints, request IDs and safe errors without Sentry", async () => {
  const port = 18400 + Math.floor(Math.random() * 500);
  const before = envelopes.length;
  const { child, logs } = await startServer(port, {});
  try {
    const live = await fetch(`http://127.0.0.1:${port}/health/live`);
    expect(await live.json()).toEqual({ status: "live" });
    expect(live.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    const legacy = await fetch(`http://127.0.0.1:${port}/health`);
    expect((await legacy.json()).status).toBe("healthy");
    // The database is unreachable: readiness fails without leaking details.
    const ready = await fetch(`http://127.0.0.1:${port}/health/ready`);
    expect(ready.status).toBe(503);
    expect(await ready.json()).toEqual({ status: "unavailable" });
    const error = await fetch(`http://127.0.0.1:${port}/debug/sentry`);
    expect(error.status).toBe(500);
    const body = await error.json();
    expect(body.error).toBe("Internal Server Error");
    expect(JSON.stringify(body)).not.toContain("verification error");
    // Storage rejects unauthenticated access, or reports itself disabled
    // when the preset turned storage off.
    expect(
      (await fetch(`http://127.0.0.1:${port}/api/storage/get-all`)).status,
    ).toBe(TEMPLATE_FEATURES.storage ? 401 : 503);
  } finally {
    await stop(child);
  }
  expect(envelopes.length).toBe(before);
  expect(logs.join("")).not.toContain("runtime-test-secret");
}, 60000);

test("with a DSN, errors reach Sentry without cookies, auth headers or query values", async () => {
  const port = 18900 + Math.floor(Math.random() * 500);
  const { child, logs } = await startServer(port, {
    SENTRY_DSN: `http://publickey@127.0.0.1:${ingestPort}/1`,
    SENTRY_RELEASE: "test-release",
  });
  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/debug/sentry?token=${SECRET_QUERY}`,
      {
        headers: {
          Cookie: `better-auth.session_token=${SECRET_COOKIE}`,
          Authorization: `Bearer ${SECRET_BEARER}`,
        },
      },
    );
    expect(response.status).toBe(500);
    for (
      let i = 0;
      i < 50 && !envelopes.some((e) => e.includes('"type":"event"'));
      i++
    )
      await Bun.sleep(100);
  } finally {
    await stop(child);
  }
  const event = envelopes.find((e) => e.includes('"type":"event"'));
  expect(event).toBeDefined();
  expect(event).toContain("FlowStack Sentry verification error");
  expect(event).toContain("test-release");
  const all = envelopes.join("\n");
  for (const secret of [
    SECRET_COOKIE,
    SECRET_BEARER,
    SECRET_QUERY,
    "runtime-test-secret",
  ])
    expect(all).not.toContain(secret);
  expect(logs.join("")).not.toContain(SECRET_BEARER);
}, 60000);

test("the production bundle has development-only behaviour compiled out", async () => {
  const bundle = await Bun.file(join(outdir, "index.js")).text();
  // Regression: an unset NODE_ENV at build time used to enable SQL query logging.
  const client = bundle.slice(
    bundle.indexOf("DATABASE_URL is required but was not found"),
  );
  expect(client).toMatch(/const logger\d* = false;/);
  expect(client.slice(0, 600)).not.toMatch(/logger\d* = true/);
});

test("production builds expose no debug route", async () => {
  const port = 19400 + Math.floor(Math.random() * 500);
  const { child } = await startServer(port, { NODE_ENV: "production" });
  try {
    expect((await fetch(`http://127.0.0.1:${port}/debug/sentry`)).status).toBe(
      404,
    );
  } finally {
    await stop(child);
  }
}, 60000);
