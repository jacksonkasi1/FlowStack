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
import { spawn } from "node:child_process";
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

/** Spawns a command with secrets injected. Resolves with the exit code. */
export async function runWithSecrets(
  appEnv,
  command,
  { env = process.env } = {},
) {
  if (!command.length) throw new Error("No command given after --");
  assertEnvironmentAllowed(appEnv, env);
  const config = await readProjectConfig(root);
  const target = resolveInfisicalTarget(appEnv, config, env);
  if (!infisicalVersion(env))
    throw new Error(
      "Infisical CLI not found. Install it (https://infisical.com/docs/cli/overview), or use local .env files explicitly with `bun run dev:local`.",
    );
  const child = spawn(infisicalBinary(env), infisicalRunArgs(target, command), {
    cwd: root,
    stdio: "inherit",
    env: {
      ...env,
      FLOWSTACK_ENV: appEnv,
      FLOWSTACK_SECRETS_SOURCE: "infisical",
    },
  });
  const forward = (signal) => child.kill(signal);
  process.on("SIGINT", forward);
  process.on("SIGTERM", forward);
  return new Promise((resolveExit) =>
    child.on("exit", (code, signal) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      resolveExit(code ?? (signal ? 1 : 0));
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
