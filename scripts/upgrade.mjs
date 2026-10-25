#!/usr/bin/env node
// Reviewable FlowStack template upgrades.
//
//   bun run flowstack:upgrade:check [--json]       What a newer starter changes
//   bun run flowstack:upgrade [--dry-run]          Preview, confirm, apply
//   bun run flowstack:upgrade --yes [--allow-delete]   Apply without prompting
//   bun run flowstack:upgrade --mark-resolved      After resolving conflicts
//
// Options: --source <git url or path> (default FLOWSTACK_UPSTREAM or the
// FlowStack GitHub repository), --ref <tag|branch|commit> (default: newest
// v* tag), --allow-dirty.
//
// Uses .flowstack.json `sourceCommit` as the merge base. Template-owned files
// unchanged locally are updated; customised ones are merged with git
// merge-file and applied only when the merge is clean, otherwise a proposal
// is written to .flowstack-upgrade/ for manual review. Application code
// (apps/**), package manifests and deploy settings are reported, never
// changed. New migrations are added, never executed. Every touched file is
// backed up to .flowstack-backup/<timestamp>/.
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib/is-main.mjs";

const DEFAULT_SOURCE = "https://github.com/jacksonkasi1/FlowStack.git";
const UPGRADE_DIR = ".flowstack-upgrade";
const BACKUP_DIR = ".flowstack-backup";

// Paths the project owns. Upstream changes are listed for manual review only.
const REVIEW_ONLY = [
  /^apps\/(web|tanstack)\//,
  /^apps\/server\/src\//,
  /(^|\/)package\.json$/,
  /^bun\.lock$/,
  /^apps\/server\/\.deploy\/deploy\.config\.yaml$/,
  /^README\.md$/,
  /^LICENSE$/,
];
// Never touched or reported: per-project configuration and local files.
const IGNORED = [
  /^\.flowstack\.json$/,
  /^packages\/config\/src\/config\/preset\.ts$/,
  /(^|\/)\.env(?:$|\.)/,
  /^\.infisical\.(json|yaml)$/,
];

function git(cwd, args, { buffer = false } = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: buffer ? null : "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    out: result.stdout,
    err: result.stderr?.toString(),
  };
}

export function compareVersions(a, b) {
  const parts = (v) =>
    String(v)
      .split(".")
      .map((n) => Number.parseInt(n, 10) || 0);
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++)
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

export function classifyPath(path) {
  if (IGNORED.some((re) => re.test(path))) return "ignored";
  if (REVIEW_ONLY.some((re) => re.test(path))) return "review";
  return "managed";
}

function majorOf(range) {
  const match = /(\d+)/.exec(String(range));
  return match ? Number(match[1]) : null;
}

/** Dependency differences between two package.json texts. */
export function dependencyChanges(baseText, targetText, file = "package.json") {
  const parse = (text) => {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  };
  const base = parse(baseText);
  const target = parse(targetText);
  const changes = [];
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "overrides",
  ]) {
    const before = base[field] || {};
    const after = target[field] || {};
    for (const name of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ])) {
      if (before[name] === after[name]) continue;
      const change =
        before[name] === undefined
          ? "added"
          : after[name] === undefined
            ? "removed"
            : majorOf(before[name]) !== majorOf(after[name])
              ? "major"
              : "minor";
      changes.push({
        file,
        field,
        name,
        from: before[name] ?? null,
        to: after[name] ?? null,
        change,
      });
    }
  }
  return changes;
}

async function threeWayMerge(local, base, target) {
  const dir = await mkdtemp(join(tmpdir(), "flowstack-merge-"));
  try {
    const paths = ["local", "base", "upstream"].map((n) => join(dir, n));
    await Promise.all(
      [local, base, target].map((content, i) => writeFile(paths[i], content)),
    );
    const result = spawnSync(
      "git",
      [
        "merge-file",
        "-p",
        "-L",
        "yours",
        "-L",
        "base",
        "-L",
        "upstream",
        ...paths,
      ],
      {
        encoding: "utf8",
      },
    );
    if (result.status < 0 || result.status === null)
      throw new Error("git merge-file failed");
    return { clean: result.status === 0, content: result.stdout };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function readLocal(root, path) {
  try {
    return await readFile(join(root, path));
  } catch {
    return null;
  }
}

function blob(repo, commit, path) {
  const result = git(repo, ["show", `${commit}:${path}`], { buffer: true });
  return result.ok ? result.out : null;
}

function fileMode(repo, commit, path) {
  return git(repo, ["ls-tree", commit, "--", path]).out.trim().split(/\s/)[0];
}

// Migration SQL and snapshots are immutable. Only append-only journal changes
// can be applied automatically; rewritten history must be reviewed manually.
export function preservesMigrationHistory(path, base, target) {
  if (!path.startsWith("packages/db/drizzle/") || !base) return true;
  if (path !== "packages/db/drizzle/meta/_journal.json") return false;
  try {
    const before = JSON.parse(base.toString());
    const after = JSON.parse(target.toString());
    return (
      Array.isArray(before.entries) &&
      Array.isArray(after.entries) &&
      after.entries.length >= before.entries.length &&
      isDeepStrictEqual(
        before.entries,
        after.entries.slice(0, before.entries.length),
      ) &&
      isDeepStrictEqual({ ...before, entries: [] }, { ...after, entries: [] })
    );
  } catch {
    return false;
  }
}

const same = (a, b) =>
  a !== null &&
  b !== null &&
  Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

/** Clones the starter and resolves the target release. */
async function fetchUpstream(source, ref) {
  const repo = await mkdtemp(join(tmpdir(), "flowstack-upstream-"));
  const clone = git(tmpdir(), [
    "clone",
    "--quiet",
    "--no-checkout",
    source,
    repo,
  ]);
  if (!clone.ok) {
    await rm(repo, { recursive: true, force: true });
    throw new Error(
      `Could not fetch the FlowStack starter from ${source}: ${clone.err?.trim()}`,
    );
  }
  let target = ref;
  if (!target) {
    const tags = git(repo, ["tag", "--list", "v*", "--sort=-v:refname"])
      .out.split("\n")
      .filter(Boolean);
    target = tags[0] || "HEAD";
  }
  const commit = git(repo, ["rev-parse", `${target}^{commit}`]);
  if (!commit.ok) throw new Error(`Unknown ref "${target}" in ${source}`);
  const versionFile = blob(
    repo,
    commit.out.trim(),
    "scripts/lib/project-config.mjs",
  );
  const version = versionFile
    ? /TEMPLATE_VERSION = "([^"]+)"/.exec(versionFile.toString())?.[1]
    : null;
  return {
    repo,
    ref: target,
    commit: commit.out.trim(),
    version: version || "unknown",
  };
}

export async function planUpgrade(root, { source, ref } = {}) {
  const config = JSON.parse(
    await readFile(join(root, ".flowstack.json"), "utf8"),
  );
  const upstream = await fetchUpstream(
    source || process.env.FLOWSTACK_UPSTREAM || DEFAULT_SOURCE,
    ref,
  );
  const baseCommit = config.sourceCommit;
  const baseKnown =
    Boolean(baseCommit) &&
    baseCommit !== "unknown" &&
    git(upstream.repo, ["cat-file", "-e", `${baseCommit}^{commit}`]).ok;
  const current = {
    version:
      config.templateVersion || (config.version === 2 ? "unknown" : "1.x"),
    commit: baseCommit || "unknown",
    baseKnown,
  };
  let changed;
  if (baseKnown) {
    changed = git(upstream.repo, [
      "diff",
      "--name-only",
      "--no-renames",
      baseCommit,
      upstream.commit,
    ])
      .out.split("\n")
      .filter(Boolean);
  } else {
    changed = git(upstream.repo, [
      "ls-tree",
      "-r",
      "--name-only",
      upstream.commit,
    ])
      .out.split("\n")
      .filter(Boolean);
  }
  const files = [];
  const dependencies = [];
  const migrations = [];
  for (const path of changed.sort()) {
    let kind = classifyPath(path);
    if (kind === "ignored") continue;
    const base = baseKnown ? blob(upstream.repo, baseCommit, path) : null;
    const target = blob(upstream.repo, upstream.commit, path);
    const mode = target ? fileMode(upstream.repo, upstream.commit, path) : null;
    if (
      !preservesMigrationHistory(path, base, target) ||
      (target && !["100644", "100755"].includes(mode))
    )
      kind = "review";
    const local = await readLocal(root, path);
    if (/(^|\/)package\.json$/.test(path))
      dependencies.push(
        ...dependencyChanges(base?.toString(), target?.toString(), path),
      );
    if (target && !base && /^packages\/db\/drizzle\/[^/]+\.sql$/.test(path))
      migrations.push(
        path
          .split("/")
          .pop()
          .replace(/\.sql$/, ""),
      );
    if (same(local, target)) continue; // already up to date
    let action;
    if (kind === "review") action = "review";
    else if (target === null) {
      if (local === null) continue;
      action = baseKnown && same(local, base) ? "delete" : "keep";
    } else if (local === null)
      action = base && baseKnown ? "skip-removed" : "add";
    else if (baseKnown && base !== null && same(local, base)) action = "update";
    else if (baseKnown && base !== null) {
      const merge = await threeWayMerge(local, base, target);
      action = merge.clean ? "merge" : "conflict";
    } else action = "conflict";
    files.push({ path, action });
  }
  return {
    root,
    config,
    upstream,
    current,
    target: {
      version: upstream.version,
      commit: upstream.commit,
      ref: upstream.ref,
    },
    upgradeAvailable:
      upstream.commit !== baseCommit &&
      (files.length > 0 ||
        compareVersions(upstream.version, current.version) > 0),
    files,
    dependencies,
    migrations,
  };
}

const LABELS = {
  update: "update (unchanged locally)",
  add: "add",
  merge: "merge (your changes + upstream, no conflicts)",
  conflict: "CONFLICT (proposal written for manual review)",
  delete: "delete (removed upstream; needs --allow-delete)",
  keep: "kept (removed upstream, but customised locally)",
  "skip-removed": "skipped (you deleted it; upstream changed it)",
  review: "review only (application-owned; not changed)",
};

function printPlan(plan) {
  const { current, target } = plan;
  console.log(
    `FlowStack upgrade: ${current.version} (${current.commit.slice(0, 12)}) -> ${target.version} (${target.ref}, ${target.commit.slice(0, 12)})`,
  );
  if (!current.baseKnown)
    console.log(
      "  ! The recorded sourceCommit is missing or not in the starter's history: every customised file is treated as a conflict.",
    );
  if (!plan.upgradeAvailable) {
    console.log("Up to date.");
    return;
  }
  for (const action of Object.keys(LABELS)) {
    const files = plan.files.filter((f) => f.action === action);
    if (!files.length) continue;
    console.log(`\n${LABELS[action]}:`);
    for (const f of files) console.log(`  ${f.path}`);
  }
  if (plan.migrations.length)
    console.log(
      `\nNew database migrations (added, never run): ${plan.migrations.join(", ")}\n  After applying: bun run db:status, then bun run db:migrate on development. Production migrates only from the deploy workflow.`,
    );
  if (plan.dependencies.length) {
    console.log(
      "\nDependency changes (not applied; edit package.json, then bun install and run the checks):",
    );
    for (const d of plan.dependencies)
      console.log(
        `  ${d.change.padEnd(7)} ${d.name} ${d.from ?? "-"} -> ${d.to ?? "-"} (${d.file} ${d.field})${d.change === "major" ? "  <- validate before upgrading" : ""}`,
      );
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function applyUpgrade(plan, { allowDelete = false } = {}) {
  const { root, upstream } = plan;
  const backup = join(root, BACKUP_DIR, stamp());
  const backupFile = async (path) => {
    if (!existsSync(join(root, path))) return;
    await mkdir(dirname(join(backup, path)), { recursive: true });
    await cp(join(root, path), join(backup, path));
  };
  await backupFile(".flowstack.json");
  const conflicts = [];
  const applied = [];
  for (const { path, action } of plan.files) {
    const target = blob(upstream.repo, upstream.commit, path);
    if (action === "update" || action === "add") {
      await backupFile(path);
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), target);
      await chmod(
        join(root, path),
        fileMode(upstream.repo, upstream.commit, path) === "100755"
          ? 0o755
          : 0o644,
      );
      applied.push(path);
    } else if (action === "merge") {
      const merge = await threeWayMerge(
        await readLocal(root, path),
        blob(upstream.repo, plan.current.commit, path),
        target,
      );
      await backupFile(path);
      await writeFile(join(root, path), merge.content);
      await chmod(
        join(root, path),
        fileMode(upstream.repo, upstream.commit, path) === "100755"
          ? 0o755
          : 0o644,
      );
      applied.push(path);
    } else if (action === "delete" && allowDelete) {
      await backupFile(path);
      await rm(join(root, path));
      applied.push(path);
    } else if (action === "conflict") {
      const proposal = join(root, UPGRADE_DIR, `${path}.merged`);
      await mkdir(dirname(proposal), { recursive: true });
      const base = plan.current.baseKnown
        ? blob(upstream.repo, plan.current.commit, path)
        : null;
      const content = base
        ? (await threeWayMerge(await readLocal(root, path), base, target))
            .content
        : target;
      await writeFile(proposal, content);
      conflicts.push(path);
    }
  }
  const config = { ...plan.config };
  if (conflicts.length) {
    config.upgradeInProgress = {
      targetVersion: plan.target.version,
      targetCommit: plan.target.commit,
      conflicts,
    };
  } else {
    config.templateVersion = plan.target.version;
    config.sourceCommit = plan.target.commit;
    delete config.upgradeInProgress;
  }
  await writeFile(
    join(root, ".flowstack.json"),
    JSON.stringify(config, null, 2) + "\n",
  );
  return { applied, conflicts, backup };
}

export async function markResolved(root) {
  const config = JSON.parse(
    await readFile(join(root, ".flowstack.json"), "utf8"),
  );
  const pending = config.upgradeInProgress;
  if (!pending) throw new Error("No upgrade is in progress.");
  for (const path of pending.conflicts) {
    const text = (await readLocal(root, path))?.toString() || "";
    if (/^(<<<<<<<|>>>>>>>) /m.test(text))
      throw new Error(`${path} still contains conflict markers.`);
  }
  config.templateVersion = pending.targetVersion;
  config.sourceCommit = pending.targetCommit;
  delete config.upgradeInProgress;
  await writeFile(
    join(root, ".flowstack.json"),
    JSON.stringify(config, null, 2) + "\n",
  );
  await rm(join(root, UPGRADE_DIR), { recursive: true, force: true });
  return config;
}

export function parseUpgradeArgs(args) {
  const options = {};
  const switches = new Set([
    "--yes",
    "--dry-run",
    "--allow-delete",
    "--allow-dirty",
    "--mark-resolved",
    "--json",
    "--help",
  ]);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (i === 0 && arg === "check") continue;
    if (switches.has(arg)) continue;
    const match = /^(--source|--ref)(?:=(.*))?$/.exec(arg);
    if (!match) throw new Error(`Unknown upgrade option: ${arg}`);
    const value = match[2] ?? args[++i];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for ${match[1]}`);
    options[match[1].slice(2)] = value;
  }
  return options;
}

async function main(args) {
  const options = parseUpgradeArgs(args);
  if (args.includes("--help")) {
    console.log(
      "Usage: bun run flowstack:upgrade [check] [--source <url|path>] [--ref <tag|branch|commit>] [--dry-run] [--yes] [--allow-delete] [--allow-dirty] [--mark-resolved] [--json]",
    );
    return;
  }
  const root =
    process.env.FLOWSTACK_PROJECT_ROOT ||
    resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (args.includes("--mark-resolved")) {
    const config = await markResolved(root);
    console.log(
      `Upgrade to ${config.templateVersion} recorded (${config.sourceCommit.slice(0, 12)}).`,
    );
    return;
  }
  const check = args[0] === "check";
  const plan = await planUpgrade(root, {
    source: options.source,
    ref: options.ref,
  });
  try {
    if (check && args.includes("--json")) {
      const {
        files,
        dependencies,
        migrations,
        current,
        target,
        upgradeAvailable,
      } = plan;
      console.log(
        JSON.stringify(
          {
            current,
            target,
            upgradeAvailable,
            files,
            dependencies,
            migrations,
          },
          null,
          2,
        ),
      );
      return;
    }
    printPlan(plan);
    if (check || !plan.upgradeAvailable) return;
    if (args.includes("--dry-run")) {
      console.log("\nDry run: nothing was changed.");
      return;
    }
    if (plan.config.upgradeInProgress && !args.includes("--yes"))
      console.log(
        `\n! An earlier upgrade to ${plan.config.upgradeInProgress.targetVersion} has unresolved conflicts.`,
      );
    const status = git(root, ["status", "--porcelain"]);
    if (!args.includes("--allow-dirty")) {
      if (!status.ok)
        throw new Error(
          "Not a Git repository: commit your project first so the upgrade can be reviewed (or pass --allow-dirty).",
        );
      if (status.out.trim())
        throw new Error(
          "The working tree has uncommitted changes. Commit or stash them first so the upgrade diff is reviewable.",
        );
    }
    let allowDelete = args.includes("--allow-delete");
    if (!args.includes("--yes")) {
      if (!process.stdin.isTTY)
        throw new Error(
          "Pass --yes to apply without a prompt, or --dry-run to preview.",
        );
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        if (
          (await rl.question("\nApply these changes? [y/N] "))
            .trim()
            .toLowerCase() !== "y"
        ) {
          console.log("Nothing changed.");
          return;
        }
        if (!allowDelete && plan.files.some((f) => f.action === "delete"))
          allowDelete =
            (await rl.question("Also delete files removed upstream? [y/N] "))
              .trim()
              .toLowerCase() === "y";
      } finally {
        rl.close();
      }
    }
    const { applied, conflicts, backup } = await applyUpgrade(plan, {
      allowDelete,
    });
    console.log(`\nApplied ${applied.length} file(s). Backup: ${backup}`);
    if (conflicts.length)
      console.log(
        `\n${conflicts.length} conflict(s) need manual resolution. Proposals with conflict markers are in ${UPGRADE_DIR}/:\n${conflicts.map((c) => `  ${c}`).join("\n")}\nMerge each into your file, then run: bun run flowstack:upgrade --mark-resolved`,
      );
    console.log(
      "\nNext: review `git diff`, apply any dependency changes listed above, then run bun install, bun run setup (refresh generated files), bun run doctor, bun run db:status, and bun run check:all.",
    );
  } finally {
    await rm(plan.upstream.repo, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
