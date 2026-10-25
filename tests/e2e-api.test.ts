// End-to-end API tests: the production build of the API (Node.js), real
// migrations on an isolated PostgreSQL (PGlite over the wire protocol), and a
// local mail catcher instead of ZeptoMail. Covers registration, email
// verification, login, logout, sessions, protected routes, organization
// membership, invitations and authentication bypass attempts.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import {
  TEMPLATE_FEATURES,
  TEMPLATE_MODE,
} from "../packages/config/src/config/preset";

const root = join(import.meta.dir, "..");
const FRONTEND = "http://localhost:3000";
const AUTH_SECRET = "e2e-auth-secret-value-at-least-32-characters";
const PASSWORD = "E2e-Password-123!";
const organizationMode = TEMPLATE_MODE === "organization";

let pg: PGlite;
let db: PGLiteSocketServer;
let mail: Server;
let api: ChildProcess;
let base: string;
let outdir: string;
const mails: { to: string; body: string }[] = [];
const logs: string[] = [];

function run(
  cmd: string,
  args: string[],
  env: Record<string, string>,
  cwd = root,
) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env } });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  return new Promise<{ code: number | null; out: string }>((resolve) =>
    child.on("close", (code) => resolve({ code, out })),
  );
}

beforeAll(async () => {
  pg = await PGlite.create();
  const dbPort = 43000 + Math.floor(Math.random() * 3000);
  db = new PGLiteSocketServer({ db: pg, port: dbPort, host: "127.0.0.1" });
  await db.start();
  const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres`;
  const migrated = await run("node", ["scripts/db.mjs", "migrate"], {
    DATABASE_URL: databaseUrl,
    FLOWSTACK_ENV: "",
    NODE_ENV: "",
  });
  if (migrated.code !== 0) throw new Error(migrated.out);

  mail = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      mails.push({
        to: parsed.to?.[0]?.email_address?.address || "",
        body: parsed.htmlbody || "",
      });
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          data: [{ code: "EM_101", message: "Email request received" }],
        }),
      );
    });
  });
  await new Promise<void>((resolve) => mail.listen(0, "127.0.0.1", resolve));
  const mailPort = (mail.address() as { port: number }).port;

  outdir = await mkdtemp(join(tmpdir(), "flowstack-e2e-"));
  const build = spawnSync(
    "bun",
    ["build", "src/index.ts", "--target=node", `--outdir=${outdir}`],
    {
      cwd: join(root, "apps/server"),
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8",
    },
  );
  if (build.status !== 0) throw new Error(build.stderr);

  const port = 44000 + Math.floor(Math.random() * 3000);
  base = `http://127.0.0.1:${port}`;
  api = spawn("node", [join(outdir, "index.js")], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      PORT: String(port),
      BETTER_AUTH_URL: base,
      BETTER_AUTH_SECRET: AUTH_SECRET,
      FRONTEND_URL: FRONTEND,
      ALLOWED_ORIGINS: FRONTEND,
      DATABASE_URL: databaseUrl,
      DATABASE_POOL_MAX: "1",
      ZEPTOMAIL_API_KEY: "e2e-not-a-real-key",
      ZEPTO_URL: `http://127.0.0.1:${mailPort}/`,
      // The load balancer's own IP: Google's external Application Load
      // Balancer sends "X-Forwarded-For: <client>,<load-balancer-ip>".
      AUTH_TRUSTED_PROXIES: "35.191.0.7",
      EMAIL_FROM_ADDRESS: "noreply@example.com",
      R2_ACCESS_KEY_ID: "e2e-access-key",
      R2_SECRET_ACCESS_KEY: "e2e-r2-secret-access-key",
      R2_ENDPOINT_URL: "https://e2e-account.r2.cloudflarestorage.com",
      R2_BUCKET_NAME: "e2e-bucket",
    },
  });
  api.stdout?.on("data", (d) => logs.push(String(d)));
  api.stderr?.on("data", (d) => logs.push(String(d)));
  for (let i = 0; i < 100; i++) {
    if (api.exitCode !== null) throw new Error(logs.join(""));
    try {
      if ((await fetch(`${base}/health/ready`)).ok) return;
    } catch {
      /* starting */
    }
    await Bun.sleep(100);
  }
  throw new Error(`API did not become ready: ${logs.join("")}`);
}, 180000);

afterAll(async () => {
  api?.kill("SIGTERM");
  mail?.close();
  await db?.stop();
  await pg?.close();
  if (outdir) await rm(outdir, { recursive: true, force: true });
});

let ipCounter = 10;
/** A browser-like client: its own cookie jar and client IP. */
function browser() {
  const cookies = new Map<string, string>();
  const ip = `203.0.113.${ipCounter++}`;
  return {
    cookies,
    async call(
      path: string,
      {
        method,
        body,
        origin = FRONTEND,
        headers = {},
      }: {
        method?: string;
        body?: unknown;
        origin?: string | null;
        headers?: Record<string, string>;
      } = {},
    ) {
      const response = await fetch(`${base}${path}`, {
        method: method || (body === undefined ? "GET" : "POST"),
        redirect: "manual",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ip,
          ...(origin ? { Origin: origin } : {}),
          ...(cookies.size
            ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") }
            : {}),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const [pair] = cookie.split(";");
        const index = pair.indexOf("=");
        const value = pair.slice(index + 1);
        if (value) cookies.set(pair.slice(0, index), value);
        else cookies.delete(pair.slice(0, index));
      }
      return response;
    },
  };
}
const json = async (response: Response) => response.json().catch(() => null);

async function signUp(email: string, extra: Record<string, unknown> = {}) {
  const client = browser();
  const response = await client.call("/api/auth/sign-up/email", {
    body: { email, password: PASSWORD, name: email.split("@")[0], ...extra },
  });
  expect(response.status).toBe(200);
  return client;
}

async function verifyByEmailLink(
  client: ReturnType<typeof browser>,
  email: string,
) {
  let link: string | undefined;
  for (let i = 0; i < 50 && !link; i++) {
    const message = mails.findLast(
      (m) => m.to === email && m.body.includes("verify-email"),
    );
    link = message?.body
      .replaceAll("&amp;", "&")
      .match(/https?:\/\/[^"'\s<>]*verify-email\?token=[^"'\s<>]+/)?.[0];
    if (!link) await Bun.sleep(50);
  }
  expect(link).toBeDefined();
  const url = new URL(link!);
  return client.call(`${url.pathname}${url.search}`);
}

async function uploadUrl(
  client: ReturnType<typeof browser>,
  query: Record<string, string>,
) {
  return client.call(
    `/api/storage/upload-url?${new URLSearchParams({ fileName: "avatar.png", contentType: "image/png", ...query })}`,
  );
}

describe("account lifecycle", () => {
  test("register, verify by email link, sign out, sign in, session", async () => {
    const email = "lifecycle@example.com";
    const user = await signUp(email);
    const session = await json(await user.call("/api/auth/get-session"));
    expect(session.user.email).toBe(email);
    expect(session.user.emailVerified).toBe(false);

    if (TEMPLATE_FEATURES.email) {
      const verified = await verifyByEmailLink(user, email);
      expect([200, 302]).toContain(verified.status);
      expect(
        (await json(await user.call("/api/auth/get-session"))).user
          .emailVerified,
      ).toBe(true);
    }

    expect((await user.call("/api/auth/sign-out", { body: {} })).status).toBe(
      200,
    );
    expect(await json(await user.call("/api/auth/get-session"))).toBeNull();

    const wrong = await user.call("/api/auth/sign-in/email", {
      body: { email, password: "Wrong-Password-1!" },
    });
    expect(wrong.status).toBe(401);
    const signIn = await user.call("/api/auth/sign-in/email", {
      body: { email, password: PASSWORD },
    });
    expect(signIn.status).toBe(200);
    expect(
      (await json(await user.call("/api/auth/get-session"))).user.email,
    ).toBe(email);
  }, 60000);

  test("a session in one client is not shared with another", async () => {
    await signUp("isolated@example.com");
    expect(
      await json(await browser().call("/api/auth/get-session")),
    ).toBeNull();
  });
});

describe("protected routes and bypass attempts", () => {
  test("anonymous and forged credentials are rejected", async () => {
    const anonymous = browser();
    expect((await uploadUrl(anonymous, {})).status).toBe(
      TEMPLATE_FEATURES.storage ? 401 : 503,
    );
    if (!TEMPLATE_FEATURES.storage) return;

    const forged = browser();
    forged.cookies.set(
      "better-auth.session_token",
      "forged-token.forged-signature",
    );
    expect((await uploadUrl(forged, {})).status).toBe(401);

    const bearer = browser();
    expect(
      (
        await bearer.call("/api/storage/get-all", {
          headers: { Authorization: "Bearer not-a-real-session" },
        })
      ).status,
    ).toBe(401);

    // A real token with a tampered signature.
    const real = await signUp("tamper@example.com");
    const [name, value] = [...real.cookies].find(([k]) =>
      k.includes("session_token"),
    )!;
    const tampered = browser();
    tampered.cookies.set(
      name,
      `${value.split(".")[0]}.AAAA${value.split(".")[1]?.slice(4) || ""}`,
    );
    expect((await uploadUrl(tampered, {})).status).toBe(401);
  });

  test("cross-site requests to auth endpoints are refused", async () => {
    const attacker = browser();
    const evil = await attacker.call("/api/auth/sign-in/email", {
      body: { email: "lifecycle@example.com", password: PASSWORD },
      origin: "https://evil.example",
    });
    expect(evil.status).toBe(403);
    const preflight = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(preflight.headers.get("access-control-allow-origin")).toBeNull();
    const allowed = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "OPTIONS",
      headers: { Origin: FRONTEND, "Access-Control-Request-Method": "POST" },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe(FRONTEND);
  });

  test.skipIf(!TEMPLATE_FEATURES.storage)(
    "users can only reach their own storage namespace",
    async () => {
      const alice = await signUp("alice-storage@example.com");
      const bob = await signUp("bob-storage@example.com");
      const aliceId = (await json(await alice.call("/api/auth/get-session")))
        .user.id;
      const own = await uploadUrl(alice, {});
      expect(own.status).toBe(200);
      expect((await json(own)).filePath).toStartWith(
        `uploads/users/${aliceId}/`,
      );
      // Bob cannot read, list or delete Alice's files.
      const path = `uploads/users/${aliceId}/avatar.png`;
      expect(
        (
          await bob.call(
            `/api/storage/download-url?filePath=${encodeURIComponent(path)}`,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await bob.call(
            `/api/storage/get-all?prefix=${encodeURIComponent(`uploads/users/${aliceId}/`)}`,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await bob.call(
            `/api/storage/delete?filePath=${encodeURIComponent(path)}`,
            { method: "DELETE" },
          )
        ).status,
      ).toBe(403);
      // Traversal and absolute paths are rejected.
      expect((await uploadUrl(bob, { fileName: "../escape.png" })).status).toBe(
        400,
      );
      expect(
        (
          await bob.call(
            `/api/storage/download-url?filePath=${encodeURIComponent(`uploads/users/x/../../${path}`)}`,
          )
        ).status,
      ).toBe(400);
    },
  );
});

describe.skipIf(!organizationMode)("organizations", () => {
  test("membership controls organization storage, and invitations grant it", async () => {
    const owner = await signUp("owner-e2e@example.com", {
      shouldOnboard: false,
    });
    const created = await owner.call(
      "/api/auth/onboarding/step/create-organization",
      { body: { organizationName: "E2E Team" } },
    );
    expect(created.status).toBe(200);
    const orgId = (await json(await owner.call("/api/auth/get-session")))
      .session.activeOrganizationId;
    expect(orgId).toBeTruthy();

    const outsider = await signUp("outsider-e2e@example.com");
    if (TEMPLATE_FEATURES.storage) {
      expect((await uploadUrl(owner, { organizationId: orgId })).status).toBe(
        200,
      );
      expect(
        (await uploadUrl(outsider, { organizationId: orgId })).status,
      ).toBe(403);
    }
    // A non-member cannot make the organization active or list its members.
    const activate = await outsider.call("/api/auth/organization/set-active", {
      body: { organizationId: orgId },
    });
    expect(activate.status).toBeGreaterThanOrEqual(400);
    const members = await outsider.call(
      `/api/auth/organization/list-members?organizationId=${orgId}`,
    );
    expect(members.status).toBeGreaterThanOrEqual(400);

    // Invitations require the invited, verified user.
    const ownerEmail = "owner-e2e@example.com";
    if (TEMPLATE_FEATURES.email) await verifyByEmailLink(owner, ownerEmail);
    else
      await pg.query(
        `update "user" set email_verified = true where email = $1`,
        [ownerEmail],
      );
    const invite = await owner.call("/api/auth/organization/invite-member", {
      body: {
        email: "invitee-e2e@example.com",
        role: "member",
        organizationId: orgId,
      },
    });
    expect(invite.status).toBe(200);
    const invitationId = (await json(invite)).id;
    if (TEMPLATE_FEATURES.email)
      expect(mails.some((m) => m.to === "invitee-e2e@example.com")).toBe(true);

    expect(
      (
        await outsider.call("/api/auth/organization/accept-invitation", {
          body: { invitationId },
        })
      ).status,
    ).toBe(403);

    const invitee = await signUp("invitee-e2e@example.com", {
      callbackURL: `${FRONTEND}/accept-invitation?invitationId=${invitationId}`,
    });
    if (TEMPLATE_FEATURES.email)
      await verifyByEmailLink(invitee, "invitee-e2e@example.com");
    else
      await pg.query(
        `update "user" set email_verified = true where email = 'invitee-e2e@example.com'`,
      );
    const accepted = await invitee.call(
      "/api/auth/organization/accept-invitation",
      { body: { invitationId } },
    );
    expect(accepted.status).toBe(200);
    expect(
      (await json(await invitee.call("/api/auth/get-session"))).session
        .activeOrganizationId,
    ).toBe(orgId);
    if (TEMPLATE_FEATURES.storage)
      expect((await uploadUrl(invitee, { organizationId: orgId })).status).toBe(
        200,
      );
  }, 60000);
});

describe("safe failures and logging", () => {
  test("errors do not leak internals", async () => {
    const notFound = await fetch(`${base}/api/does-not-exist`);
    expect(notFound.status).toBe(404);
    expect(await notFound.json()).toEqual({ error: "Not Found" });
    const malformed = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: FRONTEND },
      body: "{not json",
    });
    expect(malformed.status).toBeGreaterThanOrEqual(400);
    expect(malformed.status).toBeLessThan(500);
    expect(await malformed.text()).not.toMatch(/at \S+ \(|node_modules/);
    // No debug route in production.
    expect((await fetch(`${base}/debug/sentry`)).status).toBe(404);
  });

  test("logs are structured and never contain passwords, secrets or session tokens", async () => {
    const all = logs.join("");
    const lines = all.split("\n").filter((l) => l.startsWith("{"));
    expect(lines.length).toBeGreaterThan(5);
    for (const line of lines) expect(JSON.parse(line).severity).toBeDefined();
    expect(all).not.toContain(PASSWORD);
    expect(all).not.toContain(AUTH_SECRET);
    expect(all).not.toContain("e2e-r2-secret-access-key");
    expect(all).not.toContain("e2e-not-a-real-key");
    expect(all).not.toMatch(/session_token=/);
  });
});

describe("rate limiting behind a proxy", () => {
  // Sign-in allows 3 attempts per 10 s per client. Behind a load balancer the
  // client IP arrives as "client, proxy"; without trusted proxies every client
  // would share one bucket and a few failures would lock everyone out.
  const attempt = (client: string, chain?: string) =>
    fetch(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: FRONTEND,
        "X-Forwarded-For": chain ?? `${client}, 35.191.0.7`,
      },
      body: JSON.stringify({
        email: "lifecycle@example.com",
        password: "Wrong-Password-1!",
      }),
    });

  test("each client behind the proxy has its own bucket", async () => {
    const statuses = [];
    for (let i = 0; i < 4; i++)
      statuses.push((await attempt("198.51.100.1")).status);
    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses[3]).toBe(429);
    // A different client is unaffected.
    expect((await attempt("198.51.100.2")).status).toBe(401);
  });

  test("a forged left-most address does not escape the limit", async () => {
    const forged = await attempt("", "192.0.2.99, 198.51.100.1, 35.191.0.7");
    expect(forged.status).toBe(429);
  });
});
