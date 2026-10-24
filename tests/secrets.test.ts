// Mocked Infisical tests: a stub CLI stands in for `infisical run`. These
// prove FlowStack's wiring and boundaries, not live Infisical access.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { TEMPLATE_FEATURES } from "../packages/config/src/config/preset";

const root = join(import.meta.dir, "..");
const SECRET_VALUE = "stub-injected-secret-value-0123456789abcdef";
let dir: string;
let stub: string;
let log: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "flowstack-infisical-"));
  stub = join(dir, "infisical");
  log = join(dir, "calls.log");
  // Mimics the CLI: `--version`, and `run [flags] -- cmd` which injects
  // secrets into the child. STUB_FAIL simulates an expired login.
  await writeFile(
    stub,
    `#!/bin/bash
if [ "$1" = "--version" ]; then echo "infisical version 0.0.0-stub"; exit 0; fi
echo "$*" >> "${log}"
if [ -n "$STUB_FAIL" ]; then echo "error: You must be logged in to run this command" >&2; exit 1; fi
while [ "$1" != "--" ]; do shift; done; shift
export BETTER_AUTH_SECRET="${SECRET_VALUE}" BETTER_AUTH_URL=http://localhost:8080 FRONTEND_URL=http://localhost:3000 DATABASE_URL=postgresql://dev:pw@localhost:5432/dev
exec "$@"
`,
  );
  await chmod(stub, 0o755);
});
afterAll(() => rm(dir, { recursive: true, force: true }));

function run(args: string[], env: Record<string, string> = {}) {
  const clean = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) =>
        !/^(CLAUDE|CURSOR|CODEX|GEMINI|AIDER|OPENCODE|CLINE|FLOWSTACK_|CI$)/.test(
          k,
        ),
    ),
  );
  return spawnSync("node", ["scripts/secrets.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...clean,
      INFISICAL_BIN: stub,
      INFISICAL_PROJECT_ID: "proj-test",
      ...env,
    },
  });
}
const calls = async () =>
  (await readFile(log, "utf8").catch(() => ""))
    .trim()
    .split("\n")
    .filter(Boolean);

test("development secrets are injected into the child process only", async () => {
  const result = run([
    "run",
    "development",
    "--",
    "node",
    "-e",
    "console.log(process.env.FLOWSTACK_ENV, process.env.BETTER_AUTH_SECRET?.length)",
  ]);
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe(`development ${SECRET_VALUE.length}`);
  expect((await calls()).at(-1)).toContain(
    "--projectId=proj-test --env=dev --path=/",
  );
});

test("failed authentication exits non-zero and never tries another environment", async () => {
  const before = (await calls()).length;
  const result = run(["run", "development", "--", "node", "-e", "1"], {
    STUB_FAIL: "1",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("No other environment was tried");
  const after = await calls();
  expect(after.length).toBe(before + 1);
  expect(after.at(-1)).toContain("--env=dev");
});

test("production secrets are refused locally and in AI agent sessions", async () => {
  const before = (await calls()).length;
  const local = run(["run", "production", "--", "node", "-e", "1"]);
  expect(local.status).toBe(1);
  expect(local.stderr).toContain("outside CI");
  const agent = run(["run", "production", "--", "node", "-e", "1"], {
    CI: "true",
    CLAUDECODE: "1",
  });
  expect(agent.status).toBe(1);
  expect(agent.stderr).toContain("AI coding agent");
  // The CLI was never invoked.
  expect((await calls()).length).toBe(before);
});

test("a missing CLI is an explicit error pointing to the local alternative", () => {
  const result = run(["run", "development", "--", "node", "-e", "1"], {
    INFISICAL_BIN: join(dir, "nope"),
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("dev:local");
});

test("secrets:check validates names inside the injected environment without printing values", () => {
  const result = run(["check", "development"]);
  const output = result.stdout + result.stderr;
  expect(output).toContain("BETTER_AUTH_SECRET");
  expect(output).not.toContain(SECRET_VALUE);
  // The stub provides only core names: storage credentials are reported
  // missing exactly when this preset enabled storage.
  if (TEMPLATE_FEATURES.storage) {
    expect(output).toContain("R2_BUCKET_NAME");
    expect(result.status).toBe(1);
  } else {
    expect(output).not.toContain("R2_BUCKET_NAME");
    expect(result.status).toBe(0);
  }
});
