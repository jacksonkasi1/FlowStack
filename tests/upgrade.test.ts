// Template upgrades against a throwaway "upstream" FlowStack repository with
// two releases, and a project generated from the first one.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = join(import.meta.dir, "..");
let dir: string;
let upstream: string;
let project: string;
let baseCommit: string;
let targetCommit: string;

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
  HUSKY: "0",
};
const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: gitEnv });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
};
async function put(base: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(base, path)), { recursive: true });
    await writeFile(join(base, path), content);
  }
}
const read = (path: string) => readFile(join(project, path), "utf8");
const exists = (path: string) => Bun.file(join(project, path)).exists();
const version = (v: string) => `export const TEMPLATE_VERSION = "${v}";\n`;
const journal = (tags: string[]) =>
  JSON.stringify(
    { entries: tags.map((tag, idx) => ({ idx, tag, when: 1000 + idx })) },
    null,
    2,
  ) + "\n";

function upgrade(args: string[]) {
  return spawnSync(
    "node",
    [join(root, "scripts/upgrade.mjs"), ...args, "--source", upstream],
    {
      cwd: project,
      encoding: "utf8",
      env: { ...gitEnv, FLOWSTACK_PROJECT_ROOT: project },
    },
  );
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "flowstack-upgrade-"));
  upstream = join(dir, "upstream");
  project = join(dir, "project");
  await put(upstream, {
    "scripts/lib/project-config.mjs": version("2.0.0"),
    "scripts/tool.mjs": "export const tool = 1;\n",
    "scripts/old.mjs": "export const old = true;\n",
    "docs/guide.md":
      "# Guide\n\nIntro.\n\n## Part A\n\nAlpha.\n\n## Part B\n\nBeta.\n",
    "packages/shared/a.ts":
      "export const greeting = 'hello';\nexport const n = 1;\n",
    "packages/db/drizzle/0000_init.sql": "create table t (id int);\n",
    "packages/db/drizzle/meta/_journal.json": journal(["0000_init"]),
    "apps/web/page.tsx": "export const Page = () => 'v1';\n",
    "package.json": JSON.stringify(
      { name: "flowstack", dependencies: { alpha: "^1.2.0", gamma: "^3.0.0" } },
      null,
      2,
    ),
  });
  git(upstream, "init", "-q", "-b", "main");
  git(upstream, "add", ".");
  git(upstream, "commit", "-q", "-m", "v2.0.0");
  git(upstream, "tag", "v2.0.0");
  baseCommit = git(upstream, "rev-parse", "HEAD");

  // A project generated from v2.0.0, then customised.
  await cp(upstream, project, {
    recursive: true,
    filter: (src) => !src.includes("/.git"),
  });
  await put(project, {
    ".flowstack.json": JSON.stringify({
      version: 2,
      templateVersion: "2.0.0",
      sourceCommit: baseCommit,
      projectName: "acme",
    }),
    "package.json": JSON.stringify(
      {
        name: "acme",
        dependencies: { alpha: "^1.2.0", gamma: "^3.0.0", local: "^1.0.0" },
      },
      null,
      2,
    ),
    "docs/guide.md":
      "# Guide\n\nIntro customised by acme.\n\n## Part A\n\nAlpha.\n\n## Part B\n\nBeta.\n",
    "packages/shared/a.ts":
      "export const greeting = 'hello acme';\nexport const n = 1;\n",
    "apps/web/page.tsx": "export const Page = () => 'acme';\n",
  });
  git(project, "init", "-q", "-b", "main");
  git(project, "add", ".");
  git(project, "commit", "-q", "-m", "acme");

  // Upstream v2.1.0.
  await put(upstream, {
    "scripts/lib/project-config.mjs": version("2.1.0"),
    "scripts/tool.mjs": "export const tool = 2;\n",
    "scripts/new.mjs": "export const added = true;\n",
    "docs/guide.md":
      "# Guide\n\nIntro.\n\n## Part A\n\nAlpha.\n\n## Part B\n\nBeta, improved.\n",
    "packages/shared/a.ts":
      "export const greeting = 'hello world';\nexport const n = 1;\n",
    "packages/db/drizzle/0001_more.sql":
      "alter table t add column name text;\n",
    "packages/db/drizzle/meta/_journal.json": journal([
      "0000_init",
      "0001_more",
    ]),
    "apps/web/page.tsx": "export const Page = () => 'v2';\n",
    "package.json": JSON.stringify(
      {
        name: "flowstack",
        dependencies: { alpha: "^1.4.0", gamma: "^4.0.0", delta: "^1.0.0" },
      },
      null,
      2,
    ),
  });
  await rm(join(upstream, "scripts/old.mjs"));
  git(upstream, "add", "-A");
  git(upstream, "commit", "-q", "-m", "v2.1.0");
  git(upstream, "tag", "v2.1.0");
  targetCommit = git(upstream, "rev-parse", "HEAD");
}, 60000);
afterAll(() => rm(dir, { recursive: true, force: true }));

test("check reports a newer release and classifies every change", () => {
  const result = upgrade(["check", "--json"]);
  expect(result.status).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({
    current: { version: "2.0.0", commit: baseCommit },
    target: { version: "2.1.0", commit: targetCommit, ref: "v2.1.0" },
    upgradeAvailable: true,
  });
  const byPath = Object.fromEntries(
    report.files.map((f: { path: string; action: string }) => [
      f.path,
      f.action,
    ]),
  );
  expect(byPath).toMatchObject({
    "scripts/tool.mjs": "update",
    "scripts/new.mjs": "add",
    "scripts/lib/project-config.mjs": "update",
    "docs/guide.md": "merge",
    "packages/shared/a.ts": "conflict",
    "packages/db/drizzle/0001_more.sql": "add",
    "packages/db/drizzle/meta/_journal.json": "update",
    "scripts/old.mjs": "delete",
    "apps/web/page.tsx": "review",
  });
  expect(report.migrations).toEqual(["0001_more"]);
  const deps = Object.fromEntries(
    report.dependencies.map((d: { name: string; change: string }) => [
      d.name,
      d.change,
    ]),
  );
  expect(deps).toEqual({ alpha: "minor", gamma: "major", delta: "added" });
  // Checking changes nothing.
  expect(git(project, "status", "--porcelain")).toBe("");
});

test("dry-run previews without writing", () => {
  const result = upgrade(["--dry-run"]);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Dry run");
  expect(git(project, "status", "--porcelain")).toBe("");
});

test("non-interactive apply needs --yes and a clean working tree", async () => {
  expect(upgrade([]).status).toBe(1);
  await writeFile(join(project, "scratch.txt"), "uncommitted");
  const dirty = upgrade(["--yes"]);
  expect(dirty.status).toBe(1);
  expect(dirty.stderr).toContain("uncommitted changes");
  await rm(join(project, "scratch.txt"));
});

test("apply updates template files, keeps customisations and backs everything up", async () => {
  const result = upgrade(["--yes"]);
  expect(result.status).toBe(0);
  expect(await read("scripts/tool.mjs")).toBe("export const tool = 2;\n");
  expect(await read("scripts/new.mjs")).toBe("export const added = true;\n");
  // Clean three-way merge keeps the local edit and the upstream one.
  expect(await read("docs/guide.md")).toContain("Intro customised by acme.");
  expect(await read("docs/guide.md")).toContain("Beta, improved.");
  // Conflicting customisation is untouched; a proposal is written for review.
  expect(await read("packages/shared/a.ts")).toContain("hello acme");
  const proposal = await read(".flowstack-upgrade/packages/shared/a.ts.merged");
  expect(proposal).toContain("<<<<<<<");
  expect(proposal).toContain("hello world");
  // Application code and dependencies are report-only.
  expect(await read("apps/web/page.tsx")).toContain("acme");
  expect(JSON.parse(await read("package.json")).dependencies.gamma).toBe(
    "^3.0.0",
  );
  // Deletion needs explicit consent.
  expect(await exists("scripts/old.mjs")).toBe(true);
  // New migration files are added, never executed.
  expect(await exists("packages/db/drizzle/0001_more.sql")).toBe(true);
  // Backups of every modified file.
  const backups = await readdir(join(project, ".flowstack-backup"));
  expect(backups.length).toBe(1);
  expect(
    await readFile(
      join(project, ".flowstack-backup", backups[0], "scripts/tool.mjs"),
      "utf8",
    ),
  ).toBe("export const tool = 1;\n");
  // With an open conflict the recorded base stays, and the upgrade is pending.
  const config = JSON.parse(await read(".flowstack.json"));
  expect(config.sourceCommit).toBe(baseCommit);
  expect(config.upgradeInProgress).toMatchObject({
    targetVersion: "2.1.0",
    targetCommit,
    conflicts: ["packages/shared/a.ts"],
  });
  expect(result.stdout).toContain("bun run db:status");
}, 60000);

test("after resolving conflicts, --mark-resolved records the new version", async () => {
  git(project, "add", "-A");
  git(project, "commit", "-q", "-m", "upgrade");
  await writeFile(
    join(project, "packages/shared/a.ts"),
    "export const greeting = 'hello acme world';\nexport const n = 1;\n",
  );
  git(project, "commit", "-q", "-am", "resolve");
  const result = upgrade(["--mark-resolved"]);
  expect(result.status).toBe(0);
  const config = JSON.parse(await read(".flowstack.json"));
  expect(config).toMatchObject({
    templateVersion: "2.1.0",
    sourceCommit: targetCommit,
  });
  expect(config.upgradeInProgress).toBeUndefined();
  git(project, "commit", "-q", "-am", "mark resolved");
  const check = JSON.parse(upgrade(["check", "--json"]).stdout);
  expect(check.upgradeAvailable).toBe(false);
}, 60000);

test("upstream deletions apply only with --allow-delete", async () => {
  // Start again from v2.0.0 metadata so old.mjs is still an unmodified template file.
  const config = JSON.parse(await read(".flowstack.json"));
  await writeFile(
    join(project, ".flowstack.json"),
    JSON.stringify({
      ...config,
      sourceCommit: baseCommit,
      templateVersion: "2.0.0",
    }),
  );
  git(project, "commit", "-q", "-am", "rewind metadata");
  const result = upgrade(["--yes", "--allow-delete"]);
  expect(result.status).toBe(0);
  expect(await exists("scripts/old.mjs")).toBe(false);
}, 60000);
