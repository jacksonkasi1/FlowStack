#!/usr/bin/env node
// Project Doctor: diagnoses setup problems without changing project state.
//
//   bun run doctor            Human-readable report
//   bun run doctor -- --json  Machine-readable report
//
// Checks report PASS, WARN, FAIL or SKIPPED, each with a next action. Only
// variable names are ever reported, never values. Exit code is 1 when any
// check fails.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENV_VARS,
  exposedConfidentialNames,
  readEnvFile,
  validateEnv,
} from "./lib/env-manifest.mjs";
import {
  frontendApp,
  readProjectConfig,
  DEFAULT_INTEGRATIONS,
  DEFAULT_PORTS,
} from "./lib/project-config.mjs";
import {
  infisicalBinary,
  infisicalRunArgs,
  infisicalVersion,
  resolveInfisicalTarget,
} from "./lib/infisical.mjs";
import {
  connect,
  describeDbError,
  migrationStatus,
  parseDatabaseUrl,
} from "./lib/db.mjs";
import { isPortFree } from "./setup.mjs";
import { universalAuthToken } from "./secrets.mjs";
import { isMain } from "./lib/is-main.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STATUS = {
  PASS: "PASS",
  WARN: "WARN",
  FAIL: "FAIL",
  SKIP: "SKIPPED",
};
const MIN_NODE = 24;

const result = (name, status, detail = "", fix = "") => ({
  name,
  status,
  detail,
  fix,
});

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++)
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

function summarize(issues) {
  return issues.map((r) => `${r.name} ${r.message}`).join("; ");
}

/** Loads env values for internal checks only; they are never printed. */
async function loadEnvironment(root, app, env) {
  // Same precedence as the apps: variables already in the environment
  // (Infisical, CI, shell) win over .env files.
  const known = new Set(ENV_VARS.map((v) => v.name));
  const fromProcess = (scope) =>
    Object.fromEntries(
      Object.entries(env).filter(
        ([name]) =>
          known.has(name) &&
          ENV_VARS.find((v) => v.name === name).scope === scope,
      ),
    );
  const server = {
    ...((await readEnvFile(join(root, "packages/db/.env"))) || {}),
    ...((await readEnvFile(join(root, "apps/server/.env"))) || {}),
    ...fromProcess("server"),
  };
  const web = {
    ...((await readEnvFile(join(root, `apps/${app}/.env`))) || {}),
    // Every VITE_* name is public, known or not, so all of them are checked.
    ...Object.fromEntries(
      Object.entries(env).filter(([name]) => name.startsWith("VITE_")),
    ),
  };
  const injected = env.FLOWSTACK_SECRETS_SOURCE === "infisical";
  return {
    server,
    web,
    source: injected
      ? "Infisical (injected)"
      : "environment and local .env files",
    hasServerFile:
      existsSync(join(root, "apps/server/.env")) ||
      Boolean(fromProcess("server").DATABASE_URL),
  };
}

export async function runChecks({
  root = sourceRoot,
  env = process.env,
  timeoutMs = 5000,
} = {}) {
  const checks = [];
  const add = (...args) => checks.push(result(...args));

  // Toolchain
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  add(
    "Node.js",
    nodeMajor >= MIN_NODE ? STATUS.PASS : STATUS.FAIL,
    process.versions.node,
    nodeMajor >= MIN_NODE ? "" : `Install Node.js ${MIN_NODE} LTS or newer.`,
  );
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const pinnedBun = pkg.packageManager?.split("@")[1];
  const bun = spawnSync("bun", ["--version"], {
    encoding: "utf8",
    timeout: timeoutMs,
  });
  if (bun.error || bun.status !== 0)
    add(
      "Bun",
      STATUS.FAIL,
      "not found",
      `Install Bun ${pinnedBun} (https://bun.sh).`,
    );
  else {
    const version = bun.stdout.trim();
    const cmp = pinnedBun ? compareVersions(version, pinnedBun) : 0;
    add(
      "Bun",
      cmp < 0 ? STATUS.FAIL : cmp > 0 ? STATUS.WARN : STATUS.PASS,
      cmp === 0 ? version : `${version} (project pins ${pinnedBun})`,
      cmp < 0
        ? `Upgrade Bun to ${pinnedBun}.`
        : cmp > 0
          ? `Newer than the pinned ${pinnedBun}; if installs differ in CI, use ${pinnedBun}.`
          : "",
    );
  }
  const installed =
    ["turbo", "eslint"].every((bin) =>
      existsSync(join(root, "node_modules", ".bin", bin)),
    ) &&
    [
      "node_modules/.bin/drizzle-kit",
      "packages/db/node_modules/.bin/drizzle-kit",
    ].some((path) => existsSync(join(root, path)));
  add(
    "Dependencies",
    installed ? STATUS.PASS : STATUS.FAIL,
    installed ? "installed" : "node_modules incomplete",
    installed ? "" : "Run bun install.",
  );

  // Project configuration
  let config = null;
  try {
    config = await readProjectConfig(root);
  } catch (error) {
    add(
      "Project Config",
      STATUS.FAIL,
      error.message,
      "Fix .flowstack.json or rerun bun run setup.",
    );
  }
  const app = frontendApp(config?.frontend);
  const integrations = config?.integrations || DEFAULT_INTEGRATIONS;
  const ports = config?.ports || DEFAULT_PORTS;
  if (config && config.mode && config.frontend) {
    const problems = [];
    if (!pkg.workspaces?.includes(`apps/${app}`))
      problems.push(`apps/${app} is not a workspace`);
    const preset = await readFile(
      join(root, "packages/config/src/config/preset.ts"),
      "utf8",
    ).catch(() => "");
    if (!preset.includes(`"${config.mode}"`))
      problems.push("preset.ts mode differs from .flowstack.json");
    add(
      "Project Config",
      problems.length ? STATUS.FAIL : STATUS.PASS,
      problems.length
        ? problems.join("; ")
        : `${config.mode} / ${config.frontend} (template ${config.templateVersion})`,
      problems.length
        ? `Rerun bun run setup --mode ${config.mode} --frontend ${config.frontend}.`
        : "",
    );
  } else if (!checks.some((c) => c.name === "Project Config"))
    add("Project Config", STATUS.FAIL, "not configured", "Run bun run setup.");

  // Infisical
  const wantsInfisical = integrations.infisical;
  const injected = env.FLOWSTACK_SECRETS_SOURCE === "infisical";
  let infisicalReady = false;
  if (!wantsInfisical) {
    add("Infisical CLI", STATUS.SKIP, "integration not enabled");
    add("Infisical Access", STATUS.SKIP, "integration not enabled");
  } else {
    const version = infisicalVersion(env, timeoutMs);
    add(
      "Infisical CLI",
      version ? STATUS.PASS : STATUS.FAIL,
      version || "not found",
      version
        ? ""
        : "Install the Infisical CLI: https://infisical.com/docs/cli/overview",
    );
    let target = null;
    try {
      target = resolveInfisicalTarget("development", config, env);
      add(
        "Infisical Project",
        STATUS.PASS,
        `env ${target.environment}, path ${target.secretPath}`,
      );
    } catch (error) {
      add(
        "Infisical Project",
        STATUS.FAIL,
        error.message,
        "Rerun bun run setup --infisical-project-id <id>.",
      );
    }
    if (injected) {
      infisicalReady = true;
      add("Infisical Access", STATUS.PASS, "development secrets injected");
    } else if (version && target) {
      // The child exits immediately; no secret value is read or printed.
      let probeEnv = env;
      let probe;
      try {
        const token = universalAuthToken(env);
        if (token) probeEnv = { ...env, INFISICAL_TOKEN: token };
        probe = spawnSync(
          infisicalBinary(env),
          infisicalRunArgs(target, [process.execPath, "-e", "0"]),
          {
            encoding: "utf8",
            timeout: timeoutMs * 3,
            env: probeEnv,
            cwd: root,
          },
        );
      } catch {
        probe = { status: 1 };
      }
      if (probe.status === 0) {
        infisicalReady = true;
        add("Infisical Access", STATUS.PASS, "development secrets readable");
      } else
        add(
          "Infisical Access",
          STATUS.FAIL,
          probe.error?.code === "ETIMEDOUT"
            ? "timed out"
            : "could not read development secrets",
          "Run `infisical login`, confirm you can read the development environment, then rerun `bun run doctor`. For a full check with secrets loaded: `node scripts/secrets.mjs run development -- bun run doctor`.",
        );
    } else
      add("Infisical Access", STATUS.SKIP, "CLI or project not configured");
  }

  // Environment
  const loaded = await loadEnvironment(root, app, env);
  const usingInfisicalOnly =
    wantsInfisical && !injected && !loaded.hasServerFile;
  if (usingInfisicalOnly) {
    add(
      "Server Env",
      infisicalReady ? STATUS.SKIP : STATUS.FAIL,
      "secrets live in Infisical",
      infisicalReady
        ? "Validate names with `bun run secrets:check`, or run `node scripts/secrets.mjs run development -- bun run doctor`."
        : "Fix Infisical access first.",
    );
  } else {
    // Core variables only; each integration reports its own below.
    const issues = validateEnv(loaded.server, {
      scope: "server",
      integrations: {},
    }).filter((r) => r.status !== "ok");
    add(
      "Server Env",
      issues.length ? STATUS.FAIL : STATUS.PASS,
      issues.length
        ? summarize(issues)
        : `required variables set (${loaded.source})`,
      issues.length
        ? wantsInfisical
          ? "Add the missing names to Infisical (development)."
          : "Edit apps/server/.env."
        : "",
    );
  }
  const webIssues = validateEnv(loaded.web, {
    scope: "web",
    integrations,
  }).filter((r) => r.status !== "ok");
  const exposed = exposedConfidentialNames({ ...loaded.web, ...loaded.server });
  add(
    "Frontend Config",
    exposed.length || webIssues.length ? STATUS.FAIL : STATUS.PASS,
    exposed.length
      ? `confidential-looking VITE_ names: ${exposed.join(", ")}`
      : webIssues.length
        ? summarize(webIssues)
        : `apps/${app}`,
    exposed.length
      ? "Rename these without the VITE_ prefix and keep them server-side; VITE_ values are published in the browser bundle."
      : webIssues.length
        ? `Edit apps/${app}/.env (copy from .env.example).`
        : "",
  );

  // Authentication configuration
  const s = loaded.server;
  if (usingInfisicalOnly)
    add("Authentication", STATUS.SKIP, "needs injected secrets");
  else if (!s.BETTER_AUTH_URL || !s.FRONTEND_URL)
    add("Authentication", STATUS.SKIP, "auth URLs not set (see Server Env)");
  else {
    const problems = [];
    const frontendUrl = URL.canParse(s.FRONTEND_URL || "")
      ? new URL(s.FRONTEND_URL)
      : null;
    if (
      frontendUrl &&
      frontendUrl.hostname === "localhost" &&
      Number(frontendUrl.port) !== ports.web
    )
      problems.push(
        `FRONTEND_URL port ${frontendUrl.port} differs from frontend port ${ports.web}`,
      );
    if (
      s.ALLOWED_ORIGINS &&
      s.FRONTEND_URL &&
      !s.ALLOWED_ORIGINS.split(",")
        .map((o) => o.trim())
        .includes(s.FRONTEND_URL)
    )
      problems.push("FRONTEND_URL is not listed in ALLOWED_ORIGINS");
    if (
      integrations.google &&
      Boolean(s.GOOGLE_CLIENT_ID) !== Boolean(s.GOOGLE_CLIENT_SECRET)
    )
      problems.push("set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
    if (
      s.BETTER_AUTH_URL?.startsWith("http://") &&
      !/localhost|127\.0\.0\.1/.test(s.BETTER_AUTH_URL)
    )
      problems.push("BETTER_AUTH_URL uses http on a non-local host");
    add(
      "Authentication",
      problems.length ? STATUS.WARN : STATUS.PASS,
      problems.length ? problems.join("; ") : "URLs and origins consistent",
      problems.length
        ? "Align the URLs in apps/server/.env with the configured ports."
        : "",
    );
  }

  // Database
  const dbUrl = s.DATABASE_URL;
  if (usingInfisicalOnly) {
    add("Database", STATUS.SKIP, "needs injected secrets");
    add("Migrations", STATUS.SKIP, "needs injected secrets");
  } else {
    const parsed = parseDatabaseUrl(dbUrl);
    if (!parsed.ok) {
      add(
        "Database",
        STATUS.FAIL,
        parsed.message,
        "Set DATABASE_URL in apps/server/.env (or Infisical).",
      );
      add("Migrations", STATUS.SKIP, "database unavailable");
    } else {
      const sql = connect(dbUrl, { timeout: Math.ceil(timeoutMs / 1000) });
      try {
        await sql`select 1`;
        add(
          "Database",
          parsed.neon ? STATUS.PASS : STATUS.WARN,
          `connected (${parsed.host})`,
          parsed.neon
            ? ""
            : "The API's runtime client uses the Neon HTTP driver. Non-Neon PostgreSQL works for migrations but needs packages/db/src/client.ts changed for runtime; see docs/getting-started/database.md.",
        );
        try {
          const status = await migrationStatus(sql, root);
          if (status.skippedByDrizzle.length)
            add(
              "Migrations",
              STATUS.FAIL,
              `${status.skippedByDrizzle.map((m) => m.tag).join(", ")} would be skipped by drizzle`,
              "See docs/getting-started/database.md#out-of-order-migrations.",
            );
          else if (status.pending.length)
            add(
              "Migrations",
              STATUS.FAIL,
              `${status.pending.length} pending`,
              "Run bun run db:migrate.",
            );
          else
            add("Migrations", STATUS.PASS, `${status.applied.length} applied`);
        } catch (error) {
          add(
            "Migrations",
            STATUS.FAIL,
            `could not read migration table (${error.code || "error"})`,
            "Check the database user's privileges on the drizzle schema.",
          );
        }
      } catch (error) {
        add(
          "Database",
          STATUS.FAIL,
          describeDbError(error),
          "Fix DATABASE_URL or start PostgreSQL, then rerun.",
        );
        add("Migrations", STATUS.SKIP, "database unavailable");
      } finally {
        await sql.end({ timeout: 1 }).catch(() => {});
      }
    }
  }

  // Ports (in use usually means the app is already running)
  for (const [label, port] of [
    ["API Port", ports.api],
    ["Frontend Port", ports.web],
  ]) {
    const free = await isPortFree(port);
    add(
      label,
      free ? STATUS.PASS : STATUS.WARN,
      `${port} ${free ? "free" : "in use"}`,
      free
        ? ""
        : "Stop the process using it, or rerun setup with a different port.",
    );
  }

  // Optional integrations
  const optional = [
    ["Sentry", "sentry", ["SENTRY_DSN"], ["VITE_SENTRY_DSN"]],
    ["Email", "email", ["ZEPTOMAIL_API_KEY", "EMAIL_FROM_ADDRESS"], []],
    [
      "Cloudflare R2",
      "storage",
      [
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_ENDPOINT_URL",
        "R2_BUCKET_NAME",
      ],
      [],
    ],
    [
      "Google Sign-in",
      "google",
      ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      [],
    ],
  ];
  for (const [label, feature, serverNames, webNames] of optional) {
    if (!integrations[feature]) {
      add(label, STATUS.SKIP, "not enabled");
      continue;
    }
    if (usingInfisicalOnly) {
      add(label, STATUS.SKIP, "needs injected secrets");
      continue;
    }
    const issues = [
      ...validateEnv(loaded.server, { scope: "server", integrations }).filter(
        (r) => serverNames.includes(r.name),
      ),
      ...validateEnv(loaded.web, { scope: "web", integrations }).filter((r) =>
        webNames.includes(r.name),
      ),
    ].filter((r) => r.status !== "ok");
    add(
      label,
      issues.length ? STATUS.FAIL : STATUS.PASS,
      issues.length ? summarize(issues) : "configured",
      issues.length
        ? "Set the listed variables, or disable the integration with bun run setup --without " +
            feature +
            "."
        : "",
    );
  }
  return checks;
}

export function formatReport(checks) {
  const lines = ["FlowStack Doctor", ""];
  for (const c of checks) {
    lines.push(`${c.name.padEnd(20)}${c.status.padEnd(9)}${c.detail}`);
    if (c.fix && c.status !== STATUS.PASS)
      lines.push(`${"".padEnd(29)}→ ${c.fix}`);
  }
  const failed = checks.filter((c) => c.status === STATUS.FAIL).length;
  const warned = checks.filter((c) => c.status === STATUS.WARN).length;
  lines.push(
    "",
    failed
      ? `${failed} check(s) failed. Fix them, then rerun bun run doctor.`
      : warned
        ? `Project is ready for development (${warned} warning(s)).`
        : "Project is ready for development.",
  );
  return lines.join("\n");
}

async function main(args) {
  const checks = await runChecks();
  const failed = checks.some((c) => c.status === STATUS.FAIL);
  if (args.includes("--json"))
    console.log(JSON.stringify({ ok: !failed, checks }, null, 2));
  else console.log(formatReport(checks));
  process.exitCode = failed ? 1 : 0;
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
