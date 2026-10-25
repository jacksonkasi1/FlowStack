#!/usr/bin/env node
// Secret-aware command runner backed by the Infisical CLI.
//
//   node scripts/secrets.mjs run <environment> -- <command...>
//   node scripts/secrets.mjs check <environment>
//   node scripts/secrets.mjs validate [--scope server|web]
//
// `run` injects secrets into one child process. `check` confirms that every
// required secret name exists in Infisical. `validate` checks the current
// process environment. Values are never printed.
import { spawn, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readProjectConfig,
  DEFAULT_INTEGRATIONS,
} from "./lib/project-config.mjs";
import {
  assertEnvironmentAllowed,
  infisicalBinary,
  infisicalRunArgs,
  infisicalVersion,
  resolveInfisicalTarget,
} from "./lib/infisical.mjs";
import { exposedConfidentialNames, validateEnv } from "./lib/env-manifest.mjs";
import { isMain } from "./lib/is-main.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = `Usage:
  node scripts/secrets.mjs run <development|sandbox|beta|production> -- <command...>
  node scripts/secrets.mjs check <environment>
  node scripts/secrets.mjs validate [--scope server|web]`;

const EXEC_CLEAN = fileURLToPath(
  new URL("./lib/exec-clean.mjs", import.meta.url),
);

/**
 * Exchanges Universal Auth client credentials (read from the environment, never
 * passed as arguments) for a short-lived access token. Returns null when no
 * client credentials are set.
 */
export function universalAuthToken(env = process.env) {
  if (env.INFISICAL_TOKEN) return null;
  if (
    !env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID ||
    !env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET
  )
    return null;
  const result = spawnSync(
    infisicalBinary(env),
    ["login", "--method=universal-auth", "--plain", "--silent"],
    { encoding: "utf8", env, timeout: 30000 },
  );
  const token = result.stdout?.trim();
  if (result.error || result.status !== 0 || !token)
    throw new Error(
      "Infisical Universal Auth login failed. Check the machine identity's client ID, client secret and project access.",
    );
  return token;
}

/**
 * Spawns a command with secrets injected. Resolves with the exit code, or with
 * { code, stdout } when `capture` is set (stderr still goes to the terminal).
 */
export async function runWithSecrets(
  appEnv,
  command,
  { env = process.env, capture = false } = {},
) {
  if (!command.length) throw new Error("No command given after --");
  assertEnvironmentAllowed(appEnv, env);
  const config = await readProjectConfig(root);
  const target = resolveInfisicalTarget(appEnv, config, env);
  if (!infisicalVersion(env))
    throw new Error(
      "Infisical CLI not found. Install it (https://infisical.com/docs/cli/overview), or use local .env files explicitly with `bun run dev:local`.",
    );
  const token = universalAuthToken(env);
  const cliEnv = {
    ...env,
    FLOWSTACK_ENV: appEnv,
    FLOWSTACK_SECRETS_SOURCE: "infisical",
  };
  if (token) {
    cliEnv.INFISICAL_TOKEN = token;
    delete cliEnv.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET;
  }
  // exec-clean removes Infisical credentials before the application starts.
  const child = spawn(
    infisicalBinary(env),
    infisicalRunArgs(target, [process.execPath, EXEC_CLEAN, ...command]),
    {
      cwd: root,
      stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
      env: cliEnv,
    },
  );
  let stdout = "";
  child.stdout?.on("data", (d) => (stdout += d));
  const forward = (signal) => child.kill(signal);
  process.on("SIGINT", forward);
  process.on("SIGTERM", forward);
  return new Promise((resolveExit) =>
    child.on("close", (code, signal) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      const exit = code ?? (signal ? 1 : 0);
      resolveExit(capture ? { code: exit, stdout } : exit);
    }),
  );
}

export function validateProcessEnv(scope, integrations, env = process.env) {
  const results = validateEnv(env, { scope, integrations });
  const exposed = exposedConfidentialNames(env).map((name) => ({
    name,
    status: "invalid",
    message:
      "looks confidential but has a VITE_ prefix, which publishes it in the browser bundle",
  }));
  return [...results, ...exposed];
}

function printResults(results) {
  for (const r of results)
    console.log(
      `  ${r.status === "ok" ? "ok " : "!! "} ${r.name.padEnd(28)} ${r.message}`,
    );
  return results.every((r) => r.status === "ok");
}

async function main(args) {
  const [command, ...rest] = args;
  if (command === "run") {
    const separator = rest.indexOf("--");
    const appEnv = rest[0];
    if (!appEnv || separator !== 1) throw new Error(USAGE);
    process.exitCode = await runWithSecrets(appEnv, rest.slice(separator + 1));
    if (process.exitCode)
      console.error(
        `\nCommand failed with secrets from "${appEnv}" (exit ${process.exitCode}). If Infisical reported an authentication error, run \`infisical login\` (developers) or check the machine identity (CI). No other environment was tried.`,
      );
    return;
  }
  if (command === "check") {
    const appEnv = rest[0];
    if (!appEnv) throw new Error(USAGE);
    process.exitCode = await runWithSecrets(appEnv, [
      process.execPath,
      fileURLToPath(import.meta.url),
      "validate",
      "--scope",
      "server",
    ]);
    return;
  }
  if (command === "validate") {
    const scopeIndex = rest.indexOf("--scope");
    const scope = scopeIndex >= 0 ? rest[scopeIndex + 1] : "server";
    if (!["server", "web"].includes(scope)) throw new Error(USAGE);
    const config = await readProjectConfig(root);
    const integrations = config?.integrations || DEFAULT_INTEGRATIONS;
    console.log(`Validating ${scope} secrets (names only):`);
    if (!printResults(validateProcessEnv(scope, integrations))) {
      console.error("\nSome required secrets are missing or invalid.");
      process.exitCode = 1;
    } else console.log("\nAll required secrets are present.");
    return;
  }
  console.log(USAGE);
  if (command !== "--help") process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
