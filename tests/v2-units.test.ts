import { describe, expect, test } from "bun:test";
import {
  normalizeProjectConfig,
  suggestProjectName,
  validateProjectName,
  TEMPLATE_VERSION,
} from "../scripts/lib/project-config.mjs";
import {
  exposedConfidentialNames,
  isPlaceholder,
  validateEnv,
} from "../scripts/lib/env-manifest.mjs";
import {
  assertEnvironmentAllowed,
  detectAgent,
  infisicalRunArgs,
  resolveInfisicalTarget,
} from "../scripts/lib/infisical.mjs";
import { chooseSource } from "../scripts/dev.mjs";
import { assertMigrationAllowed, assertSeedAllowed } from "../scripts/db.mjs";
import {
  failedRevisions,
  rollbackTarget,
  sanitizeLabel,
  servingRevision,
  tagUrl,
} from "../scripts/cloud-run.mjs";
import { planSecrets, validateEnvFile } from "../scripts/deploy-preflight.mjs";
import { scanCommands } from "../scripts/secrets-scan.mjs";
import { redact } from "../packages/logs/src";
import {
  sampleRate,
  scrubSentryEvent,
  sentryDataCollection,
} from "../packages/config/src/config/monitoring";

const allOn = {
  email: true,
  storage: true,
  google: true,
  sentry: true,
  infisical: true,
};
const allOff = {
  email: false,
  storage: false,
  google: false,
  sentry: false,
  infisical: false,
};

describe(".flowstack.json", () => {
  test("v1 files normalise to schema 2 with legacy integrations and kept keys", () => {
    const config = normalizeProjectConfig({
      template: "FlowStack",
      version: 1,
      sourceCommit: "abc",
      mode: "personal",
      frontend: "react",
      backend: "node",
      customKey: "kept",
    });
    expect(config.version).toBe(2);
    expect(config.templateVersion).toBe("1.x");
    expect(config.mode).toBe("personal");
    expect(config.integrations).toEqual({
      email: true,
      storage: true,
      google: true,
      sentry: false,
      infisical: false,
    });
    expect(config.customKey).toBe("kept");
    expect(config.infisical.environments.production).toBe("prod");
  });
  test("the earliest {sourceCommit}-only shape still parses", () => {
    const config = normalizeProjectConfig({ sourceCommit: "abc" });
    expect(config.sourceCommit).toBe("abc");
    expect(config.mode).toBeNull();
  });
  test("schema 2 keeps its values and drops unknown integrations", () => {
    const config = normalizeProjectConfig({
      version: 2,
      templateVersion: TEMPLATE_VERSION,
      integrations: { sentry: true, bogus: true },
    });
    expect(config.integrations.sentry).toBe(true);
    expect("bogus" in config.integrations).toBe(false);
  });
  test("project names are validated and suggested", () => {
    expect(validateProjectName("my-app")).toBeNull();
    for (const bad of [
      "My-App",
      "1app",
      "a",
      "app-",
      "app--x",
      "app_x",
      "x".repeat(60),
    ])
      expect(validateProjectName(bad)).not.toBeNull();
    expect(suggestProjectName("My Cool_App!")).toBe("my-cool-app");
    expect(suggestProjectName("123")).toBe("flowstack-app");
  });
});

describe("environment manifest", () => {
  test("reports missing, placeholder and invalid values by name only", () => {
    const secret = "real-looking-secret-value-with-32-chars!";
    const results = validateEnv(
      {
        BETTER_AUTH_SECRET: secret,
        BETTER_AUTH_URL: "not a url",
        FRONTEND_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/flowstack",
      },
      { scope: "server", integrations: allOff },
    );
    const byName = Object.fromEntries(results.map((r) => [r.name, r.status]));
    expect(byName).toEqual({
      BETTER_AUTH_SECRET: "ok",
      BETTER_AUTH_URL: "invalid",
      FRONTEND_URL: "ok",
      DATABASE_URL: "placeholder",
    });
    expect(JSON.stringify(results)).not.toContain(secret);
  });
  test("feature variables are required only when the feature is enabled", () => {
    const names = (integrations: typeof allOn) =>
      validateEnv({}, { scope: "server", integrations }).map((r) => r.name);
    expect(names(allOff)).not.toContain("R2_BUCKET_NAME");
    expect(names(allOn)).toContain("R2_BUCKET_NAME");
    expect(names(allOn)).toContain("SENTRY_DSN");
  });
  test("short auth secrets and example placeholders are rejected", () => {
    const [result] = validateEnv(
      { BETTER_AUTH_SECRET: "short" },
      { scope: "server", integrations: allOff },
    );
    expect(result.status).toBe("invalid");
    expect(
      isPlaceholder("your-secret-key-min-32-characters-long-change-this"),
    ).toBe(true);
    expect(isPlaceholder("xxxxx")).toBe(true);
    expect(isPlaceholder("s3cr3t-production-value")).toBe(false);
  });
  test("confidential names with a VITE_ prefix are flagged", () => {
    expect(
      exposedConfidentialNames({
        VITE_API_BASE_URL: "x",
        VITE_SENTRY_DSN: "x",
        VITE_STRIPE_SECRET_KEY: "x",
        VITE_DATABASE_URL: "x",
      }),
    ).toEqual(["VITE_STRIPE_SECRET_KEY", "VITE_DATABASE_URL"]);
  });
});

describe("Infisical boundaries", () => {
  const config = normalizeProjectConfig({
    version: 2,
    infisical: { projectId: "proj-123" },
  });
  test("development secrets are allowed locally", () => {
    expect(() => assertEnvironmentAllowed("development", {})).not.toThrow();
  });
  test("non-development secrets need CI or an explicit operator override", () => {
    for (const env of ["sandbox", "beta", "production"]) {
      expect(() => assertEnvironmentAllowed(env, {})).toThrow("outside CI");
      expect(() => assertEnvironmentAllowed(env, { CI: "true" })).not.toThrow();
      expect(() =>
        assertEnvironmentAllowed(env, { FLOWSTACK_ALLOW_REMOTE_SECRETS: env }),
      ).not.toThrow();
    }
    // An override for one environment does not unlock another.
    expect(() =>
      assertEnvironmentAllowed("production", {
        FLOWSTACK_ALLOW_REMOTE_SECRETS: "beta",
      }),
    ).toThrow();
  });
  test("AI coding agents never receive non-development secrets, even in CI", () => {
    for (const marker of ["CLAUDECODE", "CURSOR_AGENT", "FLOWSTACK_AI_AGENT"]) {
      const env = {
        CI: "true",
        FLOWSTACK_ALLOW_REMOTE_SECRETS: "production",
        [marker]: "1",
      };
      expect(detectAgent(env)).toBe(marker);
      expect(() => assertEnvironmentAllowed("production", env)).toThrow(
        "AI coding agent",
      );
    }
  });
  test("targets map app environments to Infisical slugs without guessing", () => {
    expect(resolveInfisicalTarget("production", config, {})).toEqual({
      projectId: "proj-123",
      environment: "prod",
      secretPath: "/",
    });
    expect(() => resolveInfisicalTarget("staging", config, {})).toThrow(
      "Unknown environment",
    );
    expect(() =>
      resolveInfisicalTarget(
        "development",
        normalizeProjectConfig({ version: 2 }),
        {},
      ),
    ).toThrow("No Infisical project");
    expect(() =>
      resolveInfisicalTarget("development", config, {
        INFISICAL_SECRET_PATH: "server",
      }),
    ).toThrow("start with /");
  });
  test("run arguments pin project, environment and path explicitly", () => {
    const args = infisicalRunArgs(
      { projectId: "p", environment: "dev", secretPath: "/api" },
      ["node", "x.js"],
    );
    expect(args).toEqual([
      "run",
      "--silent",
      "--telemetry=false",
      "--projectId=p",
      "--env=dev",
      "--path=/api",
      "--",
      "node",
      "x.js",
    ]);
  });
  test("bun run dev picks the source explicitly", () => {
    expect(chooseSource([], null)).toBe("local");
    expect(chooseSource([], { integrations: { infisical: true } })).toBe(
      "infisical",
    );
    expect(
      chooseSource(["--local"], { integrations: { infisical: true } }),
    ).toBe("local");
    expect(chooseSource(["--secrets"], null)).toBe("infisical");
    expect(() => chooseSource(["--secrets", "--local"], null)).toThrow();
  });
});

describe("database safeguards", () => {
  test("production migrations only run in CI with an explicit flag", () => {
    expect(assertMigrationAllowed({}, [])).toBe("development");
    expect(() =>
      assertMigrationAllowed({ FLOWSTACK_ENV: "production" }, [
        "--allow-production",
      ]),
    ).toThrow();
    expect(() =>
      assertMigrationAllowed({ NODE_ENV: "production" }, []),
    ).toThrow();
    expect(
      assertMigrationAllowed({ FLOWSTACK_ENV: "production", CI: "true" }, [
        "--allow-production",
      ]),
    ).toBe("production");
    expect(() => assertMigrationAllowed({ FLOWSTACK_ENV: "beta" }, [])).toThrow(
      "--confirm-env=beta",
    );
    expect(
      assertMigrationAllowed({ FLOWSTACK_ENV: "beta" }, ["--confirm-env=beta"]),
    ).toBe("beta");
  });
  test("seed data is development-only", () => {
    expect(() => assertSeedAllowed({})).not.toThrow();
    expect(() => assertSeedAllowed({ FLOWSTACK_ENV: "sandbox" })).toThrow();
    expect(() => assertSeedAllowed({ NODE_ENV: "production" })).toThrow();
  });
});

describe("Cloud Run helpers", () => {
  const revision = (
    name: string,
    minutes: number,
    release = "abc",
    ready = true,
  ) => ({
    metadata: {
      name,
      creationTimestamp: new Date(
        Date.UTC(2026, 0, 1, 0, minutes),
      ).toISOString(),
      labels: release ? { "flowstack-release": release } : {},
    },
    status: {
      conditions: [{ type: "Ready", status: ready ? "True" : "False" }],
    },
  });
  test("rollback target is the newest earlier Ready FlowStack revision", () => {
    const revisions = [
      revision("svc-001", 1),
      revision("svc-002", 2),
      revision("svc-003", 3, "abc", false), // failed revision
      revision("svc-004", 4, ""), // created outside this script
      revision("svc-005", 5), // currently serving
      revision("svc-006", 6), // newer candidate, never served
    ];
    expect(rollbackTarget(revisions, "svc-005")).toBe("svc-002");
    expect(rollbackTarget(revisions, "svc-001")).toBeNull();
    // Revisions marked failed by deploy.sh are skipped.
    expect(rollbackTarget(revisions, "svc-005", ["svc-002"])).toBe("svc-001");
    expect(
      failedRevisions({
        status: {
          traffic: [
            { revisionName: "svc-005", percent: 100 },
            { revisionName: "svc-002", percent: 0, tag: "failed-abc" },
            { revisionName: "svc-006", percent: 0, tag: "r-def" },
          ],
        },
      }),
    ).toEqual(["svc-002"]);
    expect(rollbackTarget([], "svc-001")).toBeNull();
  });
  test("serving revision and candidate tag URL are read from service JSON", () => {
    const service = {
      status: {
        traffic: [
          { revisionName: "svc-005", percent: 100 },
          {
            revisionName: "svc-006",
            percent: 0,
            tag: "r-abc",
            url: "https://r-abc---svc.run.app",
          },
        ],
      },
    };
    expect(servingRevision(service)).toBe("svc-005");
    expect(tagUrl(service, "r-abc")).toBe("https://r-abc---svc.run.app");
    expect(tagUrl(service, "missing")).toBeNull();
    expect(sanitizeLabel("Feature/ABC_123-dirty")).toBe(
      "feature-abc-123-dirty",
    );
  });
  test("secret manager plan requires core secrets and maps optional ones only when present", () => {
    const required = [
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "FRONTEND_URL",
      "DATABASE_URL",
    ].map((n) => `prod_${n}`);
    const missing = planSecrets(allOff, "prod_", required.slice(1));
    expect(missing.missing).toEqual(["prod_BETTER_AUTH_SECRET"]);
    const ok = planSecrets(allOff, "prod_", [
      ...required,
      "prod_DOMAIN",
      "other_DATABASE_URL",
    ]);
    expect(ok.missing).toEqual([]);
    expect(ok.mapping.split(",")).toEqual([
      "BETTER_AUTH_SECRET=prod_BETTER_AUTH_SECRET:latest",
      "BETTER_AUTH_URL=prod_BETTER_AUTH_URL:latest",
      "FRONTEND_URL=prod_FRONTEND_URL:latest",
      "DATABASE_URL=prod_DATABASE_URL:latest",
      "DOMAIN=prod_DOMAIN:latest",
    ]);
    expect(() => planSecrets(allOff, "bad prefix ", [])).toThrow(
      "Invalid secret ID",
    );
  });
  test("env-file preflight reports problems without values", () => {
    const problems = validateEnvFile(
      {
        BETTER_AUTH_SECRET:
          "your-secret-key-min-32-characters-long-change-this",
        FLOWSTACK_RELEASE: "x",
      },
      allOff,
    );
    expect(problems.join("\n")).toContain(
      "BETTER_AUTH_SECRET still has the example placeholder",
    );
    expect(problems.join("\n")).toContain(
      "FLOWSTACK_RELEASE is set by the deploy script",
    );
    expect(problems.join("\n")).not.toContain("change-this");
  });
});

describe("secret scanning commands", () => {
  test("staged scans only check staged changes; full scans cover history and working tree", () => {
    const gitleaks = { name: "gitleaks", bin: "gitleaks" };
    expect(scanCommands(gitleaks, true)).toEqual([
      [
        "git",
        "--staged",
        "--config=.gitleaks.toml",
        "--no-banner",
        "--redact",
        "--exit-code=1",
        ".",
      ],
    ]);
    const full = scanCommands(gitleaks, false);
    expect(full.map((c) => c[0])).toEqual(["git", "dir"]);
    expect(full[1]).toContain("--config=.gitleaks.worktree.toml");
  });
});

describe("logging and monitoring privacy", () => {
  test("arrays redact credentials and circular metadata cannot crash logging", () => {
    const nested: Record<string, unknown> = {
      users: [
        { token: "private", profile: { private_key: "key", name: "Alice" } },
      ],
      R2_ACCESS_KEY_ID: "private",
    };
    nested.self = nested;
    const result = redact(nested);
    expect(result).toEqual({
      users: [
        {
          token: "[redacted]",
          profile: { private_key: "[redacted]", name: "Alice" },
        },
      ],
      R2_ACCESS_KEY_ID: "[redacted]",
      self: "[circular]",
    });
    expect((nested.users as { token: string }[])[0].token).toBe("private");
  });
  test("sensitive log fields are redacted recursively", () => {
    expect(
      redact({
        requestId: "r1",
        password: "p",
        nested: { sessionToken: "t", ok: 1, Authorization: "Bearer x" },
        error: new Error("boom"),
      }),
    ).toEqual({
      requestId: "r1",
      password: "[redacted]",
      nested: {
        sessionToken: "[redacted]",
        ok: 1,
        Authorization: "[redacted]",
      },
      error: { name: "Error", message: "boom" },
    });
  });
  test("every Sentry v11 data collection category is set and restrictive", () => {
    const dc = sentryDataCollection();
    expect(dc.userInfo).toBe(false);
    expect(dc.cookies).toBe(false);
    expect(dc.httpBodies).toEqual([]);
    expect(dc.urlQueryParams).toBe(false);
    expect(dc.databaseQueryData).toBe(false);
    expect(dc.genAI).toEqual({ inputs: false, outputs: false });
    expect(dc.mcp).toEqual({ inputs: false, outputs: false });
    expect(dc.graphQL).toEqual({ document: false, variables: false });
    expect(dc.stackFrameVariables).toBe(false);
    expect(dc.httpHeaders.request.allow).not.toContain("authorization");
    expect(dc.httpHeaders.request.allow).not.toContain("cookie");
  });
  test("beforeSend scrubber removes request secrets and user details", () => {
    const event = scrubSentryEvent({
      request: {
        cookies: { session: "s" },
        data: { password: "p" },
        query_string: "token=t",
        url: "https://api.example.com/x?token=t",
        headers: {
          Authorization: "Bearer t",
          Cookie: "c",
          "content-type": "application/json",
        },
      },
      user: { id: "u1", email: "a@example.com", ip_address: "1.2.3.4" },
    });
    expect(event).toEqual({
      request: {
        url: "https://api.example.com/x",
        headers: { "content-type": "application/json" },
      },
      user: { id: "u1" },
    });
  });
  test("trace sample rate defaults to off", () => {
    expect(sampleRate(undefined)).toBe(0);
    expect(sampleRate("abc")).toBe(0);
    expect(sampleRate("2")).toBe(0);
    expect(sampleRate("0.25")).toBe(0.25);
  });
});
