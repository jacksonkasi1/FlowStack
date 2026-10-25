// Deployment and rollback simulation: runs the real deploy.sh against a fake
// gcloud (tests/fixtures/fake-gcloud.mjs) and a local health endpoint. No
// Google Cloud project is contacted.
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const source = join(import.meta.dir, "..");
let fixture: string;
let health: Server;
let base: string;
const statePath = () => join(fixture, "gcloud-state.json");
const logPath = () => join(fixture, "gcloud.log");
// Revision name -> healthy? Revisions not listed are healthy.
let unhealthy = new Set<string>();
let serviceUnhealthyAfter: string | null = null;

const ENV_FILE = `BETTER_AUTH_SECRET=deploy-test-secret-value-at-least-32-chars
BETTER_AUTH_URL=https://api.example.com
FRONTEND_URL=https://app.example.com
DATABASE_URL=postgresql://app:deploy-test-db-password@db.example.com:5432/app
`;

beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), "flowstack-deploy-"));
  await mkdir(join(fixture, "apps/server"), { recursive: true });
  await cp(
    join(source, "apps/server/.deploy"),
    join(fixture, "apps/server/.deploy"),
    { recursive: true },
  );
  await cp(join(source, "scripts"), join(fixture, "scripts"), {
    recursive: true,
  });
  await cp(join(source, "cloudbuild.yaml"), join(fixture, "cloudbuild.yaml"));
  await writeFile(
    join(fixture, ".flowstack.json"),
    JSON.stringify({
      version: 2,
      integrations: {
        email: false,
        storage: false,
        google: false,
        sentry: false,
        infisical: false,
      },
    }),
  );
  await writeFile(join(fixture, "apps/server/.env.sandbox"), ENV_FILE);
  await writeFile(join(fixture, "apps/server/.env.prod"), ENV_FILE);
  const wrapper = join(fixture, "gcloud");
  await writeFile(
    wrapper,
    `#!/bin/sh\nexec node "${join(source, "tests/fixtures/fake-gcloud.mjs")}" "$@"\n`,
  );
  await chmod(wrapper, 0o755);
  health = createServer(async (req, res) => {
    const [, revision] = (req.url || "").split("/");
    let target = revision;
    if (revision === "service") {
      const state = JSON.parse(await readFile(statePath(), "utf8"));
      target = state.traffic.find(
        (t: { percent: number }) => t.percent === 100,
      )?.revisionName;
      if (target === serviceUnhealthyAfter) target = "__down__";
    }
    const ok = target !== "__down__" && !unhealthy.has(target);
    res
      .writeHead(ok ? 200 : 503)
      .end(ok ? '{"status":"ready"}' : '{"status":"unavailable"}');
  });
  await new Promise<void>((resolve) => health.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(health.address() as { port: number }).port}`;
}, 60000);
afterAll(async () => {
  health?.close();
  await rm(fixture, { recursive: true, force: true });
});

// A service whose v1 (svc-00001) serves all traffic.
beforeEach(async () => {
  unhealthy = new Set();
  serviceUnhealthyAfter = null;
  await writeFile(logPath(), "");
  await writeFile(
    statePath(),
    JSON.stringify({
      exists: true,
      secrets: [],
      revisions: [
        {
          metadata: {
            name: "svc-00001",
            creationTimestamp: "2025-12-31T00:00:00Z",
            labels: { "flowstack-release": "old" },
          },
          status: { conditions: [{ type: "Ready", status: "True" }] },
        },
      ],
      traffic: [{ revisionName: "svc-00001", percent: 100 }],
    }),
  );
});

function deploy(args: string[], env: Record<string, string> = {}) {
  const clean = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !/^(CI|GITHUB_|GCP_|FLOWSTACK_)/.test(k),
    ),
  );
  const child = spawn(
    "bash",
    [join(fixture, "apps/server/.deploy/scripts/deploy.sh"), ...args],
    {
      cwd: fixture,
      env: {
        ...clean,
        GCLOUD_BIN: join(fixture, "gcloud"),
        FAKE_GCLOUD_STATE: statePath(),
        FAKE_GCLOUD_LOG: logPath(),
        FAKE_HEALTH_BASE: base,
        FLOWSTACK_RELEASE: "abc1234",
        DEPLOY_HEALTH_ATTEMPTS: "2",
        DEPLOY_HEALTH_INTERVAL: "0",
        ...env,
      },
    },
  );
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  return new Promise<{ status: number | null; output: string }>((resolve) =>
    child.on("close", (status) => resolve({ status, output })),
  );
}
const state = async () => JSON.parse(await readFile(statePath(), "utf8"));
const calls = async () =>
  (await readFile(logPath(), "utf8")).trim().split("\n").filter(Boolean);
const serving = async () =>
  (await state()).traffic.find((t: { percent: number }) => t.percent === 100)
    ?.revisionName;

test("a healthy release is verified with no traffic, then promoted", async () => {
  const result = await deploy(["sandbox"]);
  expect(result.status).toBe(0);
  expect(result.output).toContain("outcome:     deployed");
  expect(await serving()).toBe("svc-00002");
  const log = await calls();
  const deployCall = log.find((c) => c.startsWith("run deploy"))!;
  expect(deployCall).toContain("--no-traffic");
  expect(deployCall).toContain("--tag r-abc1234");
  expect(deployCall).toContain(":abc1234"); // versioned image reference
  expect(deployCall).toContain("flowstack-release=abc1234");
  expect(log.some((c) => c.includes("--remove-tags r-abc1234"))).toBe(true);
  // Secrets never appear in output or in gcloud arguments.
  expect(result.output + log.join("\n")).not.toContain(
    "deploy-test-secret-value",
  );
  expect(result.output + log.join("\n")).not.toContain(
    "deploy-test-db-password",
  );
}, 60000);

test("preflight warns when auth rate limiting cannot see client IPs", async () => {
  const result = await deploy(["sandbox", "--dry-run"]);
  expect(result.output).toContain("AUTH_TRUSTED_PROXIES is not set");
}, 60000);

test("a release that fails verification never receives traffic", async () => {
  unhealthy.add("svc-00002");
  const result = await deploy(["sandbox"]);
  expect(result.status).toBe(1);
  expect(result.output).toContain("outcome:     failed-verification");
  expect(result.output).toContain("Traffic stays on svc-00001");
  expect(await serving()).toBe("svc-00001");
  expect((await calls()).some((c) => c.includes("--to-revisions"))).toBe(false);
}, 60000);

test("auto-rollback restores the previous revision when the service degrades after promotion", async () => {
  serviceUnhealthyAfter = "svc-00002";
  const result = await deploy(["sandbox", "--auto-rollback"]);
  expect(result.status).toBe(1);
  expect(result.output).toContain("Auto-rollback to svc-00001");
  expect(result.output).toContain("outcome:     rolled-back");
  expect(await serving()).toBe("svc-00001");
}, 60000);

test("rollback picks the last verified revision and confirms health", async () => {
  expect((await deploy(["sandbox"])).status).toBe(0);
  expect(await serving()).toBe("svc-00002");
  const result = await deploy(["sandbox", "rollback"]);
  expect(result.status).toBe(0);
  expect(result.output).toMatch(
    /Rolling back [a-z0-9-]+-server-sandbox: svc-00002 -> svc-00001/,
  );
  expect(result.output).toContain("database migrations are not reverted");
  expect(await serving()).toBe("svc-00001");
}, 60000);

test("a rollback to an unhealthy revision is undone", async () => {
  expect((await deploy(["sandbox"])).status).toBe(0);
  serviceUnhealthyAfter = "svc-00001";
  const result = await deploy(["sandbox", "rollback"]);
  expect(result.status).toBe(1);
  expect(result.output).toContain("outcome:     rollback-failed");
  expect(await serving()).toBe("svc-00002");
}, 60000);

test("dry-run performs preflight but changes nothing", async () => {
  const result = await deploy(["sandbox", "--dry-run"]);
  expect(result.status).toBe(0);
  expect(result.output).toContain("[dry-run]");
  const log = await calls();
  for (const mutating of [
    "builds submit",
    "run deploy",
    "update-traffic",
    "repositories create",
  ])
    expect(log.some((c) => c.startsWith(mutating))).toBe(false);
}, 60000);

test("production refuses local deploys and placeholder secrets", async () => {
  const local = await deploy(["prod"]);
  expect(local.status).toBe(1);
  expect(local.output).toContain("deploy it from the GitHub Actions workflow");
  await writeFile(
    join(fixture, "apps/server/.env.sandbox"),
    ENV_FILE.replace(
      /BETTER_AUTH_SECRET=.*/,
      "BETTER_AUTH_SECRET=your-secret-key-min-32-characters-long-change-this",
    ),
  );
  try {
    const placeholder = await deploy(["sandbox"]);
    expect(placeholder.status).toBe(1);
    expect(placeholder.output).toContain(
      "BETTER_AUTH_SECRET still has the example placeholder",
    );
    expect((await calls()).some((c) => c.startsWith("builds submit"))).toBe(
      false,
    );
  } finally {
    await writeFile(join(fixture, "apps/server/.env.sandbox"), ENV_FILE);
  }
}, 60000);

test("secret-manager mode references secrets without reading values", async () => {
  const configPath = join(fixture, "apps/server/.deploy/deploy.config.yaml");
  const original = await readFile(configPath, "utf8");
  await writeFile(
    configPath,
    original.replace(
      "secrets_source: env-file",
      "secrets_source: secret-manager",
    ),
  );
  try {
    const missing = await deploy(["sandbox"]);
    expect(missing.status).toBe(1);
    expect(missing.output).toContain("missing Secret Manager secrets");
    const s = await state();
    s.secrets = [
      "sandbox_BETTER_AUTH_SECRET",
      "sandbox_BETTER_AUTH_URL",
      "sandbox_FRONTEND_URL",
      "sandbox_DATABASE_URL",
    ];
    await writeFile(statePath(), JSON.stringify(s));
    const ok = await deploy(["sandbox"]);
    expect(ok.status).toBe(0);
    const deployCall = (await calls()).find((c) => c.startsWith("run deploy"))!;
    expect(deployCall).toMatch(
      /--set-secrets \S*DATABASE_URL=sandbox_DATABASE_URL:latest/,
    );
    expect(deployCall).not.toContain("env-vars-file");
  } finally {
    await writeFile(configPath, original);
  }
}, 60000);

test("a release that failed verification is never chosen as a rollback target", async () => {
  unhealthy.add("svc-00002");
  expect(
    (await deploy(["sandbox"], { FLOWSTACK_RELEASE: "bad0001" })).status,
  ).toBe(1);
  unhealthy.clear();
  expect(
    (await deploy(["sandbox"], { FLOWSTACK_RELEASE: "good002" })).status,
  ).toBe(0);
  expect(await serving()).toBe("svc-00003");
  const result = await deploy(["sandbox", "rollback"]);
  expect(result.status).toBe(0);
  expect(await serving()).toBe("svc-00001");
}, 60000);

test("deploys write a machine-readable audit record", async () => {
  const report = join(fixture, "report.json");
  const result = await deploy(["sandbox"], {
    DEPLOY_REPORT_FILE: report,
    GITHUB_ACTOR: "release-bot",
    GITHUB_SERVER_URL: "https://github.com",
    GITHUB_REPOSITORY: "acme/app",
    GITHUB_RUN_ID: "42",
  });
  expect(result.status).toBe(0);
  const record = JSON.parse(await readFile(report, "utf8"));
  expect(record).toMatchObject({
    action: "deploy",
    outcome: "deployed",
    environment: "sandbox",
    release: "abc1234",
    newRevision: "svc-00002",
    previousRevision: "svc-00001",
    servingRevision: "svc-00002",
    actor: "release-bot",
    runUrl: "https://github.com/acme/app/actions/runs/42",
  });
  expect(typeof record.timestamp).toBe("string");
  expect(JSON.stringify(record)).not.toContain("deploy-test-secret-value");
}, 60000);

test("Infisical deploy needs no env file or Secret Manager and passes only bootstrap identifiers", async () => {
  const configPath = join(fixture, "apps/server/.deploy/deploy.config.yaml");
  const original = await readFile(configPath, "utf8");
  await writeFile(
    configPath,
    original.replace(
      "secrets_source: env-file",
      "secrets_source: infisical\n  runtime_service_account: runtime@example.iam.gserviceaccount.com",
    ),
  );
  await rm(join(fixture, "apps/server/.env.sandbox"));
  try {
    const result = await deploy(["sandbox"], {
      INFISICAL_PROJECT_ID: "fixture-project",
      INFISICAL_RUNTIME_IDENTITY_ID: "fixture-runtime-identity",
      INFISICAL_RUNTIME_ENVIRONMENT: "staging",
      INFISICAL_SECRET_PATH: "/api,shared",
    });
    expect(result.status).toBe(0);
    const log = await calls();
    const deployCall = log.find((c) => c.startsWith("run deploy"))!;
    expect(deployCall).toContain("FLOWSTACK_SECRETS_SOURCE=infisical");
    expect(deployCall).toContain("INFISICAL_RUNTIME_ENVIRONMENT=staging");
    expect(deployCall).toContain("INFISICAL_SECRET_PATH=/api,shared");
    expect(deployCall).toContain(
      "--service-account runtime@example.iam.gserviceaccount.com",
    );
    expect(deployCall).toContain("--clear-secrets");
    expect(deployCall).not.toContain("--env-vars-file");
    expect(deployCall).not.toContain("DATABASE_URL=");
    expect(log.some((c) => c.startsWith("secrets "))).toBe(false);
    expect(await serving()).toBe("svc-00002");
    const missing = await deploy(["sandbox"], {
      INFISICAL_PROJECT_ID: "fixture-project",
      INFISICAL_RUNTIME_IDENTITY_ID: "",
    });
    expect(missing.status).toBe(1);
    expect(missing.output).toContain("INFISICAL_RUNTIME_IDENTITY_ID");
  } finally {
    await writeFile(configPath, original);
    await writeFile(join(fixture, "apps/server/.env.sandbox"), ENV_FILE);
  }
}, 60000);
