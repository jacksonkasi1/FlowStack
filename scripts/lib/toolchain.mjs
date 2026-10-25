// Node.js and Bun compatibility. Dependency-free: setup runs this before
// anything is installed.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MIN_NODE_MAJOR = 24;

export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++)
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

/**
 * Returns [{ name, status: PASS|WARN|FAIL, detail, fix }] for Node.js and Bun.
 * Bun older than the version pinned in package.json fails; newer warns.
 */
export function toolchainChecks(
  root,
  { nodeVersion = process.versions.node, timeoutMs = 5000 } = {},
) {
  const checks = [];
  const nodeMajor = Number(nodeVersion.split(".")[0]);
  checks.push(
    nodeMajor >= MIN_NODE_MAJOR
      ? { name: "Node.js", status: "PASS", detail: nodeVersion, fix: "" }
      : {
          name: "Node.js",
          status: "FAIL",
          detail: nodeVersion,
          fix: `Install Node.js ${MIN_NODE_MAJOR} LTS or newer.`,
        },
  );
  let pinned;
  try {
    pinned = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ).packageManager?.split("@")[1];
  } catch {
    pinned = undefined;
  }
  const bun = spawnSync("bun", ["--version"], {
    encoding: "utf8",
    timeout: timeoutMs,
  });
  if (bun.error || bun.status !== 0) {
    checks.push({
      name: "Bun",
      status: "FAIL",
      detail: "not found",
      fix: `Install Bun ${pinned || ""} (https://bun.sh).`.replace("  ", " "),
    });
    return checks;
  }
  const version = bun.stdout.trim();
  const cmp = pinned ? compareVersions(version, pinned) : 0;
  checks.push({
    name: "Bun",
    status: cmp < 0 ? "FAIL" : cmp > 0 ? "WARN" : "PASS",
    detail: cmp === 0 ? version : `${version} (project pins ${pinned})`,
    fix:
      cmp < 0
        ? `Upgrade Bun to ${pinned}.`
        : cmp > 0
          ? `Newer than the pinned ${pinned}; if installs differ in CI, use ${pinned}.`
          : "",
  });
  return checks;
}
