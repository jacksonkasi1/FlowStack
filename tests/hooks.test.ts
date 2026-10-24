// Runs the real Husky pre-commit hook in a throwaway Git repository: secret
// scanning (gitleaks), lint-staged ESLint and Prettier. Needs gitleaks on
// PATH or GITLEAKS_BIN; CI installs it, and the test fails in CI without it.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const gitleaks = process.env.GITLEAKS_BIN || "gitleaks";
const haveGitleaks = !spawnSync(gitleaks, ["version"]).error;
if (!haveGitleaks && process.env.CI === "true")
  throw new Error("gitleaks is required for hook tests in CI");

let repo: string;
const env = {
  ...process.env,
  GITLEAKS_BIN: gitleaks,
  GIT_AUTHOR_NAME: "Hook Test",
  GIT_AUTHOR_EMAIL: "hook@example.com",
  GIT_COMMITTER_NAME: "Hook Test",
  GIT_COMMITTER_EMAIL: "hook@example.com",
  HUSKY: "",
};
const git = (...args: string[]) =>
  spawnSync("git", args, { cwd: repo, encoding: "utf8", env });
const commits = () =>
  Number(git("rev-list", "--count", "HEAD").stdout.trim() || 0);

beforeAll(async () => {
  if (!haveGitleaks) return;
  repo = await mkdtemp(join(tmpdir(), "flowstack-hooks-"));
  for (const file of [
    ".husky",
    ".lintstagedrc.mjs",
    ".gitleaks.toml",
    ".prettierignore",
    "eslint.config.mjs",
  ])
    await cp(join(root, file), join(repo, file), { recursive: true });
  await cp(join(root, "scripts"), join(repo, "scripts"), { recursive: true });
  await symlink(join(root, "node_modules"), join(repo, "node_modules"));
  await writeFile(
    join(repo, "package.json"),
    JSON.stringify({ name: "hook-test", private: true, type: "module" }),
  );
  await writeFile(join(repo, ".gitignore"), "node_modules\n");
  git("init", "-q", "-b", "main");
  const install = spawnSync(join(root, "node_modules/.bin/husky"), [], {
    cwd: repo,
    encoding: "utf8",
    env,
  });
  if (install.status !== 0) throw new Error(install.stderr);
  git("add", ".");
  const init = git("commit", "-q", "-m", "init");
  if (init.status !== 0) throw new Error(init.stdout + init.stderr);
}, 60000);
afterAll(async () => {
  if (repo) await rm(repo, { recursive: true, force: true });
});

test.skipIf(!haveGitleaks)(
  "a normal commit passes the hook",
  async () => {
    await writeFile(join(repo, "ok.ts"), 'export const greeting = "hello";\n');
    git("add", "ok.ts");
    const result = git("commit", "-m", "add ok");
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain("Secret scan passed");
  },
  60000,
);

test.skipIf(!haveGitleaks)(
  "a commit containing a credential is blocked",
  async () => {
    const before = commits();
    // Generated at runtime so no credential-shaped literal lives in this file.
    const fake =
      "ghp_" +
      Array.from(
        { length: 36 },
        (_, i) => "aB3dE5gH7jK9mN1pQ3sT5vW7yZ"[(i * 7) % 26],
      ).join("");
    await writeFile(join(repo, "leak.ts"), `export const token = "${fake}";\n`);
    git("add", "leak.ts");
    const result = git("commit", "-m", "leak");
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain("found possible secrets");
    expect(result.stdout + result.stderr).not.toContain(fake);
    expect(commits()).toBe(before);
    git("rm", "-q", "--cached", "leak.ts");
    await rm(join(repo, "leak.ts"));
  },
  60000,
);

test.skipIf(!haveGitleaks)(
  "formatting applies to staged content only and leaves other files alone",
  async () => {
    const unrelated = "export   const   untouched=1\n";
    await writeFile(join(repo, "unrelated.ts"), unrelated);
    await writeFile(join(repo, "partial.ts"), "export const a = 1;\n");
    git("add", "partial.ts");
    git("commit", "-q", "-m", "partial base");
    // Stage a badly formatted change, then make a further unstaged edit.
    await writeFile(
      join(repo, "partial.ts"),
      "export   const a=1;\nexport const b   = 2\n",
    );
    git("add", "partial.ts");
    await writeFile(
      join(repo, "partial.ts"),
      "export   const a=1;\nexport const b   = 2\n// unstaged note\n",
    );
    const result = git("commit", "-m", "format");
    expect(result.status).toBe(0);
    expect(git("show", "HEAD:partial.ts").stdout).toBe(
      "export const a = 1;\nexport const b = 2;\n",
    );
    // The unstaged edit is still present and still unstaged.
    expect(await readFile(join(repo, "partial.ts"), "utf8")).toContain(
      "// unstaged note",
    );
    expect(git("diff", "--name-only").stdout.trim()).toBe("partial.ts");
    // The untracked unrelated file was not formatted.
    expect(await readFile(join(repo, "unrelated.ts"), "utf8")).toBe(unrelated);
  },
  60000,
);

test.skipIf(!haveGitleaks)(
  "lint errors block the commit",
  async () => {
    const before = commits();
    await writeFile(
      join(repo, "bad.ts"),
      "export const unused = () => { const x = 1; };\n",
    );
    git("add", "bad.ts");
    expect(git("commit", "-m", "lint").status).not.toBe(0);
    expect(commits()).toBe(before);
  },
  60000,
);
