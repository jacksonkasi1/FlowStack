import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadRuntimeSecrets,
  runtimeTarget,
} from "../scripts/lib/infisical-runtime.mjs";

const bootstrap = () => ({
  FLOWSTACK_SECRETS_SOURCE: "infisical",
  INFISICAL_PROJECT_ID: "test-project",
  INFISICAL_RUNTIME_IDENTITY_ID: "test-identity",
  INFISICAL_RUNTIME_ENVIRONMENT: "prod",
  INFISICAL_SECRET_PATH: "/api",
  NODE_ENV: "production",
  PORT: "8080",
});
const values = {
  DATABASE_URL: "postgresql://test:fixture-password@localhost/db",
  BETTER_AUTH_SECRET: "runtime-fixture-auth-value-32-characters",
  BETTER_AUTH_URL: "https://api.example.com",
  FRONTEND_URL: "https://app.example.com",
  DATABASE_DRIVER: "postgres",
  DATABASE_POOL_MAX: "5",
  LOG_FORMAT: "text",
};
const secrets = () =>
  Object.entries(values).map(([secretKey, secretValue]) => ({
    secretKey,
    secretValue,
  }));

function provider(data: unknown = { secrets: secrets() }, failAt = -1) {
  const calls: { url: URL; options: RequestInit }[] = [];
  const fetcher = async (url: string | URL, options: RequestInit) => {
    calls.push({ url: new URL(url), options });
    if (calls.length === failAt)
      return new Response("private-error-body", { status: 403 });
    if (calls.length === 1) return new Response("fixture-google-jwt");
    return Response.json(
      calls.length === 2 ? { accessToken: "fixture-access-token" } : data,
    );
  };
  return { calls, fetcher };
}

test("Cloud Run identity fetches production secrets before use without changing platform variables", async () => {
  const env: Record<string, string> = {
    ...bootstrap(),
    DATABASE_URL: "stale",
    GOOGLE_CLIENT_SECRET: "stale",
  };
  const { fetcher, calls } = provider({
    imports: [
      { secrets: [{ secretKey: "DATABASE_URL", secretValue: "imported" }] },
    ],
    secrets: [
      ...secrets(),
      { secretKey: "NODE_ENV", secretValue: "development" },
      { secretKey: "NODE_OPTIONS", secretValue: "--inspect" },
      { secretKey: "PORT", secretValue: "1" },
      { secretKey: "INFISICAL_TOKEN", secretValue: "not-for-the-app" },
    ],
  });
  await loadRuntimeSecrets(env, fetcher);
  expect(env.DATABASE_URL).toBe(values.DATABASE_URL);
  expect(env.DATABASE_DRIVER).toBe("postgres");
  expect(env.DATABASE_POOL_MAX).toBe("5");
  expect(env.LOG_FORMAT).toBe("text");
  expect(env.NODE_ENV).toBe("production");
  expect(env.PORT).toBe("8080");
  expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  expect(env.NODE_OPTIONS).toBeUndefined();
  expect(env.INFISICAL_TOKEN).toBeUndefined();
  expect(calls[0].url.hostname).toBe("metadata.google.internal");
  expect(calls[0].url.searchParams.get("audience")).toBe("test-identity");
  expect(calls[0].options.headers).toEqual({ "Metadata-Flavor": "Google" });
  expect(JSON.parse(calls[1].options.body as string)).toEqual({
    identityId: "test-identity",
    jwt: "fixture-google-jwt",
  });
  expect(calls[2].url.searchParams.get("environment")).toBe("prod");
  expect(calls[2].url.searchParams.get("secretPath")).toBe("/api");
  expect(calls[2].url.searchParams.get("projectId")).toBe("test-project");
  expect(calls[2].options.headers).toEqual({
    Authorization: "Bearer fixture-access-token",
  });
  expect(
    calls.every((c) => c.options.redirect === "error" && c.options.signal),
  ).toBe(true);
});

test("failures at metadata, login or secrets stop startup and never expose response bodies", async () => {
  for (const stage of [1, 2, 3]) {
    const env = bootstrap();
    const before = { ...env };
    const { fetcher } = provider(undefined, stage);
    try {
      await loadRuntimeSecrets(env, fetcher);
      throw new Error("startup unexpectedly succeeded");
    } catch (error) {
      expect((error as Error).message).toContain("Infisical startup failed");
      expect((error as Error).message).not.toContain("private-error-body");
    }
    expect(env).toEqual(before);
  }
});

test("missing or hidden values fail even if stale credentials exist in the environment", async () => {
  for (const data of [
    { secrets: [] },
    {
      secrets: [
        {
          secretKey: "DATABASE_URL",
          secretValue: "private",
          secretValueHidden: true,
        },
      ],
    },
    { secrets: "invalid" },
  ]) {
    const { fetcher } = provider(data);
    await expect(
      loadRuntimeSecrets({ ...bootstrap(), ...values }, fetcher),
    ).rejects.toThrow("Infisical startup failed");
  }
  const { fetcher } = provider();
  await expect(
    loadRuntimeSecrets(
      { ...bootstrap(), FLOWSTACK_RUNTIME_FEATURES: "storage" },
      fetcher,
    ),
  ).rejects.toThrow("R2_ACCESS_KEY_ID");
});

test("legacy startup does not contact Infisical; invalid bootstrap fails before fetching", async () => {
  const { calls, fetcher } = provider();
  await loadRuntimeSecrets({ NODE_ENV: "production" }, fetcher);
  expect(calls).toHaveLength(0);
  expect(() =>
    runtimeTarget({ ...bootstrap(), INFISICAL_RUNTIME_IDENTITY_ID: "" }),
  ).toThrow("INFISICAL_RUNTIME_IDENTITY_ID");
  expect(() =>
    runtimeTarget({
      ...bootstrap(),
      INFISICAL_DOMAIN: "http://untrusted.example",
    }),
  ).toThrow("HTTPS origin");
});

test("container entrypoint imports the server only after loading secrets and exits on failure", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "flowstack-runtime-"));
  try {
    await mkdir(join(fixture, "scripts/lib"), { recursive: true });
    await mkdir(join(fixture, "dist"));
    for (const file of [
      "server-entrypoint.mjs",
      "lib/infisical-runtime.mjs",
      "lib/env-manifest.mjs",
    ])
      await cp(
        join(import.meta.dir, "../scripts", file),
        join(fixture, "scripts", file),
      );
    await writeFile(
      join(fixture, "dist/index.js"),
      `if (process.env.DATABASE_URL !== ${JSON.stringify(values.DATABASE_URL)}) throw new Error("server imported before secrets"); console.log("APP_STARTED");`,
    );
    await writeFile(
      join(fixture, "provider.mjs"),
      `
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        if (process.env.TEST_REJECT === "1") return new Response("private-error-body", {status: 403});
        if (calls === 1) return new Response("fixture-jwt");
        return Response.json(calls === 2 ? {accessToken: "fixture-token"} : {secrets: ${JSON.stringify(secrets())}});
      };
    `,
    );
    for (const fail of [false, true]) {
      const child = Bun.spawn(
        [
          "node",
          "--import",
          join(fixture, "provider.mjs"),
          join(fixture, "scripts/server-entrypoint.mjs"),
        ],
        {
          env: {
            ...bootstrap(),
            TEST_REJECT: fail ? "1" : "0",
            PATH: process.env.PATH,
          },
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect(code).toBe(fail ? 1 : 0);
      expect(stdout.includes("APP_STARTED")).toBe(!fail);
      expect(stderr).not.toContain("private-error-body");
      expect(stdout + stderr).not.toContain("fixture-token");
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 30000);
