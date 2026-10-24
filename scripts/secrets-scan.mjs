#!/usr/bin/env node
// Secret scanning with gitleaks (preferred) or the Infisical CLI.
//
//   node scripts/secrets-scan.mjs --staged   Pre-commit: staged changes only
//   node scripts/secrets-scan.mjs            Full: git history + working tree
//
// A missing scanner is reported as SKIPPED, never as a pass. It fails the run
// in CI or when FLOWSTACK_REQUIRE_SECRET_SCAN=1. Findings are redacted.
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib/is-main.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function available(bin, args) {
  const result = spawnSync(bin, args, { encoding: "utf8", timeout: 10000 });
  return !result.error && result.status === 0;
}

export function findScanner(env = process.env) {
  const gitleaks = env.GITLEAKS_BIN || "gitleaks";
  if (available(gitleaks, ["version"]))
    return { name: "gitleaks", bin: gitleaks };
  const infisical = env.INFISICAL_BIN || "infisical";
  if (available(infisical, ["--version"]))
    return { name: "infisical", bin: infisical };
  return null;
}

/** Returns the scanner invocations for a mode. Each must exit 0 for a pass. */
export function scanCommands(scanner, staged) {
  if (scanner.name === "gitleaks") {
    const common = ["--no-banner", "--redact", "--exit-code=1"];
    return staged
      ? [["git", "--staged", "--config=.gitleaks.toml", ...common, "."]]
      : [
          ["git", "--config=.gitleaks.toml", ...common, "."],
          ["dir", "--config=.gitleaks.worktree.toml", ...common, "."],
        ];
  }
  const common = ["--redact", "--exit-code=1", "--config=.gitleaks.toml"];
  return staged
    ? [["scan", "git-changes", "--staged", ...common]]
    : [
        ["scan", ...common],
        [
          "scan",
          "--no-git",
          "--redact",
          "--exit-code=1",
          "--config=.gitleaks.worktree.toml",
        ],
      ];
}

export function main(args = process.argv.slice(2), env = process.env) {
  const staged = args.includes("--staged");
  const required =
    env.CI === "true" || env.FLOWSTACK_REQUIRE_SECRET_SCAN === "1";
  const scanner = findScanner(env);
  if (!scanner) {
    const message =
      "SECRET SCAN SKIPPED: neither gitleaks nor the Infisical CLI is installed. " +
      "Install gitleaks (https://github.com/gitleaks/gitleaks#installing). CI still scans every push.";
    if (required) {
      console.error(`${message}\nA scanner is required here, so this fails.`);
      return 1;
    }
    console.warn(`\n⚠️  ${message}\n`);
    return 0;
  }
  for (const command of scanCommands(scanner, staged)) {
    const result = spawnSync(scanner.bin, command, {
      cwd: root,
      stdio: "inherit",
      env: { ...env, INFISICAL_DISABLE_UPDATE_CHECK: "true" },
    });
    if (result.error || result.status !== 0) {
      console.error(
        result.status === 1
          ? `\nSecret scan (${scanner.name}) found possible secrets. Remove them${staged ? " from the staged changes" : ""}; if a value was ever pushed, rotate it. See docs/advanced/git-hooks.md.`
          : `\nSecret scan (${scanner.name}) could not run (exit ${result.status ?? result.error?.code}). Treating as failure.`,
      );
      return 1;
    }
  }
  console.log(
    `Secret scan passed (${scanner.name}${staged ? ", staged changes" : ", history and working tree"}).`,
  );
  return 0;
}

if (isMain(import.meta.url)) {
  process.exitCode = main();
}
